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
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex flex-col">
        <AuthProvider>
          <Navbar />
          {/* Main Content */}
          <main className="flex-1 flex flex-col pb-20 md:pb-0">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t py-8 mt-auto hidden md:block">
            <div className="container mx-auto px-4 text-center text-sm text-slate-500">
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
