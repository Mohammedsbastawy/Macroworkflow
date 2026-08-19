"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchAuthorizedCatalogWorkflowsAction, submitWorkflowRequestAction } from "@/app/actions/workflowActions";
import { TransportationRouteControl } from "@/components/forms/TransportationRouteControl";

function NewRequestInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slugParam = searchParams.get("slug");

  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWf, setSelectedWf] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCatalog = (userId?: string) => {
    const savedId = userId || localStorage.getItem("simulated_user_id") || "user-admin";
    fetchAuthorizedCatalogWorkflowsAction(savedId).then((list) => {
      setWorkflows(list || []);
      if (slugParam) {
        const found = list.find((w: any) => w.slug === slugParam || w.id === slugParam);
        if (found) setSelectedWf(found);
      }
    });
  };

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const savedId = localStorage.getItem("simulated_user_id") || "user-admin";
    loadCatalog(savedId);
    import("@/lib/engine/iamStore").then(({ SYSTEM_USERS }) => {
      const u = SYSTEM_USERS.find(user => user.id === savedId) || SYSTEM_USERS[0];
      setCurrentUser(u);
    });

    const handleSwitch = () => {
      const updatedId = localStorage.getItem("simulated_user_id") || "user-admin";
      loadCatalog(updatedId);
      import("@/lib/engine/iamStore").then(({ SYSTEM_USERS }) => {
        const u = SYSTEM_USERS.find(user => user.id === updatedId) || SYSTEM_USERS[0];
        setCurrentUser(u);
      });
    };

    window.addEventListener("user-simulated-switch", handleSwitch);
    return () => window.removeEventListener("user-simulated-switch", handleSwitch);
  }, [slugParam]);

  const handleClone = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const msg = localStorage.getItem("system_lang") === "ar"
      ? "هل تريد استنساخ هذه الاستمارة لعمل نسخة جديدة؟"
      : "Do you want to clone this form to create a new copy?";
    if (confirm(msg)) {
      const { cloneWorkflowAction } = await import("@/app/actions/workflowActions");
      await cloneWorkflowAction(id);
      loadCatalog();
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    const msg = localStorage.getItem("system_lang") === "ar"
      ? `هل انت متأكد من حذف استمارة "${name}" بالكامل؟`
      : `Are you sure you want to permanently delete form "${name}"?`;
    if (confirm(msg)) {
      const { deleteWorkflowAction } = await import("@/app/actions/workflowActions");
      await deleteWorkflowAction(id);
      loadCatalog();
    }
  };

  const handleInputChange = (key: string, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWf || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await submitWorkflowRequestAction({
        workflowSlug: selectedWf.slug,
        requesterId: currentUser?.id || "user-admin",
        title: title || `${selectedWf.name} Request`,
        priority,
        fieldValues: formData,
      });

      if (res.success && res.request) {
        router.push(`/requests/${res.request.id}`);
      } else {
        router.push("/requests");
      }
    } catch (err) {
      alert("Error submitting request: " + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter forms for selection grid
  const dynamicCategories = ["All", ...Array.from(new Set(workflows.map((w) => w.category).filter(Boolean)))];
  const filteredWorkflows = workflows.filter((w) => {
    const matchCat = selectedCategory === "All" || w.category === selectedCategory;
    const matchQuery = !searchQuery || w.name?.toLowerCase().includes(searchQuery.toLowerCase()) || w.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  // ── MODE 1: FORM SELECTION CATALOG GRID (When no form is selected yet) ──
  if (!selectedWf) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Page Header */}
        <div className="page-header" style={{ flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 className="page-title">📝 Choose Request Form</h1>
            <p className="page-subtitle">Select a service request template authorized for your profile</p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              className="form-control"
              placeholder="🔍 Search forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 220, fontSize: 13 }}
            />
          </div>
        </div>

        {/* Category Tabs */}
        {dynamicCategories.length > 1 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

        {/* Selection Cards Grid */}
        {filteredWorkflows.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>No Matching Service Forms</div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
              Try searching with another keyword or select a different category.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {filteredWorkflows.map((wf) => (
              <div
                key={wf.id || wf.slug}
                className="card"
                onClick={() => { setSelectedWf(wf); setFormData({}); }}
                style={{
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  border: "1px solid var(--color-border)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = wf.color || "var(--color-primary)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
              >
                <div style={{ height: 4, background: wf.color || "var(--color-primary)", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }} />
                <div className="card-body" style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ fontSize: 32 }}>{wf.icon || "📄"}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className="tag" style={{ fontSize: 10, borderColor: (wf.color || "#4F46E5") + "44", color: wf.color || "#4F46E5" }}>
                        {wf.category || "General"}
                      </span>
                      {currentUser?.role === "admin" && (
                        <>
                          <button
                            onClick={(e) => handleClone(e, wf.id)}
                            title="Clone Form"
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "2px 4px" }}
                          >
                            📋
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, wf.id, wf.name)}
                            title="Delete Form"
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--color-danger)", padding: "2px 4px" }}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "var(--color-text-primary)", marginBottom: 6 }}>
                    {wf.name}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                    {wf.description}
                  </p>
                </div>

                <div style={{ padding: "12px 18px", borderTop: "1px solid var(--color-border)", background: "var(--color-bg)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600 }}>
                    📋 {(wf.fields || []).length || 3} Fields
                  </span>
                  <button className="btn btn-primary btn-sm">
                    Fill Form →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── MODE 2: ACTIVE DYNAMIC FORM (When a form is selected) ──
  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedWf(null)}
              style={{ padding: "4px 10px" }}
            >
              ← Choose Different Form
            </button>
            <h1 className="page-title">{selectedWf?.icon || "🛒"} {selectedWf?.name}</h1>
          </div>
          <p className="page-subtitle">{selectedWf?.description || "Fill out the dynamic form below to submit for approval"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ maxWidth: 840, margin: "0 auto" }}>
          {/* Main Form Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="card">
              <div className="card-body">
                <div className="section-heading">
                  <span className="section-heading-icon">📋</span> Request Details ({selectedWf?.name})
                </div>

                {/* Dynamic Form Fields for Initial Submission Only */}
                {(() => {
                  const submissionFields = ((selectedWf?.fields || []) as any[]).filter(
                    (f) => f.showInRequestForm !== false && !f.ticketOnly && f.ticketZone !== "sidebar"
                  );
                  if (submissionFields.length === 0) {
                    return (
                      <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
                        No submission fields configured for this request.
                      </div>
                    );
                  }
                  return submissionFields.map((field) => (
                    <div className="form-group" key={field.id || field.key}>
                      <label className="form-label">
                        {field.label} {field.required && <span className="required">*</span>}
                      </label>
                      {field.type === "textarea" ? (
                        <textarea
                          className="form-control"
                          rows={3}
                          placeholder={field.placeholder || `Enter ${field.label}...`}
                          value={formData[field.key] || ""}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
                          required={field.required}
                        />
                      ) : field.type === "number" ? (
                        <input
                          className="form-control"
                          type="number"
                          placeholder="0.00"
                          value={formData[field.key] || ""}
                          onChange={(e) => handleInputChange(field.key, Number(e.target.value))}
                          required={field.required}
                        />
                      ) : field.type === "date" ? (
                        <input
                          className="form-control"
                          type="date"
                          value={formData[field.key] || ""}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
                          required={field.required}
                        />
                      ) : (field.type === "select" || field.type === "glpi_category" || field.type === "glpi_urgency" || field.type === "glpi_location") ? (() => {
                        let optionsToRender = field.optionsList && field.optionsList.length > 0
                          ? field.optionsList
                          : field.type === "glpi_category"
                          ? ["Incident / عطل طارئ", "Service Request / طلب خدمة", "Change / طلب تغيير وصيانة"]
                          : field.type === "glpi_urgency"
                          ? ["High Priority / أولوية قصوى", "Medium Priority / أولوية متوسطة", "Low Priority / أولوية منخفضة"]
                          : field.type === "glpi_location"
                          ? ["Headquarters / المقر الرئيسي HQ", "Alexandria Branch / فرع الإسكندرية", "Cairo Office / فرع القاهرة"]
                          : ["Option 1", "Option 2"];

                        // Dynamic Data Provider Resolution
                        if (field.optionsSource === "categories") {
                          optionsToRender = ["HR Services", "IT Services", "Finance Services", "General Services"];
                        } else if (field.optionsSource === "departments") {
                          if (field.optionsScope === "requester_context") {
                            optionsToRender = ["IT Department (Requester Dept)"];
                          } else {
                            optionsToRender = ["IT Department", "HR Department", "Finance Department", "Operations Department"];
                          }
                        } else if (field.optionsSource === "business_groups") {
                          if (field.optionsScope === "requester_context") {
                            optionsToRender = ["IT Infrastructure Group", "IT Support Team"];
                          } else {
                            optionsToRender = ["Procurement Committee", "IT Steering Committee", "Executive Board", "HR Policy Group"];
                          }
                        } else if (field.optionsSource === "users") {
                          optionsToRender = ["Mohamed Bastawy (Admin)", "Ahmed Mohamed (IT Staff)", "Sara Ali (HR Manager)", "Khaled Omar (Finance Director)"];
                        }

                        return (
                          <select
                            className="form-control"
                            value={formData[field.key] || ""}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            required={field.required}
                          >
                            <option value="">-- Choose {field.label} --</option>
                            {optionsToRender.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        );
                      })() : field.type === "transportation_route" ? (
                        <TransportationRouteControl
                          value={formData[field.key]}
                          onChange={(val) => handleInputChange(field.key, val)}
                          limits={field.travelLimits}
                        />
                      ) : (
                        <input
                          className="form-control"
                          placeholder={field.placeholder || `Enter ${field.label}...`}
                          value={formData[field.key] || ""}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
                          required={field.required}
                        />
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Form Sticky Footer */}
        <div className="form-footer">
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            Request will be assigned and tracked automatically
          </div>
          <div className="form-footer-right">
            <Link href="/workflows">
              <button type="button" className="btn btn-outline">Cancel</button>
            </Link>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "📤 Submit Request →"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading Request Catalog...</div>}>
      <NewRequestInner />
    </Suspense>
  );
}
