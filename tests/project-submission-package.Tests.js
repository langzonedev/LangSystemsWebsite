"use strict";

const assert = require("assert");
const packageBuilder = require("../project-submission-package.js");

const output = packageBuilder.build({
  reference: "LS-FALLBACK-001",
  targetEmail: "langsystemsdesign@outlook.com",
  submission: {
    submissionMetadata: { submissionId: "LS-FALLBACK-001", submittedAt: "2026-08-03T10:00:00.000Z", schemaVersion: "3.0.0" },
    customerAnswers: {
      customer: { name: "Alex <Example>", emailAddress: "alex@example.com", businessName: "Example & Co" },
      desiredOutcome: { desiredOutcome: "Reduce duplicate entry" }
    },
    attachments: [{ originalFilename: "brief.pdf", sizeBytes: 1234, validationStatus: "pending" }]
  },
  documents: {
    customerSummary: "Customer summary",
    technicalRequirements: "Technical requirements",
    internalBrief: "Internal brief",
    clarificationQuestions: "What is the target date?"
  }
});

assert.strictEqual(output.filename, "Lang-Systems-project-package-LS-FALLBACK-001.html");
assert(output.mailto.startsWith("mailto:langsystemsdesign@outlook.com?subject="));
assert(output.body.includes("must be attached separately"));
assert(output.html.includes("Original questionnaire answers"));
assert(output.html.includes("Customer-friendly project summary"));
assert(output.html.includes("Internal technical requirements specification"));
assert(output.html.includes("Internal project brief"));
assert(output.html.includes("Clarification questions"));
assert(output.html.includes("brief.pdf"));
assert(!output.html.includes("Alex <Example>"));
assert(output.html.includes("Alex &lt;Example&gt;"));

console.log("Customer email package content, escaping, filename, and mail draft checks passed.");
