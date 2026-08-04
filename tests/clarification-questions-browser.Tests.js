var fso = new ActiveXObject("Scripting.FileSystemObject");
var root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName));
if (!Object.freeze) Object.freeze = function (value) { return value; };
if (!Object.create) Object.create = function (prototype) { function Temporary() {} Temporary.prototype = prototype; return new Temporary(); };
if (!Object.keys) Object.keys = function (value) { var keys = []; for (var key in value) if (Object.prototype.hasOwnProperty.call(value, key)) keys.push(key); return keys; };
if (!String.prototype.trim) String.prototype.trim = function () { return this.replace(/^\s+|\s+$/g, ""); };
if (!Array.isArray) Array.isArray = function (value) { return Object.prototype.toString.call(value) === "[object Array]"; };
if (!Array.prototype.forEach) Array.prototype.forEach = function (callback) { for (var i = 0; i < this.length; i += 1) callback(this[i], i, this); };
if (!Array.prototype.map) Array.prototype.map = function (callback) { var output = []; for (var i = 0; i < this.length; i += 1) output.push(callback(this[i], i, this)); return output; };
if (!Array.prototype.filter) Array.prototype.filter = function (callback) { var output = []; for (var i = 0; i < this.length; i += 1) if (callback(this[i], i, this)) output.push(this[i]); return output; };
if (!Array.prototype.some) Array.prototype.some = function (callback) { for (var i = 0; i < this.length; i += 1) if (callback(this[i], i, this)) return true; return false; };
if (!Array.prototype.indexOf) Array.prototype.indexOf = function (value) { for (var i = 0; i < this.length; i += 1) if (this[i] === value) return i; return -1; };
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
function allItems(output) {
  return output.groups.requiredBeforeEstimation.concat(output.groups.requiredBeforeDevelopment, output.groups.helpfulButNonBlocking);
}
function hasId(output, id) {
  return allItems(output).some(function (item) { return item.id === id; });
}

load("intake-model.js");
load("clarification-questions.js");

var raw = {
  contact_name: "Alex Example", business_name: "Example Operations", email: "alex@example.com",
  business_description: "Regional service business", current_process: "Email and spreadsheet",
  problem_impact: "Updates are missed", problem: "Jobs are difficult to track",
  desired_outcome: "One clear view", users: "Office staff", first_release: "Track jobs",
  acceptance_criteria: "A supervisor can close a job", delivery_model: "Recommendation required",
  budget: "Not sure - please advise", timing: "Exploring options only", privacy_consent: "Agreed"
};
var submission = LangSystemsIntakeModel.createSubmission(raw, { submissionId: "LS-CLARIFICATION-BROWSER" });
var result = LangSystemsClarificationQuestions.generate(submission);
assertTrue(allItems(result).length <= 5, "Default clarification limit was not enforced.");
assertTrue(result.groups.requiredBeforeEstimation.length > 0, "Estimation questions were not grouped.");
assertTrue(result.groups.requiredBeforeDevelopment.length > 0, "Development questions were not grouped.");
assertTrue(result.groups.helpfulButNonBlocking.length > 0, "Helpful questions were not grouped.");
assertTrue(allItems(result)[0].reason.length > 0, "Internal reasons were not retained.");
assertTrue(result.renderedInternal.indexOf("manual review required") >= 0, "Manual review safeguard is missing.");
assertTrue(LangSystemsClarificationQuestions.validateOutput(result).valid, "Generated output failed structured validation.");

submission.customerAnswers.desiredOutcome.existingDataSources = "About 2,000 spreadsheet rows need to be imported.";
submission.customerAnswers.desiredOutcome.existingSystemConnections = "None";
submission.customerAnswers.desiredOutcome.approximateUserCount = "12";
submission.customerAnswers.desiredOutcome.deviceRequirements = ["Office computers", "Work phones"];
submission.customerAnswers.desiredOutcome.offlineRequirements = "Offline use is not required.";
submission.customerAnswers.desiredOutcome.dataStoragePreference = "Securely online so authorised people can access it from anywhere (cloud)";
submission.customerAnswers.currentProcess.currentUsers = "Office coordinators and supervisors";
var answered = LangSystemsClarificationQuestions.generate(submission);
assertTrue(!hasId(answered, "existing-data") && !hasId(answered, "integrations") && !hasId(answered, "users-and-permissions") && !hasId(answered, "devices-and-offline"), "Answered topics were asked again.");

submission.customerAnswers.scope.essentialFirstRelease = "Synchronise completed jobs with the accounting system.";
var conflict = LangSystemsClarificationQuestions.generate(submission);
assertTrue(conflict.contradictions.length > 0 && conflict.groups.requiredBeforeEstimation[0].contradiction, "A contradictory answer was not flagged as blocking (flags: " + conflict.contradictions.length + "; first: " + conflict.groups.requiredBeforeEstimation[0].id + ").");

var failedSafely = false;
try { LangSystemsClarificationQuestions.generate({}); }
catch (error) { failedSafely = error.code === "invalid_submission" && error.message.indexOf("alex@example.com") < 0; }
assertTrue(failedSafely, "Invalid input did not fail safely.");

WScript.Echo("Clarification question browser targeting, grouping, contradiction, and limit checks passed.");
