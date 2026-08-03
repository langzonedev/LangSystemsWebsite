(() => {
  "use strict";

  class IntakeSubmissionError extends Error {
    constructor(message, code, cause) {
      super(message, { cause });
      this.name = "IntakeSubmissionError";
      this.code = code;
    }
  }

  async function submit({ endpoint, formData, signal, timeoutMs = 20000 }) {
    let url;
    let timeout;

    try {
      window.LangSystemsIntakeModel.parseSubmission(formData.get("structured_project_data_json"));
    } catch (error) {
      throw new IntakeSubmissionError("Please review the project outline before sending it.", "payload", error);
    }

    try {
      url = new URL(endpoint, window.location.href);
    } catch (error) {
      throw new IntakeSubmissionError("The submission service is not configured correctly.", "configuration", error);
    }

    if (url.protocol !== "https:") {
      throw new IntakeSubmissionError("The submission service must use a secure connection.", "configuration");
    }

    const controller = new AbortController();
    const abortForCaller = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener("abort", abortForCaller, { once: true });

    try {
      timeout = window.setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url.href, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result || result.success === false) {
        const safeCodes = ["duplicate_submission", "storage", "email_delivery", "temporary_server", "rate_limited"];
        const providerCode = result && safeCodes.includes(result.code) ? result.code :
          (response.status === 409 ? "duplicate_submission" : response.status === 429 ? "rate_limited" :
            (response.status >= 500 ? "temporary_server" : "rejected"));
        throw new IntakeSubmissionError("The submission service did not accept the project outline.", providerCode);
      }

      return result;
    } catch (error) {
      if (error instanceof IntakeSubmissionError) throw error;
      if (signal?.aborted) throw error;
      if (error?.name === "AbortError") {
        throw new IntakeSubmissionError("The submission took longer than expected.", "timeout", error);
      }
      throw new IntakeSubmissionError("The submission service could not be reached.", "network", error);
    } finally {
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", abortForCaller);
    }
  }

  window.LangSystemsIntakeSubmission = Object.freeze({ submit });
})();
