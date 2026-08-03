(() => {
  const dialog = document.querySelector("[data-intake-dialog]");
  const form = document.querySelector("[data-intake-form]");
  const submissionService = window.LangSystemsIntakeSubmission;
  const intakeModel = window.LangSystemsIntakeModel;
  const customerSummaryGenerator = window.LangSystemsCustomerSummary;

  if (!dialog || !form || !submissionService || !intakeModel || !customerSummaryGenerator || typeof dialog.showModal !== "function") return;

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
  const confirmationEmail = dialog.querySelector("[data-confirmation-email]");
  const summaryActions = dialog.querySelector("[data-summary-actions]");
  const printSummaryButton = dialog.querySelector("[data-print-summary]");
  const downloadSummaryButton = dialog.querySelector("[data-download-summary]");
  let currentStep = 0;
  let lastTrigger = null;
  let submissionComplete = false;
  let formDirty = false;
  let submissionController = null;
  let submissionInProgress = false;
  let pendingDocuments = null;
  let lastAttemptAt = 0;
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

  function section(title, rows) {
    const content = rows
      .map(([label, value]) => `${label}: ${value || "Not provided"}`)
      .join("\n");
    return `${title}\n${"-".repeat(title.length)}\n${content}`;
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
    const openQuestions = [];

    if (!valueOf("existing_systems")) openQuestions.push("Are there existing systems or services the solution must connect with?");
    if (!valueOf("data_needs")) openQuestions.push("What business information will the solution need to read, store, or produce?");
    if (!valueOf("excluded_functionality")) openQuestions.push("Is there any related functionality that should be explicitly outside the first release?");
    if (!valueOf("constraints")) openQuestions.push("Are there privacy, security, accessibility, approval, location, device, or industry requirements to consider?");
    if (!valueOf("timing_context")) openQuestions.push("Is the preferred timing linked to a fixed date or external dependency?");
    if (valueOf("delivery_model") === "Recommendation required") openQuestions.push("Which ownership and payment arrangement best fits the business and likely solution?");
    if (valueOf("budget").startsWith("Not sure")) openQuestions.push("What investment range is practical once the first release options are explained?");
    if (!valueOf("optional_requirements")) openQuestions.push("Which useful additions should be recorded for a later release?");

    const submittedAt = new Date().toISOString();
    const structuredProject = createStructuredProject(projectReference, submittedAt, openQuestions);
    const generatedCustomerSummary = customerSummaryGenerator.generate(structuredProject);

    const technicalRequirements = [
      `Project reference: ${projectReference}`,
      section("Users and business workflow", [
        ["User groups", valueOf("users")],
        ["Current workflow", valueOf("current_process")],
        ["Target outcome", valueOf("desired_outcome")]
      ]),
      section("Included first-release requirements", [["Required capabilities", valueOf("first_release")]]),
      section("Optional requirements", [["Later capabilities", valueOf("optional_requirements")]]),
      section("Future enhancements", [["Ideas", valueOf("future_ideas")]]),
      section("Excluded functionality", [["Exclusions", valueOf("excluded_functionality")]]),
      section("Systems and information", [
        ["Existing systems / integrations", valueOf("existing_systems")],
        ["Information / data", valueOf("data_needs")]
      ]),
      section("Non-functional requirements and constraints", [["Known constraints", valueOf("constraints")]]),
      section("Completion and acceptance criteria", [["Acceptance", valueOf("acceptance_criteria")]]),
      section("Assumptions", [
        ["Scope status", "Discovery input only; the first-release scope remains subject to clarification and written agreement"],
        ["Changes", "Requests after scope approval will be assessed as future work or a formal variation"],
        ["Sensitive information", "The customer confirmed that no passwords, payment details, health records, or other highly sensitive information were included"]
      ]),
      section("Open questions", openQuestions.length ? openQuestions.map((q, i) => [`${i + 1}`, q]) : [["Status", "No automatic gaps identified; confirm all assumptions during discovery"]])
    ].join("\n\n");

    const internalBrief = [
      `Project reference: ${projectReference}`,
      section("Lead", [
        ["Contact", valueOf("contact_name")],
        ["Email", valueOf("email")],
        ["Phone", valueOf("phone")],
        ["Organisation", valueOf("business_name")]
      ]),
      section("Commercial fit", [
        ["Customer preference", valueOf("delivery_model")],
        ["Budget expectation", valueOf("budget")],
        ["Timing", valueOf("timing")],
        ["Timing driver", valueOf("timing_context")],
        ["Day-to-day owner", valueOf("day_to_day_owner")],
        ["Support expectation", valueOf("ongoing_support")]
      ]),
      section("Discovery assessment", [
        ["Problem", valueOf("problem")],
        ["Business impact", valueOf("problem_impact")],
        ["Outcome", valueOf("desired_outcome")],
        ["First release", valueOf("first_release")],
        ["Additional notes", valueOf("additional_notes")]
      ]),
      section("Recommended next action", [["Action", "Review the generated requirements and open questions, then schedule clarification before estimating or agreeing scope"]])
    ].join("\n\n");

    return {
      projectReference,
      customerSummary: generatedCustomerSummary.text,
      customerSummaryDocument: generatedCustomerSummary,
      structuredProject,
      technicalRequirements,
      internalBrief,
      clarificationQuestions: openQuestions.length ? openQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n") : "No automatic gaps identified; confirm all assumptions during discovery.",
      clarificationQuestionItems: openQuestions
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
    formData.set("_autoresponse", documents.customerSummary);
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
    if (confirmDirty && !submissionComplete && formDirty && !window.confirm("Close project discovery? Your answers will stay available until you leave or refresh this page.")) return;
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
    if (!submissionComplete && formDirty && !window.confirm("Close project discovery? Your answers will stay available until you leave or refresh this page.")) {
      window.history.forward();
      return;
    }
    requestClose({ syncHistory: false, confirmDirty: false });
  });

  nextButton.addEventListener("click", () => {
    if (!validateStep()) return;
    currentStep += 1;
    if (currentStep === steps.length - 1) buildReview();
    updateStep();
  });

  backButton.addEventListener("click", () => {
    currentStep = Math.max(0, currentStep - 1);
    updateStep();
  });

  reviewSummary.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-step]");
    if (!editButton) return;
    currentStep = Number(editButton.dataset.editStep);
    updateStep();
  });

  printSummaryButton?.addEventListener("click", () => {
    if (!pendingDocuments?.customerSummaryDocument) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setMessage("Your browser blocked the print view. Please allow pop-ups for this page and try again.", true);
      return;
    }
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(pendingDocuments.customerSummaryDocument.printableHtml);
    printWindow.document.close();
    printWindow.addEventListener("load", () => {
      printWindow.focus();
      printWindow.print();
    }, { once: true });
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
  });

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
      await submissionService.submit({ endpoint: form.action, formData, signal: submissionController.signal });

      submissionComplete = true;
      confirmationEmail.textContent = valueOf("email");
      form.hidden = true;
      dialog.querySelector(".intake-progress").hidden = true;
      successPanel.hidden = false;
      summaryActions.hidden = false;
      successPanel.focus();
    } catch (error) {
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
