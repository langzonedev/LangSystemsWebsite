"use strict";

// Runtime-neutral server boundary. A future intake endpoint should call this before
// storing a submission, generating documents, sending email, or logging metadata.
const IntakeModel = require("../intake-model.js");
const MAX_REQUEST_BYTES = 256 * 1024;
const ALLOWED_EXTENSIONS = IntakeModel.limits.allowedAttachmentExtensions;
const ALLOWED_TYPES = IntakeModel.limits.allowedAttachmentTypes;

class IntakeRequestValidationError extends Error {
  constructor(errors) {
    super("The project submission did not pass server validation.");
    this.name = "IntakeRequestValidationError";
    this.statusCode = 400;
    // These contain paths and rule names only; never attach submitted values.
    this.validationErrors = errors;
  }
}

class IntakeRequestLimitError extends Error {
  constructor(code, statusCode) {
    super("The project submission could not be accepted.");
    this.name = "IntakeRequestLimitError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function byteLength(value) {
  if (typeof Buffer !== "undefined") return Buffer.byteLength(value, "utf8");
  return value.length * 2;
}

function validateRequestBody(body) {
  let submission;

  if (typeof body === "string" && byteLength(body) > MAX_REQUEST_BYTES) {
    throw new IntakeRequestLimitError("payload_too_large", 413);
  }

  try {
    submission = typeof body === "string" ? JSON.parse(body) : body;
  } catch (_error) {
    throw new IntakeRequestValidationError([
      { path: "$", code: "invalid_json", message: "The request body must be valid JSON." }
    ]);
  }

  if (typeof body !== "string") {
    let encoded;
    try {
      encoded = JSON.stringify(body);
    } catch (_error) {
      throw new IntakeRequestValidationError([{ path: "$", code: "invalid_format", message: "The request format is not supported." }]);
    }
    if (!encoded || byteLength(encoded) > MAX_REQUEST_BYTES) throw new IntakeRequestLimitError("payload_too_large", 413);
  }

  const result = IntakeModel.validateSubmission(submission);
  if (!result.valid) throw new IntakeRequestValidationError(result.errors);
  return submission;
}

function validateUpload(file) {
  const name = file && typeof file.originalFilename === "string" ? file.originalFilename : "";
  const extension = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  const mimeType = file && typeof file.mimeType === "string" ? file.mimeType.toLowerCase() : "";
  const size = file && file.sizeBytes;
  if (!name || name.length > 255) {
    throw new IntakeRequestValidationError([{ path: "attachments", code: "invalid_name", message: "This attachment name is not supported." }]);
  }
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new IntakeRequestValidationError([{ path: "attachments", code: "unsupported_type", message: "This attachment type is not supported." }]);
  }
  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw new IntakeRequestValidationError([{ path: "attachments", code: "unsupported_type", message: "This attachment type is not supported." }]);
  }

  if (!Number.isFinite(size) || size < 1 || size > IntakeModel.limits.maximumAttachmentBytes) {
    throw new IntakeRequestValidationError([{ path: "attachments", code: "invalid_size", message: "This attachment is outside the allowed size." }]);
  }
  return file;
}

function createSubmissionGuard(options = {}) {
  const now = options.now || Date.now;
  const windowMs = options.windowMs || 60 * 1000;
  const duplicateWindowMs = options.duplicateWindowMs || 10 * 60 * 1000;
  const maximumAttempts = options.maximumAttempts || 3;
  const attempts = new Map();
  const submissions = new Map();

  return Object.freeze({
    check(submission, clientKey = "anonymous") {
      const time = now();
      const recent = (attempts.get(clientKey) || []).filter((attempt) => time - attempt < windowMs);
      if (recent.length >= maximumAttempts) throw new IntakeRequestLimitError("too_many_attempts", 429);
      recent.push(time);
      attempts.set(clientKey, recent);

      const submissionId = submission && submission.submissionMetadata && submission.submissionMetadata.submissionId;
      const previous = submissions.get(submissionId);
      if (submissions.has(submissionId) && time - previous < duplicateWindowMs) throw new IntakeRequestLimitError("duplicate_submission", 409);
      submissions.set(submissionId, time);
      return submission;
    }
  });
}

function safeErrorResponse(error) {
  const status = error && Number.isInteger(error.statusCode) ? error.statusCode : 503;
  const publicCodes = {
    duplicate_submission: "duplicate_submission",
    too_many_attempts: "rate_limited",
    storage: "storage",
    email_delivery: "email_delivery"
  };
  const messages = {
    400: "Please review the information and try again.",
    409: "This project outline has already been received.",
    413: "The project outline is too large to send. Please shorten it or remove an attachment.",
    429: "Please wait a minute before trying again.",
    503: "We could not receive the project outline just now. Please try again shortly."
  };
  return { statusCode: status, body: { success: false, code: publicCodes[error && error.code] || (status >= 500 ? "temporary_server" : "rejected"), message: messages[status] || messages[503] } };
}

module.exports = Object.freeze({
  MAX_REQUEST_BYTES,
  IntakeRequestValidationError,
  IntakeRequestLimitError,
  validateRequestBody,
  validateUpload,
  createSubmissionGuard,
  safeErrorResponse
});
