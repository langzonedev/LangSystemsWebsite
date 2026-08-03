(function (root, factory) {
  "use strict";

  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LangSystemsIntakeModel = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  var SCHEMA_VERSION = "3.0.0";
  var TEMPLATE_VERSION = "1.0.0";
  var SUBMISSION_STATUSES = ["draft", "submitted", "received", "under_review", "awaiting_clarification", "qualified", "declined", "archived"];
  var INTERPRETATION_STATUSES = ["not_started", "pending", "in_progress", "complete", "needs_clarification", "failed"];
  var DELIVERY_STATUSES = ["not_sent", "pending", "sent", "delivered", "failed"];
  var REVIEW_STATUSES = ["not_started", "pending", "in_progress", "complete"];
  var ATTACHMENT_STATUSES = ["pending", "accepted", "rejected", "malware_detected", "scan_failed"];
  var CONTACT_METHODS = ["email", "phone", "either"];
  var MAX_TEXT = 10000;
  var MAX_SHORT_TEXT = 300;
  var MAX_ATTACHMENTS = 10;
  var MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
  var ALLOWED_ATTACHMENT_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "csv", "png", "jpg", "jpeg", "txt"];
  var ALLOWED_ATTACHMENT_TYPES = [
    "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv", "text/plain", "image/png", "image/jpeg"
  ];

  function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object || {}, key);
  }

  function text(value, maximum) {
    if (value === undefined || value === null) return null;
    var normalised = String(value).replace(/\r\n?/g, "\n").trim();
    if (!normalised) return null;
    return normalised.slice(0, maximum || MAX_TEXT);
  }

  function list(value, maximumItems) {
    var values = Array.isArray(value) ? value : (text(value) ? String(value).split(/\s*[,;]\s*/) : []);
    var seen = {};
    return values.map(function (item) { return text(item, MAX_SHORT_TEXT); }).filter(function (item) {
      var key;
      if (!item) return false;
      key = item.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).slice(0, maximumItems || 50);
  }

  function enumValue(value, allowed, fallback) {
    var candidate = text(value, 80);
    return candidate && allowed.indexOf(candidate) !== -1 ? candidate : fallback;
  }

  function isoDateTime(value, fallback) {
    var candidate = text(value, 40);
    var match = candidate && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/.exec(candidate);
    var date = match ? new Date(Date.UTC(
      Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]),
      Number(match[5]), Number(match[6]), Number(((match[7] || "0") + "00").slice(0, 3))
    )) : null;
    if (!date || isNaN(date.getTime()) || date.getUTCFullYear() !== Number(match[1]) ||
      date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[3]) ||
      date.getUTCHours() !== Number(match[4]) || date.getUTCMinutes() !== Number(match[5]) ||
      date.getUTCSeconds() !== Number(match[6])) return fallback;
    return date.toISOString();
  }

  function sourcePage(value) {
    var candidate = text(value, 500);
    var absolute;
    if (!candidate) return null;
    absolute = /^https?:\/\/[^/]+(\/[^?#]*)?/i.exec(candidate);
    if (absolute) candidate = absolute[1] || "/";
    candidate = candidate.split(/[?#]/)[0].slice(0, 300);
    return /^\/[A-Za-z0-9._~!$&'()*+,;=:@%\/-]*$/.test(candidate) ? candidate : null;
  }

  function identifier(value, fallback) {
    var candidate = text(value, 120);
    return candidate && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(candidate) ? candidate : fallback;
  }

  function generatedId(now) {
    var stamp = now.replace(/[-:TZ.]/g, "").slice(0, 17);
    var random;
    var bytes;
    var index;
    if (root && root.crypto && typeof root.crypto.getRandomValues === "function" && typeof Uint8Array !== "undefined") {
      bytes = new Uint8Array(8);
      root.crypto.getRandomValues(bytes);
      random = "";
      for (index = 0; index < bytes.length; index += 1) random += ("0" + bytes[index].toString(16)).slice(-2);
    } else {
      random = Math.floor(Math.random() * 0x100000000).toString(16) + Math.floor(Math.random() * 0x100000000).toString(16);
      while (random.length < 16) random = "0" + random;
      random = random.slice(0, 16);
    }
    return "LS-" + stamp + "-" + random;
  }

  function normaliseAttachment(item) {
    item = item || {};
    return {
      attachmentId: identifier(item.attachmentId, null),
      originalFilename: text(item.originalFilename, 255),
      storedFilename: identifier(item.storedFilename, null),
      mimeType: text(item.mimeType, 150),
      sizeBytes: typeof item.sizeBytes === "number" && isFinite(item.sizeBytes) ? Math.floor(item.sizeBytes) : null,
      storageLocation: text(item.storageLocation, 500),
      validationStatus: enumValue(item.validationStatus, ATTACHMENT_STATUSES, "pending")
    };
  }

  function answersFromFlat(raw) {
    return {
      customer: {
        name: raw.contact_name,
        businessName: raw.business_name,
        emailAddress: raw.email,
        phoneNumber: raw.phone,
        preferredContactMethod: raw.preferred_contact_method,
        industry: raw.industry_type,
        businessLocation: raw.business_location
      },
      currentProcess: {
        businessDescription: raw.business_description,
        description: raw.current_process,
        currentTools: raw.current_methods,
        currentUsers: raw.current_process_people,
        frequency: raw.process_frequency,
        frustrations: raw.problem_impact,
        strengthsToPreserve: raw.current_process_strengths
      },
      desiredOutcome: {
        problemStatement: raw.problem,
        outcome: raw.desired_outcome,
        intendedUsers: raw.users,
        approximateUserCount: raw.user_count,
        deviceRequirements: raw.devices,
        locationRequirements: raw.usage_locations,
        offlineRequirements: raw.offline_access,
        existingSystemConnections: raw.existing_systems,
        existingDataSources: raw.data_needs,
        privacySecurityConsiderations: raw.privacy_security_approvals
      },
      scope: {
        essentialFirstRelease: raw.first_release,
        usefulLater: raw.optional_requirements,
        futureIdeas: raw.future_ideas,
        explicitExclusions: raw.excluded_functionality,
        completionCriteria: raw.acceptance_criteria
      },
      commercial: {
        deliveryModelPreference: raw.delivery_model,
        ownershipPreference: raw.ownership_preference,
        broaderMarketUsefulness: raw.broader_market_usefulness,
        approximateBudgetRange: raw.budget,
        requiredDate: raw.required_completion_date,
        timelineFlexibility: raw.timing,
        timelineContext: raw.timing_context,
        dayToDayOwner: raw.day_to_day_owner,
        ongoingSupportPreference: raw.ongoing_support,
        successMeasures: raw.success_measure
      },
      additionalContext: {
        constraints: raw.constraints,
        additionalNotes: raw.additional_notes,
        privacyConsent: raw.privacy_consent === true || raw.privacy_consent === "Agreed"
      }
    };
  }

  function normaliseAnswers(raw) {
    var source = raw.customerAnswers || answersFromFlat(raw);
    var customer = source.customer || {};
    var current = source.currentProcess || {};
    var desired = source.desiredOutcome || {};
    var scope = source.scope || {};
    var commercial = source.commercial || {};
    var additional = source.additionalContext || {};
    return {
      customer: {
        name: text(customer.name, MAX_SHORT_TEXT),
        businessName: text(customer.businessName, MAX_SHORT_TEXT),
        emailAddress: text(customer.emailAddress, 320),
        phoneNumber: text(customer.phoneNumber, 50),
        preferredContactMethod: enumValue(customer.preferredContactMethod, CONTACT_METHODS, null),
        industry: text(customer.industry, MAX_SHORT_TEXT),
        businessLocation: text(customer.businessLocation, MAX_SHORT_TEXT)
      },
      currentProcess: {
        businessDescription: text(current.businessDescription),
        description: text(current.description),
        currentTools: list(current.currentTools),
        currentUsers: text(current.currentUsers),
        frequency: text(current.frequency, MAX_SHORT_TEXT),
        frustrations: text(current.frustrations),
        strengthsToPreserve: text(current.strengthsToPreserve)
      },
      desiredOutcome: {
        problemStatement: text(desired.problemStatement),
        outcome: text(desired.outcome),
        intendedUsers: text(desired.intendedUsers),
        approximateUserCount: text(desired.approximateUserCount, MAX_SHORT_TEXT),
        deviceRequirements: list(desired.deviceRequirements),
        locationRequirements: list(desired.locationRequirements),
        offlineRequirements: text(desired.offlineRequirements, MAX_SHORT_TEXT),
        existingSystemConnections: text(desired.existingSystemConnections),
        existingDataSources: text(desired.existingDataSources),
        privacySecurityConsiderations: text(desired.privacySecurityConsiderations)
      },
      scope: {
        essentialFirstRelease: text(scope.essentialFirstRelease),
        usefulLater: text(scope.usefulLater),
        futureIdeas: text(scope.futureIdeas),
        explicitExclusions: text(scope.explicitExclusions),
        completionCriteria: text(scope.completionCriteria)
      },
      commercial: {
        deliveryModelPreference: text(commercial.deliveryModelPreference, MAX_SHORT_TEXT),
        ownershipPreference: text(commercial.ownershipPreference, MAX_SHORT_TEXT),
        broaderMarketUsefulness: text(commercial.broaderMarketUsefulness, MAX_SHORT_TEXT),
        approximateBudgetRange: text(commercial.approximateBudgetRange, MAX_SHORT_TEXT),
        requiredDate: text(commercial.requiredDate, 10),
        timelineFlexibility: text(commercial.timelineFlexibility, MAX_SHORT_TEXT),
        timelineContext: text(commercial.timelineContext),
        dayToDayOwner: text(commercial.dayToDayOwner, MAX_SHORT_TEXT),
        ongoingSupportPreference: text(commercial.ongoingSupportPreference, MAX_SHORT_TEXT),
        successMeasures: text(commercial.successMeasures)
      },
      additionalContext: {
        constraints: text(additional.constraints),
        additionalNotes: text(additional.additionalNotes),
        privacyConsent: source.additionalContext ? additional.privacyConsent === true : raw.privacy_consent === true || raw.privacy_consent === "Agreed"
      }
    };
  }

  function createSubmission(raw, options) {
    raw = raw || {};
    options = options || {};
    var metadata = raw.submissionMetadata || {};
    var processing = raw.processing || {};
    var references = processing.generatedDocumentReferences || {};
    var now = isoDateTime(options.now || metadata.submittedAt, new Date().toISOString());
    var attachments = Array.isArray(raw.attachments) ? raw.attachments : [];
    return {
      submissionMetadata: {
        submissionId: identifier(options.submissionId || metadata.submissionId, generatedId(now)),
        submittedAt: isoDateTime(metadata.submittedAt, now),
        updatedAt: isoDateTime(metadata.updatedAt, now),
        status: enumValue(metadata.status, SUBMISSION_STATUSES, "submitted"),
        schemaVersion: SCHEMA_VERSION,
        templateVersion: text(metadata.templateVersion || options.templateVersion, 40) || TEMPLATE_VERSION,
        source: {
          page: sourcePage((metadata.source || {}).page || options.sourcePage),
          campaign: identifier((metadata.source || {}).campaign || options.campaign, null)
        }
      },
      customerAnswers: normaliseAnswers(raw),
      attachments: attachments.map(normaliseAttachment),
      processing: {
        interpretationStatus: enumValue(processing.interpretationStatus, INTERPRETATION_STATUSES, "not_started"),
        generatedDocumentReferences: {
          customerSummary: identifier(references.customerSummary, null),
          technicalSpecification: identifier(references.technicalSpecification, null),
          internalBrief: identifier(references.internalBrief, null)
        },
        clarificationQuestions: list(processing.clarificationQuestions),
        emailDeliveryStatus: enumValue(processing.emailDeliveryStatus, DELIVERY_STATUSES, "pending"),
        manualReviewStatus: enumValue(processing.manualReviewStatus, REVIEW_STATUSES, "not_started"),
        internalNotes: list(processing.internalNotes)
      }
    };
  }

  function addError(errors, path, code, message) {
    errors.push({ path: path, code: code, message: message });
  }

  function plainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;
    var prototype = Object.getPrototypeOf ? Object.getPrototypeOf(value) : Object.prototype;
    return prototype === Object.prototype || prototype === null;
  }

  function checkText(errors, object, key, path, maximum, allowNull) {
    var value = object && object[key];
    if (value === null && allowNull) return;
    if (value !== null && value !== undefined && typeof value !== "string") {
      addError(errors, path, "invalid_type", "This answer must be text.");
    } else if (typeof value === "string" && value.length > maximum) {
      addError(errors, path, "too_long", "This answer is longer than the allowed limit.");
    }
  }

  function checkKeys(errors, object, path, allowed) {
    var key;
    if (!plainObject(object)) return;
    for (key in object) if (own(object, key) && allowed.indexOf(key) === -1) {
      addError(errors, path + "." + key, "unexpected_field", "This field is not part of the supported submission format.");
    }
  }

  function checkList(errors, value, path, maximumItems) {
    if (!Array.isArray(value)) return;
    if (value.length > maximumItems) addError(errors, path, "too_many", "This list contains too many items.");
    value.forEach(function (item, index) {
      if (typeof item !== "string") addError(errors, path + "[" + index + "]", "invalid_type", "Each list item must be text.");
      else if (item.length > MAX_SHORT_TEXT) addError(errors, path + "[" + index + "]", "too_long", "This list item is longer than the allowed limit.");
    });
  }

  function validDate(value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    var date;
    if (!match) return false;
    date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
  }

  function validateSubmission(value) {
    var errors = [];
    if (!plainObject(value)) return { valid: false, errors: [{ path: "$", code: "invalid_type", message: "The submission must be an object." }] };
    var metadata = value && value.submissionMetadata;
    var answers = value && value.customerAnswers;
    var customer = answers && answers.customer;
    var current = answers && answers.currentProcess;
    var desired = answers && answers.desiredOutcome;
    var scope = answers && answers.scope;
    var commercial = answers && answers.commercial;
    var processing = value && value.processing;
    [
      [customer, "name", "customerAnswers.customer.name", MAX_SHORT_TEXT, false],
      [customer, "businessName", "customerAnswers.customer.businessName", MAX_SHORT_TEXT, false],
      [customer, "emailAddress", "customerAnswers.customer.emailAddress", 320, false],
      [customer, "phoneNumber", "customerAnswers.customer.phoneNumber", 50, true],
      [current, "businessDescription", "customerAnswers.currentProcess.businessDescription", MAX_TEXT, false],
      [current, "description", "customerAnswers.currentProcess.description", MAX_TEXT, false],
      [current, "frustrations", "customerAnswers.currentProcess.frustrations", MAX_TEXT, false],
      [desired, "problemStatement", "customerAnswers.desiredOutcome.problemStatement", MAX_TEXT, false],
      [desired, "outcome", "customerAnswers.desiredOutcome.outcome", MAX_TEXT, false],
      [desired, "intendedUsers", "customerAnswers.desiredOutcome.intendedUsers", MAX_TEXT, false],
      [scope, "essentialFirstRelease", "customerAnswers.scope.essentialFirstRelease", MAX_TEXT, false],
      [scope, "completionCriteria", "customerAnswers.scope.completionCriteria", MAX_TEXT, false],
      [commercial, "deliveryModelPreference", "customerAnswers.commercial.deliveryModelPreference", MAX_SHORT_TEXT, false],
      [commercial, "approximateBudgetRange", "customerAnswers.commercial.approximateBudgetRange", MAX_SHORT_TEXT, false],
      [commercial, "timelineFlexibility", "customerAnswers.commercial.timelineFlexibility", MAX_SHORT_TEXT, false],
      [customer, "industry", "customerAnswers.customer.industry", MAX_SHORT_TEXT, true],
      [customer, "businessLocation", "customerAnswers.customer.businessLocation", MAX_SHORT_TEXT, true],
      [current, "currentUsers", "customerAnswers.currentProcess.currentUsers", MAX_TEXT, true],
      [current, "frequency", "customerAnswers.currentProcess.frequency", MAX_SHORT_TEXT, true],
      [current, "strengthsToPreserve", "customerAnswers.currentProcess.strengthsToPreserve", MAX_TEXT, true],
      [desired, "approximateUserCount", "customerAnswers.desiredOutcome.approximateUserCount", MAX_SHORT_TEXT, true],
      [desired, "offlineRequirements", "customerAnswers.desiredOutcome.offlineRequirements", MAX_SHORT_TEXT, true],
      [desired, "existingSystemConnections", "customerAnswers.desiredOutcome.existingSystemConnections", MAX_TEXT, true],
      [desired, "existingDataSources", "customerAnswers.desiredOutcome.existingDataSources", MAX_TEXT, true],
      [desired, "privacySecurityConsiderations", "customerAnswers.desiredOutcome.privacySecurityConsiderations", MAX_TEXT, true],
      [scope, "usefulLater", "customerAnswers.scope.usefulLater", MAX_TEXT, true],
      [scope, "futureIdeas", "customerAnswers.scope.futureIdeas", MAX_TEXT, true],
      [scope, "explicitExclusions", "customerAnswers.scope.explicitExclusions", MAX_TEXT, true],
      [commercial, "ownershipPreference", "customerAnswers.commercial.ownershipPreference", MAX_SHORT_TEXT, true],
      [commercial, "broaderMarketUsefulness", "customerAnswers.commercial.broaderMarketUsefulness", MAX_SHORT_TEXT, true],
      [commercial, "timelineContext", "customerAnswers.commercial.timelineContext", MAX_TEXT, true],
      [commercial, "dayToDayOwner", "customerAnswers.commercial.dayToDayOwner", MAX_SHORT_TEXT, true],
      [commercial, "ongoingSupportPreference", "customerAnswers.commercial.ongoingSupportPreference", MAX_SHORT_TEXT, true],
      [commercial, "successMeasures", "customerAnswers.commercial.successMeasures", MAX_TEXT, true],
      [answers && answers.additionalContext, "constraints", "customerAnswers.additionalContext.constraints", MAX_TEXT, true],
      [answers && answers.additionalContext, "additionalNotes", "customerAnswers.additionalContext.additionalNotes", MAX_TEXT, true]
    ].forEach(function (entry) { checkText(errors, entry[0], entry[1], entry[2], entry[3], entry[4]); });
    [
      [metadata, "submissionMetadata"], [answers, "customerAnswers"], [customer, "customerAnswers.customer"],
      [current, "customerAnswers.currentProcess"], [desired, "customerAnswers.desiredOutcome"],
      [scope, "customerAnswers.scope"], [commercial, "customerAnswers.commercial"],
      [answers && answers.additionalContext, "customerAnswers.additionalContext"], [processing, "processing"]
    ].forEach(function (entry) {
      if (entry[0] !== undefined && entry[0] !== null && !plainObject(entry[0])) addError(errors, entry[1], "invalid_type", "This part of the submission must be an object.");
    });
    checkKeys(errors, value, "$", ["submissionMetadata", "customerAnswers", "attachments", "processing"]);
    checkKeys(errors, metadata, "submissionMetadata", ["submissionId", "submittedAt", "updatedAt", "status", "schemaVersion", "templateVersion", "source"]);
    checkKeys(errors, metadata && metadata.source, "submissionMetadata.source", ["page", "campaign"]);
    checkKeys(errors, answers, "customerAnswers", ["customer", "currentProcess", "desiredOutcome", "scope", "commercial", "additionalContext"]);
    checkKeys(errors, customer, "customerAnswers.customer", ["name", "businessName", "emailAddress", "phoneNumber", "preferredContactMethod", "industry", "businessLocation"]);
    checkKeys(errors, current, "customerAnswers.currentProcess", ["businessDescription", "description", "currentTools", "currentUsers", "frequency", "frustrations", "strengthsToPreserve"]);
    checkKeys(errors, desired, "customerAnswers.desiredOutcome", ["problemStatement", "outcome", "intendedUsers", "approximateUserCount", "deviceRequirements", "locationRequirements", "offlineRequirements", "existingSystemConnections", "existingDataSources", "privacySecurityConsiderations"]);
    checkKeys(errors, scope, "customerAnswers.scope", ["essentialFirstRelease", "usefulLater", "futureIdeas", "explicitExclusions", "completionCriteria"]);
    checkKeys(errors, commercial, "customerAnswers.commercial", ["deliveryModelPreference", "ownershipPreference", "broaderMarketUsefulness", "approximateBudgetRange", "requiredDate", "timelineFlexibility", "timelineContext", "dayToDayOwner", "ongoingSupportPreference", "successMeasures"]);
    checkKeys(errors, answers && answers.additionalContext, "customerAnswers.additionalContext", ["constraints", "additionalNotes", "privacyConsent"]);
    checkKeys(errors, processing, "processing", ["interpretationStatus", "generatedDocumentReferences", "clarificationQuestions", "emailDeliveryStatus", "manualReviewStatus", "internalNotes"]);
    checkKeys(errors, processing && processing.generatedDocumentReferences, "processing.generatedDocumentReferences", ["customerSummary", "technicalSpecification", "internalBrief"]);
    var required = [
      [customer, "name", "customerAnswers.customer.name"],
      [customer, "businessName", "customerAnswers.customer.businessName"],
      [customer, "emailAddress", "customerAnswers.customer.emailAddress"],
      [current, "businessDescription", "customerAnswers.currentProcess.businessDescription"],
      [current, "description", "customerAnswers.currentProcess.description"],
      [current, "frustrations", "customerAnswers.currentProcess.frustrations"],
      [desired, "problemStatement", "customerAnswers.desiredOutcome.problemStatement"],
      [desired, "outcome", "customerAnswers.desiredOutcome.outcome"],
      [desired, "intendedUsers", "customerAnswers.desiredOutcome.intendedUsers"],
      [scope, "essentialFirstRelease", "customerAnswers.scope.essentialFirstRelease"],
      [scope, "completionCriteria", "customerAnswers.scope.completionCriteria"],
      [commercial, "deliveryModelPreference", "customerAnswers.commercial.deliveryModelPreference"],
      [commercial, "approximateBudgetRange", "customerAnswers.commercial.approximateBudgetRange"],
      [commercial, "timelineFlexibility", "customerAnswers.commercial.timelineFlexibility"]
    ];
    if (!metadata) addError(errors, "submissionMetadata", "required", "Submission metadata is required.");
    if (!answers) addError(errors, "customerAnswers", "required", "Customer answers are required.");
    required.forEach(function (entry) {
      if (!entry[0] || !text(entry[0][entry[1]])) addError(errors, entry[2], "required", "A required customer answer is missing.");
    });
    if (metadata) {
      if (metadata.schemaVersion !== SCHEMA_VERSION) addError(errors, "submissionMetadata.schemaVersion", "unsupported_version", "The submission schema version is not supported.");
      if (!identifier(metadata.submissionId, null)) addError(errors, "submissionMetadata.submissionId", "invalid", "The submission identifier is invalid.");
      if (!isoDateTime(metadata.submittedAt, null)) addError(errors, "submissionMetadata.submittedAt", "invalid", "The submission date is invalid.");
      if (!isoDateTime(metadata.updatedAt, null)) addError(errors, "submissionMetadata.updatedAt", "invalid", "The updated date is invalid.");
      if (isoDateTime(metadata.submittedAt, null) && isoDateTime(metadata.updatedAt, null) && isoDateTime(metadata.updatedAt, null) < isoDateTime(metadata.submittedAt, null)) addError(errors, "submissionMetadata.updatedAt", "invalid_order", "The updated date cannot be earlier than the submission date.");
      if (SUBMISSION_STATUSES.indexOf(metadata.status) === -1) addError(errors, "submissionMetadata.status", "invalid_choice", "The submission status is invalid.");
      if (!text(metadata.templateVersion, 40)) addError(errors, "submissionMetadata.templateVersion", "required", "The template version is required.");
      if (!metadata.source || typeof metadata.source !== "object") addError(errors, "submissionMetadata.source", "invalid_type", "Submission source must be an object.");
      else {
        if (metadata.source.page !== null && (typeof metadata.source.page !== "string" || !/^\/[A-Za-z0-9._~!$&'()*+,;=:@%\/-]*$/.test(metadata.source.page))) addError(errors, "submissionMetadata.source.page", "invalid", "The source page must be a path without query or fragment data.");
        if (metadata.source.campaign !== null && !identifier(metadata.source.campaign, null)) addError(errors, "submissionMetadata.source.campaign", "invalid", "The source campaign identifier is invalid.");
      }
    }
    if (customer && customer.emailAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.emailAddress)) addError(errors, "customerAnswers.customer.emailAddress", "invalid_email", "The email address is invalid.");
    if (!answers || !answers.additionalContext || answers.additionalContext.privacyConsent !== true) addError(errors, "customerAnswers.additionalContext.privacyConsent", "required_consent", "Privacy consent is required.");
    if (customer && customer.preferredContactMethod !== null && CONTACT_METHODS.indexOf(customer.preferredContactMethod) === -1) addError(errors, "customerAnswers.customer.preferredContactMethod", "invalid_choice", "The preferred contact method is invalid.");
    if (customer && customer.preferredContactMethod === "phone" && !customer.phoneNumber) addError(errors, "customerAnswers.customer.phoneNumber", "required", "A phone number is required when phone is preferred.");
    if (commercial && commercial.requiredDate && !validDate(commercial.requiredDate)) addError(errors, "customerAnswers.commercial.requiredDate", "invalid_date", "The required date must be a real date using YYYY-MM-DD.");
    [[current, "currentTools", "customerAnswers.currentProcess.currentTools"], [desired, "deviceRequirements", "customerAnswers.desiredOutcome.deviceRequirements"], [desired, "locationRequirements", "customerAnswers.desiredOutcome.locationRequirements"]].forEach(function (entry) {
      if (!entry[0] || !Array.isArray(entry[0][entry[1]])) addError(errors, entry[2], "invalid_type", "This answer must be an array.");
      else checkList(errors, entry[0][entry[1]], entry[2], 50);
    });
    if (!Array.isArray(value && value.attachments)) addError(errors, "attachments", "invalid_type", "Attachments must be an array.");
    else value.attachments.forEach(function (attachment, index) {
      var prefix = "attachments[" + index + "]";
      if (!plainObject(attachment)) {
        addError(errors, prefix, "invalid_type", "Each attachment must be an object.");
        return;
      }
      checkKeys(errors, attachment, prefix, ["attachmentId", "originalFilename", "storedFilename", "mimeType", "sizeBytes", "storageLocation", "validationStatus"]);
      if (!identifier(attachment.attachmentId, null)) addError(errors, prefix + ".attachmentId", "invalid", "A valid attachment identifier is required.");
      if (typeof attachment.originalFilename !== "string" || !attachment.originalFilename || attachment.originalFilename.length > 255) addError(errors, prefix + ".originalFilename", "invalid", "A valid original filename is required.");
      if (!identifier(attachment.storedFilename, null)) addError(errors, prefix + ".storedFilename", "invalid", "A valid safe stored filename is required.");
      if (typeof attachment.mimeType !== "string" || !attachment.mimeType || attachment.mimeType.length > 150) addError(errors, prefix + ".mimeType", "required", "A valid file type is required.");
      else if (ALLOWED_ATTACHMENT_TYPES.indexOf(String(attachment.mimeType).toLowerCase()) === -1) addError(errors, prefix + ".mimeType", "unsupported_type", "The attachment type is not supported.");
      if (typeof attachment.originalFilename === "string" && attachment.originalFilename && ALLOWED_ATTACHMENT_EXTENSIONS.indexOf(attachment.originalFilename.split(".").pop().toLowerCase()) === -1) addError(errors, prefix + ".originalFilename", "unsupported_type", "The attachment type is not supported.");
      if (typeof attachment.sizeBytes !== "number" || !isFinite(attachment.sizeBytes) || Math.floor(attachment.sizeBytes) !== attachment.sizeBytes || attachment.sizeBytes < 1 || attachment.sizeBytes > MAX_ATTACHMENT_BYTES) addError(errors, prefix + ".sizeBytes", "invalid_size", "The attachment size is outside the allowed range.");
      if (typeof attachment.storageLocation !== "string" || !attachment.storageLocation || attachment.storageLocation.length > 500) addError(errors, prefix + ".storageLocation", "required", "A valid storage location is required.");
      else if (/^https?:\/\//i.test(attachment.storageLocation)) addError(errors, prefix + ".storageLocation", "public_location", "The storage location must not be a public URL.");
      if (ATTACHMENT_STATUSES.indexOf(attachment.validationStatus) === -1) addError(errors, prefix + ".validationStatus", "invalid_choice", "The attachment validation status is invalid.");
    });
    if (Array.isArray(value && value.attachments) && value.attachments.length > MAX_ATTACHMENTS) addError(errors, "attachments", "too_many", "Too many attachments were supplied.");
    if (!processing) addError(errors, "processing", "required", "Processing information is required.");
    else {
      if (INTERPRETATION_STATUSES.indexOf(processing.interpretationStatus) === -1) addError(errors, "processing.interpretationStatus", "invalid_choice", "The interpretation status is invalid.");
      if (DELIVERY_STATUSES.indexOf(processing.emailDeliveryStatus) === -1) addError(errors, "processing.emailDeliveryStatus", "invalid_choice", "The email delivery status is invalid.");
      if (REVIEW_STATUSES.indexOf(processing.manualReviewStatus) === -1) addError(errors, "processing.manualReviewStatus", "invalid_choice", "The manual review status is invalid.");
      if (!Array.isArray(processing.clarificationQuestions)) addError(errors, "processing.clarificationQuestions", "invalid_type", "Clarification questions must be an array.");
      else checkList(errors, processing.clarificationQuestions, "processing.clarificationQuestions", 50);
      if (!Array.isArray(processing.internalNotes)) addError(errors, "processing.internalNotes", "invalid_type", "Internal notes must be an array.");
      else checkList(errors, processing.internalNotes, "processing.internalNotes", 50);
      if (!processing.generatedDocumentReferences || typeof processing.generatedDocumentReferences !== "object") addError(errors, "processing.generatedDocumentReferences", "invalid_type", "Generated document references must be an object.");
      else ["customerSummary", "technicalSpecification", "internalBrief"].forEach(function (key) {
        if (processing.generatedDocumentReferences[key] !== null && !identifier(processing.generatedDocumentReferences[key], null)) addError(errors, "processing.generatedDocumentReferences." + key, "invalid", "The document reference is invalid.");
      });
    }
    return { valid: errors.length === 0, errors: errors };
  }

  function serialiseSubmission(value) {
    var result = validateSubmission(value);
    if (!result.valid) {
      var error = new Error("The project submission is invalid.");
      error.name = "IntakeModelValidationError";
      error.validationErrors = result.errors;
      throw error;
    }
    return JSON.stringify(value, null, 2);
  }

  function parseSubmission(json) {
    var value = typeof json === "string" ? JSON.parse(json) : json;
    var result = validateSubmission(value);
    if (!result.valid) {
      var error = new Error("The project submission is invalid.");
      error.name = "IntakeModelValidationError";
      error.validationErrors = result.errors;
      throw error;
    }
    return value;
  }

  function upgradeLegacyV1(legacy, options) {
    legacy = legacy || {};
    return createSubmission({
      submissionMetadata: {
        submissionId: legacy.projectReference,
        submittedAt: options && options.submittedAt,
        updatedAt: options && options.submittedAt,
        status: "submitted",
        templateVersion: "legacy-1.0"
      },
      customerAnswers: {
        customer: {
          name: (legacy.contact || {}).name,
          businessName: (legacy.contact || {}).organisation,
          emailAddress: (legacy.contact || {}).email,
          phoneNumber: (legacy.contact || {}).phone,
          preferredContactMethod: null
        },
        currentProcess: {
          businessDescription: (legacy.discovery || {}).businessDescription,
          description: (legacy.discovery || {}).currentProcess,
          frustrations: (legacy.discovery || {}).impact
        },
        desiredOutcome: {
          problemStatement: (legacy.discovery || {}).problem,
          outcome: (legacy.discovery || {}).desiredOutcome,
          intendedUsers: (legacy.discovery || {}).users,
          existingSystemConnections: (legacy.discovery || {}).existingSystems,
          existingDataSources: (legacy.discovery || {}).dataNeeds,
          privacySecurityConsiderations: legacy.constraints
        },
        scope: {
          essentialFirstRelease: (legacy.scope || {}).includedFirstRelease,
          usefulLater: (legacy.scope || {}).optional,
          futureIdeas: (legacy.scope || {}).future,
          explicitExclusions: (legacy.scope || {}).excluded,
          completionCriteria: (legacy.scope || {}).acceptanceCriteria
        },
        commercial: {
          deliveryModelPreference: (legacy.commercial || {}).deliveryModel,
          approximateBudgetRange: (legacy.commercial || {}).budget,
          timelineFlexibility: (legacy.commercial || {}).timing,
          timelineContext: (legacy.commercial || {}).timingContext,
          dayToDayOwner: (legacy.commercial || {}).dayToDayOwner,
          ongoingSupportPreference: (legacy.commercial || {}).ongoingSupport
        },
        additionalContext: {
          constraints: legacy.constraints,
          additionalNotes: legacy.additionalNotes,
          privacyConsent: true
        }
      }
    }, options);
  }

  return Object.freeze({
    SCHEMA_VERSION: SCHEMA_VERSION,
    TEMPLATE_VERSION: TEMPLATE_VERSION,
    limits: Object.freeze({ maximumAttachments: MAX_ATTACHMENTS, maximumAttachmentBytes: MAX_ATTACHMENT_BYTES, allowedAttachmentExtensions: ALLOWED_ATTACHMENT_EXTENSIONS.slice(0), allowedAttachmentTypes: ALLOWED_ATTACHMENT_TYPES.slice(0) }),
    newSubmissionId: function () { return generatedId(new Date().toISOString()); },
    createSubmission: createSubmission,
    validateSubmission: validateSubmission,
    serialiseSubmission: serialiseSubmission,
    parseSubmission: parseSubmission,
    upgradeLegacyV1: upgradeLegacyV1
  });
}));
