# Project Scope, Acceptance and Delivery Template Pack

Status: Approved operational starting point for manual use  
Template version: 1.0.0  
Last reviewed: 3 August 2026  
Owner: Lang Systems

## Purpose and use

This pack helps Lang Systems turn an approved customer enquiry into a clearly bounded proposal,
delivery arrangement and completion record. It is designed for customers who do not use formal
software-development language.

This is an operational starting point, not jurisdiction-specific legal advice. An authorised Lang
Systems reviewer must adapt it to the project and arrange legal review when appropriate. Completing
or generating a template does not approve scope, accept a project, execute a contract or authorise
work. Lang Systems and the customer must manually review and approve the final documents before
work begins.

Use the pack as follows:

1. Copy the **Project scope and delivery proposal** after the enquiry has passed manual review.
2. Replace every `[instruction or placeholder]`; write `None agreed` where a section does not apply.
3. Select one commercial model and remove the other model wording.
4. Check that each first-release requirement has a matching, observable acceptance criterion.
5. Record later ideas separately from the approved first release.
6. Obtain manual approval from the authorised people named in the proposal.
7. Use a **Change request record** for every proposed change after approval.
8. Complete the **Handover record** and **Acceptance and project closure record** at delivery.

Do not put customer information in source control, public issues or public document links. Store
completed copies only in the approved private project location and apply the agreed access,
retention and deletion controls.

## Template 1: Project scope and delivery proposal

> Draft status: `[Draft / ready for customer review / approved]`  
> Project: `[project name]`  
> Customer: `[customer organisation]`  
> Proposal version: `[version]`  
> Date: `[date]`  
> Lang Systems owner: `[name and contact details]`  
> Customer owner: `[name and contact details]`  
> Source enquiry reference: `[reference]`

### 1. Project overview

> `[In two or three plain-English sentences, describe what will be delivered, who it is for and why
> the work is being proposed.]`

Approved first release means only the work listed under **Essential first-release requirements**,
subject to the exclusions, assumptions and responsibilities in this proposal. Useful later
requirements and future enhancements are not included unless they are added through the agreed
change-request process.

### 2. Customer problem

> `[Describe the current situation, the people affected and the practical cost, delay, risk or missed
> opportunity. Do not assume a technical solution.]`

### 3. Desired outcome

> `[Describe the result the customer wants to see and how day-to-day work should improve.]`

### 4. Essential first-release requirements

These items are essential for the first release and are the approved delivery boundary.

| ID | What must be provided | Who will use it | Related acceptance criterion |
| --- | --- | --- | --- |
| FR-01 | `[clear, observable requirement]` | `[person or role]` | AC-01 |
| FR-02 | `[clear, observable requirement]` | `[person or role]` | AC-02 |

### 5. Useful later requirements

These ideas are useful but can be added later. They are not included in the current price, timing
or acceptance decision.

- UL-01: `[later requirement or "None identified"]`

### 6. Future enhancements

These are possible future enhancements, not commitments or approved work.

- FE-01: `[future idea or "None identified"]`

### 7. Explicit exclusions

The following work is not included in this proposal:

- EX-01: `[excluded capability, service, content, system, data migration or environment]`
- Work described only under Useful later requirements or Future enhancements.
- Any work not expressly listed under Essential first-release requirements.

### 8. Assumptions

The price, timing and approach rely on these statements being true:

| ID | Assumption | Owner who will confirm it | Confirm by | Effect if incorrect |
| --- | --- | --- | --- | --- |
| AS-01 | `[specific assumption]` | `[customer / Lang Systems]` | `[date or milestone]` | `[review, delay or change request]` |

An assumption that proves incorrect does not silently expand the approved work. The parties will
use the change-request process if it affects price, timing or what will be delivered.

### 9. Open questions

| ID | Question | Owner | Needed by | Does it block work? |
| --- | --- | --- | --- | --- |
| OQ-01 | `[question requiring an answer]` | `[name]` | `[date]` | `[Yes / No, with affected work]` |

Open questions that could materially affect scope, price, timing, security or ownership must be
resolved before this proposal is approved. Any question intentionally left for later must state
the agreed effect of that uncertainty.

### 10. Customer responsibilities

The customer will:

- provide the agreed information, content, access, decisions and feedback by the stated dates;
- nominate people authorised to give instructions and approve milestones;
- confirm that materials and access supplied for the project may be used for the agreed purpose;
- review deliverables against the acceptance criteria within `[number]` business days; and
- promptly tell Lang Systems about constraints, risks or changes that may affect delivery.

Project timing and price may need review if a required customer input is late or materially
different from what was agreed.

### 11. Lang Systems responsibilities

Lang Systems will:

- deliver the approved first-release requirements using reasonable professional care;
- keep the customer informed of material progress, risks and decisions;
- protect customer information in line with the agreed project controls;
- demonstrate deliverables and provide the agreed handover contents; and
- document proposed changes before performing additional work.

### 12. Milestones

| ID | Milestone and output | Target date | Review owner | Completion evidence |
| --- | --- | --- | --- | --- |
| M1 | `[milestone and tangible output]` | `[date]` | `[name]` | `[demonstration, document or approved record]` |
| M2 | `[milestone and tangible output]` | `[date]` | `[name]` | `[demonstration, document or approved record]` |

Dates are `[fixed commitments / planning targets]`. Approved changes and delays in required inputs
will be recorded with their effect on the schedule.

### 13. Payment checkpoints

| Checkpoint | Amount or calculation | Invoice trigger | Due |
| --- | --- | --- | --- |
| `[for example, project start]` | `[amount, percentage and tax treatment]` | `[objective event]` | `[payment term]` |
| `[for example, acceptance of M1]` | `[amount, percentage and tax treatment]` | `[objective event]` | `[payment term]` |

> `[State how approved changes, third-party costs, late payments, cancellation and disputed amounts
> are handled. Obtain appropriate commercial or legal review before use.]`

### 14. Acceptance criteria

Acceptance criteria describe what must be working before the project is complete. Each criterion
must be observable and must relate to an essential first-release requirement.

| ID | Related requirement | What must be working | How it will be checked | Evidence |
| --- | --- | --- | --- | --- |
| AC-01 | FR-01 | `[plain-English result]` | `[steps, example or agreed measure]` | `[demonstration, result or record]` |
| AC-02 | FR-02 | `[plain-English result]` | `[steps, example or agreed measure]` | `[demonstration, result or record]` |

Unless explicitly stated here, an idea, preference or later enhancement is not an acceptance
criterion. Minor presentation issues that do not prevent an agreed result should be recorded for
prioritisation and do not automatically prevent acceptance.

### 15. Acceptance process

1. Lang Systems tells the customer in writing that a milestone or the first release is ready for
   review and provides the agreed evidence.
2. The customer reviews only against the acceptance criteria within `[number]` business days.
3. The customer either confirms acceptance in writing or provides one documented list identifying
   each criterion that has not been met, with enough detail to reproduce the issue.
4. Lang Systems addresses verified gaps within the approved scope and resubmits the affected item.
5. Requests outside the approved scope follow the change-request process and do not delay
   acceptance of work that meets the agreed criteria.
6. Acceptance is recorded manually in Template 4. `[Insert any proposed deemed-acceptance wording
   only after appropriate legal review; otherwise state "There is no deemed acceptance".]`

### 16. Change-request process

New ideas are welcome. New ideas do not automatically become part of the approved first release.
Requested changes must be documented using Template 2.

Lang Systems will explain the likely effect on the approved scope, price, timing, acceptance
criteria, support and other commitments. Additional work may require a revised estimate. Both
parties must understand and manually approve the effect on price and timing before work proceeds.
Until approval, Lang Systems continues against the existing approved scope where practical.
Completion is measured against the acceptance criteria in the latest approved proposal and change
requests.

### 17. Delivery model

Selected model: `[choose exactly one: Customer-owned bespoke build / Lang Systems licensed product
/ Co-funded product]`

Delete the two unused options and complete every placeholder in the selected option.

#### Option A — Customer-owned bespoke build

- The project is funded through the milestones and payment checkpoints above.
- Ownership transfers only as stated in section 18 and after `[payment/acceptance condition]`.
- Lang Systems provides the defined handover contents in section 21.
- Support, maintenance and further work are separate unless expressly included in this proposal.

#### Option B — Lang Systems licensed product

- Lang Systems retains ownership of the product and reusable product materials.
- The customer receives the usage rights stated in section 18 for `[users, organisation, locations
  or other boundary]`.
- Fees are `[setup fee]`, `[subscription or licence fee and billing period]` and `[included
  maintenance fee, if any]`.
- Included updates and support are limited to sections 19 and 20.

#### Option C — Co-funded product

- Funding contributions are `[customer contribution]` and `[Lang Systems contribution]`, subject
  to the payment checkpoints above.
- Ownership and customer usage rights are stated in section 18.
- Customer benefits are `[discount, priority access, influence over agreed requirements or other
  defined benefit]`.
- Any exclusivity is limited to `[scope, market/territory and start/end dates]`; write `None` if no
  exclusivity applies.
- This option requires a separate, manually reviewed written agreement. Selecting or discussing it
  does not create a partnership, approve funding or grant exclusivity.

### 18. Ownership and intellectual-property position

Selected model wording: `[copy and complete the matching paragraph below, then delete the others]`

- **Customer-owned bespoke build:** After `[full payment and any other agreed condition]`, ownership
  of `[clearly identify deliverables]` transfers to the customer. Lang Systems retains ownership of
  `[pre-existing tools, general methods and specifically identified reusable components]` and
  grants the customer `[licence needed to use those retained items with the deliverable]`.
- **Lang Systems licensed product:** Lang Systems retains ownership of the product, source material,
  updates and reusable components. The customer receives a `[non-exclusive or other reviewed]`
  right to use `[product/service]` for `[permitted purpose, users, term and territory]`, subject to
  `[payment and licence conditions]`.
- **Co-funded product:** Ownership of the product and contributions is `[precisely defined position]`.
  The customer receives `[usage, pricing, feature, access and commercial benefits]`. Exclusivity is
  `[none / defined scope and expiry]`. A separate manually reviewed agreement is required.

Customer data, customer-supplied materials, third-party components, open-source software, branding,
confidential information and rights to modify, host, resell or sublicense must each be addressed
where relevant. This template does not determine ownership by itself; the final wording requires
appropriate legal review for the project and jurisdiction.

### 19. Support boundaries

Support included during delivery: `[channels, hours, response approach, authorised contacts and end
date]`.

Support includes: `[questions, fault investigation or other defined services]`.  
Support does not include: `[new features, training, third-party failures, customer-caused issues or
other exclusions]`.  
Urgent issue contact and priority rules: `[details]`.  
Support after the included period: `[separate arrangement, rate or "not included"]`.

### 20. Maintenance boundaries

Maintenance included: `[security updates, defect corrections, compatibility work, monitoring,
backups or "None"]`.  
Maintenance period and frequency: `[details]`.  
Customer-managed items: `[devices, accounts, content, data quality, third-party subscriptions or
other items]`.  
Not included: `[new features, major upgrades, changed integrations or other boundaries]`.  
Renewal, cancellation and end-of-service arrangements: `[details requiring commercial/legal review]`.

### 21. Handover contents

The handover will contain only the items marked Included below. Receipt is recorded in Template 3.

| Item | Included? | Format or location | Recipient |
| --- | --- | --- | --- |
| Delivered first release and access instructions | `[Yes / No / Not applicable]` | `[details]` | `[name/role]` |
| User guidance and agreed training | `[Yes / No / Not applicable]` | `[details]` | `[name/role]` |
| Administration or operating guidance | `[Yes / No / Not applicable]` | `[details]` | `[name/role]` |
| Source materials included under section 18 | `[Yes / No / Not applicable]` | `[secure location]` | `[name/role]` |
| Configuration and deployment information | `[Yes / No / Not applicable]` | `[secure location]` | `[name/role]` |
| Data export or migration result | `[Yes / No / Not applicable]` | `[secure method]` | `[name/role]` |
| Third-party account and renewal list | `[Yes / No / Not applicable]` | `[details]` | `[name/role]` |
| Known limitations and open support items | `[Yes / No / Not applicable]` | `[details]` | `[name/role]` |

Secrets and credentials must be transferred through an approved secure method, never embedded in
this document or sent through an unsecured channel.

### 22. Project closure

The project can close when:

- all applicable acceptance criteria have been accepted or any exceptions are explicitly recorded;
- the agreed handover contents have been received;
- approved changes and remaining support items are documented;
- final invoices and customer-supplied access or materials are handled as agreed; and
- both authorised project owners complete Template 4.

Closure ends this project's delivery work. Support, maintenance, later requirements and future
enhancements continue only under the arrangements expressly identified above or a new agreement.

### Manual proposal approval

By recording approval, each approver confirms that they have reviewed this version and understand
the scope boundary, exclusions, responsibilities, price and timing effects, acceptance criteria,
selected delivery model and change process. This record is not a substitute for any separately
required contract or legal review.

Customer authorised approver: `[name, role, approval method, date and reference]`  
Lang Systems authorised approver: `[name, role, approval method, date and reference]`

## Template 2: Change request record

> Change request ID: `[CR-001]`  
> Project and approved proposal version: `[project / version]`  
> Requested by and date: `[name / date]`  
> Status: `[proposed / assessing / approved / declined / deferred / completed]`

### Requested change and reason

> `[Describe the requested result in plain English and why it is wanted.]`

### Scope classification

- Existing approved requirement affected: `[ID or None]`
- Classification: `[correction within approved scope / additional work / useful later requirement /
  future enhancement / removal]`
- Current approved work continues as: `[details]`

### Effect assessment

| Area | Effect |
| --- | --- |
| First-release requirements and exclusions | `[none or details]` |
| Acceptance criteria | `[none or revised/new IDs]` |
| Price and payment checkpoints | `[none or revised amount/terms]` |
| Milestones and timing | `[none or revised dates]` |
| Responsibilities, assumptions and risks | `[none or details]` |
| Ownership, licence, support, maintenance and handover | `[none or details]` |

Additional estimate or separate agreement required: `[Yes / No, with reference]`

### Decision

No additional work proceeds until the authorised representatives approve this effect assessment.
Approval updates the proposal only as expressly stated here; all other terms and boundaries remain
unchanged.

Customer decision: `[approved / declined / deferred]` — `[name, role, date and reference]`  
Lang Systems decision: `[approved / declined / deferred]` — `[name, role, date and reference]`

## Template 3: Handover record

> Project: `[project name]`  
> Approved proposal version: `[version]`  
> Handover date: `[date]`  
> Secure handover location or reference: `[reference, not credentials]`

| Agreed handover item | Supplied? | Location or evidence | Customer recipient | Notes or exception |
| --- | --- | --- | --- | --- |
| `[copy each included item from section 21]` | `[Yes / No]` | `[secure reference]` | `[name/role]` | `[details]` |

Credentials transferred separately using: `[approved secure method]`  
Customer access confirmed by: `[name and date]`  
Known limitations and outstanding support items: `[list with owner and target, or None]`  
Materials or access to return, revoke or delete: `[item, owner and date, or None]`

Customer receipt: `[name, role, date and reference]`  
Lang Systems handover confirmation: `[name, role, date and reference]`

Receipt confirms delivery of the listed items. It does not waive unresolved acceptance criteria or
approve work outside the agreed scope.

## Template 4: Acceptance and project closure record

> Project: `[project name]`  
> Approved proposal version: `[version]`  
> Included approved change requests: `[IDs or None]`  
> Review date: `[date]`

### Acceptance results

| Criterion | Result | Evidence | Notes or agreed resolution |
| --- | --- | --- | --- |
| `[copy every criterion ID and wording]` | `[Accepted / Not accepted]` | `[reference]` | `[details]` |

Overall decision: `[Accepted / Not accepted / Accepted with the specific exceptions below]`

Exceptions and resolution: `[For each exception, record whether it is an in-scope correction, an
approved change, a support item or separately planned work, with owner and date. Write None if there
are no exceptions.]`

### Closure checklist

- Acceptance decision recorded: `[Yes / No]`
- Handover record completed: `[Yes / No / Not applicable]`
- Approved changes accounted for: `[Yes / No / Not applicable]`
- Support and maintenance start/end dates confirmed: `[details]`
- Final payment checkpoint reached: `[Yes / No / details]`
- Customer access/material return or deletion actions recorded: `[Yes / No / Not applicable]`
- Useful later requirements and future enhancements moved to a separate future-work list: `[reference]`
- Remaining actions: `[owner, action and due date, or None]`

Project status: `[Closed / Remains open because ...]`  
Closure date: `[date or Not yet closed]`

Customer authorised approver: `[name, role, decision, date and reference]`  
Lang Systems authorised approver: `[name, role, decision, date and reference]`

This closure record confirms the outcome against the agreed acceptance criteria. It does not add
new work, alter ownership or replace any separately required agreement.

## Document control and storage

Keep the source enquiry reference, proposal version and change-request IDs consistent across all
four templates. Never overwrite an approved version; save a new version and retain the approval
record. Completed documents contain customer and commercial information and must remain private.

Before issue, the Lang Systems reviewer must confirm:

- every placeholder has been replaced and unused model wording has been removed;
- the first release, later requirements, future enhancements and exclusions are unambiguous;
- price and timing align with milestones and responsibilities;
- every essential requirement maps to an acceptance criterion;
- the chosen commercial model matches the ownership, support and maintenance wording;
- all open questions that block agreement have been resolved;
- privacy, security, accessibility and regulatory needs have appropriate project-specific review;
- legal review has been obtained where appropriate; and
- approval remains manual and is recorded by authorised people.
