"use strict";

const assert = require("assert");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const model = require("../intake-model.js");
const { createFileSubmissionStore } = require("../server/submission-store.js");
const { createInternalSubmissionsEndpoint } = require("../server/internal-submissions-endpoint.js");

async function listPaths(directory, prefix = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const relative = path.join(prefix, entry.name);
    paths.push(relative);
    if (entry.isDirectory()) paths.push(...await listPaths(path.join(directory, entry.name), relative));
  }
  return paths;
}

module.exports = (async () => {
  const root = path.join("C:\\tmp", `lang-systems-storage-test-${process.pid}-${crypto.randomBytes(4).toString("hex")}`);
  try {
    const store = createFileSubmissionStore(root);
    const submission = model.createSubmission({
      contact_name: "Private Person", business_name: "Private Business", email: "private@example.com",
      business_description: "Business description", current_process: "Manual process", problem_impact: "Delays",
      problem: "Work is hard to track", desired_outcome: "A clear workflow", users: "Operations",
      first_release: "Track work", acceptance_criteria: "Work can be completed", delivery_model: "Recommendation required",
      budget: "Not sure â€” please advise", timing: "Exploring options only", privacy_consent: "Agreed",
      attachments: [{
        attachmentId: "LS-SECURE-STORAGE-TEST-ATT-1", originalFilename: "outline.pdf",
        storedFilename: "outline.pdf", mimeType: "application/pdf", sizeBytes: 123,
        storageLocation: "email-delivery-service", validationStatus: "accepted"
      }]
    }, { submissionId: "LS-SECURE-STORAGE-TEST" });
    const documents = { customerSummary: "Private generated summary", technicalSpecification: "Specification", internalBrief: "Brief", clarificationQuestions: "Question?", warnings: "" };

    const stored = await store.create(submission, documents, {
      internalId: "2bf765c6-6e64-47b6-83a6-45a0aa927040",
      idempotencyKeyHash: "b".repeat(64), payloadFingerprint: "a".repeat(64), originalSubmission: submission
    });
    assert.strictEqual(stored.created, true);
    assert.strictEqual(stored.internalId, "2bf765c6-6e64-47b6-83a6-45a0aa927040");
    assert.strictEqual(stored.originalSubmission.customerAnswers.customer.emailAddress, "private@example.com");
    assert.strictEqual(stored.attachmentMetadata[0].originalFilename, "outline.pdf");
    assert.ok(!stored.generatedDocumentReferences.customerSummary.includes("customerSummary"), "Stored document names must be random.");
    assert.strictEqual(await store.getDocument(stored.reference, "customerSummary"), "Private generated summary");
    const replay = await store.create(submission, documents, { payloadFingerprint: "a".repeat(64) });
    assert.strictEqual(replay.created, false);
    await assert.rejects(store.create(submission, documents, { payloadFingerprint: "c".repeat(64) }), (error) => error.code === "duplicate_submission" && error.statusCode === 409);
    await store.recordDelivery(stored.reference, { complete: false, customer: "sent", internal: "failed" });
    assert.deepStrictEqual((await store.get(stored.reference)).processingErrors, ["email_delivery_failed"]);

    const token = "storage-test-token-with-more-than-32-characters";
    const endpoint = createInternalSubmissionsEndpoint({ environment: { INTAKE_ADMIN_TOKEN: token }, submissionStore: store });
    const unauthorised = await endpoint(new Request(`http://localhost/api/internal/project-submissions/${stored.reference}`), { reference: stored.reference });
    assert.strictEqual(unauthorised.status, 401);
    const limitedEndpoint = createInternalSubmissionsEndpoint({ environment: { INTAKE_ADMIN_TOKEN: token }, submissionStore: store, maximumAuthFailures: 1 });
    assert.strictEqual((await limitedEndpoint(new Request("http://localhost/first"), { reference: stored.reference })).status, 401);
    assert.strictEqual((await limitedEndpoint(new Request("http://localhost/second"), { reference: stored.reference })).status, 429);
    const headers = { Authorization: `Bearer ${token}` };
    const retrieved = await endpoint(new Request(`http://localhost/api/internal/project-submissions/${stored.reference}`, { headers }), { reference: stored.reference });
    assert.strictEqual(retrieved.status, 200);
    assert.strictEqual((await retrieved.json()).submission.reference, stored.reference);
    const invalidPatch = await endpoint(new Request(`http://localhost/api/internal/project-submissions/${stored.reference}`, {
      method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ manualReviewStatus: "administrator" })
    }), { reference: stored.reference });
    assert.strictEqual(invalidPatch.status, 400);
    const patched = await endpoint(new Request(`http://localhost/api/internal/project-submissions/${stored.reference}`, {
      method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ manualReviewStatus: "in_review" })
    }), { reference: stored.reference });
    assert.strictEqual(patched.status, 200);
    assert.strictEqual((await store.get(stored.reference)).manualReviewStatus, "in_review");
    const traversal = await endpoint(new Request("http://localhost/api/internal/project-submissions/bad" , { headers }), { reference: "../../bad" });
    assert.strictEqual(traversal.status, 400);
    const documentResponse = await endpoint(new Request(`http://localhost/api/internal/project-submissions/${stored.reference}/documents/customerSummary`, { headers }), { reference: stored.reference, documentKey: "customerSummary" });
    assert.strictEqual(documentResponse.status, 200);
    assert.strictEqual(await documentResponse.text(), "Private generated summary");

    const diskText = (await listPaths(path.join(root, "submissions"))).join("\n");
    assert.ok(!diskText.includes(stored.reference) && !diskText.includes("outline.pdf"), "References and original names must not appear in storage paths.");
    console.log("Secure submission storage, retrieval authentication, document access, and review validation checks passed.");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
})().catch((error) => { process.exitCode = 1; throw error; });
