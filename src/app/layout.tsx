import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Workflow Engine — Enterprise Workflow System",
  description: "Dynamic Workflow & Approval Cycle Engine",
};

import { MobileBottomNav } from "@/components/MobileBottomNav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <LanguageProvider>
          <div className="app-shell">
            <Sidebar />
            <div className="main-content">
              <Topbar />
              <main className="page-content">{children}</main>
            </div>
            <MobileBottomNav />
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
