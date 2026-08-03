# Targeted Project Clarification Question Generator

Status: Implemented for the first-release email workflow  
Last reviewed: 3 August 2026  
Owner: Lang Systems

## Purpose and boundary

`clarification-questions.js` reviews a validated project intake record and suggests a short,
project-relevant follow-up. It does not change customer answers, invent requirements, estimate or
approve work, contact the customer, or start development. Lang Systems must review and edit the
suggestions before customer follow-up where practical.

The default output contains at most five questions. A caller may request between one and ten when a
submission genuinely needs a different limit. Already answered topics are skipped. A clear “none”
or “not required” answer is treated as an answer unless it conflicts with another statement.

## Structured output

Questions are separated into:

- **Required before estimation** — gaps or conflicts that can materially change scope, feasibility,
  dependencies, timing or commercial fit.
- **Required before development** — operational detail such as permissions, devices, offline use,
  privacy, security and decision ownership that must be settled before implementation.
- **Helpful but non-blocking** — ownership, support and later-release preferences that improve
  planning but need not delay initial assessment.

Every internal question includes an identifier, plain-language question, internal reason, source
paths and contradiction flag. `customerFollowUp` contains the same selected questions without
internal reasons and is ready for an authorised reviewer to edit into an email. `renderedInternal`
is included in the internal submission email.

## Contradictions and failure handling

Deterministic checks flag a small set of direct conflicts, including “no integration” alongside
described synchronisation, “no offline use” alongside work without internet, desktop-only alongside
mobile use, and a required date alongside no fixed deadline. These flags prompt review; they do not
claim that every possible contradiction can be detected.

The generator first parses the submission through the shared intake model and validates its own
output. Invalid input raises `invalid_submission`; invalid generated structure raises
`generation_invalid`. Errors do not include customer answers. The existing recoverable submission
flow handles generation failure without logging customer content.

## Data handling

Generated questions and reasons remain in the internal email payload. Do not place them or customer
answers in URLs, analytics, browser storage, public logs or source control. Manual reviewers should
send only the customer-facing wording needed to resolve the identified gaps and should never request
passwords, payment details or other highly sensitive information by email.
