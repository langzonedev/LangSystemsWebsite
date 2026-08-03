"use strict";

const assert = require("assert");
const model = require("../intake-model.js");
const validation = require("../server/intake-validation.js");

const raw = {
  contact_name: "Alex Example",
  business_name: "Example Operations",
  email: "alex@example.com",
  business_description: "Regional service business",
  current_process: "Email and spreadsheet",
  problem_impact: "Updates are missed",
  problem: "Jobs are difficult to track",
  desired_outcome: "One clear view",
  users: "Office staff",
  first_release: "Track jobs",
  acceptance_criteria: "Staff can close a job",
  delivery_model: "Recommendation required",
  budget: "Not sure — please advise",
  timing: "Exploring options only",
  privacy_consent: "Agreed"
};

const submission = model.createSubmission(raw, { submissionId: "LS-SERVER-TEST" });
assert.strictEqual(validation.validateRequestBody(JSON.stringify(submission)).submissionMetadata.submissionId, "LS-SERVER-TEST");
assert.throws(() => validation.validateRequestBody("{"), validation.IntakeRequestValidationError);
assert.throws(() => validation.validateRequestBody("x".repeat(validation.MAX_REQUEST_BYTES + 1)), validation.IntakeRequestLimitError);
assert.throws(() => validation.validateUpload({ originalFilename: "unsafe.exe", mimeType: "application/x-msdownload", sizeBytes: 100 }), validation.IntakeRequestValidationError);
assert.doesNotThrow(() => validation.validateUpload({ originalFilename: "outline.pdf", mimeType: "application/pdf", sizeBytes: 100 }));

let clock = 1000;
const guard = validation.createSubmissionGuard({ now: () => clock, maximumAttempts: 2 });
assert.strictEqual(guard.check(submission, "client-1"), submission);
assert.throws(() => guard.check(submission, "client-1"), (error) => error.code === "duplicate_submission");
const second = model.createSubmission(raw, { submissionId: "LS-SERVER-TEST-2" });
assert.throws(() => guard.check(second, "client-1"), (error) => error.code === "too_many_attempts");
assert.strictEqual(validation.safeErrorResponse(new validation.IntakeRequestLimitError("too_many_attempts", 429)).statusCode, 429);

console.log("Server intake validation and duplicate-prevention checks passed.");
