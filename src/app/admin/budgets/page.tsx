"use client";

import React, { useState, useEffect } from "react";
import { fetchBudgetsAction, saveBudgetAction, fetchOrgHierarchyAction } from "@/app/actions/workflowActions";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Budget Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [deptId, setDeptId] = useState("");
  const [year, setYear] = useState(2026);
  const [quarter, setQuarter] = useState("Q1");
  const [allocated, setAllocated] = useState(50000);
  const [spent, setSpent] = useState(0);
  const [currency, setCurrency] = useState("EGP");

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, dRes] = await Promise.all([fetchBudgetsAction(), fetchOrgHierarchyAction()]);
      setBudgets(bRes || []);
      setDepartments(dRes || []);
      if (dRes && dRes.length > 0) setDeptId(dRes[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptId) return;
    await saveBudgetAction({
      department_id: deptId,
      fiscal_year: year,
      quarter,
      allocated_amount: allocated,
      spent_amount: spent,
      currency,
    });
    setShowAddModal(false);
    await loadData();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 Departmental Budgets & Allocations (ميزانيات الأقسام)</h1>
          <p className="page-subtitle">Decoupled Financial Module for Workflow Budget Enforcement</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          ＋ Allocate New Department Budget
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading Department Budgets...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* BUDGETS CARDS GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {departments.map((dept) => {
              const deptBudget = budgets.find((b) => b.department_id === dept.id) || {
                allocated_amount: 100000,
                spent_amount: 15000,
                quarter: "Q1",
                fiscal_year: 2026,
                currency: "EGP",
              };

              const allocatedVal = Number(deptBudget.allocated_amount || 0);
              const spentVal = Number(deptBudget.spent_amount || 0);
              const remainingVal = allocatedVal - spentVal;
              const percentSpent = allocatedVal > 0 ? Math.round((spentVal / allocatedVal) * 100) : 0;

              return (
                <div key={dept.id} className="card">
                  <div className="card-header" style={{ display: "between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>📂 {dept.name}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                        {deptBudget.fiscal_year} - {deptBudget.quarter} Budget
                      </div>
                    </div>
                    <span className="tag primary">{deptBudget.currency || "EGP"}</span>
                  </div>

                  <div className="card-body">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", marginBottom: 14 }}>
                      <div style={{ background: "var(--color-bg)", padding: 8, borderRadius: 6 }}>
                        <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Allocated</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-primary)", marginTop: 2 }}>
                          {allocatedVal.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ background: "var(--color-bg)", padding: 8, borderRadius: 6 }}>
                        <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Spent</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#EF4444", marginTop: 2 }}>
                          {spentVal.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ background: "var(--color-bg)", padding: 8, borderRadius: 6 }}>
                        <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Remaining</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#10B981", marginTop: 2 }}>
                          {remainingVal.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: "100%", height: 8, background: "var(--color-bg)", borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                      <div
                        style={{
                          width: `${Math.min(percentSpent, 100)}%`,
                          height: "100%",
                          background: percentSpent > 90 ? "#EF4444" : percentSpent > 70 ? "#F59E0B" : "#10B981",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 10, color: "var(--color-text-muted)", textAlign: "right" }}>
                      {percentSpent}% budget utilized
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE BUDGET MODAL */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: 420, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>💰 Allocate Department Budget</h3>
            <form onSubmit={handleSaveBudget} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="form-control" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Fiscal Year</label>
                  <input type="number" className="form-control" value={year} onChange={(e) => setYear(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Quarter</label>
                  <select className="form-control" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Allocated Budget Amount</label>
                <input type="number" className="form-control" value={allocated} onChange={(e) => setAllocated(Number(e.target.value))} />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Budget</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
