"use strict";

const assert = require("assert");
const model = require("../intake-model.js");
const { BUNDLE_SCHEMA_VERSION, CLASSIFICATION, createAiHandoffBundle } = require("../server/ai-handoff-bundle.js");

const submission = model.createSubmission({
  contact_name: "Private Person",
  business_name: "Private Business Name",
  email: "private.person@example.com",
  phone: "0400 111 222",
  business_description: "A regional field-service operation",
  problem: "Jobs are difficult to track",
  current_process: "A coordinator receives an email, copies it into a sheet and assigns a worker",
  current_methods: "Outlook, Excel",
  current_process_strengths: "The coordinator performs a useful final check",
  process_frequency: "Many times a day",
  problem_impact: "Updates are missed",
  desired_outcome: "One reliable view of each job",
  users: "Coordinators, field workers and managers",
  user_count: "12 now, about 30 later",
  devices: "Windows laptops, iPhones",
  usage_locations: "Office, customer sites",
  offline_access: "Yes, sometimes",
  existing_systems: "Accounting system sends customer details in; completed job status returns",
  data_needs: "Active customer and job records; some commercially sensitive notes",
  privacy_security_approvals: "Managers approve exports; changes need an audit trail",
  first_release: "Create, assign and close jobs",
  acceptance_criteria: "Staff can complete the agreed job journey",
  success_measure: "Reduce missed updates by half within six months",
  delivery_model: "Recommendation required",
  budget: "Not sure - please advise",
  timing: "Exploring options only",
  privacy_consent: "Agreed"
}, { submissionId: "LS-HANDOFF-TEST", now: "2026-08-04T01:02:03.000Z" });

submission.attachments = [{ originalFilename: "Private-Person-records.xlsx", sizeBytes: 100, validationStatus: "pending" }];

const result = createAiHandoffBundle(submission, {
  technicalSpecification: "INTERNAL TECHNICAL SPECIFICATION\nArchitecture remains unknown.",
  clarificationQuestions: "Who approves a completed job?",
  internalBrief: "Private Person at Private Business Name",
  customerSummary: "Private Person at Private Business Name",
  warnings: "Authentication requirements remain unknown."
}, { generatedAt: "2026-08-04T02:03:04.000Z" });

const parsed = JSON.parse(result.json);
assert.strictEqual(parsed.metadata.schemaVersion, BUNDLE_SCHEMA_VERSION);
assert.strictEqual(parsed.metadata.classification, CLASSIFICATION);
assert.strictEqual(parsed.metadata.humanReviewRequired, true);
assert.strictEqual(parsed.metadata.reviewStatus, "unreviewed");
assert.strictEqual(parsed.sourceFacts.currentProcess.frequency, "Many times a day");
assert.deepStrictEqual(parsed.sourceFacts.desiredOutcome.deviceRequirements, ["Windows laptops", "iPhones"]);
assert.ok(parsed.agentTask.requestedArtifacts.some((item) => /UML/.test(item)));
assert.ok(parsed.agentTask.requestedArtifacts.some((item) => /Codex/.test(item)));
assert.ok(parsed.agentTask.constraints.some((item) => /Do not invent/.test(item)));
assert.ok(result.markdown.includes("Before using this bundle"));
assert.ok(result.markdown.includes("Human review record"));
assert.ok(result.markdown.includes("Who approves a completed job?"));
assert.ok(result.markdown.includes("Architecture remains unknown."));
assert.ok(result.markdown.includes("File contents and filenames are not included"));
assert.strictEqual(result.attachments.length, 2);
assert.ok(result.attachments[0].filename.endsWith(".json"));
assert.ok(result.attachments[1].filename.endsWith(".md"));
assert.strictEqual(Buffer.from(result.attachments[0].content, "base64").toString("utf8"), result.json);
assert.strictEqual(Buffer.from(result.attachments[1].content, "base64").toString("utf8"), result.markdown);

const aiMaterial = `${result.json}\n${result.markdown}`;
[
  "Private Person", "Private Business Name", "private.person@example.com", "0400 111 222",
  "Private-Person-records.xlsx", "privacyConsent"
].forEach((privateValue) => assert.ok(!aiMaterial.includes(privateValue), `AI bundle leaked: ${privateValue}`));

console.log("AI handoff structure, prompt readiness, privacy minimisation, review gate, and attachments passed.");
