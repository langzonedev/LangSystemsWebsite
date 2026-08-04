"use strict";

const assert = require("assert");
const model = require("../intake-model.js");
const interpreter = require("../server/requirements-interpreter.js");

const raw = {
  contact_name: "Alex Private",
  business_name: "Example Operations",
  email: "alex.private@example.com",
  phone: "0400000000",
  business_description: "A regional field service business",
  current_process: "The office tracks work in email and a spreadsheet.",
  problem_impact: "Updates are missed and staff repeat data entry.",
  problem: "Jobs are difficult to track.",
  desired_outcome: "One clear view of each job.",
  users: "Office coordinators and field staff.",
  data_storage_preference: "A mix of local and cloud",
  first_release: "Create, assign, update, and close jobs.",
  acceptance_criteria: "Authorised staff can close a job and see its history.",
  delivery_model: "Recommendation required",
  budget: "Not sure - please advise",
  timing: "Exploring options only",
  privacy_consent: "Agreed"
};

const submission = model.createSubmission(raw, { submissionId: "LS-INTERPRETER-TEST" });

module.exports = (async () => {
  const fallback = await interpreter.interpretSubmission(submission, { now: "2026-08-03T01:00:00.000Z" });
  assert.strictEqual(interpreter.validateInterpretation(fallback).valid, true);
  assert.strictEqual(fallback.metadata.generationMode, "deterministic_fallback");
  assert.strictEqual(fallback.metadata.customerApproved, false);
  assert.strictEqual(fallback.sections.problemStatement[0].status, "confirmed");
  assert.strictEqual(fallback.sections.integrationRequirements[0].status, "unknown");
  assert(fallback.sections.dataRequirements.some((item) => item.statement === "A mix of local and cloud" && item.status === "confirmed"));
  assert(fallback.sections.openQuestions.some((item) => item.blocks.estimation && item.blocks.scopeAgreement && item.blocks.development));
  assert(!JSON.stringify(fallback).includes(raw.email));
  assert(!JSON.stringify(fallback).includes(raw.phone));

  let captured;
  const validModelClient = {
    async generateRequirements(request) {
      captured = request;
      return { sections: interpreter.buildDeterministicSections(submission) };
    }
  };
  const generated = await interpreter.interpretSubmission(submission, {
    modelClient: validModelClient,
    modelVersion: "test-model-2026-08",
    now: "2026-08-03T01:01:00.000Z"
  });
  assert.strictEqual(generated.metadata.generationMode, "model");
  assert.strictEqual(generated.metadata.modelVersion, "test-model-2026-08");
  const minimisedInput = JSON.stringify(captured.input);
  assert(!minimisedInput.includes(raw.email));
  assert(!minimisedInput.includes(raw.phone));
  assert(!minimisedInput.includes("Alex Private"));
  assert(!Object.prototype.hasOwnProperty.call(captured.input, "attachments"));
  assert.strictEqual(captured.templateVersion, "1.0.0");
  assert.strictEqual(captured.responseSchema.properties.metadata.properties.customerApproved.const, false);

  const malformed = await interpreter.interpretSubmission(submission, {
    modelClient: { async generateRequirements() { return "not json"; } },
    modelVersion: "bad-model",
    now: "2026-08-03T01:02:00.000Z"
  });
  assert.strictEqual(malformed.metadata.generationMode, "deterministic_fallback");
  assert.strictEqual(interpreter.validateInterpretation(malformed).valid, true);

  const hiddenSourceSections = interpreter.buildDeterministicSections(submission);
  hiddenSourceSections.businessContext[0].sourcePaths = ["customerAnswers.customer.emailAddress"];
  const hiddenSource = await interpreter.interpretSubmission(submission, {
    modelClient: { async generateRequirements() { return { sections: hiddenSourceSections }; } },
    modelVersion: "unsafe-source-model",
    now: "2026-08-03T01:03:00.000Z"
  });
  assert.strictEqual(hiddenSource.metadata.generationMode, "deterministic_fallback");

  const invented = JSON.parse(JSON.stringify(fallback));
  invented.sections.businessContext[0] = { statement: "Invented", status: "confirmed", sourcePaths: [] };
  assert.strictEqual(interpreter.validateInterpretation(invented).valid, false);

  const invalidSubmission = JSON.parse(JSON.stringify(submission));
  invalidSubmission.customerAnswers.desiredOutcome.problemStatement = "";
  await assert.rejects(interpreter.interpretSubmission(invalidSubmission), (error) => error.code === "invalid_submission");

  console.log("Requirements interpretation, privacy minimisation, schema, and fallback checks passed.");
})();
