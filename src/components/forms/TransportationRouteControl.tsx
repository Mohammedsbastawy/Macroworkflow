"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export interface TravelLimits {
  meal?: number;
  coffee?: number;
  parking?: number;
  correspondence?: number;
  ticketCost?: number;
}

export interface TravelPackageData {
  mode: "travel_package";
  fromDate: string;
  toDate: string;
  isOvernight: boolean;
  isMeeting: boolean;
  fromZone: string;
  toZone: string;
  hasTicket: boolean;
  ticketCost: number;
  ticketFileId?: string;
  ticketFileName?: string;
  calculatedCost: number;
  calculatedMeals: number;
  mealCost: number;
  coffeeCost: number;
  correspondenceCost: number;
  parkingCost: number;
  teamMeetingCost: number;
  totalCost: number;
  summaryText: string;
  additionalNotes?: string;
  additionalAttachmentFileId?: string;
  additionalAttachmentFileName?: string;
  limitExceededItems?: string[];
}

interface TransportationRouteControlProps {
  value?: any;
  onChange: (val: any) => void;
  readOnly?: boolean;
  limits?: TravelLimits;
}

export function TransportationRouteControl({
  value,
  onChange,
  readOnly = false,
  limits,
}: TransportationRouteControlProps) {
  const lim = limits || {};
  const { lang } = useLanguage();
  // Master Data States
  const [masterZones, setMasterZones] = useState<any[]>([]);
  const [travelRates, setTravelRates] = useState<any[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // Constraint Validation Ref
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Load zones and travel rates dynamically
  const loadRatesData = () => {
    const savedUserId = typeof window !== "undefined" ? (localStorage.getItem("simulated_user_id") || "user-admin") : "user-admin";
    Promise.all([
      import("@/app/actions/workflowActions").then(m => m.fetchTravelZonesAction()),
      import("@/app/actions/workflowActions").then(m => m.fetchPolicyTravelRatesAction(undefined, savedUserId))
    ]).then(([zones, rates]) => {
      if (zones) setMasterZones(zones);
      if (rates) setTravelRates(rates);
      setLoadingMaster(false);
    }).catch(() => {
      setLoadingMaster(false);
    });
  };

  useEffect(() => {
    loadRatesData();
    const handleSwitch = () => loadRatesData();
    window.addEventListener("user-simulated-switch", handleSwitch);
    return () => window.removeEventListener("user-simulated-switch", handleSwitch);
  }, []);

  // Parse initial value or set defaults
  const parsedValue: TravelPackageData = (() => {
    if (typeof value === "string" && value.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(value);
        if (parsed.mode === "travel_package") return parsed;
      } catch (e) {}
    }
    // Default fallback structure
    return {
      mode: "travel_package",
      fromDate: new Date().toISOString().split("T")[0],
      toDate: "",
      isOvernight: false,
      isMeeting: false,
      fromZone: "",
      toZone: "",
hasTicket: false,
      ticketCost: 0,
      calculatedCost: 0,
      calculatedMeals: 0,
      mealCost: 0,
      coffeeCost: 0,
      correspondenceCost: 0,
      parkingCost: 0,
      teamMeetingCost: 0,
      totalCost: 0,
      summaryText: "",
      additionalNotes: "",
      additionalAttachmentFileId: "",
      additionalAttachmentFileName: "",
    };
  })();

  // Component States
  const [fromDate, setFromDate] = useState(parsedValue.fromDate);
  const [toDate, setToDate] = useState(parsedValue.toDate || "");
  const [isOvernight, setIsOvernight] = useState(parsedValue.isOvernight);
  const [isMeeting, setIsMeeting] = useState(parsedValue.isMeeting);
  const [fromZone, setFromZone] = useState(parsedValue.fromZone);
  const [toZone, setToZone] = useState(parsedValue.toZone);
  const [hasTicket, setHasTicket] = useState(parsedValue.hasTicket);
  const [ticketCost, setTicketCost] = useState(parsedValue.ticketCost);
  const [ticketFileId, setTicketFileId] = useState(parsedValue.ticketFileId);
  const [ticketFileName, setTicketFileName] = useState(parsedValue.ticketFileName);
  const [isUploading, setIsUploading] = useState(false);

// Extra Expenses
  const [mealCost, setMealCost] = useState(parsedValue.mealCost || 0);
  const [coffeeCost, setCoffeeCost] = useState(parsedValue.coffeeCost || 0);
  const [correspondenceCost, setCorrespondenceCost] = useState(parsedValue.correspondenceCost);
  const [parkingCost, setParkingCost] = useState(parsedValue.parkingCost);
  const [teamMeetingCost, setTeamMeetingCost] = useState(parsedValue.teamMeetingCost);

  // Additional Fields
  const [additionalNotes, setAdditionalNotes] = useState(parsedValue.additionalNotes || "");
  const [additionalAttachmentFileId, setAdditionalAttachmentFileId] = useState(parsedValue.additionalAttachmentFileId || "");
  const [additionalAttachmentFileName, setAdditionalAttachmentFileName] = useState(parsedValue.additionalAttachmentFileName || "");
  const [isUploadingAdditional, setIsUploadingAdditional] = useState(false);

  // Calculation outputs
  const [policyTransportCost, setPolicyTransportCost] = useState(0);
  const [hasMatchingPolicy, setHasMatchingPolicy] = useState(true);

  // Validate and adjust toDate when fromDate or isOvernight changes
  useEffect(() => {
    if (isOvernight) {
      const nextDay = new Date(fromDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split("T")[0];

      if (!toDate || toDate <= fromDate) {
        setToDate(nextDayStr);
      }
    } else {
      setToDate("");
    }
  }, [fromDate, isOvernight]);

  // Find policy matrix rows when zones change
  useEffect(() => {
    if (!fromZone || !toZone || travelRates.length === 0 || masterZones.length === 0) return;

    const fromZoneId = masterZones.find(z => z.name?.trim().toLowerCase() === fromZone.trim().toLowerCase())?.id;
    const toZoneId = masterZones.find(z => z.name?.trim().toLowerCase() === toZone.trim().toLowerCase())?.id;

    if (!fromZoneId || !toZoneId) {
      setPolicyTransportCost(0);
      setHasMatchingPolicy(false);
      return;
    }

    const match = travelRates.find(
      (r: any) => r.zone_from_id === fromZoneId && r.zone_to_id === toZoneId
    );

    if (match) {
      setPolicyTransportCost(Number(match.transport_allowance || 0));
      setHasMatchingPolicy(true);
    } else {
      setPolicyTransportCost(0);
      setHasMatchingPolicy(false);
    }
  }, [fromZone, toZone, travelRates, masterZones]);

  // Handle HTML5 Constraint Validation
  const routeIncomplete = (!!fromZone && !toZone) || (!fromZone && !!toZone);
  useEffect(() => {
    if (!hiddenInputRef.current) return;
    const isInvalid = (fromZone && toZone && !hasMatchingPolicy && !hasTicket) || routeIncomplete;
    if (isInvalid) {
      hiddenInputRef.current.setCustomValidity(
        routeIncomplete
          ? "خطأ: يجب تحديد كل من منطقة الذهاب ومنطقة الوصول معًا إذا اخترت إحداهما."
          : "خطأ: خط السير المحدد غير مدرج في السياسات المعتمدة للشركة."
      );
    } else {
      hiddenInputRef.current.setCustomValidity("");
    }
  }, [fromZone, toZone, hasMatchingPolicy, hasTicket, routeIncomplete]);

  // Perform overall calculations
  const calculateDays = () => {
    if (!isOvernight || !toDate || !fromDate) return 1;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime <= 0) return 1;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const daysCount = calculateDays();

  // Calculated Transportation Cost
  const calculatedTransportCost = hasTicket ? Number(ticketCost) : policyTransportCost;

  const grandTotalCost =
    calculatedTransportCost +
    Number(mealCost || 0) +
    Number(coffeeCost || 0) +
    Number(correspondenceCost) +
    Number(parkingCost) +
    Number(teamMeetingCost);

  // Per-item expense limit validation (limits defined by the form builder admin).
  // We only tell the user that a limit was exceeded — never the actual limit value.
  const exceededItems: { key: string; label: string }[] = [];
  const checkExceeded = (key: keyof TravelLimits, label: string, val: number) => {
    const l = lim[key];
    if (typeof l === "number" && l > 0 && val > l) exceededItems.push({ key, label });
  };
  checkExceeded("meal", "🍔 الوجبات", Number(mealCost || 0));
  checkExceeded("coffee", "☕ القهوة", Number(coffeeCost || 0));
  checkExceeded("parking", "🅿️ الباركينج", Number(parkingCost || 0));
  checkExceeded("correspondence", "✉️ المراسلات", Number(correspondenceCost || 0));
  if (hasTicket) checkExceeded("ticketCost", "🎟️ تذكرة السفر", Number(ticketCost || 0));
  const hasLimitExceeded = exceededItems.length > 0;
  const isOverLimit = (key: keyof TravelLimits, val: number) => {
    const l = lim[key];
    return typeof l === "number" && l > 0 && val > l;
  };

  // File Upload helper
  const uploadTodatabase = async (file: File): Promise<{ id: string; filename: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/files", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return {
      id: data.data.id,
      filename: data.data.filename_download || file.name,
    };
  };

  // Ticket File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const uploaded = await uploadTodatabase(file);
      setTicketFileId(uploaded.id);
      setTicketFileName(uploaded.filename);
    } catch (err) {
      alert("فشل رفع الملف، يرجى المحاولة مرة أخرى.");
    } finally {
      setIsUploading(false);
    }
  };

  // Additional File Upload
  const handleAdditionalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingAdditional(true);
    try {
      const uploaded = await uploadTodatabase(file);
      setAdditionalAttachmentFileId(uploaded.id);
      setAdditionalAttachmentFileName(uploaded.filename);
    } catch (err) {
      alert("فشل رفع المرفق الإضافي، يرجى المحاولة مرة أخرى.");
    } finally {
      setIsUploadingAdditional(false);
    }
  };

  // Emit state updates to parent form
  useEffect(() => {
    if (readOnly) return;

    const summaryText = isOvernight
      ? `🚗 طلب انتقال مبيت: من [${fromZone || "—"}] إلى [${toZone || "—"}] لـ (${daysCount} أيام) | الإجمالي: ${grandTotalCost} ج.م`
      : `📍 طلب انتقال عادي: من [${fromZone || "—"}] إلى [${toZone || "—"}] | الإجمالي: ${grandTotalCost} ج.م`;

    const payload: TravelPackageData = {
      mode: "travel_package",
      fromDate,
      toDate,
      isOvernight,
      isMeeting,
      fromZone,
      toZone,
      hasTicket,
      ticketCost: Number(ticketCost),
      ticketFileId,
      ticketFileName,
      calculatedCost: calculatedTransportCost,
      calculatedMeals: Number(mealCost || 0),
      mealCost: Number(mealCost || 0),
      coffeeCost: Number(coffeeCost || 0),
      correspondenceCost: Number(correspondenceCost),
      parkingCost: Number(parkingCost),
      teamMeetingCost: Number(teamMeetingCost),
      totalCost: grandTotalCost,
      summaryText,
      additionalNotes,
      additionalAttachmentFileId,
      additionalAttachmentFileName,
      limitExceededItems: exceededItems.map(e => e.key),
    };

    onChange(JSON.stringify(payload));
  }, [
    fromDate,
    toDate,
    isOvernight,
    isMeeting,
    fromZone,
    toZone,
    hasTicket,
    ticketCost,
    ticketFileId,
    ticketFileName,
    mealCost,
    coffeeCost,
    correspondenceCost,
    parkingCost,
    teamMeetingCost,
    grandTotalCost,
    hasLimitExceeded,
    additionalNotes,
    additionalAttachmentFileId,
    additionalAttachmentFileName,
    readOnly,
  ]);

  if (loadingMaster) {
    return <div style={{ fontSize: 13, color: "var(--color-text-muted)", padding: 8 }}>جارٍ تحميل بيانات اللائحة والمناطق...</div>;
  }

  // Calculate To Date Minimum Date Limit
  const getToDateMin = () => {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  return (
    <div
      style={{
        background: "var(--color-bg)",
        border: "1px solid var(--color-primary)",
        borderRadius: "var(--radius-lg)",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Constraint validator input */}
      <input
        ref={hiddenInputRef}
        type="text"
        style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }}
        required={!!(fromZone && toZone)}
        value={(fromZone && toZone && !hasMatchingPolicy && !hasTicket) ? "" : "valid"}
        readOnly
      />

      {/* Title Header */}
      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-primary)", display: "flex", alignItems: "center", gap: 6 }}>
        <span>💳</span> {lang === "ar" ? "المصاريف" : "Expenses"}
      </div>

      {/* Row 1: Dates & Overnight Toggle */}
      <div className="form-grid-3" style={{ gap: 14 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700 }}>
            {lang === "ar" ? "📅 تاريخ الذهاب *" : "📅 Departure Date *"}
          </label>
          <input
            type="date"
            className="form-control"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            disabled={readOnly}
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700 }}>
            {lang === "ar" ? "🏨 خيار المبيت" : "🏨 Overnight Stay"}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 38 }}>
            <input
              type="checkbox"
              id="overnight_check"
              style={{ width: 18, height: 18, cursor: "pointer" }}
              checked={isOvernight}
              onChange={(e) => setIsOvernight(e.target.checked)}
              disabled={readOnly}
            />
            <label htmlFor="overnight_check" style={{ fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {lang === "ar" ? "هل يوجد مبيت؟" : "Is Overnight Stay?"}
            </label>
          </div>
        </div>

        {isOvernight && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              {lang === "ar" ? "📅 تاريخ العودة *" : "📅 Return Date *"}
            </label>
            <input
              type="date"
              className="form-control"
              value={toDate}
              min={getToDateMin()}
              onChange={(e) => setToDate(e.target.value)}
              disabled={readOnly}
              required
            />
          </div>
        )}
      </div>

      {/* Row 2: Origin & Destination Selector Dropdowns */}
      <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
<label className="form-label" style={{ fontWeight: 700 }}>
            {lang === "ar" ? "📍 من منطقة (اختياري)" : "📍 Origin Zone (optional)"}
          </label>
          <select
            className="form-control"
            value={fromZone}
            onChange={(e) => setFromZone(e.target.value)}
            disabled={readOnly}
          >
            <option value="">{lang === "ar" ? "-- اختر منطقة الذهاب --" : "-- Select Origin Zone --"}</option>
            {masterZones.map((z) => (
              <option key={z.id} value={z.name}>
                {z.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
<label className="form-label" style={{ fontWeight: 700 }}>
            {lang === "ar" ? "🏢 إلى منطقة (اختياري)" : "🏢 Destination Zone (optional)"}
          </label>
          <select
            className="form-control"
            value={toZone}
            onChange={(e) => setToZone(e.target.value)}
            disabled={readOnly}
          >
            <option value="">{lang === "ar" ? "-- اختر منطقة العودة --" : "-- Select Destination Zone --"}</option>
            {masterZones.map((z) => (
              <option key={z.id} value={z.name}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Route pairing warning: Origin & Destination must be chosen together */}
      {routeIncomplete && (
        <div
          style={{
            padding: "10px 14px",
            background: "#FEF3C7",
            border: "2px solid #F59E0B",
            borderRadius: 8,
            color: "#92400E",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>⚠️</span>
          {lang === "ar"
            ? "يجب تحديد كل من منطقة الذهاب ومنطقة الوصول معًا — لا يمكن اختيار واحدة فقط."
            : "Origin and Destination zones must be selected together — you cannot choose only one."}
        </div>
      )}

      {/* Critical Policy Error Box if not matched and no ticket is present */}
      {fromZone && toZone && !hasMatchingPolicy && !hasTicket && (
        <div
          style={{
            padding: "12px 14px",
            background: "#FEE2E2",
            border: "2px solid #EF4444",
            borderRadius: 8,
            fontSize: 13,
            color: "#991B1B",
            fontWeight: 800,
            display: "flex",
            flexDirection: "column",
            gap: 4
          }}
        >
          <span>⚠️ {lang === "ar" ? "خطأ في مطابقة اللائحة:" : "Policy Match Error:"}</span>
          <span style={{ fontSize: 11, fontWeight: 600 }}>
            {lang === "ar"
              ? `لا توجد سياسة أو لائحة مصاريف معتمدة تربط بين منطقة الذهاب [${fromZone}] ومنطقة العودة [${toZone}] في النظام.`
              : `No approved travel rate policy connects Origin [${fromZone}] and Destination [${toZone}].`}
          </span>
        </div>
      )}

      {/* Row 3: Meeting Toggle & Ticket Info (Stacked Vertically for Mobile Readability) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background: "var(--color-surface)",
          padding: 14,
          borderRadius: 8,
          border: "1px solid var(--color-border)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="meeting_check"
              style={{ width: 20, height: 20, cursor: "pointer", flexShrink: 0 }}
              checked={isMeeting}
              onChange={(e) => setIsMeeting(e.target.checked)}
              disabled={readOnly}
            />
            <label htmlFor="meeting_check" style={{ fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              👥 {lang === "ar" ? "هل يوجد اجتماع عمل؟" : "Is Business Meeting?"}
            </label>
          </div>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)", paddingLeft: 30 }}>
            {lang === "ar" ? "* في السفر غير المبيت، تفعيل الاجتماع يلغي تكلفة الوجبات تماماً." : "* For day trips, business meeting option waives meal allowances."}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 10, borderTop: "1px dashed var(--color-border-light)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="ticket_check"
              style={{ width: 20, height: 20, cursor: "pointer", flexShrink: 0 }}
              checked={hasTicket}
              onChange={(e) => setHasTicket(e.target.checked)}
              disabled={readOnly}
            />
            <label htmlFor="ticket_check" style={{ fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              🎫 {lang === "ar" ? "هل يوجد تذكرة سفر؟" : "Has Travel Ticket?"}
            </label>
          </div>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)", paddingLeft: 30 }}>
            {lang === "ar" ? "* إدخال تكلفة التذكرة المباشرة وإرفاق صورتها بدلاً من أسعار الكيلومترات أو اللائحة." : "* Enter ticket cost directly and upload invoice file instead of distance rates."}
          </span>
        </div>
      </div>

      {/* Row 4: Ticket manual details (shown only if hasTicket is true) */}
      {hasTicket && (
        <div
          className="form-grid-2"
          style={{
            gap: 14,
            background: "var(--color-surface)",
            padding: 14,
            borderRadius: 8,
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              {lang === "ar" ? "💵 تكلفة تذكرة الانتقال الفعلي (ج.م) *" : "💵 Ticket Cost (EGP) *"}
            </label>
            <input
              type="number"
              className="form-control"
              style={
                isOverLimit("ticketCost", Number(ticketCost || 0))
                  ? { fontWeight: 800, color: "var(--color-primary)", borderColor: "#EF4444", borderWidth: 2 }
                  : { fontWeight: 800, color: "var(--color-primary)" }
              }
              placeholder="0.00"
              value={ticketCost || ""}
              onChange={(e) => setTicketCost(Number(e.target.value))}
              disabled={readOnly}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              {lang === "ar" ? "📎 إرفاق تذكرة السفر *" : "📎 Attach Travel Ticket *"}
            </label>
            {!readOnly ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  type="file"
                  className="form-control"
                  onChange={handleFileUpload}
                  disabled={readOnly || isUploading}
                />
                {isUploading && <span style={{ fontSize: 11, color: "var(--color-primary)" }}>{lang === "ar" ? "جارٍ رفع الملف..." : "Uploading file..."}</span>}
                {ticketFileName && (
                  <span style={{ fontSize: 12, color: "#10B981", fontWeight: 700 }}>
                    ✅ {lang === "ar" ? `تم إرفاق: ${ticketFileName}` : `Attached: ${ticketFileName}`}
                  </span>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {ticketFileId ? (
                  <a
                    href={`/api/files/${ticketFileId}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--color-primary)", textDecoration: "underline" }}
                  >
                    📄 {lang === "ar" ? "تحميل التذكرة المرفقة" : "Download Ticket Attachment"}
                  </a>
                ) : (
                  lang === "ar" ? "لم يتم إرفاق تذكرة." : "No ticket attached."
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Row 5: Extra Expenses */}
      <div
        style={{
          background: "var(--color-surface)",
          padding: 14,
          borderRadius: 8,
          border: "1px solid var(--color-border)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12, color: "var(--color-primary)" }}>
          💵 {lang === "ar" ? "مصاريف إضافية أخرى (بالجنية المصري)" : "Extra Expenses (EGP)"}
        </div>
        <div className="form-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
              ✉️ {lang === "ar" ? "مراسلات (ج.م)" : "Correspondence (EGP)"}
            </label>
            <input
              type="number"
              className="form-control"
              style={isOverLimit("correspondence", Number(correspondenceCost || 0)) ? { borderColor: "#EF4444", borderWidth: 2, fontWeight: 800 } : undefined}
              placeholder="0.00"
              value={correspondenceCost || ""}
              onChange={(e) => setCorrespondenceCost(Number(e.target.value))}
              disabled={readOnly}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
              🅿️ {lang === "ar" ? "باركينج (ج.م)" : "Parking (EGP)"}
            </label>
            <input
              type="number"
              className="form-control"
              style={isOverLimit("parking", Number(parkingCost || 0)) ? { borderColor: "#EF4444", borderWidth: 2, fontWeight: 800 } : undefined}
              placeholder="0.00"
              value={parkingCost || ""}
              onChange={(e) => setParkingCost(Number(e.target.value))}
              disabled={readOnly}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
              🍔 {lang === "ar" ? "وجبات (ج.م)" : "Meals (EGP)"}
            </label>
            <input
              type="number"
              className="form-control"
              style={isOverLimit("meal", Number(mealCost || 0)) ? { borderColor: "#EF4444", borderWidth: 2, fontWeight: 800 } : undefined}
              placeholder="0.00"
              value={mealCost || ""}
              onChange={(e) => setMealCost(Number(e.target.value))}
              disabled={readOnly}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
              ☕ {lang === "ar" ? "قهوة (ج.م)" : "Coffee (EGP)"}
            </label>
            <input
              type="number"
              className="form-control"
              style={isOverLimit("coffee", Number(coffeeCost || 0)) ? { borderColor: "#EF4444", borderWidth: 2, fontWeight: 800 } : undefined}
              placeholder="0.00"
              value={coffeeCost || ""}
              onChange={(e) => setCoffeeCost(Number(e.target.value))}
              disabled={readOnly}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
              👥 {lang === "ar" ? "اجتماع فريق (ج.م)" : "Team Meeting (EGP)"}
            </label>
            <input
              type="number"
              className="form-control"
              placeholder="0.00"
              value={teamMeetingCost || ""}
              onChange={(e) => setTeamMeetingCost(Number(e.target.value))}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      {/* Limit exceeded alert (value of the limit is intentionally hidden) */}
      {hasLimitExceeded && (
        <div
          style={{
            padding: "12px 14px",
            background: "#FEF2F2",
            border: "2px solid #EF4444",
            borderRadius: 8,
            color: "#991B1B",
            fontSize: 13,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            {lang === "ar"
              ? "تم تجاوز الحد المسموح لأحد البنود المالية التالية — يرجى مراجعة القيمة المدخلة: "
              : "Expense limit exceeded for one or more items — please review the entered amounts: "}
            <span style={{ fontWeight: 600 }}>
              {exceededItems.map(e => e.label).join(lang === "ar" ? "، " : ", ")}
            </span>
          </div>
        </div>
      )}

      {/* Row 6: Additional Notes & Attachment */}
      <div
        className="form-grid-2"
        style={{
          background: "var(--color-surface)",
          padding: 14,
          borderRadius: 8,
          border: "1px solid var(--color-border)",
          gap: 14,
        }}
      >
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700 }}>
            📝 {lang === "ar" ? "ملاحظات إضافية" : "Additional Notes"}
          </label>
          <textarea
            className="form-control"
            rows={2}
            placeholder={lang === "ar" ? "اكتب أي تفاصيل أو ملاحظات إضافية هنا..." : "Enter any extra details or notes..."}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            disabled={readOnly}
            style={{ fontSize: 12 }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700 }}>
            📎 {lang === "ar" ? "مرفق إضافي" : "Extra Attachment"}
          </label>
          {!readOnly ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                type="file"
                className="form-control"
                onChange={handleAdditionalFileUpload}
                disabled={readOnly || isUploadingAdditional}
              />
              {isUploadingAdditional && <span style={{ fontSize: 11, color: "var(--color-primary)" }}>{lang === "ar" ? "جارٍ رفع الملف..." : "Uploading file..."}</span>}
              {additionalAttachmentFileName && (
                <span style={{ fontSize: 12, color: "#10B981", fontWeight: 700 }}>
                  ✅ {lang === "ar" ? `تم إرفاق: ${additionalAttachmentFileName}` : `Attached: ${additionalAttachmentFileName}`}
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {additionalAttachmentFileId ? (
                <a
                  href={`/api/files/${additionalAttachmentFileId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--color-primary)", textDecoration: "underline" }}
                >
                  📄 {lang === "ar" ? "تحميل المرفق الإضافي" : "Download Extra Attachment"}
                </a>
              ) : (
                lang === "ar" ? "لا يوجد مرفق إضافي." : "No extra attachment."
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row 7: Live Dynamic Cost Summary Breakdown Card */}
      {fromZone && toZone && hasMatchingPolicy && (
        <div
          style={{
            padding: "14px 16px",
            background: "#ECFDF5",
            border: "1px solid #A7F3D0",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: "#065F46", borderBottom: "1px solid #D1FAE5", paddingBottom: 6 }}>
            📊 {lang === "ar" ? "احتساب البدلات التقديري:" : "Estimated Allowance Breakdown:"}
          </div>

          <div className="form-grid-2" style={{ gap: 10, fontSize: 12, color: "#047857" }}>
            <div>
              • 🚗 <strong>{lang === "ar" ? "بدل الانتقال:" : "Transport Allowance:"}</strong> {calculatedTransportCost.toLocaleString()} {lang === "ar" ? "ج.م" : "EGP"}
              {hasTicket
                ? (lang === "ar" ? " (يدوي بالتذكرة)" : " (Manual Ticket)")
                : (lang === "ar" ? ` (تلقائي للائحة: ${policyTransportCost})` : ` (Policy Rate: ${policyTransportCost})`)}
            </div>
            <div>
              • 🍔 <strong>{lang === "ar" ? "الوجبات:" : "Meals:"}</strong> {Number(mealCost || 0).toLocaleString()} {lang === "ar" ? "ج.م" : "EGP"}
            </div>
            <div>
              • ☕ <strong>{lang === "ar" ? "القهوة:" : "Coffee:"}</strong> {Number(coffeeCost || 0).toLocaleString()} {lang === "ar" ? "ج.م" : "EGP"}
            </div>
            <div>
              • ✉️ <strong>{lang === "ar" ? "المراسلات:" : "Correspondence:"}</strong> {Number(correspondenceCost).toLocaleString()} {lang === "ar" ? "ج.م" : "EGP"}
            </div>
            <div>
              • 🅿️ <strong>{lang === "ar" ? "الباركينج:" : "Parking:"}</strong> {Number(parkingCost).toLocaleString()} {lang === "ar" ? "ج.م" : "EGP"}
            </div>
            <div>
              • 👥 <strong>{lang === "ar" ? "اجتماع فريق:" : "Team Meeting:"}</strong> {Number(teamMeetingCost).toLocaleString()} {lang === "ar" ? "ج.م" : "EGP"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 14,
              fontWeight: 900,
              color: "#065F46",
              borderTop: "1px solid #D1FAE5",
              paddingTop: 8,
              marginTop: 4,
            }}
          >
            <span>💰 {lang === "ar" ? "إجمالي البدل المستحق:" : "Calculated Grand Total:"}</span>
            <span style={{ fontSize: 18, color: "#047857" }}>
              {grandTotalCost.toLocaleString()} {lang === "ar" ? "ج.م" : "EGP"}
            </span>
          </div>
        </div>
      )}

      {/* Warning / Error banner if no matching policy or user not targeted */}
      {fromZone && toZone && !hasMatchingPolicy && (
        <div
          style={{
            padding: 14,
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: 8,
            color: "#991B1B",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 20 }}>🚫</span>
          <div>
            <strong>{lang === "ar" ? "تنبيه اللائحة / غير مصرح بالصرف:" : "Policy Warning / Unauthorized:"}</strong> {lang === "ar"
              ? `لا يحق لك احتساب بدلات الانتقال والمصاريف لخط السير من [${fromZone}] إلى [${toZone}]. اللائحة ومصفوفة الأسعار غير موجهة لقطاعك أو مجموعتك الحالية.`
              : `Travel expenses policy not authorized for route [${fromZone}] to [${toZone}] under your department.`}
          </div>
        </div>
      )}
    </div>
  );
}

