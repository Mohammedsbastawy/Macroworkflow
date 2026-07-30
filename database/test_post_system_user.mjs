const url = 'http://localhost:8055';
const token = 'workflow-engine-admin-static-token-2026';

const userAdmin = {
  id: 'user-admin',
  name: 'System Admin',
  email: 'admin@company.com',
  department_id: 'dept-it',
  group_ids_json: ['group-managers', 'group-executives'],
  role: 'admin',
  avatar_initials: 'AD',
  job_title: 'Infrastructure & System Super Admin',
  direct_manager_id: 'user-admin',
  unit: 'Corporate HQ',
  is_active: true
};

async function test() {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  const res = await fetch(`${url}/items/system_users`, {
    method: 'POST',
    headers,
    body: JSON.stringify(userAdmin)
  });
  const data = await res.json();
  console.log("POST /items/system_users Status:", res.status);
  console.log("Body:", JSON.stringify(data, null, 2));
}

test();
