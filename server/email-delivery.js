"use strict";

const DEFAULT_PROVIDER_URL = "https://api.resend.com/emails";
const MAX_DOCUMENT_LENGTH = 120000;

class EmailConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "EmailConfigurationError";
    this.code = "configuration";
  }
}

function cleanLine(value, maximum = 320) {
  return String(value == null ? "" : value).replace(/[\r\n\0]+/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum);
}

function cleanText(value, maximum = MAX_DOCUMENT_LENGTH) {
  return String(value == null ? "" : value).replace(/\0/g, "").replace(/\r\n?/g, "\n").trim().slice(0, maximum);
}

function escapeHtml(value) {
  return cleanText(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function textBlock(value) {
  return escapeHtml(value || "Not supplied").replace(/\n/g, "<br>");
}

function emailAddress(value, label) {
  const address = cleanLine(value);
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)) {
    throw new EmailConfigurationError(`${label} is not a valid email address.`);
  }
  return address;
}

function safeReviewUrl(baseUrl, reference) {
  if (!baseUrl) return "";
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:") return "";
    url.searchParams.set("reference", reference);
    return url.href;
  } catch (_error) {
    return "";
  }
}

function details(submission, documents, config) {
  const answers = submission.customerAnswers;
  const customer = answers.customer;
  const reference = cleanLine(submission.submissionMetadata.submissionId, 100);
  const attachments = (submission.attachments || []).map((item) => ({
    name: cleanLine(item.originalFilename, 255),
    sizeBytes: Number(item.sizeBytes) || 0,
    status: cleanLine(item.validationStatus, 40)
  }));
  return {
    reference,
    name: cleanLine(customer.name, 300),
    business: cleanLine(customer.businessName, 300),
    email: emailAddress(customer.emailAddress, "Customer email"),
    phone: cleanLine(customer.phoneNumber, 80),
    businessDescription: cleanText(answers.currentProcess.businessDescription, 10000),
    problemStatement: cleanText(answers.desiredOutcome.problemStatement, 1200),
    desiredOutcome: cleanText(answers.desiredOutcome.outcome, 1200),
    firstRelease: cleanText(answers.scope.essentialFirstRelease, 1200),
    summary: cleanText(documents.customerSummary),
    technical: cleanText(documents.technicalSpecification),
    brief: cleanText(documents.internalBrief),
    questions: cleanText(documents.clarificationQuestions),
    warnings: cleanText(documents.warnings || "No processing or generation warnings reported.", 10000),
    attachments,
    reviewUrl: safeReviewUrl(config.reviewBaseUrl, reference)
  };
}

function brandedHtml(title, preheader, body) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;color:#17212b;font-family:Arial,sans-serif">
  <span style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fff;border:1px solid #d9e0e7;border-radius:12px">
  <tr><td style="padding:28px 32px;background:#102a43;color:#fff;border-radius:12px 12px 0 0"><div style="font-size:14px;letter-spacing:.08em;text-transform:uppercase">Lang Systems</div><h1 style="font-size:24px;margin:8px 0 0">${escapeHtml(title)}</h1></td></tr>
  <tr><td style="padding:28px 32px;line-height:1.55">${body}</td></tr></table></td></tr></table></body></html>`;
}

function customerMessage(data, config) {
  const businessLine = data.business ? ` for ${data.business}` : "";
  const subject = "We received your Lang Systems project outline";
  const snapshot = [
    ["The problem", data.problemStatement],
    ["The outcome you want", data.desiredOutcome],
    ["First release", data.firstRelease]
  ].filter((item) => item[1]);
  const snapshotText = snapshot.length
    ? snapshot.map((item) => `${item[0]}\n${item[1]}`).join("\n\n")
    : "We received the project information you supplied through our discovery form.";
  const snapshotHtml = snapshot.length
    ? snapshot.map((item) => `<p style="margin:0 0 14px"><strong>${escapeHtml(item[0])}</strong><br>${textBlock(item[1])}</p>`).join("")
    : "<p>We received the project information you supplied through our discovery form.</p>";
  const text = `Hello ${data.name},\n\nThanks for sharing your project${businessLine}. Your project outline has arrived safely.\n\nA quick snapshot\n${snapshotText}\n\nWhat happens next\nWe will review your outline and get in touch if we need to clarify anything. If it looks like a good fit, we will then discuss scope, price and timing with you. Nothing starts, and there is no commitment, until we agree those details together.\n\nPlease do not email passwords, payment details or other highly sensitive information.\n\nQuestions? Reply to this email or contact ${config.contactEmail}.\n\nFor your records: ${data.reference}`;
  const html = brandedHtml("Project outline received", "Thanks — your project outline has arrived safely.", `<p>Hello ${escapeHtml(data.name)},</p><p>Thanks for sharing your project${escapeHtml(businessLine)}. Your project outline has arrived safely.</p><h2 style="font-size:18px;margin-top:24px">A quick snapshot</h2><div style="padding:16px;background:#f4f6f8;border-radius:8px">${snapshotHtml}</div><h2 style="font-size:18px;margin-top:24px">What happens next</h2><p>We will review your outline and get in touch if we need to clarify anything. If it looks like a good fit, we will then discuss scope, price and timing with you.</p><p><strong>Nothing starts, and there is no commitment, until we agree those details together.</strong></p><p style="color:#516477;font-size:14px">Please do not email passwords, payment details or other highly sensitive information.</p><p>Questions? Reply to this email or contact <a href="mailto:${escapeHtml(config.contactEmail)}">${escapeHtml(config.contactEmail)}</a>.</p><p style="margin-top:28px;color:#687783;font-size:12px">For your records: ${escapeHtml(data.reference)}</p>`);
  return { to: data.email, subject, text, html, idempotencyKey: cleanLine(`project-confirmation/${data.reference}`, 256) };
}

function attachmentList(items) {
  if (!items.length) return "No supporting files referenced.";
  return items.map((item) => `- ${item.name} (${item.sizeBytes} bytes; ${item.status || "pending review"})`).join("\n");
}

function internalMessage(data, config, customerStatus, handoff) {
  const subject = cleanLine(`New project submission ${data.reference} — ${data.business || data.name}`, 200);
  const review = data.reviewUrl || "No secure review link is configured. Recover using the submission reference and delivery-status record.";
  const sections = [
    `SUBMISSION REFERENCE\n${data.reference}`,
    `CUSTOMER CONTACT\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || "Not supplied"}`,
    `BUSINESS DETAILS\nBusiness: ${data.business || "Not supplied"}\n${data.businessDescription}`,
    `HUMAN REVIEW REQUIRED\nDo not send this bundle directly to an AI tool yet. First verify the customer need, service fit, supplied facts, scope boundaries and material unknowns. The attached Markdown file contains a review checklist and prompt-ready instructions.`,
    `AI HANDOFF BUNDLE\nTwo privacy-minimised files are attached: readable Markdown and structured JSON. They exclude the customer's contact details, business name, consent record and supporting-file names. After review, use both files together in the approved GPT project or other analysis tool.`,
    `KEY CLARIFICATION QUESTIONS\n${data.questions || "None generated"}`,
    `CUSTOMER SUPPORTING-FILE REFERENCES\n${attachmentList(data.attachments)}\nCustomer-supplied file contents are not attached or stored. Request a secure transfer if required.`,
    `SECURE REVIEW\n${review}`,
    `PROCESSING OR GENERATION WARNINGS\n${data.warnings}`,
    `EMAIL DELIVERY STATUS\nCustomer confirmation: ${customerStatus}\nInternal notification: pending (this message)`
  ];
  const text = sections.join("\n\n");
  const htmlSections = sections.map((section) => {
    const split = section.indexOf("\n");
    return `<h2 style="font-size:17px;margin-top:26px">${escapeHtml(section.slice(0, split))}</h2><div>${textBlock(section.slice(split + 1))}</div>`;
  }).join("");
  return {
    to: config.internalEmail,
    subject,
    text,
    html: brandedHtml("New project submission", `Reference ${data.reference}`, htmlSections),
    attachments: handoff ? handoff.attachments : [],
    idempotencyKey: cleanLine(`project-internal/${data.reference}`, 256)
  };
}

function readConfig(environment = process.env) {
  const production = environment.NODE_ENV === "production";
  const mode = cleanLine(environment.INTAKE_EMAIL_MODE || (production ? "" : "mock"), 20).toLowerCase();
  if (!new Set(["mock", "live"]).has(mode)) throw new EmailConfigurationError("INTAKE_EMAIL_MODE must be mock or live.");
  if (production && mode !== "live") throw new EmailConfigurationError("Production email delivery must explicitly use live mode.");
  if (production && (!environment.EMAIL_FROM || !environment.INTAKE_INTERNAL_EMAIL || !environment.LANG_SYSTEMS_CONTACT_EMAIL)) {
    throw new EmailConfigurationError("Production requires EMAIL_FROM, INTAKE_INTERNAL_EMAIL, and LANG_SYSTEMS_CONTACT_EMAIL.");
  }
  const config = {
    mode,
    providerUrl: cleanLine(environment.EMAIL_PROVIDER_URL || DEFAULT_PROVIDER_URL, 1000),
    apiKey: cleanLine(environment.RESEND_API_KEY || environment.EMAIL_API_KEY, 1000),
    from: cleanLine(environment.EMAIL_FROM || "Lang Systems <onboarding@resend.dev>", 400),
    internalEmail: emailAddress(environment.INTAKE_INTERNAL_EMAIL || "langsystemsdesign@outlook.com", "Internal email"),
    contactEmail: emailAddress(environment.LANG_SYSTEMS_CONTACT_EMAIL || environment.INTAKE_INTERNAL_EMAIL || "langsystemsdesign@outlook.com", "Contact email"),
    reviewBaseUrl: cleanLine(environment.INTAKE_REVIEW_BASE_URL, 2000)
  };
  if (mode === "live" && !config.apiKey) throw new EmailConfigurationError("RESEND_API_KEY is required in live mode.");
  if (mode === "live" && !/^https:\/\//.test(config.providerUrl)) throw new EmailConfigurationError("EMAIL_PROVIDER_URL must use HTTPS.");
  if (/[\r\n]/.test(config.from)) throw new EmailConfigurationError("EMAIL_FROM contains invalid characters.");
  return Object.freeze(config);
}

function createMemoryStatusStore() {
  const records = new Map();
  return Object.freeze({
    async get(reference) { return records.get(reference) || null; },
    async set(reference, record) { records.set(reference, JSON.parse(JSON.stringify(record))); return record; }
  });
}

function createProvider(config, options = {}) {
  const fetchImplementation = options.fetch || globalThis.fetch;
  return Object.freeze({
    async send(message) {
      if (config.mode === "mock") return { id: `mock-${Date.now()}` };
      if (typeof fetchImplementation !== "function") throw new Error("Email provider transport is unavailable.");
      const response = await fetchImplementation(config.providerUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": message.idempotencyKey },
        body: JSON.stringify({
          from: config.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
          ...(Array.isArray(message.attachments) && message.attachments.length ? { attachments: message.attachments } : {})
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.id) throw new Error(`Email provider rejected the request (${response.status}).`);
      return { id: cleanLine(result.id, 200) };
    }
  });
}

function publicRecord(record) {
  return { reference: record.reference, customer: record.customer.status, internal: record.internal.status, complete: record.customer.status === "sent" && record.internal.status === "sent" };
}

function createEmailDeliveryService(options = {}) {
  const config = options.config || readConfig(options.environment);
  const provider = options.provider || createProvider(config, options);
  const store = options.statusStore || createMemoryStatusStore();
  const now = options.now || (() => new Date().toISOString());
  const handoffBuilder = options.handoffBuilder;
  if (typeof handoffBuilder !== "function") throw new EmailConfigurationError("An AI handoff bundle builder is required.");

  return Object.freeze({
    async deliver(submission, documents) {
      const data = details(submission, documents || {}, config);
      const handoff = handoffBuilder(submission, documents || {}, { generatedAt: now() });
      let record = await store.get(data.reference) || {
        reference: data.reference, customer: { status: "pending", attempts: 0 }, internal: { status: "pending", attempts: 0 }, updatedAt: now()
      };
      if (record.customer.status === "sent" && record.internal.status === "sent") return publicRecord(record);

      if (record.customer.status !== "sent") {
        record.customer.attempts += 1;
        try {
          const sent = await provider.send(customerMessage(data, config));
          record.customer = { ...record.customer, status: "sent", providerId: sent.id, sentAt: now(), lastError: null };
        } catch (_error) {
          record.customer = { ...record.customer, status: "failed", lastError: "provider_failure" };
        }
        record.updatedAt = now();
        await store.set(data.reference, record);
      }

      if (record.internal.status !== "sent") {
        record.internal.attempts += 1;
        try {
          const sent = await provider.send(internalMessage(data, config, record.customer.status, handoff));
          record.internal = { ...record.internal, status: "sent", providerId: sent.id, sentAt: now(), lastError: null };
        } catch (_error) {
          record.internal = { ...record.internal, status: "failed", lastError: "provider_failure" };
        }
        record.updatedAt = now();
        await store.set(data.reference, record);
      }
      return publicRecord(record);
    },
    async status(reference) { const record = await store.get(cleanLine(reference, 100)); return record ? publicRecord(record) : null; }
  });
}

module.exports = Object.freeze({
  EmailConfigurationError, cleanLine, cleanText, escapeHtml, readConfig, createMemoryStatusStore,
  createProvider, createEmailDeliveryService, customerMessage, internalMessage
});
