"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "ar";

interface LanguageContextType {
  lang: Language;
  dir: "ltr" | "rtl";
  setLang: (l: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, defaultEn: string, defaultAr?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  dir: "ltr",
  setLang: () => {},
  toggleLanguage: () => {},
  t: (_key, defaultEn) => defaultEn,
});

export const TRANSLATIONS: Record<string, { en: string; ar: string }> = {
  // Navigation & General
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  myRequests: { en: "My Requests", ar: "طلباتي" },
  newRequest: { en: "New Request", ar: "طلب جديد" },
  requests: { en: "requests", ar: "الطلبات" },
  requestsList: { en: "Pending Approvals", ar: "الطلبات بانتظار الاعتماد" },
  catalog: { en: "Requests Catalog Editor", ar: "محرر كتالوج الطلبات" },
  formBuilder: { en: "Form Builder", ar: "مصمم الاستشارات والتموجات" },
  usersIam: { en: "Users & IAM Management", ar: "إدارة المستخدمين والصلاحيات" },
  profileSetup: { en: "Profile Setup & Roles", ar: "إعدادات البروفايل والأدوار" },
  reportsSla: { en: "Reports & SLA", ar: "التقارير واتفاقيات الخدمة" },
  settings: { en: "Settings", ar: "الإعدادات" },

  // Ticket Zones & Designer
  headerBarZone: { en: "Header Bar Zone (KPI & Highlight Badges)", ar: "منطقة الهيدر العلوي (الشارات البارزة)" },
  ticketFormDetails: { en: "Ticket Form Details Zone", ar: "منطقة تفاصيل الاستمارة الرئيسية" },
  rightSidebarZone: { en: "Right Sidebar Info Zone", ar: "منطقة اللوحة الجانبية" },
  hiddenZone: { en: "Hidden Fields Zone", ar: "منطقة الحقول المخفية" },

  // Header Field Slots
  requestTitleSlot: { en: "Request Title Slot", ar: "خانة عنوان التذكرة الرئيسي" },
  refNoSlot: { en: "Ticket Reference No. Slot", ar: "خانة الرقم المرجعي للتذكرة" },
  statusBadgeSlot: { en: "Status Badge Slot", ar: "شارة حالة التذكرة" },
  priorityBadgeSlot: { en: "Priority Badge Slot", ar: "شارة درجة الأولوية" },

  // Actions
  approveTicket: { en: "Approve Ticket", ar: "اعتماد التذكرة" },
  rejectTicket: { en: "Reject Ticket", ar: "رفض التذكرة" },
  requestInfo: { en: "Request Info (RFI)", ar: "طلب استفسار (RFI)" },
  reassignGroup: { en: "Reassign Group", ar: "إعادة توجيه للمجموعة" },
  cancelTicket: { en: "Cancel Ticket", ar: "إلغاء التذكرة" },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("system_lang") as Language;
    if (saved === "ar" || saved === "en") {
      setLangState(saved);
      document.documentElement.dir = saved === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = saved;
    } else {
      setLangState("en");
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("system_lang", newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
    window.dispatchEvent(new Event("system-language-changed"));
  };

  const toggleLanguage = () => {
    const next = lang === "en" ? "ar" : "en";
    setLang(next);
  };

  const t = (key: string, defaultEn: string, defaultAr?: string): string => {
    const entry = TRANSLATIONS[key];
    if (lang === "ar") {
      return entry?.ar || defaultAr || defaultEn;
    }
    return entry?.en || defaultEn;
  };

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
