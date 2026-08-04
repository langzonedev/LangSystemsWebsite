"use strict";

const BUNDLE_SCHEMA_VERSION = "1.0.0";
const CLASSIFICATION = "INTERNAL - HUMAN REVIEW REQUIRED BEFORE AI USE";

const REQUESTED_ARTIFACTS = Object.freeze([
  "Business requirements and a traceability matrix",
  "Functional and non-functional requirements",
  "User roles, journeys, use cases, and acceptance scenarios",
  "UX/UI direction, accessible design system, theming tokens, and provisional brand application plan",
  "Domain model, data model, retention, migration, and data-quality requirements",
  "System context, container, and component architecture",
  "UML diagrams in Mermaid or PlantUML source form",
  "Integration and API contracts, including failure handling",
  "Security, privacy, access-control, audit, and threat considerations",
  "Architecture decision records with options and trade-offs",
  "Deployment, operations, observability, backup, and recovery design",
  "Test strategy, acceptance plan, delivery stages, risks, and open questions",
  "A concise, implementation-ready handoff for Codex"
]);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function withoutPrivateFields(submission) {
  const answers = submission.customerAnswers || {};
  const additional = answers.additionalContext || {};
  return {
    currentProcess: clone(answers.currentProcess || {}),
    desiredOutcome: clone(answers.desiredOutcome || {}),
    scope: clone(answers.scope || {}),
    commercial: clone(answers.commercial || {}),
    additionalContext: {
      constraints: additional.constraints || null,
      additionalNotes: additional.additionalNotes || null,
      visualDesignPreference: additional.visualDesignPreference || null,
      visualStyleNotes: additional.visualStyleNotes || null
    }
  };
}

function cleanDocument(value) {
  return typeof value === "string" ? value.replace(/\0/g, "").replace(/\r\n?/g, "\n").trim().slice(0, 120000) : "";
}

function safeReference(value) {
  return String(value || "submission").replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 100) || "submission";
}

function utf8Base64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function markdownFor(bundle) {
  const facts = bundle.sourceFacts;
  const lines = [
    "# Lang Systems AI handoff bundle",
    "",
    `**${bundle.metadata.classification}**`,
    "",
    `Submission reference: \`${bundle.metadata.sourceSubmissionId}\`  `,
    `Generated: ${bundle.metadata.generatedAt}  `,
    `Review status: **${bundle.metadata.reviewStatus}**`,
    "",
    "## Before using this bundle",
    "",
    "1. Compare the project facts with the internal email and customer response.",
    "2. Correct any misunderstanding and resolve, remove, or clearly retain each unknown.",
    "3. Do not add customer contact details, credentials, payment details, health information, or other sensitive data.",
    "4. Upload this Markdown file and its matching JSON file to the chosen AI project only after review.",
    "5. Keep a human approval step before architecture, scope, pricing, or code is treated as final.",
    "",
    "## Prompt-ready task",
    "",
    "### Goal",
    bundle.agentTask.goal,
    "",
    "### Context",
    bundle.agentTask.context,
    "",
    "### Constraints",
    ...bundle.agentTask.constraints.map((item) => `- ${item}`),
    "",
    "### Required artifacts",
    ...bundle.agentTask.requestedArtifacts.map((item, index) => `${index + 1}. ${item}`),
    "",
    "### Done when",
    ...bundle.agentTask.doneWhen.map((item) => `- ${item}`),
    "",
    "## Evidence rules",
    "",
    ...Object.entries(bundle.evidenceRules).map(([key, value]) => `- **${key}:** ${value}`),
    "",
    "## Customer-supplied project facts (privacy-minimised)",
    "",
    "```json",
    JSON.stringify(facts, null, 2),
    "```",
    "",
    "## Existing generated technical specification",
    "",
    bundle.generatedInputs.technicalSpecification || "Not generated.",
    "",
    "## Clarification questions",
    "",
    bundle.generatedInputs.clarificationQuestions || "No questions generated.",
    "",
    "## Processing warnings",
    "",
    bundle.generatedInputs.warnings || "No processing warnings reported.",
    "",
    "## Supporting files",
    "",
    bundle.supportingFilesNotice,
    "",
    "## Human review record",
    "",
    ...bundle.humanReview.checklist.map((item) => `- [ ] ${item}`),
    "",
    `Reviewer: ${bundle.humanReview.reviewer || "________________"}  `,
    `Reviewed at: ${bundle.humanReview.reviewedAt || "________________"}  `,
    `Decision/notes: ${bundle.humanReview.notes || "________________"}`,
    ""
  ];
  return lines.join("\n");
}

function createAiHandoffBundle(submission, documents, options = {}) {
  const metadata = submission.submissionMetadata || {};
  const generatedAt = options.generatedAt || new Date().toISOString();
  const reference = safeReference(metadata.submissionId);
  const bundle = {
    metadata: {
      schemaVersion: BUNDLE_SCHEMA_VERSION,
      sourceSubmissionId: reference,
      sourceIntakeSchemaVersion: metadata.schemaVersion || null,
      sourceIntakeTemplateVersion: metadata.templateVersion || null,
      generatedAt,
      classification: CLASSIFICATION,
      humanReviewRequired: true,
      reviewStatus: "unreviewed"
    },
    agentTask: {
      goal: "Turn the reviewed customer discovery facts into a coherent, traceable set of software architecture, design, delivery, and Codex implementation artifacts.",
      context: "This is an early project enquiry. A Lang Systems human must first verify the customer need, suitability, facts, unknowns, scope boundaries, and permission to proceed. The bundle is input to analysis, not an instruction to build or contact the customer.",
      constraints: [
        "Treat customer-supplied facts as evidence, not as complete technical requirements.",
        "Do not invent missing business rules, integrations, data classifications, roles, volumes, service levels, budgets, or deadlines.",
        "Label every derived statement as confirmed, assumption, recommendation, or unknown.",
        "Turn material unknowns into concise clarification questions and state which artifact they block.",
        "Keep first-release scope separate from later and future ideas.",
        "Prefer secure, maintainable, accessible, observable, and cost-conscious designs.",
        "Treat branding preferences as design direction only. Do not assume logos, fonts, images, colours, or other supplied materials are authorised or licensed; use placeholders until a human verifies authority and restrictions.",
        "Do not start implementation, make commitments, or communicate externally without human approval."
      ],
      requestedArtifacts: REQUESTED_ARTIFACTS.slice(),
      doneWhen: [
        "Every confirmed requirement is traceable to a supplied fact or approved clarification.",
        "Assumptions, recommendations, contradictions, risks, and unknowns are visibly separated.",
        "Diagrams are supplied as editable text source and agree with the written architecture.",
        "Acceptance criteria and test coverage are measurable.",
        "The final Codex handoff identifies repository context, constraints, implementation order, verification, and remaining human decisions."
      ]
    },
    evidenceRules: {
      confirmed: "Directly supported by the reviewed customer response or an approved follow-up answer.",
      assumption: "A temporary proposition that must name its evidence gap and validation owner.",
      recommendation: "A proposed design choice with rationale, trade-offs, cost implications, and approval status.",
      unknown: "Information not supplied or not safely inferable; never silently fill it in."
    },
    sourceFacts: withoutPrivateFields(submission),
    generatedInputs: {
      technicalSpecification: cleanDocument(documents && documents.technicalSpecification),
      clarificationQuestions: cleanDocument(documents && documents.clarificationQuestions),
      warnings: cleanDocument(documents && documents.warnings)
    },
    supportingFilesNotice: `${Array.isArray(submission.attachments) ? submission.attachments.length : 0} supporting file reference(s) were supplied. File contents and filenames are not included in this AI bundle. Obtain and inspect approved files through a secure human-reviewed process if needed.`,
    humanReview: {
      required: true,
      checklist: [
        "Customer identity, contact route, and authority were checked in the internal email.",
        "The problem, desired outcome, affected users, and service fit were confirmed.",
        "First-release scope, exclusions, success measures, budget, and timing were checked.",
        "Sensitive or unnecessary personal information was removed from AI input.",
        "Material unknowns and contradictions were resolved or explicitly retained.",
        "Any proposed branding or third-party design assets were checked for customer authority, usage permission, licence restrictions, and accessibility before use.",
        "The selected AI tool and account are approved for this project information."
      ],
      reviewer: null,
      reviewedAt: null,
      notes: null
    }
  };
  const json = `${JSON.stringify(bundle, null, 2)}\n`;
  const markdown = markdownFor(bundle);
  return {
    bundle,
    json,
    markdown,
    attachments: [
      { filename: `Lang-Systems-AI-handoff-${reference}.json`, content: utf8Base64(json) },
      { filename: `Lang-Systems-AI-handoff-${reference}.md`, content: utf8Base64(markdown) }
    ]
  };
}

module.exports = Object.freeze({
  BUNDLE_SCHEMA_VERSION,
  CLASSIFICATION,
  REQUESTED_ARTIFACTS,
  createAiHandoffBundle,
  markdownFor,
  utf8Base64
});
