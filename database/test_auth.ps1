$directusUrl = "http://localhost:8055"
$staticToken = "workflow-engine-admin-static-token-2026"

Write-Host "--- Test 1: Using Static Token ---"
try {
    $me = Invoke-RestMethod -Uri "$directusUrl/users/me" -Method Get -Headers @{ Authorization = "Bearer $staticToken" }
    Write-Host "Static Token User:" ($me | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "Static Token Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "  Details: $($reader.ReadToEnd())"
    }
}

Write-Host "`n--- Test 2: Admin Login ---"
try {
    $loginBody = @{ email = "admin@example.com"; password = "admin123" } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "$directusUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
    $token = $loginRes.data.access_token
    Write-Host "Login Token obtained: $token"
    $me2 = Invoke-RestMethod -Uri "$directusUrl/users/me" -Method Get -Headers @{ Authorization = "Bearer $token" }
    Write-Host "Admin User:" ($me2 | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "Login Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "  Details: $($reader.ReadToEnd())"
    }
}
