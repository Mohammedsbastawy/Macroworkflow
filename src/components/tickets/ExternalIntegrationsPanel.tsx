"use client";
import { useState, useEffect } from "react";
import { fetchAllIntegrationsAction, fetchEndpointsForIntegrationAction } from "@/app/actions/integrationActions";
import { searchOracleItemsAction, getOracleOnHandMultiOrgAction } from "@/app/actions/oracleInventoryActions";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export interface OracleColumnDef {
  id: string;
  labelAr: string;
  labelEn: string;
  align?: "left" | "right" | "center";
}

export const ORACLE_AVAILABLE_COLUMNS: OracleColumnDef[] = [
  { id: "organization", labelAr: "المخزن / المؤسسة", labelEn: "Organization", align: "left" },
  { id: "subinventory", labelAr: "المخزن الفرعي", labelEn: "Subinventory", align: "left" },
  { id: "ownership", labelAr: "الملكية", labelEn: "Ownership", align: "center" },
  { id: "control", labelAr: "التحكم", labelEn: "Control", align: "center" },
  { id: "onHand", labelAr: "الرصيد الفعلي", labelEn: "On Hand", align: "right" },
  { id: "receiving", labelAr: "تحت الاستلام", labelEn: "Receiving", align: "right" },
  { id: "inbound", labelAr: "الوارد", labelEn: "Inbound", align: "right" },
  { id: "uom", labelAr: "وحدة القياس", labelEn: "UOM", align: "center" },
  { id: "availableToReserve", labelAr: "المتاح للحجز", labelEn: "Available to Reserve", align: "right" },
  { id: "availableToTransact", labelAr: "المتاح للمعاملات", labelEn: "Available to Transact", align: "right" },
];

export const DEFAULT_ORACLE_COLUMNS = [
  "organization",
  "ownership",
  "control",
  "onHand",
  "receiving",
  "inbound",
  "uom",
  "availableToReserve",
  "availableToTransact"
];

interface ExternalIntegrationsPanelProps {
  currentUserId?: string;
  currentUserRole?: string;
  initialQuery?: string;
  targetApiId?: string;
  titleOverride?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  buttonText?: string;
  isPreview?: boolean;
  visibleColumns?: string[];
  ownershipFilter?: string;
}

export function ExternalIntegrationsPanel({
  currentUserId = "user-1",
  currentUserRole = "admin",
  initialQuery,
  targetApiId,
  titleOverride,
  searchLabel,
  searchPlaceholder,
  buttonText,
  isPreview = false,
  visibleColumns,
  ownershipFilter = "all",
}: ExternalIntegrationsPanelProps) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active columns to display
  const activeColumnIds = visibleColumns && visibleColumns.length > 0 ? visibleColumns : DEFAULT_ORACLE_COLUMNS;
  const activeCols = ORACLE_AVAILABLE_COLUMNS.filter(col => activeColumnIds.includes(col.id));

  // Search state per integration
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [isSearching, setIsSearching] = useState<Record<string, boolean>>({});

  // Combined result state: item info + stock together
  const [itemResults, setItemResults] = useState<Record<string, { itemNumber: string; itemDescription: string } | null>>({});
  const [stockResults, setStockResults] = useState<Record<string, any[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadAuthorizedIntegrations() {
      try {
        const [allApis, allEndpoints] = await Promise.all([
          fetchAllIntegrationsAction(),
          fetchEndpointsForIntegrationAction()
        ]);

        let resolvedApiId = targetApiId;
        if (targetApiId) {
          const foundEp = allEndpoints.find((ep: any) => ep.id === targetApiId);
          if (foundEp) {
            resolvedApiId = foundEp.integration_id;
          }
        }

        let authorized = allApis.filter((api: any) => {
          if (!api.is_active) return false;
          if (resolvedApiId && api.id !== resolvedApiId) return false;
          return true;
        });

        if (authorized.length === 0 && allApis.length > 0) {
          authorized = [allApis[0]];
        }

        if (authorized.length === 0) {
          authorized = [{
            id: targetApiId || "preview-api",
            name: titleOverride || (isAr ? "استدعاء صنف بالأرصدة (Oracle Item Fetcher)" : "Oracle Item & Stock Fetcher"),
            auth_type: "GET REST"
          }];
        }

        setIntegrations(authorized);

        // Auto-run if initialQuery provided
        if (initialQuery && initialQuery.trim() && authorized.length > 0) {
          const targetApi = authorized[0];
          setSearchQueries({ [targetApi.id]: initialQuery.trim() });
          await runSearch(targetApi.id, initialQuery.trim());
        }
      } catch (err) {
        console.error("Failed to load integrations", err);
      }
      setLoading(false);
    }

    loadAuthorizedIntegrations();
  }, [currentUserId, currentUserRole, targetApiId, initialQuery, isPreview, titleOverride, isAr]);

  const runSearch = async (apiId: string, code: string) => {
    if (!code || !code.trim()) return;

    let realApiId = apiId;
    if (realApiId === "preview-api" || !realApiId) {
      if (integrations.length > 0 && integrations[0].id !== "preview-api") {
        realApiId = integrations[0].id;
      }
    }

    setIsSearching(prev => ({ ...prev, [apiId]: true }));
    setErrors(prev => ({ ...prev, [apiId]: "" }));
    setItemResults(prev => ({ ...prev, [apiId]: null }));
    setStockResults(prev => ({ ...prev, [apiId]: [] }));

    if (realApiId && realApiId !== "preview-api") {
      try {
        // Call both APIs in parallel
        const [itemRes, stockRes] = await Promise.all([
          searchOracleItemsAction(realApiId, code.trim()),
          getOracleOnHandMultiOrgAction(
            realApiId,
            {
              ItemNumber: code.trim(),
              ItemDescription: "",
              organizations: []
            },
            { ownershipFilter }
          )
        ]);

        setIsSearching(prev => ({ ...prev, [apiId]: false }));

        // Set item info
        if (itemRes.success && itemRes.items && itemRes.items.length > 0) {
          const firstItem = itemRes.items[0];
          setItemResults(prev => ({
            ...prev,
            [apiId]: {
              itemNumber: firstItem.ItemNumber,
              itemDescription: firstItem.ItemDescription
            }
          }));
        } else if (!itemRes.success) {
          setErrors(prev => ({ ...prev, [apiId]: itemRes.error || "Failed to search items." }));
          return;
        } else {
          setErrors(prev => ({ ...prev, [apiId]: isAr ? "لم يتم العثور على الصنف." : "Item not found." }));
          return;
        }

        // Set stock info
        if (stockRes.success) {
          setStockResults(prev => ({ ...prev, [apiId]: stockRes.stock || [] }));
        } else {
          setErrors(prev => ({ ...prev, [apiId]: stockRes.error || "Failed to fetch stock." }));
        }

      } catch (err: any) {
        setIsSearching(prev => ({ ...prev, [apiId]: false }));
        setErrors(prev => ({ ...prev, [apiId]: err.message || "Unexpected error." }));
      }
      return;
    }

    // Preview fallback
    setTimeout(() => {
      setIsSearching(prev => ({ ...prev, [apiId]: false }));
      setItemResults(prev => ({
        ...prev,
        [apiId]: {
          itemNumber: code.toUpperCase(),
          itemDescription: isAr ? "صنف تجريبي (يرجى تهيئة Oracle في Integrations Hub)" : "Sample Item (Configure Oracle in Integrations Hub)"
        }
      }));
      setStockResults(prev => ({
        ...prev,
        [apiId]: [
          { organization: "BDR_MFG", subinventory: "Main", ownership: "Owned", control: "Lot", onHandQty: 111480, receivingQty: 24, inboundQty: 0, uom: "Piece", availableToReserveQty: 22250, availableToTransactQty: 109369 },
          { organization: "BDR_OTHER", subinventory: "Amazon", ownership: "Owned", control: "Lot", onHandQty: 1062, receivingQty: 0, inboundQty: 0, uom: "Piece", availableToReserveQty: 1037, availableToTransactQty: 1037 },
          { organization: "ASUT_PHRM", subinventory: "Transit", ownership: "Owned", control: "Lot", onHandQty: 0, receivingQty: 0, inboundQty: 2000, uom: "Piece", availableToReserveQty: 0, availableToTransactQty: 0 },
        ]
      }));
    }, 400);
  };

  const handleSearchItems = (apiId: string) => {
    const code = searchQueries[apiId];
    if (!code || !code.trim()) return;
    runSearch(apiId, code.trim());
  };

  if (loading) return null;
  if (integrations.length === 0 && !isPreview) return null;

  return (
    <div className="card" style={{ marginTop: 12, border: "1px solid var(--color-primary)", borderRadius: 10, boxShadow: "0 2px 8px rgba(79,70,229,0.08)" }}>
      <div className="card-header" style={{ background: "rgba(79,70,229,0.04)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="card-title" style={{ fontSize: 13, fontWeight: 900, color: "var(--color-primary)" }}>
          📦 {titleOverride || (isAr ? "استدعاء صنف بالأرصدة (Oracle Item Fetcher)" : "Oracle Item & Stock Fetcher")}
        </div>
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14, padding: 14 }}>
        {integrations.map((api) => {
          const item = itemResults[api.id];
          const stock = stockResults[api.id] || [];

          return (
            <div key={api.id} style={{ background: "var(--color-bg)", padding: 12, borderRadius: 8, border: "1px solid var(--color-border)" }}>
              {searchLabel && (
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--color-primary)", marginBottom: 6 }}>
                  🔍 {searchLabel}
                </label>
              )}

              {/* Merged Input Box + Go Button */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  className="form-control"
                  placeholder={searchPlaceholder || (isAr ? "ابحث برقم الصنف (مثال: 10010101001)..." : "Enter item code (e.g. 10010101001)...")}
                  value={searchQueries[api.id] || ""}
                  onChange={(e) => setSearchQueries({ ...searchQueries, [api.id]: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchItems(api.id)}
                  style={{ fontSize: 12, fontWeight: 600 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => handleSearchItems(api.id)}
                  disabled={isSearching[api.id]}
                  style={{ minWidth: 100, fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                >
                  {isSearching[api.id] ? "⏳ ..." : (buttonText || "Go ➔")}
                </button>
              </div>

              {/* Error Display */}
              {errors[api.id] && (
                <div style={{ fontSize: 11, color: "#EF4444", marginBottom: 10, padding: 8, background: "#FEF2F2", borderRadius: 6 }}>
                  🚨 {errors[api.id]}
                </div>
              )}

              {/* Item Info Banner */}
              {item && (
                <div style={{ marginBottom: 10, padding: "8px 12px", background: "rgba(79,70,229,0.06)", border: "1px solid var(--color-primary)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "var(--color-primary)" }}>📦 {item.itemNumber}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{item.itemDescription}</div>
                  </div>
                  <span style={{ fontSize: 10, background: "#E0E7FF", color: "#3730A3", padding: "3px 8px", borderRadius: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                    🔴 {isAr ? "حي من أوراكل" : "Live Oracle"}
                  </span>
                </div>
              )}

              {/* Stock Table */}
              {item && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>🏭 {isAr ? "الأرصدة الحية في المخازن:" : "Live Warehouse Stock:"}</span>
                    <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                      {isAr ? `(تصفية الملكية: ${ownershipFilter === "all" ? "الكل" : ownershipFilter === "owned" ? "مملوك فقط" : "أمانة فقط"})` : `(Ownership: ${ownershipFilter})`}
                    </span>
                  </div>
                  {isSearching[api.id] ? (
                    <div style={{ padding: 12, textAlign: "center", fontSize: 11, color: "var(--color-text-muted)" }}>
                      ⏳ {isAr ? "جاري استعلام الأرصدة من أوراكل..." : "Fetching live stock from Oracle..."}
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: 6 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, textAlign: "left" }}>
                        <thead>
                          <tr style={{ background: "var(--color-surface)", borderBottom: "2px solid var(--color-border)" }}>
                            {activeCols.map(col => (
                              <th
                                key={col.id}
                                style={{
                                  padding: "8px 10px",
                                  fontWeight: 800,
                                  textAlign: col.align || "left",
                                  whiteSpace: "nowrap",
                                  borderRight: "1px solid var(--color-border)"
                                }}
                              >
                                {isAr ? col.labelAr : col.labelEn}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {stock.length === 0 ? (
                            <tr>
                              <td colSpan={activeCols.length} style={{ padding: 14, textAlign: "center", color: "var(--color-text-muted)" }}>
                                {isAr ? "لا توجد أرصدة مطابقة لشروط البحث والملكية المحددة." : "No inventory stock matching the criteria."}
                              </td>
                            </tr>
                          ) : (
                            stock.map((st, i) => (
                              <tr key={i} style={{ borderBottom: "1px solid var(--color-border)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)" }}>
                                {activeCols.map(col => {
                                  if (col.id === "organization") {
                                    return (
                                      <td key={col.id} style={{ padding: "6px 10px", fontWeight: 700, borderRight: "1px solid var(--color-border)" }}>
                                        🏭 {st.organization || st.warehouse}
                                      </td>
                                    );
                                  }
                                  if (col.id === "subinventory") {
                                    return (
                                      <td key={col.id} style={{ padding: "6px 10px", color: "var(--color-text-secondary)", borderRight: "1px solid var(--color-border)" }}>
                                        {st.subinventory || "—"}
                                      </td>
                                    );
                                  }
                                  if (col.id === "ownership") {
                                    const isOwned = (st.ownership || "").toLowerCase().includes("owned");
                                    return (
                                      <td key={col.id} style={{ padding: "6px 10px", textAlign: "center", borderRight: "1px solid var(--color-border)" }}>
                                        <span style={{
                                          fontSize: 10,
                                          fontWeight: 700,
                                          padding: "2px 6px",
                                          borderRadius: 4,
                                          background: isOwned ? "#DCFCE7" : "#FEF3C7",
                                          color: isOwned ? "#166534" : "#B45309"
                                        }}>
                                          {st.ownership || "Owned"}
                                        </span>
                                      </td>
                                    );
                                  }
                                  if (col.id === "control") {
                                    return (
                                      <td key={col.id} style={{ padding: "6px 10px", textAlign: "center", color: "#6366F1", fontWeight: 700, borderRight: "1px solid var(--color-border)" }}>
                                        {st.control || "Lot"}
                                      </td>
                                    );
                                  }
                                  if (col.id === "onHand") {
                                    return (
                                      <td key={col.id} style={{ padding: "6px 10px", textAlign: "right", fontWeight: 800, color: "#10B981", borderRight: "1px solid var(--color-border)" }}>
                                        {(st.onHandQty || 0).toLocaleString()}
                                      </td>
                                    );
                                  }
                                  if (col.id === "receiving") {
                                    return (
                                      <td key={col.id} style={{ padding: "6px 10px", textAlign: "right", color: "#3B82F6", fontWeight: 700, borderRight: "1px solid var(--color-border)" }}>
                                        {st.receivingQty > 0 ? (st.receivingQty).toLocaleString() : "—"}
                                      </td>
                                    );
                                  }
                                  if (col.id === "inbound") {
                                    return (
                                      <td key={col.id} style={{ padding: "6px 10px", textAlign: "right", color: "#8B5CF6", fontWeight: 700, borderRight: "1px solid var(--color-border)" }}>
                                        {st.inboundQty > 0 ? (st.inboundQty).toLocaleString() : "—"}
                                      </td>
                                    );
                                  }
                                  if (col.id === "uom") {
                                    return (
                                      <td key={col.id} style={{ padding: "6px 10px", textAlign: "center", color: "var(--color-text-secondary)", fontWeight: 700, borderRight: "1px solid var(--color-border)" }}>
                                        {st.uom || "Piece"}
                                      </td>
                                    );
                                  }
                                  if (col.id === "availableToReserve") {
                                    return (
                                      <td key={col.id} style={{ padding: "6px 10px", textAlign: "right", color: "#F59E0B", fontWeight: 800, borderRight: "1px solid var(--color-border)" }}>
                                        {(st.availableToReserveQty || 0).toLocaleString()}
                                      </td>
                                    );
                                  }
                                  if (col.id === "availableToTransact") {
                                    return (
                                      <td key={col.id} style={{ padding: "6px 10px", textAlign: "right", fontWeight: 900, color: "#2563EB", borderRight: "1px solid var(--color-border)" }}>
                                        {(st.availableToTransactQty || 0).toLocaleString()}
                                      </td>
                                    );
                                  }
                                  return null;
                                })}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
