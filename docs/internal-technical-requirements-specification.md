# Internal Technical Requirements Specification Generator

Status: Implemented for controlled server-side use  
Specification schema version: 1.0.0  
Rendering template version: 1.0.0

## Purpose and boundary

`server/technical-specification.js` converts a validated project intake submission and its
requirements interpretation into a consistent internal technical requirements specification. The
document supports manual analysis, estimation, and later task decomposition. It is not
customer-approved scope, a quote, a contract, or authority to begin development.

The generator does not send email, publish documents, create work items, choose a technology stack,
or make commercial decisions. No generated document may be placed on the public website or in a
public issue tracker. The first release continues to use email submission and manual Lang Systems
review.

The static first-release intake also renders the same complete section set into the private
`technical_requirements_specification_internal` email field. The server module is the validated
contract for controlled processing and later provider replacement; neither path initiates work.

## Output and traceability

The machine-readable contract is `server/technical-specification.schema.json`. It includes every
required product, workflow, data, integration, non-functional, operational, risk, acceptance, and
investigation section. A separate conflicts-or-contradictions section prompts explicit manual
comparison when no conflict can be established automatically.

Every ordinary statement is labelled `confirmed`, `assumption`, `recommendation`, or `unknown`.
Confirmed statements retain their original `customerAnswers.*` source paths. Open questions record
whether each gap blocks estimation, scope agreement, or development. Metadata retains the source
submission reference and interpretation versions; `customerApproved` is always false. The plain-text
rendering repeats these labels and source paths for email or private document storage.

Generic technical guidance is deliberately marked as a recommendation. Missing authentication,
permissions, reporting, notifications, performance, recovery, deployment, support, file, and import
details remain unknown rather than being invented. The generator does not infer named data entities,
relationships, platforms, vendors, frameworks, databases, or hosting services.

## Calling the generator

The dependency-free service can run with the deterministic interpreter or with the same optional
private model adapter documented for the interpretation service:

```js
const { generateTechnicalSpecification } = require("./server/technical-specification.js");

const specification = await generateTechnicalSpecification(validatedSubmission, {
  modelClient,
  modelVersion: process.env.REQUIREMENTS_MODEL_VERSION
});

const emailText = specification.renderedText;
```

Provider credentials must remain in the private runtime environment. Do not log submissions,
interpretations, generated specifications, or model input. Store output only in an approved private
location with access and retention controls appropriate to customer information.

## Validation and failure handling

The submission is validated before interpretation. Model absence, provider errors, malformed model
output, unsafe source attribution, and schema failures use the existing validated deterministic
interpretation fallback. Invalid submissions, invalid source references, cancellation, invalid
interpretations, and invalid generated specifications return typed, privacy-safe error codes. They
must not trigger development or be treated as completed customer scope.

Callers should preserve the original submission and version metadata, show the generation mode to
reviewers, and require a human to resolve unknowns, assumptions, conflicts, risks, and questions
before estimation or decomposition.

## Checks

Run all project checks from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/intake-contract.Tests.ps1
```
