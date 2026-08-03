"use strict";

const assert = require("assert");
const model = require("../intake-model.js");
const { createIntakeEndpoint, referenceFor } = require("../server/intake-endpoint.js");

const submission = model.createSubmission({
  contact_name: "Alex Example", business_name: "Example Operations", email: "alex@example.com",
  business_description: "Regional service business", current_process: "Email and spreadsheet",
  problem_impact: "Updates are missed", problem: "Jobs are difficult to track",
  desired_outcome: "One clear view", users: "Office staff", first_release: "Track jobs",
  acceptance_criteria: "Staff can close a job", delivery_model: "Recommendation required",
  budget: "Not sure — please advise", timing: "Exploring options only", privacy_consent: "Agreed"
}, { submissionId: "LS-ENDPOINT-TEST" });
const documents = {
  customerSummary: "Customer summary", technicalSpecification: "Technical specification",
  internalBrief: "Internal brief", clarificationQuestions: "Clarification questions", warnings: ""
};

module.exports = (async () => {
  const referenceSecret = "test-reference-secret-with-at-least-32-characters";
  const publicReference = referenceFor("LS-ENDPOINT-TEST", referenceSecret);
  const calls = [];
  const deliveryService = { async deliver(value, generated) {
    calls.push({ reference: value.submissionMetadata.submissionId, generated: Object.keys(generated) });
    return { reference: value.submissionMetadata.submissionId, customer: "sent", internal: "sent", complete: true };
  } };
  const endpoint = createIntakeEndpoint({
    environment: { INTAKE_ALLOWED_ORIGIN: "https://langsystems.com.au" }, deliveryService, referenceSecret
  });
  const response = await endpoint(new Request("https://api.example.test/api/project-submissions", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://langsystems.com.au" },
    body: JSON.stringify({ submission, documents, honeypot: "" })
  }));
  assert.strictEqual(response.status, 201);
  const acceptedBody = await response.json();
  assert.strictEqual(acceptedBody.success, true);
  assert.strictEqual(acceptedBody.submissionReference, publicReference);
  assert.strictEqual(acceptedBody.processingStatus, "received");
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].reference, publicReference);

  const lifecycle = [];
  const storedEndpoint = createIntakeEndpoint({
    environment: {}, referenceSecret,
    submissionStore: {
      async create(value, generated) { lifecycle.push(`stored:${value.submissionMetadata.submissionId}:${generated.customerSummary}`); },
      async recordDelivery(reference, status) { lifecycle.push(`delivery:${reference}:${status.complete}`); }
    },
    deliveryService: { async deliver() {
      lifecycle.push("email");
      return { reference: publicReference, customer: "sent", internal: "sent", complete: true };
    } }
  });
  const storedResponse = await storedEndpoint(new Request("https://api.example.test/api/project-submissions", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submission, documents })
  }));
  assert.strictEqual(storedResponse.status, 201);
  assert.deepStrictEqual(lifecycle, [`stored:${publicReference}:Customer summary`, "email", `delivery:${publicReference}:true`]);

  const partialEndpoint = createIntakeEndpoint({
    environment: {}, referenceSecret,
    deliveryService: { async deliver() {
      return { reference: publicReference, customer: "sent", internal: "failed", complete: false };
    } }
  });
  const partialResponse = await partialEndpoint(new Request("https://api.example.test/api/project-submissions", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submission, documents, honeypot: "" })
  }));
  const partialBody = await partialResponse.json();
  assert.strictEqual(partialResponse.status, 202);
  assert.strictEqual(partialBody.success, true);
  assert.strictEqual(partialBody.submissionReference, publicReference);
  assert.strictEqual(partialBody.processingStatus, "email_processing_failed");
  assert.strictEqual(partialBody.internalEmailStatus, "failed");

  const preflight = await endpoint(new Request("https://api.example.test/api/project-submissions", {
    method: "OPTIONS", headers: { Origin: "https://langsystems.com.au", "Access-Control-Request-Method": "POST" }
  }));
  assert.strictEqual(preflight.status, 204);
  assert.strictEqual(preflight.headers.get("Access-Control-Allow-Origin"), "https://langsystems.com.au");

  const rejectedOrigin = await endpoint(new Request("https://api.example.test/api/project-submissions", {
    method: "POST", headers: { Origin: "https://attacker.example" }, body: JSON.stringify({ submission, documents })
  }));
  assert.strictEqual(rejectedOrigin.status, 403);

  const invalid = await endpoint(new Request("https://api.example.test/api/project-submissions", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submission, documents: { customerSummary: "missing required documents" } })
  }));
  assert.strictEqual(invalid.status, 400);
  assert.strictEqual(calls.length, 1);

  const invalidCustomerSubmission = JSON.parse(JSON.stringify(submission));
  invalidCustomerSubmission.customerAnswers.customer.emailAddress = "not-an-email";
  const invalidCustomer = await endpoint(new Request("https://api.example.test/api/project-submissions", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submission: invalidCustomerSubmission, documents })
  }));
  assert.strictEqual(invalidCustomer.status, 400);
  assert.strictEqual((await invalidCustomer.json()).code, "invalid_customer");

  const unsupportedSubmission = JSON.parse(JSON.stringify(submission));
  unsupportedSubmission.attachments = [{
    attachmentId: "LS-ENDPOINT-TEST-ATT-1", originalFilename: "malware.exe", storedFilename: "malware.exe",
    mimeType: "application/x-msdownload", sizeBytes: 120, storageLocation: "email-delivery-service", validationStatus: "pending"
  }];
  const unsupported = await endpoint(new Request("https://api.example.test/api/project-submissions", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submission: unsupportedSubmission, documents })
  }));
  assert.strictEqual(unsupported.status, 400);
  assert.strictEqual((await unsupported.json()).code, "unsupported_attachment");

  const storageEndpoint = createIntakeEndpoint({
    environment: {}, referenceSecret,
    submissionStore: {
      async create() { throw Object.assign(new Error("private detail"), { code: "storage", statusCode: 503 }); },
      async recordDelivery() { throw new Error("must not run"); }
    },
    deliveryService: { async deliver() { throw new Error("must not run"); } }
  });
  const storageFailure = await storageEndpoint(new Request("https://api.example.test/api/project-submissions", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submission, documents })
  }));
  const storageFailureBody = await storageFailure.json();
  assert.strictEqual(storageFailure.status, 503);
  assert.strictEqual(storageFailureBody.code, "storage");
  assert.ok(!JSON.stringify(storageFailureBody).includes("private detail"));

  assert.throws(() => createIntakeEndpoint({
    environment: { NODE_ENV: "production", INTAKE_STATUS_FILE: "C:\\tmp\\status.json", INTAKE_STORAGE_DIR: "C:\\tmp\\submissions", INTAKE_ALLOWED_ORIGIN: "https://langsystems.com.au" }
  }), /INTAKE_REFERENCE_SECRET/);

  const bot = await endpoint(new Request("https://api.example.test/api/project-submissions", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ honeypot: "filled by bot" })
  }));
  assert.strictEqual(bot.status, 200);
  assert.strictEqual(calls.length, 1);

  console.log("Intake endpoint storage-first, reference, validation, partial-email, and safe-response checks passed.");
})();
