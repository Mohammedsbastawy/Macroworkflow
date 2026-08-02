import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { NextAuthProvider } from "@/components/auth/NextAuthProvider";
import { auth } from "@/lib/auth";

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isAuthed = !!session?.user;
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            // Setup early error logging to send client crashes back to the server
            window.onerror = function(message, url, line, column, error) {
              fetch('/api/log-client-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: message,
                  url: url,
                  line: line,
                  column: column,
                  stack: error ? error.stack : ''
                })
              }).catch(function() {});
            };
            window.onunhandledrejection = function(event) {
              var error = event.reason;
              fetch('/api/log-client-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: error ? error.message || String(error) : 'Unhandled Rejection',
                  url: window.location.href,
                  line: 0,
                  column: 0,
                  stack: error ? error.stack : ''
                })
              }).catch(function() {});
            };

            var store = {};
            var fallback = {
              getItem: function(k) { return k in store ? store[k] : null; },
              setItem: function(k, v) { store[k] = String(v); },
              removeItem: function(k) { delete store[k]; },
              clear: function() { store = {}; },
              key: function(i) { return Object.keys(store)[i] || null; }
            };
            Object.defineProperty(fallback, 'length', {
              get: function() { return Object.keys(store).length; }
            });

            try {
              var testKey = '__storage_test__';
              window.localStorage.setItem(testKey, testKey);
              window.localStorage.removeItem(testKey);
            } catch (e) {
              console.warn('localStorage is blocked or disabled. Polyfilling on Window.prototype.', e);
              try {
                Object.defineProperty(Window.prototype, 'localStorage', {
                  get: function() { return fallback; },
                  configurable: true
                });
              } catch (err) {
                console.error('Failed to polyfill localStorage on Window.prototype, attempting Storage.prototype patch.', err);
                try {
                  var proto = Storage.prototype;
                  Object.defineProperty(proto, 'getItem', { value: fallback.getItem, configurable: true, writable: true });
                  Object.defineProperty(proto, 'setItem', { value: fallback.setItem, configurable: true, writable: true });
                  Object.defineProperty(proto, 'removeItem', { value: fallback.removeItem, configurable: true, writable: true });
                  Object.defineProperty(proto, 'clear', { value: fallback.clear, configurable: true, writable: true });
                  Object.defineProperty(proto, 'key', { value: fallback.key, configurable: true, writable: true });
                } catch (err2) {
                  console.error('Storage.prototype patch failed', err2);
                }
              }
            }
          })();
        `}} />
      </head>
      <body suppressHydrationWarning>
        <LanguageProvider>
          <NextAuthProvider>
            {isAuthed ? (
              <div className="app-shell">
                <Sidebar />
                <div className="main-content">
                  <Topbar />
                  <main className="page-content">{children}</main>
                </div>
                <MobileBottomNav />
              </div>
            ) : (
              <main>{children}</main>
            )}
          </NextAuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
