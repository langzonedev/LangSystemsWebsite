"use strict";

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
  return documents;
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
  const guard = options.guard || createSubmissionGuard();
  const statusStore = options.statusStore || (environment.INTAKE_STATUS_FILE ? createFileDeliveryStatusStore(environment.INTAKE_STATUS_FILE) : undefined);
  const submissionStore = options.submissionStore || (environment.INTAKE_STORAGE_DIR ? createFileSubmissionStore(environment.INTAKE_STORAGE_DIR) : undefined);
  const delivery = options.deliveryService || createEmailDeliveryService({ environment, statusStore, fetch: options.fetch });
  const allowedOrigin = configuredOrigin(environment.INTAKE_ALLOWED_ORIGIN);

  return async function handle(request) {
    const requestOrigin = request.headers.get("Origin") || "";
    const responseOrigin = allowedOrigin && requestOrigin === allowedOrigin ? requestOrigin : "";
    if (allowedOrigin && requestOrigin && requestOrigin !== allowedOrigin) return jsonResponse(403, { success: false, code: "rejected" });
    if (request.method === "OPTIONS" && responseOrigin) return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": responseOrigin, "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600", Vary: "Origin"
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
      const submission = validateRequestBody(payload && payload.submission);
      (submission.attachments || []).forEach(validateUpload);
      const documents = validateDocuments(payload && payload.documents);
      const clientKey = (request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "anonymous").split(",")[0].trim();
      // A delivery record, rather than the guard alone, provides idempotence: retries only send failed recipients.
      try { guard.check(submission, clientKey); } catch (error) {
        if (error.code !== "duplicate_submission") throw error;
      }
      if (submissionStore) await submissionStore.create(submission, documents);
      const status = await delivery.deliver(submission, documents);
      if (submissionStore) await submissionStore.recordDelivery(submission.submissionMetadata.submissionId, status);
      if (!status.complete) return jsonResponse(503, { success: false, code: "email_delivery", reference: status.reference, delivery: status }, responseOrigin);
      return jsonResponse(200, { success: true, reference: status.reference, delivery: status }, responseOrigin);
    } catch (error) {
      const safe = error instanceof SyntaxError ? { statusCode: 400, body: { success: false, code: "rejected", message: "Please review the information and try again." } } : safeErrorResponse(error);
      return jsonResponse(safe.statusCode, safe.body, responseOrigin);
    }
  };
}

module.exports = Object.freeze({ MAX_HTTP_BODY_BYTES, IntakeEndpointError, validateDocuments, configuredOrigin, createIntakeEndpoint });
