# Secure project submission storage and internal retrieval

## Scope and data flow

The intake API durably stores the validated original structured submission before sending email. It also stores server-generated document text under random filenames, delivery state, processing errors, clarification state, manual review state, attachment metadata, timestamps, versions, and a minimal change audit. Audit events contain actions and states, not customer answers.

The browser currently sends attachment metadata only. File contents do not leave the browser and are not stored or emailed; this avoids placing customer files in JSON, logs, mailboxes, or a public web directory. The server revalidates every declared attachment name, type, count, and size. If file-content upload is added later, it must use the same validation boundary plus signature/content inspection and malware scanning before release from a non-executable quarantine. Partial upload objects must expire within 24 hours.

While a customer is completing the wizard, ordinary answer fields and the current step are copied to tab-scoped `sessionStorage` so an accidental refresh can recover the draft. File selections and the honeypot are excluded because browsers cannot safely restore file inputs. The draft is removed after a server-confirmed submission and otherwise expires when the browser tab is closed; it is never written to logs or shared across tabs. Customers using a shared device should close the tab when abandoning a draft.

Records are stored beneath `INTAKE_STORAGE_DIR`, keyed by a SHA-256 digest of the customer-facing reference. Documents use cryptographically random names. The storage directory must be an absolute path outside the repository and public website root. Files are created with owner-only modes where the operating system supports them; the service account must be the only account with directory access.

## Production controls

- Set `INTAKE_STORAGE_DIR` to durable private storage outside the deployed static files.
- Set `INTAKE_ADMIN_TOKEN` to an independently generated random secret of at least 32 characters. Store it in the hosting platform's secret manager, rotate it after staff access changes or suspected disclosure, and never put it in a URL, log, source file, or analytics event.
- Terminate HTTPS at the platform or reverse proxy for all public and internal API traffic. Do not expose the local development server directly.
- Enable the storage platform's encryption at rest (for example, an encrypted managed volume or OS volume encryption) and encrypted backups. The application deliberately does not invent a separate encryption-key store.
- Restrict network access to the internal routes where the platform supports identity-aware access, VPN, or an IP allowlist. The bearer token is still required.
- Preserve the intake endpoint's origin check, honeypot, request limits, per-client rate limiting, and provider abuse controls. Configure platform rate limiting for both submission and internal endpoints in production because the in-process limiter does not coordinate across instances.
- Do not enable request-body logging, tracing payload capture, or analytics on `/api/project-submissions` or `/api/internal/project-submissions/*`. Logs should contain only coarse outcome codes and operational request IDs.

Production startup refuses an intake configuration without durable submission and delivery-status locations. The simple file adapter is appropriate for a single API instance. Multi-instance hosting must inject a durable store that provides equivalent atomic create/read/update behaviour.

## Internal retrieval

The local server exposes no list endpoint and no public review page. An authorised user locates a known reference from the operational mailbox and supplies the admin secret in the `Authorization` header:

```powershell
$headers = @{ Authorization = "Bearer $env:INTAKE_ADMIN_TOKEN" }
$base = "https://secure-api.example.com/api/internal/project-submissions"
$record = Invoke-RestMethod -Headers $headers -Uri "$base/LS-REFERENCE"
$summary = Invoke-RestMethod -Headers $headers -Uri "$base/LS-REFERENCE/documents/customerSummary"
```

Available document keys are `customerSummary`, `technicalSpecification`, `internalBrief`, `clarificationQuestions`, and `warnings`. Retrieval responses are private, non-cacheable, non-sniffable, frame-denied, and carry no cross-origin access header.

Update the constrained manual review state with:

```powershell
$headers = @{ Authorization = "Bearer $env:INTAKE_ADMIN_TOKEN"; "Content-Type" = "application/json" }
$body = @{ manualReviewStatus = "in_review" } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Headers $headers -Body $body -Uri "$base/LS-REFERENCE"
```

Allowed states are `not_started`, `in_review`, `clarification_required`, `approved`, and `declined`. Every change records its timestamp and previous/new state. The API does not accept arbitrary internal notes, which keeps accidental sensitive material out of audit history.

## Retention and deletion

- Retain submissions, generated documents, attachment metadata, delivery metadata, and their audit records for **18 months after the last update**, unless a legal or contractual hold requires otherwise. Review the retention period annually.
- Customers may request access, correction, or deletion through `langsystemsdesign@outlook.com`, quoting their reference and sufficient information to verify the request. An authorised staff member verifies identity, records the decision outside the customer record, and deletes the record directory and corresponding delivery-status entry.
- Generated documents and attachment metadata are part of the submission record and are deleted at the same time. A failed initial record write immediately removes its partially generated document directory. Current first-release attachment content is never received or retained.
- A future content-upload adapter must delete failed, unclaimed, or abandoned staging objects within **24 hours**. Run that cleanup independently of customer-visible requests and alert on repeated cleanup failures.
- Routine expiry should run at least daily and permanently remove records whose `updatedAt` is older than 18 months, after checking holds. The bundled adapter intentionally does not schedule deletion because the static-site repository has no production scheduler.
- Encrypted backups may retain deleted material for up to **35 additional days**. Backups must not be used to restore an individually deleted record into production; if a disaster recovery restore reintroduces it, reapply the deletion register before opening access. State this delay when acknowledging a deletion request.

Deletion is an operator-controlled, destructive procedure and is not exposed as an HTTP endpoint. Confirm the hashed record directory and backup/deletion policy before removal.
