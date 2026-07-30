const url = 'http://localhost:8055/fields/system_users';
const token = 'workflow-engine-admin-static-token-2026';

const fieldPayload = {
  field: 'id',
  type: 'string',
  schema: {
    is_primary_key: true,
    length: 64
  }
};

async function test() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(fieldPayload)
  });
  const data = await res.json();
  console.log("Response Status:", res.status);
  console.log("Response Body:", JSON.stringify(data, null, 2));
}

test();
