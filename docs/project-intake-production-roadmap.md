# Project intake production roadmap

Status date: 4 August 2026

## Current production operation

The public website remains hosted by GitHub Pages and the questionnaire is configured for `api`
delivery to the verified Cloudflare Worker. The Worker validates and stores the original submission
and generated documents in D1 before Resend sends the customer acknowledgement and internal copy.
The server-issued reference is the only reference shown as confirmed.

The self-contained HTML package and customer-controlled email path remain implemented for a
deliberate rollback to `email-client` mode. They are not presented as a competing production action.
Supporting-file contents are still excluded; only validated names, types, and sizes are recorded.

## Phase 1 — Prepare production delivery (complete)

- Approve Resend's privacy, retention, security, processing-location, and reliability terms.
- Add and verify the dedicated `send.langsystems.com.au` sending subdomain with SPF and DKIM.
- Create a restricted Resend API key and store it only as a Cloudflare Worker secret.
- Use `Lang Systems <projects@send.langsystems.com.au>` as the verified sender.
- Keep `INTAKE_INTERNAL_EMAIL` and `LANG_SYSTEMS_CONTACT_EMAIL` set to
  `langsystemsdesign@outlook.com`.
- Confirm the public privacy notice, 18-month enquiry retention policy, deletion process, mailbox
  ownership, backup coverage, and staff response procedure.

Exit criteria: the sending domain is verified, secrets and operational policies are approved, and
no credential appears in source, browser code, logs, or analytics.

Completed on 3 August 2026: the corrected Cloudflare account is connected through project-specific
Wrangler profile `langsystems-correct`; the project is pinned to account
`a1cd88dd75366462838a0839581f03d6`; and production D1 database `lang-systems-intake` was created in
region OC. Resend verified `send.langsystems.com.au`, and the restricted API key plus random
reference secret are stored only as Worker secrets.

## Phase 2 — Deploy and test the Worker (complete)

- Apply `migrations/0001_initial.sql` to the remote D1 database.
- Add `RESEND_API_KEY` and a random `INTAKE_REFERENCE_SECRET` using `wrangler secret put`; never put
  either value in `wrangler.jsonc`, HTML, source, logs, or chat.
- Deploy the API to its Cloudflare `workers.dev` hostname. Keep the public website on GitHub Pages.
- Confirm `/healthz`, exact-origin CORS for `https://langsystems.com.au`, storage-before-email,
  request size limits, rate limiting, opaque references, and structured logs without customer data.
- Run the full automated suite and complete a non-sensitive staging questionnaire.
- Verify private storage occurs before email, both emails carry matching references, partial failure
  remains recoverable, repeat requests do not duplicate successful recipients, and no request body
  is logged.

Exit criteria: health, storage, internal Outlook delivery, customer acknowledgement, retry,
accessibility, and junk-folder checks all pass with recorded evidence.

Deployment evidence, 3 August 2026: Worker
`https://lang-systems-intake.langsystemsdesign.workers.dev` passed `/healthz`. Controlled submission
`LS-9PDZQPW1XZWTJB0U` returned HTTP 201, was stored as `awaiting_review` in the OC D1 primary, and
both customer and internal Resend deliveries succeeded on their first attempt. The mailbox owner
confirmed that both Outlook messages arrived.

## Phase 3 — Production cutover (complete)

- Keep GitHub Pages and the existing website DNS unchanged.
- Put the deployed Worker URL in the `lang-systems-intake-endpoint` meta value.
- Change the public `lang-systems-intake-mode` meta value from `email-client` to `api`.
- Deploy, confirm TLS, check `/healthz`, and repeat the non-sensitive end-to-end test on the public
  domain.
- Retain the download package generator as an operator-approved recovery option, but do not show two
  competing primary submission actions in normal production operation.

Exit criteria: a customer submission is durably stored, reaches `langsystemsdesign@outlook.com`, sends
the customer acknowledgement, displays only the server-issued reference as confirmed, and survives
a controlled partial-email failure without duplicate delivery.

Completed on 3 August 2026: pull request 1 was merged to `main`, GitHub Pages deployed commit
`b15cd64ae13682ec5959d6a64eec1b8f0511ed55`, and the public site returned HTTP 200 with `api` mode
and the production Worker endpoint. The Worker health check passed, and an `OPTIONS` preflight from
`https://langsystems.com.au` returned HTTP 204 with that exact allowed origin. The customer
confirmation was shortened to a friendly project snapshot; the full server reference remains only
as a quiet receipt for support and audit correlation.

## Phase 4 — Operate and improve

The first human-reviewed AI handoff increment is implemented: the internal email carries matching
Markdown and JSON bundles that are ready for review and later manual use in an approved GPT project.
The customer acknowledgement remains separate and attachment-free. Bundle generation is local to
the existing Worker and does not call a model or add a paid service.

- Monitor Worker health, D1 usage, provider failures, delivery status, and mailbox coverage.
- Add scheduled retention cleanup, encrypted exports/backups, an authenticated internal review
  surface, and the deletion register before storing material enquiry volume.
- Review provider, privacy, retention, abuse controls, accessibility, browser support, and recovery
  tests at least annually and after material changes.
- Add Cloudflare Turnstile if real traffic or logs show automated form abuse beyond the current
  honeypot and D1 rate limit.

## Phase 5 — Assisted artifact workflow (future)

- Evaluate the reviewed bundle against representative enquiries and define quality checks for
  requirements, traceability, architecture, UML, security, testing, and Codex handoff artifacts.
- Add an authenticated internal review surface with approve, return-for-clarification, redact, and
  export controls. Keep the stored submission and versioned bundle as source evidence.
- Optionally use LangFlow or a Kanban-style workflow for orchestration and visibility after the
  human approval gate; do not make it the system of record.
- Introduce model API calls only after privacy terms, access control, audit, data retention, failure
  recovery, model evaluation, and explicit spend limits are approved.

Exit criteria: a reviewer can approve a privacy-checked bundle, deliberately invoke artifact
generation, inspect traceability and unknowns, and reject or correct the result before Codex use.

## Phase 6 — Controlled end-to-end automation (long-term option)

- Consider customer-to-artifact and artifact-to-Codex automation only after the assisted workflow
  has reliable quality evidence.
- Require human approval at commercial scope, architecture, implementation, security, acceptance,
  and release gates until separately authorised and demonstrably safe to reduce them.
- Add per-project budgets, rate and usage caps, kill switches, audit trails, rollback, isolated build
  environments, automated tests, security review, and release controls.

This phase is not current behaviour and is not promised to customers. Its exit criteria and costs
must be approved before implementation.

## Rollback

If production routing, storage, or email acceptance fails, change intake mode back to
`email-client`, redeploy the static fallback, preserve any already stored references for manual
follow-up, and do not ask customers to resubmit a reference that may already have been received.
