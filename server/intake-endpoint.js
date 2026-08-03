"use strict";

const crypto = require("crypto");
const IntakeModel = require("../intake-model.js");
const { validateRequestBody, validateUpload, createSubmissionGuard, safeErrorResponse } = require("./intake-validation.js");
const { createEmailDeliveryService } = require("./email-delivery.js");
const { createFileDeliveryStatusStore } = require("./file-delivery-status-store.js");
const { createFileSubmissionStore } = require("./submission-store.js");

const MAX_HTTP_BODY_BYTES = 768 * 1024;
const DOCUMENT_FIELDS = ["customerSummary", "technicalSpecification", "internalBrief", "clarificationQuestions", "warnings"];

class IntakeEndpointError extends Error {
  constructor(code, statusCode) {
    super("The project submission could not be processed.");
    this.code = code;
    this.statusCode = statusCode;
  }
}

function validateDocuments(documents) {
  if (!documents || typeof documents !== "object" || Array.isArray(documents)) throw new IntakeEndpointError("invalid_documents", 400);
  const unexpected = Object.keys(documents).filter((key) => !DOCUMENT_FIELDS.includes(key));
  if (unexpected.length) throw new IntakeEndpointError("invalid_documents", 400);
  DOCUMENT_FIELDS.slice(0, 4).forEach((key) => {
    if (typeof documents[key] !== "string" || !documents[key].trim() || documents[key].length > 120000) throw new IntakeEndpointError("invalid_documents", 400);
  });
  if (documents.warnings != null && (typeof documents.warnings !== "string" || documents.warnings.length > 10000)) throw new IntakeEndpointError("invalid_documents", 400);
  return Object.fromEntries(Object.entries(documents).map(([key, value]) => [key,
    typeof value === "string" ? value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").normalize("NFC").trim() : value
  ]));
}

function idempotencyKey(request, submission) {
  const supplied = request.headers.get("Idempotency-Key") || submission.submissionMetadata.submissionId;
  if (typeof supplied !== "string" || !/^[A-Za-z0-9._:-]{8,128}$/.test(supplied)) {
    throw new IntakeEndpointError("invalid_idempotency_key", 400);
  }
  return supplied;
}

function referenceFor(key, secret) {
  return `LS-${crypto.createHmac("sha256", secret).update(key, "utf8").digest("base64url").slice(0, 16).toUpperCase()}`;
}

function publicStatus(status, receivedAt, processingStatus) {
  return {
    success: true,
    submissionReference: status.reference,
    // Kept for compatibility with older deployed clients.
    reference: status.reference,
    receivedAt,
    processingStatus,
    customerEmailStatus: status.customer,
    internalEmailStatus: status.internal
  };
}

function jsonResponse(status, body, origin) {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function configuredOrigin(value) {
  if (!value) return "";
  const url = new URL(value);
  if (!new Set(["https:", "http:"]).has(url.protocol) || url.origin !== value || /[\r\n]/.test(value)) throw new Error("INTAKE_ALLOWED_ORIGIN must be one exact HTTP(S) origin.");
  return url.origin;
}

function createIntakeEndpoint(options = {}) {
  const environment = options.environment || process.env;
  if (environment.NODE_ENV === "production" && !options.statusStore && !environment.INTAKE_STATUS_FILE) {
    throw new Error("Production requires a durable delivery status store or INTAKE_STATUS_FILE.");
  }
  if (environment.NODE_ENV === "production" && !options.submissionStore && !environment.INTAKE_STORAGE_DIR) {
    throw new Error("Production requires a durable submission store or INTAKE_STORAGE_DIR.");
  }
  if (environment.NODE_ENV === "production" && !environment.INTAKE_ALLOWED_ORIGIN) throw new Error("Production requires INTAKE_ALLOWED_ORIGIN.");
  if (environment.NODE_ENV === "production" && (!environment.INTAKE_REFERENCE_SECRET || environment.INTAKE_REFERENCE_SECRET.length < 32)) {
    throw new Error("Production requires INTAKE_REFERENCE_SECRET with at least 32 characters.");
  }
  const guard = options.guard || createSubmissionGuard();
  const statusStore = options.statusStore || (environment.INTAKE_STATUS_FILE ? createFileDeliveryStatusStore(environment.INTAKE_STATUS_FILE) : undefined);
  const submissionStore = options.submissionStore || (environment.INTAKE_STORAGE_DIR ? createFileSubmissionStore(environment.INTAKE_STORAGE_DIR) : undefined);
  const delivery = options.deliveryService || createEmailDeliveryService({ environment, statusStore, fetch: options.fetch });
  const allowedOrigin = configuredOrigin(environment.INTAKE_ALLOWED_ORIGIN);
  const referenceSecret = environment.INTAKE_REFERENCE_SECRET || options.referenceSecret || crypto.randomBytes(32).toString("hex");
  const inFlight = new Map();

  return async function handle(request) {
    const requestOrigin = request.headers.get("Origin") || "";
    const responseOrigin = allowedOrigin && requestOrigin === allowedOrigin ? requestOrigin : "";
    if (allowedOrigin && requestOrigin && requestOrigin !== allowedOrigin) return jsonResponse(403, { success: false, code: "rejected" });
    if (request.method === "OPTIONS" && responseOrigin) return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": responseOrigin, "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key", "Access-Control-Max-Age": "600", Vary: "Origin"
    } });
    if (request.method !== "POST") return jsonResponse(405, { success: false, code: "method_not_allowed" }, responseOrigin);
    if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json")) return jsonResponse(415, { success: false, code: "rejected" }, responseOrigin);
    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > MAX_HTTP_BODY_BYTES) return jsonResponse(413, { success: false, code: "payload_too_large" }, responseOrigin);

    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > MAX_HTTP_BODY_BYTES) throw new IntakeEndpointError("payload_too_large", 413);
      const payload = JSON.parse(raw);
      if (payload && payload.honeypot) return jsonResponse(200, { success: true }, responseOrigin);
      const receivedSubmission = validateRequestBody(payload && payload.submission);
      const key = idempotencyKey(request, receivedSubmission);
      const reference = referenceFor(key, referenceSecret);
      const originalReference = receivedSubmission.submissionMetadata.submissionId;
      const submission = IntakeModel.createSubmission(receivedSubmission, { submissionId: reference, now: receivedSubmission.submissionMetadata.submittedAt });
      (submission.attachments || []).forEach(validateUpload);
      submission.attachments = (submission.attachments || []).map((attachment, index) => ({
        ...attachment,
        attachmentId: `${reference}-ATT-${index + 1}`,
        storedFilename: null,
        storageLocation: null,
        validationStatus: "accepted"
      }));
      const documents = validateDocuments(payload && payload.documents);
      Object.keys(documents).forEach((name) => {
        if (originalReference && originalReference !== reference && typeof documents[name] === "string") {
          documents[name] = documents[name].split(originalReference).join(reference);
        }
      });
      const clientKey = (request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "anonymous").split(",")[0].trim();
      // A delivery record, rather than the guard alone, provides idempotence: retries only send failed recipients.
      try { guard.check(submission, clientKey); } catch (error) {
        if (error.code !== "duplicate_submission") throw error;
      }
      const payloadFingerprint = crypto.createHash("sha256").update(JSON.stringify({ submission, documents })).digest("hex");
      const active = inFlight.get(reference);
      if (active && active.payloadFingerprint !== payloadFingerprint) throw new IntakeEndpointError("duplicate_submission", 409);
      const processing = active ? active.promise : (async () => {
        const storageRecord = (submissionStore ? await submissionStore.create(submission, documents, {
          internalId: crypto.randomUUID(),
          idempotencyKeyHash: crypto.createHash("sha256").update(key).digest("hex"),
          payloadFingerprint,
          originalSubmission: receivedSubmission
        }) : null) || { receivedAt: new Date().toISOString(), created: true };
        let status;
        try {
          status = await delivery.deliver(submission, documents);
        } catch (_error) {
          status = { reference, customer: "failed", internal: "failed", complete: false };
        }
        if (submissionStore) await submissionStore.recordDelivery(submission.submissionMetadata.submissionId, status);
        const receivedAt = storageRecord.receivedAt || new Date().toISOString();
        return !status.complete
          ? { statusCode: 202, body: { ...publicStatus(status, receivedAt, "email_processing_failed"), code: "email_processing_failure" } }
          : { statusCode: storageRecord.created === false ? 200 : 201, body: publicStatus(status, receivedAt, "received") };
      })();
      if (!active) {
        inFlight.set(reference, { payloadFingerprint, promise: processing });
        processing.finally(() => inFlight.delete(reference)).catch(() => undefined);
      }
      const result = await processing;
      return jsonResponse(result.statusCode, result.body, responseOrigin);
    } catch (error) {
      const safe = error instanceof SyntaxError ? { statusCode: 400, body: { success: false, code: "rejected", message: "Please review the information and try again." } } : safeErrorResponse(error);
      return jsonResponse(safe.statusCode, safe.body, responseOrigin);
    }
  };
}

module.exports = Object.freeze({ MAX_HTTP_BODY_BYTES, IntakeEndpointError, validateDocuments, configuredOrigin, referenceFor, createIntakeEndpoint });
