((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LangSystemsSubmissionState = api;
})(typeof window !== "undefined" ? window : globalThis, () => {
  "use strict";

  const states = Object.freeze({
    IDLE: "idle",
    VALIDATING: "validating",
    SUBMITTING: "submitting",
    RECEIVED: "submission_received",
    PROCESSING: "processing",
    FAILED: "submission_failed",
    EMAIL_PARTIAL: "email_partially_failed",
    COMPLETE: "complete"
  });

  const transitions = Object.freeze({
    [states.IDLE]: Object.freeze({ validate: states.VALIDATING }),
    [states.VALIDATING]: Object.freeze({ invalid: states.IDLE, submit: states.SUBMITTING }),
    [states.SUBMITTING]: Object.freeze({ received: states.RECEIVED, fail: states.FAILED }),
    [states.RECEIVED]: Object.freeze({ process: states.PROCESSING }),
    [states.PROCESSING]: Object.freeze({ partial: states.EMAIL_PARTIAL, complete: states.COMPLETE, fail: states.FAILED }),
    [states.FAILED]: Object.freeze({ retry: states.VALIDATING, edit: states.IDLE }),
    [states.EMAIL_PARTIAL]: Object.freeze({ retry: states.VALIDATING }),
    [states.COMPLETE]: Object.freeze({})
  });

  function create(initialState = states.IDLE) {
    if (!transitions[initialState]) throw new Error(`Unknown submission state: ${initialState}`);
    let current = initialState;
    return Object.freeze({
      get state() { return current; },
      transition(event) {
        const next = transitions[current][event];
        if (!next) throw new Error(`Invalid submission transition: ${current} -> ${event}`);
        current = next;
        return current;
      }
    });
  }

  return Object.freeze({ states, transitions, create });
}));
