(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LangSystemsSubmissionPackage = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function cleanLine(value, maximum) {
    return String(value == null ? "" : value).replace(/[\r\n\0]+/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum || 300);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function labelFor(key) {
    return String(key || "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ")
      .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function renderValue(value) {
    if (value == null || value === "") return "<span class=\"not-supplied\">Not supplied</span>";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) {
      if (!value.length) return "<span class=\"not-supplied\">None supplied</span>";
      return "<ol>" + value.map(function (item) { return "<li>" + renderValue(item) + "</li>"; }).join("") + "</ol>";
    }
    if (typeof value === "object") return renderObject(value);
    return escapeHtml(value).replace(/\r?\n/g, "<br>");
  }

  function renderObject(value) {
    return "<dl>" + Object.keys(value || {}).map(function (key) {
      return "<div><dt>" + escapeHtml(labelFor(key)) + "</dt><dd>" + renderValue(value[key]) + "</dd></div>";
    }).join("") + "</dl>";
  }

  function documentSection(title, value) {
    return "<section><h2>" + escapeHtml(title) + "</h2><pre>" + escapeHtml(value || "Not generated") + "</pre></section>";
  }

  function build(options) {
    options = options || {};
    var submission = options.submission;
    var documents = options.documents || {};
    if (!submission || !submission.submissionMetadata || !submission.customerAnswers) {
      throw new TypeError("A structured project submission is required.");
    }
    var reference = cleanLine(options.reference || submission.submissionMetadata.submissionId, 100);
    var targetEmail = cleanLine(options.targetEmail || "langsystemsdesign@outlook.com", 320);
    var customer = submission.customerAnswers.customer || {};
    var customerName = cleanLine(customer.name || "Customer", 200);
    var businessName = cleanLine(customer.businessName || "Project enquiry", 200);
    var filenameReference = reference.replace(/[^A-Za-z0-9_-]+/g, "-") || "project-enquiry";
    var filename = "Lang-Systems-project-package-" + filenameReference + ".html";
    var subject = "New Lang Systems project enquiry - " + reference + " - " + businessName;
    var body = [
      "Hello Lang Systems,",
      "",
      "I have completed the project discovery questionnaire.",
      "",
      "Reference: " + reference,
      "Customer: " + customerName,
      "Business: " + businessName,
      "",
      "I have attached the downloaded Lang Systems project package to this email.",
      "Any supporting files selected in the questionnaire are not inside the package and must be attached separately.",
      "",
      "Please do not treat this enquiry as acceptance of scope, pricing, timing, or a binding agreement."
    ].join("\n");
    var html = "<!doctype html><html lang=\"en-AU\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<title>Lang Systems project package " + escapeHtml(reference) + "</title><style>" +
      "body{max-width:980px;margin:40px auto;padding:0 24px;color:#17212b;font:16px/1.55 Arial,sans-serif}header{padding:28px;background:#14063d;color:#fff;border-radius:14px}h1{margin:.2em 0}h2{margin-top:36px;color:#32127a}section{page-break-before:auto}dl>div{padding:12px 0;border-bottom:1px solid #d9e0e7}dt{font-weight:700}dd{margin:5px 0 0;white-space:normal}pre{padding:18px;white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f6f8;border-radius:10px;font:14px/1.55 Consolas,monospace}.notice{padding:16px;background:#fff4d6;border-left:4px solid #c47f00}.not-supplied{color:#66788a}@media print{body{margin:0;max-width:none}header{color:#000;background:none;border:2px solid #14063d}}</style></head><body>" +
      "<header><p>Lang Systems customer-prepared email package</p><h1>Project discovery outline</h1><p>Reference: <strong>" + escapeHtml(reference) + "</strong></p></header>" +
      "<p class=\"notice\"><strong>Customer action required:</strong> attach this downloaded file to the email draft before sending. This package was generated in the browser and has not been received by Lang Systems automatically. Selected supporting-file contents are not included.</p>" +
      "<section><h2>Original questionnaire answers</h2>" + renderObject(submission.customerAnswers) + "</section>" +
      "<section><h2>Submission and attachment metadata</h2>" + renderObject({ submissionMetadata: submission.submissionMetadata, attachments: submission.attachments || [] }) + "</section>" +
      documentSection("Customer-friendly project summary", documents.customerSummary) +
      documentSection("Internal technical requirements specification", documents.technicalRequirements || documents.technicalSpecification) +
      documentSection("Internal project brief", documents.internalBrief) +
      documentSection("Clarification questions", documents.clarificationQuestions) +
      "<p class=\"notice\">This is an enquiry only. Scope, price, timing, acceptance, commencement, and any binding agreement require later review and written agreement.</p></body></html>";

    return Object.freeze({
      reference: reference,
      filename: filename,
      html: html,
      subject: subject,
      body: body,
      mailto: "mailto:" + targetEmail + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body)
    });
  }

  return Object.freeze({ build: build });
}));
