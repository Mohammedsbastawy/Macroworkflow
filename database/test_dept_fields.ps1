$directusUrl = "http://localhost:8055"
$token = "workflow-engine-admin-static-token-2026"
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "--- Query GET /fields/departments ---"
try {
    $fields = Invoke-RestMethod -Uri "$directusUrl/fields/departments" -Method Get -Headers $headers
    Write-Host ($fields | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Get Fields Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Details: $($reader.ReadToEnd())"
    }
}
