"use server";

import { OracleFusionClient, OracleItemRecord } from "@/lib/integrations/oracle/OracleFusionClient";

const oracleClient = new OracleFusionClient();

export async function searchOracleItemsAction(integrationId: string, itemCode: string) {
  try {
    if (!itemCode || !itemCode.trim()) {
      return { success: true, items: [] };
    }
    const items = await oracleClient.searchItems(integrationId, itemCode.trim());
    return { success: true, items };
  } catch (error: any) {
    console.error("searchOracleItemsAction error:", error);
    return { success: false, error: error.message || "Failed to search Oracle items." };
  }
}

export async function getOracleOnHandMultiOrgAction(
  integrationId: string,
  itemRecord: OracleItemRecord,
  options?: { ownershipFilter?: string }
) {
  try {
    const stock = await oracleClient.getInventoryOnHandBalances(integrationId, itemRecord.ItemNumber, options);
    return { success: true, stock };
  } catch (error: any) {
    console.error("getOracleOnHandMultiOrgAction error:", error);
    return { success: false, error: error.message || "Failed to fetch on-hand inventory." };
  }
}

export async function testOracleConnectionAction(integrationId: string) {
  try {
    const result = await oracleClient.testConnection(integrationId);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
