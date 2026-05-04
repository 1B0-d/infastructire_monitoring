param(
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot

try {
  & "$PSScriptRoot\validate-env.ps1" -EnvFile $EnvFile
  docker compose up -d --build
  docker compose ps
} finally {
  Pop-Location
}
