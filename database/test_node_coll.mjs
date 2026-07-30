const url = 'http://localhost:8055/collections';
const token = 'workflow-engine-admin-static-token-2026';

const payload = {
  collection: 'system_users',
  schema: {}
};

async function test() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  console.log("Response Status:", res.status);
  console.log("Response Body:", JSON.stringify(data, null, 2));
}

test();
