"use client";

import React, { useState, useEffect } from "react";
import { fetchSystemSettingsAction, updateSystemSettingAction } from "@/app/actions/workflowActions";
import { getEntraSettingsAction, saveEntraSettingsAction } from "@/app/actions/authActions";
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

  // Microsoft 365 (Entra ID) Integration State
  const [entra, setEntra] = useState({
    tenantId: "",
    clientId: "",
    clientSecret: "",
    hasClientSecret: false,
    redirectUri: "",
    scopes: "",
    enabled: false,
    defaultScopes: "",
    senderEmail: "",
    senderName: "",
    mailEnabled: false,
  });
  const [entraSaving, setEntraSaving] = useState(false);
  const [entraMsg, setEntraMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadEntra = async () => {
    try {
      const res = await getEntraSettingsAction();
      setEntra({
        tenantId: (res as any).tenantId || "",
        clientId: (res as any).clientId || "",
        clientSecret: (res as any).hasClientSecret ? "••••••••••••••••" : "",
        hasClientSecret: (res as any).hasClientSecret,
        redirectUri: (res as any).redirectUri || "",
        scopes: (res as any).scopes || "",
        enabled: (res as any).enabled,
        defaultScopes: (res as any).defaultScopes || "",
        senderEmail: (res as any).senderEmail || "",
        senderName: (res as any).senderName || "",
        mailEnabled: (res as any).mailEnabled,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const saveEntra = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntraSaving(true);
    setEntraMsg(null);
    try {
      await saveEntraSettingsAction({
        tenantId: entra.tenantId,
        clientId: entra.clientId,
        clientSecret: entra.clientSecret,
        redirectUri: entra.redirectUri,
        scopes: entra.scopes,
        enabled: entra.enabled,
        senderEmail: entra.senderEmail,
        senderName: entra.senderName,
        mailEnabled: entra.mailEnabled,
      });
      setEntra((p) => ({ ...p, hasClientSecret: p.hasClientSecret || p.clientSecret.trim().length > 0 && !p.clientSecret.includes("••") }));
      setEntraMsg({ ok: true, text: "Microsoft 365 integration settings saved successfully." });
      await loadEntra();
    } catch (err) {
      setEntraMsg({ ok: false, text: "Error saving Microsoft 365 settings: " + err });
    } finally {
      setEntraSaving(false);
    }
  };

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
    loadEntra();
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
              { id: "Microsoft365", label: "☁ Microsoft 365 & SSO", labelAr: "مايكروسوفت 365 والدخول الموحد" },
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
          ) : activeTab === "Microsoft365" ? (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">☁ Microsoft 365 (Entra ID) Single Sign-On Integration</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    Employees sign in with their work email; only their basic profile is synced. Mailbox access is
                    centralized to one system sender only.
                  </div>
                </div>
                <span className={`badge ${entra.enabled ? "success" : "warning"}`}>
                  {entra.enabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>

              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {entraMsg && (
                  <div style={{
                    padding: "10px 14px", borderRadius: 8, fontSize: 12,
                    background: entraMsg.ok ? "#ECFDF5" : "#FEF2F2",
                    border: `1px solid ${entraMsg.ok ? "#A7F3D0" : "#FECACA"}`,
                    color: entraMsg.ok ? "#065F46" : "#991B1B",
                  }}>
                    {entraMsg.text}
                  </div>
                )}

                <form onSubmit={saveEntra} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Directory (Tenant) ID *</label>
                    <input className="form-control" value={entra.tenantId} onChange={(e) => setEntra((p) => ({ ...p, tenantId: e.target.value }))} placeholder="e.g. 1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Application (Client) ID *</label>
                    <input className="form-control" value={entra.clientId} onChange={(e) => setEntra((p) => ({ ...p, clientId: e.target.value }))} placeholder="e.g. 232a3f1e-...." />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Client Secret *</label>
                    <input
                      className="form-control"
                      type="password"
                      value={entra.clientSecret}
                      onChange={(e) => setEntra((p) => ({ ...p, clientSecret: e.target.value }))}
                      placeholder={entra.hasClientSecret ? "Leave blank to keep the saved secret" : "Paste the client secret value"}
                    />
                    {entra.hasClientSecret && (
                      <div style={{ fontSize: 11, color: "#059669", marginTop: 4 }}>✓ A client secret is already configured. Leave blank to keep it.</div>
                    )}
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Redirect URI</label>
                      <input className="form-control" value={entra.redirectUri} onChange={(e) => setEntra((p) => ({ ...p, redirectUri: e.target.value }))} placeholder="https://your-host/api/auth/microsoft/callback" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Sign-in Scopes (delegated)</label>
                      <input className="form-control" value={entra.scopes} onChange={(e) => setEntra((p) => ({ ...p, scopes: e.target.value }))} />
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
                        Profile-only by default (no mailbox for employees): <code>{entra.defaultScopes}</code>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: "var(--color-bg)", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>Enable "Sign in with Microsoft 365"</span>
                    <button
                      type="button"
                      className={`btn ${entra.enabled ? "btn-primary" : "btn-outline"}`}
                      onClick={() => setEntra((p) => ({ ...p, enabled: !p.enabled }))}
                    >
                      {entra.enabled ? "🟢 ENABLED" : "⚪ DISABLED"}
                    </button>
                  </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-primary" type="submit" disabled={entraSaving}>
                  {entraSaving ? "Saving..." : "Save Microsoft 365 Settings"}
                </button>
              </div>
            </form>

            {/* Official System Sender Mailbox */}
            <div style={{ borderTop: "1px dashed var(--color-border)", paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-primary)", marginBottom: 6 }}>
                📧 Official System Sender Mailbox (صندوق الإرسال الرسمي للنظام)
              </div>
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 12px" }}>
                The single, centralized mailbox used as the <code>From</code> address for ALL automated system email:
                approval requests, notifications, SLA alerts and digital documents. This is the ONLY mailbox the system
                touches — individual employees' mailboxes are never accessed. The app uses an application (app-only)
                permission (<code>Mail.Send</code>) to send from this one address.
              </p>
              <div className="form-grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">System Sender Email Address *</label>
                  <input
                    className="form-control"
                    type="email"
                    value={entra.senderEmail}
                    onChange={(e) => setEntra((p) => ({ ...p, senderEmail: e.target.value }))}
                    placeholder="e.g. workflow-system@company.com"
                  />
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
                    Where automated system emails appear to come from.
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">System Sender Display Name</label>
                  <input
                    className="form-control"
                    value={entra.senderName}
                    onChange={(e) => setEntra((p) => ({ ...p, senderName: e.target.value }))}
                    placeholder="e.g. Macro Workflow System"
                  />
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
                    Friendly name shown next to the email address.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: "var(--color-bg)", borderRadius: 8, marginTop: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>Enable Microsoft 365 Mailbox Integration</span>
                <button
                  type="button"
                  className={`btn ${entra.mailEnabled ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setEntra((p) => ({ ...p, mailEnabled: !p.mailEnabled }))}
                >
                  {entra.mailEnabled ? "🟢 ENABLED" : "⚪ DISABLED"}
                </button>
              </div>
            </div>

            {/* Step-by-step Azure guide */}
                <div style={{ borderTop: "1px dashed var(--color-border)", paddingTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-primary)", marginBottom: 12 }}>
                    📘 How to register an app in the Azure Portal & get these credentials
                  </div>
                  <ol style={{ fontSize: 12, lineHeight: 1.9, color: "var(--color-text-secondary)", paddingLeft: 18, margin: 0 }}>
                    <li>Open the <a href="https://portal.azure.com" target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)" }}>Azure Portal</a> → search and open <strong>“Microsoft Entra ID”</strong> (formerly Azure Active Directory).</li>
                    <li>In the left menu, open <strong>“App registrations”</strong> → click <strong>“New registration.”</strong></li>
                    <li>Enter a name (e.g. “Macro Workflow System”), choose the supported account type (preferably <strong>“Accounts in this organizational directory only”</strong>), set the redirect URI platform to <strong>“Web”</strong> and paste exactly:
                      <div style={{ background: "#F1F5F9", padding: "6px 10px", borderRadius: 6, fontFamily: "monospace", fontSize: 11, margin: "6px 0", wordBreak: "break-all" }}>{entra.redirectUri}</div>
                      then click <strong>Register</strong>.</li>
                    <li>On the app’s <strong>Overview</strong> page, copy the <strong>Directory (tenant) ID</strong> and the <strong>Application (client) ID</strong>, and paste them into the fields above.</li>
                    <li>In the left menu, open <strong>“Certificates &amp; secrets”</strong> → <strong>“New client secret”</strong>, choose an expiry, add it, then <strong>copy the Value immediately</strong> (it’s shown only once) and paste it into the Client Secret field above.</li>
                    <li>Under <strong>“API permissions”</strong> → <strong>“Add a permission”</strong> → <strong>“Microsoft Graph”</strong>:
                      <ul style={{ marginTop: 4, marginBottom: 4 }}>
                        <li><strong>Delegated permissions</strong> (only what employees sign in with): <code>User.Read</code>, <code>openid</code>, <code>email</code>, <code>profile</code>, and <code>offline_access</code>. No mailbox permissions for employees.</li>
                        <li><strong>Application permissions</strong> (for the single system sender mailbox): <code>Mail.Send</code> and <code>Mail.Read</code>.</li>
                      </ul>
                      Then click <strong>“Grant admin consent”</strong>.</li>
                    <li>Click <strong>“Save Microsoft 365 Settings”</strong> above to persist your configuration to the database.</li>
                    <li>Finally, create user accounts for your employees under <strong>Admin → Users &amp; IAM</strong>, set their <strong>Auth Method</strong> to <strong>Microsoft 365</strong> and make sure their <strong>email matches their work email</strong>.</li>
                  </ol>
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
