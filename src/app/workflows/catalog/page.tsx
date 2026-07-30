import React from "react";
import Link from "next/link";
import { getAuthorizedWorkflows } from "@/lib/db/workflowSdk";
import { SYSTEM_USERS } from "@/lib/engine/iamStore";

export const revalidate = 0; // Dynamic Server Component

export default async function ServiceCatalogPage({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string; category?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeRoleId = resolvedSearchParams.role || "role-admin";
  const activeCategory = resolvedSearchParams.category || "All";

  // Fetch ONLY Authorized Forms from local database
  const rawAuthorizedForms = await getAuthorizedWorkflows(activeRoleId);

  // Default fallback catalog if database BaaS server is offline
  const fallbackForms = [
    {
      id: "form-annual-leave",
      name: "طلب إجازة اعتيادية (Annual Leave)",
      slug: "annual-leave",
      category: "HR Services",
      description: "طلب إجازة متاح لجميع موظفي الشركة برصيد الإجازات السنوي",
      icon: "🌴",
      color: "#10B981",
      fields: [],
    },
    {
      id: "form-it-laptop",
      name: "طلب لابتوب وتحديث أجهزة IT",
      slug: "it-laptop-request",
      category: "IT Services",
      description: "طلب أجهزة محمولة وتجديد عهدة لمهندسي البرمجيات والـ IT",
      icon: "💻",
      color: "#0EA5E9",
      fields: [],
    },
    {
      id: "form-procurement",
      name: "طلب ميزانية ومشتريات لجنة المشتريات",
      slug: "procurement-request",
      category: "Finance Services",
      description: "خاص بأعضاء لجنة المشتريات والمديرين التنفيذيين",
      icon: "💰",
      color: "#F59E0B",
      fields: [],
    },
  ];

  const formsList = rawAuthorizedForms && rawAuthorizedForms.length > 0 ? rawAuthorizedForms : fallbackForms;

  // Extract Categories dynamically
  const categories = ["All", ...Array.from(new Set(formsList.map((f: any) => f.category).filter(Boolean)))];

  const filteredForms = formsList.filter(
    (f: any) => activeCategory === "All" || f.category === activeCategory
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>⚡ Enterprise Service Catalog</span>
            <span>·</span>
            <span>database BaaS SDK Integrated</span>
          </div>
          <h1 className="text-2xl font-bold">Service Catalog & Request Portal</h1>
          <p className="text-sm text-slate-300 mt-1">
            Authorized service request forms dynamically filtered by your Department & Business Group memberships.
          </p>
        </div>
        <Link href="/workflows/form-builder">
          <button className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow transition-colors">
            ＋ Design New Form
          </button>
        </Link>
      </div>

      {/* Category Tabs */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {categories.map((cat: any) => {
            const isActive = cat === activeCategory;
            return (
              <Link
                key={cat}
                href={`/workflows/catalog?category=${encodeURIComponent(cat)}&role=${activeRoleId}`}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                }`}
              >
                {cat}
              </Link>
            );
          })}
        </div>
      )}

      {/* Catalog Cards Grid */}
      {filteredForms.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Authorized Service Forms</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Your current assigned role does not have visibility permission for forms in this category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {filteredForms.map((form: any) => (
            <div
              key={form.id || form.slug}
              className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all flex flex-col justify-between overflow-hidden"
            >
              <div>
                <div style={{ height: 4, background: form.color || "#4F46E5" }} />
                <div className="p-6">
                  <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform">
                    {form.icon || "📄"}
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {form.name}
                    </h3>
                    <span
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md border"
                      style={{
                        borderColor: (form.color || "#4F46E5") + "44",
                        color: form.color || "#4F46E5",
                        backgroundColor: (form.color || "#4F46E5") + "11",
                      }}
                    >
                      {form.category || "General"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {form.description}
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-2">
                <Link href={`/workflows/form-builder?id=${form.id}`}>
                  <button className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors">
                    ✏️ Edit Form
                  </button>
                </Link>
                <Link href={`/requests/new?slug=${form.slug || form.id}`}>
                  <button className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors">
                    Use Form →
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

