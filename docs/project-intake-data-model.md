# Structured Project Intake Data Model

Status: Source of truth for schema 3.1.0
Last reviewed: 3 August 2026  
Owner: Lang Systems

## Purpose

`intake-model.js` is the shared frontend/backend contract for project discovery submissions. It
normalises customer input, constructs a versioned record, validates it, and serialises it without
mixing customer statements with generated or internal material. The current static site includes
the record in the email submission. `server/intake-validation.js` is the server-boundary adapter
that must be called before a future endpoint stores, processes, or forwards a request.

The model is an intake record, not a CRM, contract, quote, customer account, or project decision.

## Top-level contract

| Property | Type | Purpose |
| --- | --- | --- |
| `submissionMetadata` | object | Identity, timestamps, lifecycle status, versions, and non-sensitive attribution |
| `customerAnswers` | object | Normalised answers supplied by the customer; generated content never belongs here |
| `attachments` | array | File metadata and safety state; never file contents or public download URLs |
| `processing` | object | Interpretation state, generated-document references, clarification questions, delivery/review state, and internal notes |

### Submission metadata

`submissionMetadata` contains `submissionId`, ISO 8601 UTC `submittedAt` and `updatedAt`, `status`,
`schemaVersion`, `templateVersion`, and `source`. Status is one of `draft`, `submitted`, `received`,
`under_review`, `awaiting_clarification`, `qualified`, `declined`, or `archived`.

`source.page` is a path without query-string or fragment data. `source.campaign` is an optional
non-sensitive identifier. Never copy a complete URL, arbitrary referrer, email address, answer, or
tracking payload into source metadata.

### Original customer answers

All original answers are under `customerAnswers`:

- `customer`: `name`, `businessName`, `emailAddress`, optional `phoneNumber`,
  `preferredContactMethod`, optional `industry`, and optional `businessLocation`. The preferred
  method remains `null` for the current template because that template does not ask the question;
  it must not be inferred from the presence of an email address.
- `currentProcess`: `businessDescription`, `description`, `currentTools`, `currentUsers`,
  `frequency`, `frustrations`, and `strengthsToPreserve`.
- `desiredOutcome`: `problemStatement`, `outcome`, `intendedUsers`, `approximateUserCount`,
  `deviceRequirements`, `locationRequirements`, `offlineRequirements`,
  `existingSystemConnections`, `existingDataSources`, `dataStoragePreference`, and
  `privacySecurityConsiderations`.
- `scope`: `essentialFirstRelease`, `usefulLater`, `futureIdeas`, `explicitExclusions`, and
  `completionCriteria`.
- `commercial`: `deliveryModelPreference`, `ownershipPreference`, `broaderMarketUsefulness`,
  `approximateBudgetRange`, `requiredDate`, `timelineFlexibility`, `timelineContext`,
  `dayToDayOwner`, `ongoingSupportPreference`, and `successMeasures`.
- `additionalContext`: `constraints`, `additionalNotes`, `visualDesignPreference`,
  `visualStyleNotes`, and `privacyConsent`.

Optional unanswered text is `null`; multi-value answers are arrays. Values such as “Not sure” are
preserved as customer answers and are not converted into assumptions.

### Attachments

Each optional attachment has `attachmentId`, `originalFilename`, `storedFilename`, `mimeType`,
`sizeBytes`, `storageLocation`, and `validationStatus`. Validation status is `pending`, `accepted`,
`rejected`, `malware_detected`, or `scan_failed`. The model permits at most 10 files of PDF, Word,
Excel, CSV, text, PNG, or JPEG type, with a limit of 10 MiB per file.

The static first release sends approved attachments through the configured email-delivery provider.
Browser checks are for friendly early feedback only. A replacement server must allocate the identifier
and safe stored filename, keep storage private, verify actual content and size rather than trusting the
filename or browser MIME type, scan for malware, and set the safety result before delivery. An original
filename must never be used as a storage path. A storage location must be an internal key, not a public URL.

### Processing information

`processing` is explicitly separate from `customerAnswers`. It contains:

- `interpretationStatus`: `not_started`, `pending`, `in_progress`, `complete`,
  `needs_clarification`, or `failed`;
- `generatedDocumentReferences.customerSummary`, `.technicalSpecification`, and `.internalBrief`;
- `clarificationQuestions` as generated/internal prompts, not customer statements;
- `emailDeliveryStatus`: `not_sent`, `pending`, `sent`, `delivered`, or `failed`;
- `manualReviewStatus`: `not_started`, `pending`, `in_progress`, or `complete`; and
- `internalNotes`, which must only be supplied by authorised staff/server processing.

The three document references support the planned customer summary, technical requirements
specification, and internal brief. They identify controlled outputs; they do not contain documents
or public locations.

## Normalisation and validation

`createSubmission(raw, options)` trims surrounding whitespace, normalises line endings, converts
empty optional answers to `null`, removes duplicate list entries, limits field lengths, strips
query strings/fragments from source pages, and applies documented defaults. It never invents a
customer answer. The existing flat HTML field names are mapped into the structured contract.

`validateSubmission(value)` returns `{ valid, errors }`. Errors contain only `path`, `code`, and a
safe message, never the rejected value. `serialiseSubmission(value)` and
`parseSubmission(jsonOrObject)` reject invalid records. Validation requires core contact,
business/process, problem/outcome/users, first-release/completion, budget/timeline, and delivery
answers and explicit privacy consent. It also checks versions, identifiers, timestamps, email shape,
maximum lengths and types, conditional phone, required-date format, enum values, and attachment
fields, approved types, counts, and sizes.

Browser validation is for usability and is not a security boundary. Any server implementation
must call `validateRequestBody` from `server/intake-validation.js` before side effects, use
`validateUpload` for each received file, and apply `createSubmissionGuard` using a privacy-safe key
derived from trusted request context. The boundary limits request size, validates file metadata,
rate-limits rapid attempts, and rejects repeat submission IDs. Production handling must also verify
attachment content, authenticate internal updates, persist rate/duplicate state across instances,
and use `safeErrorResponse` without logging request bodies or rejected values.

## Versioning and compatibility

Schema 3.1.0 adds optional `visualDesignPreference` and `visualStyleNotes` fields. It remains
compatible with stored 3.0.0 submissions, which may omit both fields. Schema 3.0.0 added required
`customerAnswers.additionalContext.privacyConsent` and approved attachment types; that change was
intentionally incompatible with 2.0.0 so a server cannot accept an outline whose consent state is
unknown.

- `schemaVersion` describes the record shape. `templateVersion` independently identifies the
  question/output wording used to collect it.
- Additive optional fields may be introduced in a compatible minor version only when old readers
  safely ignore them. A rename, removal, type change, meaning change, or new required field needs a
  new major schema version and an explicit mapper.
- Stored submissions remain immutable in their original schema. Upgrade a copy for processing;
  retain the original record and version.
- `upgradeLegacyV1` maps the previous `schemaVersion: "1.0"` browser payload into 3.1.0 without
  rewriting the historical source. Unavailable legacy answers remain `null` or empty arrays.
- Consumers must route by schema version and reject unsupported versions safely. They must not
  silently reinterpret old fields using current meanings.

## Data handling

Only collect information needed to assess and respond to the enquiry. Do not place submission
content in URLs, analytics, console/public logs, source control, or public issue trackers. Do not
include credentials or highly sensitive personal records. Restrict mailbox/storage access, define
retention and deletion periods, and review provider privacy/security terms before production use.

## Example metadata and processing

```json
{
  "submissionMetadata": {
    "submissionId": "LS-20260803010203000-abc123",
    "submittedAt": "2026-08-03T01:02:03.000Z",
    "updatedAt": "2026-08-03T01:02:03.000Z",
    "status": "submitted",
    "schemaVersion": "3.1.0",
    "templateVersion": "1.3.0",
    "source": { "page": "/", "campaign": null }
  },
  "attachments": [],
  "processing": {
    "interpretationStatus": "complete",
    "generatedDocumentReferences": {
      "customerSummary": "email:customer_friendly_project_summary",
      "technicalSpecification": "email:technical_requirements_specification_internal",
      "internalBrief": "email:lang_systems_project_brief_internal"
    },
    "clarificationQuestions": [],
    "emailDeliveryStatus": "pending",
    "manualReviewStatus": "not_started",
    "internalNotes": []
  }
}
```

The example omits `customerAnswers` for brevity and therefore is not a complete valid submission.
