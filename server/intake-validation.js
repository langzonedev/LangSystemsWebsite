"use strict";

// Runtime-neutral server boundary. A future intake endpoint should call this before
// storing a submission, generating documents, sending email, or logging metadata.
const IntakeModel = require("../intake-model.js");

class IntakeRequestValidationError extends Error {
  constructor(errors) {
    super("The project submission did not pass server validation.");
    this.name = "IntakeRequestValidationError";
    this.statusCode = 400;
    // These contain paths and rule names only; never attach submitted values.
    this.validationErrors = errors;
  }
}

function validateRequestBody(body) {
  let submission;

  try {
    submission = typeof body === "string" ? JSON.parse(body) : body;
  } catch (_error) {
    throw new IntakeRequestValidationError([
      { path: "$", code: "invalid_json", message: "The request body must be valid JSON." }
    ]);
  }

  const result = IntakeModel.validateSubmission(submission);
  if (!result.valid) throw new IntakeRequestValidationError(result.errors);
  return submission;
}

module.exports = Object.freeze({ IntakeRequestValidationError, validateRequestBody });
