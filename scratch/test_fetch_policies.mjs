import { fetchPoliciesAction } from "../src/app/actions/workflowActions.js";

async function main() {
  try {
    const policies = await fetchPoliciesAction();
    console.log("POLICIES FROM ACTION:", JSON.stringify(policies, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
