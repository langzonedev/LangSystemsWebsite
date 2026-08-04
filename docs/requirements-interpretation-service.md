# Plain-English Requirements Interpretation Service

Status: Implemented for controlled server-side use  
Schema version: 1.0.0  
Instruction template version: 1.0.0

## Purpose and boundary

`server/requirements-interpreter.js` converts a validated schema 3.0.0 or 3.1.0 intake submission into a
consistent requirements interpretation for Lang Systems staff. It is a discovery aid only. Its
output is never customer-approved scope, a quote, a technology decision, a delivery commitment, or
permission to begin work. A Lang Systems reviewer must confirm facts, resolve questions, and agree
scope with the customer.

The service does not create Kanban cards, approve projects, or send messages. The existing static
email submission remains unchanged. A future private server endpoint may call the service after
`server/intake-validation.js` has accepted a submission.

## Output contract

The versioned JSON Schema is `server/requirements-interpretation.schema.json`. It requires all 23
sections listed in the approved card. Each statement is labelled as one of:

- `confirmed`: directly supported by one or more `customerAnswers` paths;
- `assumption`: a reviewable interpretation, not a customer fact;
- `recommendation`: non-binding guidance for human review; or
- `unknown`: information the customer has not supplied.

Open questions include separate boolean flags for whether the missing information blocks
estimation, scope agreement, or development. Metadata records schema, instruction-template and
model versions, generation mode, generation time, and an explicit `customerApproved: false` value.

## Calling the service

The service has no package dependencies:

```js
const { interpretSubmission } = require("./server/requirements-interpreter.js");

const result = await interpretSubmission(validatedSubmission, {
  modelClient,
  modelVersion: process.env.REQUIREMENTS_MODEL_VERSION
});
```

`modelClient` is optional. It must expose an asynchronous `generateRequirements(request)` method.
The request contains the versioned instruction, minimised business answers, and the JSON response
schema. Provider credentials belong in the private runtime environment and must never be passed in
the submission or committed. The adapter is responsible for configuring its provider secret and
using a provider/data region approved by Lang Systems.

The interpreter deliberately excludes contact name, email, phone, business name, attachments,
submission identifiers, source attribution, and processing notes from model input. Do not log the
request, response, customer answers, or model input. Do not send attachment content to the model.

## Failure handling

When no model adapter is configured, the model is unavailable, or returned output is malformed, the
service returns a validated deterministic interpretation. The fallback maps confirmed answers to
their source paths, marks gaps unknown, and creates material clarification questions. Cancellation
is returned as a `cancelled` error instead of starting fallback work. Invalid intake submissions are
rejected before interpretation.

Callers should store the output only in approved private systems, retain the recorded versions, and
present fallback output as requiring the same human review as model output. They should expose only
privacy-safe operational error codes and must not put customer content into logs, URLs, analytics,
or public issue trackers.

## Checks

Run all project checks from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/intake-contract.Tests.ps1
```
