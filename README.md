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

The “Get Started” project discovery wizard submits through FormSubmit to
`langsystemsdesign@outlook.com`. FormSubmit sends Lang Systems the customer's answers plus a
generated customer summary, technical requirements specification, internal project brief, and
clarification questions. Its `_autoresponse` field sends the customer the plain-language project
understanding summary. After a successful submission, the customer can also print or download the
same branded summary as a self-contained HTML document.

Before using the form in production, send one test submission and follow the activation email sent
to `langsystemsdesign@outlook.com`. FormSubmit requires that one-time confirmation for a new form.
Also verify the test submission and customer confirmation email, including junk-mail folders.

To change providers later, update the form `action` in `index.html` and adapt
`intake-service.js` if the replacement does not accept the existing form payload. Keep the stable
field names or map them in the replacement service. The browser does not save submissions to local storage,
put them in URLs, or send them to analytics. Form contents are transmitted to the configured form
provider for email delivery, so the provider and the site's privacy wording should be reviewed
before launch.

## Checks

Run the dependency-free intake contract checks from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/intake-contract.Tests.ps1
```

The site is static and has no compilation step. A production check consists of running the contract
checks and serving the repository root with the local preview command above. When Node.js is
available, the same command also runs `tests/intake-validation.Tests.js`; otherwise it reports that
the server runtime portion was skipped. Before launch, manually verify keyboard and screen-reader
error announcements, an unsupported/oversized file, offline and timeout recovery, and a successful
activated FormSubmit delivery in a supported browser.
