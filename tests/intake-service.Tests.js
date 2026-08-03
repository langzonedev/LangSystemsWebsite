"use strict";

const assert = require("assert");
const model = require("../intake-model.js");

global.window = {
  LangSystemsIntakeModel: model,
  location: { href: "https://langsystems.com.au/" },
  setTimeout,
  clearTimeout
};
require("../intake-service.js");

const submission = model.createSubmission({
  contact_name: "Alex Example", business_name: "Example Operations", email: "alex@example.com",
  business_description: "Regional service business", current_process: "Email and spreadsheet",
  problem_impact: "Updates are missed", problem: "Jobs are difficult to track",
  desired_outcome: "One clear view", users: "Office staff", first_release: "Track jobs",
  acceptance_criteria: "Staff can close a job", delivery_model: "Recommendation required",
  budget: "Not sure — please advise", timing: "Exploring options only", privacy_consent: "Agreed"
}, { submissionId: "LS-SERVICE-TEST" });
const generated = {
  structured_project_data_json: model.serialiseSubmission(submission),
  customer_friendly_project_summary: "Customer summary",
  technical_requirements_specification_internal: "Technical specification",
  lang_systems_project_brief_internal: "Internal brief",
  clarification_questions_internal: "Questions"
};
const formData = { get: (name) => generated[name] || null };

module.exports = (async () => {
  global.fetch = async (_url, options) => {
    assert.strictEqual(options.headers["Content-Type"], "application/json");
    const payload = JSON.parse(options.body);
    assert.strictEqual(payload.submission.submissionMetadata.submissionId, "LS-SERVICE-TEST");
    assert.strictEqual(payload.documents.internalBrief, "Internal brief");
    return { ok: true, status: 200, json: async () => ({ success: true, reference: "LS-SERVICE-TEST" }) };
  };
  const accepted = await window.LangSystemsIntakeSubmission.submit({ endpoint: "https://form.example.test/intake", formData });
  assert.strictEqual(accepted.success, true);

  global.fetch = async () => ({ ok: false, status: 503, json: async () => ({ success: false, code: "email_delivery" }) });
  await assert.rejects(
    window.LangSystemsIntakeSubmission.submit({ endpoint: "https://form.example.test/intake", formData }),
    (error) => error.code === "email_delivery"
  );

  global.fetch = async () => ({ ok: false, status: 503, json: async () => ({
    success: false, code: "email_delivery", reference: "LS-SERVICE-TEST",
    delivery: { customer: "sent", internal: "failed", complete: false }
  }) });
  await assert.rejects(
    window.LangSystemsIntakeSubmission.submit({ endpoint: "https://form.example.test/intake", formData }),
    (error) => error.code === "email_delivery" && error.reference === "LS-SERVICE-TEST" && error.delivery.internal === "failed"
  );

  global.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(Object.assign(new Error("stopped"), { name: "AbortError" })), { once: true });
  });
  await assert.rejects(
    window.LangSystemsIntakeSubmission.submit({ endpoint: "https://form.example.test/intake", formData, timeoutMs: 1 }),
    (error) => error.code === "timeout"
  );

  console.log("Intake submission success, provider failure, and timeout checks passed.");
})();
