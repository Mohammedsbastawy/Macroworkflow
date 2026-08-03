"use client";

import React, { useState, useEffect } from "react";
import {
  fetchPoliciesAction,
  savePolicyAction,
  deletePolicyAction,
  fetchOrgHierarchyAction,
  fetchTravelZonesAction,
  saveTravelZoneAction,
  deleteTravelZoneAction,
  fetchPolicyTravelRatesAction,
  savePolicyTravelRatesAction,
  fetchBusinessGroupsAction,
} from "@/app/actions/workflowActions";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export interface PolicyRuleItem {
  id: string;
  name: string;
  rule_type?: string; // 'condition_rule' | 'marketing_matrix'
  condition_field: string;
  condition_operator: string;
  condition_value: string;
  action_type: "block_submission" | "warning_banner" | "require_approval";
  error_message_ar: string;
  is_active: boolean;
  matrix_rows?: MarketingMatrixRow[];
}

export interface MarketingMatrixRow {
  id: string;
  zone_from_id: string;
  zone_to_id: string;
  transport_allowance: number;
  meal_price: number;
  meal_overnight_price: number;
}

export interface DepartmentPolicyContainer {
  id: string;
  name: string;
  department_id: string;
  description?: string;
  is_active: boolean;
  rules_json?: PolicyRuleItem[];
  department_ids_json?: string[];
  group_ids_json?: string[];
  apply_to_all?: boolean | number;
}

export default function PoliciesPage() {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"policies" | "zones">("policies");

  const [policies, setPolicies] = useState<DepartmentPolicyContainer[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [travelZones, setTravelZones] = useState<any[]>([]);
  const [businessGroups, setBusinessGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Travel Zone Modal State
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneCode, setZoneCode] = useState("");
  const [zoneIsActive, setZoneIsActive] = useState(true);

  // Modal 1: Add New Department Policy Container
  const [showAddPolicyModal, setShowAddPolicyModal] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState("");
  const [newDeptId, setNewDeptId] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Modal 1b: Edit Department Policy Container Details & Targeting
  const [showEditPolicyModal, setShowEditPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<DepartmentPolicyContainer | null>(null);
  const [editPolicyName, setEditPolicyName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetType, setEditTargetType] = useState<"all" | "departments" | "groups">("all");
  const [editDeptIds, setEditDeptIds] = useState<string[]>([]);
  const [editGroupIds, setEditGroupIds] = useState<string[]>([]);
  const [editIsActive, setEditIsActive] = useState(true);

  // Modal 2 / Detail View: Active Department Policy Rules Studio
  const [activePolicyStudio, setActivePolicyStudio] = useState<DepartmentPolicyContainer | null>(null);

  // Modal: Rule Type Picker
  const [showRuleTypePicker, setShowRuleTypePicker] = useState(false);

  // Modal 3: Add / Edit Specific Rule inside Department Studio (condition type)
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleField, setRuleField] = useState("form.amount");
  const [ruleOperator, setRuleOperator] = useState(">");
  const [ruleValue, setRuleValue] = useState("50000");
  const [ruleActionType, setRuleActionType] = useState<"block_submission" | "warning_banner" | "require_approval">("block_submission");
  const [ruleErrorMsgAr, setRuleErrorMsgAr] = useState("عفواً، الطلب يتجاوز الحد المسموح به في لائحة الإدارة.");

  // Modal 3b: Marketing Expenses Matrix
  const [showMarketingMatrixModal, setShowMarketingMatrixModal] = useState(false);
  const [matrixRuleName, setMatrixRuleName] = useState("لائحة مصاريف التسويق والمبيعات");
  const [matrixRows, setMatrixRows] = useState<MarketingMatrixRow[]>([]);
  const [activePolicyRates, setActivePolicyRates] = useState<any[]>([]);
  const [matrixPage, setMatrixPage] = useState(1);
  const [matrixSearch, setMatrixSearch] = useState("");

  // CSV Import Wizard States
  const [showCsvWizard, setShowCsvWizard] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvMappings, setCsvMappings] = useState<Record<string, number>>({
    zone_from_id: -1,
    zone_to_id: -1,
    meal_price: -1,
    meal_overnight_price: -1,
    transport_allowance: -1,
  });
  const [csvWizardStep, setCsvWizardStep] = useState<1 | 2 | 3>(1);
  const [csvConflictResolution, setCsvConflictResolution] = useState<'keep' | 'update'>('update');
  const [csvConflictsCount, setCsvConflictsCount] = useState(0);
  const [csvParsedRates, setCsvParsedRates] = useState<any[]>([]);
  const [csvSkippedRows, setCsvSkippedRows] = useState<string[]>([]);

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    // Auto-detect delimiter: comma, semicolon, or tab
    const firstLine = lines[0];
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;

    let delimiter = ',';
    if (semicolons > commas && semicolons > tabs) {
      delimiter = ';';
    } else if (tabs > commas && tabs > semicolons) {
      delimiter = '\t';
    }

    const parsed = lines
      .map(line => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      })
      .filter(row => row.length > 0 && row.some(cell => cell !== ''));
    
    if (parsed.length > 0) {
      setCsvHeaders(parsed[0]);
      setCsvRows(parsed.slice(1));
      
      const headers = parsed[0].map(h => h.toLowerCase().trim());
      // Default to user's requested order: 0: From, 1: To, 2: Transport, 3: Meal, 4: Overnight
      const initialMap: Record<string, number> = {
        zone_from_id: parsed[0].length > 0 ? 0 : -1,
        zone_to_id: parsed[0].length > 1 ? 1 : -1,
        transport_allowance: parsed[0].length > 2 ? 2 : -1,
        meal_price: parsed[0].length > 3 ? 3 : -1,
        meal_overnight_price: parsed[0].length > 4 ? 4 : -1,
      };
      
      headers.forEach((h, idx) => {
        if (h.includes('from') || h.includes('من') || h.includes('ذهاب') || h.includes('أ') || h.includes('المنطلق')) {
          initialMap.zone_from_id = idx;
        } else if (h.includes('to') || h.includes('إلى') || h.includes('وصول') || h.includes('ب')) {
          initialMap.zone_to_id = idx;
        } else if (h.includes('allowance') || h.includes('انتقال') || h.includes('مواصلات') || h.includes('بدل')) {
          initialMap.transport_allowance = idx;
        } else if (h.includes('overnight') || h.includes('مبيت') || h.includes('ليلة')) {
          initialMap.meal_overnight_price = idx;
        } else if (h.includes('meal') || h.includes('وجبة') || h.includes('أكل')) {
          initialMap.meal_price = idx;
        }
      });
      
      setCsvMappings(initialMap);
      setCsvWizardStep(2);
    }
  };

  const normalizeZoneIdentifier = (val: string): string => {
    if (!val) return "";
    return val.trim().toLowerCase().replace(/^(place_|place-|zone_|zone-)/g, "");
  };

  const parseCsvNumber = (val: any): number => {
    if (val === undefined || val === null) return 0;
    let str = String(val).trim();
    // If it contains commas and no dots, e.g., "1,000", remove commas
    if (str.includes(',') && !str.includes('.')) {
      str = str.replace(/,/g, '');
    } else if (str.includes(',') && str.includes('.')) {
      // Standard English format with thousands separator: e.g. "1,000.50"
      if (str.indexOf(',') < str.indexOf('.')) {
        str = str.replace(/,/g, '');
      } else {
        // European format: e.g. "1.000,50" -> swap dots and commas
        str = str.replace(/\./g, '').replace(/,/g, '.');
      }
    } else if (str.includes('.') && !str.includes(',')) {
      if ((str.match(/\./g) || []).length > 1) {
        str = str.replace(/\./g, '');
      }
    }
    // Remove currency signs and spaces
    str = str.replace(/[^\d.-]/g, '');
    const num = Number(str);
    return isNaN(num) ? 0 : num;
  };

  const analyzeCsvConflicts = () => {
    if (csvMappings.zone_from_id === -1 || csvMappings.zone_to_id === -1) {
      alert("يرجى اختيار خطوط السير (من وإلى) أولاً لتتم عملية الاستيراد.");
      return;
    }

    let conflicts = 0;
    const ratesToImport: any[] = [];
    const skipped: string[] = [];

    for (let index = 0; index < csvRows.length; index++) {
      const row = csvRows[index];
      if (row.length <= Math.max(csvMappings.zone_from_id, csvMappings.zone_to_id)) {
        continue;
      }

      const fromVal = row[csvMappings.zone_from_id] || "";
      const toVal = row[csvMappings.zone_to_id] || "";
      const transportVal = csvMappings.transport_allowance !== -1 ? parseCsvNumber(row[csvMappings.transport_allowance]) : 0;
      const mealVal = csvMappings.meal_price !== -1 ? parseCsvNumber(row[csvMappings.meal_price]) : 0;
      const mealOvernightVal = csvMappings.meal_overnight_price !== -1 ? parseCsvNumber(row[csvMappings.meal_overnight_price]) : 0;

      const normFromVal = normalizeZoneIdentifier(fromVal);
      const resolvedFromZone = travelZones.find(
        (z) =>
          normalizeZoneIdentifier(z.id || '') === normFromVal ||
          normalizeZoneIdentifier(z.code || '') === normFromVal ||
          (z.name || '').trim().toLowerCase() === fromVal.trim().toLowerCase()
      );

      const normToVal = normalizeZoneIdentifier(toVal);
      const resolvedToZone = travelZones.find(
        (z) =>
          normalizeZoneIdentifier(z.id || '') === normToVal ||
          normalizeZoneIdentifier(z.code || '') === normToVal ||
          (z.name || '').trim().toLowerCase() === toVal.trim().toLowerCase()
      );

      if (!resolvedFromZone || !resolvedToZone) {
        skipped.push(`الصف ${index + 2}: لم يتم العثور على منطقة "${fromVal}" أو "${toVal}" في الدليل.`);
        continue;
      }

      const existingRate = activePolicyRates.find(
        (r) => r.zone_from_id === resolvedFromZone.id && r.zone_to_id === resolvedToZone.id
      );

      if (existingRate) {
        conflicts++;
      }

      ratesToImport.push({
        id: existingRate?.id || `tr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        zone_from_id: resolvedFromZone.id,
        zone_to_id: resolvedToZone.id,
        transport_allowance: transportVal,
        meal_price: mealVal,
        meal_overnight_price: mealOvernightVal,
        isExisting: !!existingRate,
        old_transport_allowance: existingRate?.transport_allowance || 0,
        old_meal_price: existingRate?.meal_price || 0,
        old_meal_overnight_price: existingRate?.meal_overnight_price || 0,
      });
    }

    setCsvConflictsCount(conflicts);
    setCsvParsedRates(ratesToImport);
    setCsvSkippedRows(skipped);
    setCsvWizardStep(3);
  };

  const executeCsvImport = async () => {
    if (!activePolicyStudio) return;

    let finalRates: any[] = [];

    if (csvConflictResolution === 'keep') {
      const newRates = csvParsedRates.filter((r) => !r.isExisting);
      finalRates = [
        ...activePolicyRates.map((r) => ({
          id: r.id,
          zone_from_id: r.zone_from_id,
          zone_to_id: r.zone_to_id,
          meal_price: r.meal_price,
          meal_overnight_price: r.meal_overnight_price,
          transport_allowance: r.transport_allowance,
        })),
        ...newRates.map((r) => ({
          id: r.id,
          zone_from_id: r.zone_from_id,
          zone_to_id: r.zone_to_id,
          meal_price: r.meal_price,
          meal_overnight_price: r.meal_overnight_price,
          transport_allowance: r.transport_allowance,
        })),
      ];
    } else {
      const csvRatePairs = csvParsedRates.map((r) => `${r.zone_from_id}_${r.zone_to_id}`);
      const untouchedExisting = activePolicyRates.filter(
        (r) => !csvRatePairs.includes(`${r.zone_from_id}_${r.zone_to_id}`)
      );

      finalRates = [
        ...untouchedExisting.map((r) => ({
          id: r.id,
          zone_from_id: r.zone_from_id,
          zone_to_id: r.zone_to_id,
          meal_price: r.meal_price,
          meal_overnight_price: r.meal_overnight_price,
          transport_allowance: r.transport_allowance,
        })),
        ...csvParsedRates.map((r) => ({
          id: r.id,
          zone_from_id: r.zone_from_id,
          zone_to_id: r.zone_to_id,
          meal_price: r.meal_price,
          meal_overnight_price: r.meal_overnight_price,
          transport_allowance: r.transport_allowance,
        })),
      ];
    }

    await savePolicyTravelRatesAction(activePolicyStudio.id, finalRates);
    
    const rates = await fetchPolicyTravelRatesAction(activePolicyStudio.id);
    setActivePolicyRates(rates || []);
    setMatrixRows(rates || []);
    
    setShowCsvWizard(false);
    resetCsvWizard();
  };

  const resetCsvWizard = () => {
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvWizardStep(1);
    setCsvConflictsCount(0);
    setCsvParsedRates([]);
    setCsvSkippedRows([]);
    setCsvConflictResolution('update');
  };

  useEffect(() => {
    if (activePolicyStudio?.id) {
      fetchPolicyTravelRatesAction(activePolicyStudio.id).then((rates) => {
        setActivePolicyRates(rates || []);
      });
    } else {
      setActivePolicyRates([]);
    }
  }, [activePolicyStudio?.id]);

  const addMatrixRow = () => {
    setMatrixRows(prev => [...prev, {
      id: `mr-${Date.now()}`,
      zone_from_id: "",
      zone_to_id: "",
      transport_allowance: 0,
      meal_price: 0,
      meal_overnight_price: 0,
    }]);
  };

  const updateMatrixRow = (id: string, field: keyof MarketingMatrixRow, value: any) => {
    setMatrixRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const deleteMatrixRow = (id: string) => {
    setMatrixRows(prev => prev.filter(r => r.id !== id));
  };

  const handleSaveMarketingMatrix = async () => {
    if (!activePolicyStudio || matrixRows.length === 0) return;
    
    // Save relationally in policy_travel_rates table
    await savePolicyTravelRatesAction(activePolicyStudio.id, matrixRows);
    
    // Fetch updated rates
    const rates = await fetchPolicyTravelRatesAction(activePolicyStudio.id);
    setActivePolicyRates(rates || []);
    
    setShowMarketingMatrixModal(false);
    setMatrixRows([]);
    await loadData();
  };

  const persistLocalPolicy = (policy: DepartmentPolicyContainer) => {
    try {
      const localCustom: DepartmentPolicyContainer[] = JSON.parse(localStorage.getItem("custom_department_policies") || "[]");
      const idx = localCustom.findIndex((p) => p.id === policy.id);
      if (idx >= 0) {
        localCustom[idx] = policy;
      } else {
        localCustom.push(policy);
      }
      localStorage.setItem("custom_department_policies", JSON.stringify(localCustom));
    } catch (e) {}
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, dRes, zRes, bgRes] = await Promise.all([
        fetchPoliciesAction(),
        fetchOrgHierarchyAction(),
        fetchTravelZonesAction(),
        fetchBusinessGroupsAction(),
      ]);
      const deletedIds: string[] = JSON.parse(localStorage.getItem("deleted_policy_ids") || "[]");
      const localCustom: DepartmentPolicyContainer[] = JSON.parse(localStorage.getItem("custom_department_policies") || "[]");

      const combinedMap = new Map<string, DepartmentPolicyContainer>();
      // DB is the primary source of truth
      const dbPolicyIds = new Set<string>();
      (pRes || []).forEach((p: any) => {
        combinedMap.set(p.id, p);
        dbPolicyIds.add(p.id);
      });
      // localStorage only contributes items not already in DB (e.g. offline-created)
      localCustom.forEach((p: any) => {
        if (!dbPolicyIds.has(p.id)) combinedMap.set(p.id, p);
      });

      const filtered = Array.from(combinedMap.values()).filter((p: any) => !deletedIds.includes(p.id));

      // Local travel zones backup merge
      const localZones: any[] = JSON.parse(localStorage.getItem("custom_travel_zones") || "[]");
      const combinedZonesMap = new Map<string, any>();
      (zRes || []).forEach((z: any) => combinedZonesMap.set(z.id, z));
      localZones.forEach((z: any) => combinedZonesMap.set(z.id, z));

      setPolicies(filtered);
      setDepartments(dRes || []);
      setTravelZones(Array.from(combinedZonesMap.values()));
      setBusinessGroups(bgRes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) return;

    const payload = {
      id: editingZoneId || `zone-${Date.now()}`,
      name: zoneName,
      code: zoneCode || `ZONE_${Date.now()}`,
      is_active: zoneIsActive,
    };

    try {
      const localZones: any[] = JSON.parse(localStorage.getItem("custom_travel_zones") || "[]");
      const idx = localZones.findIndex((z) => z.id === payload.id);
      if (idx >= 0) localZones[idx] = payload;
      else localZones.push(payload);
      localStorage.setItem("custom_travel_zones", JSON.stringify(localZones));
    } catch (e) {}

    await saveTravelZoneAction(payload);
    setShowZoneModal(false);
    setEditingZoneId(null);
    setZoneName("");
    setZoneCode("");
    await loadData();
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المنطقة نهائياً؟")) return;
    try {
      const localZones: any[] = JSON.parse(localStorage.getItem("custom_travel_zones") || "[]");
      const updated = localZones.filter((z) => z.id !== zoneId);
      localStorage.setItem("custom_travel_zones", JSON.stringify(updated));
    } catch (e) {}

    await deleteTravelZoneAction(zoneId);
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  // Create New Department Policy Container
  const handleCreatePolicyContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyName.trim() || !newDeptId) return;

    const newContainer: DepartmentPolicyContainer = {
      id: `pol-${Date.now()}`,
      name: newPolicyName,
      department_id: newDeptId,
      description: newDescription,
      is_active: true,
      rules_json: [],
      department_ids_json: [newDeptId],
      group_ids_json: [],
      apply_to_all: 0,
    };

    persistLocalPolicy(newContainer);
    await savePolicyAction(newContainer);
    setShowAddPolicyModal(false);
    setNewPolicyName("");
    setNewDeptId("");
    setNewDescription("");
    await loadData();
  };

  const handleOpenEditPolicy = (policy: DepartmentPolicyContainer) => {
    setEditingPolicy(policy);
    setEditPolicyName(policy.name);
    setEditDescription(policy.description || "");
    setEditIsActive(policy.is_active);
    
    const isAll = policy.apply_to_all === true || policy.apply_to_all === 1;
    const hasGroups = policy.group_ids_json && policy.group_ids_json.length > 0;
    
    if (isAll) {
      setEditTargetType("all");
    } else if (hasGroups) {
      setEditTargetType("groups");
    } else {
      setEditTargetType("departments");
    }
    
    setEditDeptIds(policy.department_ids_json || (policy.department_id ? [policy.department_id] : []));
    setEditGroupIds(policy.group_ids_json || []);
    setShowEditPolicyModal(true);
  };

  const handleSaveEditPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy || !editPolicyName.trim()) return;

    const updatedDeptId = editTargetType === "departments" && editDeptIds.length > 0 ? editDeptIds[0] : "";

    const updated: DepartmentPolicyContainer = {
      ...editingPolicy,
      name: editPolicyName,
      description: editDescription,
      is_active: editIsActive,
      apply_to_all: editTargetType === "all" ? 1 : 0,
      department_ids_json: editTargetType === "departments" ? editDeptIds : [],
      group_ids_json: editTargetType === "groups" ? editGroupIds : [],
      department_id: updatedDeptId,
    };

    persistLocalPolicy(updated);
    await savePolicyAction(updated);
    
    if (activePolicyStudio?.id === updated.id) {
      setActivePolicyStudio(updated);
    }

    setShowEditPolicyModal(false);
    setEditingPolicy(null);
    await loadData();
  };

  // Add Specific Rule inside Department Policy Studio
  const handleSaveDepartmentRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePolicyStudio || !ruleName.trim()) return;

    const newRule: PolicyRuleItem = {
      id: `rule-${Date.now()}`,
      name: ruleName,
      condition_field: ruleField,
      condition_operator: ruleOperator,
      condition_value: ruleValue,
      action_type: ruleActionType,
      error_message_ar: ruleErrorMsgAr,
      is_active: true,
    };

    const updatedRules = [...(activePolicyStudio.rules_json || []), newRule];
    const updatedPolicy: DepartmentPolicyContainer = {
      ...activePolicyStudio,
      rules_json: updatedRules,
    };

    persistLocalPolicy(updatedPolicy);
    await savePolicyAction(updatedPolicy);
    setActivePolicyStudio(updatedPolicy);
    setShowAddRuleModal(false);
    setRuleName("");
    await loadData();
  };

  // Delete Rule from Department Policy Studio
  const handleDeleteDepartmentRule = async (ruleId: string) => {
    if (!activePolicyStudio) return;
    const updatedRules = (activePolicyStudio.rules_json || []).filter((r) => r.id !== ruleId);
    const updatedPolicy: DepartmentPolicyContainer = {
      ...activePolicyStudio,
      rules_json: updatedRules,
    };
    persistLocalPolicy(updatedPolicy);
    await savePolicyAction(updatedPolicy);
    setActivePolicyStudio(updatedPolicy);
    await loadData();
  };

  // Delete entire Policy Container (Permanent Deletion)
  const handleDeletePolicyContainer = async (policyId: string) => {
    if (!confirm("هل أنت متأكد من حذف لائحة الإدارة هذه بالكامل وكافة قواعدها نهائياً؟")) return;

    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem("deleted_policy_ids") || "[]");
      if (!deletedIds.includes(policyId)) {
        deletedIds.push(policyId);
        localStorage.setItem("deleted_policy_ids", JSON.stringify(deletedIds));
      }
    } catch (e) {}

    await deletePolicyAction(policyId);
    if (activePolicyStudio?.id === policyId) setActivePolicyStudio(null);
    await loadData();
  };

  return (
    <AuthGuard requiredModule="settings" allowRoles={["admin"]}>
      <div>
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">📜 Department Regulations & Travel Master Data (اللوائح وتعريف المناطق)</h1>
            <p className="page-subtitle">
              إدارة اللوائح والسياسات الخاصة بالقطاعات وتكاويد المناطق المعتمدة بالشركة (Department Policies & Master Travel Zones)
            </p>
          </div>
          {activeTab === "policies" ? (
            <button className="btn btn-primary" onClick={() => setShowAddPolicyModal(true)}>
              ＋ Add Department Policy Container
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingZoneId(null);
                setZoneName("");
                setZoneCode("");
                setShowZoneModal(true);
              }}
            >
              ＋ Add New Travel Zone (تعريف منطقة جديدة)
            </button>
          )}
        </div>

        {/* Top 2-Tab Mode Switcher */}
        <div style={{ display: "flex", gap: 10, borderBottom: "2px solid var(--color-border)", marginBottom: 20 }}>
          <button
            type="button"
            className="btn"
            style={{
              borderRadius: "8px 8px 0 0",
              borderBottom: activeTab === "policies" ? "3px solid var(--color-primary)" : "none",
              background: activeTab === "policies" ? "var(--color-surface)" : "transparent",
              fontWeight: activeTab === "policies" ? 800 : 500,
              color: activeTab === "policies" ? "var(--color-primary)" : "var(--color-text-muted)",
              padding: "10px 18px",
            }}
            onClick={() => setActiveTab("policies")}
          >
            📜 لوائح وسياسات القطاعات ({policies.length})
          </button>
          <button
            type="button"
            className="btn"
            style={{
              borderRadius: "8px 8px 0 0",
              borderBottom: activeTab === "zones" ? "3px solid var(--color-primary)" : "none",
              background: activeTab === "zones" ? "var(--color-surface)" : "transparent",
              fontWeight: activeTab === "zones" ? 800 : 500,
              color: activeTab === "zones" ? "var(--color-primary)" : "var(--color-text-muted)",
              padding: "10px 18px",
            }}
            onClick={() => setActiveTab("zones")}
          >
            📍 دليل وتكاويد المناطق المعتمدة ({travelZones.length})
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
            Loading Regulations & Travel Data...
          </div>
        ) : activeTab === "zones" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {travelZones.map((zone) => (
                <div key={zone.id} className="card" style={{ border: "1px solid var(--color-border)", borderRadius: 12 }}>
                  <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 2 }}>
                        📍 {zone.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                        كود المنطقة: <code style={{ fontWeight: 700, color: "var(--color-primary)" }}>{zone.code}</code>
                      </div>
                    </div>
                    <span className={`badge ${zone.is_active ? "success" : "muted"}`} style={{ fontSize: 10 }}>
                      {zone.is_active ? "🟢 ACTIVE" : "⚪ INACTIVE"}
                    </span>
                  </div>

                  <div className="card-body">

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 11 }}
                        onClick={() => {
                          setEditingZoneId(zone.id);
                          setZoneName(zone.name);
                          setZoneCode(zone.code);
                          setZoneIsActive(zone.is_active !== false);
                          setShowZoneModal(true);
                        }}
                      >
                        ✏️ تعديل
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 11, color: "var(--color-danger)" }}
                        onClick={() => handleDeleteZone(zone.id)}
                      >
                        🗑 حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {policies.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📜</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>No Department Policies Configured Yet</div>
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "6px 0 16px" }}>
                    انقر أعلى لإضافة لائحة وسياسة جديدة مخصصة لقطاع أو إدارة معينة بالشركة.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
                {policies.map((pol) => {
                  const dept = departments.find((d) => d.id === pol.department_id);
                  const rulesCount = (pol.rules_json || []).length;
                  
                  const isAll = pol.apply_to_all === true || pol.apply_to_all === 1;
                  const targetLabel = isAll 
                    ? "كل الموظفين 🌐" 
                    : pol.group_ids_json && pol.group_ids_json.length > 0 
                      ? `مجموعات: ${pol.group_ids_json.map(gid => businessGroups.find(g => g.id === gid)?.name).filter(Boolean).join("، ")} 👥`
                      : pol.department_ids_json && pol.department_ids_json.length > 0
                        ? `قطاعات: ${pol.department_ids_json.map(did => departments.find(d => d.id === did)?.name).filter(Boolean).join("، ")} 🏢`
                        : dept ? `${dept.name} 🏢` : pol.department_id || "كل الموظفين 🌐";

                  return (
                    <div
                      key={pol.id}
                      className="card"
                      style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-lg)",
                        transition: "all 0.15s",
                      }}
                    >
                      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 4 }}>
                            🏢 {pol.name}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                            القطاع المستهدف: <strong style={{ color: "var(--color-primary)" }}>{targetLabel}</strong>
                          </div>
                        </div>
                        <span className={`badge ${pol.is_active ? "success" : "muted"}`} style={{ fontSize: 10 }}>
                          {pol.is_active ? "🟢 ACTIVE" : "⚪ INACTIVE"}
                        </span>
                      </div>
 
                      <div className="card-body">
                        {pol.description && (
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 12, lineHeight: 1.4 }}>
                            {pol.description}
                          </div>
                        )}
 
                        <div
                          style={{
                            background: "var(--color-bg)",
                            padding: "10px 12px",
                            borderRadius: "var(--radius-md)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 14,
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)" }}>
                            📋 القواعد النشطة باللائحة:
                          </span>
                          <span className="badge primary" style={{ fontWeight: 800, fontSize: 11 }}>
                            {rulesCount} {rulesCount === 1 ? "Rule" : "Rules"}
                          </span>
                        </div>
 
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn btn-primary btn-block btn-sm"
                            style={{ fontSize: 11, fontWeight: 700, padding: "8px 0", flex: 1 }}
                            onClick={() => setActivePolicyStudio(pol)}
                          >
                            ⚙️ فتح وقواعد لائحة الإدارة ({rulesCount}) ↗
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 11, color: "var(--color-primary)", borderColor: "var(--color-border)" }}
                            onClick={() => handleOpenEditPolicy(pol)}
                            title="تعديل تفاصيل اللائحة والجهات المستهدفة"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 11, color: "var(--color-danger)", borderColor: "var(--color-border)" }}
                            onClick={() => handleDeletePolicyContainer(pol.id)}
                            title="حذف هذه اللائحة"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MODAL 1: ADD DEPARTMENT POLICY CONTAINER ── */}
        {showAddPolicyModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div className="card" style={{ width: "100%", maxWidth: 460, borderRadius: 12 }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>📜 إضافة لائحة بسياسات قطاع جديد</div>
                <button className="btn btn-outline btn-sm" onClick={() => setShowAddPolicyModal(false)}>✕</button>
              </div>

              <form onSubmit={handleCreatePolicyContainer}>
                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>القطاع / الإدارة المستهدفة *</label>
                    <select
                      className="form-control"
                      value={newDeptId}
                      onChange={(e) => {
                        const dId = e.target.value;
                        setNewDeptId(dId);
                        const selectedDeptObj = departments.find((d) => d.id === dId);
                        if (selectedDeptObj && !newPolicyName) {
                          setNewPolicyName(`لائحة وضوابط قطاع ${selectedDeptObj.name}`);
                        }
                      }}
                      required
                    >
                      <option value="">-- اختر الإدارة / القطاع --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>🏢 {d.name} ({d.code || d.id})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>عنوان / اسم اللائحة *</label>
                    <input
                      className="form-control"
                      placeholder="e.g. لائحة وقواعد قطاع المشتريات والمخازن"
                      value={newPolicyName}
                      onChange={(e) => setNewPolicyName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">وصف اللائحة ونطاق التطبيق</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="شرح مختصر للسياسات وضوابط الاعتماد الخاصة بهذه الإدارة..."
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAddPolicyModal(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary">حفظ وإنشاء اللائحة</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL 1b: EDIT DEPARTMENT POLICY CONTAINER ── */}
        {showEditPolicyModal && editingPolicy && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div className="card" style={{ width: "100%", maxWidth: 500, borderRadius: 12, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>✏️ تعديل بيانات اللائحة وجهات الاستهداف</div>
                <button className="btn btn-outline btn-sm" onClick={() => setShowEditPolicyModal(false)}>✕</button>
              </div>

              <form onSubmit={handleSaveEditPolicy} style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: 1 }}>
                  
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>اسم / عنوان اللائحة *</label>
                    <input
                      className="form-control"
                      value={editPolicyName}
                      onChange={(e) => setEditPolicyName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>شرح ووصف السياسة</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>نطاق التطبيق والاستهداف *</label>
                    <select
                      className="form-control"
                      value={editTargetType}
                      onChange={(e) => setEditTargetType(e.target.value as any)}
                    >
                      <option value="all">🌐 كل الموظفين (عموم الشركة)</option>
                      <option value="departments">🏢 قطاعات / إدارات محددة</option>
                      <option value="groups">👥 مجموعات عمل محددة (Groups)</option>
                    </select>
                  </div>

                  {editTargetType === "departments" && (
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                        <span>🏢 اختر القطاعات / الإدارات المستهدفة:</span>
                        <span style={{ fontSize: 11, cursor: "pointer", color: "var(--color-primary)" }} onClick={() => setEditDeptIds(departments.map(d => d.id))}>تحديد الكل</span>
                      </label>
                      <div style={{ maxHeight: 150, overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: 6, padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {departments.map((d) => {
                          const isChecked = editDeptIds.includes(d.id);
                          return (
                            <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditDeptIds(prev => [...prev, d.id]);
                                  } else {
                                    setEditDeptIds(prev => prev.filter(id => id !== d.id));
                                  }
                                }}
                              />
                              <span>{d.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {editTargetType === "groups" && (
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                        <span>👥 اختر مجموعات العمل المستهدفة:</span>
                        <span style={{ fontSize: 11, cursor: "pointer", color: "var(--color-primary)" }} onClick={() => setEditGroupIds(businessGroups.map(g => g.id))}>تحديد الكل</span>
                      </label>
                      <div style={{ maxHeight: 150, overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: 6, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                        {businessGroups.map((g) => {
                          const isChecked = editGroupIds.includes(g.id);
                          return (
                            <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditGroupIds(prev => [...prev, g.id]);
                                  } else {
                                    setEditGroupIds(prev => prev.filter(id => id !== g.id));
                                  }
                                }}
                              />
                              <span>{g.name} ({g.code})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <input
                      type="checkbox"
                      id="editIsActive"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <label htmlFor="editIsActive" style={{ fontWeight: 700, cursor: "pointer" }}>تمكين اللائحة والعمل بها (Active)</label>
                  </div>

                </div>

                <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowEditPolicyModal(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary">حفظ التغييرات</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── DETAIL VIEW / MODAL 2: DEPARTMENT POLICY RULES STUDIO ── */}
        {activePolicyStudio && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div className="card" style={{ width: "100%", maxWidth: 840, maxHeight: "90vh", display: "flex", flexDirection: "column", borderRadius: 12, overflow: "hidden" }}>
              
              {/* Studio Top Header */}
              <div style={{ padding: "16px 20px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: "var(--color-primary)" }}>
                    📜 استوديو قواعد لائحة: {activePolicyStudio.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    القطاع: <strong>{departments.find((d) => d.id === activePolicyStudio.department_id)?.name || activePolicyStudio.department_id}</strong>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowRuleTypePicker(true)}>
                    ＋ إضافة قاعدة لائحة جديدة
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setActivePolicyStudio(null)}>
                    ✕ إغلاق
                  </button>
                </div>
              </div>

              {/* Studio Body List of Rules */}
              <div style={{ padding: 20, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                
                {/* 1. Travel Rates Matrix (Relational) */}
                {activePolicyRates.length > 0 && (
                  <div
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-primary)",
                      borderRadius: 8,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "var(--color-primary)" }}>
                        📊 لائحة مصاريف وبدلات الانتقالات والسفر المعتمدة للقطاع (مصفوفة المناطق)
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 11, fontWeight: 700 }}
                          onClick={() => {
                            setMatrixRows(activePolicyRates);
                            setShowMarketingMatrixModal(true);
                          }}
                        >
                          ✏️ تعديل الجدول
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 11, color: "var(--color-primary)", borderColor: "var(--color-primary)" }}
                          onClick={() => {
                            resetCsvWizard();
                            setShowCsvWizard(true);
                          }}
                        >
                          📥 استيراد من CSV
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 11, color: "var(--color-danger)" }}
                          onClick={async () => {
                            if (confirm("هل أنت متأكد من حذف جدول بدلات السفر بالكامل؟")) {
                              await savePolicyTravelRatesAction(activePolicyStudio.id, []);
                              const rates = await fetchPolicyTravelRatesAction(activePolicyStudio.id);
                              setActivePolicyRates(rates || []);
                            }
                          }}
                        >
                          🗑 حذف بالكامل
                        </button>
                      </div>
                    </div>
                    <div style={{ overflowX: "auto", borderRadius: 6, border: "1px solid var(--color-border)" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: "var(--color-primary)", color: "#fff" }}>
                            <th style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700 }}>منطقة الذهاب (From)</th>
                            <th style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700 }}>منطقة العودة (To)</th>
                            <th style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700 }}>بدل الانتقال</th>
                            <th style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700 }}>الوجبة</th>
                            <th style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700 }}>وجبة بمبيت</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activePolicyRates.map((row, ri) => (
                            <tr key={row.id || ri} style={{ background: ri % 2 === 0 ? "var(--color-bg)" : "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                              <td style={{ padding: "5px 10px", fontWeight: 600 }}>{travelZones.find(z => z.id === row.zone_from_id)?.name || row.zone_from_id || "—"}</td>
                              <td style={{ padding: "5px 10px", fontWeight: 600 }}>{travelZones.find(z => z.id === row.zone_to_id)?.name || row.zone_to_id || "—"}</td>
                              <td style={{ padding: "5px 10px", textAlign: "center", color: "var(--color-primary)", fontWeight: 700 }}>{row.transport_allowance} ج.م</td>
                              <td style={{ padding: "5px 10px", textAlign: "center", color: "#059669", fontWeight: 700 }}>{row.meal_price} ج.م</td>
                              <td style={{ padding: "5px 10px", textAlign: "center", color: "#D97706", fontWeight: 700 }}>{row.meal_overnight_price} ج.م</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. Logic Rules list (Filtered to exclude matrix rules) */}
                {(() => {
                  const logicRules = activePolicyStudio.rules_json || [];
                  
                  if (activePolicyRates.length === 0 && logicRules.length === 0) {
                    return (
                      <div style={{ padding: 40, textAlign: "center", background: "var(--color-bg)", borderRadius: 10, border: "1px dashed var(--color-border)" }}>
                        <div style={{ fontSize: 32, marginBottom: 6 }}>⚙️</div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>لا توجد قواعد مخصصة مضافة في لائحة هذه الإدارة حتى الآن</div>
                        <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                          اضغط على زر "＋ إضافة قاعدة لائحة جديدة" أعلى لبدء إضافة الشروط والقيود والتحذيرات لهذه الإدارة.
                        </p>
                      </div>
                    );
                  }

                  return logicRules.map((rule, idx) => (
                    <div
                      key={rule.id || idx}
                      style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        padding: 14,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>
                          <span style={{ color: "var(--color-primary)", marginLeft: 6 }}>#{idx + 1}</span>
                          ⚙️ {rule.name}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span className={`badge ${rule.action_type === 'block_submission' ? 'urgent' : rule.action_type === 'require_approval' ? 'info' : 'warning'}`} style={{ fontSize: 10 }}>
                            {rule.action_type === 'block_submission' ? '⛔ منع التقديم' : rule.action_type === 'require_approval' ? '👥 موافقة إلزامية' : '⚠️ تنبيه فقط'}
                          </span>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: "2px 6px", fontSize: 11, color: "var(--color-danger)" }}
                            onClick={() => handleDeleteDepartmentRule(rule.id)}
                            title="حذف هذه القاعدة"
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 16, fontSize: 12, background: "var(--color-bg)", padding: "8px 12px", borderRadius: 6 }}>
                        <div>
                          <span style={{ color: "var(--color-text-muted)" }}>الشرط: </span>
                          <code style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                            IF {rule.condition_field} {rule.condition_operator} {rule.condition_value}
                          </code>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "#B45309", background: "#FEF3C7", padding: "6px 10px", borderRadius: 6, border: "1px solid #FCD34D" }}>
                        💬 نص التنبيه/الخطأ عند المخالفة: "{rule.error_message_ar}"
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: RULE TYPE PICKER ── */}
        {showRuleTypePicker && activePolicyStudio && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div className="card" style={{ width: "100%", maxWidth: 560, borderRadius: 14 }}>
              <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>🗂️ اختر نوع القاعدة التي تريد إضافتها</div>
                <button className="btn btn-outline btn-sm" onClick={() => setShowRuleTypePicker(false)}>✕</button>
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Type 1: Marketing Expenses Matrix */}
                <button
                  className="btn btn-outline"
                  style={{ textAlign: "right", padding: "16px 18px", borderRadius: 10, borderColor: "var(--color-primary)", display: "flex", flexDirection: "column", gap: 4, height: "auto" }}
                  onClick={() => { setShowRuleTypePicker(false); setMatrixRows(activePolicyRates || []); setShowMarketingMatrixModal(true); }}
                >
                  <div style={{ fontWeight: 800, fontSize: 14, color: "var(--color-primary)" }}>📊 لائحة مصاريف التنقلات (جدول المناطق)</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 400 }}>جدول يحدد بدل المواصلات والوجبة والمبيت لكل مسار (منطقة أ ← منطقة ب)</div>
                </button>

                {/* Type 2: Condition Rule */}
                <button
                  className="btn btn-outline"
                  style={{ textAlign: "right", padding: "16px 18px", borderRadius: 10, display: "flex", flexDirection: "column", gap: 4, height: "auto" }}
                  onClick={() => { setShowRuleTypePicker(false); setShowAddRuleModal(true); }}
                >
                  <div style={{ fontWeight: 800, fontSize: 14 }}>⚙️ قاعدة شرطية (Condition Rule)</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 400 }}>شرط منطقي مثل: إذا تجاوز المبلغ X → منع التقديم / طلب موافقة إضافية / تنبيه</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {showMarketingMatrixModal && activePolicyStudio && (() => {
          const filteredMatrixRows = matrixRows.filter(row => {
            if (!matrixSearch) return true;
            const query = matrixSearch.toLowerCase().trim();
            const zoneFrom = travelZones.find(z => z.id === row.zone_from_id);
            const zoneTo = travelZones.find(z => z.id === row.zone_to_id);
            return (
              (zoneFrom?.name || '').toLowerCase().includes(query) ||
              (zoneFrom?.code || '').toLowerCase().includes(query) ||
              (zoneFrom?.id || '').toLowerCase().includes(query) ||
              (zoneTo?.name || '').toLowerCase().includes(query) ||
              (zoneTo?.code || '').toLowerCase().includes(query) ||
              (zoneTo?.id || '').toLowerCase().includes(query)
            );
          });

          const MATRIX_PAGE_SIZE = 25;
          const totalMatrixPages = Math.ceil(filteredMatrixRows.length / MATRIX_PAGE_SIZE) || 1;
          const currentPage = Math.min(Math.max(1, matrixPage), totalMatrixPages);
          const visibleMatrixRows = filteredMatrixRows.slice((currentPage - 1) * MATRIX_PAGE_SIZE, currentPage * MATRIX_PAGE_SIZE);

          return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 130, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div className="card" style={{ width: "100%", maxWidth: 900, maxHeight: "92vh", display: "flex", flexDirection: "column", borderRadius: 14, overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "16px 20px", background: "var(--color-primary)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>📊 جدول بدلات التنقلات والمصاريف</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>لائحة: {activePolicyStudio.name}</div>
                  </div>
                  <button className="btn btn-outline btn-sm" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }} onClick={() => setShowMarketingMatrixModal(false)}>✕</button>
                </div>

                {/* Rule Name */}
                <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
                  <label style={{ fontWeight: 700, fontSize: 12, display: "block", marginBottom: 6 }}>اسم جدول اللائحة</label>
                  <input
                    className="form-control"
                    value={matrixRuleName}
                    onChange={e => setMatrixRuleName(e.target.value)}
                    placeholder="e.g. لائحة مصاريف التسويق والمبيعات"
                  />
                </div>

                {/* Search and Pagination Header */}
                <div style={{ padding: "10px 20px", background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexShrink: 0, direction: lang === "ar" ? "rtl" : "ltr" }}>
                  {/* Search input */}
                  <div style={{ position: "relative", flex: 1 }}>
                    <input
                      className="form-control"
                      style={{ fontSize: 12, padding: "6px 12px 6px 30px", width: "100%", textAlign: lang === "ar" ? "right" : "left" }}
                      placeholder={lang === "ar" ? "🔍 ابحث عن خط سير باسم المنطقة أو الرمز..." : "🔍 Search route by zone name or code..."}
                      value={matrixSearch}
                      onChange={e => {
                        setMatrixSearch(e.target.value);
                        setMatrixPage(1);
                      }}
                    />
                    {matrixSearch && (
                      <button 
                        onClick={() => {
                          setMatrixSearch("");
                          setMatrixPage(1);
                        }}
                        style={{ position: "absolute", left: lang === "ar" ? 10 : "auto", right: lang === "ar" ? "auto" : 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "var(--color-text-muted)" }}
                      >✕</button>
                    )}
                  </div>

                  {/* Pagination Controls */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, direction: lang === "ar" ? "rtl" : "ltr" }}>
                    <span>
                      {lang === "ar" 
                        ? <>الصفحة <strong>{currentPage}</strong> من <strong>{totalMatrixPages}</strong> (مجموع {filteredMatrixRows.length} صف)</>
                        : <>Page <strong>{currentPage}</strong> of <strong>{totalMatrixPages}</strong> ({filteredMatrixRows.length} total rows)</>}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        disabled={currentPage <= 1}
                        onClick={() => setMatrixPage(1)}
                        style={{ padding: "4px 8px" }}
                      >«</button>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        disabled={currentPage <= 1}
                        onClick={() => setMatrixPage(currentPage - 1)}
                        style={{ padding: "4px 8px" }}
                      >{lang === "ar" ? "السابق" : "Prev"}</button>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        disabled={currentPage >= totalMatrixPages}
                        onClick={() => setMatrixPage(currentPage + 1)}
                        style={{ padding: "4px 8px" }}
                      >{lang === "ar" ? "التالي" : "Next"}</button>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        disabled={currentPage >= totalMatrixPages}
                        onClick={() => setMatrixPage(totalMatrixPages)}
                        style={{ padding: "4px 8px" }}
                      >»</button>
                    </div>
                  </div>
                </div>

                {/* Table Area */}
                <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, direction: "rtl", textAlign: "right" }}>
                      <thead>
                        <tr style={{ background: "var(--color-surface)", position: "sticky", top: 0, zIndex: 10 }}>
                          <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, borderBottom: "2px solid var(--color-primary)", whiteSpace: "nowrap", minWidth: 160 }}>📍 منطقة أ (المنطلق)</th>
                          <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, borderBottom: "2px solid var(--color-primary)", whiteSpace: "nowrap", minWidth: 160 }}>📍 منطقة ب (الوصول)</th>
                          <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, borderBottom: "2px solid var(--color-primary)", whiteSpace: "nowrap", minWidth: 130, color: "var(--color-primary)" }}>🚌 بدل المواصلات (ج.م)</th>
                          <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, borderBottom: "2px solid var(--color-primary)", whiteSpace: "nowrap", minWidth: 130, color: "#059669" }}>🍽️ الوجبة (ج.م)</th>
                          <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, borderBottom: "2px solid var(--color-primary)", whiteSpace: "nowrap", minWidth: 140, color: "#D97706" }}>🌙 وجبة بمبيت (ج.م)</th>
                          <th style={{ padding: "10px 6px", textAlign: "center", borderBottom: "2px solid var(--color-primary)", width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleMatrixRows.map((row, ri) => (
                          <tr key={row.id} style={{ background: ri % 2 === 0 ? "var(--color-bg)" : "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                            {/* Zone From */}
                            <td style={{ padding: "6px 8px" }}>
                              <select
                                className="form-control"
                                style={{ fontSize: 11, padding: "4px 8px" }}
                                value={row.zone_from_id}
                                onChange={e => updateMatrixRow(row.id, 'zone_from_id', e.target.value)}
                              >
                                <option value="">اختر المنطقة...</option>
                                {travelZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                              </select>
                            </td>
                            {/* Zone To */}
                            <td style={{ padding: "6px 8px" }}>
                              <select
                                className="form-control"
                                style={{ fontSize: 11, padding: "4px 8px" }}
                                value={row.zone_to_id}
                                onChange={e => updateMatrixRow(row.id, 'zone_to_id', e.target.value)}
                              >
                                <option value="">اختر المنطقة...</option>
                                {travelZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                              </select>
                            </td>
                            {/* Transport Allowance */}
                            <td style={{ padding: "6px 8px" }}>
                              <input
                                type="number"
                                min={0}
                                className="form-control"
                                style={{ fontSize: 11, padding: "4px 8px", textAlign: "center" }}
                                value={row.transport_allowance}
                                onChange={e => updateMatrixRow(row.id, 'transport_allowance', Number(e.target.value))}
                              />
                            </td>
                            {/* Meal Price */}
                            <td style={{ padding: "6px 8px" }}>
                              <input
                                type="number"
                                min={0}
                                className="form-control"
                                style={{ fontSize: 11, padding: "4px 8px", textAlign: "center" }}
                                value={row.meal_price}
                                onChange={e => updateMatrixRow(row.id, 'meal_price', Number(e.target.value))}
                              />
                            </td>
                            {/* Overnight Meal Price */}
                            <td style={{ padding: "6px 8px" }}>
                              <input
                                type="number"
                                min={0}
                                className="form-control"
                                style={{ fontSize: 11, padding: "4px 8px", textAlign: "center" }}
                                value={row.meal_overnight_price}
                                onChange={e => updateMatrixRow(row.id, 'meal_overnight_price', Number(e.target.value))}
                              />
                            </td>
                            {/* Delete Row */}
                            <td style={{ padding: "6px 4px", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => deleteMatrixRow(row.id)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)", fontSize: 14, padding: "2px 4px" }}
                                title="حذف الصف"
                              >🗑</button>
                            </td>
                          </tr>
                        ))}
                        {filteredMatrixRows.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "var(--color-text-muted)" }}>
                              {matrixRows.length === 0 
                                ? 'لا توجد صفوف — اضغط "＋ إضافة صف" لبدء إدخال بيانات الجدول' 
                                : 'لا توجد صفوف تطابق بحثك الحالي.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "var(--color-surface)", direction: "rtl" }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" className="btn btn-outline btn-sm" onClick={addMatrixRow}>
                      ＋ إضافة صف جديد
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ color: "var(--color-primary)", borderColor: "var(--color-primary)" }}
                      onClick={() => {
                        resetCsvWizard();
                        setShowCsvWizard(true);
                      }}
                    >
                      📥 استيراد من CSV
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" className="btn btn-outline" onClick={() => setShowMarketingMatrixModal(false)}>إلغاء</button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={matrixRows.length === 0}
                      onClick={handleSaveMarketingMatrix}
                    >
                      💾 حفظ الجدول باللائحة ({matrixRows.length} صف)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── MODAL 3: ADD SPECIFIC RULE INSIDE DEPARTMENT STUDIO ── */}
        {showAddRuleModal && activePolicyStudio && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div className="card" style={{ width: "100%", maxWidth: 500, borderRadius: 12 }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>⚙️ إضافة قاعدة لائحة لـ {activePolicyStudio.name}</div>
                <button className="btn btn-outline btn-sm" onClick={() => setShowAddRuleModal(false)}>✕</button>
              </div>

              <form onSubmit={handleSaveDepartmentRule}>
                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>اسم القاعدة / الشرط باللائحة *</label>
                    <input
                      className="form-control"
                      placeholder="e.g. سقف المصروفات النقدية الاستثنائية"
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700 }}>الحقل المستهدف</label>
                      <select className="form-control" value={ruleField} onChange={(e) => setRuleField(e.target.value)}>
                        <option value="form.amount">💰 قيمة الميزانية/المبلغ (form.amount)</option>
                        <option value="ticket.priority">🚩 درجة أولوية التذكرة (ticket.priority)</option>
                        <option value="ticket.category_id">🏷️ تصنيف الخدمة (category)</option>
                        <option value="form.attachment">📎 وجود مرفقات (attachment)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700 }}>المعامل والشرط</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <select className="form-control" style={{ width: 70 }} value={ruleOperator} onChange={(e) => setRuleOperator(e.target.value)}>
                          <option value=">">&gt;</option>
                          <option value=">=">&gt;=</option>
                          <option value="==">==</option>
                          <option value="!=">!=</option>
                        </select>
                        <input
                          className="form-control"
                          placeholder="50000"
                          value={ruleValue}
                          onChange={(e) => setRuleValue(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>نوع الإجراء عند المخالفة (Enforcement Action)</label>
                    <select className="form-control" value={ruleActionType} onChange={(e) => setRuleActionType(e.target.value as any)}>
                      <option value="block_submission">⛔ منع التقديم وإظهار خطأ قاطع (Block Submission)</option>
                      <option value="warning_banner">⚠️ إظهار شريط تنبيهي وتحذيري للعميل (Warning Alert)</option>
                      <option value="require_approval">👥 إلزام موافقة واعتماد مدير الإدارة (Require Approval)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>نص الخطأ أو التنبيه باللغة العربية *</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={ruleErrorMsgAr}
                      onChange={(e) => setRuleErrorMsgAr(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAddRuleModal(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary">حفظ القاعدة باللائحة</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL 4: ADD / EDIT TRAVEL ZONE MASTER DATA ── */}
        {showZoneModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div className="card" style={{ width: "100%", maxWidth: 460, borderRadius: 12 }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>
                  📍 {editingZoneId ? "تعديل بيانات المنطقة المعتمدة" : "إضافة وتعريف منطقة جديدة"}
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setShowZoneModal(false)}>✕</button>
              </div>

              <form onSubmit={handleSaveZone}>
                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>اسم المنطقة / الفرع / الموقع *</label>
                    <input
                      className="form-control"
                      placeholder="e.g. فرع أسيوط والمخازن الإقليمية"
                      value={zoneName}
                      onChange={(e) => setZoneName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>كود المنطقة (Code)</label>
                    <input
                      className="form-control"
                      placeholder="e.g. ZONE_ASYUT"
                      value={zoneCode}
                      onChange={(e) => setZoneCode(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowZoneModal(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary">حفظ المنطقة بالدليل</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal 4: CSV Import Wizard */}
        {showCsvWizard && (
          <div className="modal-backdrop" style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 1100, padding: 20 }}>
            <div className="modal-content" style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", maxHeight: "90vh", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
              
              {/* Modal Header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-primary)", color: "#fff", borderTopLeftRadius: "var(--radius-lg)", borderTopRightRadius: "var(--radius-lg)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                  📥 معالج استيراد بدلات السفر من CSV
                </div>
                <button className="btn btn-outline btn-sm" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }} onClick={() => setShowCsvWizard(false)}>✕</button>
              </div>

              {/* Progress Steps Header */}
              <div style={{ display: "flex", background: "var(--color-bg)", padding: "12px 20px", borderBottom: "1px solid var(--color-border)", fontSize: 12, justifyContent: "space-around" }}>
                <span style={{ fontWeight: csvWizardStep === 1 ? 800 : 400, color: csvWizardStep === 1 ? "var(--color-primary)" : "var(--color-text-secondary)" }}>1. رفع الملف</span>
                <span>➔</span>
                <span style={{ fontWeight: csvWizardStep === 2 ? 800 : 400, color: csvWizardStep === 2 ? "var(--color-primary)" : "var(--color-text-secondary)" }}>2. مطابقة الأعمدة</span>
                <span>➔</span>
                <span style={{ fontWeight: csvWizardStep === 3 ? 800 : 400, color: csvWizardStep === 3 ? "var(--color-primary)" : "var(--color-text-secondary)" }}>3. حل التعارضات والحفظ</span>
              </div>

              {/* Modal Body */}
              <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
                
                {/* STEP 1: UPLOAD FILE */}
                {csvWizardStep === 1 && (
                  <div style={{ textAlign: "center", padding: "30px 10px" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>اختر ملف CSV لاستيراد مصفوفة أسعار السفر</h3>
                    <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 20 }}>
                      يجب أن يحتوي الملف على خطوط السير (منطقة الذهاب والعودة) والبدلات المراد استيرادها.
                    </p>
                    <label className="btn btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
                      📁 اختر الملف من جهازك
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              parseCSV(event.target?.result as string);
                            };
                            reader.readAsText(file, "UTF-8");
                          }
                        }}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                )}

                {/* STEP 2: COLUMN MAPPING */}
                {csvWizardStep === 2 && (
                  <div>
                    <div style={{ background: "var(--color-bg)", padding: 12, borderRadius: 6, marginBottom: 16, border: "1px solid var(--color-border)", fontSize: 11 }}>
                      💡 تم قراءة <strong>{csvRows.length}</strong> صفاً من البيانات. يرجى ربط أعمدة قاعدة البيانات بالأعمدة المقابلة لها في ملفك:
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      
                      {/* From Zone */}
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 700 }}>📍 منطقة الذهاب (From Zone) *</label>
                        <select
                          className="form-control"
                          value={csvMappings.zone_from_id}
                          onChange={(e) => setCsvMappings(prev => ({ ...prev, zone_from_id: Number(e.target.value) }))}
                        >
                          <option value={-1}>-- اختر العمود المناسب من الملف --</option>
                          {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                        </select>
                      </div>

                      {/* To Zone */}
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 700 }}>📍 منطقة العودة (To Zone) *</label>
                        <select
                          className="form-control"
                          value={csvMappings.zone_to_id}
                          onChange={(e) => setCsvMappings(prev => ({ ...prev, zone_to_id: Number(e.target.value) }))}
                        >
                          <option value={-1}>-- اختر العمود المناسب من الملف --</option>
                          {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                        </select>
                      </div>

                      {/* Transport Allowance */}
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 700 }}>🚌 بدل الانتقال (Transport Allowance)</label>
                        <select
                          className="form-control"
                          value={csvMappings.transport_allowance}
                          onChange={(e) => setCsvMappings(prev => ({ ...prev, transport_allowance: Number(e.target.value) }))}
                        >
                          <option value={-1}>-- لا يوجد (قيمة صفرية) --</option>
                          {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                        </select>
                      </div>

                      {/* Meal Price */}
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 700 }}>🍽️ بدل الوجبة العادية (Meal Price)</label>
                        <select
                          className="form-control"
                          value={csvMappings.meal_price}
                          onChange={(e) => setCsvMappings(prev => ({ ...prev, meal_price: Number(e.target.value) }))}
                        >
                          <option value={-1}>-- لا يوجد (قيمة صفرية) --</option>
                          {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                        </select>
                      </div>

                      {/* Meal Overnight Price */}
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 700 }}>🌙 بدل وجبة المبيت (Overnight Meal Price)</label>
                        <select
                          className="form-control"
                          value={csvMappings.meal_overnight_price}
                          onChange={(e) => setCsvMappings(prev => ({ ...prev, meal_overnight_price: Number(e.target.value) }))}
                        >
                          <option value={-1}>-- لا يوجد (قيمة صفرية) --</option>
                          {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                        </select>
                      </div>

                    </div>
                  </div>
                )}

                {/* STEP 3: CONFLICT CHECK & SAVE */}
                {csvWizardStep === 3 && (
                  <div>
                    {csvConflictsCount > 0 ? (
                      <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", color: "#B45309", padding: 14, borderRadius: 6, marginBottom: 16, fontSize: 12 }}>
                        ⚠️ تم العثور على <strong>{csvConflictsCount}</strong> خط سير (من/إلى) مكرر وموجود بالفعل في اللائحة الحالية للقسم.
                      </div>
                    ) : (
                      <div style={{ background: "#D1FAE5", border: "1px solid #10B981", color: "#065F46", padding: 14, borderRadius: 6, marginBottom: 16, fontSize: 12 }}>
                        ✅ جميع خطوط السير الواردة في الملف جديدة كلياً وسيتم إضافتها مباشرة.
                      </div>
                    )}

                    {csvSkippedRows.length > 0 && (
                      <div style={{ background: "#FEE2E2", border: "1px solid #EF4444", color: "#991B1B", padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 11 }}>
                        <strong style={{ display: "block", marginBottom: 6 }}>⚠️ تم تجاهل {csvSkippedRows.length} صفوف لعدم التعرف على مناطقها في دليل المناطق:</strong>
                        <div style={{ maxHeight: 80, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                          {csvSkippedRows.map((msg, i) => (
                            <div key={i}>• {msg}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {csvConflictsCount > 0 && (
                      <div className="form-group" style={{ marginBottom: 16 }}>
                        <label className="form-label" style={{ fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 8 }}>
                          ❓ كيف ترغب في التعامل مع خطوط السير المكررة؟
                        </label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          
                          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 12 }}>
                            <input
                              type="radio"
                              name="conflictResolution"
                              value="update"
                              checked={csvConflictResolution === 'update'}
                              onChange={() => setCsvConflictResolution('update')}
                              style={{ marginTop: 3 }}
                            />
                            <div>
                              <strong>تحديث البدلات (تحديث المكرر)</strong>
                              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>تعديل وتحديث أسعار البدلات الحالية بالقيم الجديدة الواردة في ملف الـ CSV.</div>
                            </div>
                          </label>

                          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 12 }}>
                            <input
                              type="radio"
                              name="conflictResolution"
                              value="keep"
                              checked={csvConflictResolution === 'keep'}
                              onChange={() => setCsvConflictResolution('keep')}
                              style={{ marginTop: 3 }}
                            />
                            <div>
                              <strong>تخطي الاستيراد (الاحتفاظ بالقديم)</strong>
                              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>ترك البدلات القديمة كما هي في النظام دون تغيير، واستيراد خطوط السير الجديدة فقط.</div>
                            </div>
                          </label>

                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                      سيتم مراجعة ومطابقة الأسماء للمناطق في الملف تلقائياً. تأكد من أن أسماء المناطق في ملف CSV متطابقة تماماً مع دليل المناطق المعتمد في الشركة.
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div style={{ padding: "14px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                
                {/* Back button */}
                {csvWizardStep > 1 ? (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setCsvWizardStep(prev => (prev - 1) as any)}
                  >
                    السابق
                  </button>
                ) : <div />}

                {/* Confirm/Next Button */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowCsvWizard(false)}>
                    إلغاء
                  </button>
                  
                  {csvWizardStep === 2 && (
                    <button type="button" className="btn btn-primary" onClick={analyzeCsvConflicts}>
                      التحقق والاستمرار ➔
                    </button>
                  )}

                  {csvWizardStep === 3 && (
                    <button type="button" className="btn btn-primary" onClick={executeCsvImport}>
                      بدء الاستيراد والحفظ ✓
                    </button>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
