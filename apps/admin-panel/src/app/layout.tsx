import "./globals.css";
import React from "react";
import { AuthProvider } from "@repo/api";
import { AdminAuthGuard } from "../components/AdminAuthGuard";

export const metadata = {
  title: "Real Estate Admin Portal | Control Center",
  description: "Super Admin and Administrator portal for property approvals and user management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  function cleanBis() {
                    var els = document.querySelectorAll('[bis_skin_checked], [bis_frame_id]');
                    for (var i = 0; i < els.length; i++) {
                      els[i].removeAttribute('bis_skin_checked');
                      els[i].removeAttribute('bis_frame_id');
                    }
                  }
                  cleanBis();
                  if (typeof MutationObserver !== 'undefined') {
                    var obs = new MutationObserver(function() {
                      cleanBis();
                    });
                    if (document.documentElement) {
                      obs.observe(document.documentElement, {
                        attributes: true,
                        subtree: true,
                        attributeFilter: ['bis_skin_checked', 'bis_frame_id']
                      });
                    }
                  }
                  var origError = console.error;
                  console.error = function() {
                    var msg = Array.prototype.slice.call(arguments).join(' ');
                    if (msg.indexOf('bis_skin_checked') !== -1 || (msg.indexOf('hydration') !== -1 && msg.indexOf('bis_skin') !== -1)) {
                      return;
                    }
                    origError.apply(console, arguments);
                  };
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900" suppressHydrationWarning>
        <AuthProvider>
          <AdminAuthGuard>{children}</AdminAuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
