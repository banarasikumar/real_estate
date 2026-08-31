import "./globals.css";
import React from "react";
import Link from "next/link";
import { LayoutDashboard, Home, Users, Settings } from "lucide-react";

import { AuthProvider } from "@repo/api";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-50 text-gray-900">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <span className="text-xl font-bold text-blue-600 tracking-tight">Admin Dashboard</span>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <Link href="/" className="flex items-center gap-3 px-3 py-2.5 text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link href="/properties" className="flex items-center gap-3 px-3 py-2.5 text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <Home className="w-5 h-5" />
              <span className="font-medium">Properties</span>
            </Link>
            <Link href="/users" className="flex items-center gap-3 px-3 py-2.5 text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <Users className="w-5 h-5" />
              <span className="font-medium">Users</span>
            </Link>
            <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </Link>
          </nav>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm justify-between">
            <h1 className="text-xl font-semibold text-gray-800">Overview</h1>
            <div className="flex items-center gap-4">
               <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">A</div>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-8">
            <AuthProvider>{children}</AuthProvider>
          </div>
        </main>
      </body>
    </html>
  );
}
