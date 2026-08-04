"use strict";

const assert = require("assert");
const model = require("../intake-model.js");
const generator = require("../clarification-questions.js");

function submission(overrides) {
  const value = model.createSubmission({
    contact_name: "Alex Example", business_name: "Example Operations", email: "alex@example.com",
    business_description: "Regional service business",
    current_process: "Office staff copy job details from email into a spreadsheet.",
    problem_impact: "Updates are missed", problem: "Jobs are difficult to track",
    desired_outcome: "One clear view of each job", users: "Office staff and supervisors",
    first_release: "Create, assign and close jobs", acceptance_criteria: "A supervisor can confirm a completed job",
    delivery_model: "Recommendation required", budget: "Not sure - please advise",
    timing: "Exploring options only", privacy_consent: "Agreed"
  }, { submissionId: "LS-CLARIFICATION-TEST", submittedAt: "2026-08-03T01:02:03.000Z" });
  if (overrides) overrides(value);
  assert.strictEqual(model.validateSubmission(value).valid, true);
  return value;
}

const focused = generator.generate(submission());
const focusedItems = Object.values(focused.groups).flat();
assert.ok(focusedItems.length > 0 && focusedItems.length <= 5, "The default output should contain approximately five focused questions.");
assert.ok(focused.groups.requiredBeforeEstimation.length > 0, "Estimation blockers should be identified.");
assert.ok(focused.groups.requiredBeforeDevelopment.length > 0, "Development blockers should be distinguished.");
assert.ok(focused.groups.helpfulButNonBlocking.length > 0, "Helpful questions should be distinguished.");
assert.ok(focusedItems.every((item) => item.reason && item.sourcePaths.length && typeof item.contradiction === "boolean"), "Every internal item needs a reason, sources and contradiction flag.");
assert.ok(focused.customerFollowUp.requiredBeforeEstimation.every((item) => typeof item === "string"), "Customer follow-up output should omit internal metadata.");
assert.ok(focused.renderedInternal.includes("manual review required") && focused.renderedInternal.includes("Internal reason:"), "Internal rendering should retain review safeguards and reasons.");
assert.strictEqual(generator.validateOutput(focused).valid, true);

const answered = generator.generate(submission((value) => {
  const desired = value.customerAnswers.desiredOutcome;
  const commercial = value.customerAnswers.commercial;
  const current = value.customerAnswers.currentProcess;
  desired.existingDataSources = "A spreadsheet with about 2,000 job rows will be imported.";
  desired.existingSystemConnections = "None";
  desired.approximateUserCount = "12";
  desired.deviceRequirements = ["Office computers", "Work phones"];
  desired.offlineRequirements = "Internet is always available; offline use is not required.";
  desired.dataStoragePreference = "Securely online so authorised people can access it from anywhere (cloud)";
  desired.privacySecurityConsiderations = "Customer contact details are visible only to office staff.";
  current.currentUsers = "Office coordinators and supervisors";
  value.customerAnswers.scope.explicitExclusions = "Customer invoicing";
  commercial.approximateBudgetRange = "$20,000-$30,000";
  commercial.timelineContext = "Preferred before the November busy period; date is flexible.";
  commercial.dayToDayOwner = "Operations manager";
  commercial.ownershipPreference = "Customer-owned solution";
  commercial.ongoingSupportPreference = "Please explain both options";
  value.customerAnswers.additionalContext.visualDesignPreference = "Create a clean, neutral design for the first version";
}));
const answeredIds = Object.values(answered.groups).flat().map((item) => item.id);
assert.ok(!answeredIds.includes("existing-data") && !answeredIds.includes("integrations") && !answeredIds.includes("users-and-permissions") && !answeredIds.includes("devices-and-offline") && !answeredIds.includes("visual-design-direction"), "Answered topics must not be asked again.");

const contradictory = generator.generate(submission((value) => {
  value.customerAnswers.desiredOutcome.existingSystemConnections = "None";
  value.customerAnswers.scope.essentialFirstRelease = "Synchronise each completed job with the accounting system.";
  value.customerAnswers.commercial.approximateBudgetRange = "$10,000-$20,000";
}));
assert.ok(contradictory.contradictions.some((item) => item.id === "integration-conflict"), "Contradictory integration answers should be flagged.");
assert.ok(contradictory.groups.requiredBeforeEstimation.some((item) => item.id === "integration-conflict" && item.contradiction), "Contradictions should create a blocking clarification question.");

const limited = generator.generate(submission(), { maximumQuestions: 2 });
assert.strictEqual(Object.values(limited.groups).flat().length, 2, "The configured question limit should be enforced.");
assert.throws(() => generator.generate({}), (error) => error.code === "invalid_submission" && !JSON.stringify(error).includes("alex@example.com"));

console.log("Clarification question targeting, grouping, contradictions, validation, and limits passed.");
