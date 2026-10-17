# Lang Systems email signature

This directory contains the approved reusable Lang Systems email signature and Greg Lang's current
instance.

## Files

- `lang-systems-email-signature-template.html` — master employee template.
- `greg-lang-system-engineer.html` — ready-to-copy signature for Greg Lang, System Engineer.

## Brand-controlled content

Keep these details unchanged unless the Lang Systems brand or business details are formally updated:

- LS logo and its website-hosted URL;
- Lang Systems name and tagline;
- `langsystemsdesign@outlook.com`;
- `langsystems.com.au`;
- colours, typography stack, spacing and layout.

The template uses the website's Inter typeface first, followed by email-safe Segoe UI and Arial
fallbacks. All styling is inline and the layout uses presentation tables for broad email-client
compatibility.

## Employee fields

Change only these placeholders in the master template:

1. `{{EMPLOYEE_NAME}}`
2. `{{EMPLOYEE_TITLE}}`
3. `{{EMPLOYEE_PHONE}}`

Use the employee's full international phone format where practical. If no employee phone number is
to be published, remove the complete HTML row marked `OPTIONAL PHONE ROW`; Greg's current instance
does this because no approved number was supplied.

## Install in Outlook

1. Open the required `.html` file in a browser.
2. Select only the rendered signature, from the logo through to the website line, and copy it.
3. In Outlook, open the signature settings and create a new signature.
4. Paste using **Keep source formatting**, then save.
5. Send a test email to an external address and check desktop, mobile, light mode and dark mode.

Do not copy the page's white margin around the signature. Images may initially appear blocked to a
recipient until they allow remote images; the alt text still identifies Lang Systems.

## Creating another employee signature

Copy the master template to a lowercase, hyphenated filename such as
`jane-smith-project-manager.html`, replace the three employee placeholders, and remove the optional
phone row if it is not required. Do not edit the master template for one employee.
