"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { SYSTEM_USERS, SystemUser } from "@/lib/engine/iamStore";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const [currentUser, setCurrentUser] = useState<SystemUser>(SYSTEM_USERS[0]);

  useEffect(() => {
    const loadUser = () => {
      const savedId = localStorage.getItem("simulated_user_id");
      if (savedId) {
        const found = SYSTEM_USERS.find((u) => u.id === savedId);
        if (found) setCurrentUser(found);
      }
    };
    loadUser();
    window.addEventListener("user-simulated-switch", loadUser);
    return () => window.removeEventListener("user-simulated-switch", loadUser);
  }, []);

  const navItems = [
    {
      href: "/",
      icon: "🏠",
      labelEn: "Portal",
      labelAr: "البوابة",
      exact: true,
    },
    {
      href: "/requests/new",
      icon: "✨",
      labelEn: "New Request",
      labelAr: "طلب جديد",
      highlight: true,
    },
    {
      href: "/requests",
      icon: "📋",
      labelEn: "My Requests",
      labelAr: "طلباتي",
    },
    {
      href: "/approvals",
      icon: "✅",
      labelEn: "Approvals",
      labelAr: "الاعتمادات",
    },
    {
      href: currentUser.role === "admin" ? "/admin/users" : "/portal",
      icon: "👤",
      labelEn: currentUser.role === "admin" ? "Admin" : "Profile",
      labelAr: currentUser.role === "admin" ? "الإدارة" : "حسابي",
    },
  ];

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href) && item.href !== "/";

        const label = lang === "ar" ? item.labelAr : item.labelEn;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-tab ${isActive ? "active" : ""} ${
              item.highlight ? "highlight" : ""
            }`}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
