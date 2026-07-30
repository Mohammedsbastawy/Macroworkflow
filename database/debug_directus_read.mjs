const url = 'http://localhost:8055';
const token = 'workflow-engine-admin-static-token-2026';
const headers = { 'Authorization': `Bearer ${token}` };

async function debugRead() {
  console.log("--- 1. GET /collections/system_users ---");
  const c1 = await fetch(`${url}/collections/system_users`, { headers });
  console.log(c1.status, await c1.text());

  console.log("\n--- 2. GET /items/system_users?fields=* ---");
  const i1 = await fetch(`${url}/items/system_users?fields=*`, { headers });
  console.log(i1.status, await i1.text());

  console.log("\n--- 3. GET /items/business_groups?fields=* ---");
  const i2 = await fetch(`${url}/items/business_groups?fields=*`, { headers });
  console.log(i2.status, await i2.text());

  console.log("\n--- 4. GET /permissions ---");
  const p = await fetch(`${url}/permissions`, { headers });
  console.log(p.status, (await p.text()).slice(0, 300));
}

debugRead().catch(console.error);
