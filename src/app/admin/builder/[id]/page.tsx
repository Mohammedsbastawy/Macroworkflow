"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { WorkflowCanvas } from "@/components/builder/WorkflowCanvas";
import { fetchCatalogWorkflowsAction } from "@/app/actions/workflowActions";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function DedicatedWorkflowCanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const workflowId = resolvedParams.id;

  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCatalogWorkflowsAction().then((all) => {
      const found = (all || []).find((w: any) => w.slug === workflowId || w.id === workflowId) || {
        id: workflowId,
        name: workflowId.replace(/-/g, " ").toUpperCase(),
        slug: workflowId,
        category: "General",
        version: 1,
        published_version: 1,
      };
      setWorkflow(found);
      setLoading(false);
    });
  }, [workflowId]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading visual canvas editor...</div>;
  }

  return (
    <AuthGuard requiredModule="workflowBuilder" allowRoles={['admin', 'approver']}>
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 70px)", margin: "-24px" }}>
        {/* Header bar for specific workflow */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/admin/builder">
              <button className="btn btn-outline btn-sm">← Workflows Directory</button>
            </Link>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{workflow.icon || "⚡"} {workflow.name}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Visual Node Canvas · Slug: {workflow.slug}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="tag" style={{ fontSize: 11 }}>🏷️ {workflow.category || "General"}</span>
            <span className="badge info">v{workflow.version || 1}.0 Active</span>
          </div>
        </div>

        {/* Infinite React Flow Visual Canvas */}
        <div style={{ flex: 1, position: "relative" }}>
          <WorkflowCanvas workflowSlug={workflow?.slug || workflowId} />
        </div>
      </div>
    </AuthGuard>
  );
}
