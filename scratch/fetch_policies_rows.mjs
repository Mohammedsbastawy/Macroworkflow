async function main() {
  const url = "http://localhost:8055/items/policies";
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: "Bearer workflow-engine-admin-static-token-2026"
      }
    });
    const json = await res.json();
    console.log("POLICIES ROWS:", JSON.stringify(json.data, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
