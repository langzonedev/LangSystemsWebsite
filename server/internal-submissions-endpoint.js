"use strict";

const crypto = require("crypto");
const { validateReference, REVIEW_STATUSES } = require("./submission-store.js");

const MAX_PATCH_BYTES = 4096;

function response(status, body, contentType = "application/json; charset=utf-8") {
  const headers = { "Content-Type": contentType, "Cache-Control": "no-store, private", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer" };
  return new Response(contentType.startsWith("application/json") ? JSON.stringify(body) : body, { status, headers });
}

function authorised(request, token) {
  const supplied = request.headers.get("Authorization") || "";
  const expected = `Bearer ${token}`;
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function createInternalSubmissionsEndpoint(options = {}) {
  const environment = options.environment || process.env;
  const token = environment.INTAKE_ADMIN_TOKEN || "";
  if (token.length < 32) throw new Error("INTAKE_ADMIN_TOKEN must contain at least 32 characters.");
  if (!options.submissionStore) throw new Error("A submission store is required.");
  const store = options.submissionStore;
  const now = options.now || Date.now;
  const authWindowMs = options.authWindowMs || 60 * 1000;
  const maximumAuthFailures = options.maximumAuthFailures || 10;
  const authFailures = new Map();

  return async function handle(request, route) {
    if (!authorised(request, token)) {
      const clientKey = (request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "anonymous").split(",")[0].trim();
      const timestamp = now();
      const recent = (authFailures.get(clientKey) || []).filter((attempt) => timestamp - attempt < authWindowMs);
      if (recent.length >= maximumAuthFailures) return response(429, { success: false, code: "rate_limited" });
      recent.push(timestamp);
      authFailures.set(clientKey, recent);
      return response(401, { success: false, code: "unauthorised" });
    }
    try {
      const reference = validateReference(route.reference);
      if (route.documentKey) {
        if (request.method !== "GET") return response(405, { success: false, code: "method_not_allowed" });
        const document = await store.getDocument(reference, route.documentKey);
        return document == null ? response(404, { success: false, code: "not_found" }) : response(200, document, "text/plain; charset=utf-8");
      }
      if (request.method === "GET") {
        const record = await store.get(reference);
        return record ? response(200, { success: true, submission: record }) : response(404, { success: false, code: "not_found" });
      }
      if (request.method === "PATCH") {
        const length = Number(request.headers.get("Content-Length") || 0);
        if (length > MAX_PATCH_BYTES || !(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json")) return response(400, { success: false, code: "invalid_request" });
        const raw = await request.text();
        if (Buffer.byteLength(raw) > MAX_PATCH_BYTES) return response(400, { success: false, code: "invalid_request" });
        const body = JSON.parse(raw);
        if (!body || Object.keys(body).length !== 1 || !REVIEW_STATUSES.includes(body.manualReviewStatus)) return response(400, { success: false, code: "invalid_review_status" });
        return response(200, { success: true, submission: await store.updateReview(reference, body.manualReviewStatus) });
      }
      return response(405, { success: false, code: "method_not_allowed" });
    } catch (error) {
      if (error instanceof SyntaxError || error.statusCode === 400) return response(400, { success: false, code: "invalid_request" });
      if (error.code === "not_found") return response(404, { success: false, code: "not_found" });
      return response(503, { success: false, code: "temporary_server" });
    }
  };
}

module.exports = Object.freeze({ createInternalSubmissionsEndpoint });
