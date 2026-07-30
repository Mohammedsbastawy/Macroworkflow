"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitWorkflowTicket } from "@/lib/db/workflowSdk";

export interface FormFieldSchema {
  id: string;
  field_key: string;
  label: string;
  field_type: "text" | "textarea" | "number" | "date" | "select" | "checkbox" | "file" | "user_picker" | "external_lookup";
  section_name?: string;
  layout_width?: "full" | "half";
  is_required?: boolean;
  placeholder?: string;
  options_json?: Array<{ label: string; value: string }>;
  options_source?: "custom" | "categories" | "departments" | "business_groups" | "users";
  options_scope?: "global" | "requester_context";
  has_condition?: boolean;
  condition_field_key?: string;
  condition_operator?: "equals" | "not_equals" | "greater_than" | "contains";
  condition_value?: string;
  api_endpoint_url?: string;
  api_label_field?: string;
  api_value_field?: string;
  auto_fill_variable?: string;
  autoFillVariable?: string;
  visible_to_requester?: boolean;
  visibleToRequester?: boolean;
  read_only?: boolean;
  readOnly?: boolean;
}

export interface FormSchemaProps {
  id: string;
  name: string;
  slug: string;
  category?: string;
  description?: string;
  fields: FormFieldSchema[];
}

export function DynamicForm({ formSchema }: { formSchema: FormSchemaProps }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [lookupOptions, setLookupOptions] = useState<Record<string, Array<{ label: string; value: string }>>>({});
  const [lookupLoading, setLookupLoading] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize Auto-Fill Magic Variables on mount
  useEffect(() => {
    let currentUser: any = { name: "Ahmed Mohamed (IT Staff)", email: "ahmed@company.com", id: "user-ahmed", dept: "IT Department" };
    try {
      const stored = localStorage.getItem("simulated_user");
      if (stored) currentUser = JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }

    const initialValues: Record<string, any> = {};
    (formSchema.fields || []).forEach((field) => {
      const key = field.field_key || (field as any).key || field.id;
      const fillVar = field.auto_fill_variable || field.autoFillVariable;

      if (fillVar && fillVar !== "none") {
        if (fillVar === "user_name") initialValues[key] = currentUser.name || "Ahmed Mohamed";
        else if (fillVar === "user_email") initialValues[key] = currentUser.email || "ahmed@company.com";
        else if (fillVar === "user_dept") initialValues[key] = currentUser.department_name || currentUser.dept || "IT Department";
        else if (fillVar === "user_job") initialValues[key] = currentUser.job_title || "IT Specialist";
        else if (fillVar === "user_id") initialValues[key] = currentUser.id || "user-ahmed";
        else if (fillVar === "current_date") initialValues[key] = new Date().toISOString().split("T")[0];
        else if (fillVar === "auto_ticket_no") initialValues[key] = `REQ-${Date.now().toString().slice(-6)}`;
      }
    });

    setFormValues((prev) => ({ ...initialValues, ...prev }));
  }, [formSchema]);

  // Handle Field Input Changes
  const handleFieldChange = (key: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Evaluate Conditional Display Rules
  const shouldRenderField = (field: FormFieldSchema): boolean => {
    // Hide field if explicit requester visibility is disabled
    if (field.visible_to_requester === false || field.visibleToRequester === false) {
      return false;
    }

    if (!field.has_condition || !field.condition_field_key) return true;

    const targetValue = formValues[field.condition_field_key];
    const expectedValue = field.condition_value;

    switch (field.condition_operator) {
      case "equals":
        return String(targetValue) === String(expectedValue);
      case "not_equals":
        return String(targetValue) !== String(expectedValue);
      case "contains":
        return String(targetValue || "").toLowerCase().includes(String(expectedValue || "").toLowerCase());
      case "greater_than":
        return Number(targetValue || 0) > Number(expectedValue || 0);
      default:
        return true;
    }
  };

  // Fetch External API Lookups (e.g. Snipe-IT / GLPI / database endpoints)
  useEffect(() => {
    fieldLoop: for (const field of formSchema.fields || []) {
      if (field.field_type === "external_lookup" && field.api_endpoint_url) {
        const key = field.field_key;
        if (lookupOptions[key] || lookupLoading[key]) continue fieldLoop;

        setLookupLoading((prev) => ({ ...prev, [key]: true }));

        fetch(field.api_endpoint_url)
          .then((res) => res.json())
          .then((data) => {
            const rawList = Array.isArray(data) ? data : data.data || [];
            const mapped = rawList.map((item: any) => ({
              label: item[field.api_label_field || "name"] || item.name || String(item.id),
              value: String(item[field.api_value_field || "id"] || item.id),
            }));
            setLookupOptions((prev) => ({ ...prev, [key]: mapped }));
          })
          .catch((err) => {
            console.warn(`External lookup failed for ${key}:`, err);
            // Fallback options
            setLookupOptions((prev) => ({
              ...prev,
              [key]: [
                { label: "Asset #1092 - MacBook Pro 16", value: "ast-1092" },
                { label: "Asset #4421 - Dell XPS 15", value: "ast-4421" },
              ],
            }));
          })
          .finally(() => {
            setLookupLoading((prev) => ({ ...prev, [key]: false }));
          });
      }
    }
  }, [formSchema]);

  // Form Submission Payload to database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate Required Fields
    for (const field of formSchema.fields) {
      if (shouldRenderField(field) && field.is_required) {
        const val = formValues[field.field_key];
        if (val === undefined || val === null || String(val).trim() === "") {
          setSubmitError(`Please fill in mandatory field: "${field.label}"`);
          return;
        }
      }
    }

    startTransition(async () => {
      try {
        const res = await submitWorkflowTicket(
          formSchema.id,
          formValues.title || `${formSchema.name} Request`,
          formValues
        );
        if (res) {
          router.push("/requests");
        } else {
          setSubmitError("Failed to submit request to database.");
        }
      } catch (err: any) {
        setSubmitError(err.message || "An unexpected error occurred.");
      }
    });
  };

  // Group Fields by Section Name
  const sections = (formSchema.fields || []).reduce((acc, field) => {
    const secName = field.section_name || "General Information";
    if (!acc[secName]) acc[secName] = [];
    acc[secName].push(field);
    return acc;
  }, {} as Record<string, FormFieldSchema[]>);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      {/* Form Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📋</span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{formSchema.name}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formSchema.description}</p>
          </div>
        </div>
      </div>

      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
          ⚠️ {submitError}
        </div>
      )}

      {/* Render Dynamic Field Sections */}
      {Object.entries(sections).map(([sectionName, fields]) => (
        <div key={sectionName} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
            {sectionName}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => {
              if (!shouldRenderField(field)) return null;

              const isFullWidth = field.layout_width === "full" || field.field_type === "textarea";

              return (
                <div key={field.id} className={`${isFullWidth ? "md:col-span-2" : "md:col-span-1"} flex flex-col gap-1.5`}>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>
                      {field.label} {field.is_required && <span className="text-red-500">*</span>}
                    </span>
                  </label>

                  {/* Field Type: Text / Input */}
                  {field.field_type === "text" && (
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder={field.placeholder || `Enter ${field.label}...`}
                      value={formValues[field.field_key] || ""}
                      readOnly={Boolean(field.read_only || field.readOnly)}
                      onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                    />
                  )}

                  {/* Field Type: Textarea */}
                  {field.field_type === "textarea" && (
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder={field.placeholder || `Provide details...`}
                      value={formValues[field.field_key] || ""}
                      readOnly={Boolean(field.read_only || field.readOnly)}
                      onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                    />
                  )}

                  {/* Field Type: Select Dropdown */}
                  {field.field_type === "select" && (
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formValues[field.field_key] || ""}
                      onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                    >
                      <option value="">-- Select {field.label} --</option>
                      {(field.options_json || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Field Type: External API Lookup */}
                  {field.field_type === "external_lookup" && (
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formValues[field.field_key] || ""}
                      onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                      disabled={lookupLoading[field.field_key]}
                    >
                      <option value="">
                        {lookupLoading[field.field_key] ? "Loading External API Data..." : `-- Select ${field.label} --`}
                      </option>
                      {(lookupOptions[field.field_key] || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Field Type: Date */}
                  {field.field_type === "date" && (
                    <input
                      type="date"
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formValues[field.field_key] || ""}
                      onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                    />
                  )}

                  {/* Field Type: Number */}
                  {field.field_type === "number" && (
                    <input
                      type="number"
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="0.00"
                      value={formValues[field.field_key] || ""}
                      onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Form Controls */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
        >
          {isPending ? "Submitting Request..." : "Submit Request →"}
        </button>
      </div>
    </form>
  );
}

