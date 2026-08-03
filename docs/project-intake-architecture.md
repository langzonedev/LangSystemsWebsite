# Project Intake Architecture and Design

Status: Source of truth for the first release  
Last reviewed: 3 August 2026  
Owner: Lang Systems

## 1. Purpose and governing context

This document defines the complete intended design of the Lang Systems Client Project Intake Workflow. Future work must be understandable from this repository without relying on chat history.

The workflow is governed by the [Project Anchor](project-anchor.md). It is an intentional, accessible path for non-technical business customers to explain a problem and submit a project enquiry. The first release uses email for submission and tracking and must not grow into an operational management platform without separate approval.

Where this document and the running implementation differ, the difference is a defect or an open decision to resolve; it must not become an undocumented convention.

## 2. Intended audience and language

The primary users are business owners and managers. They know their organisation, current process, and desired outcome, but they may not know which software approach is appropriate.

Customer-facing content must:

- ask about the business situation, people, impact, and outcomes before asking about a solution;
- use short, plain-English questions and concrete examples;
- reassure people that technical knowledge is not expected;
- explain why sensitive or commercial information is requested;
- distinguish essentials, later additions, and exclusions without unexplained technical shorthand;
- state what happens after submission without promising a quote, delivery date, or acceptance; and
- use technical terms only when unavoidable and explain them immediately.

Internal generated documents may use precise technical language because they are for Lang Systems review, but they must not infer facts that the customer did not provide.

## 3. Customer journey

1. A visitor reads the existing website with no interruption from the intake workflow.
2. The visitor intentionally chooses “Get Started” or “Tell us about your project”.
3. A focused project-discovery dialog opens at step 1. Focus remains manageable by keyboard and returns to the triggering control when the dialog closes.
4. The visitor completes one subject at a time. They can move back without losing answers. Required answers are checked before moving forward.
5. At step 8, the visitor reviews every submitted answer, can return to edit it, and gives explicit privacy consent.
6. On submission, the browser creates the documented summaries and structured payload, then sends the form once to the configured email-delivery service.
7. If delivery succeeds, the visitor sees an on-screen receipt and receives a plain-language acknowledgement at their supplied email address.
8. If delivery fails, entered answers remain available, submission is re-enabled, and the visitor receives a clear retry and direct-email option. A failed request must not show success.
9. Lang Systems receives the enquiry by email, reviews the original answers and generated outputs, tracks it using the approved manual process, and contacts the customer to clarify scope and agree next steps.

Closing a partly completed form warns that unsent answers will not be saved. The browser must not persist answers in local storage, include them in a URL, or send them to analytics.

## 4. Wizard and information model

The complete approved customer-facing content, including proposed additions to the current version 1.0 field contract, is defined in the [Plain-English Client Discovery Question Set](client-discovery-question-set.md). Additions must be implemented through a deliberate schema-version change; until then, the table below describes the running version 1.0 model rather than permission to omit the approved questions permanently.

The first-release wizard has eight steps. “Required” means submission cannot proceed without a valid answer. Optional blanks remain visibly identified as not provided in generated outputs; they are not silently invented.

| Step | Purpose | Required information | Optional information |
| --- | --- | --- | --- |
| 1. About you | Identify the contact and business | Name, work email, business or organisation, what the business does | Phone |
| 2. The problem | Understand the current situation | Problem or opportunity, current process, affected people/business impact | None |
| 3. The outcome | Describe the result and users | Desired outcome, who will use it | Existing systems, information the solution may need |
| 4. First release | Separate immediate scope from later work | Essential first-release capabilities | Useful later additions, future ideas, explicit exclusions |
| 5. Budget and timing | Support a realistic response | Expected investment range, preferred timing | Timing driver or important date |
| 6. Working arrangement | Understand commercial and operating preferences | Commercial arrangement, day-to-day owner, support expectation | None; “Please recommend” and “Not sure” are valid answers |
| 7. Success | Define completion and constraints | Completion and acceptance criteria | Rules/constraints/concerns, additional notes |
| 8. Review | Confirm the outline and consent | Privacy consent | None |

The stable field names and structured payload are an integration contract. Changes must either preserve them or deliberately increment `submission_schema_version` and document migration or mapping requirements.

## 5. Validation and error handling

- Validate the current step before progression and validate review/consent before submission.
- Use browser constraints where suitable: required fields, email format, radio selection, and select choice.
- Mark the specific invalid control with `aria-invalid`, focus it, and show a plain-language error in an announced message region.
- Never discard valid answers because another answer is invalid or a network request fails.
- Disable Send while a request is in progress to reduce duplicates; restore it on failure.
- Treat a non-success response, explicit provider rejection, unreadable response, or network exception as failure.
- Do not log form contents or expose them in URLs or analytics.
- Use a visually hidden honeypot as a low-friction spam control. Stronger protection is a later decision and must remain accessible.
- Provider/server validation and abuse limits remain necessary. Browser validation is not a security boundary.

## 6. Submission handling

### First-release flow

The static form posts with `fetch` and `FormData` to the configured FormSubmit AJAX endpoint. No credential is stored in the site. FormSubmit must be activated once for the destination mailbox before production use.

Immediately before sending, the browser:

1. generates a non-authoritative reference in the form `LS-` plus a UTC timestamp;
2. preserves the original named form answers;
3. adds generated document text;
4. adds `structured_project_data_json` with `schemaVersion: "1.0"`;
5. adds `submission_schema_version: "1.0"`; and
6. adds the UTC submission time.

The generated reference is for email correlation, not a guaranteed unique or sequential record identifier. Lang Systems must verify receipt rather than relying only on the browser success screen.

### Failure behavior

Submission success is shown only after the provider returns a successful response. On failure the dialog stays open, the customer’s inputs remain intact, and the message offers retry or direct email to `langsystemsdesign@outlook.com`. Direct email is a fallback contact route; it does not reproduce the structured intake automatically.

## 7. Email and generated document outputs

### Customer email

The delivery provider sends a plain-language acknowledgement to the submitted work email. It confirms receipt, explains that Lang Systems will review and follow up, and warns the customer not to reply with sensitive information. It must not imply that Lang Systems has accepted the project or agreed price, scope, or timing.

### Lang Systems email

The destination mailbox receives one submission containing the original fields plus these generated outputs:

| Output field | Audience and purpose |
| --- | --- |
| `project_reference` | Shared email correlation reference |
| `customer_friendly_project_summary` | Plain-language restatement of business context, change sought, first release, later items, exclusions, and completion measures |
| `technical_requirements_specification_internal` | Internal requirements grouped by users/workflow, included/optional/future/excluded scope, systems and information, constraints, acceptance, assumptions, and open questions |
| `lang_systems_project_brief_internal` | Internal lead, commercial fit, discovery assessment, and recommended next action |
| `clarification_questions_internal` | Questions generated from missing optional detail or uncertain commercial/budget choices |
| `structured_project_data_json` | Versioned machine-readable copy for possible later import or automation |
| `submission_schema_version` | Contract version for downstream interpretation |
| `submitted_at_utc` | Browser-generated submission timestamp |

These are sections in the delivered email payload, not downloadable files, signed specifications, customer approvals, or permanent system records. The customer summary is sent to Lang Systems as part of the internal submission; the customer receives the acknowledgement, not a copy of every answer. Generated material is a discovery aid and must be reviewed by a person before estimation or contractual scope.

## 8. Commercial delivery models

The customer may choose one of four non-binding preferences:

- **Recommendation required:** Lang Systems explains suitable options in plain English after review.
- **Customer-owned bespoke build:** a purpose-built project funded through agreed stages, with ownership transferred as agreed in the contract.
- **Lang Systems licensed product:** Lang Systems retains product ownership while the customer pays for agreed setup and use rights.
- **Co-funded product partnership:** a manually reviewed possibility where the idea may benefit other businesses; selection does not create a partnership or approve special terms.

The response records a preference only. Ownership, licensing, support, fees, confidentiality, and partnership terms require a later written agreement.

## 9. First-release scope classification

### Included now

- Intentional launch from existing “Get Started” project-enquiry controls.
- Responsive, keyboard-operable eight-step dialog using the current website style.
- Required/optional field collection, step validation, review, consent, progress, back navigation, close warning, loading state, success state, and recoverable failure state.
- Email submission through FormSubmit to the configured Lang Systems mailbox.
- Customer acknowledgement through the provider’s autoresponse facility.
- Original answers, generated summaries, clarification questions, versioned JSON, a correlation reference, and submission timestamp in the internal email payload.
- Manual Lang Systems review, clarification, qualification, and email-based tracking.
- A honeypot and provider protections available under the configured service.

### Designed for later, not implemented now

- Replacing FormSubmit behind a submission-service boundary while retaining or deliberately migrating stable field names and the versioned payload.
- Server-assigned durable identifiers, reliable retry/deduplication, delivery monitoring, and an auditable record store.
- Approved import into a customer-management or work-management tool.
- File uploads, richer document generation, a customer copy of the completed outline, and downloadable documents.
- Save-and-resume, authenticated status viewing, staff dashboards, automated classification, and scheduling.
- Stronger spam controls where evidence shows they are needed.

These are design directions, not commitments. Each requires approval, security/privacy assessment, content review, and its own acceptance criteria.

### Explicitly excluded from the first release

- A full customer relationship management system, ticketing platform, client portal, or customer account system.
- Payment collection, invoices, subscriptions, contracts, or electronic signatures.
- Autonomous Kanban card creation, project acceptance, quoting, estimation, prioritisation, or customer qualification.
- Automated commercial, legal, or delivery decisions.
- Attachments or collection of passwords, payment details, health records, government identifiers, or other highly sensitive information.
- Background prompts, automatic pop-ups, advertising, and unrelated overlays.
- Guaranteed permanent storage, email delivery, or recovery of an unfinished form.

## 10. Data protection and security

The form follows data minimisation: collect only information useful for assessing and responding to an enquiry. The review step requires explicit consent and states that an email-delivery service will process the data. Customers are instructed not to submit highly sensitive information.

For production operation:

- review and approve FormSubmit’s current privacy, retention, processing-location, and security terms;
- publish or link suitable Lang Systems privacy information before launch;
- restrict mailbox access to authorised personnel and protect it with strong authentication;
- define retention and deletion periods for enquiries and generated documents;
- handle access, correction, and deletion requests under applicable obligations;
- keep personal data out of console logs, analytics, source control, and public issue trackers;
- never commit mailbox credentials, provider secrets, or customer submissions; and
- reassess consent, notices, access control, retention, incident response, and data locations before adding storage or automation.

Email is not a secure channel for highly sensitive data. The first-release warning reduces risk but does not replace operational controls or legal review.

## 11. Proposed component and service boundaries

| Boundary | Current responsibility | Must not own |
| --- | --- | --- |
| Website entry points (`index.html`) | Offer intentional entry into discovery | Automatic or unrelated prompting |
| Wizard markup (`index.html`) | Questions, step order, labels, consent, semantic structure | Submission policy or generated-document logic |
| Presentation (`styles.css`) | Existing brand, responsive layout, focus/error/success states | Business rules |
| Intake controller (`intake.js`) | Dialog lifecycle, navigation, validation, review, payload generation, send states | Long-term records or workflow decisions |
| Email-delivery provider (FormSubmit) | Accept form data, deliver internal email, send acknowledgement | Project approval, authoritative storage, or scope decisions |
| Lang Systems mailbox/manual process | Authoritative first-release receipt, review, follow-up, and tracking | Automatic commitments based on generated text |
| Future intake service | Potential server validation, durable IDs, controlled integrations, observability | Customer-management features unless separately approved |

Generated-document functions should remain separable from dialog navigation and transport. A future provider replacement should not require rewriting customer questions or presentation merely to change delivery.

## 12. Acceptance and completion criteria

The first release is complete only when all of the following are true:

- intake opens only after an intentional project-enquiry action and the rest of the website continues to work;
- all eight steps, required/optional fields, choices, and explanations match this document;
- keyboard navigation, focus behavior, labels, error announcements, responsive layout, reduced-motion behavior, and visible focus states are verified on supported browsers;
- validation blocks incomplete or invalid required answers and preserves completed answers;
- review accurately displays the key answers and allows correction before sending;
- submission requires privacy consent and does not put answers in URLs, browser storage, analytics, or source control;
- one successful production-like test reaches the authorised mailbox with every original and generated field intact;
- the same test sends an acknowledgement to the supplied customer address with approved wording;
- a simulated provider/network failure keeps answers available and presents the retry/direct-email path without showing success;
- the FormSubmit destination has been activated and mailbox/junk-folder behavior has been checked;
- the site remains responsive and its existing automated checks/build, if any, pass; and
- this document and README operational guidance remain accurate.

A successful browser request alone does not satisfy email acceptance; both delivered emails and their content must be inspected.

## 13. Known assumptions and open decisions

### Assumptions in force

- The website remains a static GitHub Pages site for the first release.
- `langsystemsdesign@outlook.com` is the authorised operational mailbox.
- FormSubmit is acceptable provisionally, subject to production privacy/terms review and activation.
- One internal email plus one customer acknowledgement is adequate first-release tracking.
- The browser-generated reference and time are sufficient for correlation, not authoritative audit.
- Lang Systems staff manually review outputs and clarify them with the customer before estimating or agreeing scope.
- No attachments or highly sensitive information are required during initial discovery.

### Open decisions before public production use

| Decision | Owner | Effect if unresolved |
| --- | --- | --- |
| Approve FormSubmit privacy, retention, security, processing locations, and reliability | Lang Systems | Do not treat the form as production-approved |
| Activate the destination address and verify internal and acknowledgement delivery | Mailbox owner | Submissions may not arrive |
| Publish or confirm the privacy notice and enquiry retention/deletion policy | Lang Systems | Privacy expectations and operations remain incomplete |
| Define mailbox ownership, response target, backup coverage, and manual tracking convention | Lang Systems | Follow-up may be inconsistent |
| Confirm supported browser/device test set and complete accessibility review | Lang Systems | Launch quality is not fully evidenced |
| Decide whether customers should later receive their completed summary | Product owner | Current behavior remains acknowledgement-only |

Open decisions do not authorise designed-for-later features. Any decision that changes first-release behavior must update this document, the Project Anchor if applicable, tests, and operational guidance in the same change.

## 14. First-release field and generation contract

The following names are the submitted-field contract. All fields are plain text unless noted.

| Step | Submitted name | Required | Control or allowed choice |
| --- | --- | --- | --- |
| About you | `contact_name` | Yes | Text |
| About you | `email` | Yes | Email |
| About you | `phone` | No | Telephone text |
| About you | `business_name` | Yes | Text |
| About you | `business_description` | Yes | Long text |
| The problem | `problem` | Yes | Long text |
| The problem | `current_process` | Yes | Long text |
| The problem | `problem_impact` | Yes | Long text |
| The outcome | `desired_outcome` | Yes | Long text |
| The outcome | `users` | Yes | Long text |
| The outcome | `existing_systems` | No | Long text |
| The outcome | `data_needs` | No | Long text |
| First release | `first_release` | Yes | Long text |
| First release | `optional_requirements` | No | Long text |
| First release | `future_ideas` | No | Long text |
| First release | `excluded_functionality` | No | Long text |
| Budget/timing | `budget` | Yes | Under AUD $5,000; AUD $5,000–$15,000; AUD $15,000–$40,000; AUD $40,000–$100,000; Over AUD $100,000; Not sure—please advise |
| Budget/timing | `timing` | Yes | As soon as practical; within 1–2 months; within 3–6 months; more than 6 months away; exploring options only |
| Budget/timing | `timing_context` | No | Long text |
| Working arrangement | `delivery_model` | Yes | One of the four models in section 8; Recommendation required is initially selected |
| Working arrangement | `day_to_day_owner` | Yes | Our team; Lang Systems; shared responsibility; not sure yet |
| Working arrangement | `ongoing_support` | Yes | Ongoing support; occasional support; handover and documentation only; not sure yet |
| Success | `acceptance_criteria` | Yes | Long text |
| Success | `constraints` | No | Long text |
| Success | `additional_notes` | No | Long text |
| Review | `privacy_consent` | Yes | Checkbox submitted as `Agreed` |

Provider configuration fields (`_subject`, `_template`, `_captcha`, `_autoresponse`, and the `_honey` honeypot) are transport settings, not customer project data. Their exact values live with the form markup and must be reviewed whenever the provider changes.

The review screen shows every customer-provided answer, grouped in step order. Optional blanks are identified as not provided. Internal generated documents, assumptions, and clarification questions are not presented as customer answers. Detailed interaction, responsive, accessibility, browser, and recovery behaviour is defined in [Customer Project Discovery Journey](customer-project-discovery-journey.md).

The structured JSON groups the same answers under `contact`, `discovery`, `scope`, and `commercial`, followed by top-level `constraints` and `additionalNotes`. Its project reference must match the separately submitted reference. Automatic clarification questions are raised when existing systems, information needs, explicit exclusions, constraints, timing context, or later additions are blank; when the customer requests a delivery-model recommendation; or when the budget is uncertain. These questions identify discovery gaps only and never rewrite the customer’s answer or block submission.
