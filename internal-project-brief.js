(function (root, factory) {
  "use strict";
  var model = typeof module === "object" && module.exports ? require("./intake-model.js") : root.LangSystemsIntakeModel;
  var api = factory(model);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LangSystemsInternalProjectBrief = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (IntakeModel) {
  "use strict";

  var SCHEMA_VERSION = "1.0.0";
  var TEMPLATE_VERSION = "1.0.0";
  var CLASSIFICATION = "INTERNAL - Lang Systems authorised personnel only";
  var NOTICE = "Internal decision-support brief for manual review. It is not customer-facing, a quote, scope approval, project approval, or permission to begin development.";
  var INTERNAL_STATUSES = [
    "Ready for initial review", "Clarification required", "Not enough information to estimate",
    "Suitable for bespoke-build evaluation", "Suitable for licensed-product evaluation",
    "Potential co-funded opportunity", "Not currently suitable", "Manual commercial review required"
  ];
  var READINESS = ["ready", "not_ready", "manual_review_required"];

  function InternalProjectBriefError(message, code, cause) {
    this.name = "InternalProjectBriefError";
    this.message = message;
    this.code = code;
    this.cause = cause;
    if (Error.captureStackTrace) Error.captureStackTrace(this, InternalProjectBriefError);
  }
  InternalProjectBriefError.prototype = Object.create(Error.prototype);
  InternalProjectBriefError.prototype.constructor = InternalProjectBriefError;

  function hasText(value) { return typeof value === "string" && value.trim().length > 0; }
  function isUtcDateTime(value) { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value); }
  function text(value, fallback) { return hasText(value) ? value.trim() : fallback; }
  function evidence(value, sourcePath, fallback) {
    return { value: text(value, fallback), basis: hasText(value) ? "customer_evidence" : "missing", sourcePaths: hasText(value) ? [sourcePath] : [] };
  }
  function assessment(value, basis, reasons, sourcePaths) {
    return { value: value, basis: basis, reasons: reasons, sourcePaths: sourcePaths || [] };
  }
  function isBudgetUnclear(value) { return !hasText(value) || /not sure|please advise|unknown|not provided/i.test(value); }

  function determineDelivery(commercial) {
    var preference = commercial.deliveryModelPreference || "";
    if (/customer-owned bespoke/i.test(preference)) return assessment(
      "Customer-owned bespoke build", "recommendation",
      ["The customer explicitly selected a customer-owned arrangement.", "Commercial terms and intellectual-property ownership still require manual agreement."],
      ["customerAnswers.commercial.deliveryModelPreference"]
    );
    if (/licensed product/i.test(preference)) return assessment(
      "Lang Systems licensed product", "recommendation",
      ["The customer explicitly indicated openness to licensing.", "Product fit, reusable scope and licence terms require manual evaluation."],
      ["customerAnswers.commercial.deliveryModelPreference"]
    );
    if (/co-funded/i.test(preference)) return assessment(
      "Co-funded product partnership", "recommendation",
      ["The customer explicitly selected the co-funded option.", "This is only a candidate for manual commercial review and does not create or approve a partnership."],
      ["customerAnswers.commercial.deliveryModelPreference"]
    );
    return assessment(
      "Manual comparison of bespoke and licensed options", "recommendation",
      ["The customer asked Lang Systems to recommend an approach.", "The submission does not provide enough evidence to determine ownership, reusable-product fit or commercial terms automatically."],
      ["customerAnswers.commercial.deliveryModelPreference"]
    );
  }

  function buildBrief(submission) {
    var parsed;
    try { parsed = IntakeModel.parseSubmission(submission); }
    catch (error) { throw new InternalProjectBriefError("The internal project brief could not be generated from an invalid submission.", "invalid_submission", error); }

    var metadata = parsed.submissionMetadata;
    var answers = parsed.customerAnswers;
    var customer = answers.customer;
    var current = answers.currentProcess;
    var desired = answers.desiredOutcome;
    var scope = answers.scope;
    var commercial = answers.commercial;
    var additional = answers.additionalContext;
    var missing = [];
    var questions = [];

    function missingWhen(value, item, question) {
      var absent = Array.isArray(value) ? value.length === 0 : !hasText(value);
      if (absent) { missing.push(item); questions.push(question); }
    }
    missingWhen(customer.phoneNumber, "Customer phone number was not supplied.", "What is the best phone number if a call would help clarify the enquiry?");
    missingWhen(desired.existingSystemConnections, "Required system connections are not confirmed.", "Which existing systems must the first release connect to, if any?");
    missingWhen(desired.existingDataSources, "Required data sources, formats and volumes are not confirmed.", "What information must the solution use, and where is it currently stored?");
    missingWhen(scope.explicitExclusions, "Explicit first-release exclusions are not confirmed.", "What must be explicitly outside the first release?");
    missingWhen(additional.constraints, "Privacy, security, regulatory and operating constraints are not confirmed.", "What privacy, security, accessibility, approval or industry constraints apply?");
    if (isBudgetUnclear(commercial.approximateBudgetRange)) {
      missing.push("A practical budget range is not yet known; this is a discussion item and is not a reason to reject the enquiry.");
      questions.push("What investment range could be practical after Lang Systems explains the first-release options?");
    }
    if (!hasText(commercial.timelineContext)) {
      missing.push("The reason for the requested timeframe is not supplied.");
      questions.push("Is the requested timeframe linked to a fixed date, event or dependency?");
    }

    var scopeReady = hasText(scope.essentialFirstRelease) && hasText(scope.completionCriteria) && hasText(scope.explicitExclusions);
    var estimateReady = scopeReady && hasText(desired.existingSystemConnections) && hasText(desired.existingDataSources) && !isBudgetUnclear(commercial.approximateBudgetRange);
    var delivery = determineDelivery(commercial);
    var status = questions.length ? "Clarification required" : "Ready for initial review";
    if (!estimateReady && questions.length >= 4) status = "Not enough information to estimate";
    if (/customer-owned bespoke/i.test(commercial.deliveryModelPreference || "") && scopeReady) status = "Suitable for bespoke-build evaluation";
    if (/licensed product/i.test(commercial.deliveryModelPreference || "") && scopeReady) status = "Suitable for licensed-product evaluation";
    if (/co-funded/i.test(commercial.deliveryModelPreference || "")) status = "Potential co-funded opportunity";
    if (/recommendation required/i.test(commercial.deliveryModelPreference || "")) status = "Manual commercial review required";

    var complexitySignals = [desired.existingSystemConnections, desired.existingDataSources, desired.offlineRequirements, desired.privacySecurityConsiderations, additional.constraints].filter(hasText).length;
    var complexityCategory = complexitySignals >= 4 ? "High" : complexitySignals >= 2 ? "Medium" : questions.length >= 4 ? "Requires discovery" : "Low";
    var reuseValue = hasText(commercial.broaderMarketUsefulness) ? commercial.broaderMarketUsefulness : "Unclear";
    var brief = {
      metadata: {
        schemaVersion: SCHEMA_VERSION, templateVersion: TEMPLATE_VERSION,
        generatedAt: metadata.submittedAt,
        submissionIdentifier: metadata.submissionId, submissionDate: metadata.submittedAt,
        classification: CLASSIFICATION, notice: NOTICE, manualReviewRequired: true
      },
      internalStatus: status,
      customerDetails: {
        name: evidence(customer.name, "customerAnswers.customer.name", "Not supplied"),
        emailAddress: evidence(customer.emailAddress, "customerAnswers.customer.emailAddress", "Not supplied"),
        phoneNumber: evidence(customer.phoneNumber, "customerAnswers.customer.phoneNumber", "Not supplied")
      },
      businessDetails: {
        name: evidence(customer.businessName, "customerAnswers.customer.businessName", "Not supplied"),
        description: evidence(current.businessDescription, "customerAnswers.currentProcess.businessDescription", "Not supplied")
      },
      opportunitySummary: assessment(
        text(desired.problemStatement, "An unconfirmed business problem") + " The requested outcome is " + text(desired.outcome, "not yet confirmed") + ".",
        "inference", ["This concise summary combines two customer answers and must be checked against the original wording."],
        ["customerAnswers.desiredOutcome.problemStatement", "customerAnswers.desiredOutcome.outcome"]
      ),
      customerProblem: evidence(desired.problemStatement, "customerAnswers.desiredOutcome.problemStatement", "Not supplied"),
      currentProcess: evidence(current.description, "customerAnswers.currentProcess.description", "Not supplied"),
      desiredOutcome: evidence(desired.outcome, "customerAnswers.desiredOutcome.outcome", "Not supplied"),
      essentialFirstReleaseScope: evidence(scope.essentialFirstRelease, "customerAnswers.scope.essentialFirstRelease", "Not supplied"),
      laterRequirements: [
        evidence(scope.usefulLater, "customerAnswers.scope.usefulLater", "No later requirements supplied"),
        evidence(scope.futureIdeas, "customerAnswers.scope.futureIdeas", "No future ideas supplied")
      ],
      requestedTimeframe: assessment(
        text(commercial.timelineFlexibility, "Not supplied") + (hasText(commercial.timelineContext) ? "; reason: " + commercial.timelineContext : "; no timing reason supplied"),
        "customer_evidence", ["This restates the customer's timing selection and any supplied timing driver; feasibility has not been assessed."], ["customerAnswers.commercial.timelineFlexibility", "customerAnswers.commercial.timelineContext"]
      ),
      budgetIndication: evidence(commercial.approximateBudgetRange, "customerAnswers.commercial.approximateBudgetRange", "Not supplied - discuss with customer"),
      recommendedDeliveryModel: delivery,
      reusePotential: assessment(reuseValue, hasText(commercial.broaderMarketUsefulness) ? "customer_evidence" : "inference", [hasText(commercial.broaderMarketUsefulness) ? "The customer supplied this view; Lang Systems must verify market potential." : "No market evidence was supplied, so reuse potential cannot be determined from this enquiry."], hasText(commercial.broaderMarketUsefulness) ? ["customerAnswers.commercial.broaderMarketUsefulness"] : []),
      intellectualPropertyConsiderations: [
        assessment("Confirm ownership of customer data, existing materials and third-party components.", "recommendation", ["The submission does not establish intellectual-property ownership or licence rights."], []),
        assessment("Treat the stated visual direction as provisional and verify authority to use any customer branding, logos, fonts, images, guidelines or referenced product designs before incorporating them.", "recommendation", ["A branding preference does not establish ownership, permission, or third-party licence rights."], ["customerAnswers.additionalContext.visualDesignPreference", "customerAnswers.additionalContext.visualStyleNotes"]),
        assessment("Agree source-code, reusable-component, product and licensing rights in writing before work begins.", "recommendation", ["The recommended delivery model is non-binding and may affect ownership terms."], delivery.sourcePaths)
      ],
      majorTechnicalRisks: [
        assessment("Unconfirmed integrations and data characteristics may materially change scope and effort.", "inference", ["System connections or data details are absent or require technical verification."], ["customerAnswers.desiredOutcome.existingSystemConnections", "customerAnswers.desiredOutcome.existingDataSources"]),
        assessment("Security, privacy, access and operating requirements require technical discovery.", "inference", ["Customer constraints are discovery evidence, not a completed risk assessment."], ["customerAnswers.desiredOutcome.privacySecurityConsiderations", "customerAnswers.additionalContext.constraints"])
      ],
      majorCommercialRisks: [
        assessment("Scope, price, timeframe, ownership and support terms are not agreed.", "inference", ["An intake submission is not a contract or approved statement of work."], []),
        assessment(isBudgetUnclear(commercial.approximateBudgetRange) ? "Budget fit is unknown and should be discussed without treating the omission as rejection grounds." : "Budget fit must be tested against a clarified first-release scope.", "inference", ["A budget indication is planning evidence only."], ["customerAnswers.commercial.approximateBudgetRange"])
      ],
      importantAssumptions: [
        assessment("The customer wording is an early discovery input and has not been converted into approved requirements.", "inference", ["Manual customer and Lang Systems review is required."], []),
        assessment("Any later requirements are outside the first-release estimate unless explicitly agreed.", "inference", ["Separating first release from later work reduces accidental scope expansion."], ["customerAnswers.scope.usefulLater", "customerAnswers.scope.futureIdeas"])
      ],
      missingInformation: missing,
      contradictoryInformation: ["No contradiction was identified by deterministic checks. A reviewer must compare the original answers; absence of an automatic finding is not evidence that none exists."],
      recommendedClarificationQuestions: questions,
      estimatedComplexity: assessment(complexityCategory, "inference", ["This category is a triage aid based on disclosed integration, data, offline, security and constraint signals; it is not an estimate or objective score."], []),
      readiness: {
        estimation: { status: estimateReady ? "manual_review_required" : "not_ready", reasons: estimateReady ? ["Core discovery inputs are present, but a person must validate them before estimating."] : ["Material scope, data, integration or budget information remains unresolved."] },
        scopeApproval: { status: scopeReady ? "manual_review_required" : "not_ready", reasons: scopeReady ? ["Proposed scope boundaries exist, but only authorised manual review can approve scope."] : ["First-release boundaries or acceptance measures remain incomplete."] },
        development: { status: "not_ready", reasons: ["The enquiry has not been manually approved, estimated, contracted or authorised for development."] }
      },
      suggestedNextAction: assessment(
        questions.length ? "An authorised Lang Systems reviewer should validate the brief, ask the recommended clarification questions, and then reassess delivery model and estimation readiness." : "An authorised Lang Systems reviewer should validate the brief and decide whether to begin a scoped evaluation.",
        "recommendation", ["No customer communication or development approval may be automated from this brief."], []
      )
    };
    brief.renderedText = renderBrief(brief);
    var validation = validateBrief(brief);
    if (!validation.valid) throw new InternalProjectBriefError("The generated internal project brief failed validation: " + validation.errors.join(" "), "generation_invalid");
    return brief;
  }

  function validateEvidence(item, path, errors) {
    if (!item || typeof item !== "object" || !hasText(item.value) || ["customer_evidence", "missing"].indexOf(item.basis) < 0 || !Array.isArray(item.sourcePaths)) errors.push(path + " is invalid.");
    else if (item.basis === "customer_evidence" && item.sourcePaths.length === 0) errors.push(path + " requires a source path.");
  }
  function validateAssessment(item, path, errors) {
    if (!item || typeof item !== "object" || !hasText(item.value) || ["customer_evidence", "inference", "recommendation"].indexOf(item.basis) < 0 || !Array.isArray(item.reasons) || item.reasons.length < 1 || !Array.isArray(item.sourcePaths)) errors.push(path + " is invalid.");
  }
  function validateBrief(value) {
    var errors = [];
    var required = ["metadata", "internalStatus", "customerDetails", "businessDetails", "opportunitySummary", "customerProblem", "currentProcess", "desiredOutcome", "essentialFirstReleaseScope", "laterRequirements", "requestedTimeframe", "budgetIndication", "recommendedDeliveryModel", "reusePotential", "intellectualPropertyConsiderations", "majorTechnicalRisks", "majorCommercialRisks", "importantAssumptions", "missingInformation", "contradictoryInformation", "recommendedClarificationQuestions", "estimatedComplexity", "readiness", "suggestedNextAction", "renderedText"];
    if (!value || typeof value !== "object" || required.some(function (key) { return !Object.prototype.hasOwnProperty.call(value, key); }) || Object.keys(value || {}).some(function (key) { return required.indexOf(key) < 0; })) return { valid: false, errors: ["Brief fields are invalid."] };
    var meta = value.metadata;
    if (!meta || meta.schemaVersion !== SCHEMA_VERSION || meta.templateVersion !== TEMPLATE_VERSION || !hasText(meta.submissionIdentifier) || !isUtcDateTime(meta.generatedAt) || !isUtcDateTime(meta.submissionDate) || meta.classification !== CLASSIFICATION || meta.notice !== NOTICE || meta.manualReviewRequired !== true) errors.push("metadata is invalid.");
    if (INTERNAL_STATUSES.indexOf(value.internalStatus) < 0) errors.push("internalStatus is invalid.");
    ["name", "emailAddress", "phoneNumber"].forEach(function (key) { validateEvidence(value.customerDetails[key], "customerDetails." + key, errors); });
    ["name", "description"].forEach(function (key) { validateEvidence(value.businessDetails[key], "businessDetails." + key, errors); });
    ["customerProblem", "currentProcess", "desiredOutcome", "essentialFirstReleaseScope", "budgetIndication"].forEach(function (key) { validateEvidence(value[key], key, errors); });
    ["opportunitySummary", "requestedTimeframe", "recommendedDeliveryModel", "reusePotential", "estimatedComplexity", "suggestedNextAction"].forEach(function (key) { validateAssessment(value[key], key, errors); });
    ["laterRequirements"].forEach(function (key) { if (!Array.isArray(value[key]) || value[key].length < 1) errors.push(key + " is invalid."); else value[key].forEach(function (item, index) { validateEvidence(item, key + "[" + index + "]", errors); }); });
    ["intellectualPropertyConsiderations", "majorTechnicalRisks", "majorCommercialRisks", "importantAssumptions"].forEach(function (key) { if (!Array.isArray(value[key]) || value[key].length < 1) errors.push(key + " is invalid."); else value[key].forEach(function (item, index) { validateAssessment(item, key + "[" + index + "]", errors); }); });
    ["missingInformation", "contradictoryInformation", "recommendedClarificationQuestions"].forEach(function (key) { if (!Array.isArray(value[key]) || value[key].some(function (item) { return !hasText(item); })) errors.push(key + " is invalid."); });
    if (!value.readiness || ["estimation", "scopeApproval", "development"].some(function (key) { var item = value.readiness[key]; return !item || READINESS.indexOf(item.status) < 0 || !Array.isArray(item.reasons) || item.reasons.length < 1; })) errors.push("readiness is invalid.");
    if (!hasText(value.renderedText) || value.renderedText.length > 200000) errors.push("renderedText is invalid.");
    return { valid: errors.length === 0, errors: errors };
  }

  function renderBrief(brief) {
    function show(item) { return "[" + item.basis.toUpperCase().replace("_", " ") + "] " + item.value + (item.reasons && item.reasons.length ? "\n  Reasons: " + item.reasons.join(" ") : ""); }
    function list(title, items) { return title.toUpperCase() + "\n" + "-".repeat(title.length) + "\n" + (items.length ? items.map(function (item) { return "- " + (typeof item === "string" ? item : show(item)); }).join("\n") : "- None supplied or identified automatically."); }
    return [
      "LANG SYSTEMS INTERNAL PROJECT BRIEF", CLASSIFICATION, NOTICE,
      "Submission identifier: " + brief.metadata.submissionIdentifier,
      "Submission date: " + brief.metadata.submissionDate,
      "Internal status: " + brief.internalStatus,
      list("Customer details", ["Name: " + show(brief.customerDetails.name), "Email address: " + show(brief.customerDetails.emailAddress), "Phone number: " + show(brief.customerDetails.phoneNumber)]),
      list("Business details", ["Name: " + show(brief.businessDetails.name), "Description: " + show(brief.businessDetails.description)]),
      list("Concise opportunity summary", [brief.opportunitySummary]),
      list("Customer problem", [brief.customerProblem]), list("Current process", [brief.currentProcess]),
      list("Desired outcome", [brief.desiredOutcome]), list("Essential first-release scope", [brief.essentialFirstReleaseScope]),
      list("Later requirements", brief.laterRequirements), list("Requested timeframe", [brief.requestedTimeframe]),
      list("Budget indication", [brief.budgetIndication]), list("Recommended delivery model and reasons", [brief.recommendedDeliveryModel]),
      list("Potential for reuse as a Lang Systems product", [brief.reusePotential]),
      list("Potential intellectual-property considerations", brief.intellectualPropertyConsiderations),
      list("Major technical risks", brief.majorTechnicalRisks), list("Major commercial risks", brief.majorCommercialRisks),
      list("Important assumptions", brief.importantAssumptions), list("Missing information", brief.missingInformation),
      list("Contradictory information", brief.contradictoryInformation), list("Recommended clarification questions", brief.recommendedClarificationQuestions),
      list("Estimated complexity category", [brief.estimatedComplexity]),
      list("Readiness for estimation", ["Status: " + brief.readiness.estimation.status + ". " + brief.readiness.estimation.reasons.join(" ")]),
      list("Readiness for scope approval", ["Status: " + brief.readiness.scopeApproval.status + ". " + brief.readiness.scopeApproval.reasons.join(" ")]),
      list("Readiness for development", ["Status: " + brief.readiness.development.status + ". " + brief.readiness.development.reasons.join(" ")]),
      list("Suggested next action", [brief.suggestedNextAction]),
      "MANUAL REVIEW REQUIRED\n----------------------\nNo customer communication, scope approval, commercial commitment or development work may be initiated automatically from this brief."
    ].join("\n\n");
  }

  return Object.freeze({
    SCHEMA_VERSION: SCHEMA_VERSION, TEMPLATE_VERSION: TEMPLATE_VERSION, CLASSIFICATION: CLASSIFICATION,
    NOTICE: NOTICE, INTERNAL_STATUSES: INTERNAL_STATUSES.slice(), InternalProjectBriefError: InternalProjectBriefError,
    buildBrief: buildBrief, validateBrief: validateBrief, renderBrief: renderBrief
  });
});
