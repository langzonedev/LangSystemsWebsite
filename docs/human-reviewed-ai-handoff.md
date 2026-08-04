# Human-reviewed AI handoff

Status: implemented for the production intake flow

## Current workflow

1. A prospective customer completes the public discovery questionnaire.
2. The Cloudflare Worker validates and stores the submission and generated documents in D1.
3. Resend sends the customer a short acknowledgement with their submission reference.
4. Resend sends `langsystemsdesign@outlook.com` an internal review email with customer contact
   details, key clarification questions, delivery status, and two AI handoff attachments.
5. A Lang Systems reviewer checks that the need, supplied facts, service fit, scope, exclusions,
   timing, budget, unknowns, and privacy are correct.
6. Only after that check, the reviewer supplies the Markdown and JSON files to an approved GPT
   project or other analysis tool to produce architecture and design artifacts.
7. A human reviews those artifacts before giving an approved implementation handoff to Codex.

This is deliberately not an automated design or coding pipeline. Submission does not instruct an
AI model, approve a project, make a commercial commitment, or start implementation.

## Internal attachments

Each internal email includes:

- `Lang-Systems-AI-handoff-<reference>.md`, a readable review checklist and prompt-ready task; and
- `Lang-Systems-AI-handoff-<reference>.json`, the matching structured, versioned source bundle.

The bundle separates the goal, context, constraints, required artifacts, completion conditions,
customer-supplied project facts, generated technical specification, clarification questions,
warnings, evidence rules, and the human review record. The evidence rules require downstream tools
to label confirmed facts, assumptions, recommendations, and unknowns separately and prohibit
silently inventing missing requirements.

## Privacy boundary

The AI attachments exclude the customer's name, email, phone number, business name, consent record,
and supporting-file names. The internal email keeps contact and business details so the reviewer can
verify the enquiry. File contents are not uploaded, retained, or emailed by this service. A reviewer
must remove any personal or sensitive information that the customer has entered into a free-text
project field before using the bundle with another service.

## Operator checklist

Before uploading the bundle:

- confirm the customer identity, authority, contact route, problem, desired outcome, users, and fit;
- check first-release scope, exclusions, success measure, budget, timing, and support expectations;
- resolve contradictions and either answer or clearly preserve material unknowns;
- remove sensitive or unnecessary personal information from free-text facts;
- confirm the selected AI account and data-handling terms are suitable; and
- keep the generated architecture, scope, price, delivery plan, and code subject to human approval.

## Cost and infrastructure

Bundle generation is deterministic JavaScript inside the existing Worker. It makes no model API
call and adds no new server, mailbox, POP service, database, or paid product. It uses the existing
Cloudflare Worker, D1, Resend, GitHub Pages, and Outlook mailbox, subject to their current free-tier
allowances. Provider usage should still be monitored as enquiry volume grows.

## Future automation gate

LangFlow or another workflow tool may later coordinate review and artifact generation, but the
versioned bundle and stored submission remain the source evidence. Any automated model invocation or
Codex build stage must first add explicit human approvals, quality evaluations, privacy and security
controls, spend limits, failure recovery, auditability, and a stop mechanism. Full customer-to-code
automation is a roadmap option, not current production behaviour.
