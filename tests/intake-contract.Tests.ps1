$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$index = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "index.html")
$controller = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "intake.js")
$service = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "intake-service.js")
$model = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "intake-model.js")
$clarificationQuestions = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "clarification-questions.js")
$customerSummary = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "customer-summary.js")
$serverValidation = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "server/intake-validation.js")
$emailDelivery = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "server/email-delivery.js")
$intakeEndpoint = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "server/intake-endpoint.js")
$requirementsInterpreter = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "server/requirements-interpreter.js")
$requirementsPromptPath = Join-Path $projectRoot "server/requirements-interpretation-prompt.md"
$requirementsSchemaPath = Join-Path $projectRoot "server/requirements-interpretation.schema.json"
$technicalSpecification = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "server/technical-specification.js")
$technicalSpecificationSchemaPath = Join-Path $projectRoot "server/technical-specification.schema.json"
$internalProjectBrief = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "internal-project-brief.js")
$internalProjectBriefSchemaPath = Join-Path $projectRoot "server/internal-project-brief.schema.json"
$questionSetPath = Join-Path $projectRoot "docs/client-discovery-question-set.md"
$questionSet = Get-Content -Raw -Encoding UTF8 $questionSetPath

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

$stepCount = ([regex]::Matches($index, '<section[^>]+data-step(?:\s|>)')).Count
Assert-True ($stepCount -eq 8) "Expected exactly eight discovery steps; found $stepCount."
Assert-True ($index -match '<dialog[^>]+data-intake-dialog' -and $index -notmatch '<dialog[^>]+\sopen(?:\s|>)') "The wizard must be a closed dialog until intentionally opened."
Assert-True (([regex]::Matches($index, 'data-open-intake')).Count -ge 1) "At least one intentional Get Started control is required."
Assert-True ($index -match 'services-invitation' -and $index -match 'Tell us what you are trying to\s+achieve, and we will handle the technical translation\.') "The services area must include the reassuring project-discovery invitation."
Assert-True ($controller -match 'history\.pushState' -and $controller -match 'addEventListener\("popstate"' -and $controller -match 'history\.back\(\)') "The wizard must integrate with browser Back and Forward navigation."
Assert-True ($controller -match 'dialog\.addEventListener\("close", \(\) => lastTrigger\?\.focus\(\)\)') "Closing the wizard must return focus to its opening control."
Assert-True ($index -match 'role="progressbar"' -and $index -match 'aria-valuetext=') "Progress must be exposed to assistive technology."
Assert-True ($index -match 'data-review-summary' -and $controller -match 'data-edit-step') "The review step must offer direct correction controls."
Assert-True ($controller -match 'LangSystemsIntakeSubmission' -and $controller -notmatch 'await\s+fetch\s*\(') "Submission transport must stay behind the service boundary."
Assert-True ($service -match 'url\.protocol\s*!==\s*"https:"' -and $service -match 'isLocalDevelopment') "The submission service must reject insecure non-local endpoints."
Assert-True ($index -match '<script src="intake-model\.js"></script>\s*<script src="clarification-questions\.js"></script>\s*<script src="internal-project-brief\.js"></script>\s*<script src="customer-summary\.js"></script>\s*<script src="intake-service\.js"></script>') "The shared intake model and internal/customer document generators must load before submission transport."
Assert-True ($controller -match 'intakeModel\.serialiseSubmission' -and $service -match 'LangSystemsIntakeModel\.parseSubmission') "Frontend generation and transport must enforce the shared model contract."
Assert-True ($model -match 'SCHEMA_VERSION\s*=\s*"3\.0\.0"' -and $model -match 'customerAnswers' -and $model -match 'processing') "The versioned model must separate customer answers from processing data."
Assert-True ($serverValidation -match 'IntakeModel\.validateSubmission' -and $serverValidation -notmatch 'console\.') "The server validation boundary must use the shared contract without logging submissions."
Assert-True ($controller -notmatch 'localStorage|sessionStorage|console\.') "Customer answers must not be stored in browser storage or written to the console."
Assert-True ($index -match 'data-error-summary' -and $controller -match 'showErrorSummary' -and $controller -match 'field-error') "Accessible field errors and an error summary are required."
Assert-True ($index -match 'name="attachments"[^>]+accept=' -and $controller -match 'maximumAttachmentBytes' -and $model -match 'ALLOWED_ATTACHMENT_EXTENSIONS') "Attachment type and size validation is required at both boundaries."
Assert-True ($controller -match 'validateAllSteps' -and $model -match 'required_consent' -and $model -match 'too_long') "Required consent, complete-form validation, and maximum lengths must be enforced."
Assert-True ($service -match 'timeoutMs' -and $controller -match 'submissionInProgress' -and $serverValidation -match 'createSubmissionGuard') "Timeout, rapid-repeat, and duplicate recovery controls are required."
Assert-True ($serverValidation -match 'MAX_REQUEST_BYTES' -and $serverValidation -match 'safeErrorResponse') "The server boundary must limit payloads and provide safe public errors."
Assert-True ($index -match 'action="/api/project-submissions"' -and $service -match 'Content-Type": "application/json"' -and $intakeEndpoint -match 'createEmailDeliveryService') "The browser must submit to the configured first-party email endpoint."
Assert-True ($emailDelivery -match 'INTAKE_EMAIL_MODE' -and $emailDelivery -match 'RESEND_API_KEY' -and $emailDelivery -match 'escapeHtml' -and $emailDelivery -notmatch 'console\.') "Email delivery must be environment-configured, escaped, and keep customer content out of logs."
Assert-True ($emailDelivery -match 'record\.customer\.status !== "sent"' -and $emailDelivery -match 'record\.internal\.status !== "sent"' -and $emailDelivery -match 'createMemoryStatusStore') "Email recipients must be independently retried with recorded status and duplicate prevention."
Assert-True ((Test-Path $requirementsPromptPath) -and (Test-Path $requirementsSchemaPath)) "The versioned requirements prompt or schema is missing."
Assert-True ($requirementsInterpreter -match 'buildModelInput' -and $requirementsInterpreter -match 'deterministic_fallback' -and $requirementsInterpreter -notmatch 'console\.') "The requirements interpreter must minimise model input, recover deterministically, and avoid logging customer content."
Assert-True ((Test-Path $technicalSpecificationSchemaPath) -and $technicalSpecification -match 'sourceSubmissionId' -and $technicalSpecification -match 'customerApproved' -and $technicalSpecification -notmatch 'console\.') "The internal technical specification must be versioned, traceable, non-authoritative, and must not log customer content."
Assert-True ((Test-Path $internalProjectBriefSchemaPath) -and $internalProjectBrief -match 'manualReviewRequired' -and $internalProjectBrief -match 'customer_evidence' -and $internalProjectBrief -match 'not a reason to reject' -and $internalProjectBrief -notmatch 'console\.') "The internal project brief must be structured, traceable, manually reviewed, budget-safe, and must not log customer content."
Assert-True ($controller -match 'LangSystemsInternalProjectBrief\.buildBrief\(structuredProject\)' -and $controller -match 'lang_systems_project_brief_internal' -and $controller -notmatch 'internalStatus.*_autoresponse') "The validated internal brief must feed only the internal email output."
Assert-True ($controller -match 'LangSystemsClarificationQuestions\.generate\(structuredProject\)' -and $clarificationQuestions -match 'requiredBeforeEstimation' -and $clarificationQuestions -match 'requiredBeforeDevelopment' -and $clarificationQuestions -match 'helpfulButNonBlocking' -and $clarificationQuestions -match 'manualReviewRequired' -and $clarificationQuestions -notmatch 'console\.') "Clarification questions must be grouped, manually reviewed, validated, and kept out of logs."
Assert-True ($customerSummary -match 'Scope, price and timing are not final' -and $customerSummary -match 'printableHtml' -and $customerSummary -notmatch 'console\.') "The customer summary must include safeguards, printable output, and no customer logging."
Assert-True ($controller -match 'customerSummaryGenerator\.generate' -and $controller -match 'customer_friendly_project_summary' -and $index -match 'data-confirmation-summary-text' -and $index -match 'data-download-summary') "The generated summary must feed customer email, the confirmation view, and download output."
Assert-True ($index -match 'data-confirmation-reference' -and $index -match 'data-confirmation-business' -and $index -match 'not a binding agreement' -and $index -match 'data-correction-link') "The confirmation must show the safe reference and business context, explain the non-binding status, and provide a correction route."
Assert-True ($index -match 'data-print-confirmation' -and $controller -match 'result\.reference !== pendingDocuments\.projectReference' -and $controller -match 'submissionComplete \|\| submissionInProgress') "The confirmation must be printable and must only display after the server confirms the matching reference without duplicate submission."
Assert-True ($controller -match 'error\.delivery\?\.customer' -and $controller -match 'cannot show a completed confirmation') "Partial email delivery must remain a clearly explained non-success state."
Assert-True ($controller -match 'INTERNAL TECHNICAL REQUIREMENTS SPECIFICATION' -and $controller -match 'Essential first-release requirements' -and $controller -match 'Recommended investigation tasks' -and $controller -match '\[\$\{item\.status\.toUpperCase\(\)\}\]') "The internal email must include the complete, status-labelled technical specification."
Assert-True (Test-Path -LiteralPath $questionSetPath) "The client discovery question set is missing."

$questionSetSections = @(
  "Contact and business details", "Current situation", "Desired outcome and practical needs",
  "First release and common capabilities", "Commercial preference", "Budget and timing",
  "Success, supporting information, and anything unusual", "Review and permission to respond"
)

foreach ($section in $questionSetSections) {
  Assert-True ($questionSet -match [regex]::Escape($section)) "Question set section '$section' is missing."
}

$requiredQuestionSetPhrases = @(
  "Preferred contact method", "What works well today", "work when internet access is unavailable",
  "Artificial intelligence", "completely bespoke system", "Please help us understand what is realistic",
  "How would you know this project had been successful six months after launch",
  "screenshots, example spreadsheets, existing forms, reports, process documents, diagrams, and example outputs"
)

foreach ($phrase in $requiredQuestionSetPhrases) {
  Assert-True ($questionSet -match [regex]::Escape($phrase)) "Question set requirement '$phrase' is missing."
}

$allFields = @(
  "contact_name", "email", "phone", "business_name", "business_description", "problem",
  "current_process", "problem_impact", "desired_outcome", "users", "existing_systems",
  "data_needs", "first_release", "optional_requirements", "future_ideas",
  "excluded_functionality", "budget", "timing", "timing_context", "delivery_model",
  "day_to_day_owner", "ongoing_support", "acceptance_criteria", "constraints",
  "additional_notes", "privacy_consent"
)

$optionalFields = @(
  "phone", "existing_systems", "data_needs", "optional_requirements", "future_ideas",
  "excluded_functionality", "timing_context", "constraints", "additional_notes"
)

foreach ($field in $allFields) {
  Assert-True ($index -match ('name="' + [regex]::Escape($field) + '"')) "Approved field '$field' is missing."

  if ($field -notin $optionalFields) {
    Assert-True ($index -match ('name="' + [regex]::Escape($field) + '"[^>]*\brequired\b')) "Required field '$field' is no longer required."
  }
}

$localReferences = [regex]::Matches($index, '(?:href|src)="([^"#:?]+)"') |
  ForEach-Object { $_.Groups[1].Value } |
  Where-Object { $_ -notmatch '^(?:https?:)?//' }

foreach ($reference in $localReferences) {
  Assert-True (Test-Path -LiteralPath (Join-Path $projectRoot $reference)) "Referenced local asset '$reference' does not exist."
}

$modelTestOutput = (& cscript //NoLogo //E:JScript (Join-Path $PSScriptRoot "intake-model.Tests.js") 2>&1) -join "`n"
Assert-True ($LASTEXITCODE -eq 0 -and $modelTestOutput -match "Intake model validation and serialisation checks passed\." -and $modelTestOutput -notmatch "runtime error") "Intake model tests failed: $modelTestOutput"
Write-Output $modelTestOutput

$briefBrowserTestOutput = (& cscript //NoLogo //E:JScript (Join-Path $PSScriptRoot "internal-project-brief-browser.Tests.js") 2>&1) -join "`n"
Assert-True ($LASTEXITCODE -eq 0 -and $briefBrowserTestOutput -match "Internal project brief browser generation, evidence, readiness, and budget checks passed\." -and $briefBrowserTestOutput -notmatch "runtime error") "Internal project brief browser tests failed: $briefBrowserTestOutput"
Write-Output $briefBrowserTestOutput

$clarificationBrowserTestOutput = (& cscript //NoLogo //E:JScript (Join-Path $PSScriptRoot "clarification-questions-browser.Tests.js") 2>&1) -join "`n"
Assert-True ($LASTEXITCODE -eq 0 -and $clarificationBrowserTestOutput -match "Clarification question browser targeting, grouping, contradiction, and limit checks passed\." -and $clarificationBrowserTestOutput -notmatch "runtime error") "Clarification question browser tests failed: $clarificationBrowserTestOutput"
Write-Output $clarificationBrowserTestOutput

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $serverTestOutput = (& $node.Source (Join-Path $PSScriptRoot "intake-validation.Tests.js") 2>&1) -join "`n"
  Assert-True ($LASTEXITCODE -eq 0 -and $serverTestOutput -match "Server intake validation and duplicate-prevention checks passed\.") "Server intake validation tests failed: $serverTestOutput"
  Write-Output $serverTestOutput
  $serviceTestOutput = (& $node.Source (Join-Path $PSScriptRoot "intake-service.Tests.js") 2>&1) -join "`n"
  Assert-True ($LASTEXITCODE -eq 0 -and $serviceTestOutput -match "Intake submission success, provider failure, and timeout checks passed\.") "Intake submission service tests failed: $serviceTestOutput"
  Write-Output $serviceTestOutput
  $emailTestOutput = (& $node.Source (Join-Path $PSScriptRoot "email-delivery.Tests.js") 2>&1) -join "`n"
  Assert-True ($LASTEXITCODE -eq 0 -and $emailTestOutput -match "Email branding, sanitisation, partial failure, status, retry, and duplicate-prevention checks passed\.") "Email delivery tests failed: $emailTestOutput"
  Write-Output $emailTestOutput
  $endpointTestOutput = (& $node.Source (Join-Path $PSScriptRoot "intake-endpoint.Tests.js") 2>&1) -join "`n"
  Assert-True ($LASTEXITCODE -eq 0 -and $endpointTestOutput -match "Intake endpoint validation, origin, honeypot, and safe-response checks passed\.") "Intake endpoint tests failed: $endpointTestOutput"
  Write-Output $endpointTestOutput
  $interpreterTestOutput = (& $node.Source (Join-Path $PSScriptRoot "requirements-interpreter.Tests.js") 2>&1) -join "`n"
  Assert-True ($LASTEXITCODE -eq 0 -and $interpreterTestOutput -match "Requirements interpretation, privacy minimisation, schema, and fallback checks passed\.") "Requirements interpreter tests failed: $interpreterTestOutput"
  Write-Output $interpreterTestOutput
  $technicalSpecificationTestOutput = (& $node.Source (Join-Path $PSScriptRoot "technical-specification.Tests.js") 2>&1) -join "`n"
  Assert-True ($LASTEXITCODE -eq 0 -and $technicalSpecificationTestOutput -match "Technical specification sections, traceability, validation, privacy, and fallback checks passed\.") "Technical specification tests failed: $technicalSpecificationTestOutput"
  Write-Output $technicalSpecificationTestOutput
  $internalProjectBriefTestOutput = (& $node.Source (Join-Path $PSScriptRoot "internal-project-brief.Tests.js") 2>&1) -join "`n"
  Assert-True ($LASTEXITCODE -eq 0 -and $internalProjectBriefTestOutput -match "Internal project brief structure, recommendations, readiness, privacy, validation, and budget checks passed\.") "Internal project brief tests failed: $internalProjectBriefTestOutput"
  Write-Output $internalProjectBriefTestOutput
  $summaryTestOutput = (& $node.Source (Join-Path $PSScriptRoot "customer-summary.Tests.js") 2>&1) -join "`n"
  Assert-True ($LASTEXITCODE -eq 0 -and $summaryTestOutput -match "Customer summary text, HTML, print, privacy, and safeguard checks passed\.") "Customer summary tests failed: $summaryTestOutput"
  Write-Output $summaryTestOutput
  $clarificationTestOutput = (& $node.Source (Join-Path $PSScriptRoot "clarification-questions.Tests.js") 2>&1) -join "`n"
  Assert-True ($LASTEXITCODE -eq 0 -and $clarificationTestOutput -match "Clarification question targeting, grouping, contradictions, validation, and limits passed\.") "Clarification question tests failed: $clarificationTestOutput"
  Write-Output $clarificationTestOutput
} else {
  Write-Output "Node.js is unavailable; server and submission-service runtime tests were skipped after static contract checks."
}

Write-Output "Intake contract checks passed."
