# Lang Systems Client Project Intake Workflow — Project Anchor

Status: Active  
Last reviewed: 3 August 2026  
Owner: Lang Systems

## Purpose

This Project Anchor records the non-negotiable product and delivery context for the Lang Systems Client Project Intake Workflow. It applies to the intake architecture, implementation, content, testing, and future changes.

The workflow belongs inside the existing Lang Systems website. It helps a prospective customer describe an operational problem and gives Lang Systems enough structured information to assess the enquiry and plan a practical first release.

The detailed sources of truth are [Project Intake Architecture and Design](project-intake-architecture.md) and the implementation-ready [Customer Project Discovery Journey](customer-project-discovery-journey.md).

## Audience and experience

The primary audience is business owners and managers who understand their operational problem but may have little or no software knowledge. Customer-facing language must be professional, clear, direct, reassuring, and non-technical. Unexplained terms such as “MVP”, “API”, “SaaS”, “database schema”, “deployment pipeline”, and “technical stack” must not be used.

The workflow must appear only after a visitor intentionally selects a “Get Started” or equivalent project-enquiry control. It must not use automatic pop-ups, obstructive prompts, advertising, or unrelated distractions.

Changes must preserve the website’s visual identity, responsiveness, accessibility, and existing functionality. Existing components and conventions should be reused, and new code should remain modular enough to support later automation without committing to it now.

## First-release boundaries

The first release uses email-based submission and tracking. It gathers the enquiry, presents a review step, submits it to an approved email-delivery service, gives the visitor an on-screen result, and sends the defined email outputs.

The first release is not a customer relationship management system, ticketing platform, client portal, payment system, or autonomous Kanban integration. Those capabilities require a separately approved design and privacy/security review.

The implementation must include appropriate validation, accessible error handling, and supporting documentation. Credentials, API keys, email passwords, and production secrets must never be committed to the repository.

## Change rule

If a future request conflicts with this anchor, the conflict must be documented and resolved explicitly before implementation. Conversation history alone is not a source of product requirements.
