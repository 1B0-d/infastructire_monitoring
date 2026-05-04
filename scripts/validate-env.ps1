param(
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

function Read-DotEnv {
  param([string]$Path)

  $values = @{}
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Environment file '$Path' was not found."
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) {
      return
    }

    $parts = $line -split "=", 2
    if ($parts.Length -eq 2) {
      $values[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
    }
  }

  return $values
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot $EnvFile
$values = Read-DotEnv -Path $envPath

$required = @(
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CREDENTIALS_HOST_PATH",
  "CORS_ORIGINS",
  "MONGO_URL"
)

$errors = New-Object System.Collections.Generic.List[string]

foreach ($name in $required) {
  if (-not $values.ContainsKey($name) -or [string]::IsNullOrWhiteSpace($values[$name])) {
    $errors.Add("$name is missing or empty.")
  }
}

if ($values.ContainsKey("MONGO_URL")) {
  if ($values["MONGO_URL"] -notmatch "^mongodb://") {
    $errors.Add("MONGO_URL must start with mongodb://")
  }

  if ($values["MONGO_URL"] -match "wrong-mongodb") {
    $errors.Add("MONGO_URL points to wrong-mongodb, which is the incident simulation value.")
  }
}

if ($values.ContainsKey("FIREBASE_CREDENTIALS_HOST_PATH")) {
  $credentialsPath = $values["FIREBASE_CREDENTIALS_HOST_PATH"]
  if (-not [System.IO.Path]::IsPathRooted($credentialsPath)) {
    $credentialsPath = Join-Path $repoRoot $credentialsPath
  }

  if (-not (Test-Path -LiteralPath $credentialsPath)) {
    $errors.Add("Firebase credentials file was not found at $credentialsPath")
  }
}

if ($errors.Count -gt 0) {
  Write-Host "Pre-deployment validation failed:" -ForegroundColor Red
  foreach ($item in $errors) {
    Write-Host " - $item" -ForegroundColor Red
  }
  exit 1
}

Write-Host "Pre-deployment validation passed for $EnvFile" -ForegroundColor Green
