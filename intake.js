(() => {
  const dialog = document.querySelector("[data-intake-dialog]");
  const form = document.querySelector("[data-intake-form]");

  if (!dialog || !form || typeof dialog.showModal !== "function") return;

  const steps = [...form.querySelectorAll("[data-step]")];
  const openButtons = [...document.querySelectorAll("[data-open-intake]")];
  const closeButtons = [...dialog.querySelectorAll("[data-close-intake]")];
  const backButton = form.querySelector("[data-form-back]");
  const nextButton = form.querySelector("[data-form-next]");
  const submitButton = form.querySelector("[data-form-submit]");
  const message = form.querySelector("[data-form-message]");
  const progressBar = dialog.querySelector("[data-progress-bar]");
  const stepLabel = dialog.querySelector("[data-step-label]");
  const stepName = dialog.querySelector("[data-step-name]");
  const reviewSummary = form.querySelector("[data-review-summary]");
  const successPanel = dialog.querySelector("[data-intake-success]");
  const confirmationEmail = dialog.querySelector("[data-confirmation-email]");
  let currentStep = 0;
  let lastTrigger = null;
  let submissionComplete = false;
  let formDirty = false;

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

  function updateStep() {
    steps.forEach((step, index) => { step.hidden = index !== currentStep; });
    stepLabel.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    stepName.textContent = steps[currentStep].dataset.stepName;
    progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    backButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    submitButton.hidden = currentStep !== steps.length - 1;
    setMessage();
    dialog.scrollTo({ top: 0, behavior: "smooth" });
    steps[currentStep].querySelector("h3")?.focus({ preventScroll: true });
  }

  function validateStep() {
    const fields = [...steps[currentStep].querySelectorAll("input, textarea, select")];
    fields.forEach((field) => field.removeAttribute("aria-invalid"));
    const invalid = fields.find((field) => !field.checkValidity());

    if (!invalid) return true;

    invalid.setAttribute("aria-invalid", "true");
    const label = fieldLabels[invalid.name] || "This question";
    const text = invalid.validity.typeMismatch
      ? `Please enter a valid email address for “${label}”.`
      : `Please complete “${label}” before continuing.`;
    setMessage(text, true);
    invalid.focus();
    return false;
  }

  function addReviewItem(title, value, wide = false) {
    const item = document.createElement("dl");
    item.className = `review-item${wide ? " wide" : ""}`;
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = title;
    description.textContent = value || "Not provided";
    item.append(term, description);
    reviewSummary.append(item);
  }

  function buildReview() {
    reviewSummary.replaceChildren();
    addReviewItem("Contact", `${valueOf("contact_name")} · ${valueOf("email")}`);
    addReviewItem("Business", valueOf("business_name"));
    addReviewItem("The problem", valueOf("problem"), true);
    addReviewItem("Desired outcome", valueOf("desired_outcome"), true);
    addReviewItem("Essential first release", valueOf("first_release"), true);
    addReviewItem("Expected investment", valueOf("budget"));
    addReviewItem("Preferred timing", valueOf("timing"));
    addReviewItem("Working arrangement", valueOf("delivery_model"), true);
    addReviewItem("Complete when", valueOf("acceptance_criteria"), true);
  }

  function section(title, rows) {
    const content = rows
      .map(([label, value]) => `${label}: ${value || "Not provided"}`)
      .join("\n");
    return `${title}\n${"-".repeat(title.length)}\n${content}`;
  }

  function buildDocuments() {
    const projectReference = `LS-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`;
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
      clarificationQuestions: openQuestions.length ? openQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n") : "No automatic gaps identified; confirm all assumptions during discovery."
    };
  }

  function appendGenerated(formData, documents) {
    const structuredProject = {
      schemaVersion: "1.0",
      projectReference: documents.projectReference,
      contact: {
        name: valueOf("contact_name"),
        email: valueOf("email"),
        phone: valueOf("phone"),
        organisation: valueOf("business_name")
      },
      discovery: {
        businessDescription: valueOf("business_description"),
        problem: valueOf("problem"),
        currentProcess: valueOf("current_process"),
        impact: valueOf("problem_impact"),
        desiredOutcome: valueOf("desired_outcome"),
        users: valueOf("users"),
        existingSystems: valueOf("existing_systems"),
        dataNeeds: valueOf("data_needs")
      },
      scope: {
        includedFirstRelease: valueOf("first_release"),
        optional: valueOf("optional_requirements"),
        future: valueOf("future_ideas"),
        excluded: valueOf("excluded_functionality"),
        acceptanceCriteria: valueOf("acceptance_criteria")
      },
      commercial: {
        budget: valueOf("budget"),
        timing: valueOf("timing"),
        timingContext: valueOf("timing_context"),
        deliveryModel: valueOf("delivery_model"),
        dayToDayOwner: valueOf("day_to_day_owner"),
        ongoingSupport: valueOf("ongoing_support")
      },
      constraints: valueOf("constraints"),
      additionalNotes: valueOf("additional_notes")
    };
    formData.append("project_reference", documents.projectReference);
    formData.append("structured_project_data_json", JSON.stringify(structuredProject, null, 2));
    formData.append("customer_friendly_project_summary", documents.customerSummary);
    formData.append("technical_requirements_specification_internal", documents.technicalRequirements);
    formData.append("lang_systems_project_brief_internal", documents.internalBrief);
    formData.append("clarification_questions_internal", documents.clarificationQuestions);
    formData.append("submission_schema_version", "1.0");
    formData.append("submitted_at_utc", new Date().toISOString());
  }

  function requestClose() {
    if (!submissionComplete && formDirty && !window.confirm("Close project discovery? Your answers will not be saved.")) return;
    dialog.close();
  }

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

  form.addEventListener("input", (event) => {
    formDirty = true;
    event.target.removeAttribute("aria-invalid");
    setMessage();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateStep()) return;

    submitButton.disabled = true;
    submitButton.textContent = "Sending…";
    setMessage("Sending your project outline securely…");

    const formData = new FormData(form);
    appendGenerated(formData, buildDocuments());

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" }
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) throw new Error("Submission service rejected the request");

      submissionComplete = true;
      confirmationEmail.textContent = valueOf("email");
      form.hidden = true;
      dialog.querySelector(".intake-progress").hidden = true;
      successPanel.hidden = false;
      successPanel.focus();
    } catch (_error) {
      setMessage("We could not send your project outline just now. Please try again, or email langs​ystemsdesign@outlook.com if the problem continues.".replace("​", ""), true);
      submitButton.disabled = false;
      submitButton.textContent = "Send project outline";
    }
  });
})();
