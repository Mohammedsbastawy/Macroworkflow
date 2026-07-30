$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$directusUrl = "http://localhost:8055"
$token = "workflow-engine-admin-static-token-2026"
$headers = @{
    "Authorization" = "Bearer $token"
}

Write-Host "=== Directus Seeding Script ==="
Write-Host "URL: $directusUrl"

# Helper for GET
function Get-DirectusItem {
    param([string]$Path)
    try {
        return Invoke-RestMethod -Uri "$directusUrl$Path" -Method Get -Headers $headers -ErrorAction Stop
    } catch {
        return $null
    }
}

# Helper for POST
function Post-DirectusData {
    param(
        [string]$Path,
        [object]$Payload
    )
    $json = $Payload | ConvertTo-Json -Depth 10 -Compress
    return Invoke-RestMethod -Uri "$directusUrl$Path" -Method Post -Headers $headers -ContentType "application/json; charset=utf-8" -Body $json -ErrorAction Stop
}

# -------------------------------------------------------------
# TASK 1: Seed DEPARTMENTS collection
# -------------------------------------------------------------
Write-Host "`n================================================="
Write-Host "Task 1: Seed DEPARTMENTS Collection"
Write-Host "================================================="

$departments = @(
    @{ id = 'dept-exec';        name = 'Executive Board & CEO Office';          code = 'EXEC'; head_user_id = 'user-mona';   parent_department_id = $null },
    @{ id = 'dept-it';          name = 'IT & Technology Department';             code = 'IT';   head_user_id = 'user-khaled'; parent_department_id = 'dept-exec' },
    @{ id = 'dept-hr';          name = 'Human Resources (HR)';                  code = 'HR';   head_user_id = 'user-sara';   parent_department_id = 'dept-exec' },
    @{ id = 'dept-finance';     name = 'Finance & Accounts Department';          code = 'FIN';  head_user_id = 'user-mona';   parent_department_id = 'dept-exec' },
    @{ id = 'dept-procurement'; name = 'Procurement Department';                 code = 'PROC'; head_user_id = 'user-yasser'; parent_department_id = 'dept-exec' },
    @{ id = 'dept-ops';         name = 'Operations & Facilities';                code = 'OPS';  head_user_id = 'user-karim';  parent_department_id = 'dept-exec' },
    @{ id = 'dept-mkt';         name = 'Marketing & Digital Branding Department';code = 'MKT';  head_user_id = 'user-sherif'; parent_department_id = 'dept-exec' }
)

$deptInserted = 0
$deptSkipped = 0
$deptErrors = 0

foreach ($d in $departments) {
    $existing = Get-DirectusItem -Path "/items/departments/$($d.id)"
    if ($existing -and $existing.data) {
        Write-Host "  [SKIPPED] Department '$($d.id)' already exists."
        $deptSkipped++
    } else {
        try {
            $res = Post-DirectusData -Path "/items/departments" -Payload $d
            Write-Host "  [INSERTED] Department '$($d.id)' ($($d.name))"
            $deptInserted++
        } catch {
            Write-Host "  [ERROR] Department '$($d.id)': $_"
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                Write-Host "    Details: $($reader.ReadToEnd())"
            }
            $deptErrors++
        }
    }
}
Write-Host "Departments Summary -> Inserted: $deptInserted | Skipped: $deptSkipped | Errors: $deptErrors"


# -------------------------------------------------------------
# TASK 2: Create & Seed SYSTEM_USERS Collection
# -------------------------------------------------------------
Write-Host "`n================================================="
Write-Host "Task 2: Create & Seed SYSTEM_USERS Collection"
Write-Host "================================================="

$usersColl = Get-DirectusItem -Path "/collections/system_users"
if ($usersColl -and $usersColl.data) {
    Write-Host "Collection 'system_users' already exists."
} else {
    Write-Host "Creating collection 'system_users'..."
    try {
        $createCollPayload = @{ collection = 'system_users'; schema = @{} }
        $resColl = Post-DirectusData -Path "/collections" -Payload $createCollPayload
        Write-Host "Collection 'system_users' base created."
    } catch {
        Write-Host "Error creating 'system_users' base collection: $_"
    }

    $systemUsersFields = @(
        @{ field = "id";                type = "string";  schema = @{ is_primary_key = $true; length = 64 } },
        @{ field = "name";              type = "string";  schema = @{ length = 255 } },
        @{ field = "email";             type = "string";  schema = @{ length = 255 } },
        @{ field = "department_id";     type = "string";  schema = @{ length = 64 } },
        @{ field = "group_ids_json";    type = "json" },
        @{ field = "role";              type = "string";  schema = @{ length = 50 } },
        @{ field = "avatar_initials";   type = "string";  schema = @{ length = 10 } },
        @{ field = "job_title";         type = "string";  schema = @{ length = 255 } },
        @{ field = "direct_manager_id"; type = "string";  schema = @{ length = 64 } },
        @{ field = "unit";              type = "string";  schema = @{ length = 255 } },
        @{ field = "is_active";         type = "boolean"; schema = @{ default_value = $true } }
    )

    foreach ($f in $systemUsersFields) {
        try {
            $resF = Post-DirectusData -Path "/fields/system_users" -Payload $f
            Write-Host "  Field '$($f.field)' added."
        } catch {
            Write-Host "  Field '$($f.field)' addition status: $_"
        }
    }
}

$systemUsers = @(
    @{ id = 'user-admin';  name = 'System Admin';    email = 'admin@company.com';  department_id = 'dept-it';          group_ids_json = @('group-managers','group-executives');                       role = 'admin';    avatar_initials = 'AD'; job_title = 'Infrastructure & System Super Admin'; direct_manager_id = 'user-admin';  unit = 'Corporate HQ';                  is_active = $true },
    @{ id = 'user-ahmed';  name = 'Ahmed Mohamed';   email = 'ahmed@company.com';  department_id = 'dept-it';          group_ids_json = @('group-it-techs');                                          role = 'standard'; avatar_initials = 'AM'; job_title = 'IT Technical Support Specialist';     direct_manager_id = 'user-khaled'; unit = 'Enterprise IT Services';       is_active = $true },
    @{ id = 'user-khaled'; name = 'Khaled Samir';    email = 'khaled@company.com'; department_id = 'dept-it';          group_ids_json = @('group-it-techs','group-managers');                         role = 'approver'; avatar_initials = 'KS'; job_title = 'IT Department Director';              direct_manager_id = 'user-mona';   unit = 'Enterprise IT Services';       is_active = $true },
    @{ id = 'user-noha';   name = 'Noha Gamal';      email = 'noha@company.com';   department_id = 'dept-mkt';         group_ids_json = @('group-mkt-team');                                          role = 'standard'; avatar_initials = 'NG'; job_title = 'Digital Marketing Specialist';         direct_manager_id = 'user-sherif'; unit = 'Brand Gamma - Marketing Unit'; is_active = $true },
    @{ id = 'user-omar';   name = 'Omar Khaled';     email = 'omar@company.com';   department_id = 'dept-mkt';         group_ids_json = @('group-mkt-team');                                          role = 'standard'; avatar_initials = 'OK'; job_title = 'Content & Graphic Design Lead';        direct_manager_id = 'user-sherif'; unit = 'Brand Gamma - Marketing Unit'; is_active = $true },
    @{ id = 'user-sherif'; name = 'Sherif Ramzy';    email = 'sherif@company.com'; department_id = 'dept-mkt';         group_ids_json = @('group-mkt-team','group-managers');                         role = 'approver'; avatar_initials = 'SR'; job_title = 'Marketing & Digital Branding Director'; direct_manager_id = 'user-mona';   unit = 'Brand Gamma - Marketing Unit'; is_active = $true },
    @{ id = 'user-tarek';  name = 'Tarek Hassan';    email = 'tarek@company.com';  department_id = 'dept-procurement'; group_ids_json = @('group-procurement');                                      role = 'standard'; avatar_initials = 'TH'; job_title = 'Senior Purchasing Officer';            direct_manager_id = 'user-yasser'; unit = 'Brand Alpha - Retail Unit';    is_active = $true },
    @{ id = 'user-yasser'; name = 'Yasser Mahmoud';  email = 'yasser@company.com'; department_id = 'dept-procurement'; group_ids_json = @('group-procurement','group-managers');                       role = 'approver'; avatar_initials = 'YM'; job_title = 'Head of Procurement';                 direct_manager_id = 'user-mona';   unit = 'Brand Alpha - Retail Unit';    is_active = $true },
    @{ id = 'user-huda';   name = 'Huda Adel';       email = 'huda@company.com';   department_id = 'dept-finance';     group_ids_json = @('group-finance');                                           role = 'standard'; avatar_initials = 'HA'; job_title = 'Senior Financial Accountant';          direct_manager_id = 'user-mona';   unit = 'Brand Beta - E-Commerce Unit'; is_active = $true },
    @{ id = 'user-mona';   name = 'Mona Omar';       email = 'mona@company.com';   department_id = 'dept-finance';     group_ids_json = @('group-finance','group-procurement','group-managers','group-executives'); role = 'approver'; avatar_initials = 'MO'; job_title = 'Chief Financial Officer (CFO)';       direct_manager_id = 'user-admin';  unit = 'Corporate HQ';                  is_active = $true },
    @{ id = 'user-laila';  name = 'Laila Ibrahim';   email = 'laila@company.com';  department_id = 'dept-hr';          group_ids_json = @();                                                          role = 'standard'; avatar_initials = 'LI'; job_title = 'HR Specialist';                        direct_manager_id = 'user-sara';   unit = 'Brand Gamma - Marketing Unit'; is_active = $true },
    @{ id = 'user-sara';   name = 'Sara Hassan';     email = 'sara@company.com';   department_id = 'dept-hr';          group_ids_json = @('group-managers');                                          role = 'approver'; avatar_initials = 'SH'; job_title = 'Director of Human Resources';          direct_manager_id = 'user-mona';   unit = 'Brand Gamma - Marketing Unit'; is_active = $true },
    @{ id = 'user-karim';  name = 'Karim Fathy';     email = 'karim@company.com';  department_id = 'dept-ops';         group_ids_json = @('group-managers');                                          role = 'approver'; avatar_initials = 'KF'; job_title = 'Operations & Facilities Manager';    direct_manager_id = 'user-mona';   unit = 'Brand Delta - Operations Unit'; is_active = $true }
)

$usersInserted = 0
$usersSkipped = 0
$usersErrors = 0

foreach ($u in $systemUsers) {
    $existing = Get-DirectusItem -Path "/items/system_users/$($u.id)"
    if ($existing -and $existing.data) {
        Write-Host "  [SKIPPED] User '$($u.id)' already exists."
        $usersSkipped++
    } else {
        try {
            $res = Post-DirectusData -Path "/items/system_users" -Payload $u
            Write-Host "  [INSERTED] User '$($u.id)' ($($u.name))"
            $usersInserted++
        } catch {
            Write-Host "  [ERROR] User '$($u.id)': $_"
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                Write-Host "    Details: $($reader.ReadToEnd())"
            }
            $usersErrors++
        }
    }
}
Write-Host "system_users Summary -> Inserted: $usersInserted | Skipped: $usersSkipped | Errors: $usersErrors"


# -------------------------------------------------------------
# TASK 3: Create & Seed BUSINESS_GROUPS Collection
# -------------------------------------------------------------
Write-Host "`n================================================="
Write-Host "Task 3: Create & Seed BUSINESS_GROUPS Collection"
Write-Host "================================================="

$groupsColl = Get-DirectusItem -Path "/collections/business_groups"
if ($groupsColl -and $groupsColl.data) {
    Write-Host "Collection 'business_groups' already exists."
} else {
    Write-Host "Creating collection 'business_groups'..."
    try {
        $createCollPayload = @{ collection = 'business_groups'; schema = @{} }
        $resColl = Post-DirectusData -Path "/collections" -Payload $createCollPayload
        Write-Host "Collection 'business_groups' base created."
    } catch {
        Write-Host "Error creating 'business_groups' base collection: $_"
    }

    $businessGroupsFields = @(
        @{ field = "id";                  type = "string";  schema = @{ is_primary_key = $true; length = 64 } },
        @{ field = "name";                type = "string";  schema = @{ length = 255 } },
        @{ field = "code";                type = "string";  schema = @{ length = 64 } },
        @{ field = "member_user_ids_json";type = "json" },
        @{ field = "is_active";           type = "boolean"; schema = @{ default_value = $true } }
    )

    foreach ($f in $businessGroupsFields) {
        try {
            $resF = Post-DirectusData -Path "/fields/business_groups" -Payload $f
            Write-Host "  Field '$($f.field)' added."
        } catch {
            Write-Host "  Field '$($f.field)' addition status: $_"
        }
    }
}

$businessGroups = @(
    @{ id = 'group-procurement'; name = 'Procurement Committee';    code = 'PROC_COMM';  member_user_ids_json = @('user-tarek','user-yasser','user-khaled','user-mona');               is_active = $true },
    @{ id = 'group-finance';     name = 'Finance & Payroll Team';   code = 'FIN_TEAM';   member_user_ids_json = @('user-huda','user-mona');                                            is_active = $true },
    @{ id = 'group-it-techs';    name = 'IT Technical Support Group';code = 'IT_TECHS';   member_user_ids_json = @('user-ahmed','user-khaled');                                         is_active = $true },
    @{ id = 'group-mkt-team';    name = 'Marketing & Media Team';   code = 'MKT_TEAM';   member_user_ids_json = @('user-noha','user-omar','user-sherif');                               is_active = $true },
    @{ id = 'group-managers';    name = 'Department Managers';      code = 'DEPT_HEADS'; member_user_ids_json = @('user-khaled','user-sara','user-mona','user-yasser','user-karim','user-sherif'); is_active = $true },
    @{ id = 'group-executives';  name = 'Executive Board';          code = 'EXEC_BOARD'; member_user_ids_json = @('user-mona','user-admin');                                           is_active = $true }
)

$groupsInserted = 0
$groupsSkipped = 0
$groupsErrors = 0

foreach ($g in $businessGroups) {
    $existing = Get-DirectusItem -Path "/items/business_groups/$($g.id)"
    if ($existing -and $existing.data) {
        Write-Host "  [SKIPPED] Group '$($g.id)' already exists."
        $groupsSkipped++
    } else {
        try {
            $res = Post-DirectusData -Path "/items/business_groups" -Payload $g
            Write-Host "  [INSERTED] Group '$($g.id)' ($($g.name))"
            $groupsInserted++
        } catch {
            Write-Host "  [ERROR] Group '$($g.id)': $_"
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                Write-Host "    Details: $($reader.ReadToEnd())"
            }
            $groupsErrors++
        }
    }
}
Write-Host "business_groups Summary -> Inserted: $groupsInserted | Skipped: $groupsSkipped | Errors: $groupsErrors"

Write-Host "`n================================================="
Write-Host "ALL DIRECTUS SEEDING TASKS COMPLETED SUCCESSFULLY!"
Write-Host "================================================="
