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
- [Project Scope, Acceptance and Delivery Template Pack](docs/project-scope-acceptance-delivery-templates.md)

## GitHub Pages

The site is designed to be hosted from the repository root on GitHub Pages.

- Temporary URL: `https://langzonedev.github.io/LangSystemsWebsite/`
- Future domain placeholder: `langsystems.com.au`
- Contact placeholder: `hello@langsystems.com.au`

## Local Preview

Open `index.html` in a browser, or run a small static server from the repo root:

```powershell
python -m http.server 4173
```

## Project intake email

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

Then open `http://127.0.0.1:8787`. This development server serves the static site and the mock API
on one origin. It is a local verification helper, not a production web server.

Production must host the API behind the form's same-origin path, or populate the public
`lang-systems-intake-endpoint` meta value in `index.html` with an HTTPS API URL during deployment
(setting `window.LangSystemsConfig.intakeEndpoint` before `intake-service.js` is also supported). A
cross-origin deployment must set `INTAKE_ALLOWED_ORIGIN` to the exact website origin. Configure:

- `NODE_ENV=production` and `INTAKE_EMAIL_MODE=live`
- `RESEND_API_KEY` (or `EMAIL_API_KEY`) and optionally `EMAIL_PROVIDER_URL`
- `EMAIL_FROM`, `INTAKE_INTERNAL_EMAIL`, and `LANG_SYSTEMS_CONTACT_EMAIL`
- an absolute `INTAKE_STATUS_FILE`, or inject a durable status-store adapter
- an absolute `INTAKE_STORAGE_DIR` outside the public site on platform-encrypted storage
- a secret `INTAKE_ADMIN_TOKEN` of at least 32 characters
- optional `INTAKE_REVIEW_BASE_URL` for a secure internal review link

See [.env.example](.env.example) for non-secret examples. Never place real values in that file or
client-side code. Production refuses to start without explicit live mode, an API key, and durable
status and submission storage. The status file contains delivery metadata; the separate submission
storage contains customer answers and generated documents. Restrict both to the service account,
keep them outside the public website directory, and do not enable request-body logging or tracing.
The internal API retrieves a known reference and updates a constrained review status; it has no
public list or customer portal. See [Secure Submission Storage and Internal Retrieval](docs/secure-submission-storage.md)
for commands, HTTPS/access controls, retention, customer deletion requests, and backup timing.

After deployment, submit one non-sensitive test project and inspect both mailboxes (including junk
folders), branding, links, and the recorded statuses. To recover a partial failure, use the wizard's
Retry action while its answers remain open; the same reference is reused and completed recipients
are not sent again. In-progress answers are stored in the customer's browser local storage on that
device so a refresh or browser restart can recover the draft. Selected file contents are never
stored and must be reselected after a refresh. Customers can clear saved answers in the wizard;
otherwise the draft is removed only after a confirmed submission. If browser recovery is unavailable,
use the reference and status record for manual follow-up—do not copy customer content into logs or
issue trackers.

## Checks

Run the dependency-free intake contract checks from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/intake-contract.Tests.ps1
```

The browser application is static and has no compilation step. A production check consists of
running the contract checks and serving the repository root with the local preview command above.
When Node.js is available, the same command also runs the validation, transport, endpoint, email,
and document-generator runtime tests; otherwise it reports that the server runtime portion was
skipped. Before launch, manually verify keyboard and screen-reader
error announcements, an unsupported/oversized file, offline and timeout recovery, and a successful
live provider delivery in a supported browser.
