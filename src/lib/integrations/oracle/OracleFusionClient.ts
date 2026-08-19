import { getAuthStrategy, IntegrationConfig } from "../auth/AuthStrategy";

export interface OracleItemOrg {
  InventoryItemId: string | number;
  OrganizationId: string | number;
  OrganizationCode?: string;
}

export interface OracleItemRecord {
  ItemNumber: string;
  ItemDescription: string;
  organizations: OracleItemOrg[];
}

export interface WarehouseStock {
  organization: string;
  subinventory?: string;
  ownership: string;
  control: string;
  onHandQty: number;
  receivingQty: number;
  inboundQty: number;
  uom: string;
  availableToReserveQty: number;
  availableToTransactQty: number;
  organizationId?: string | number;
  inventoryItemId?: string | number;
  // Keep legacy properties for backward compatibility
  warehouse?: string;
  reservedQty?: number;
  availableQty?: number;
}

export class OracleFusionClient {

  private async getIntegrationConfig(targetId: string) {
    const { dbQuery } = await import("@/lib/db/mysqlClient");
    
    let endpointObj: any = null;
    if (targetId && targetId !== "preview-api") {
      try {
        // First try: targetId is an endpoint ID
        const epRows = await dbQuery("SELECT * FROM api_endpoints WHERE id = ? AND is_active = 1", [targetId]);
        if (epRows && epRows.length > 0) {
          endpointObj = epRows[0];
        } else {
          // Second try: targetId is an integration ID, find its first active endpoint
          const epByIntegration = await dbQuery("SELECT * FROM api_endpoints WHERE integration_id = ? AND is_active = 1 LIMIT 1", [targetId]);
          if (epByIntegration && epByIntegration.length > 0) {
            endpointObj = epByIntegration[0];
          }
        }
      } catch (e) {
        console.error("[getIntegrationConfig] endpoint lookup error:", e);
      }
    }

    const realIntegrationId = endpointObj ? endpointObj.integration_id : targetId;

    let rows: any[] = [];
    if (realIntegrationId && realIntegrationId !== "preview-api") {
      rows = await dbQuery("SELECT * FROM api_integrations WHERE id = ? AND is_active = 1", [realIntegrationId]);
    }

    if (!rows || rows.length === 0) {
      rows = await dbQuery("SELECT * FROM api_integrations WHERE (provider = 'oracle' OR name LIKE '%Oracle%') AND is_active = 1 LIMIT 1");
    }

    if (!rows || rows.length === 0) {
      rows = await dbQuery("SELECT * FROM api_integrations WHERE is_active = 1 LIMIT 1");
    }

    const api = rows[0];

    if (!api) {
      throw new Error(`No active integration found for '${targetId}'. Please configure Oracle in Integrations Hub.`);
    }

    let config: IntegrationConfig = {};
    try {
      if (typeof api.config_json === "object" && api.config_json !== null) {
        config = api.config_json;
      } else if (typeof api.config_json === "string") {
        config = JSON.parse(api.config_json);
      }
    } catch (e) {
      console.warn("Failed to parse config_json", e);
    }

    // Merge fallback fields
    if (!config.base_url) config.base_url = api.endpoint_url || api.base_url;

    return { api, config, endpoint: endpointObj };
  }

  /**
   * Search Items in Oracle Fusion Cloud SCM
   * Uses endpoint path from DB if available, otherwise hardcoded itemsV2 path
   */
  async searchItems(integrationId: string, itemCode: string, customPath?: string): Promise<OracleItemRecord[]> {
    const { api, config, endpoint } = await this.getIntegrationConfig(integrationId);
    const authStrategy = getAuthStrategy(api.auth_type || "jwt_rs256");
    const authHeader = await authStrategy.getAuthHeader(config);

    const effectivePath = customPath || endpoint?.path;

    const baseUrl = (config.base_url || api.endpoint_url || "").replace(/\/$/, "");
    let cleanUrl = "";
    if (effectivePath && effectivePath.trim()) {
      const formattedPath = effectivePath.startsWith("/") ? effectivePath : `/${effectivePath}`;
      cleanUrl = `${baseUrl}${formattedPath}`.replace(/\{[^}]+\}/g, encodeURIComponent(itemCode));
    } else {
      // Hardcoded fallback path
      cleanUrl = `${baseUrl}/fscmRestApi/resources/11.13.18.05/itemsV2?q=ItemNumber='${encodeURIComponent(itemCode)}'`;
    }

    console.log("[OracleFusionClient] searchItems URL:", cleanUrl);

    const response = await fetch(cleanUrl, {
      method: "GET",
      headers: {
        ...authHeader,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[OracleFusionClient] searchItems Error:", response.status, errText.substring(0, 300));
      throw new Error(`Oracle API Error (${response.status}): ${errText}`);
    }

    const json = await response.json();
    console.log("[OracleFusionClient] searchItems count:", (json.items || json.value || []).length);
    const itemsList: any[] = json.items || json.value || (Array.isArray(json) ? json : []);

    // Aggregate items by ItemNumber across Organizations
    const itemsMap = new Map<string, OracleItemRecord>();

    itemsList.forEach((item: any) => {
      const itemNum = item.ItemNumber || item.itemNumber || item.code || "UNKNOWN";
      const itemDesc = item.ItemDescription || item.itemDescription || item.description || itemNum;
      const orgId = item.OrganizationId || item.organizationId || "M1";
      const orgCode = item.OrganizationCode || item.organizationCode || `ORG-${orgId}`;
      const invItemId = item.InventoryItemId || item.inventoryItemId || item.id || itemNum;

      if (!itemsMap.has(itemNum)) {
        itemsMap.set(itemNum, {
          ItemNumber: itemNum,
          ItemDescription: itemDesc,
          organizations: [{ InventoryItemId: invItemId, OrganizationId: orgId, OrganizationCode: orgCode }]
        });
      } else {
        const existing = itemsMap.get(itemNum)!;
        const existsInOrg = existing.organizations.some(o => String(o.OrganizationId) === String(orgId));
        if (!existsInOrg) {
          existing.organizations.push({ InventoryItemId: invItemId, OrganizationId: orgId, OrganizationCode: orgCode });
        }
      }
    });

    return Array.from(itemsMap.values());
  }

  /**
   * Get Inventory On-Hand Balances by ItemNumber
   * GET {base_url}/fscmRestApi/resources/11.13.18.05/inventoryOnhandBalances?q=ItemNumber='{ItemNumber}'
   * Returns stock per warehouse/subinventory with full attribute columns
   */
  async getInventoryOnHandBalances(
    integrationId: string,
    itemNumber: string,
    options?: { ownershipFilter?: string }
  ): Promise<WarehouseStock[]> {
    const { api, config } = await this.getIntegrationConfig(integrationId);
    const authStrategy = getAuthStrategy(api.auth_type || "jwt_rs256");
    const authHeader = await authStrategy.getAuthHeader(config);

    const baseUrl = (config.base_url || api.endpoint_url || "").replace(/\/$/, "");
    const url = `${baseUrl}/fscmRestApi/resources/11.13.18.05/inventoryOnhandBalances?q=ItemNumber='${encodeURIComponent(itemNumber)}'&limit=500`;

    console.log("[OracleFusionClient] getInventoryOnHandBalances URL:", url);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...authHeader,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[OracleFusionClient] inventoryOnHandBalances Error:", response.status, errText.substring(0, 300));
        throw new Error(`Oracle Stock API Error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const items: any[] = data.items || data.value || (Array.isArray(data) ? data : []);

      const warehouseMap = new Map<string, WarehouseStock>();

      items.forEach((item: any) => {
        // Determine Ownership
        const isConsigned = item.OwningParty !== null && item.OwningParty !== undefined || Number(item.ConsignedQuantity || 0) > 0;
        const ownership = isConsigned ? `Consigned${item.OwningParty ? ` (${item.OwningParty})` : ""}` : "Owned";

        // Apply Ownership Filter if specified
        if (options?.ownershipFilter && options.ownershipFilter !== "all") {
          if (options.ownershipFilter === "owned" && isConsigned) return;
          if (options.ownershipFilter === "consigned" && !isConsigned) return;
        }

        // Quantities
        const onHand = Number(
          item.PrimaryQuantity ?? item.OnHandQuantity ?? item.OnhandQuantity ?? item.onHandQuantity ??
          item.PrimaryOnHandQuantity ?? item.primaryOnHandQuantity ??
          item.Quantity ?? item.quantity ?? 0
        );

        const receiving = Number(item.ReceivingQuantity ?? item.receivingQuantity ?? item.Receiving ?? 0);
        const inbound = Number(item.InboundQuantity ?? item.inboundQuantity ?? item.Inbound ?? 0);

        const availableToReserve = item.AvailableToReserve !== undefined && item.AvailableToReserve !== null
          ? Number(item.AvailableToReserve)
          : onHand;

        const availableToTransact = item.AvailableToTransact !== undefined && item.AvailableToTransact !== null
          ? Number(item.AvailableToTransact)
          : onHand;

        const reserved = item.ReservedQuantity !== undefined && item.ReservedQuantity !== null
          ? Number(item.ReservedQuantity)
          : Math.max(0, onHand - availableToTransact);

        const uom = item.PrimaryUnitOfMeasure || item.PrimaryUOMCode || item.UOM || "Piece";
        const control = item.LotControl || item.Control || (item.Revision !== null ? "Revision" : "Lot");
        const orgCode = item.OrganizationCode || item.organizationCode || `ORG-${item.OrganizationId || "?"}`;
        const subinventory = item.SubinventoryCode || item.subinventoryCode || "";

        // Unique aggregation key: organization + subinventory + ownership
        const aggKey = `${orgCode}__${subinventory}__${ownership}`;

        if (warehouseMap.has(aggKey)) {
          const existing = warehouseMap.get(aggKey)!;
          existing.onHandQty += onHand;
          existing.receivingQty += receiving;
          existing.inboundQty += inbound;
          existing.availableToReserveQty += availableToReserve;
          existing.availableToTransactQty += availableToTransact;
          existing.reservedQty = (existing.reservedQty || 0) + reserved;
          existing.availableQty = (existing.availableQty || 0) + availableToTransact;
        } else {
          warehouseMap.set(aggKey, {
            organization: orgCode,
            subinventory: subinventory,
            ownership: ownership,
            control: control,
            onHandQty: onHand,
            receivingQty: receiving,
            inboundQty: inbound,
            uom: uom,
            availableToReserveQty: availableToReserve,
            availableToTransactQty: availableToTransact,
            organizationId: item.OrganizationId || item.organizationId || "",
            inventoryItemId: item.InventoryItemId || item.inventoryItemId || "",
            // Legacy backward-compat
            warehouse: orgCode,
            reservedQty: reserved,
            availableQty: availableToTransact,
          });
        }
      });

      return Array.from(warehouseMap.values());
    } catch (err: any) {
      console.error("[OracleFusionClient] getInventoryOnHandBalances failed:", err.message);
      throw err;
    }
  }

  /**
   * Legacy: Get On-Hand Quantity per org (kept for backward compatibility)
   */
  async getOnHandQuantityAllOrgs(integrationId: string, itemRecord: OracleItemRecord): Promise<WarehouseStock[]> {
    // Delegate to the new hardcoded method using ItemNumber
    return this.getInventoryOnHandBalances(integrationId, itemRecord.ItemNumber);
  }

  /**
   * Test Connection method
   */
  async testConnection(integrationId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const { api, config } = await this.getIntegrationConfig(integrationId);
      const authStrategy = getAuthStrategy(api.auth_type || "jwt_rs256");
      const authHeader = await authStrategy.getAuthHeader(config);

      const baseUrl = (config.base_url || api.endpoint_url || "").replace(/\/$/, "");
      const testUrl = `${baseUrl}/fscmRestApi/resources/11.13.18.05/itemsV2?limit=1`;

      const response = await fetch(testUrl, {
        method: "GET",
        headers: {
          ...authHeader,
          "Accept": "application/json",
        },
      });

      if (response.ok) {
        return { success: true, message: "JWT RS256 Authentication & Oracle Fusion API connection successful!" };
      } else {
        const errorText = await response.text();
        return { success: false, error: `Oracle returned HTTP ${response.status}: ${errorText}` };
      }

    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
