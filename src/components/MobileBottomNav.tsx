"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { SYSTEM_USERS, SystemUser } from "@/lib/engine/iamStore";
import { safeStorage } from "@/lib/safeStorage";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const [currentUser, setCurrentUser] = useState<SystemUser>(SYSTEM_USERS[0]);

  useEffect(() => {
    const loadUser = () => {
      const savedId = safeStorage.getItem("simulated_user_id");
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
      labelEn: "Requests",
      labelAr: "الطلبات",
    },
    {
      href: "/my-requests",
      icon: "👤",
      labelEn: "My Requests",
      labelAr: "طلباتي",
    },
     {
       href: (currentUser?.roles && currentUser.roles.includes("admin")) || currentUser?.role === "admin" ? "/admin/users" : (currentUser?.roles && currentUser.roles.includes("agent")) || currentUser?.role === "agent" ? "/requests" : "/portal",
       icon: "👤",
       labelEn: (currentUser?.roles && currentUser.roles.includes("admin")) || currentUser?.role === "admin" ? "Admin" : (currentUser?.roles && currentUser.roles.includes("agent")) || currentUser?.role === "agent" ? "Requests" : "Profile",
       labelAr: (currentUser?.roles && currentUser.roles.includes("admin")) || currentUser?.role === "admin" ? "الإدارة" : (currentUser?.roles && currentUser.roles.includes("agent")) || currentUser?.role === "agent" ? "الطلبات" : "حسابي",
     },
   ];

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item, index) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href) && item.href !== "/";

        const label = lang === "ar" ? item.labelAr : item.labelEn;

        return (
          <Link
            key={`${item.href}-${index}`}
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
