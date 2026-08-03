(() => {
  "use strict";

  class IntakeSubmissionError extends Error {
    constructor(message, cause) {
      super(message, { cause });
      this.name = "IntakeSubmissionError";
    }
  }

  async function submit({ endpoint, formData, signal }) {
    let url;

    try {
      window.LangSystemsIntakeModel.parseSubmission(formData.get("structured_project_data_json"));
    } catch (error) {
      throw new IntakeSubmissionError("Please review the project outline before sending it.", error);
    }

    try {
      url = new URL(endpoint, window.location.href);
    } catch (error) {
      throw new IntakeSubmissionError("The submission service is not configured correctly.", error);
    }

    if (url.protocol !== "https:") {
      throw new IntakeSubmissionError("The submission service must use a secure connection.");
    }

    try {
      const response = await fetch(url.href, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
        signal
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result || result.success === false) {
        throw new IntakeSubmissionError("The submission service did not accept the project outline.");
      }

      return result;
    } catch (error) {
      if (error?.name === "AbortError" || error instanceof IntakeSubmissionError) throw error;
      throw new IntakeSubmissionError("The submission service could not be reached.", error);
    }
  }

  window.LangSystemsIntakeSubmission = Object.freeze({ submit });
})();
