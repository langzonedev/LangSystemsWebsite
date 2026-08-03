# Project intake submission workflow audit

Audit date: 3 August 2026

## Finding

Production submission fails because the website is deployed as static GitHub Pages content while the form targets the same-origin `/api/project-submissions`. The endpoint override in `index.html` is empty, and the repository has no GitHub Pages Function, deployment workflow, serverless manifest, or production adapter mounting `server/intake-endpoint.js`. GitHub Pages serves files only, so the POST reaches no application route and receives a static-host error/non-JSON response. Storage and both email operations are therefore never reached.

The Node backend is implemented and tested, but only `server/local-intake-server.js` mounts it. That server is a local helper, not a production deployment. Mock email is the non-production default and makes no provider requests.

The UI symptoms had separate client causes:

- `.button { display: inline-flex }` could override native rendering of `hidden`, exposing both Continue and Send on Review. Continue then incremented beyond the eight-step array; `Step 9 of 8` was written before access to the missing step threw.
- The failure handler rendered an error but did not clear “Sending your project outline securely…”.
- Answers existed only in the DOM, so refresh discarded them.

The client repairs add an authoritative `[hidden]` rule, bounded navigation, failure-status cleanup, a specific missing-route/configuration error, and tab-scoped draft recovery. Files and the honeypot are not persisted; the draft clears after confirmed success.

## Complete request path

1. `intake.js` handles Review form submission and blocks repeated/in-progress attempts.
2. `validateAllSteps()` applies native constraints, consent, error summaries, and attachment metadata limits.
3. The browser generates an `LS-...` reference and timestamp, schema-v3 submission, customer summary, technical specification, internal brief, and clarification questions. `intake-service.js` builds `{ submission, documents, honeypot }`; file contents are excluded.
4. Endpoint precedence is `window.LangSystemsConfig.intakeEndpoint`, the endpoint meta value, then the form action. Current production resolves to `https://langsystems.com.au/api/project-submissions`.
5. The method is `POST`.
6. Headers are `Accept: application/json` and `Content-Type: application/json`; cross-origin deployment requires CORS preflight.
7. The intended route is `createIntakeEndpoint()` in `server/intake-endpoint.js`; only the local helper mounts it.
8. The route checks exact origin, handles `OPTIONS`, requires POST/JSON, limits body size, parses JSON, accepts honeypots silently, validates schema and attachment metadata, and applies rate/duplicate guards.
9. The browser-generated value is sent as an idempotency key. The server derives an opaque public reference with a secret HMAC and generates a separate internal UUID.
10. The submission store creates a private record before email. It retains the normalised original submission, hashes the public reference for its path, randomises document filenames, and rejects conflicting reuse of an idempotency key.
11. Email delivery sends the customer confirmation first and internal notification second, recording recipients independently.
12. Live delivery uses the configured HTTPS provider, durable delivery status, and per-recipient idempotency keys.
13. A new complete submission returns HTTP 201; an idempotent replay returns 200. Partial email processing returns 202 success because storage is complete. Responses include `submissionReference`, `receivedAt`, `processingStatus`, and independent email states.
14. The frontend accepts only explicit success with a server reference and displays that reference in its confirmation. Rejected requests map to safe errors, restore controls, clear sending status, and retain the draft on the device.

## Production correction implemented

`render.yaml` now deploys the static site and existing Node handler together. The same-origin `/api/project-submissions` route is included in production, and a one-instance persistent disk supports the atomic file stores. The server binds to the platform host in production, exposes `/healthz`, handles graceful shutdown, and remains loopback-only by default in development.

The endpoint normalises input, strips unsafe control characters, validates attachment references, derives a non-sequential public reference from a server secret and idempotency key, creates a separate internal UUID, and fingerprints content to reject conflicting key reuse. Concurrent matching requests share one processing operation. Storage completes before email. Complete processing returns structured `201`/`200` JSON; partial email processing returns structured `202` success with independent recipient states because the enquiry is safely stored.

Required production configuration:

- `NODE_ENV=production`, `INTAKE_EMAIL_MODE=live`
- `RESEND_API_KEY` (or `EMAIL_API_KEY`), `EMAIL_FROM`, `INTAKE_INTERNAL_EMAIL`, `LANG_SYSTEMS_CONTACT_EMAIL`
- optional HTTPS `EMAIL_PROVIDER_URL` and `INTAKE_REVIEW_BASE_URL`
- exact `INTAKE_ALLOWED_ORIGIN=https://langsystems.com.au` for cross-origin hosting
- absolute durable private `INTAKE_STATUS_FILE` and `INTAKE_STORAGE_DIR`, or equivalent injected durable adapters
- `INTAKE_ADMIN_TOKEN` of at least 32 random characters if internal retrieval is deployed
- `INTAKE_REFERENCE_SECRET` of at least 32 random characters

Secrets belong in the host secret manager, never HTML, source, logs, or analytics. The Blueprint generates the admin and reference secrets and leaves `RESEND_API_KEY` for secure operator entry. The bundled file adapters require the declared single persistent instance/volume; multi-instance or ephemeral serverless hosting needs durable atomic adapters. GitHub Pages alone cannot meet these requirements.

## Production test plan

1. Run `powershell -NoProfile -ExecutionPolicy Bypass -File tests/intake-contract.Tests.ps1` with Node available so static and runtime suites run.
2. In local mock mode, complete all eight steps and verify a matching success reference. Test consent, invalid/oversized files, timeout, offline, rapid repeat, non-JSON/404, and refresh recovery; files must be selected again.
3. In staging, verify routing or CORS preflight, method/content-type/size/origin rejection, storage-before-delivery, and responses without payload logging.
4. Submit non-sensitive live data. Confirm private storage, both emails, matching references, delivery status, and confirmation UI, including provider events and junk folders.
5. Force one recipient failure, confirm `202` acceptance with `email_processing_failed`, restart the service, then retry the same idempotency key and prove only the failed recipient sends.
6. Verify keyboard/screen-reader announcements, one primary action per step, `Step 8 of 8` on Review, cleared sending status after failure, draft removal after success, and retention/deletion operations.
