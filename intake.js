(() => {
  const dialog = document.querySelector("[data-intake-dialog]");
  const form = document.querySelector("[data-intake-form]");
  const submissionService = window.LangSystemsIntakeSubmission;
  const intakeModel = window.LangSystemsIntakeModel;
  const customerSummaryGenerator = window.LangSystemsCustomerSummary;
  const intakeDraft = window.LangSystemsIntakeDraft;

  if (!dialog || !form || !submissionService || !intakeModel || !customerSummaryGenerator || !intakeDraft || typeof dialog.showModal !== "function") return;

  const steps = [...form.querySelectorAll("[data-step]")];
  const openButtons = [...document.querySelectorAll("[data-open-intake]")];
  const closeButtons = [...dialog.querySelectorAll("[data-close-intake]")];
  const backButton = form.querySelector("[data-form-back]");
  const nextButton = form.querySelector("[data-form-next]");
  const submitButton = form.querySelector("[data-form-submit]");
  const message = form.querySelector("[data-form-message]");
  const errorSummary = form.querySelector("[data-error-summary]");
  const progressBar = dialog.querySelector("[data-progress-bar]");
  const progressTrack = dialog.querySelector("[data-progress-track]");
  const stepLabel = dialog.querySelector("[data-step-label]");
  const stepName = dialog.querySelector("[data-step-name]");
  const stepAnnouncement = dialog.querySelector("[data-step-announcement]");
  const reviewSummary = form.querySelector("[data-review-summary]");
  const successPanel = dialog.querySelector("[data-intake-success]");
  const intakeHeaderEyebrow = dialog.querySelector("[data-intake-header-eyebrow]");
  const intakeHeaderTitle = dialog.querySelector("[data-intake-header-title]");
  const intakeHeaderDescription = dialog.querySelector("[data-intake-header-description]");
  const confirmationEmail = dialog.querySelector("[data-confirmation-email]");
  const confirmationBusiness = dialog.querySelector("[data-confirmation-business]");
  const confirmationReference = dialog.querySelector("[data-confirmation-reference]");
  const confirmationSummaryText = dialog.querySelector("[data-confirmation-summary-text]");
  const correctionLink = dialog.querySelector("[data-correction-link]");
  const contactReferenceLink = dialog.querySelector("[data-contact-reference]");
  const summaryActions = dialog.querySelector("[data-summary-actions]");
  const printConfirmationButton = dialog.querySelector("[data-print-confirmation]");
  const downloadSummaryButton = dialog.querySelector("[data-download-summary]");
  let currentStep = 0;
  let lastTrigger = null;
  let submissionComplete = false;
  let formDirty = false;
  let submissionController = null;
  let submissionInProgress = false;
  let pendingDocuments = null;
  let lastAttemptAt = 0;
  let confirmedReference = "";
  const historyStateKey = "langSystemsIntakeOpen";
  const intakeHash = "#project-discovery";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const fieldLabels = {
    contact_name: "Your name",
    email: "Work email",
    business_name: "Business or organisation",
    business_description: "What your business does",
    problem: "Problem or opportunity",
    current_process: "Current process",
    problem_impact: "Who is affected and the impact",
    desired_outcome: "Desired outcome",
    users: "People who will use it",
    existing_systems: "Existing systems",
    data_needs: "Information used",
    first_release: "Essential for the first release",
    optional_requirements: "Useful additions for later",
    future_ideas: "Future ideas",
    excluded_functionality: "Not included",
    budget: "Expected investment",
    timing: "Preferred timing",
    timing_context: "Timing context",
    delivery_model: "Preferred arrangement",
    day_to_day_owner: "Day-to-day management",
    ongoing_support: "Ongoing help",
    acceptance_criteria: "Completion and acceptance criteria",
    privacy_consent: "Privacy agreement",
    constraints: "Rules, constraints, or concerns",
    additional_notes: "Additional notes",
    attachments: "Supporting files"
  };

  const allowedFileExtensions = new Set(["pdf", "doc", "docx", "xls", "xlsx", "csv", "png", "jpg", "jpeg", "txt"]);
  const maximumAttachmentBytes = intakeModel.limits.maximumAttachmentBytes;
  const maximumAttachments = intakeModel.limits.maximumAttachments;
  const attachmentMimeTypes = {
    pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv", txt: "text/plain", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg"
  };

  function valueOf(name) {
    const field = form.elements.namedItem(name);
    if (!field) return "";
    return String(field.value || "").trim();
  }

  function setMessage(text = "", isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
  }

  function errorId(field) {
    return `intake-error-${field.name.replace(/[^a-z0-9_-]/gi, "-")}`;
  }

  function clearFieldError(field) {
    field.removeAttribute("aria-invalid");
    updateDescription(field, errorId(field), false);
    form.querySelector(`#${errorId(field)}`)?.remove();
  }

  function fieldError(field) {
    const label = fieldLabels[field.name] || "This question";
    if (field.name === "attachments") return field.validationMessage;
    if (field.validity.typeMismatch) return "Please enter an email address in the usual format, such as name@example.com.";
    if (field.validity.tooLong) return `${label} is a little too long. Please shorten it to ${field.maxLength.toLocaleString()} characters or fewer.`;
    if (field.name === "privacy_consent") return "Please confirm the privacy agreement before sending your project outline.";
    if (field.name === "problem") return "Please tell us a little about the problem you would like to solve.";
    return `Please complete ${label.toLowerCase()} before continuing.`;
  }

  function setFieldError(field, text) {
    clearFieldError(field);
    field.setAttribute("aria-invalid", "true");
    const error = document.createElement("span");
    error.className = "field-error";
    error.id = errorId(field);
    error.textContent = text;
    const container = field.type === "radio" ? field.closest("fieldset") : field.closest("label, fieldset") || field.parentElement;
    container.append(error);
    updateDescription(field, error.id, true);
  }

  function validateAttachments(field) {
    if (!field) return;
    field.setCustomValidity("");
    const files = [...field.files];
    if (files.length > maximumAttachments) {
      field.setCustomValidity(`Please choose no more than ${maximumAttachments} supporting files.`);
      return;
    }
    const longName = files.find((file) => file.name.length > 255);
    if (longName) {
      field.setCustomValidity("One supporting file has a name longer than 255 characters. Please shorten the file name and choose it again.");
      return;
    }
    const unsupported = files.find((file) => !allowedFileExtensions.has((file.name.split(".").pop() || "").toLowerCase()));
    if (unsupported) {
      field.setCustomValidity(`“${unsupported.name}” is not a supported file type. Please choose a PDF, Word, Excel, CSV, text, PNG, or JPG file.`);
      return;
    }
    const oversized = files.find((file) => file.size > maximumAttachmentBytes);
    if (oversized) {
      field.setCustomValidity(`“${oversized.name}” is larger than 10 MB. Please choose a smaller file.`);
      return;
    }
    const empty = files.find((file) => file.size < 1);
    if (empty) field.setCustomValidity(`“${empty.name}” is empty. Please choose a file that contains information.`);
  }

  function showErrorSummary(errors) {
    if (!errors.length) {
      errorSummary.replaceChildren();
      errorSummary.hidden = true;
      return;
    }
    const heading = document.createElement("h4");
    const list = document.createElement("ul");
    heading.textContent = errors.length === 1 ? "Please check this answer" : `Please check these ${errors.length} answers`;
    errors.forEach(({ field, text }) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      field.id ||= `intake-field-${field.name}`;
      link.href = `#${field.id}`;
      link.textContent = text;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        field.focus();
      });
      item.append(link);
      list.append(item);
    });
    errorSummary.replaceChildren(heading, list);
    errorSummary.hidden = false;
  }

  function describedByTokens(field) {
    return new Set((field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
  }

  function updateDescription(field, id, include) {
    const tokens = describedByTokens(field);
    if (include) tokens.add(id);
    else tokens.delete(id);
    if (tokens.size) field.setAttribute("aria-describedby", [...tokens].join(" "));
    else field.removeAttribute("aria-describedby");
  }

  function wireFieldDescriptions() {
    [...form.elements].forEach((field, index) => {
      if (!(field instanceof HTMLElement) || !field.name) return;
      const helper = field.closest("label")?.querySelector("small");
      if (!helper) return;
      helper.id ||= `intake-field-help-${index + 1}`;
      updateDescription(field, helper.id, true);
    });
    steps.forEach((step) => step.querySelector("h3")?.setAttribute("tabindex", "-1"));
  }

  function updateStep() {
    currentStep = Math.min(Math.max(0, currentStep), steps.length - 1);
    steps.forEach((step, index) => { step.hidden = index !== currentStep; });
    stepLabel.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    stepName.textContent = steps[currentStep].dataset.stepName;
    progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    progressTrack.setAttribute("aria-valuenow", String(currentStep + 1));
    progressTrack.setAttribute("aria-valuetext", `Step ${currentStep + 1} of ${steps.length}: ${steps[currentStep].dataset.stepName}`);
    stepAnnouncement.textContent = `Step ${currentStep + 1} of ${steps.length}: ${steps[currentStep].dataset.stepName}`;
    backButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    submitButton.hidden = currentStep !== steps.length - 1;
    setMessage();
    dialog.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
    steps[currentStep].querySelector("h3")?.focus({ preventScroll: true });
  }

  function validateStep(step = steps[currentStep], focusErrors = true) {
    const fields = [...step.querySelectorAll("input, textarea, select")];
    validateAttachments(fields.find((field) => field.name === "attachments"));
    fields.forEach(clearFieldError);
    const errors = fields.filter((field, index) => !field.checkValidity() &&
      (field.type !== "radio" || fields.findIndex((candidate) => candidate.name === field.name) === index)).map((field) => {
      const text = fieldError(field);
      setFieldError(field, text);
      return { field, text };
    });

    showErrorSummary(errors);
    setMessage();
    if (!errors.length) return true;
    if (focusErrors) {
      errorSummary.focus();
      errorSummary.scrollIntoView({ block: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" });
    }
    return false;
  }

  function validateAllSteps() {
    for (let index = 0; index < steps.length; index += 1) {
      if (validateStep(steps[index], false)) continue;
      currentStep = index;
      updateStep();
      validateStep(steps[index]);
      return false;
    }
    return true;
  }

  function addReviewItem(title, value, editStep, wide = false) {
    const item = document.createElement("dl");
    item.className = `review-item${wide ? " wide" : ""}`;
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    const termLabel = document.createElement("span");
    const editButton = document.createElement("button");
    termLabel.textContent = title;
    editButton.type = "button";
    editButton.className = "review-edit";
    editButton.dataset.editStep = String(editStep);
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit ${title.toLowerCase()}`);
    term.append(termLabel, editButton);
    description.textContent = value || "Not provided";
    item.append(term, description);
    reviewSummary.append(item);
  }

  function buildReview() {
    reviewSummary.replaceChildren();
    addReviewItem("Contact", `${valueOf("contact_name")} · ${valueOf("email")}`, 0);
    addReviewItem("Business", valueOf("business_name"), 0);
    addReviewItem("The problem", valueOf("problem"), 1, true);
    addReviewItem("Desired outcome", valueOf("desired_outcome"), 2, true);
    addReviewItem("Essential first release", valueOf("first_release"), 3, true);
    addReviewItem("Expected investment", valueOf("budget"), 4);
    addReviewItem("Preferred timing", valueOf("timing"), 4);
    addReviewItem("Working arrangement", valueOf("delivery_model"), 5, true);
    addReviewItem("Complete when", valueOf("acceptance_criteria"), 6, true);
  }

  function technicalSection(title, items) {
    const content = items.map((item) => {
      const source = item.source ? ` (Source: ${item.source})` : "";
      return `- [${item.status.toUpperCase()}] ${item.statement}${source}`;
    }).join("\n");
    return `${title}\n${"-".repeat(title.length)}\n${content}`;
  }

  function technicalAnswer(fieldName, missingStatement) {
    const answer = valueOf(fieldName);
    return answer
      ? { status: "confirmed", statement: answer, source: fieldName }
      : { status: "unknown", statement: missingStatement };
  }

  function technicalRecommendation(statement) {
    return { status: "recommendation", statement };
  }

  function createStructuredProject(projectReference, submittedAt, clarificationQuestions) {
    const customerFieldNames = [
      "contact_name", "email", "phone", "business_name", "business_description", "problem",
      "current_process", "problem_impact", "desired_outcome", "users", "existing_systems",
      "data_needs", "first_release", "optional_requirements", "future_ideas",
      "excluded_functionality", "budget", "timing", "timing_context", "delivery_model",
      "day_to_day_owner", "ongoing_support", "acceptance_criteria", "constraints", "additional_notes"
    ];
    const originalAnswers = {};
    customerFieldNames.forEach((name) => { originalAnswers[name] = valueOf(name); });
    originalAnswers.privacy_consent = form.elements.namedItem("privacy_consent")?.checked === true;
    originalAnswers.submissionMetadata = {
      submissionId: projectReference,
      submittedAt,
      updatedAt: submittedAt,
      status: "submitted",
      source: { page: window.location.pathname, campaign: null }
    };
    const files = [...(form.elements.namedItem("attachments")?.files || [])];
    originalAnswers.attachments = files.map((file, index) => {
      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "-").slice(-255) || `attachment-${index + 1}`;
      return {
        attachmentId: `${projectReference}-ATT-${index + 1}`,
        originalFilename: file.name,
        storedFilename: safeName,
        mimeType: file.type || attachmentMimeTypes[(file.name.split(".").pop() || "").toLowerCase()],
        sizeBytes: file.size,
        storageLocation: "email-delivery-service",
        validationStatus: "pending"
      };
    });
    originalAnswers.processing = {
      interpretationStatus: "complete",
      generatedDocumentReferences: {
        customerSummary: "email:customer_friendly_project_summary",
        technicalSpecification: "email:technical_requirements_specification_internal",
        internalBrief: "email:lang_systems_project_brief_internal"
      },
      clarificationQuestions,
      emailDeliveryStatus: "pending",
      manualReviewStatus: "not_started",
      internalNotes: []
    };
    return intakeModel.createSubmission(originalAnswers);
  }

  function buildDocuments() {
    const projectReference = intakeModel.newSubmissionId();
    const submittedAt = new Date().toISOString();
    const structuredProject = createStructuredProject(projectReference, submittedAt, []);
    const clarificationReview = window.LangSystemsClarificationQuestions.generate(structuredProject);
    const openQuestions = [
      ...clarificationReview.customerFollowUp.requiredBeforeEstimation,
      ...clarificationReview.customerFollowUp.requiredBeforeDevelopment,
      ...clarificationReview.customerFollowUp.helpfulButNonBlocking
    ];
    structuredProject.processing.clarificationQuestions = openQuestions;
    const generatedCustomerSummary = customerSummaryGenerator.generate(structuredProject);

    const unknown = (statement) => ({ status: "unknown", statement });
    const assumption = (statement) => ({ status: "assumption", statement });
    const businessContext = technicalAnswer("business_description", "The business context is unknown.");
    const problem = technicalAnswer("problem", "The business problem is unknown.");
    const process = technicalAnswer("current_process", "The current process is unknown.");
    const impact = technicalAnswer("problem_impact", "The business impact is unknown.");
    const outcome = technicalAnswer("desired_outcome", "The desired outcome is unknown.");
    const users = technicalAnswer("users", "User types are unknown.");
    const firstRelease = technicalAnswer("first_release", "Essential first-release requirements are unknown.");
    const later = technicalAnswer("optional_requirements", "Later enhancements have not been provided.");
    const future = technicalAnswer("future_ideas", "Future ideas have not been provided.");
    const exclusions = technicalAnswer("excluded_functionality", "Explicit exclusions have not been confirmed.");
    const data = technicalAnswer("data_needs", "Existing data sources and data requirements are unknown.");
    const integrations = technicalAnswer("existing_systems", "Integration requirements are unknown.");
    const constraints = technicalAnswer("constraints", "Additional platform or operational constraints are unknown.");
    const acceptance = technicalAnswer("acceptance_criteria", "Acceptance criteria are unknown.");
    const technicalRequirements = [
      "INTERNAL TECHNICAL REQUIREMENTS SPECIFICATION",
      "INTERNAL - Lang Systems authorised personnel only",
      `Project reference: ${projectReference}`,
      `Generated at: ${submittedAt}`,
      "Customer approved: No",
      "Internal discovery document for manual review; not customer-approved scope, a quote, a contract, or permission to begin development.",
      "Status key: CONFIRMED = supplied customer information; ASSUMPTION = requires review; RECOMMENDATION = non-binding technical guidance; UNKNOWN = customer confirmation or investigation required.",
      technicalSection("Project overview", [businessContext, problem, outcome]),
      technicalSection("Business problem", [problem, process, impact]),
      technicalSection("Project goals", [outcome]),
      technicalSection("Non-goals", [exclusions]),
      technicalSection("User types", [users]),
      technicalSection("User journeys", [process, outcome]),
      technicalSection("Functional requirements", [firstRelease]),
      technicalSection("Essential first-release requirements", [firstRelease]),
      technicalSection("Later enhancements", [later, future]),
      technicalSection("Explicit exclusions", [exclusions]),
      technicalSection("Proposed data entities", [technicalRecommendation("Identify candidate data entities from confirmed workflows and information needs during technical discovery; names and fields are not yet confirmed.")]),
      technicalSection("Likely data relationships", [technicalRecommendation("Map relationships, ownership, lifecycle, retention, and authoritative sources after candidate data entities are confirmed.")]),
      technicalSection("Existing data sources", [data]),
      technicalSection("Data-import requirements", [unknown("Import formats, volumes, cleansing, mapping, validation, reconciliation, and cutover requirements have not been confirmed.")]),
      technicalSection("Integration requirements", [integrations]),
      technicalSection("File and document requirements", [unknown("File upload, generated document, format, size, retention, scanning, and export requirements have not been confirmed.")]),
      technicalSection("Authentication considerations", [unknown("Authentication method, identity provider, session rules, account recovery, and multi-factor requirements have not been confirmed.")]),
      technicalSection("Permission and role considerations", [unknown("Roles, permissions, approval boundaries, and least-privilege rules have not been confirmed.")]),
      technicalSection("Reporting requirements", [unknown("Reports, dashboards, exports, measures, filters, and audiences have not been confirmed.")]),
      technicalSection("Notification requirements", [unknown("Notification events, recipients, channels, templates, retry behaviour, and delivery evidence have not been confirmed.")]),
      technicalSection("Offline requirements", [unknown("Offline operation and synchronisation requirements have not been confirmed.")]),
      technicalSection("Device requirements", [unknown("Required device types, screen sizes, assistive technologies, and managed-device constraints have not been confirmed.")]),
      technicalSection("Platform constraints", [constraints]),
      technicalSection("Security considerations", [unknown("Security controls, threat assumptions, audit needs, and incident requirements need customer confirmation.")]),
      technicalSection("Privacy considerations", [unknown("Data classification, residency, consent, access, retention, deletion, and privacy obligations need customer confirmation.")]),
      technicalSection("Performance considerations", [unknown("Usage volumes, concurrency, response-time targets, availability, and capacity limits have not been confirmed.")]),
      technicalSection("Backup and recovery considerations", [unknown("Backup scope, recovery point, recovery time, restore testing, and continuity requirements have not been confirmed.")]),
      technicalSection("Deployment considerations", [technicalRecommendation("Select hosting, environments, release controls, monitoring, and rollback arrangements after constraints are confirmed; no technology stack is selected here.")]),
      technicalSection("Support considerations", [technicalAnswer("ongoing_support", "Support hours, service targets, maintenance ownership, escalation, training, and handover requirements have not been confirmed.")]),
      technicalSection("Acceptance criteria", [acceptance, technicalRecommendation("Rewrite agreed criteria as observable pass/fail checks during manual review without changing the customer's intended outcome.")]),
      technicalSection("Assumptions", [
        assumption("This interpretation requires Lang Systems and customer review; no inferred item is approved scope."),
        assumption("Requests after agreed scope will be assessed as future work or a formal variation.")
      ]),
      technicalSection("Dependencies", [integrations, data, constraints]),
      technicalSection("Risks", [assumption("Unconfirmed requirements may change scope, estimation, acceptance criteria, or delivery planning.")]),
      technicalSection("Conflicts or contradictions", clarificationReview.contradictions.length
        ? clarificationReview.contradictions.map((conflict) => ({ status: "unknown", statement: conflict.summary, source: conflict.sourcePaths.join(", ") }))
        : [technicalRecommendation("No conflict was identified automatically. Compare the original answers and clarify any inconsistent wording during manual review.")]),
      technicalSection("Open technical questions", openQuestions.length
        ? openQuestions.map((question) => ({ status: "unknown", statement: question }))
        : [technicalRecommendation("No automatic gaps were identified; confirm all assumptions during discovery.")]),
      technicalSection("Recommended investigation tasks", [
        technicalRecommendation("Validate first-release workflow boundaries and testable acceptance criteria with the customer before estimation."),
        technicalRecommendation("Investigate the data, integration, identity, permissions, security, privacy, performance, recovery, deployment, and support gaps recorded above."),
        technicalRecommendation("Complete manual Lang Systems review before estimation, scope agreement, task decomposition, or development.")
      ])
    ].join("\n\n");

    const internalBrief = window.LangSystemsInternalProjectBrief.buildBrief(structuredProject);

    return {
      projectReference,
      customerSummary: generatedCustomerSummary.text,
      customerSummaryDocument: generatedCustomerSummary,
      structuredProject,
      technicalRequirements,
      internalBrief: internalBrief.renderedText,
      clarificationQuestions: clarificationReview.renderedInternal,
      clarificationQuestionItems: openQuestions,
      clarificationReview
    };
  }

  function appendGenerated(formData, documents) {
    const structuredProject = documents.structuredProject;
    formData.append("project_reference", documents.projectReference);
    formData.append("structured_project_data_json", intakeModel.serialiseSubmission(structuredProject));
    formData.append("customer_friendly_project_summary", documents.customerSummary);
    formData.append("customer_friendly_project_summary_html", documents.customerSummaryDocument.html);
    formData.append("technical_requirements_specification_internal", documents.technicalRequirements);
    formData.append("lang_systems_project_brief_internal", documents.internalBrief);
    formData.append("clarification_questions_internal", documents.clarificationQuestions);
    formData.append("submission_schema_version", intakeModel.SCHEMA_VERSION);
    formData.append("submission_template_version", intakeModel.TEMPLATE_VERSION);
    formData.append("submitted_at_utc", structuredProject.submissionMetadata.submittedAt);
    formData.append("processing_generation_warnings", "No processing or generation warnings reported by the browser generators.");
  }

  function isIntakeHistoryEntry() {
    return window.history.state?.[historyStateKey] === true;
  }

  function openDialog(trigger = null, addHistoryEntry = true) {
    if (dialog.open) return;
    if (trigger) lastTrigger = trigger;
    document.body.classList.remove("nav-open");
    document.querySelector(".nav-toggle")?.setAttribute("aria-expanded", "false");

    if (addHistoryEntry && !isIntakeHistoryEntry()) {
      window.history.pushState(
        { ...(window.history.state || {}), [historyStateKey]: true },
        "",
        intakeHash
      );
    }

    dialog.showModal();
    updateStep();
  }

  function requestClose({ syncHistory = true, confirmDirty = true } = {}) {
    if (confirmDirty && !submissionComplete && formDirty && !window.confirm("Close project discovery? Your answers will stay available in this tab, including after a refresh, until you submit or close the tab.")) return;
    submissionController?.abort();
    dialog.close();
    if (syncHistory && isIntakeHistoryEntry()) window.history.back();
  }

  function submissionFailureMessage(error) {
    if (!navigator.onLine) return "Your connection appears to be offline. Your answers are still here. Reconnect, then choose Send project outline again.";
    if (error?.code === "timeout") return "Sending took longer than expected, so we could not confirm whether your outline arrived. Your answers are still here. Please wait a moment before trying again, or contact us by email.";
    if (error?.code === "rate_limited") return "There have been several recent attempts. Your answers are still here. Please wait a minute, then try again.";
    if (error?.code === "duplicate_submission") return "This project outline may already have been received. We have not sent it again. Please contact us by email if you would like us to confirm.";
    if (error?.code === "payload") return "We could not prepare the outline for sending. Your answers are still here. Please review the highlighted information and try again.";
    if (error?.code === "configuration") return "The submission service is not available on this website. Your answers are still saved in this tab. Please contact us by email while we restore the service.";
    if (error?.code === "email_delivery" && error?.reference) {
      const customerSent = error.delivery?.customer === "sent";
      const internalSent = error.delivery?.internal === "sent";
      if (customerSent || internalSent) return `We recorded a delivery problem after receiving reference ${error.reference}, so we cannot show a completed confirmation. Please do not send the outline again right now. Contact us and quote this reference so we can check it safely.`;
      return `We could not complete email delivery for reference ${error.reference}, so your submission is not confirmed. Your answers are still here. Please try again in a few minutes or contact us and quote the reference.`;
    }
    if (["storage", "email_delivery", "temporary_server"].includes(error?.code)) return "Our submission service is temporarily unavailable. Your answers are still here. Please try again in a few minutes, or contact us by email.";
    if (error?.code === "network") return "The connection was lost before we could confirm delivery. Your answers are still here. Please wait a moment before trying again, or contact us by email.";
    return "We could not send your project outline just now. Your answers are still here. Please try again, or contact us by email.";
  }

  function showSubmissionFailure(text) {
    const heading = document.createElement("h4");
    const copy = document.createElement("p");
    const email = document.createElement("a");
    heading.textContent = "Your project outline has not been confirmed";
    copy.textContent = text;
    email.href = "mailto:langsystemsdesign@outlook.com";
    email.textContent = "Email Lang Systems";
    errorSummary.replaceChildren(heading, copy, email);
    errorSummary.hidden = false;
    errorSummary.focus();
  }

  wireFieldDescriptions();
  const restoredDraft = intakeDraft.restore(window, form, steps.length - 1);
  if (restoredDraft) {
    currentStep = restoredDraft.currentStep;
    formDirty = true;
    if (currentStep === steps.length - 1) buildReview();
  }

  openButtons.forEach((button) => {
    button.addEventListener("click", () => openDialog(button));
  });

  closeButtons.forEach((button) => button.addEventListener("click", requestClose));
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    requestClose();
  });
  dialog.addEventListener("close", () => lastTrigger?.focus());
  window.addEventListener("popstate", () => {
    if (isIntakeHistoryEntry()) {
      openDialog(null, false);
      return;
    }

    if (!dialog.open) return;
    if (!submissionComplete && formDirty && !window.confirm("Close project discovery? Your answers will stay available in this tab, including after a refresh, until you submit or close the tab.")) {
      window.history.forward();
      return;
    }
    requestClose({ syncHistory: false, confirmDirty: false });
  });

  nextButton.addEventListener("click", () => {
    if (!validateStep()) return;
    if (currentStep >= steps.length - 1) return;
    currentStep = Math.min(currentStep + 1, steps.length - 1);
    if (currentStep === steps.length - 1) buildReview();
    intakeDraft.save(window, form, currentStep);
    updateStep();
  });

  backButton.addEventListener("click", () => {
    currentStep = Math.max(0, currentStep - 1);
    intakeDraft.save(window, form, currentStep);
    updateStep();
  });

  reviewSummary.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-step]");
    if (!editButton) return;
    currentStep = Number(editButton.dataset.editStep);
    intakeDraft.save(window, form, currentStep);
    updateStep();
  });

  printConfirmationButton?.addEventListener("click", () => {
    if (!confirmedReference) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert("Your browser blocked the print view. Please allow pop-ups for this page and try again.");
      return;
    }
    printWindow.opener = null;
    const title = printWindow.document.createElement("title");
    const style = printWindow.document.createElement("style");
    const main = printWindow.document.createElement("main");
    title.textContent = `Lang Systems submission confirmation ${confirmedReference}`;
    style.textContent = "body{max-width:760px;margin:40px auto;padding:0 24px;color:#17212b;font:16px/1.55 Arial,sans-serif}h1{font-size:28px}h2{font-size:20px;margin-top:28px}.reference{padding:18px;border:2px solid #5d25d9;border-radius:8px;font-size:20px}.notice{padding:16px;background:#f1f4f8;border-left:4px solid #5d25d9}@media print{body{margin:0;max-width:none}}";
    const heading = printWindow.document.createElement("h1");
    const received = printWindow.document.createElement("p");
    const reference = printWindow.document.createElement("p");
    const nextHeading = printWindow.document.createElement("h2");
    const nextSteps = printWindow.document.createElement("p");
    const notice = printWindow.document.createElement("p");
    heading.textContent = "Project outline received";
    received.textContent = `Lang Systems received the project outline for ${valueOf("business_name")}.`;
    reference.className = "reference";
    reference.textContent = `Submission reference: ${confirmedReference}`;
    nextHeading.textContent = "What happens next";
    nextSteps.textContent = "Lang Systems will review the information and may ask follow-up questions. Scope, pricing and timing must be reviewed and agreed separately.";
    notice.className = "notice";
    notice.textContent = "This submission is an enquiry, not a binding agreement. It does not accept the project, approve scope or pricing, start development, or guarantee a completion date.";
    main.append(heading, received, reference, nextHeading, nextSteps, notice);
    printWindow.document.head.append(title, style);
    printWindow.document.body.append(main);
    printWindow.focus();
    printWindow.print();
  });

  downloadSummaryButton?.addEventListener("click", () => {
    if (!pendingDocuments?.customerSummaryDocument) return;
    const documentOutput = pendingDocuments.customerSummaryDocument;
    const url = URL.createObjectURL(new Blob([documentOutput.printableHtml], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = documentOutput.filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  form.addEventListener("input", (event) => {
    formDirty = true;
    pendingDocuments = null;
    clearFieldError(event.target);
    errorSummary.hidden = true;
    setMessage();
    intakeDraft.save(window, form, currentStep);
  });

  form.addEventListener("change", () => intakeDraft.save(window, form, currentStep));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submissionComplete || submissionInProgress || !validateAllSteps()) return;
    const now = Date.now();
    if (now - lastAttemptAt < 2000) {
      showSubmissionFailure("Please wait a moment before trying again. Your answers are still here.");
      return;
    }
    lastAttemptAt = now;
    submissionInProgress = true;

    submitButton.disabled = true;
    submitButton.textContent = "Sending…";
    backButton.disabled = true;
    form.setAttribute("aria-busy", "true");
    setMessage("Sending your project outline securely…");

    const formData = new FormData(form);
    pendingDocuments ||= buildDocuments();
    appendGenerated(formData, pendingDocuments);
    submissionController = new AbortController();

    try {
      const result = await submissionService.submit({ endpoint: form.action, formData, signal: submissionController.signal });
      if (!result.reference || result.reference !== pendingDocuments.projectReference) {
        throw new Error("The confirmed submission reference did not match the prepared outline.");
      }

      submissionComplete = true;
      intakeDraft.clear(window);
      confirmedReference = result.reference;
      confirmationEmail.textContent = valueOf("email");
      confirmationBusiness.textContent = valueOf("business_name");
      confirmationReference.textContent = confirmedReference;
      confirmationSummaryText.textContent = pendingDocuments.customerSummary;
      const correctionSubject = encodeURIComponent(`Correction for project submission ${confirmedReference}`);
      const contactSubject = encodeURIComponent(`Project submission ${confirmedReference}`);
      correctionLink.href = `mailto:langsystemsdesign@outlook.com?subject=${correctionSubject}`;
      contactReferenceLink.href = `mailto:langsystemsdesign@outlook.com?subject=${contactSubject}`;
      intakeHeaderEyebrow.textContent = "Submission confirmation";
      intakeHeaderTitle.textContent = "Your project outline has been received.";
      intakeHeaderDescription.textContent = "Keep your submission reference in case you need to contact us about this enquiry.";
      form.hidden = true;
      dialog.querySelector(".intake-progress").hidden = true;
      successPanel.hidden = false;
      summaryActions.hidden = false;
      successPanel.focus();
    } catch (error) {
      setMessage();
      if (error?.name === "AbortError") {
        submitButton.disabled = false;
        submitButton.textContent = "Send project outline";
        return;
      }
      showSubmissionFailure(submissionFailureMessage(error));
      submitButton.disabled = false;
      submitButton.textContent = "Send project outline";
    } finally {
      submissionInProgress = false;
      backButton.disabled = false;
      form.removeAttribute("aria-busy");
      submissionController = null;
    }
  });
})();
