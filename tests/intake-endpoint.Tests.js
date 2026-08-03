"use strict";

const assert = require("assert");
const model = require("../intake-model.js");
const { createIntakeEndpoint } = require("../server/intake-endpoint.js");

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
  const calls = [];
  const deliveryService = { async deliver(value, generated) {
    calls.push({ reference: value.submissionMetadata.submissionId, generated: Object.keys(generated) });
    return { reference: value.submissionMetadata.submissionId, customer: "sent", internal: "sent", complete: true };
  } };
  const endpoint = createIntakeEndpoint({
    environment: { INTAKE_ALLOWED_ORIGIN: "https://langsystems.com.au" }, deliveryService
  });
  const response = await endpoint(new Request("https://api.example.test/api/project-submissions", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://langsystems.com.au" },
    body: JSON.stringify({ submission, documents, honeypot: "" })
  }));
  assert.strictEqual(response.status, 200);
  assert.strictEqual((await response.json()).success, true);
  assert.strictEqual(calls.length, 1);

  const lifecycle = [];
  const storedEndpoint = createIntakeEndpoint({
    environment: {},
    submissionStore: {
      async create(value, generated) { lifecycle.push(`stored:${value.submissionMetadata.submissionId}:${generated.customerSummary}`); },
      async recordDelivery(reference, status) { lifecycle.push(`delivery:${reference}:${status.complete}`); }
    },
    deliveryService: { async deliver() {
      lifecycle.push("email");
      return { reference: "LS-ENDPOINT-TEST", customer: "sent", internal: "sent", complete: true };
    } }
  });
  const storedResponse = await storedEndpoint(new Request("https://api.example.test/api/project-submissions", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submission, documents })
  }));
  assert.strictEqual(storedResponse.status, 200);
  assert.deepStrictEqual(lifecycle, ["stored:LS-ENDPOINT-TEST:Customer summary", "email", "delivery:LS-ENDPOINT-TEST:true"]);

  const partialEndpoint = createIntakeEndpoint({
    environment: {},
    deliveryService: { async deliver() {
      return { reference: "LS-ENDPOINT-TEST", customer: "sent", internal: "failed", complete: false };
    } }
  });
  const partialResponse = await partialEndpoint(new Request("https://api.example.test/api/project-submissions", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submission, documents, honeypot: "" })
  }));
  const partialBody = await partialResponse.json();
  assert.strictEqual(partialResponse.status, 503);
  assert.strictEqual(partialBody.success, false);
  assert.strictEqual(partialBody.reference, "LS-ENDPOINT-TEST");
  assert.strictEqual(partialBody.delivery.internal, "failed");

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

  const bot = await endpoint(new Request("https://api.example.test/api/project-submissions", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ honeypot: "filled by bot" })
  }));
  assert.strictEqual(bot.status, 200);
  assert.strictEqual(calls.length, 1);

  console.log("Intake endpoint validation, origin, honeypot, and safe-response checks passed.");
})();
