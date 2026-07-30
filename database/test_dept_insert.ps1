$directusUrl = "http://localhost:8055"
$token = "workflow-engine-admin-static-token-2026"
$headers = @{ "Authorization" = "Bearer $token" }

$dept = @{
    id = 'dept-exec'
    name = 'Executive Board & CEO Office'
    code = 'EXEC'
    head_user_id = 'user-mona'
    parent_department_id = $null
}

try {
    $bodyJson = $dept | ConvertTo-Json -Depth 5 -Compress
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyJson)
    $res = Invoke-RestMethod -Uri "$directusUrl/items/departments" -Method Post -Headers $headers -ContentType "application/json; charset=utf-8" -Body $bodyBytes -ErrorAction Stop
    Write-Host "Success inserting dept-exec:" ($res | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Error inserting dept-exec: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Details: $($reader.ReadToEnd())"
    }
}
