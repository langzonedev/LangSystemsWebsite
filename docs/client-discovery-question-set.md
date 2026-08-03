# Plain-English Client Discovery Question Set

Status: Approved content specification for the discovery wizard  
Last reviewed: 3 August 2026  
Owner: Lang Systems

## 1. Purpose and use

This document defines every customer-facing question proposed for the Lang Systems project discovery wizard. It is written for business owners and managers; customers are not expected to choose technology or know how software should be built.

The wizard introduction is:

> You do not need to know what technology you need. Tell us what you are trying to achieve, and we will handle the technical translation.

The discovery wizard appears only after a visitor intentionally selects **Get Started** or **Tell us about your project**. Required questions are limited to the information needed to identify the enquiry, understand the problem and intended outcome, and prepare an initial project brief. Every other question is optional or includes a genuine **Not sure** choice.

The first release sends the answers by email for manual review. A selection records a preference, not an agreed scope, price, delivery date, ownership arrangement, or technical decision.

## 2. Field conventions

| Convention | Meaning |
| --- | --- |
| Required | The customer must answer before continuing. A valid “Not sure” choice still counts as an answer where it is offered. |
| Optional | The customer can continue without answering. Show “Optional” in the visible label. |
| Short text | One-line answer. |
| Long text | Multi-line answer in the customer’s own words. |
| Single choice | Choose one option. |
| Multiple choice | Choose any number of options. |
| Conditional | Show only when an earlier answer makes it relevant; it remains optional unless stated otherwise. |

Helper text should remain visible, concise, and connected to its question for assistive technology. “Other” choices reveal a free-text field. Do not ask a customer to repeat information they have already supplied.

## 3. Wizard steps and questions

### Step 1 — Contact and business details

**Introduction:** “First, who should we speak with? We use these details to respond to the right person and understand your business context.”

| Field | Customer-facing question | Format | Required | Options or helper text |
| --- | --- | --- | --- | --- |
| `contact_name` | Your name | Short text; name autocomplete | Yes | “Tell us what you would like us to call you.” |
| `business_name` | Business or organisation name | Short text; organisation autocomplete | Yes | — |
| `email` | Work email | Email; email autocomplete | Yes | “We will send your confirmation and reply here.” |
| `phone` | Phone number | Telephone; telephone autocomplete | No | “Optional. Only provide this if you are comfortable being contacted by phone.” |
| `preferred_contact_method` | How would you prefer us to contact you? | Single choice | Yes | Email; Phone; Either is fine. If Phone is selected, a phone number becomes required. |
| `industry_type` | What type of business or organisation is this? | Single choice with Other text | No | Retail; Hospitality; Professional services; Construction or trades; Manufacturing; Health or care services; Education or training; Community or not-for-profit; Government; Other; Not sure how to describe it. |
| `business_location` | Where does the business operate? | Short text | No | “A city, region, state, or country is enough. This helps where locations, travel, or local rules may affect the project.” |
| `business_description` | What does your business or organisation do? | Long text | Yes | “A short, plain-English description is perfect.” |

### Step 2 — Current situation

**Introduction:** “Tell us what is happening today, as you would explain it to a colleague. Technical detail is not expected.”

| Field | Customer-facing question | Format | Required | Options or helper text |
| --- | --- | --- | --- | --- |
| `problem` | What process, task, or opportunity would you like help with? | Long text | Yes | “Describe the main difficulty or change you would like to make.” |
| `current_process` | How is this handled today? | Long text | Yes | “Walk us through the usual steps, including any workarounds.” |
| `current_methods` | What do you currently use to handle it? | Multiple choice | No | Paper forms or notes; Spreadsheets; Email; Existing software; Phone or in-person conversations; Equipment or machinery; Another method; Not sure. |
| `current_process_people` | Who performs the task today? | Long text | No | “For example: office staff, managers, field teams, customers, suppliers, or one particular role.” |
| `process_frequency` | How often is it performed? | Single choice | No | Many times a day; About once a day; Several times a week; About once a week; Several times a month; Occasionally; It varies; Not sure. |
| `problem_impact` | What delays, mistakes, costs, or frustrations occur? | Long text | Yes | “Consider time spent, repeated work, missed opportunities, risk, customer experience, or direct costs. Estimates are fine.” |
| `current_process_strengths` | What works well today and should be kept? | Long text | No | “This could be a useful step, familiar form, report, approval, or way your team prefers to work.” |

### Step 3 — Desired outcome and practical needs

**Introduction:** “What would a better result look like? Focus on what people need to achieve; we will work out the technical approach.”

| Field | Customer-facing question | Format | Required | Options or helper text |
| --- | --- | --- | --- | --- |
| `desired_outcome` | What would you like the new system to help you achieve? | Long text | Yes | “Describe the result for the business or the people doing the work.” |
| `users` | Who will use it? | Long text | Yes | “For example: office staff, field teams, managers, customers, suppliers, or the public.” |
| `user_count` | Approximately how many people might use it? | Single choice | No | 1 person; 2–5; 6–20; 21–50; 51–200; More than 200; It may vary; Not sure. |
| `usage_locations` | Where will people use it? | Multiple choice | No | At one workplace; Across several workplaces; At home; While travelling or working in the field; In customer-facing areas; Other; Not sure. |
| `devices` | Which devices might people use? | Multiple choice | No | Desktop computers; Laptops; Tablets; Mobile phones; Shared terminals or kiosks; Specialised equipment; Other; Not sure. |
| `offline_access` | Does it need to work when internet access is unavailable or unreliable? | Single choice | No | Yes; No; Sometimes; Not sure. Helper: “This can affect the approach, so tell us about poor-coverage locations if relevant.” |
| `existing_systems_connection` | Does it need to connect with existing software or equipment? | Single choice | No | Yes; No; Not sure. Helper: “You do not need to know how the connection would work.” |
| `existing_systems` | Which existing software or equipment may it need to work with? | Long text; conditional after Yes or Not sure | No | “Examples include accounting software, payment systems, a website, email, spreadsheets, scanners, printers, or machinery.” |
| `existing_information_import` | Does existing information need to be brought into the new system? | Single choice | No | Yes; No; Not sure. |
| `data_needs` | What existing information may need to be imported, stored, or used? | Long text; conditional after Yes or Not sure | No | “Examples include customer records, stock lists, orders, documents, forms, or reports. Please describe it only; do not upload sensitive records here.” |
| `privacy_security_approvals` | Are there privacy, security, access, or approval requirements we should know about? | Long text | No | “For example: only managers can approve changes, different staff see different information, or industry rules apply. Do not include passwords or sensitive personal records.” |

### Step 4 — First release and common capabilities

**Introduction:** “Shape a practical first release. It is fine if you are unsure—we can help separate immediate needs from later ideas.”

| Field | Customer-facing question | Format | Required | Options or helper text |
| --- | --- | --- | --- | --- |
| `common_capabilities` | Which of these might be helpful? | Multiple choice | No | Staff or customer accounts; Forms and information entry; Search; Reports; File uploads; Payments; Messages or reminders; Approvals; Stock or inventory; Bookings or scheduling; Maps or locations; Use on mobile devices; Use without internet access; Artificial intelligence to assist with suitable tasks; Connection to existing software; Other; Not sure. Helper: “Use this as a prompt, not a commitment. Choose anything relevant and explain your priorities below.” |
| `first_release` | What must be working before you would consider the first release complete? | Long text | Yes | “List what people must be able to do from day one. If you are unsure, write ‘Please help us decide’ and explain what matters most.” |
| `optional_requirements` | What is useful but can be added later? | Long text | No | “Include important improvements that are not needed immediately.” |
| `future_ideas` | What ideas should we retain for the future? | Long text | No | “These ideas will not be assumed to be part of the first release.” |
| `excluded_functionality` | Is anything specifically not included? | Long text | No | “This may include work your team or another supplier will handle.” |

### Step 5 — Commercial preference

**Introduction:** “How would you prefer the system to be provided? This is only a starting preference. We will explain the options and agree any ownership or licence terms separately in writing.”

| Field | Customer-facing question | Format | Required | Options or helper text |
| --- | --- | --- | --- | --- |
| `delivery_model` | Which approach sounds most suitable at this stage? | Single choice | Yes | **Please recommend the most suitable approach** — “Lang Systems will review your needs and explain the practical options.”; **A completely bespoke system we ultimately own** — “A system built specifically for your organisation, with ownership transferred as agreed in the project contract.”; **A Lang Systems product provided under licence with ongoing updates** — “Lang Systems keeps ownership of the product; your organisation pays for agreed setup and use while Lang Systems maintains and improves it.”; **A potential shared product arrangement** — “If the idea could help other organisations, we can discuss sharing investment or product direction. This requires separate review and agreement.” |
| `day_to_day_owner` | Who is likely to manage the system day to day? | Single choice | No | Our team; Lang Systems; Shared responsibility; Someone else; Not sure yet. |
| `ongoing_support` | What help might you want after launch? | Single choice | No | Ongoing support and updates; Occasional help when needed; Handover and guidance for our team; Not sure yet. |

### Step 6 — Budget and timing

**Introduction:** “A rough range helps us suggest an approach that is realistic for your organisation. It is not a quote or a commitment, and it is completely fine not to have a budget yet.”

| Field | Customer-facing question | Format | Required | Options or helper text |
| --- | --- | --- | --- | --- |
| `budget` | Has an approximate budget range been allowed? | Single choice | Yes | Under AUD $5,000; AUD $5,000–$15,000; AUD $15,000–$40,000; AUD $40,000–$100,000; Over AUD $100,000; Not sure yet; Please help us understand what is realistic. |
| `required_completion_date` | Is there a date by which this needs to be working? | Date plus “No fixed date” choice | No | “An approximate date is fine. We will confirm feasibility after reviewing the project.” |
| `timing_context` | Is a business event or operational deadline affecting the timing? | Long text | No | “For example: a busy season, opening, contract, audit, policy change, or replacement of an existing system.” |
| `timing` | How flexible is the timeline? | Single choice | Yes | The date is fixed; There is some flexibility; The timeline is very flexible; We are exploring options only; Not sure yet. |

### Step 7 — Success, supporting information, and anything unusual

**Introduction:** “Finally, tell us what success would look like and share any examples that would help us understand the work.”

| Field | Customer-facing question | Format | Required | Options or helper text |
| --- | --- | --- | --- | --- |
| `success_measure` | How would you know this project had been successful six months after launch? | Long text | Yes | “Think about time saved, fewer mistakes, better service, increased capacity, clearer reporting, or another observable improvement.” |
| `supporting_files` | Would you like to provide any supporting files? | Multiple file upload | No | Accept screenshots, example spreadsheets, existing forms, reports, process documents, diagrams, and example outputs. Helper: “Examples help us understand the current process. Remove information that identifies customers or staff, and do not upload passwords, payment details, health records, government identifiers, or other highly sensitive information.” |
| `supporting_files_description` | Is there anything we should know about the files? | Long text; conditional when files are selected | No | “Briefly explain what each example shows and which parts matter.” |
| `constraints` | Are there any other rules, concerns, or limits we should consider? | Long text | No | “For example: accessibility needs, business policies, approvals, locations, or industry obligations.” |
| `additional_notes` | Is there anything unusual or anything else you would like us to know? | Long text | No | “Use your own words. If a question did not fit your situation, explain it here.” |

File delivery must be confirmed as safe and supported by the approved email submission service before this field is enabled. Files are supporting context only; they are not a permanent document store. The customer must be shown any size and file-type limits before choosing files.

### Step 8 — Review and permission to respond

**Introduction:** “Review your project outline. You can return to any section to make changes before sending.”

The review displays every answer in step order, including selected files by filename. Optional blanks display **Not provided**. Each section has a clearly named Edit button.

| Field | Customer-facing question | Format | Required | Options or helper text |
| --- | --- | --- | --- | --- |
| `privacy_consent` | Permission to assess and respond | Checkbox, clear by default | Yes | “I agree that Lang Systems may use this information to assess my enquiry and contact me about it. I understand it will be sent through an email delivery service. I have not included passwords, payment details, health records, government identifiers, or other highly sensitive information.” |

Before the Send button, show:

> Lang Systems will review your information, confirm our understanding, and contact you with any questions or recommended next steps. Sending this outline does not commit either party to a price, scope, delivery date, or project.

The primary action is **Send project outline**.

## 4. Conditional and validation rules

- Require only the fields marked Yes above and the conditional phone number when Phone is the preferred contact method.
- Validate on Continue or Send, not while the customer is composing.
- If a required question is unanswered, name that question in plain language, focus it, and keep every completed answer.
- Keep **Not sure**, **Not sure yet**, and **Please help us understand what is realistic** as valid answers. Never replace them with a forced technical choice.
- Reveal follow-up fields only when relevant. A revealed optional field remains optional.
- When **Other** is selected, offer a short free-text field; do not require it to continue.
- Do not infer unselected capabilities, ownership terms, budgets, deadlines, privacy needs, or technical requirements.
- Do not send answers to analytics, place them in URLs, or save them in browser storage.
- Supporting files require the same review, privacy warning, and submission-failure handling as written answers.

## 5. Implementation contract note

The running wizard currently uses the stable version 1.0 submission fields described in the [Project Intake Architecture and Design](project-intake-architecture.md). This question set expands that model. Implementation work must deliberately map the fields above, update generated summaries and review output, and increment and document the submission schema version where the payload changes. Existing field names shown in this document should be retained where their meaning is unchanged.

This content specification does not itself enable file delivery. Before enabling uploads, confirm that the approved service supports the required file types and limits, review its privacy and retention terms, and test successful and failed delivery without exposing customer information.
