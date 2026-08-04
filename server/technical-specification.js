"use strict";

const schema = require("./technical-specification.schema.json");
const interpreter = require("./requirements-interpreter.js");

const SCHEMA_VERSION = "1.0.0";
const TEMPLATE_VERSION = "1.0.0";
const CLASSIFICATION = "INTERNAL - Lang Systems authorised personnel only";
const NOTICE = "Internal discovery document for manual review; not customer-approved scope, a quote, a contract, or permission to begin development.";
const STATUSES = ["confirmed", "assumption", "recommendation", "unknown"];
const SECTION_TITLES = Object.freeze({
  projectOverview: "Project overview", businessProblem: "Business problem", projectGoals: "Project goals",
  nonGoals: "Non-goals", userTypes: "User types", userJourneys: "User journeys",
  functionalRequirements: "Functional requirements", essentialFirstReleaseRequirements: "Essential first-release requirements",
  laterEnhancements: "Later enhancements", explicitExclusions: "Explicit exclusions",
  proposedDataEntities: "Proposed data entities", likelyDataRelationships: "Likely data relationships",
  existingDataSources: "Existing data sources", dataImportRequirements: "Data-import requirements",
  integrationRequirements: "Integration requirements", fileAndDocumentRequirements: "File and document requirements",
  authenticationConsiderations: "Authentication considerations", permissionAndRoleConsiderations: "Permission and role considerations",
  reportingRequirements: "Reporting requirements", notificationRequirements: "Notification requirements",
  offlineRequirements: "Offline requirements", deviceRequirements: "Device requirements",
  platformConstraints: "Platform constraints", securityConsiderations: "Security considerations",
  privacyConsiderations: "Privacy considerations", performanceConsiderations: "Performance considerations",
  backupAndRecoveryConsiderations: "Backup and recovery considerations", deploymentConsiderations: "Deployment considerations",
  supportConsiderations: "Support considerations", acceptanceCriteria: "Acceptance criteria",
  assumptions: "Assumptions", dependencies: "Dependencies", risks: "Risks",
  conflictsAndContradictions: "Conflicts or contradictions", openTechnicalQuestions: "Open technical questions",
  recommendedInvestigationTasks: "Recommended investigation tasks"
});

class TechnicalSpecificationError extends Error {
  constructor(message, code, cause) {
    super(message, { cause });
    this.name = "TechnicalSpecificationError";
    this.code = code;
  }
}

function entry(statement, status = "unknown", sourcePaths = []) {
  return { statement, status, sourcePaths: sourcePaths.slice() };
}

function copy(items) {
  return items.map((item) => entry(item.statement, item.status, item.sourcePaths));
}

function combine(...groups) {
  return groups.flatMap(copy);
}

function unknown(statement) {
  return [entry(statement)];
}

function recommendation(statement) {
  return [entry(statement, "recommendation")];
}

function deriveSections(interpretation) {
  const source = interpretation.sections;
  const noConflict = "No conflict or contradiction was identified automatically. A reviewer must compare the original submission and clarify any inconsistent wording.";
  return {
    projectOverview: combine(source.businessContext, source.problemStatement, source.desiredOutcome),
    businessProblem: combine(source.problemStatement, source.currentProcess, source.currentDifficulties),
    projectGoals: copy(source.desiredOutcome),
    nonGoals: copy(source.explicitExclusions),
    userTypes: copy(source.intendedUsers),
    userJourneys: combine(source.currentProcess, source.desiredOutcome),
    functionalRequirements: copy(source.essentialFirstReleaseRequirements),
    essentialFirstReleaseRequirements: copy(source.essentialFirstReleaseRequirements),
    laterEnhancements: combine(source.usefulLaterRequirements, source.futureIdeas),
    explicitExclusions: copy(source.explicitExclusions),
    proposedDataEntities: recommendation("Identify candidate data entities from the confirmed workflows and data requirements during technical discovery; names and fields are not yet confirmed."),
    likelyDataRelationships: recommendation("Map relationships, ownership, lifecycle, retention, and authoritative sources only after candidate data entities are confirmed."),
    existingDataSources: copy(source.existingDataSources),
    dataImportRequirements: unknown("Data-import formats, volumes, cleansing, mapping, validation, reconciliation, and cutover requirements have not been confirmed."),
    integrationRequirements: copy(source.integrationRequirements),
    fileAndDocumentRequirements: unknown("File upload, generated document, format, size, retention, scanning, and export requirements have not been confirmed."),
    authenticationConsiderations: unknown("Authentication method, identity provider, session rules, account recovery, and multi-factor requirements have not been confirmed."),
    permissionAndRoleConsiderations: unknown("Roles, permissions, approval boundaries, and least-privilege rules have not been confirmed."),
    reportingRequirements: unknown("Reports, dashboards, exports, measures, filters, and reporting audiences have not been confirmed."),
    notificationRequirements: unknown("Notification events, recipients, channels, templates, retry behaviour, and delivery evidence have not been confirmed."),
    offlineRequirements: copy(source.offlineRequirements),
    deviceRequirements: copy(source.deviceAndPlatformConsiderations),
    platformConstraints: combine(source.deviceAndPlatformConsiderations, source.constraints),
    securityConsiderations: copy(source.securityAndPrivacyConsiderations),
    privacyConsiderations: copy(source.securityAndPrivacyConsiderations),
    performanceConsiderations: unknown("Expected usage volumes, concurrency, response-time targets, availability, and capacity limits have not been confirmed."),
    backupAndRecoveryConsiderations: unknown("Backup scope, recovery point, recovery time, restore testing, and business-continuity requirements have not been confirmed."),
    deploymentConsiderations: combine(source.dataRequirements, recommendation("Select hosting, environments, release controls, monitoring, and rollback arrangements after constraints are confirmed; no technology stack is selected by this specification.")),
    supportConsiderations: unknown("Support hours, service targets, maintenance ownership, escalation, training, and handover requirements have not been confirmed."),
    acceptanceCriteria: combine(source.proposedAcceptanceCriteria, recommendation("During manual review, rewrite agreed criteria as observable pass/fail checks without changing the customer's intended outcome.")),
    assumptions: copy(source.assumptions),
    dependencies: combine(source.integrationRequirements, source.existingDataSources, source.constraints),
    risks: copy(source.risks),
    conflictsAndContradictions: recommendation(noConflict),
    openTechnicalQuestions: source.openQuestions.map((item) => ({ question: item.question, reason: item.reason, blocks: { ...item.blocks } })),
    recommendedInvestigationTasks: combine(
      recommendation("Validate first-release workflow boundaries and testable acceptance criteria with the customer before estimation."),
      recommendation("Investigate data, integration, identity, permissions, security, privacy, performance, recovery, deployment, support, user-experience, and visual-design gaps recorded in this specification."),
      recommendation("Create an accessible, themeable component direction early, but use placeholders for brand assets until a human verifies the customer's authority and any third-party licence restrictions."),
      source.recommendedNextStep
    )
  };
}

function validDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}

function validateEntry(item, path, errors) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return errors.push(`${path} must be an object.`);
  if (Object.keys(item).some((key) => !["statement", "status", "sourcePaths"].includes(key))) errors.push(`${path} has an unexpected field.`);
  if (typeof item.statement !== "string" || !item.statement.trim() || item.statement.length > 4000) errors.push(`${path}.statement is invalid.`);
  if (!STATUSES.includes(item.status)) errors.push(`${path}.status is invalid.`);
  if (!Array.isArray(item.sourcePaths) || item.sourcePaths.length > 20 || new Set(item.sourcePaths).size !== item.sourcePaths.length || item.sourcePaths.some((value) => typeof value !== "string" || !value.startsWith("customerAnswers."))) errors.push(`${path}.sourcePaths is invalid.`);
  if (item.status === "confirmed" && item.sourcePaths.length === 0) errors.push(`${path} confirmed statements require source paths.`);
  if (item.status === "unknown" && item.sourcePaths.length !== 0) errors.push(`${path} unknown statements cannot have source paths.`);
}

function validateSpecification(value) {
  const errors = [];
  const meta = value && value.metadata;
  const sections = value && value.sections;
  const requiredMeta = ["schemaVersion", "templateVersion", "generatedAt", "sourceSubmissionId", "sourceInterpretationSchemaVersion", "sourceInterpretationTemplateVersion", "generationMode", "customerApproved", "classification", "notice"];
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !["metadata", "sections", "renderedText"].includes(key))) errors.push("Specification fields are invalid.");
  if (!meta || typeof meta !== "object" || Array.isArray(meta) || Object.keys(meta).some((key) => !requiredMeta.includes(key)) || requiredMeta.some((key) => !Object.prototype.hasOwnProperty.call(meta, key))) errors.push("metadata fields are invalid.");
  else if (meta.schemaVersion !== SCHEMA_VERSION || meta.templateVersion !== TEMPLATE_VERSION || !validDate(meta.generatedAt) || typeof meta.sourceSubmissionId !== "string" || !meta.sourceSubmissionId.trim() || meta.sourceSubmissionId.length > 100 || typeof meta.sourceInterpretationSchemaVersion !== "string" || !meta.sourceInterpretationSchemaVersion || typeof meta.sourceInterpretationTemplateVersion !== "string" || !meta.sourceInterpretationTemplateVersion || !["model", "deterministic_fallback"].includes(meta.generationMode) || meta.customerApproved !== false || meta.classification !== CLASSIFICATION || meta.notice !== NOTICE) errors.push("metadata values are invalid.");
  if (!sections || typeof sections !== "object" || Array.isArray(sections) || Object.keys(sections).some((key) => !Object.prototype.hasOwnProperty.call(SECTION_TITLES, key)) || Object.keys(SECTION_TITLES).some((key) => !Object.prototype.hasOwnProperty.call(sections, key))) errors.push("sections fields are invalid.");
  else Object.keys(SECTION_TITLES).forEach((name) => {
    const items = sections[name];
    if (!Array.isArray(items) || (name !== "openTechnicalQuestions" && items.length < 1) || items.length > 100) return errors.push(`sections.${name} is invalid.`);
    if (name === "openTechnicalQuestions") items.forEach((item, index) => {
      const path = `sections.${name}[${index}]`;
      if (!item || typeof item !== "object" || Array.isArray(item) || Object.keys(item).some((key) => !["question", "reason", "blocks"].includes(key)) || typeof item.question !== "string" || !item.question.trim() || item.question.length > 1000 || typeof item.reason !== "string" || !item.reason.trim() || item.reason.length > 1000 || !item.blocks || typeof item.blocks !== "object" || ["estimation", "scopeAgreement", "development"].some((key) => typeof item.blocks[key] !== "boolean") || Object.keys(item.blocks || {}).some((key) => !["estimation", "scopeAgreement", "development"].includes(key))) errors.push(`${path} is invalid.`);
    });
    else items.forEach((item, index) => validateEntry(item, `sections.${name}[${index}]`, errors));
  });
  if (typeof (value && value.renderedText) !== "string" || !value.renderedText.trim() || value.renderedText.length > 200000) errors.push("renderedText is invalid.");
  return { valid: errors.length === 0, errors };
}

function renderSpecification(metadata, sections) {
  const lines = [
    "INTERNAL TECHNICAL REQUIREMENTS SPECIFICATION",
    CLASSIFICATION,
    "",
    `Source submission: ${metadata.sourceSubmissionId}`,
    `Generated at: ${metadata.generatedAt}`,
    `Generation mode: ${metadata.generationMode}`,
    "Customer approved: No",
    "",
    NOTICE,
    "",
    "Status key: CONFIRMED = supplied customer information; ASSUMPTION = requires review; RECOMMENDATION = non-binding technical guidance; UNKNOWN = customer confirmation or investigation required."
  ];
  Object.keys(SECTION_TITLES).forEach((name) => {
    lines.push("", SECTION_TITLES[name].toUpperCase(), "-".repeat(SECTION_TITLES[name].length));
    if (name === "openTechnicalQuestions") {
      if (!sections[name].length) lines.push("- [NONE IDENTIFIED AUTOMATICALLY] Manual review is still required.");
      sections[name].forEach((item) => {
        const blockers = Object.entries(item.blocks).filter((pair) => pair[1]).map((pair) => pair[0]).join(", ") || "none recorded";
        lines.push(`- [NEEDS CONFIRMATION] ${item.question}`, `  Reason: ${item.reason}`, `  Blocks: ${blockers}`);
      });
      return;
    }
    sections[name].forEach((item) => {
      const trace = item.sourcePaths.length ? ` (Source: ${item.sourcePaths.join(", ")})` : "";
      lines.push(`- [${item.status.toUpperCase()}] ${item.statement}${trace}`);
    });
  });
  return lines.join("\n");
}

function buildFromInterpretation(interpretation, options = {}) {
  const interpretationValidation = interpreter.validateInterpretation(interpretation);
  if (!interpretationValidation.valid) throw new TechnicalSpecificationError("The requirements interpretation is invalid.", "invalid_interpretation");
  if (typeof options.sourceSubmissionId !== "string" || !options.sourceSubmissionId.trim() || options.sourceSubmissionId.length > 100) throw new TechnicalSpecificationError("A valid source submission reference is required.", "invalid_source_reference");
  const generatedAt = new Date(options.now === undefined ? Date.now() : options.now).toISOString();
  const metadata = {
    schemaVersion: SCHEMA_VERSION, templateVersion: TEMPLATE_VERSION, generatedAt,
    sourceSubmissionId: options.sourceSubmissionId.trim(),
    sourceInterpretationSchemaVersion: interpretation.metadata.schemaVersion,
    sourceInterpretationTemplateVersion: interpretation.metadata.templateVersion,
    generationMode: interpretation.metadata.generationMode, customerApproved: false,
    classification: CLASSIFICATION, notice: NOTICE
  };
  const sections = deriveSections(interpretation);
  const value = { metadata, sections, renderedText: renderSpecification(metadata, sections) };
  const validation = validateSpecification(value);
  if (!validation.valid) throw new TechnicalSpecificationError("The generated technical specification failed validation.", "generation_invalid");
  return value;
}

async function generateTechnicalSpecification(rawSubmission, options = {}) {
  try {
    const interpretation = await interpreter.interpretSubmission(rawSubmission, options);
    const sourceSubmissionId = options.sourceSubmissionId || (rawSubmission && rawSubmission.submissionMetadata && rawSubmission.submissionMetadata.submissionId);
    return buildFromInterpretation(interpretation, { sourceSubmissionId, now: options.now });
  } catch (error) {
    if (error instanceof TechnicalSpecificationError) throw error;
    const code = error && error.code === "cancelled" ? "cancelled" : "generation_failed";
    throw new TechnicalSpecificationError("The technical specification could not be generated.", code, error);
  }
}

module.exports = Object.freeze({
  SCHEMA_VERSION, TEMPLATE_VERSION, CLASSIFICATION, NOTICE, SECTION_TITLES, schema,
  TechnicalSpecificationError, deriveSections, renderSpecification, validateSpecification,
  buildFromInterpretation, generateTechnicalSpecification
});
