const url = 'http://localhost:8055';
const token = 'workflow-engine-admin-static-token-2026';

async function verify() {
  const headers = { 'Authorization': `Bearer ${token}` };

  console.log("=== VERIFYING SEEDED DATA IN DIRECTUS ===");

  const deptsRes = await fetch(`${url}/items/departments`, { headers });
  const depts = await deptsRes.json();
  console.log(`\n1. DEPARTMENTS (${depts.data?.length || 0} items):`);
  if (depts.data) {
    depts.data.forEach(d => console.log(`   - ${d.id}: ${d.name} (${d.code})`));
  } else {
    console.log("   Error:", JSON.stringify(depts));
  }

  const usersRes = await fetch(`${url}/items/system_users`, { headers });
  const users = await usersRes.json();
  console.log(`\n2. SYSTEM_USERS (${users.data?.length || 0} items):`);
  if (users.data) {
    users.data.forEach(u => console.log(`   - ${u.id}: ${u.name} [${u.role}] (${u.email})`));
  } else {
    console.log("   Error:", JSON.stringify(users));
  }

  const groupsRes = await fetch(`${url}/items/business_groups`, { headers });
  const groups = await groupsRes.json();
  console.log(`\n3. BUSINESS_GROUPS (${groups.data?.length || 0} items):`);
  if (groups.data) {
    groups.data.forEach(g => console.log(`   - ${g.id}: ${g.name} (${g.code})`));
  } else {
    console.log("   Error:", JSON.stringify(groups));
  }
}

verify();
