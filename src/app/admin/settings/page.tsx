"use client";

import React, { useState, useEffect } from "react";
import { fetchSystemSettingsAction, updateSystemSettingAction } from "@/app/actions/workflowActions";
import { SYSTEM_USERS } from "@/lib/engine/iamStore";

const MONTHS = [
  { value: "1", label: "January 1st (Jan - Dec) · Standard Calendar Year" },
  { value: "4", label: "April 1st (Apr - Mar) · UK / India Fiscal Standard" },
  { value: "7", label: "July 1st (Jul - Jun) · Egyptian Gov / Corporate Fiscal Year" },
  { value: "10", label: "October 1st (Oct - Sep) · US Federal Fiscal Year" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("FiscalYear");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Fiscal Year Settings State
  const [startMonth, setStartMonth] = useState("1");
  const [fiscalYear, setFiscalYear] = useState("2026");
  const [warningDays, setWarningDays] = useState("30");
  const [notifyUsers, setNotifyUsers] = useState<string[]>(["user-mona", "user-admin"]);
  const [fiscalStatus, setFiscalStatus] = useState("active");

  // Feature Flags State
  const [enableBudgets, setEnableBudgets] = useState("false");
  const [enablePolicies, setEnablePolicies] = useState("false");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const rows = await fetchSystemSettingsAction();
      const map: Record<string, string> = {};
      (rows || []).forEach((r: any) => {
        map[r.key] = r.value;
      });
      setSettings(map);

      setStartMonth(map["FISCAL_YEAR_START_MONTH"] || "1");
      setFiscalYear(map["CURRENT_FISCAL_YEAR"] || "2026");
      setWarningDays(map["FISCAL_CLOSE_WARNING_DAYS"] || "30");
      setNotifyUsers((map["FISCAL_NOTIFY_USER_IDS"] || "user-mona,user-admin").split(",").filter(Boolean));
      setFiscalStatus(map["FISCAL_YEAR_STATUS"] || "active");

      setEnableBudgets(map["ENABLE_BUDGET_CHECKS"] || "false");
      setEnablePolicies(map["ENABLE_POLICY_CHECKS"] || "false");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSetting = async (key: string, val: string) => {
    setSavingKey(key);
    try {
      await updateSystemSettingAction(key, val);
      setSettings((prev) => ({ ...prev, [key]: val }));
    } catch (err) {
      alert("Error saving setting: " + err);
    } finally {
      setSavingKey(null);
    }
  };

  const toggleNotifyUser = async (userId: string) => {
    const next = notifyUsers.includes(userId)
      ? notifyUsers.filter((id) => id !== userId)
      : [...notifyUsers, userId];
    setNotifyUsers(next);
    await handleSaveSetting("FISCAL_NOTIFY_USER_IDS", next.join(","));
  };

  // Compute Quarterly Breakdown Dates based on Start Month & Year
  const getQuarterRanges = () => {
    const sMonth = parseInt(startMonth, 10);
    const yr = parseInt(fiscalYear, 10);

    const getQuarterName = (qNum: number, startM: number) => {
      const m1 = ((startM - 1 + (qNum - 1) * 3) % 12) + 1;
      const m3 = ((startM - 1 + qNum * 3 - 1) % 12) + 1;
      const yearOffset = (startM - 1 + qNum * 3 - 1) >= 12 && startM !== 1 ? yr + 1 : yr;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `Q${qNum}: ${monthNames[m1 - 1]} 1, ${yr} ➔ ${monthNames[m3 - 1]} 30, ${yearOffset}`;
    };

    return [1, 2, 3, 4].map((q) => ({ quarter: `Q${q}`, range: getQuarterName(q, sMonth) }));
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ System Settings & Financial Controls</h1>
          <p className="page-subtitle">ERP Standards for Fiscal Year, Closing Notifications & Feature Flags</p>
        </div>
        <span className="badge primary">Enterprise Standard</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>
        {/* Navigation Sidebar */}
        <div className="card" style={{ height: "fit-content" }}>
          <div className="card-body" style={{ padding: "8px" }}>
            {[
              { id: "FiscalYear", label: "📅 Fiscal Year & Financials", labelAr: "إعدادات السنة المالية" },
              { id: "FeatureFlags", label: "⚡ Feature Flags & Toggles", labelAr: "مفاتيح المحرك والخصائص" },
              { id: "General", label: "⚙️ General & Localization", labelAr: "الإعدادات العامة" },
            ].map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 13,
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  cursor: "pointer",
                  background: activeTab === tab.id ? "var(--color-primary-light)" : "transparent",
                  color: activeTab === tab.id ? "var(--color-primary)" : "var(--color-text-secondary)",
                  marginBottom: 4,
                  transition: "all 0.1s",
                }}
              >
                {tab.label}
              </div>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading System Settings...</div>
          ) : activeTab === "FiscalYear" ? (
            <>
              {/* FISCAL YEAR CARD (Odoo / SAP / ERPNext Standard) */}
              <div className="card">
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div className="card-title">📅 Enterprise Fiscal Year Configuration (تكوين السنة المالية)</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                      Aligned with Global ERP Standards (Odoo / Frappe ERPNext / SAP)
                    </div>
                  </div>
                  <span className={`badge ${fiscalStatus === "active" ? "success" : "warning"}`}>
                    {fiscalStatus.toUpperCase()}
                  </span>
                </div>

                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Fiscal Closing Notification Alert Preview */}
                  <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#1D4ED8", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🔔 Fiscal Closing Notification Engine (نظام تنبيهات الإقفال المالي)</span>
                    </div>
                    <p style={{ fontSize: 11, color: "#1E40AF", margin: "4px 0 0" }}>
                      Sends automated high-priority alerts <strong>{warningDays} days</strong> prior to fiscal year end to designated Financial Managers & Admins.
                    </p>
                  </div>

                  {/* Form Grid */}
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Fiscal Year Start Month (بداية السنة المالية)</label>
                      <select
                        className="form-control"
                        value={startMonth}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setStartMonth(val);
                          await handleSaveSetting("FISCAL_YEAR_START_MONTH", val);
                        }}
                      >
                        {MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Current Active Fiscal Year (السنة المالية الحالية)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={fiscalYear}
                        onChange={(e) => setFiscalYear(e.target.value)}
                        onBlur={() => handleSaveSetting("CURRENT_FISCAL_YEAR", fiscalYear)}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Closing Warning Threshold (Days Before Fiscal End)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={warningDays}
                        onChange={(e) => setWarningDays(e.target.value)}
                        onBlur={() => handleSaveSetting("FISCAL_CLOSE_WARNING_DAYS", warningDays)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Fiscal Year Status</label>
                      <select
                        className="form-control"
                        value={fiscalStatus}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setFiscalStatus(val);
                          await handleSaveSetting("FISCAL_YEAR_STATUS", val);
                        }}
                      >
                        <option value="active">🟢 Active (Open for Budgets & Requests)</option>
                        <option value="closing_warning">🟡 Closing Warning (Audit Mode)</option>
                        <option value="locked">🔴 Closed & Locked (Read Only)</option>
                      </select>
                    </div>
                  </div>

                  {/* AUTOMATIC QUARTERLY BREAKDOWN TABLE */}
                  <div style={{ marginTop: 10, paddingTop: 12, borderTop: "1px dashed var(--color-border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-primary)", marginBottom: 8 }}>
                      📊 Automated Quarter Ranges Breakdown (تقسيم الفترات والرباعيات المالية)
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                      {getQuarterRanges().map((q) => (
                        <div key={q.quarter} style={{ background: "var(--color-bg)", padding: 8, borderRadius: 6, border: "1px solid var(--color-border)", fontSize: 11 }}>
                          <div style={{ fontWeight: 800, color: "var(--color-primary)" }}>{q.quarter} Range</div>
                          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2 }}>{q.range}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* NOTIFICATION RECIPIENTS PICKER */}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--color-border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 8 }}>
                      👥 Designated Closing Notification Recipients (الموظفين المستهدفين للتنبيه)
                    </div>
                    <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 10 }}>
                      Select the financial officers and admins who will receive fiscal closing and budget rollover alerts:
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
                      {SYSTEM_USERS.map((user) => {
                        const isSelected = notifyUsers.includes(user.id);
                        return (
                          <div
                            key={user.id}
                            onClick={() => toggleNotifyUser(user.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "8px 10px",
                              borderRadius: 6,
                              border: isSelected ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                              background: isSelected ? "var(--color-primary-light)" : "var(--color-surface)",
                              cursor: "pointer",
                            }}
                          >
                            <input type="checkbox" checked={isSelected} readOnly />
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700 }}>{user.name}</div>
                              <div style={{ fontSize: 9, color: "var(--color-text-muted)" }}>{user.job_title || user.role}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            </>
          ) : activeTab === "FeatureFlags" ? (
            <div className="card">
              <div className="card-header"><div className="card-title">⚡ Engine Feature Flags & Graceful Degradation Toggles</div></div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "var(--color-bg)", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>💰 Department Budget Balance Checks Node</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                      When enabled, workflows containing Budget Check nodes evaluate department funds before approval.
                    </div>
                  </div>
                  <button
                    className={`btn ${enableBudgets === "true" ? "btn-primary" : "btn-outline"}`}
                    onClick={async () => {
                      const next = enableBudgets === "true" ? "false" : "true";
                      setEnableBudgets(next);
                      await handleSaveSetting("ENABLE_BUDGET_CHECKS", next);
                    }}
                  >
                    {enableBudgets === "true" ? "🟢 ENABLED" : "⚪ DISABLED"}
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "var(--color-bg)", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>📜 Pre-Submission Policy Rules Node</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                      When enabled, request submissions evaluate against company financial limits and policy rules.
                    </div>
                  </div>
                  <button
                    className={`btn ${enablePolicies === "true" ? "btn-primary" : "btn-outline"}`}
                    onClick={async () => {
                      const next = enablePolicies === "true" ? "false" : "true";
                      setEnablePolicies(next);
                      await handleSaveSetting("ENABLE_POLICY_CHECKS", next);
                    }}
                  >
                    {enablePolicies === "true" ? "🟢 ENABLED" : "⚪ DISABLED"}
                  </button>
                </div>

              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header"><div className="card-title">⚙️ General Application Settings</div></div>
              <div className="card-body">
                <div className="form-group"><label className="form-label">System Name</label><input className="form-control" defaultValue="Macro Workflow System" /></div>
                <div className="form-group"><label className="form-label">Organization Name</label><input className="form-control" defaultValue="Enterprise ERP Corporation" /></div>
                <div className="form-group"><label className="form-label">Timezone</label><input className="form-control" defaultValue="Africa/Cairo (GMT+3)" /></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
