"use strict";

const assert = require("assert");
const model = require("../intake-model.js");
const generator = require("../server/technical-specification.js");

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
  constraints: "Use on office computers and field phones.", delivery_model: "Recommendation required",
  budget: "Not sure - please advise", timing: "Exploring options only", privacy_consent: "Agreed"
};

const submission = model.createSubmission(raw, { submissionId: "LS-SPEC-TEST" });

module.exports = (async () => {
  const specification = await generator.generateTechnicalSpecification(submission, { now: "2026-08-03T02:00:00.000Z" });
  const validation = generator.validateSpecification(specification);
  assert.strictEqual(validation.valid, true, validation.errors.join("\n"));
  assert.strictEqual(specification.metadata.sourceSubmissionId, "LS-SPEC-TEST");
  assert.strictEqual(specification.metadata.customerApproved, false);
  assert.strictEqual(specification.metadata.generationMode, "deterministic_fallback");
  assert.strictEqual(Object.keys(specification.sections).length, Object.keys(generator.SECTION_TITLES).length);
  assert.strictEqual(specification.sections.functionalRequirements[0].status, "confirmed");
  assert.deepStrictEqual(specification.sections.functionalRequirements[0].sourcePaths, ["customerAnswers.scope.essentialFirstRelease"]);
  assert.strictEqual(specification.sections.authenticationConsiderations[0].status, "unknown");
  assert.strictEqual(specification.sections.proposedDataEntities[0].status, "recommendation");
  assert(specification.renderedText.includes("ESSENTIAL FIRST-RELEASE REQUIREMENTS"));
  assert(specification.renderedText.includes("RECOMMENDED INVESTIGATION TASKS"));
  assert(specification.renderedText.includes("[CONFIRMED]"));
  assert(specification.renderedText.includes("[UNKNOWN]"));
  assert(specification.renderedText.includes("[RECOMMENDATION]"));
  assert(specification.renderedText.includes("Source: customerAnswers.scope.essentialFirstRelease"));
  assert(!JSON.stringify(specification).includes(raw.email));
  assert(!JSON.stringify(specification).includes(raw.phone));
  assert(!JSON.stringify(specification).includes(raw.contact_name));
  assert(!specification.renderedText.includes("React") && !specification.renderedText.includes("PostgreSQL"));

  const modelFailure = await generator.generateTechnicalSpecification(submission, {
    modelClient: { async generateRequirements() { throw new Error("provider unavailable"); } },
    modelVersion: "unavailable-model", now: "2026-08-03T02:01:00.000Z"
  });
  assert.strictEqual(modelFailure.metadata.generationMode, "deterministic_fallback");
  assert.strictEqual(generator.validateSpecification(modelFailure).valid, true);

  const tampered = JSON.parse(JSON.stringify(specification));
  tampered.sections.projectGoals[0] = { statement: "Invented fact", status: "confirmed", sourcePaths: [] };
  assert.strictEqual(generator.validateSpecification(tampered).valid, false);

  assert.throws(
    () => generator.buildFromInterpretation({ metadata: {}, sections: {} }, { sourceSubmissionId: "LS-BAD" }),
    (error) => error.code === "invalid_interpretation"
  );
  await assert.rejects(
    generator.generateTechnicalSpecification({}),
    (error) => error.code === "generation_failed"
  );

  console.log("Technical specification sections, traceability, validation, privacy, and fallback checks passed.");
})();
