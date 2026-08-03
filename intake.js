(() => {
  const dialog = document.querySelector("[data-intake-dialog]");
  const form = document.querySelector("[data-intake-form]");
  const submissionService = window.LangSystemsIntakeSubmission;
  const intakeModel = window.LangSystemsIntakeModel;

  if (!dialog || !form || !submissionService || !intakeModel || typeof dialog.showModal !== "function") return;

  const steps = [...form.querySelectorAll("[data-step]")];
  const openButtons = [...document.querySelectorAll("[data-open-intake]")];
  const closeButtons = [...dialog.querySelectorAll("[data-close-intake]")];
  const backButton = form.querySelector("[data-form-back]");
  const nextButton = form.querySelector("[data-form-next]");
  const submitButton = form.querySelector("[data-form-submit]");
  const message = form.querySelector("[data-form-message]");
  const progressBar = dialog.querySelector("[data-progress-bar]");
  const progressTrack = dialog.querySelector("[data-progress-track]");
  const stepLabel = dialog.querySelector("[data-step-label]");
  const stepName = dialog.querySelector("[data-step-name]");
  const stepAnnouncement = dialog.querySelector("[data-step-announcement]");
  const reviewSummary = form.querySelector("[data-review-summary]");
  const successPanel = dialog.querySelector("[data-intake-success]");
  const confirmationEmail = dialog.querySelector("[data-confirmation-email]");
  let currentStep = 0;
  let lastTrigger = null;
  let submissionComplete = false;
  let formDirty = false;
  let submissionController = null;

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
    additional_notes: "Additional notes"
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

  function validateStep() {
    const fields = [...steps[currentStep].querySelectorAll("input, textarea, select")];
    fields.forEach((field) => {
      field.removeAttribute("aria-invalid");
      updateDescription(field, message.id, false);
    });
    const invalid = fields.find((field) => !field.checkValidity());

    if (!invalid) return true;

    invalid.setAttribute("aria-invalid", "true");
    updateDescription(invalid, message.id, true);
    const label = fieldLabels[invalid.name] || "This question";
    const text = invalid.validity.typeMismatch
      ? `Please enter a valid email address for “${label}”.`
      : `Please complete “${label}” before continuing.`;
    setMessage(text, true);
    invalid.focus();
    return false;
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

    const customerSummary = [
      `Project reference: ${projectReference}`,
      section("Business context", [
        ["Organisation", valueOf("business_name")],
        ["Business", valueOf("business_description")],
        ["People affected", valueOf("users")]
      ]),
      section("What needs to change", [
        ["Current problem", valueOf("problem")],
        ["Current process", valueOf("current_process")],
        ["Impact", valueOf("problem_impact")],
        ["Desired outcome", valueOf("desired_outcome")]
      ]),
      section("First release", [
        ["Essential", valueOf("first_release")],
        ["Useful later", valueOf("optional_requirements")],
        ["Future ideas", valueOf("future_ideas")],
        ["Not included", valueOf("excluded_functionality")],
        ["Complete when", valueOf("acceptance_criteria")]
      ])
    ].join("\n\n");

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
      customerSummary,
      technicalRequirements,
      internalBrief,
      clarificationQuestions: openQuestions.length ? openQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n") : "No automatic gaps identified; confirm all assumptions during discovery.",
      clarificationQuestionItems: openQuestions
    };
  }

  function appendGenerated(formData, documents) {
    const customerFieldNames = [
      "contact_name", "email", "phone", "business_name", "business_description", "problem",
      "current_process", "problem_impact", "desired_outcome", "users", "existing_systems",
      "data_needs", "first_release", "optional_requirements", "future_ideas",
      "excluded_functionality", "budget", "timing", "timing_context", "delivery_model",
      "day_to_day_owner", "ongoing_support", "acceptance_criteria", "constraints", "additional_notes"
    ];
    const originalAnswers = {};
    customerFieldNames.forEach((name) => { originalAnswers[name] = valueOf(name); });
    const now = new Date().toISOString();
    originalAnswers.submissionMetadata = {
      submissionId: documents.projectReference,
      submittedAt: now,
      updatedAt: now,
      status: "submitted",
      source: { page: window.location.pathname, campaign: null }
    };
    originalAnswers.attachments = [];
    originalAnswers.processing = {
      interpretationStatus: "complete",
      generatedDocumentReferences: {
        customerSummary: "email:customer_friendly_project_summary",
        technicalSpecification: "email:technical_requirements_specification_internal",
        internalBrief: "email:lang_systems_project_brief_internal"
      },
      clarificationQuestions: documents.clarificationQuestionItems,
      emailDeliveryStatus: "pending",
      manualReviewStatus: "not_started",
      internalNotes: []
    };
    const structuredProject = intakeModel.createSubmission(originalAnswers);
    formData.append("project_reference", documents.projectReference);
    formData.append("structured_project_data_json", intakeModel.serialiseSubmission(structuredProject));
    formData.append("customer_friendly_project_summary", documents.customerSummary);
    formData.append("technical_requirements_specification_internal", documents.technicalRequirements);
    formData.append("lang_systems_project_brief_internal", documents.internalBrief);
    formData.append("clarification_questions_internal", documents.clarificationQuestions);
    formData.append("submission_schema_version", intakeModel.SCHEMA_VERSION);
    formData.append("submission_template_version", intakeModel.TEMPLATE_VERSION);
    formData.append("submitted_at_utc", structuredProject.submissionMetadata.submittedAt);
  }

  function requestClose() {
    if (!submissionComplete && formDirty && !window.confirm("Close project discovery? Your answers will stay available until you leave or refresh this page.")) return;
    submissionController?.abort();
    dialog.close();
  }

  wireFieldDescriptions();

  openButtons.forEach((button) => {
    button.addEventListener("click", () => {
      lastTrigger = button;
      document.body.classList.remove("nav-open");
      document.querySelector(".nav-toggle")?.setAttribute("aria-expanded", "false");
      dialog.showModal();
      updateStep();
    });
  });

  closeButtons.forEach((button) => button.addEventListener("click", requestClose));
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    requestClose();
  });
  dialog.addEventListener("close", () => lastTrigger?.focus());

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

  form.addEventListener("input", (event) => {
    formDirty = true;
    event.target.removeAttribute("aria-invalid");
    updateDescription(event.target, message.id, false);
    setMessage();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateStep()) return;

    submitButton.disabled = true;
    submitButton.textContent = "Sending…";
    backButton.disabled = true;
    form.setAttribute("aria-busy", "true");
    setMessage("Sending your project outline securely…");

    const formData = new FormData(form);
    appendGenerated(formData, buildDocuments());
    submissionController = new AbortController();

    try {
      await submissionService.submit({ endpoint: form.action, formData, signal: submissionController.signal });

      submissionComplete = true;
      confirmationEmail.textContent = valueOf("email");
      form.hidden = true;
      dialog.querySelector(".intake-progress").hidden = true;
      successPanel.hidden = false;
      successPanel.focus();
    } catch (error) {
      if (error?.name === "AbortError") {
        submitButton.disabled = false;
        submitButton.textContent = "Send project outline";
        return;
      }
      setMessage("We could not send your project outline just now. Please try again, or email langs​ystemsdesign@outlook.com if the problem continues.".replace("​", ""), true);
      submitButton.disabled = false;
      submitButton.textContent = "Send project outline";
    } finally {
      backButton.disabled = false;
      form.removeAttribute("aria-busy");
      submissionController = null;
    }
  });
})();
