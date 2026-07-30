"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAuthorizedCatalogWorkflowsAction, deleteWorkflowAction, cloneWorkflowAction } from "@/app/actions/workflowActions";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { SYSTEM_USERS, SystemUser } from "@/lib/engine/iamStore";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function CatalogPage() {
  const { lang } = useLanguage();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<SystemUser>(SYSTEM_USERS[0]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const simulatedUserId = localStorage.getItem("simulated_user_id") || "user-admin";
      const u = SYSTEM_USERS.find((user) => user.id === simulatedUserId) || SYSTEM_USERS[0];
      setCurrentUser(u);

      const data = await fetchAuthorizedCatalogWorkflowsAction(simulatedUserId);
      setWorkflows(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
    const handleUserSwitch = () => loadCatalog();
    window.addEventListener("user-simulated-switch", handleUserSwitch);
    return () => window.removeEventListener("user-simulated-switch", handleUserSwitch);
  }, []);

  const canManageCatalog = currentUser.role === "admin" || currentUser.role === "approver";

  const handleClone = async (id: string) => {
    if (confirm("هل تريد استنساخ هذه الاستمارة لعمل نسخة جديدة؟")) {
      await cloneWorkflowAction(id);
      loadCatalog();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف وإزالة استمارة "${name}" من الكتالوج؟`)) {
      setWorkflows((prev) => prev.filter((w) => w.id !== id && w.slug !== id));
      await deleteWorkflowAction(id);
      await loadCatalog();
    }
  };

  // Dynamically extract categories from authorized workflows
  const dynamicCategories = [
    "All",
    ...Array.from(new Set(workflows.map((w) => w.category).filter(Boolean))),
  ];

  const filtered = workflows.filter(
    (w) => selectedCategory === "All" || w.category === selectedCategory
  );

  return (
    <AuthGuard requiredModule="workflowBuilder" allowRoles={["admin", "approver"]}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === "ar" ? "محرر كتالوج الطلبات" : "Requests Catalog Editor"}</h1>
          <p className="page-subtitle">
            IAM-Authorized Service Requests for <strong>{currentUser.name}</strong> ({currentUser.role.toUpperCase()})
          </p>
        </div>
        {canManageCatalog && (
          <Link href="/workflows/form-builder">
            <button className="btn btn-primary">＋ Create New Form</button>
          </Link>
        )}
      </div>

      {/* Category Filter */}
      {dynamicCategories.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {dynamicCategories.map((cat) => (
            <button
              key={cat}
              className={`btn btn-sm ${cat === selectedCategory ? "btn-primary" : "btn-outline"}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Catalog Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
          Loading authorized service catalog...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: "60px 20px" }}>
            <div className="empty-state-icon">🔒</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--color-text-primary)" }}>
              No Service Forms Authorized for Current IAM User
            </div>
            <div className="empty-state-text" style={{ maxWidth: 460, margin: "6px auto 16px" }}>
              Switch the <strong>🔑 IAM User</strong> in the topbar (e.g. System Admin) to view all catalog forms.
            </div>
            {canManageCatalog && (
              <Link href="/workflows/form-builder">
                <button className="btn btn-primary">＋ Create New Form</button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filtered.map((wf) => (
            <div
              key={wf.id}
              className="card"
              style={{ transition: "box-shadow 0.2s", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
            >
              <div style={{ height: 4, background: wf.color || "#4F46E5", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }} />
              <div className="card-body" style={{ padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontSize: 32 }}>{wf.icon || "⚡"}</div>
                  {canManageCatalog && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => handleClone(wf.id)}
                        title="Clone / Copy Form"
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "2px 4px" }}
                      >
                        📋
                      </button>
                      <button
                        onClick={() => handleDelete(wf.id, wf.name)}
                        title="Archive / Delete Form"
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--color-danger)", padding: "2px 4px" }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{wf.name}</div>
                  <span className="tag" style={{ fontSize: 10, borderColor: (wf.color || "#4F46E5") + "44", color: wf.color || "#4F46E5" }}>
                    {wf.category}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5, marginBottom: 14 }}>
                  {wf.description}
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, padding: "10px 16px", borderTop: "1px solid var(--color-border)", background: "var(--color-bg)" }}>
                {canManageCatalog ? (
                  <Link href={`/workflows/form-builder?id=${wf.id}`}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "4px 8px" }}>
                      ✏️ Edit Form
                    </button>
                  </Link>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Authorized Service</span>
                )}
                <Link href={`/requests/new?slug=${wf.slug}`}>
                  <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }}>Use Form →</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AuthGuard>
  );
}
