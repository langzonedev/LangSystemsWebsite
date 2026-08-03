var fso = new ActiveXObject("Scripting.FileSystemObject");
var root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName));
if (!Object.freeze) Object.freeze = function (value) { return value; };
if (!Object.create) Object.create = function (prototype) { function Temporary() {} Temporary.prototype = prototype; return new Temporary(); };
if (!Object.keys) Object.keys = function (value) { var keys = []; for (var key in value) if (Object.prototype.hasOwnProperty.call(value, key)) keys.push(key); return keys; };
if (!String.prototype.trim) String.prototype.trim = function () { return this.replace(/^\s+|\s+$/g, ""); };
if (!String.prototype.repeat) String.prototype.repeat = function (count) { var result = ""; for (var i = 0; i < count; i += 1) result += String(this); return result; };
if (!Array.isArray) Array.isArray = function (value) { return Object.prototype.toString.call(value) === "[object Array]"; };
if (!Array.prototype.forEach) Array.prototype.forEach = function (callback) { for (var i = 0; i < this.length; i += 1) callback(this[i], i, this); };
if (!Array.prototype.map) Array.prototype.map = function (callback) { var output = []; for (var i = 0; i < this.length; i += 1) output.push(callback(this[i], i, this)); return output; };
if (!Array.prototype.filter) Array.prototype.filter = function (callback) { var output = []; for (var i = 0; i < this.length; i += 1) if (callback(this[i], i, this)) output.push(this[i]); return output; };
if (!Array.prototype.some) Array.prototype.some = function (callback) { for (var i = 0; i < this.length; i += 1) if (callback(this[i], i, this)) return true; return false; };
if (!Array.prototype.indexOf) Array.prototype.indexOf = function (value) { for (var i = 0; i < this.length; i += 1) if (this[i] === value) return i; return -1; };
if (!Number.isNaN) Number.isNaN = function (value) { return typeof value === "number" && isNaN(value); };
if (!Date.prototype.toISOString) Date.prototype.toISOString = function () {
  function pad(value, width) { var result = String(value); while (result.length < width) result = "0" + result; return result; }
  return this.getUTCFullYear() + "-" + pad(this.getUTCMonth() + 1, 2) + "-" + pad(this.getUTCDate(), 2) +
    "T" + pad(this.getUTCHours(), 2) + ":" + pad(this.getUTCMinutes(), 2) + ":" + pad(this.getUTCSeconds(), 2) +
    "." + pad(this.getUTCMilliseconds(), 3) + "Z";
};

function load(name) {
  var file = fso.OpenTextFile(fso.BuildPath(root, name), 1, false, 0);
  var source = file.ReadAll();
  file.Close();
  eval(source);
}
function assertTrue(condition, message) { if (!condition) throw new Error(message); }

load("intake-model.js");
load("internal-project-brief.js");

var raw = {
  contact_name: "Alex Private", business_name: "Example Operations", email: "alex.private@example.com",
  business_description: "Regional field service business", current_process: "Email and spreadsheet",
  problem_impact: "Missed updates", problem: "Jobs are difficult to track", desired_outcome: "One job view",
  users: "Office and field staff", existing_systems: "Accounting service", data_needs: "Customer and job records",
  first_release: "Create, assign and close jobs", optional_requirements: "Notifications", future_ideas: "Route planning",
  excluded_functionality: "Payments", acceptance_criteria: "Staff can close jobs", constraints: "Mobile use",
  delivery_model: "Customer-owned bespoke build", budget: "AUD $15,000-$40,000", timing: "Within 3-6 months",
  timing_context: "Before summer", day_to_day_owner: "Our team", ongoing_support: "Occasional support",
  privacy_consent: "Agreed"
};
var submission = LangSystemsIntakeModel.createSubmission(raw, { submissionId: "LS-BRIEF-BROWSER", now: "2026-08-03T02:00:00.000Z" });
var brief;
try { brief = LangSystemsInternalProjectBrief.buildBrief(submission); }
catch (error) { throw new Error(error.message + " (" + error.code + "; dates: " + submission.submissionMetadata.submittedAt + ")"); }
var validation = LangSystemsInternalProjectBrief.validateBrief(brief);
assertTrue(validation.valid, "Representative brief failed validation: " + validation.errors.join("; "));
assertTrue(brief.internalStatus === "Suitable for bespoke-build evaluation", "Bespoke recommendation was not explained and classified.");
assertTrue(brief.opportunitySummary.basis === "inference", "Generated summary was not identified as inference.");
assertTrue(brief.customerProblem.basis === "customer_evidence", "Customer evidence was not distinguished.");
assertTrue(brief.readiness.development.status === "not_ready", "Development was allowed without manual approval.");
assertTrue(brief.renderedText.indexOf("MANUAL REVIEW REQUIRED") >= 0, "Manual-review notice is missing.");

raw.budget = "Not sure - please advise";
raw.delivery_model = "Recommendation required";
raw.existing_systems = "";
raw.data_needs = "";
raw.excluded_functionality = "";
raw.constraints = "";
raw.timing_context = "";
var unclear = LangSystemsInternalProjectBrief.buildBrief(LangSystemsIntakeModel.createSubmission(raw, { submissionId: "LS-BRIEF-UNCLEAR" }));
assertTrue(unclear.internalStatus === "Manual commercial review required", "Uncertain commercial preference did not require manual review.");
assertTrue(unclear.missingInformation.join(" ").indexOf("not a reason to reject") >= 0, "Missing budget safeguard is absent.");
assertTrue(unclear.readiness.estimation.status === "not_ready", "Incomplete discovery was marked ready to estimate.");

WScript.Echo("Internal project brief browser generation, evidence, readiness, and budget checks passed.");
