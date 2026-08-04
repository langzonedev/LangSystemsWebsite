"use strict";

const assert = require("assert");
const model = require("../intake-model.js");
const customerSummary = require("../customer-summary.js");

const submission = model.createSubmission({
  contact_name: "Alex & Jordan", business_name: "Example <Operations>", email: "private@example.com",
  business_description: "A regional service business", current_process: "Email and a shared spreadsheet.",
  problem_impact: "Updates are missed.", problem: "Jobs are difficult to track.",
  desired_outcome: "One clear view of each job.", users: "Office coordinators and field staff.",
  first_release: "Create, assign, update and close jobs.", optional_requirements: "Customer notifications.",
  acceptance_criteria: "Authorised staff can close a job.", delivery_model: "Recommendation required",
  visual_design_preference: "Create a clean, neutral design for the first version",
  budget: "Not sure - please advise", timing: "Exploring options only", privacy_consent: "Agreed"
}, {
  submissionId: "LS-SUMMARY-TEST",
  now: "2026-08-03T01:30:00.000Z"
});

const result = customerSummary.generate(submission, { locale: "en-AU", timeZone: "Australia/Adelaide" });
assert.strictEqual(result.reference, "LS-SUMMARY-TEST");
assert.strictEqual(result.dateSubmitted, "3 August 2026");
assert(result.text.includes("Customer: Alex & Jordan"));
assert(result.text.includes("Business: Example <Operations>"));
assert(result.text.includes("Date submitted: 3 August 2026"));
assert(result.text.includes("THE PROBLEM AS WE UNDERSTAND IT"));
assert(result.text.includes("THE CURRENT PROCESS"));
assert(result.text.includes("THE DESIRED OUTCOME"));
assert(result.text.includes("EXPECTED USERS"));
assert(result.text.includes("FIRST-VERSION LOOK AND FEEL"));
assert(result.text.includes("Create a clean, neutral design for the first version"));
assert(result.text.includes("ESSENTIAL FOR THE FIRST RELEASE"));
assert(result.text.includes("USEFUL, BUT CAN BE ADDED LATER"));
assert(result.text.includes("FUTURE IDEAS"));
assert(result.text.includes("IMPORTANT ASSUMPTIONS"));
assert(result.text.includes("INFORMATION REQUIRING CLARIFICATION"));
assert(result.text.includes("Scope, price and timing are not final"));
assert(result.text.includes("development has started"));
assert(result.text.includes("Additional questions") || result.text.includes("additional questions"));
assert(!result.text.includes("private@example.com"));
assert(!/\b(MVP|API|SaaS|database schema|technical stack|deployment pipeline)\b/i.test(result.text));
assert(result.html.includes("Example &lt;Operations&gt;"));
assert(!result.html.includes("Example <Operations>"));
assert(result.html.includes("Not provided in your submission"));
assert(result.printableHtml.startsWith("<!doctype html>"));
assert(result.printableHtml.includes("@media print"));
assert(result.filename.endsWith(".html"));
assert.throws(() => customerSummary.generate({}), /valid project submission/);

console.log("Customer summary text, HTML, print, privacy, and safeguard checks passed.");
