$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$index = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "index.html")
$controller = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "intake.js")
$service = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot "intake-service.js")
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
Assert-True ($index -match 'role="progressbar"' -and $index -match 'aria-valuetext=') "Progress must be exposed to assistive technology."
Assert-True ($index -match 'data-review-summary' -and $controller -match 'data-edit-step') "The review step must offer direct correction controls."
Assert-True ($controller -match 'LangSystemsIntakeSubmission' -and $controller -notmatch 'await\s+fetch\s*\(') "Submission transport must stay behind the service boundary."
Assert-True ($service -match 'url\.protocol\s*!==\s*"https:"') "The submission service must reject insecure endpoints."
Assert-True ($controller -notmatch 'localStorage|sessionStorage|console\.') "Customer answers must not be stored in browser storage or written to the console."
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

Write-Output "Intake contract checks passed."
