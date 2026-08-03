(function (root, factory) {
  "use strict";

  var model = root && root.LangSystemsIntakeModel;
  if (typeof module === "object" && module.exports) model = require("./intake-model.js");
  var api = factory(model);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LangSystemsCustomerSummary = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function (intakeModel) {
  "use strict";

  var TEMPLATE_VERSION = "1.0.0";
  var NOTICE = "Please correct anything we have misunderstood. This summary is for discussion only. Scope, price and timing are not final until they have been reviewed and agreed. Sending this enquiry does not mean development has started or that Lang Systems has accepted the project. We may need to ask additional questions. Please do not send passwords, payment details or other highly sensitive information by email.";

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character];
    });
  }

  function valueOr(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function formatDate(value, options) {
    var date = new Date(value);
    try {
      return new Intl.DateTimeFormat((options && options.locale) || "en-AU", {
        day: "numeric", month: "long", year: "numeric",
        timeZone: (options && options.timeZone) || "Australia/Adelaide"
      }).format(date);
    } catch (_error) {
      return date.toISOString().slice(0, 10);
    }
  }

  function questionsFor(answers) {
    var questions = [];
    var desired = answers.desiredOutcome;
    var scope = answers.scope;
    var commercial = answers.commercial;
    var additional = answers.additionalContext;
    if (!desired.existingSystemConnections) questions.push("Are there existing systems or services the first release may need to work with?");
    if (!desired.existingDataSources) questions.push("What business information will the first release need to use or produce?");
    if (!scope.explicitExclusions) questions.push("Is there anything that should be clearly left out of the first release?");
    if (!additional.constraints) questions.push("Are there important privacy, approval, accessibility, device, location or industry requirements?");
    if (!commercial.timelineContext) questions.push("Is the preferred timing connected to an important date or outside dependency?");
    if (commercial.deliveryModelPreference === "Recommendation required") questions.push("What working and ownership arrangement would best suit the business?");
    if (/^Not sure/i.test(commercial.approximateBudgetRange || "")) questions.push("What investment range may be practical after the first-release options are explained?");
    if (!scope.usefulLater) questions.push("Are there useful capabilities that should be recorded for a later release?");
    return questions;
  }

  function section(title, value, status) {
    return { title: title, value: valueOr(value, "Not provided yet."), status: status || (value ? "confirmed" : "unknown") };
  }

  function textOutput(summary) {
    var lines = [
      "LANG SYSTEMS", "Project understanding summary", "",
      "Submission reference: " + summary.reference,
      "Customer: " + summary.customerName,
      "Business: " + summary.businessName,
      "Date submitted: " + summary.dateSubmitted,
      ""
    ];
    lines.push("INFORMATION FROM YOUR SUBMISSION", "");
    summary.confirmed.forEach(function (item) {
      lines.push(item.title.toUpperCase(), item.status === "confirmed" ? "Confirmed" : "Not provided", item.value, "");
    });
    lines.push("IMPORTANT ASSUMPTIONS");
    summary.assumptions.forEach(function (item) { lines.push("- " + item); });
    lines.push("", "INFORMATION REQUIRING CLARIFICATION");
    if (summary.questions.length) summary.questions.forEach(function (item) { lines.push("- " + item); });
    else lines.push("- No automatic gaps were identified. We may still have questions after review.");
    lines.push("", "PROPOSED NEXT STEP", summary.nextStep, "", "PLEASE CHECK OUR UNDERSTANDING", NOTICE);
    return lines.join("\n");
  }

  function sectionHtml(item) {
    var statusLabel = item.status === "confirmed" ? "Confirmed from your submission" : "Not provided in your submission";
    return '<section class="summary-section ' + escapeHtml(item.status) + '"><p class="status">' + statusLabel + "</p><h2>" +
      escapeHtml(item.title) + "</h2><p>" + escapeHtml(item.value).replace(/\n/g, "<br>") + "</p></section>";
  }

  function listHtml(items, emptyText) {
    var values = items.length ? items : [emptyText];
    return "<ul>" + values.map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("") + "</ul>";
  }

  function htmlOutput(summary) {
    return '<main class="customer-summary"><header><p class="brand">LANG SYSTEMS</p><h1>Project understanding summary</h1>' +
      '<p class="intro">A plain-English summary of what we understand from your project enquiry.</p></header>' +
      '<dl class="summary-details"><div><dt>Submission reference</dt><dd>' + escapeHtml(summary.reference) + '</dd></div>' +
      '<div><dt>Customer</dt><dd>' + escapeHtml(summary.customerName) + '</dd></div><div><dt>Business</dt><dd>' +
      escapeHtml(summary.businessName) + '</dd></div><div><dt>Date submitted</dt><dd>' + escapeHtml(summary.dateSubmitted) +
      "</dd></div></dl>" + summary.confirmed.map(sectionHtml).join("") +
      '<section class="summary-section assumption"><p class="status">Important assumptions</p><h2>What we have assumed</h2>' + listHtml(summary.assumptions, "No assumptions recorded.") + "</section>" +
      '<section class="summary-section questions"><p class="status">Needs confirmation</p><h2>Information requiring clarification</h2>' +
      listHtml(summary.questions, "No automatic gaps were identified. We may still have questions after review.") + "</section>" +
      '<section class="summary-section"><h2>Proposed next step</h2><p>' + escapeHtml(summary.nextStep) + "</p></section>" +
      '<aside class="summary-notice"><h2>Please check our understanding</h2><p>' + escapeHtml(NOTICE) + "</p></aside></main>";
  }

  function printableOutput(body) {
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Lang Systems project understanding summary</title><style>' +
      ':root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#eef3f8;color:#132335;font:16px/1.55 Arial,sans-serif}.customer-summary{max-width:820px;margin:32px auto;background:#fff;padding:52px;box-shadow:0 12px 36px #18314d20;border-top:7px solid #177bc2}.brand,.status{color:#0877b9;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:12px}h1{font-size:32px;margin:.2em 0}h2{font-size:19px;margin:.25em 0 .5em}.intro{color:#516477}.summary-details{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:28px 0}.summary-details div{background:#f3f7fa;padding:12px}.summary-details dt{color:#516477;font-size:12px}.summary-details dd{margin:3px 0 0;font-weight:700}.summary-section{padding:18px 0;border-top:1px solid #dce5ec}.summary-section p{margin:.35em 0}.summary-section ul{margin:.5em 0;padding-left:22px}.summary-section.unknown .status{color:#687783}.assumption{border-left:4px solid #d6a22d;padding-left:18px}.questions{border-left:4px solid #297ea6;padding-left:18px}.summary-notice{margin-top:22px;padding:18px;background:#eaf4fa;border:1px solid #b7d7e8}.summary-notice p{margin:.4em 0}@media(max-width:640px){.customer-summary{margin:0;padding:26px 20px}.summary-details{grid-template-columns:1fr}}@media print{body{background:#fff}.customer-summary{margin:0;max-width:none;padding:18mm;box-shadow:none}.summary-section,.summary-notice{break-inside:avoid}@page{margin:8mm}}' +
      "</style></head><body>" + body + "</body></html>";
  }

  function generate(submission, options) {
    if (!intakeModel || typeof intakeModel.validateSubmission !== "function") throw new Error("The intake model is unavailable.");
    var validation = intakeModel.validateSubmission(submission);
    if (!validation.valid) throw new TypeError("A valid project submission is required to generate a customer summary.");
    var answers = submission.customerAnswers;
    var scope = answers.scope;
    var summary = {
      templateVersion: TEMPLATE_VERSION,
      reference: submission.submissionMetadata.submissionId,
      customerName: answers.customer.name,
      businessName: answers.customer.businessName,
      dateSubmitted: formatDate(submission.submissionMetadata.submittedAt, options),
      confirmed: [
        section("The problem as we understand it", answers.desiredOutcome.problemStatement),
        section("The current process", answers.currentProcess.description),
        section("The desired outcome", answers.desiredOutcome.outcome),
        section("Expected users", answers.desiredOutcome.intendedUsers),
        section("Essential for the first release", scope.essentialFirstRelease),
        section("Useful, but can be added later", scope.usefulLater),
        section("Future ideas", scope.futureIdeas)
      ],
      assumptions: [
        "This summary is based only on the information supplied in the project enquiry.",
        "Items described as essential are a starting point for review, not agreed scope.",
        "Where later capabilities or future ideas were not provided, we have treated them as not yet identified rather than as having no value."
      ],
      questions: questionsFor(answers),
      nextStep: "Lang Systems will manually review this summary and may ask follow-up questions. If the enquiry is suitable to progress, we can then confirm our shared understanding before discussing scope, price or timing."
    };
    summary.text = textOutput(summary);
    summary.html = htmlOutput(summary);
    summary.printableHtml = printableOutput(summary.html);
    summary.filename = "lang-systems-project-summary-" + summary.reference.replace(/[^A-Za-z0-9._-]/g, "-") + ".html";
    return Object.freeze(summary);
  }

  return Object.freeze({ TEMPLATE_VERSION: TEMPLATE_VERSION, NOTICE: NOTICE, generate: generate });
}));
