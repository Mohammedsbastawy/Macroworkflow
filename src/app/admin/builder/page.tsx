"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchCatalogWorkflowsAction, createWorkflowFormAction } from "@/app/actions/workflowActions";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function WorkflowBuilderDirectoryPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Create Workflow Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWfName, setNewWfName] = useState("");
  const [newWfCategory, setNewWfCategory] = useState("General");
  const [newWfDesc, setNewWfDesc] = useState("");
  const [newWfIcon, setNewWfIcon] = useState("⚡");
  const [newWfColor, setNewWfColor] = useState("#4F46E5");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const res = await fetchCatalogWorkflowsAction();
      setWorkflows(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWfName.trim()) return;
    setIsSubmitting(true);
    try {
      await createWorkflowFormAction({
        name: newWfName,
        category: newWfCategory,
        description: newWfDesc || "Custom Enterprise Visual Workflow",
        icon: newWfIcon,
        color: newWfColor,
        fields: [],
      });
      setShowCreateModal(false);
      setNewWfName("");
      setNewWfDesc("");
      await loadWorkflows();
    } catch (err: any) {
      alert(`Error creating workflow: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ["All", ...Array.from(new Set(workflows.map((w) => w.category).filter(Boolean)))];
  const filtered = workflows.filter((w) => selectedCategory === "All" || w.category === selectedCategory);

  return (
    <AuthGuard requiredModule="workflowBuilder" allowRoles={['admin', 'approver']}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🔧 Enterprise Workflow Builder</h1>
          <p className="page-subtitle">Design multi-step node approval flows, visual logic branches, and system integrations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          ＋ Create New Workflow
        </button>
      </div>

      {/* Category Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`btn btn-sm ${selectedCategory === cat ? "btn-primary" : "btn-outline"}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Workflows Directory Grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading workflows directory...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚡</div>
          <div className="empty-state-title">No Workflows Found</div>
          <div className="empty-state-description">Click &apos;Create New Workflow&apos; to build a visual node flow</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map((wf) => (
            <div key={wf.id || wf.slug} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div className="card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ fontSize: 28, width: 44, height: 44, borderRadius: 10, background: `${wf.color || '#4F46E5'}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {wf.icon || "⚡"}
                  </div>
                  <span className="badge info">v{wf.version || 1}.0 Active</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{wf.name}</h3>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {wf.description || "Custom enterprise visual workflow"}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  <span className="tag" style={{ fontSize: 10 }}>🏷️ {wf.category || "General"}</span>
                  <span className="tag" style={{ fontSize: 10 }}>🔢 Slug: {wf.slug}</span>
                </div>
              </div>
              <div style={{ padding: "12px 16px", borderTop: "1px solid var(--color-border)", background: "var(--color-bg)", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Last updated: Today</span>
                <Link href={`/admin/builder/${wf.slug || wf.id}`}>
                  <button className="btn btn-outline btn-sm">⚡ Open Canvas Editor</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: 480, maxWidth: "90vw", background: "var(--color-surface)", borderRadius: 12 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>⚡ Create New Visual Workflow</div>
              <button className="btn btn-outline btn-sm" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateWorkflow}>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Workflow Name *</label>
                  <input className="form-control" placeholder="e.g. IT Equipment Purchase Request" value={newWfName} onChange={(e) => setNewWfName(e.target.value)} required />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-control" value={newWfCategory} onChange={(e) => setNewWfCategory(e.target.value)}>
                      <option value="General">General</option>
                      <option value="IT Services">IT Services</option>
                      <option value="HR & Operations">HR & Operations</option>
                      <option value="Finance & Purchasing">Finance & Purchasing</option>
                      <option value="Facilities & Admin">Facilities & Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Icon Emoji</label>
                    <input className="form-control" value={newWfIcon} onChange={(e) => setNewWfIcon(e.target.value)} maxLength={2} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={2} placeholder="Describe the workflow process and objectives..." value={newWfDesc} onChange={(e) => setNewWfDesc(e.target.value)} />
                </div>
              </div>
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Create & Launch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
