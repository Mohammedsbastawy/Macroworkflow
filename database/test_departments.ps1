$directusUrl = "http://localhost:8055"
$token = "workflow-engine-admin-static-token-2026"
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "--- Query GET /collections/departments ---"
try {
    $coll = Invoke-RestMethod -Uri "$directusUrl/collections/departments" -Method Get -Headers $headers
    Write-Host ($coll | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Get Coll Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Details: $($reader.ReadToEnd())"
    }
}

Write-Host "`n--- Query GET /items/departments ---"
try {
    $items = Invoke-RestMethod -Uri "$directusUrl/items/departments" -Method Get -Headers $headers
    Write-Host ($items | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Get Items Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Details: $($reader.ReadToEnd())"
    }
}
