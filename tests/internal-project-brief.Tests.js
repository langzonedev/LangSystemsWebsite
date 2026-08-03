"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const model = require("../intake-model.js");
const briefGenerator = require("../internal-project-brief.js");
const customerSummary = require("../customer-summary.js");

const raw = {
  contact_name: "Alex Private", business_name: "Example Operations", email: "alex.private@example.com",
  phone: "0400000000", business_description: "A regional field service business",
  current_process: "The office tracks work in email and a spreadsheet.",
  problem_impact: "Updates are missed and staff repeat data entry.", problem: "Jobs are difficult to track.",
  desired_outcome: "One clear view of each job.", users: "Office coordinators and field staff.",
  existing_systems: "An accounting service is the authoritative customer record.",
  data_needs: "Customer and job records from the current spreadsheet.",
  first_release: "Create, assign, update, and close jobs.", optional_requirements: "Customer notifications.",
  future_ideas: "Route optimisation.", excluded_functionality: "Payments.",
  acceptance_criteria: "Authorised staff can close a job and see its history.",
  constraints: "Use on office computers and field phones.", delivery_model: "Customer-owned bespoke build",
  budget: "AUD $15,000–$40,000", timing: "Within 3–6 months", timing_context: "Before summer peak",
  day_to_day_owner: "Our team", ongoing_support: "Occasional support when needed",
  privacy_consent: "Agreed"
};

const submission = model.createSubmission(raw, { submissionId: "LS-BRIEF-TEST", now: "2026-08-03T02:00:00.000Z" });
const brief = briefGenerator.buildBrief(submission);
const validation = briefGenerator.validateBrief(brief);
assert.strictEqual(validation.valid, true, validation.errors.join("\n"));
assert.strictEqual(brief.metadata.submissionIdentifier, "LS-BRIEF-TEST");
assert.strictEqual(brief.metadata.submissionDate, "2026-08-03T02:00:00.000Z");
assert.strictEqual(brief.metadata.manualReviewRequired, true);
assert.strictEqual(brief.internalStatus, "Suitable for bespoke-build evaluation");
assert.strictEqual(brief.customerProblem.basis, "customer_evidence");
assert.deepStrictEqual(brief.customerProblem.sourcePaths, ["customerAnswers.desiredOutcome.problemStatement"]);
assert.strictEqual(brief.opportunitySummary.basis, "inference");
assert.strictEqual(brief.recommendedDeliveryModel.basis, "recommendation");
assert(brief.recommendedDeliveryModel.reasons.length >= 2);
assert.strictEqual(brief.readiness.development.status, "not_ready");
assert(brief.renderedText.includes("MANUAL REVIEW REQUIRED"));
assert(brief.renderedText.includes("RECOMMENDED DELIVERY MODEL AND REASONS"));
assert(brief.renderedText.includes("READINESS FOR DEVELOPMENT"));
assert(brief.renderedText.includes("[CUSTOMER EVIDENCE]"));
assert(brief.renderedText.includes("[INFERENCE]"));
assert(brief.renderedText.includes("[RECOMMENDATION]"));

const noBudgetRaw = { ...raw, budget: "Not sure — please advise", delivery_model: "Recommendation required", existing_systems: "", data_needs: "", excluded_functionality: "", constraints: "", timing_context: "" };
const noBudgetSubmission = model.createSubmission(noBudgetRaw, { submissionId: "LS-BRIEF-NO-BUDGET" });
const noBudgetBrief = briefGenerator.buildBrief(noBudgetSubmission);
assert.strictEqual(noBudgetBrief.internalStatus, "Manual commercial review required");
assert(noBudgetBrief.missingInformation.some((item) => /not a reason to reject/i.test(item)));
assert(noBudgetBrief.recommendedClarificationQuestions.some((item) => /investment range/i.test(item)));
assert.strictEqual(noBudgetBrief.readiness.estimation.status, "not_ready");

const licensed = model.createSubmission({ ...raw, delivery_model: "Lang Systems licensed product" }, { submissionId: "LS-BRIEF-LICENSED" });
assert.strictEqual(briefGenerator.buildBrief(licensed).internalStatus, "Suitable for licensed-product evaluation");
const cofunded = model.createSubmission({ ...raw, delivery_model: "Co-funded product partnership — manual review" }, { submissionId: "LS-BRIEF-COFUNDED" });
assert.strictEqual(briefGenerator.buildBrief(cofunded).internalStatus, "Potential co-funded opportunity");

const customerOutput = customerSummary.generate(submission);
const internalOnlyPhrases = ["Major commercial risks", "Estimated complexity category", "Readiness for development", "Suitable for bespoke-build evaluation"];
internalOnlyPhrases.forEach((phrase) => {
  assert(!customerOutput.text.includes(phrase), `Internal phrase leaked into customer text: ${phrase}`);
  assert(!customerOutput.html.includes(phrase), `Internal phrase leaked into customer HTML: ${phrase}`);
});

const tampered = JSON.parse(JSON.stringify(brief));
tampered.metadata.manualReviewRequired = false;
assert.strictEqual(briefGenerator.validateBrief(tampered).valid, false);
assert.throws(() => briefGenerator.buildBrief({}), (error) => error.code === "invalid_submission");

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, "../server/internal-project-brief.schema.json"), "utf8"));
assert.strictEqual(schema.properties.metadata.properties.schemaVersion.const, briefGenerator.SCHEMA_VERSION);
assert(schema.required.includes("recommendedClarificationQuestions"));
assert(schema.required.includes("readiness"));

console.log("Internal project brief structure, recommendations, readiness, privacy, validation, and budget checks passed.");
