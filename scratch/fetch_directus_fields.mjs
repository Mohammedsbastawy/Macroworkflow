async function main() {
  const url = "http://localhost:8055/fields/policies";
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: "Bearer workflow-engine-admin-static-token-2026"
      }
    });
    const json = await res.json();
    console.log("FIELDS:", json.data.map(f => ({ field: f.field, type: f.type })));
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
