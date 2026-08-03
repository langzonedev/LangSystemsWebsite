# Lang Systems Website

Static company website for Lang Systems.

Lang Systems is positioned as a technology-focused software company that takes ideas
through to production-ready applications, including custom software, system
integration, workflow automation, and future product development.

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
clarification questions. Its `_autoresponse` field sends the customer a plain-language receipt.

Before using the form in production, send one test submission and follow the activation email sent
to `langsystemsdesign@outlook.com`. FormSubmit requires that one-time confirmation for a new form.
Also verify the test submission and customer confirmation email, including junk-mail folders.

To change providers later, update the form `action` in `index.html`. Keep the existing field names
or map them in the replacement service. The browser does not save submissions to local storage,
put them in URLs, or send them to analytics. Form contents are transmitted to the configured form
provider for email delivery, so the provider and the site's privacy wording should be reviewed
before launch.
