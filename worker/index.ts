import IntakeModel from "../intake-model.js";
import EmailDelivery from "../server/email-delivery.js";
import AiHandoff from "../server/ai-handoff-bundle.js";

const { createEmailDeliveryService } = EmailDelivery;
const { createAiHandoffBundle } = AiHandoff;

const MAX_HTTP_BODY_BYTES = 768 * 1024;
const MAX_SUBMISSION_BYTES = 256 * 1024;
const DOCUMENT_FIELDS = ["customerSummary", "technicalSpecification", "internalBrief", "clarificationQuestions", "warnings"] as const;
const REQUIRED_DOCUMENT_FIELDS = DOCUMENT_FIELDS.slice(0, 4);

type DocumentKey = typeof DOCUMENT_FIELDS[number];
type Documents = Partial<Record<DocumentKey, string>>;
type DeliveryRecipient = {
  status: "pending" | "sent" | "failed";
  attempts: number;
  providerId?: string;
  sentAt?: string;
  lastError?: string | null;
};
type DeliveryRecord = {
  reference: string;
  customer: DeliveryRecipient;
  internal: DeliveryRecipient;
  updatedAt: string;
};

class WorkerIntakeError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, statusCode: number) {
    super("The project submission could not be processed.");
    this.name = "WorkerIntakeError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

class WorkerValidationError extends WorkerIntakeError {
  validationErrors: Array<{ path: string; code: string }>;

  constructor(validationErrors: Array<{ path: string; code: string }>) {
    super("invalid_submission", 400);
    this.name = "WorkerValidationError";
    this.validationErrors = validationErrors;
  }
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function validateRequestBody(value: unknown): any {
  const encoded = JSON.stringify(value);
  if (!encoded || byteLength(encoded) > MAX_SUBMISSION_BYTES) throw new WorkerIntakeError("payload_too_large", 413);
  const result = IntakeModel.validateSubmission(value);
  if (!result.valid) throw new WorkerValidationError(result.errors);
  const submission = value as any;
  const normalised = IntakeModel.createSubmission(submission, {
    submissionId: submission.submissionMetadata.submissionId,
    now: submission.submissionMetadata.submittedAt
  });
  const normalisedResult = IntakeModel.validateSubmission(normalised);
  if (!normalisedResult.valid) throw new WorkerValidationError(normalisedResult.errors);
  return normalised;
}

function validateUpload(file: any): any {
  const name = typeof file?.originalFilename === "string" ? file.originalFilename : "";
  const extension = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  const mimeType = typeof file?.mimeType === "string" ? file.mimeType.toLowerCase() : "";
  if (!name || name.length > 255 || /[\\/]/.test(name) || name === "." || name === "..") {
    throw new WorkerValidationError([{ path: "attachments", code: "invalid_name" }]);
  }
  if (!IntakeModel.limits.allowedAttachmentExtensions.includes(extension) ||
      !IntakeModel.limits.allowedAttachmentTypes.includes(mimeType)) {
    throw new WorkerValidationError([{ path: "attachments", code: "unsupported_type" }]);
  }
  if (!Number.isFinite(file.sizeBytes) || file.sizeBytes < 1 || file.sizeBytes > IntakeModel.limits.maximumAttachmentBytes) {
    throw new WorkerValidationError([{ path: "attachments", code: "invalid_size" }]);
  }
  return file;
}

function safeErrorResponse(error: any): { statusCode: number; body: Record<string, unknown> } {
  if (error instanceof WorkerValidationError) {
    const attachmentError = error.validationErrors.some((item) => item.path === "attachments" || item.path.startsWith("attachments["));
    const customerError = error.validationErrors.some((item) => item.path.startsWith("customerAnswers.customer."));
    return {
      statusCode: 400,
      body: {
        success: false,
        code: attachmentError ? "unsupported_attachment" : customerError ? "invalid_customer" : "invalid_submission",
        message: attachmentError ? "One or more attachment references are not supported."
          : customerError ? "Please check your contact information and try again."
            : "Please review the project information and try again."
      }
    };
  }
  const status = Number.isInteger(error?.statusCode) ? error.statusCode : 503;
  const messages: Record<number, string> = {
    400: "Please review the information and try again.",
    409: "This project outline has already been received.",
    413: "The project outline is too large to send. Please shorten it or remove an attachment.",
    429: "Please wait a minute before trying again.",
    503: "We could not receive the project outline just now. Please try again shortly."
  };
  const publicCodes: Record<string, string> = {
    duplicate_submission: "duplicate_submission",
    too_many_attempts: "rate_limited",
    storage: "storage",
    email_delivery: "email_delivery",
    payload_too_large: "payload_too_large"
  };
  return {
    statusCode: status,
    body: { success: false, code: publicCodes[error?.code] || (status >= 500 ? "temporary_server" : "rejected"), message: messages[status] || messages[503] }
  };
}

function cleanDocument(value: string): string {
  return value.replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .normalize("NFC").trim();
}

function validateDocuments(value: unknown): Documents {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new WorkerIntakeError("invalid_documents", 400);
  const supplied = value as Record<string, unknown>;
  if (Object.keys(supplied).some((key) => !DOCUMENT_FIELDS.includes(key as DocumentKey))) {
    throw new WorkerIntakeError("invalid_documents", 400);
  }
  for (const key of REQUIRED_DOCUMENT_FIELDS) {
    if (typeof supplied[key] !== "string" || !supplied[key].trim() || supplied[key].length > 120000) {
      throw new WorkerIntakeError("invalid_documents", 400);
    }
  }
  if (supplied.warnings != null && (typeof supplied.warnings !== "string" || supplied.warnings.length > 10000)) {
    throw new WorkerIntakeError("invalid_documents", 400);
  }
  return Object.fromEntries(Object.entries(supplied).map(([key, document]) => [key, cleanDocument(document as string)]));
}

function allowedOrigin(env: Env): string {
  const configured = env.INTAKE_ALLOWED_ORIGIN || "";
  const parsed = new URL(configured);
  if (parsed.origin !== configured || parsed.protocol !== "https:" && !(String(env.NODE_ENV) !== "production" && parsed.protocol === "http:")) {
    throw new Error("INTAKE_ALLOWED_ORIGIN must be one exact permitted origin.");
  }
  return parsed.origin;
}

function responseHeaders(origin = ""): Headers {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer"
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return headers;
}

function json(status: number, body: unknown, origin = ""): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value: string): Promise<string> {
  return bytesToHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function referenceFor(key: string, secret: string): Promise<string> {
  const signingKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", signingKey, new TextEncoder().encode(key));
  return `LS-${bytesToBase64Url(signature).slice(0, 16).toUpperCase()}`;
}

function idempotencyKey(request: Request, submission: any): string {
  const key = request.headers.get("Idempotency-Key") || submission.submissionMetadata.submissionId;
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(key)) throw new WorkerIntakeError("invalid_idempotency_key", 400);
  return key;
}

async function enforceRateLimit(db: D1Database, request: Request): Promise<void> {
  const client = request.headers.get("CF-Connecting-IP") || "anonymous";
  const clientHash = await sha256(client);
  const now = Date.now();
  const windowStart = now - 60_000;
  await db.prepare("DELETE FROM rate_limit_events WHERE client_hash = ? AND occurred_at < ?").bind(clientHash, windowStart).run();
  const count = await db.prepare("SELECT COUNT(*) AS attempts FROM rate_limit_events WHERE client_hash = ? AND occurred_at >= ?")
    .bind(clientHash, windowStart).first<{ attempts: number }>();
  if ((count?.attempts || 0) >= 5) throw new WorkerIntakeError("too_many_attempts", 429);
  await db.prepare("INSERT INTO rate_limit_events (client_hash, occurred_at) VALUES (?, ?)").bind(clientHash, now).run();
}

function createD1DeliveryStatusStore(db: D1Database) {
  return Object.freeze({
    async get(reference: string): Promise<DeliveryRecord | null> {
      const row = await db.prepare("SELECT customer_json, internal_json, updated_at FROM delivery_status WHERE reference = ?")
        .bind(reference).first<{ customer_json: string; internal_json: string; updated_at: string }>();
      return row ? {
        reference,
        customer: JSON.parse(row.customer_json),
        internal: JSON.parse(row.internal_json),
        updatedAt: row.updated_at
      } : null;
    },
    async set(reference: string, record: DeliveryRecord): Promise<DeliveryRecord> {
      await db.prepare(`INSERT INTO delivery_status (reference, customer_json, internal_json, updated_at)
        VALUES (?, ?, ?, ?) ON CONFLICT(reference) DO UPDATE SET
        customer_json = excluded.customer_json, internal_json = excluded.internal_json, updated_at = excluded.updated_at`)
        .bind(reference, JSON.stringify(record.customer), JSON.stringify(record.internal), record.updatedAt).run();
      return record;
    }
  });
}

async function storeSubmission(db: D1Database, submission: any, documents: Documents, metadata: {
  idempotencyKeyHash: string;
  payloadFingerprint: string;
  originalSubmission: any;
}): Promise<{ created: boolean; receivedAt: string }> {
  const reference = submission.submissionMetadata.submissionId;
  const existing = await db.prepare("SELECT payload_fingerprint, received_at FROM submissions WHERE reference = ?")
    .bind(reference).first<{ payload_fingerprint: string; received_at: string }>();
  if (existing) {
    if (existing.payload_fingerprint !== metadata.payloadFingerprint) throw new WorkerIntakeError("duplicate_submission", 409);
    return { created: false, receivedAt: existing.received_at };
  }

  const receivedAt = new Date().toISOString();
  const statements = [
    db.prepare(`INSERT INTO submissions
      (reference, internal_id, idempotency_key_hash, payload_fingerprint, submitted_at, received_at, updated_at,
       processing_status, schema_version, template_version, original_submission_json, attachment_metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'stored', ?, ?, ?, ?)`)
      .bind(reference, crypto.randomUUID(), metadata.idempotencyKeyHash, metadata.payloadFingerprint,
        submission.submissionMetadata.submittedAt, receivedAt, receivedAt, submission.submissionMetadata.schemaVersion,
        submission.submissionMetadata.templateVersion, JSON.stringify(metadata.originalSubmission), JSON.stringify(submission.attachments || [])),
    ...Object.entries(documents).map(([key, content]) => db.prepare(
      "INSERT INTO submission_documents (reference, document_key, content) VALUES (?, ?, ?)"
    ).bind(reference, key, content)),
    db.prepare("INSERT INTO audit_events (reference, occurred_at, action) VALUES (?, ?, 'submission_stored')")
      .bind(reference, receivedAt)
  ];

  try {
    await db.batch(statements);
    return { created: true, receivedAt };
  } catch (error) {
    const raced = await db.prepare("SELECT payload_fingerprint, received_at FROM submissions WHERE reference = ?")
      .bind(reference).first<{ payload_fingerprint: string; received_at: string }>();
    if (raced?.payload_fingerprint === metadata.payloadFingerprint) return { created: false, receivedAt: raced.received_at };
    console.error(JSON.stringify({ event: "submission_storage_failed", reference, error: "d1_failure" }));
    throw new WorkerIntakeError("storage", 503);
  }
}

async function recordDelivery(db: D1Database, reference: string, delivery: any): Promise<void> {
  const timestamp = new Date().toISOString();
  await db.batch([
    db.prepare(`UPDATE submissions SET processing_status = ?, processing_errors_json = ?, updated_at = ? WHERE reference = ?`)
      .bind(delivery.complete ? "awaiting_review" : "delivery_failed", delivery.complete ? "[]" : '["email_delivery_failed"]', timestamp, reference),
    db.prepare("INSERT INTO audit_events (reference, occurred_at, action, outcome) VALUES (?, ?, 'email_delivery_updated', ?)")
      .bind(reference, timestamp, delivery.complete ? "sent" : "failed")
  ]);
}

function emailEnvironment(env: Env): Record<string, string> {
  return {
    NODE_ENV: env.NODE_ENV,
    INTAKE_EMAIL_MODE: env.INTAKE_EMAIL_MODE,
    INTAKE_INTERNAL_EMAIL: env.INTAKE_INTERNAL_EMAIL,
    LANG_SYSTEMS_CONTACT_EMAIL: env.LANG_SYSTEMS_CONTACT_EMAIL,
    EMAIL_FROM: env.EMAIL_FROM,
    EMAIL_PROVIDER_URL: env.EMAIL_PROVIDER_URL,
    RESEND_API_KEY: env.RESEND_API_KEY || "",
    INTAKE_REVIEW_BASE_URL: env.INTAKE_REVIEW_BASE_URL || ""
  };
}

async function readRequestBody(request: Request): Promise<string> {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_HTTP_BODY_BYTES) throw new WorkerIntakeError("payload_too_large", 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_HTTP_BODY_BYTES) throw new WorkerIntakeError("payload_too_large", 413);
  return raw;
}

function publicStatus(delivery: any, receivedAt: string, processingStatus: string) {
  return {
    success: true,
    submissionReference: delivery.reference,
    reference: delivery.reference,
    receivedAt,
    processingStatus,
    customerEmailStatus: delivery.customer,
    internalEmailStatus: delivery.internal
  };
}

async function handleSubmission(request: Request, env: Env, origin: string): Promise<Response> {
  if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json")) {
    return json(415, { success: false, code: "rejected" }, origin);
  }

  try {
    const raw = await readRequestBody(request);
    const payload = JSON.parse(raw);
    if (payload?.honeypot) return json(200, { success: true, submissionReference: "LS-RECEIVED", reference: "LS-RECEIVED" }, origin);
    await enforceRateLimit(env.INTAKE_DB, request);

    const receivedSubmission = validateRequestBody(payload?.submission);
    const key = idempotencyKey(request, receivedSubmission);
    const referenceSecret = env.INTAKE_REFERENCE_SECRET || (String(env.NODE_ENV) === "production" ? "" : "local-development-reference-secret-only");
    if (referenceSecret.length < 32) throw new Error("INTAKE_REFERENCE_SECRET is not configured.");
    const reference = await referenceFor(key, referenceSecret);
    const originalReference = receivedSubmission.submissionMetadata.submissionId;
    const submission = IntakeModel.createSubmission(receivedSubmission, {
      submissionId: reference,
      now: receivedSubmission.submissionMetadata.submittedAt
    });
    (submission.attachments || []).forEach(validateUpload);
    submission.attachments = (submission.attachments || []).map((attachment: any, index: number) => ({
      ...attachment,
      attachmentId: `${reference}-ATT-${index + 1}`,
      storedFilename: null,
      storageLocation: null,
      validationStatus: "accepted"
    }));
    const documents = validateDocuments(payload?.documents);
    for (const keyName of Object.keys(documents) as DocumentKey[]) {
      if (originalReference !== reference) documents[keyName] = documents[keyName]!.split(originalReference).join(reference);
    }

    const fingerprint = await sha256(JSON.stringify({ submission, documents }));
    const stored = await storeSubmission(env.INTAKE_DB, submission, documents, {
      idempotencyKeyHash: await sha256(key),
      payloadFingerprint: fingerprint,
      originalSubmission: receivedSubmission
    });
    const deliveryService = createEmailDeliveryService({
      environment: emailEnvironment(env),
      statusStore: createD1DeliveryStatusStore(env.INTAKE_DB),
      handoffBuilder: createAiHandoffBundle,
      fetch
    });
    const delivery = await deliveryService.deliver(submission, documents);
    await recordDelivery(env.INTAKE_DB, reference, delivery);
    if (!delivery.complete) {
      console.warn(JSON.stringify({ event: "email_delivery_incomplete", reference, customer: delivery.customer, internal: delivery.internal }));
      return json(202, { ...publicStatus(delivery, stored.receivedAt, "email_processing_failed"), code: "email_processing_failure" }, origin);
    }
    console.log(JSON.stringify({ event: "submission_received", reference, created: stored.created }));
    return json(stored.created ? 201 : 200, publicStatus(delivery, stored.receivedAt, "received"), origin);
  } catch (error) {
    const safe = error instanceof SyntaxError
      ? { statusCode: 400, body: { success: false, code: "rejected", message: "Please review the information and try again." } }
      : error instanceof WorkerIntakeError && error.code === "invalid_documents"
        ? { statusCode: 400, body: { success: false, code: "invalid_submission", message: "Please review the project information and try again." } }
        : safeErrorResponse(error);
    if (safe.statusCode >= 500) console.error(JSON.stringify({ event: "submission_failed", code: safe.body.code }));
    return json(safe.statusCode, safe.body, origin);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/healthz" && request.method === "GET") {
      return json(200, { ok: true, service: "lang-systems-intake" });
    }
    if (url.pathname !== "/api/project-submissions") return json(404, { success: false, code: "not_found" });

    let configuredOrigin: string;
    try {
      configuredOrigin = allowedOrigin(env);
    } catch (_error) {
      return json(503, { success: false, code: "temporary_server" });
    }
    const requestOrigin = request.headers.get("Origin") || "";
    if (requestOrigin && requestOrigin !== configuredOrigin) return json(403, { success: false, code: "rejected" });
    const responseOrigin = requestOrigin === configuredOrigin ? configuredOrigin : "";

    if (request.method === "OPTIONS") {
      if (!responseOrigin) return json(403, { success: false, code: "rejected" });
      const headers = responseHeaders(responseOrigin);
      headers.delete("Content-Type");
      headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key");
      headers.set("Access-Control-Max-Age", "600");
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") return json(405, { success: false, code: "method_not_allowed" }, responseOrigin);
    return handleSubmission(request, env, responseOrigin);
  }
} satisfies ExportedHandler<Env>;

export { referenceFor, validateDocuments };
