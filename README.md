# Lang Systems Website

Static company website for Lang Systems.

Lang Systems is positioned as a technology-focused software company that takes ideas
through to production-ready applications, including custom software, system
integration, workflow automation, and future product development.

## Project documentation

- [Client Project Intake Workflow Project Anchor](docs/project-anchor.md)
- [Client Project Intake Architecture and Design](docs/project-intake-architecture.md)
- [Customer Project Discovery Journey](docs/customer-project-discovery-journey.md)
- [Plain-English Client Discovery Question Set](docs/client-discovery-question-set.md)
- [Structured Project Intake Data Model](docs/project-intake-data-model.md)
- [Plain-English Requirements Interpretation Service](docs/requirements-interpretation-service.md)
- [Internal Technical Requirements Specification Generator](docs/internal-technical-requirements-specification.md)
- [Internal Project Brief Generator](docs/internal-project-brief.md)
- [Targeted Project Clarification Question Generator](docs/clarification-question-generator.md)
- [Secure Submission Storage and Internal Retrieval](docs/secure-submission-storage.md)
- [Project Intake Submission Workflow Audit](docs/project-intake-submission-audit.md)
- [Project Intake Production Roadmap](docs/project-intake-production-roadmap.md)
- [Project Scope, Acceptance and Delivery Template Pack](docs/project-scope-acceptance-delivery-templates.md)

## Current hosting and production intake delivery

The public site remains on GitHub Pages and the questionnaire uses `api` mode to submit securely to
the production Cloudflare Worker. The Worker stores the validated submission and generated documents
in D1 before Resend sends the customer confirmation and the internal copy to
`langsystemsdesign@outlook.com`. The email-client package generator remains in the codebase as a
controlled rollback option; it is not shown as the primary production action.

See the [Project Intake Production Roadmap](docs/project-intake-production-roadmap.md) for deployment
evidence, rollback steps, and the remaining operational improvements.

## Target hosting

The public website remains on GitHub Pages. A small Cloudflare Worker in
[`worker/index.ts`](worker/index.ts) provides the cross-origin `/api/project-submissions` endpoint,
and Cloudflare D1 stores the original submission, generated documents, delivery state, and audit
events before Resend is called. This keeps the initial production path within the intended free
tiers and avoids moving the website DNS.

## Local Preview

Open `index.html` in a browser, or run a small static server from the repo root:

```powershell
python -m http.server 4173
```

## Target production project intake email

The discovery wizard posts JSON to `/api/project-submissions`. The intake API validates the shared
submission model, sends a branded customer confirmation and a detailed internal email, and records
metadata-only status for each recipient. If one email fails, a repeat request with the same project
reference retries only the failed recipient. Provider idempotency keys also protect live retries
from duplicate sends within the provider's supported window. Supporting file names and sizes are included as
references; file contents are not emailed or retained by this service.

Development defaults to safe mock delivery and makes no provider requests:

```powershell
$env:INTAKE_EMAIL_MODE="mock"
$env:INTAKE_STATUS_FILE="C:\tmp\lang-systems-delivery-status.json"
node server/local-intake-server.js
```

Then open `http://127.0.0.1:8787`. This legacy local Node entry point remains useful for
dependency-free contract tests. The production target is declared in `wrangler.jsonc` and uses the
D1 migration in `migrations/0001_initial.sql`.

For Cloudflare production, configure:

- `NODE_ENV=production` and `INTAKE_EMAIL_MODE=live`
- `RESEND_API_KEY` (or `EMAIL_API_KEY`) and optionally `EMAIL_PROVIDER_URL`
- `EMAIL_FROM`, `INTAKE_INTERNAL_EMAIL`, and `LANG_SYSTEMS_CONTACT_EMAIL`
- the `INTAKE_DB` D1 binding
- a secret `INTAKE_REFERENCE_SECRET` of at least 32 characters
- optional `INTAKE_REVIEW_BASE_URL` for a secure internal review link

See [.env.example](.env.example) for non-secret examples. Never place real values in that file or
client-side code. Production refuses to process a submission without explicit live mode, an API key,
a reference secret, and D1. Do not log request bodies or customer content. See
[Secure Submission Storage and Internal Retrieval](docs/secure-submission-storage.md) for retention,
customer deletion requests, and backup requirements; the authenticated Worker review surface is a
later roadmap item.

The response contains a server-generated `submissionReference`, receipt timestamp, processing
status, and independent customer/internal email states. A stored submission remains successful if
an email needs a later retry. The browser-generated value is only an idempotency key; it is not the
public reference or the internal storage identifier.

After deployment, submit one non-sensitive test project and inspect both mailboxes (including junk
folders), branding, links, and the recorded statuses. If email processing is partial, the stored
record and delivery status retain the reference for safe operational follow-up; completed recipients
are not sent again during an idempotent retry. In-progress answers are stored in the customer's
browser local storage on that device so a refresh or browser restart can recover the draft. Selected file contents are never
stored and must be reselected after a refresh. Customers can clear saved answers in the wizard;
otherwise the draft is removed only after a confirmed submission. If browser recovery is unavailable,
use the reference and status record for manual follow-up—do not copy customer content into logs or
issue trackers.

## Checks

Run the dependency-free intake contract checks from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/intake-contract.Tests.ps1
pnpm test:worker
pnpm typecheck:worker
pnpm worker:deploy:dry
```

The browser application is static and has no compilation step. A production check consists of
running the contract checks and serving the repository root with the local preview command above.
When Node.js is available, the same command also runs the validation, transport, endpoint, email,
and document-generator runtime tests; otherwise it reports that the server runtime portion was
skipped. Before launch, manually verify keyboard and screen-reader
error announcements, an unsupported/oversized file, offline and timeout recovery, and a successful
live provider delivery in a supported browser.
