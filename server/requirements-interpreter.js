"use strict";

const fs = require("fs");
const path = require("path");
const IntakeModel = require("../intake-model.js");
const { validateRequestBody } = require("./intake-validation.js");
const responseSchema = require("./requirements-interpretation.schema.json");

const SCHEMA_VERSION = "1.0.0";
const TEMPLATE_VERSION = "1.0.0";
const NOTICE = "Discovery interpretation for manual Lang Systems review; not customer-approved scope, a quote, or a delivery commitment.";
const instructionTemplate = fs.readFileSync(path.join(__dirname, "requirements-interpretation-prompt.md"), "utf8");
const SECTION_NAMES = [
  "businessContext", "problemStatement", "currentProcess", "currentDifficulties", "desiredOutcome",
  "intendedUsers", "essentialFirstReleaseRequirements", "usefulLaterRequirements", "futureIdeas",
  "explicitExclusions", "dataRequirements", "existingDataSources", "integrationRequirements",
  "deviceAndPlatformConsiderations", "offlineRequirements", "securityAndPrivacyConsiderations",
  "assumptions", "constraints", "risks", "openQuestions", "proposedAcceptanceCriteria",
  "recommendedCommercialModel", "recommendedNextStep"
];
const STATUSES = ["confirmed", "assumption", "recommendation", "unknown"];

class RequirementsInterpretationError extends Error {
  constructor(message, code, cause) {
    super(message, { cause });
    this.name = "RequirementsInterpretationError";
    this.code = code;
  }
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function confirmed(statement, sourcePath) {
  return [{ statement, status: "confirmed", sourcePaths: [sourcePath] }];
}

function unknown(statement) {
  return [{ statement, status: "unknown", sourcePaths: [] }];
}

function fromText(value, sourcePath, missingStatement) {
  return hasText(value) ? confirmed(value, sourcePath) : unknown(missingStatement);
}

function fromList(value, sourcePath, missingStatement) {
  return Array.isArray(value) && value.length
    ? value.map((item) => ({ statement: item, status: "confirmed", sourcePaths: [sourcePath] }))
    : unknown(missingStatement);
}

function question(questionText, reason, estimation, scopeAgreement, development) {
  return { question: questionText, reason, blocks: { estimation, scopeAgreement, development } };
}

function buildDeterministicSections(submission) {
  const answers = submission.customerAnswers;
  const current = answers.currentProcess;
  const desired = answers.desiredOutcome;
  const scope = answers.scope;
  const commercial = answers.commercial;
  const additional = answers.additionalContext;
  const questions = [];

  function askWhenMissing(value, text, reason, estimation, scopeAgreement, development) {
    const present = Array.isArray(value) ? value.length > 0 : hasText(value);
    if (!present) questions.push(question(text, reason, estimation, scopeAgreement, development));
  }

  askWhenMissing(scope.usefulLater, "Which capabilities would be useful after the first release?", "This helps keep immediate scope separate from later opportunities.", false, false, false);
  askWhenMissing(scope.futureIdeas, "Are there future ideas that should be kept in view without including them now?", "Recording future ideas reduces the risk of accidentally treating them as first-release scope.", false, false, false);
  askWhenMissing(scope.explicitExclusions, "What should the first release explicitly not include?", "Clear exclusions are needed to agree scope boundaries.", true, true, false);
  askWhenMissing(desired.existingDataSources, "What information will the solution need, and where is it currently kept?", "The data volume, format, quality, and ownership may affect scope and effort.", true, true, true);
  askWhenMissing(desired.existingSystemConnections, "Does the first release need to exchange information with any existing systems?", "Integration boundaries can materially affect scope, security, and estimation.", true, true, true);
  askWhenMissing(desired.deviceRequirements, "Which devices or platforms must people use for the first release?", "Supported devices must be agreed before interface and testing work begins.", true, true, true);
  askWhenMissing(desired.locationRequirements, "Where will people use the solution?", "Usage locations can affect access, connectivity, and security requirements.", false, true, true);
  askWhenMissing(desired.offlineRequirements, "Must any part work when internet access is unavailable?", "Offline operation changes data handling and delivery scope.", true, true, true);
  askWhenMissing(desired.dataStoragePreference, "Would you prefer business information to stay on your own devices or network, be stored securely online, use a mix, or should we recommend?", "Storage location affects access, offline operation, backup, security, support, and cost.", false, true, true);
  askWhenMissing(desired.privacySecurityConsiderations, "Are there privacy, access, approval, retention, or security requirements we should know about?", "These controls must be understood before handling real customer or business data.", true, true, true);
  askWhenMissing(additional.constraints, "Are there legal, operational, budget, timing, or organisational constraints beyond those already supplied?", "Known constraints may change scope or delivery planning.", false, true, true);
  askWhenMissing(additional.visualDesignPreference, "For the first version, should we use existing company branding, create a clean neutral style, help develop a visual direction, match another product, or recommend an approach?", "A lightweight visual direction helps shape a coherent, accessible interface without requiring a full design brief at enquiry stage.", false, false, false);
  if (hasText(additional.visualDesignPreference) && /existing company branding|develop a visual direction|match another product/i.test(additional.visualDesignPreference) && !hasText(additional.visualStyleNotes)) {
    questions.push(question("After project fit is confirmed, what approved brand guidance or product examples should inform the design, and who can confirm permission to use any supplied logos, fonts, images, or other assets?", "Brand assets and third-party material must not be treated as authorised merely because a visual preference was selected.", false, false, true));
  }

  const commercialStatement = hasText(commercial.deliveryModelPreference)
    ? `Review the customer's stated preference (${commercial.deliveryModelPreference}) with them and recommend a commercial model only after Lang Systems assesses the requirements.`
    : "Lang Systems should recommend a commercial model after human review and customer clarification.";

  return {
    businessContext: fromText(current.businessDescription, "customerAnswers.currentProcess.businessDescription", "The business context is unknown."),
    problemStatement: fromText(desired.problemStatement, "customerAnswers.desiredOutcome.problemStatement", "The problem statement is unknown."),
    currentProcess: fromText(current.description, "customerAnswers.currentProcess.description", "The current process is unknown."),
    currentDifficulties: fromText(current.frustrations, "customerAnswers.currentProcess.frustrations", "The current difficulties are unknown."),
    desiredOutcome: fromText(desired.outcome, "customerAnswers.desiredOutcome.outcome", "The desired outcome is unknown."),
    intendedUsers: fromText(desired.intendedUsers, "customerAnswers.desiredOutcome.intendedUsers", "The intended users are unknown."),
    essentialFirstReleaseRequirements: fromText(scope.essentialFirstRelease, "customerAnswers.scope.essentialFirstRelease", "Essential first-release requirements are unknown."),
    usefulLaterRequirements: fromText(scope.usefulLater, "customerAnswers.scope.usefulLater", "Useful later requirements have not been provided."),
    futureIdeas: fromText(scope.futureIdeas, "customerAnswers.scope.futureIdeas", "Future ideas have not been provided."),
    explicitExclusions: fromText(scope.explicitExclusions, "customerAnswers.scope.explicitExclusions", "Explicit exclusions have not been confirmed."),
    dataRequirements: [
      ...fromText(desired.existingDataSources, "customerAnswers.desiredOutcome.existingDataSources", "Data requirements are unknown."),
      ...fromText(desired.dataStoragePreference, "customerAnswers.desiredOutcome.dataStoragePreference", "Preferred information storage location is unknown.")
    ],
    existingDataSources: fromText(desired.existingDataSources, "customerAnswers.desiredOutcome.existingDataSources", "Existing data sources are unknown."),
    integrationRequirements: fromText(desired.existingSystemConnections, "customerAnswers.desiredOutcome.existingSystemConnections", "Integration requirements are unknown."),
    deviceAndPlatformConsiderations: [
      ...fromList(desired.deviceRequirements, "customerAnswers.desiredOutcome.deviceRequirements", "Required devices and platforms are unknown."),
      ...fromList(desired.locationRequirements, "customerAnswers.desiredOutcome.locationRequirements", "Usage locations are unknown.")
    ],
    offlineRequirements: fromText(desired.offlineRequirements, "customerAnswers.desiredOutcome.offlineRequirements", "Offline requirements are unknown."),
    securityAndPrivacyConsiderations: fromText(desired.privacySecurityConsiderations, "customerAnswers.desiredOutcome.privacySecurityConsiderations", "Security and privacy requirements are unknown."),
    assumptions: [{ statement: "The interpretation requires Lang Systems and customer review; no inferred item is approved scope.", status: "assumption", sourcePaths: [] }],
    constraints: [
      ...fromText(additional.constraints, "customerAnswers.additionalContext.constraints", "Additional project constraints are unknown."),
      ...fromText(additional.visualDesignPreference, "customerAnswers.additionalContext.visualDesignPreference", "The preferred visual direction is unknown."),
      ...(hasText(additional.visualStyleNotes) ? confirmed(additional.visualStyleNotes, "customerAnswers.additionalContext.visualStyleNotes") : [])
    ],
    risks: [{ statement: "Unconfirmed requirements may change scope, estimation, acceptance criteria, or delivery planning.", status: "assumption", sourcePaths: [] }],
    openQuestions: questions,
    proposedAcceptanceCriteria: fromText(scope.completionCriteria, "customerAnswers.scope.completionCriteria", "Proposed acceptance criteria are unknown."),
    recommendedCommercialModel: [{ statement: commercialStatement, status: "recommendation", sourcePaths: hasText(commercial.deliveryModelPreference) ? ["customerAnswers.commercial.deliveryModelPreference"] : [] }],
    recommendedNextStep: [{ statement: "Lang Systems should manually review the confirmed facts, assumptions, risks, and open questions with the customer before estimating or agreeing scope.", status: "recommendation", sourcePaths: [] }]
  };
}

function buildModelInput(submission) {
  const answers = submission.customerAnswers;
  return {
    customerAnswers: {
      currentProcess: answers.currentProcess,
      desiredOutcome: answers.desiredOutcome,
      scope: answers.scope,
      commercial: answers.commercial,
      additionalContext: {
        constraints: answers.additionalContext.constraints,
        additionalNotes: answers.additionalContext.additionalNotes,
        visualDesignPreference: answers.additionalContext.visualDesignPreference,
        visualStyleNotes: answers.additionalContext.visualStyleNotes
      }
    }
  };
}

function validateEntry(entry, pathName, errors) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return errors.push(`${pathName} must be an object.`);
  const keys = Object.keys(entry);
  if (keys.some((key) => !["statement", "status", "sourcePaths"].includes(key))) errors.push(`${pathName} has an unexpected field.`);
  if (!hasText(entry.statement) || entry.statement.length > 4000) errors.push(`${pathName}.statement is invalid.`);
  if (!STATUSES.includes(entry.status)) errors.push(`${pathName}.status is invalid.`);
  if (!Array.isArray(entry.sourcePaths) || entry.sourcePaths.length > 20 || new Set(entry.sourcePaths).size !== entry.sourcePaths.length || entry.sourcePaths.some((item) => typeof item !== "string" || !item.startsWith("customerAnswers."))) errors.push(`${pathName}.sourcePaths is invalid.`);
  if (entry.status === "confirmed" && (!entry.sourcePaths || !entry.sourcePaths.length)) errors.push(`${pathName} confirmed statements require a source path.`);
  if (entry.status === "unknown" && entry.sourcePaths && entry.sourcePaths.length) errors.push(`${pathName} unknown statements cannot have a source path.`);
}

function validateSections(sections) {
  const errors = [];
  if (!sections || typeof sections !== "object" || Array.isArray(sections)) return { valid: false, errors: ["sections must be an object."] };
  if (Object.keys(sections).some((key) => !SECTION_NAMES.includes(key))) errors.push("sections has an unexpected field.");
  SECTION_NAMES.forEach((name) => {
    const items = sections[name];
    if (!Array.isArray(items) || (name !== "openQuestions" && items.length < 1) || items.length > 50) {
      errors.push(`sections.${name} is invalid.`);
      return;
    }
    if (name === "openQuestions") {
      items.forEach((item, index) => {
        const prefix = `sections.openQuestions[${index}]`;
        if (!item || typeof item !== "object" || Array.isArray(item)) return errors.push(`${prefix} must be an object.`);
        if (Object.keys(item).some((key) => !["question", "reason", "blocks"].includes(key))) errors.push(`${prefix} has an unexpected field.`);
        if (!hasText(item.question) || item.question.length > 1000 || !hasText(item.reason) || item.reason.length > 1000) errors.push(`${prefix} requires a valid question and reason.`);
        const blocks = item.blocks;
        if (!blocks || typeof blocks !== "object" || ["estimation", "scopeAgreement", "development"].some((key) => typeof blocks[key] !== "boolean") || Object.keys(blocks).some((key) => !["estimation", "scopeAgreement", "development"].includes(key))) errors.push(`${prefix}.blocks is invalid.`);
      });
    } else items.forEach((entry, index) => validateEntry(entry, `sections.${name}[${index}]`, errors));
  });
  return { valid: errors.length === 0, errors };
}

function valueAtSourcePath(input, sourcePath) {
  const parts = sourcePath.split(".");
  let value = input;
  for (const part of parts) {
    if (!value || typeof value !== "object" || !Object.prototype.hasOwnProperty.call(value, part)) return undefined;
    value = value[part];
  }
  return value;
}

function modelSourcesAreAllowed(sections, modelInput) {
  return SECTION_NAMES.every((name) => name === "openQuestions" || sections[name].every((entry) =>
    entry.sourcePaths.every((sourcePath) => {
      const sourceValue = valueAtSourcePath(modelInput, sourcePath);
      return Array.isArray(sourceValue) ? sourceValue.length > 0 : hasText(sourceValue);
    })
  ));
}

function metadata(options, generationMode, modelVersion) {
  const generatedAt = new Date(options.now === undefined ? Date.now() : options.now).toISOString();
  return { schemaVersion: SCHEMA_VERSION, templateVersion: TEMPLATE_VERSION, modelVersion, generationMode, generatedAt, customerApproved: false, notice: NOTICE };
}

function validateInterpretation(value) {
  const result = validateSections(value && value.sections);
  const errors = result.errors.slice();
  const meta = value && value.metadata;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) errors.push("metadata is invalid.");
  else {
    const expectedKeys = ["schemaVersion", "templateVersion", "modelVersion", "generationMode", "generatedAt", "customerApproved", "notice"];
    if (Object.keys(meta).some((key) => !expectedKeys.includes(key)) || expectedKeys.some((key) => !Object.prototype.hasOwnProperty.call(meta, key))) errors.push("metadata fields are invalid.");
    const validGeneratedAt = hasText(meta.generatedAt) && !Number.isNaN(Date.parse(meta.generatedAt)) && new Date(meta.generatedAt).toISOString() === meta.generatedAt;
    if (meta.schemaVersion !== SCHEMA_VERSION || meta.templateVersion !== TEMPLATE_VERSION || !hasText(meta.modelVersion) || meta.modelVersion.length > 100 || !["model", "deterministic_fallback"].includes(meta.generationMode) || !validGeneratedAt || meta.customerApproved !== false || meta.notice !== NOTICE) errors.push("metadata values are invalid.");
  }
  return { valid: errors.length === 0, errors };
}

function parseModelResult(result) {
  if (typeof result === "string") return JSON.parse(result);
  if (result && typeof result === "object") return result;
  throw new TypeError("The model returned an unsupported result.");
}

async function interpretSubmission(rawSubmission, options = {}) {
  let submission;
  try {
    submission = validateRequestBody(rawSubmission);
  } catch (error) {
    throw new RequirementsInterpretationError("The submission could not be interpreted because it is invalid.", "invalid_submission", error);
  }

  const fallback = () => {
    const value = { metadata: metadata(options, "deterministic_fallback", "deterministic-1.0.0"), sections: buildDeterministicSections(submission) };
    const validation = validateInterpretation(value);
    if (!validation.valid) throw new RequirementsInterpretationError("The fallback interpretation failed validation.", "fallback_invalid");
    return value;
  };

  if (!options.modelClient) return fallback();
  if (typeof options.modelClient.generateRequirements !== "function") throw new RequirementsInterpretationError("The model service is not configured correctly.", "configuration");
  if (options.signal && options.signal.aborted) throw new RequirementsInterpretationError("Requirements interpretation was cancelled.", "cancelled");

  try {
    const modelInput = buildModelInput(submission);
    const rawResult = await options.modelClient.generateRequirements({
      instructionTemplate,
      templateVersion: TEMPLATE_VERSION,
      input: modelInput,
      responseSchema,
      signal: options.signal
    });
    const parsed = parseModelResult(rawResult);
    const value = {
      metadata: metadata(options, "model", hasText(options.modelVersion) ? options.modelVersion : "configured-model"),
      sections: parsed.sections
    };
    const validation = validateInterpretation(value);
    if (!validation.valid || !modelSourcesAreAllowed(value.sections, modelInput)) return fallback();
    return value;
  } catch (error) {
    if (options.signal && options.signal.aborted) throw new RequirementsInterpretationError("Requirements interpretation was cancelled.", "cancelled", error);
    return fallback();
  }
}

module.exports = Object.freeze({
  SCHEMA_VERSION,
  TEMPLATE_VERSION,
  NOTICE,
  instructionTemplate,
  responseSchema,
  RequirementsInterpretationError,
  buildModelInput,
  buildDeterministicSections,
  validateInterpretation,
  interpretSubmission
});
