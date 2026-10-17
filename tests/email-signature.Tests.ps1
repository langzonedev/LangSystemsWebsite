$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$signatureRoot = Join-Path $projectRoot "templates/email-signature"
$template = Get-Content -Raw -Encoding UTF8 (Join-Path $signatureRoot "lang-systems-email-signature-template.html")
$greg = Get-Content -Raw -Encoding UTF8 (Join-Path $signatureRoot "greg-lang-system-engineer.html")

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

$brandValues = @(
  "https://langsystems.com.au/assets/lang-systems-mark-outline.png",
  "langsystemsdesign@outlook.com",
  "langsystems.com.au",
  "Idea to production ready software.",
  "#13072f",
  "#6c19ff",
  "Inter, 'Segoe UI', Arial, sans-serif"
)

foreach ($value in $brandValues) {
  Assert-True ($template.Contains($value) -and $greg.Contains($value)) "Missing or inconsistent brand value: $value"
}

Assert-True ($template.Contains("{{EMPLOYEE_NAME}}") -and $template.Contains("{{EMPLOYEE_TITLE}}") -and $template.Contains("{{EMPLOYEE_PHONE}}")) "The master template must expose the three approved employee fields."
Assert-True ($template.Contains("OPTIONAL PHONE ROW")) "The optional phone row must remain clearly marked."
Assert-True ($greg.Contains("Greg Lang") -and $greg.Contains("System Engineer")) "Greg's signature identity is incorrect."
Assert-True ($greg -notmatch "\{\{EMPLOYEE_" -and $greg -notmatch "tel:") "Greg's finished signature must not contain placeholders or an invented phone number."
Assert-True ($template -notmatch "<script" -and $greg -notmatch "<script") "Email signatures must not contain scripts."
Assert-True ($template -notmatch "<style" -and $greg -notmatch "<style") "Email signature styling must remain inline for portability."
Assert-True ($template -match '<table role="presentation"' -and $greg -match '<table role="presentation"') "Email signatures must use the compatible presentation-table layout."

Write-Output "Lang Systems email signature brand, employee-field, safety, and compatibility checks passed."
