# Lang Systems Internal Project Brief Generator

Status: Implemented for the first-release email workflow  
Last reviewed: 3 August 2026  
Owner: Lang Systems

## Purpose and boundary

`internal-project-brief.js` generates the decision-support brief attached to the internal Lang
Systems intake email. It operates on the validated structured intake record and is not used for the
customer acknowledgement. The output is explicitly classified for authorised Lang Systems personnel.

The brief supports triage; it does not score or approve a customer, create work, produce a quote, or
authorise customer communication. Every brief requires manual review. No internal status, risk,
assumption, delivery recommendation, complexity category, or readiness decision is included in the
customer-facing summary or autoresponse.

## Contract

The versioned output contains submission identity/date, customer and business details, opportunity,
problem, current process, outcome, first/later scope, timing, budget, delivery recommendation and
reasons, reuse and intellectual-property considerations, technical/commercial risks, assumptions,
missing and contradictory information, clarification questions, complexity, three readiness decisions,
an internal status, and the suggested next action.

Customer statements use `basis: customer_evidence` and retain structured source paths. Generated
interpretation uses `basis: inference`; proposed actions use `basis: recommendation`. The complexity
category is expressly a triage aid rather than an objective score. “Not sure” budget responses are
recorded for discussion and never used alone as rejection grounds.

`validateBrief` checks the complete generated shape before the rendered email text is returned. An
invalid source submission raises `invalid_submission`; an invalid generated result raises
`generation_invalid`. Submission remains in the existing recoverable form flow if generation fails.
The corresponding portable JSON Schema is `server/internal-project-brief.schema.json`.

## Internal statuses

- Ready for initial review
- Clarification required
- Not enough information to estimate
- Suitable for bespoke-build evaluation
- Suitable for licensed-product evaluation
- Potential co-funded opportunity
- Not currently suitable
- Manual commercial review required

These statuses are non-authoritative suggestions. The deterministic generator does not currently set
“Not currently suitable”; that outcome requires authorised manual judgement.

## Operational safeguards

- Keep internal brief fields in the Lang Systems email only.
- Restrict mailbox and any future document storage to authorised personnel.
- Do not log or place brief content in analytics, URLs, public trackers, or customer outputs.
- Confirm contradictory information manually; deterministic checks only report that no contradiction
  was identified automatically.
- Validate, clarify, estimate, approve scope, agree commercial terms, and authorise development through
  the manual process.
