$directusUrl = "http://localhost:8055"
$token = "workflow-engine-admin-static-token-2026"
$headers = @{ "Authorization" = "Bearer $token" }

$jsonString = @"
{
  "collection": "system_users",
  "meta": {
    "collection": "system_users",
    "icon": "people",
    "note": "System Users Directory"
  },
  "schema": {},
  "fields": [
    {
      "field": "id",
      "type": "string",
      "meta": { "required": true },
      "schema": { "is_primary_key": true, "length": 64 }
    },
    {
      "field": "name",
      "type": "string",
      "schema": { "length": 255 }
    },
    {
      "field": "email",
      "type": "string",
      "schema": { "length": 255 }
    },
    {
      "field": "department_id",
      "type": "string",
      "schema": { "length": 64 }
    },
    {
      "field": "group_ids_json",
      "type": "json"
    },
    {
      "field": "role",
      "type": "string",
      "schema": { "length": 50 }
    },
    {
      "field": "avatar_initials",
      "type": "string",
      "schema": { "length": 10 }
    },
    {
      "field": "job_title",
      "type": "string",
      "schema": { "length": 255 }
    },
    {
      "field": "direct_manager_id",
      "type": "string",
      "schema": { "length": 64 }
    },
    {
      "field": "unit",
      "type": "string",
      "schema": { "length": 255 }
    },
    {
      "field": "is_active",
      "type": "boolean",
      "schema": { "default_value": true }
    }
  ]
}
"@

try {
    $res = Invoke-RestMethod -Uri "$directusUrl/collections" -Method Post -Headers $headers -ContentType "application/json; charset=utf-8" -Body $jsonString -ErrorAction Stop
    Write-Host "Collection system_users created successfully:" ($res | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Error creating system_users collection: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Details: $($reader.ReadToEnd())"
    }
}
