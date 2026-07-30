const url = 'http://localhost:8055';
const token = 'workflow-engine-admin-static-token-2026';

async function test() {
  const headers = { 'Authorization': `Bearer ${token}` };
  const res = await fetch(`${url}/items/system_users`, { headers });
  const data = await res.json();
  console.log("GET /items/system_users Status:", res.status);
  console.log("Body:", JSON.stringify(data, null, 2));
}

test();
