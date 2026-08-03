var fso = new ActiveXObject("Scripting.FileSystemObject");
var root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName));
var modelFile = fso.OpenTextFile(fso.BuildPath(root, "intake-model.js"), 1, false, 0);
if (!Object.freeze) Object.freeze = function (value) { return value; };
if (!String.prototype.trim) String.prototype.trim = function () { return this.replace(/^\s+|\s+$/g, ""); };
if (!Array.isArray) Array.isArray = function (value) { return Object.prototype.toString.call(value) === "[object Array]"; };
if (!Array.prototype.forEach) Array.prototype.forEach = function (callback) { for (var i = 0; i < this.length; i += 1) callback(this[i], i, this); };
if (!Array.prototype.map) Array.prototype.map = function (callback) { var output = []; for (var i = 0; i < this.length; i += 1) output.push(callback(this[i], i, this)); return output; };
if (!Array.prototype.filter) Array.prototype.filter = function (callback) { var output = []; for (var i = 0; i < this.length; i += 1) if (callback(this[i], i, this)) output.push(this[i]); return output; };
if (!Array.prototype.some) Array.prototype.some = function (callback) { for (var i = 0; i < this.length; i += 1) if (callback(this[i], i, this)) return true; return false; };
if (!Array.prototype.indexOf) Array.prototype.indexOf = function (value) { for (var i = 0; i < this.length; i += 1) if (this[i] === value) return i; return -1; };
if (typeof JSON === "undefined") JSON = {
  stringify: function encode(value) {
    var parts;
    if (value === null) return "null";
    if (typeof value === "string") return "\"" + value.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"").replace(/\n/g, "\\n").replace(/\r/g, "\\r") + "\"";
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return "[" + value.map(encode).join(",") + "]";
    parts = [];
    for (var key in value) if (Object.prototype.hasOwnProperty.call(value, key)) parts.push(encode(key) + ":" + encode(value[key]));
    return "{" + parts.join(",") + "}";
  },
  parse: function (value) { return eval("(" + value + ")"); }
};
if (!Date.prototype.toISOString) Date.prototype.toISOString = function () {
  function pad(value, width) {
    var result = String(value);
    while (result.length < width) result = "0" + result;
    return result;
  }
  return this.getUTCFullYear() + "-" + pad(this.getUTCMonth() + 1, 2) + "-" + pad(this.getUTCDate(), 2) +
    "T" + pad(this.getUTCHours(), 2) + ":" + pad(this.getUTCMinutes(), 2) + ":" + pad(this.getUTCSeconds(), 2) +
    "." + pad(this.getUTCMilliseconds(), 3) + "Z";
};
eval(modelFile.ReadAll());
modelFile.Close();

function assertTrue(condition, message) {
  if (!condition) throw new Error(message);
}

var raw = {
  contact_name: "  Alex Example  ",
  business_name: "Example Operations",
  email: "alex@example.com",
  phone: "",
  business_description: "Regional service business",
  problem: "Jobs are difficult to track",
  current_process: "Requests arrive by email and are copied into a spreadsheet.",
  problem_impact: "Updates are duplicated and sometimes missed.",
  desired_outcome: "One clear view of each job",
  users: "Office and field staff",
  existing_systems: "Accounting package",
  data_needs: "Customer and job records",
  first_release: "Create, assign, and close jobs",
  optional_requirements: "Customer notifications",
  future_ideas: "Route planning",
  excluded_functionality: "Payments",
  budget: "AUD $15,000-$40,000",
  timing: "There is some flexibility",
  timing_context: "Before the summer peak",
  delivery_model: "Recommendation required",
  day_to_day_owner: "Our team",
  ongoing_support: "Occasional support when needed",
  acceptance_criteria: "Staff can complete a job without the spreadsheet",
  constraints: "Managers approve account access",
  additional_notes: "Keep the existing job numbering",
  privacy_consent: "Agreed"
};

var submission = LangSystemsIntakeModel.createSubmission(raw, {
  now: "2026-08-03T01:02:03.000Z",
  submissionId: "LS-TEST-001",
  sourcePage: "/get-started?email=must-not-remain#form",
  campaign: "winter-2026"
});

assertTrue(submission.submissionMetadata.schemaVersion === "3.0.0", "Schema version was not retained.");
assertTrue(submission.submissionMetadata.templateVersion === "1.0.0", "Template version was not retained.");
assertTrue(submission.submissionMetadata.source.page === "/get-started", "Source page was not safely normalised.");
assertTrue(submission.customerAnswers.customer.name === "Alex Example", "Short text was not trimmed.");
assertTrue(submission.customerAnswers.customer.phoneNumber === null, "An optional blank was not normalised to null.");
assertTrue(submission.customerAnswers.commercial.timelineContext === "Before the summer peak", "An original commercial answer was lost.");
assertTrue(submission.customerAnswers.additionalContext.additionalNotes === "Keep the existing job numbering", "Additional customer context was lost.");
assertTrue(submission.processing.clarificationQuestions.length === 0, "Generated content leaked into customer answers.");

var validation = LangSystemsIntakeModel.validateSubmission(submission);
assertTrue(validation.valid, "A representative submission did not validate: " + (validation.errors[0] || {}).path);

var json = LangSystemsIntakeModel.serialiseSubmission(submission);
var restored = LangSystemsIntakeModel.parseSubmission(json);
assertTrue(restored.submissionMetadata.submissionId === "LS-TEST-001", "Serialisation did not preserve the identifier.");
assertTrue(restored.customerAnswers.scope.explicitExclusions === "Payments", "Serialisation did not preserve an original answer.");

var invalidEmail = LangSystemsIntakeModel.createSubmission(raw, { submissionId: "LS-TEST-002" });
invalidEmail.customerAnswers.customer.emailAddress = "not-an-email";
validation = LangSystemsIntakeModel.validateSubmission(invalidEmail);
assertTrue(!validation.valid, "An invalid email address passed validation.");
assertTrue(validation.errors.some(function (error) { return error.code === "invalid_email"; }), "The invalid email error was not descriptive.");

var missingConsent = LangSystemsIntakeModel.createSubmission(raw, { submissionId: "LS-TEST-CONSENT" });
missingConsent.customerAnswers.additionalContext.privacyConsent = false;
validation = LangSystemsIntakeModel.validateSubmission(missingConsent);
assertTrue(!validation.valid && validation.errors.some(function (error) { return error.code === "required_consent"; }), "Missing privacy consent passed validation.");

var overlong = LangSystemsIntakeModel.createSubmission(raw, { submissionId: "LS-TEST-LENGTH" });
overlong.customerAnswers.customer.name = new Array(302).join("x");
validation = LangSystemsIntakeModel.validateSubmission(overlong);
assertTrue(!validation.valid && validation.errors.some(function (error) { return error.code === "too_long"; }), "An overlong answer passed validation.");

var unexpectedField = LangSystemsIntakeModel.createSubmission(raw, { submissionId: "LS-TEST-FORMAT" });
unexpectedField.customerAnswers.customer.unexpected = "must not be forwarded";
validation = LangSystemsIntakeModel.validateSubmission(unexpectedField);
assertTrue(!validation.valid && validation.errors.some(function (error) { return error.code === "unexpected_field"; }), "An unsupported payload field passed validation.");

var phoneRequired = LangSystemsIntakeModel.createSubmission(raw, { submissionId: "LS-TEST-003" });
phoneRequired.customerAnswers.customer.preferredContactMethod = "phone";
validation = LangSystemsIntakeModel.validateSubmission(phoneRequired);
assertTrue(!validation.valid, "A missing conditionally required phone number passed validation.");

var unsafeAttachment = LangSystemsIntakeModel.createSubmission(raw, { submissionId: "LS-TEST-004" });
unsafeAttachment.attachments.push({
  attachmentId: "ATT-1",
  originalFilename: "example.pdf",
  storedFilename: "safe-example.pdf",
  mimeType: "application/pdf",
  sizeBytes: LangSystemsIntakeModel.limits.maximumAttachmentBytes + 1,
  storageLocation: "private/intake/ATT-1",
  validationStatus: "pending"
});
validation = LangSystemsIntakeModel.validateSubmission(unsafeAttachment);
assertTrue(!validation.valid, "An oversized attachment passed validation.");

var unsupportedAttachment = LangSystemsIntakeModel.createSubmission(raw, { submissionId: "LS-TEST-005" });
unsupportedAttachment.attachments.push({
  attachmentId: "ATT-2",
  originalFilename: "program.exe",
  storedFilename: "program.exe",
  mimeType: "application/x-msdownload",
  sizeBytes: 100,
  storageLocation: "private/intake/ATT-2",
  validationStatus: "pending"
});
validation = LangSystemsIntakeModel.validateSubmission(unsupportedAttachment);
assertTrue(!validation.valid && validation.errors.some(function (error) { return error.code === "unsupported_type"; }), "An unsupported attachment passed validation.");

var legacy = {
  schemaVersion: "1.0",
  projectReference: "LS-LEGACY-001",
  contact: { name: "Alex", organisation: "Example Operations", email: "alex@example.com" },
  discovery: {
    businessDescription: "Regional service business",
    problem: "Jobs are difficult to track",
    currentProcess: "Email and spreadsheet",
    impact: "Missed updates",
    desiredOutcome: "One view",
    users: "Office staff"
  },
  scope: { includedFirstRelease: "Track jobs", acceptanceCriteria: "Jobs can be closed" },
  commercial: { deliveryModel: "Recommendation required", budget: "Not sure", timing: "Flexible" }
};
var upgraded = LangSystemsIntakeModel.upgradeLegacyV1(legacy, { submittedAt: "2026-08-01T00:00:00.000Z" });
assertTrue(upgraded.submissionMetadata.schemaVersion === "3.0.0", "Legacy submission was not upgraded.");
assertTrue(upgraded.customerAnswers.desiredOutcome.problemStatement === "Jobs are difficult to track", "Legacy customer content was not preserved.");
assertTrue(LangSystemsIntakeModel.validateSubmission(upgraded).valid, "Representative legacy submission did not validate after upgrade.");

WScript.Echo("Intake model validation and serialisation checks passed.");
