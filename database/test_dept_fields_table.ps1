$directusUrl = "http://localhost:8055"
$token = "workflow-engine-admin-static-token-2026"
$headers = @{ "Authorization" = "Bearer $token" }

$fields = Invoke-RestMethod -Uri "$directusUrl/fields/departments" -Method Get -Headers $headers
$fields.data | Select-Object field, type, @{N='dataType';E={$_.schema.data_type}}, @{N='isPrimary';E={$_.schema.is_primary_key}}, @{N='fkTable';E={$_.schema.foreign_key_table}} | Format-Table -AutoSize | Out-String | Write-Host
