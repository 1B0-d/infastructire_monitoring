param(
  [string]$PrometheusUrl = "http://localhost:9090"
)

$ErrorActionPreference = "Stop"

$queries = [ordered]@{
  "Targets up" = 'up'
  "RPS by service" = 'sum by (service) (rate(sre_http_requests_total[2m]))'
  "Error rate by service" = '(sum by (service) (rate(sre_http_errors_total[2m])) / sum by (service) (rate(sre_http_requests_total[2m])))'
  "p95 latency by service" = 'histogram_quantile(0.95, sum by (service, le) (rate(sre_http_request_duration_seconds_bucket[2m])))'
  "CPU cores by job" = 'sum by (job) (rate(process_cpu_user_seconds_total{job=~".*-service"}[2m]) + rate(process_cpu_system_seconds_total{job=~".*-service"}[2m]))'
  "Memory MB by job" = 'process_resident_memory_bytes{job=~".*-service"} / 1024 / 1024'
  "Recent service restarts" = 'changes(process_start_time_seconds{job=~".*-service"}[10m])'
}

function Invoke-PrometheusQuery {
  param([string]$Query)

  $encoded = [System.Uri]::EscapeDataString($Query)
  $url = "$PrometheusUrl/api/v1/query?query=$encoded"
  return Invoke-RestMethod -Uri $url -Method Get
}

foreach ($entry in $queries.GetEnumerator()) {
  Write-Host ""
  Write-Host "== $($entry.Key) =="
  $response = Invoke-PrometheusQuery -Query $entry.Value

  if ($response.status -ne "success") {
    Write-Host "Query failed: $($entry.Value)" -ForegroundColor Red
    continue
  }

  if ($response.data.result.Count -eq 0) {
    Write-Host "No data"
    continue
  }

  foreach ($result in $response.data.result) {
    $labels = ($result.metric.PSObject.Properties | ForEach-Object {
      "$($_.Name)=$($_.Value)"
    }) -join ", "
    $value = [double]$result.value[1]
    Write-Host ("{0} -> {1:N4}" -f $labels, $value)
  }
}
