import "./globals.css";
import React from "react";
import { AuthProvider } from "@repo/api";
import { Navbar } from "../components/Navbar";
import { BottomNav } from "../components/BottomNav";

export const metadata = {
  title: "Real Estate MVP | Find Your Dream Property",
  description: "Discover, search, and save properties effortlessly.",
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
      <body className="min-h-screen bg-slate-50 flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <Navbar />
          {/* Main Content */}
          <main className="flex-1 flex flex-col pb-20 md:pb-0" suppressHydrationWarning>
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t py-8 mt-auto hidden md:block" suppressHydrationWarning>
            <div className="container mx-auto px-4 text-center text-sm text-slate-500" suppressHydrationWarning>
              &copy; {new Date().getFullYear()} Real Estate App MVP. All rights reserved.
            </div>
          </footer>

          {/* Mobile Bottom Navigation */}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
