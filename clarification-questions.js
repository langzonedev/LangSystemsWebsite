(function (root, factory) {
  "use strict";
  var model = typeof module === "object" && module.exports ? require("./intake-model.js") : root.LangSystemsIntakeModel;
  var api = factory(model);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LangSystemsClarificationQuestions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (IntakeModel) {
  "use strict";

  var OUTPUT_VERSION = "1.0.0";
  var GROUPS = ["requiredBeforeEstimation", "requiredBeforeDevelopment", "helpfulButNonBlocking"];
  var GROUP_LABELS = {
    requiredBeforeEstimation: "Required before estimation",
    requiredBeforeDevelopment: "Required before development",
    helpfulButNonBlocking: "Helpful but non-blocking"
  };

  function ClarificationQuestionError(message, code, cause) {
    this.name = "ClarificationQuestionError";
    this.message = message;
    this.code = code;
    this.cause = cause;
    if (Error.captureStackTrace) Error.captureStackTrace(this, ClarificationQuestionError);
  }
  ClarificationQuestionError.prototype = Object.create(Error.prototype);
  ClarificationQuestionError.prototype.constructor = ClarificationQuestionError;

  function hasText(value) { return typeof value === "string" && value.trim().length > 0; }
  function hasList(value) { return Array.isArray(value) && value.length > 0; }
  function uncertain(value) { return !hasText(value) || /\b(not sure|unknown|to be confirmed|tbc|please advise)\b/i.test(value); }
  function saysNone(value) { return hasText(value) && /^(none|no|not required|not applicable|n\/a)\b/i.test(value.trim()); }
  function evidenceText(answers) {
    return [
      answers.currentProcess.description, answers.currentProcess.currentTools.join(" "),
      answers.desiredOutcome.problemStatement, answers.desiredOutcome.outcome,
      answers.scope.essentialFirstRelease, answers.scope.completionCriteria,
      answers.additionalContext.constraints, answers.additionalContext.additionalNotes
    ].filter(hasText).join(" ");
  }
  function add(list, id, group, question, reason, sourcePaths, contradiction) {
    list.push({
      id: id, group: group, question: question, reason: reason,
      sourcePaths: sourcePaths.slice(0), contradiction: contradiction === true
    });
  }

  function contradictionCandidates(answers, candidates, contradictions) {
    var desired = answers.desiredOutcome;
    var commercial = answers.commercial;
    var evidence = evidenceText(answers);
    function conflict(id, summary, question, paths) {
      contradictions.push({ id: id, summary: summary, sourcePaths: paths.slice(0) });
      add(candidates, id, "requiredBeforeEstimation", question,
        "The answers appear inconsistent. A reviewer needs one confirmed interpretation before estimating the work.", paths, true);
    }

    if (saysNone(desired.existingSystemConnections) && /\b(connect\w*|integrat\w*|sync\w*|link(?:ed|ing)?|api)\b/i.test(evidence)) {
      conflict("integration-conflict", "The submission says no system connection is required but describes connected or synchronised work.",
        "You indicated that no existing system connection is needed, but another answer mentions connected or synchronised work. Should the first release exchange information with another system? If so, which one and what information?",
        ["customerAnswers.desiredOutcome.existingSystemConnections", "customerAnswers.scope.essentialFirstRelease"]);
    }
    if (saysNone(desired.offlineRequirements) && /\b(offline|without (?:an )?internet|no (?:internet|signal|connection))\b/i.test(evidence)) {
      conflict("offline-conflict", "The submission says offline use is not required but another answer describes use without an internet connection.",
        "You indicated that offline use is not required, but another answer mentions working without an internet connection. Must any part of the first release work when there is no connection?",
        ["customerAnswers.desiredOutcome.offlineRequirements", "customerAnswers.additionalContext.constraints"]);
    }
    if (hasList(desired.deviceRequirements) && desired.deviceRequirements.join(" ").match(/desktop only/i) && /\b(phone|mobile|tablet)\b/i.test(evidence)) {
      conflict("device-conflict", "The selected devices are desktop-only but another answer mentions phone, mobile or tablet use.",
        "You selected desktop-only use, but another answer mentions phones or tablets. Which devices must the first release support?",
        ["customerAnswers.desiredOutcome.deviceRequirements", "customerAnswers.additionalContext.constraints"]);
    }
    if (hasText(commercial.requiredDate) && /exploring options|no (?:fixed )?deadline/i.test(commercial.timelineFlexibility || "")) {
      conflict("deadline-conflict", "A required date was supplied while the timing answer says there is no fixed deadline.",
        "You supplied a required date but also indicated that there is no fixed deadline. Is that date essential, preferred, or only a guide?",
        ["customerAnswers.commercial.requiredDate", "customerAnswers.commercial.timelineFlexibility"]);
    }
  }

  function buildCandidates(answers) {
    var current = answers.currentProcess;
    var desired = answers.desiredOutcome;
    var scope = answers.scope;
    var commercial = answers.commercial;
    var additional = answers.additionalContext;
    var candidates = [];
    var contradictions = [];
    contradictionCandidates(answers, candidates, contradictions);

    if (uncertain(desired.existingDataSources)) add(candidates, "existing-data", "requiredBeforeEstimation",
      "Does information from the current process need to be moved into the first release? If yes, where is it kept now, roughly how much is there, and does any of it need cleaning up?",
      "Existing information and migration effort can materially change scope and complexity.",
      ["customerAnswers.currentProcess.description", "customerAnswers.desiredOutcome.existingDataSources"]);
    if (uncertain(desired.existingSystemConnections)) add(candidates, "integrations", "requiredBeforeEstimation",
      "Must the first release exchange information with any existing system or service? If yes, please name it and describe what needs to move between them.",
      "Required connections can affect feasibility, dependencies and estimation.",
      ["customerAnswers.desiredOutcome.existingSystemConnections"]);
    if (uncertain(scope.explicitExclusions)) add(candidates, "first-release-boundary", "requiredBeforeEstimation",
      "What related work should definitely be left out of the first release?",
      "A clear first-release boundary is needed to avoid estimating optional or future work as essential.",
      ["customerAnswers.scope.essentialFirstRelease", "customerAnswers.scope.explicitExclusions"]);
    if (uncertain(commercial.approximateBudgetRange)) add(candidates, "commercial-range", "requiredBeforeEstimation",
      "After Lang Systems explains the practical first-release options, is there an investment range or approval limit we should plan around? It is fine to provide a guide rather than a firm budget.",
      "A guide helps Lang Systems present commercially realistic options without treating budget uncertainty as rejection grounds.",
      ["customerAnswers.commercial.approximateBudgetRange"]);
    if (uncertain(commercial.timelineContext)) add(candidates, "deadline-context", "requiredBeforeEstimation",
      "Is your preferred timing linked to an important date, event, contract or other dependency? If so, what is fixed and what can move?",
      "A fixed dependency affects delivery risk and whether the requested timing is realistic.",
      ["customerAnswers.commercial.requiredDate", "customerAnswers.commercial.timelineFlexibility", "customerAnswers.commercial.timelineContext"]);

    if (uncertain(desired.approximateUserCount) || !hasText(current.currentUsers)) add(candidates, "users-and-permissions", "requiredBeforeDevelopment",
      "About how many people will use the first release, and should everyone be able to do the same things? Please describe any people who may only view, update, approve or manage information.",
      "User numbers and different levels of access are needed to plan permissions and operational complexity.",
      ["customerAnswers.desiredOutcome.intendedUsers", "customerAnswers.desiredOutcome.approximateUserCount", "customerAnswers.currentProcess.currentUsers"]);
    if (!hasList(desired.deviceRequirements) || uncertain(desired.offlineRequirements)) add(candidates, "devices-and-offline", "requiredBeforeDevelopment",
      "Which devices will people use for the first release, and must any part work where the internet connection is unavailable or unreliable?",
      "Device and offline needs can significantly affect design, testing and information synchronisation.",
      ["customerAnswers.desiredOutcome.deviceRequirements", "customerAnswers.desiredOutcome.offlineRequirements", "customerAnswers.desiredOutcome.locationRequirements"]);
    if (uncertain(desired.privacySecurityConsiderations) && uncertain(additional.constraints)) add(candidates, "privacy-and-security", "requiredBeforeDevelopment",
      "Will the first release handle personal, confidential or regulated information, or need particular approvals, access records or security checks? Please describe what applies in plain language.",
      "Privacy, security and approval obligations must be understood before detailed design or development.",
      ["customerAnswers.desiredOutcome.privacySecurityConsiderations", "customerAnswers.additionalContext.constraints"]);
    if (uncertain(commercial.dayToDayOwner)) add(candidates, "project-owner", "requiredBeforeDevelopment",
      "Who will make day-to-day decisions and confirm that the first release meets the business need? A role or team name is enough for now.",
      "A clear decision and acceptance owner is needed before development starts.",
      ["customerAnswers.commercial.dayToDayOwner", "customerAnswers.scope.completionCriteria"]);

    if (uncertain(commercial.ownershipPreference) || /recommendation required/i.test(commercial.deliveryModelPreference || "")) add(candidates, "ownership-preference", "helpfulButNonBlocking",
      "Do you expect your business to own the finished solution, or are you open to an ongoing licence if that offers better value? Lang Systems can explain the options before you decide.",
      "Ownership expectations help prepare suitable commercial options but do not block initial estimation.",
      ["customerAnswers.commercial.deliveryModelPreference", "customerAnswers.commercial.ownershipPreference"]);
    if (uncertain(commercial.ongoingSupportPreference)) add(candidates, "ongoing-support", "helpfulButNonBlocking",
      "After launch, would you prefer Lang Systems to provide ongoing support, hand the solution over, or explain both options?",
      "Support preference informs handover and commercial planning but can be decided later.",
      ["customerAnswers.commercial.ongoingSupportPreference"]);
    if (!hasText(scope.usefulLater) && !hasText(scope.futureIdeas)) add(candidates, "later-ideas", "helpfulButNonBlocking",
      "Are there useful ideas we should record for a later release, without including them in the first estimate?",
      "Recording later ideas protects the first-release boundary while preserving useful context.",
      ["customerAnswers.scope.usefulLater", "customerAnswers.scope.futureIdeas"]);
    return { candidates: candidates, contradictions: contradictions };
  }

  function selectCandidates(candidates, maximum) {
    var selected = [];
    var seen = {};
    function take(group, limit, contradictionsOnly) {
      var count = 0;
      candidates.forEach(function (item) {
        if (selected.length >= maximum || seen[item.id] || item.group !== group || (contradictionsOnly && !item.contradiction) || (!contradictionsOnly && item.contradiction)) return;
        if (count < limit) { selected.push(item); seen[item.id] = true; count += 1; }
      });
    }
    take("requiredBeforeEstimation", maximum, true);
    take("requiredBeforeEstimation", 3, false);
    take("requiredBeforeDevelopment", 1, false);
    take("helpfulButNonBlocking", 1, false);
    GROUPS.forEach(function (group) { take(group, maximum, false); });
    return selected;
  }

  function validateOutput(output) {
    var errors = [];
    if (!output || output.version !== OUTPUT_VERSION || output.manualReviewRequired !== true) errors.push("Output metadata is invalid.");
    if (!output || !output.groups || !output.customerFollowUp || !Array.isArray(output.contradictions)) errors.push("Output groups are invalid.");
    GROUPS.forEach(function (group) {
      var items = output && output.groups && output.groups[group];
      var customerItems = output && output.customerFollowUp && output.customerFollowUp[group];
      if (!Array.isArray(items) || !Array.isArray(customerItems)) { errors.push(GROUP_LABELS[group] + " is invalid."); return; }
      items.forEach(function (item) {
        if (!item || !hasText(item.id) || item.group !== group || !hasText(item.question) || !hasText(item.reason) || !Array.isArray(item.sourcePaths) || typeof item.contradiction !== "boolean") errors.push("A clarification question is invalid.");
      });
      if (customerItems.some(function (item) { return !hasText(item); })) errors.push("Customer follow-up questions are invalid.");
    });
    return { valid: errors.length === 0, errors: errors };
  }

  function renderInternal(output) {
    var lines = [
      "LANG SYSTEMS CLARIFICATION REVIEW", "INTERNAL - manual review required before customer follow-up",
      "These questions do not approve scope, estimation, commercial terms or development."
    ];
    if (output.contradictions.length) {
      lines.push("", "CONTRADICTORY ANSWERS FLAGGED");
      output.contradictions.forEach(function (item) { lines.push("- " + item.summary + " Sources: " + item.sourcePaths.join(", ")); });
    }
    GROUPS.forEach(function (group) {
      lines.push("", GROUP_LABELS[group].toUpperCase());
      if (!output.groups[group].length) lines.push("- None identified automatically.");
      output.groups[group].forEach(function (item, index) {
        lines.push((index + 1) + ". " + item.question, "   Internal reason: " + item.reason, "   Triggered by: " + item.sourcePaths.join(", "));
      });
    });
    return lines.join("\n");
  }

  function generate(submission, options) {
    var parsed;
    try { parsed = IntakeModel.parseSubmission(submission); }
    catch (error) { throw new ClarificationQuestionError("Clarification questions could not be generated from an invalid submission.", "invalid_submission", error); }
    var requestedMaximum = options && options.maximumQuestions;
    var isWholeNumber = typeof requestedMaximum === "number" && isFinite(requestedMaximum) && Math.floor(requestedMaximum) === requestedMaximum;
    var maximum = isWholeNumber ? Math.max(1, Math.min(requestedMaximum, 10)) : 5;
    var built = buildCandidates(parsed.customerAnswers);
    var selected = selectCandidates(built.candidates, maximum);
    var groups = { requiredBeforeEstimation: [], requiredBeforeDevelopment: [], helpfulButNonBlocking: [] };
    var customer = { requiredBeforeEstimation: [], requiredBeforeDevelopment: [], helpfulButNonBlocking: [] };
    selected.forEach(function (item) { groups[item.group].push(item); customer[item.group].push(item.question); });
    var output = {
      version: OUTPUT_VERSION, manualReviewRequired: true,
      reviewNotice: "Lang Systems must review and edit these suggestions before sending them to the customer where practical. Generation never starts development.",
      contradictions: built.contradictions, groups: groups, customerFollowUp: customer
    };
    var validation = validateOutput(output);
    if (!validation.valid) throw new ClarificationQuestionError("Clarification questions failed structured validation.", "generation_invalid");
    output.renderedInternal = renderInternal(output);
    return output;
  }

  return Object.freeze({
    OUTPUT_VERSION: OUTPUT_VERSION, GROUP_LABELS: GROUP_LABELS, ClarificationQuestionError: ClarificationQuestionError,
    generate: generate, validateOutput: validateOutput, renderInternal: renderInternal
  });
});
