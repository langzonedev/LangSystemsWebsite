"use strict";

const assert = require("assert");
const model = require("../intake-model.js");
const { createEmailDeliveryService, createMemoryStatusStore, createProvider, escapeHtml, readConfig } = require("../server/email-delivery.js");
const { createAiHandoffBundle } = require("../server/ai-handoff-bundle.js");

function submission() {
  return model.createSubmission({
    contact_name: "Alex <Example>", business_name: "Example & Operations", email: "alex@example.com",
    phone: "0400 000 000", business_description: "Regional service business",
    current_process: "Email and spreadsheet", problem_impact: "Updates are missed",
    problem: "Jobs are difficult to track", desired_outcome: "One clear view", users: "Office staff",
    first_release: "Track jobs", acceptance_criteria: "Staff can close a job",
    delivery_model: "Recommendation required", budget: "Not sure — please advise",
    timing: "Exploring options only", privacy_consent: "Agreed"
  }, { submissionId: "LS-EMAIL-TEST" });
}

const documents = {
  customerSummary: "A concise <customer> summary.",
  technicalSpecification: "INTERNAL TECHNICAL SPECIFICATION",
  internalBrief: "INTERNAL PROJECT BRIEF",
  clarificationQuestions: "Which staff need access?",
  warnings: "One field needs manual review."
};

module.exports = (async () => {
  assert.strictEqual(escapeHtml("<script>&\"'"), "&lt;script&gt;&amp;&quot;&#39;");
  assert.throws(() => readConfig({ NODE_ENV: "production", INTAKE_EMAIL_MODE: "mock" }), /live mode/);
  let providerRequest;
  const liveProvider = createProvider(readConfig({ INTAKE_EMAIL_MODE: "live", RESEND_API_KEY: "test-key", INTAKE_INTERNAL_EMAIL: "internal@example.com" }), {
    fetch: async (_url, options) => { providerRequest = options; return { ok: true, json: async () => ({ id: "email-id" }) }; }
  });
  await liveProvider.send({ to: "alex@example.com", subject: "Subject", text: "Text", html: "<p>Text</p>", attachments: [{ filename: "bundle.json", content: "e30=" }], idempotencyKey: "project-confirmation/LS-TEST" });
  assert.strictEqual(providerRequest.headers["Idempotency-Key"], "project-confirmation/LS-TEST");
  assert.deepStrictEqual(JSON.parse(providerRequest.body).attachments, [{ filename: "bundle.json", content: "e30=" }]);

  const sent = [];
  let failInternalOnce = true;
  const provider = { async send(message) {
    sent.push(message);
    if (message.to === "internal@example.com" && failInternalOnce) {
      failInternalOnce = false;
      throw new Error("simulated provider failure");
    }
    return { id: `provider-${sent.length}` };
  } };
  const store = createMemoryStatusStore();
  const service = createEmailDeliveryService({
    config: readConfig({ INTAKE_EMAIL_MODE: "mock", INTAKE_INTERNAL_EMAIL: "internal@example.com", LANG_SYSTEMS_CONTACT_EMAIL: "hello@example.com" }),
    provider, statusStore: store, handoffBuilder: createAiHandoffBundle
  });

  const partial = await service.deliver(submission(), documents);
  assert.deepStrictEqual({ customer: partial.customer, internal: partial.internal, complete: partial.complete }, { customer: "sent", internal: "failed", complete: false });
  assert.strictEqual(sent[0].to, "alex@example.com");
  assert.strictEqual(sent[0].subject, "We received your Lang Systems project outline");
  assert.ok(!/[\r\n]/.test(sent[0].subject));
  assert.ok(sent[0].html.includes("Alex &lt;Example&gt;") && !sent[0].html.includes("<customer>"));
  assert.ok(sent[0].text.includes("A quick snapshot"));
  assert.ok(sent[0].text.includes("The outcome you want\nOne clear view"));
  assert.ok(sent[0].text.includes("Nothing starts, and there is no commitment"));
  assert.ok(sent[0].text.endsWith("For your records: LS-EMAIL-TEST"));
  assert.ok(!sent[0].text.includes(documents.customerSummary), "The customer email should not paste the full generated document.");
  assert.ok(!sent[0].attachments, "The customer confirmation must not carry the internal bundle.");
  assert.ok(sent[1].text.includes("Customer confirmation: sent"));
  assert.ok(sent[1].text.includes("HUMAN REVIEW REQUIRED"));
  assert.ok(sent[1].text.includes("Two privacy-minimised files are attached"));
  assert.strictEqual(sent[1].attachments.length, 2);
  const bundleMaterial = sent[1].attachments.map((item) => Buffer.from(item.content, "base64").toString("utf8")).join("\n");
  assert.ok(bundleMaterial.includes("Lang Systems AI handoff bundle"));
  assert.ok(!bundleMaterial.includes("Alex <Example>"));
  assert.ok(!bundleMaterial.includes("alex@example.com"));
  assert.ok(!bundleMaterial.includes("0400 000 000"));

  const recovered = await service.deliver(submission(), documents);
  assert.strictEqual(recovered.complete, true);
  assert.strictEqual(sent.length, 3, "Retry must not resend the successful customer confirmation.");
  const duplicate = await service.deliver(submission(), documents);
  assert.strictEqual(duplicate.complete, true);
  assert.strictEqual(sent.length, 3, "A completed submission must not send duplicate emails.");

  const record = await store.get("LS-EMAIL-TEST");
  assert.strictEqual(record.customer.attempts, 1);
  assert.strictEqual(record.internal.attempts, 2);
  assert.ok(!JSON.stringify(record).includes("concise"), "Delivery records must not contain customer content.");

  console.log("Email branding, sanitisation, AI attachments, partial failure, status, retry, and duplicate-prevention checks passed.");
})();
