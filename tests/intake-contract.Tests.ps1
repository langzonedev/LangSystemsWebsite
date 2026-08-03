$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$index = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "index.html")
$controller = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "intake.js")
$service = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "intake-service.js")
$model = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "intake-model.js")
$customerSummary = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "customer-summary.js")
$serverValidation = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "server/intake-validation.js")
$requirementsInterpreter = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "server/requirements-interpreter.js")
$requirementsPromptPath = Join-Path $projectRoot "server/requirements-interpretation-prompt.md"
$requirementsSchemaPath = Join-Path $projectRoot "server/requirements-interpretation.schema.json"
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
Assert-True ($service -match 'url\.protocol\s*!==\s*"https:"') "The submission service must reject insecure endpoints."
Assert-True ($index -match '<script src="intake-model\.js"></script>\s*<script src="customer-summary\.js"></script>\s*<script src="intake-service\.js"></script>') "The shared intake model and customer summary generator must load before submission transport."
Assert-True ($controller -match 'intakeModel\.serialiseSubmission' -and $service -match 'LangSystemsIntakeModel\.parseSubmission') "Frontend generation and transport must enforce the shared model contract."
Assert-True ($model -match 'SCHEMA_VERSION\s*=\s*"3\.0\.0"' -and $model -match 'customerAnswers' -and $model -match 'processing') "The versioned model must separate customer answers from processing data."
Assert-True ($serverValidation -match 'IntakeModel\.validateSubmission' -and $serverValidation -notmatch 'console\.') "The server validation boundary must use the shared contract without logging submissions."
Assert-True ($controller -notmatch 'localStorage|sessionStorage|console\.') "Customer answers must not be stored in browser storage or written to the console."
Assert-True ($index -match 'data-error-summary' -and $controller -match 'showErrorSummary' -and $controller -match 'field-error') "Accessible field errors and an error summary are required."
Assert-True ($index -match 'name="attachments"[^>]+accept=' -and $controller -match 'maximumAttachmentBytes' -and $model -match 'ALLOWED_ATTACHMENT_EXTENSIONS') "Attachment type and size validation is required at both boundaries."
Assert-True ($controller -match 'validateAllSteps' -and $model -match 'required_consent' -and $model -match 'too_long') "Required consent, complete-form validation, and maximum lengths must be enforced."
Assert-True ($service -match 'timeoutMs' -and $controller -match 'submissionInProgress' -and $serverValidation -match 'createSubmissionGuard') "Timeout, rapid-repeat, and duplicate recovery controls are required."
Assert-True ($serverValidation -match 'MAX_REQUEST_BYTES' -and $serverValidation -match 'safeErrorResponse') "The server boundary must limit payloads and provide safe public errors."
Assert-True ((Test-Path $requirementsPromptPath) -and (Test-Path $requirementsSchemaPath)) "The versioned requirements prompt or schema is missing."
Assert-True ($requirementsInterpreter -match 'buildModelInput' -and $requirementsInterpreter -match 'deterministic_fallback' -and $requirementsInterpreter -notmatch 'console\.') "The requirements interpreter must minimise model input, recover deterministically, and avoid logging customer content."
Assert-True ($customerSummary -match 'Scope, price and timing are not final' -and $customerSummary -match 'printableHtml' -and $customerSummary -notmatch 'console\.') "The customer summary must include safeguards, printable output, and no customer logging."
Assert-True ($controller -match 'customerSummaryGenerator\.generate' -and $controller -match 'formData\.set\("_autoresponse", documents\.customerSummary\)' -and $index -match 'data-print-summary' -and $index -match 'data-download-summary') "The generated summary must feed customer email, print, and download outputs."
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

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $serverTestOutput = (& $node.Source (Join-Path $PSScriptRoot "intake-validation.Tests.js") 2>&1) -join "`n"
  Assert-True ($LASTEXITCODE -eq 0 -and $serverTestOutput -match "Server intake validation and duplicate-prevention checks passed\.") "Server intake validation tests failed: $serverTestOutput"
  Write-Output $serverTestOutput
  $serviceTestOutput = (& $node.Source (Join-Path $PSScriptRoot "intake-service.Tests.js") 2>&1) -join "`n"
  Assert-True ($LASTEXITCODE -eq 0 -and $serviceTestOutput -match "Intake submission success, provider failure, and timeout checks passed\.") "Intake submission service tests failed: $serviceTestOutput"
  Write-Output $serviceTestOutput
  $interpreterTestOutput = (& $node.Source (Join-Path $PSScriptRoot "requirements-interpreter.Tests.js") 2>&1) -join "`n"
  Assert-True ($LASTEXITCODE -eq 0 -and $interpreterTestOutput -match "Requirements interpretation, privacy minimisation, schema, and fallback checks passed\.") "Requirements interpreter tests failed: $interpreterTestOutput"
  Write-Output $interpreterTestOutput
  $summaryTestOutput = (& $node.Source (Join-Path $PSScriptRoot "customer-summary.Tests.js") 2>&1) -join "`n"
  Assert-True ($LASTEXITCODE -eq 0 -and $summaryTestOutput -match "Customer summary text, HTML, print, privacy, and safeguard checks passed\.") "Customer summary tests failed: $summaryTestOutput"
  Write-Output $summaryTestOutput
} else {
  Write-Output "Node.js is unavailable; server and submission-service runtime tests were skipped after static contract checks."
}

Write-Output "Intake contract checks passed."
