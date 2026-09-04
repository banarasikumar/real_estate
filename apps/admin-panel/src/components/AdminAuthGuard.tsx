"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/navigation";
import { useAuth, supabase, getUserProfile } from "@repo/api";
import {
  LayoutDashboard,
  Home,
  Users,
  Settings,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();

  const [role, setRole] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // If on /login, bypass guard
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      if (isLoginPage) {
        setChecking(false);
        return;
      }

      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (!currentSession?.user) {
        if (isMounted) {
          setChecking(false);
          router.replace("/login");
        }
        return;
      }

      const profile = await getUserProfile(currentSession.user.id);
      if (isMounted) {
        if (profile) {
          setRole(profile.role);
          setProfileName(profile.full_name || currentSession.user.email?.split("@")[0] || "Admin");
        }
        setChecking(false);
      }
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession && !isLoginPage) {
        router.replace("/login");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, isLoginPage, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // If on /login, render without dashboard chrome
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading spinner
  if (checking) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
        <div className="w-10 h-10 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-400">Verifying administrator authorization...</p>
      </div>
    );
  }

  // Access Denied: User logged in, but not an admin
  if (role && role !== "SUPER_ADMIN" && role !== "ADMIN") {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-400 mb-6">
            Your account ({session?.user?.email}) is registered as a regular{" "}
            <span className="font-semibold text-slate-200">{role}</span> and does not have administrator privileges.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition cursor-pointer"
          >
            Sign Out & Switch Account
          </button>
        </div>
      </div>
    );
  }

  const isSuperAdmin = role === "SUPER_ADMIN";

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tight text-white leading-none">
              RealEstate Admin
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
              Control Center
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          <a
            href="/"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
              pathname === "/"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard & Approvals</span>
          </a>

          <a
            href="/properties/pending"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
              pathname.startsWith("/properties")
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Pending Approvals</span>
          </a>

          {/* Super Admin exclusive Users & Admins tab */}
          {isSuperAdmin && (
            <a
              href="/users"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                pathname === "/users"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/80"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Users & Admins</span>
            </a>
          )}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  isSuperAdmin
                    ? "bg-purple-600 text-white"
                    : "bg-blue-600 text-white"
                }`}
              >
                {profileName ? profileName.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{profileName}</p>
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      isSuperAdmin ? "bg-purple-400" : "bg-blue-400"
                    }`}
                  />
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {isSuperAdmin ? "Super Admin" : "Admin"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-xs">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900">
              {pathname === "/"
                ? "Overview & Approvals"
                : pathname === "/users"
                ? "Admin & User Management"
                : "Property Approvals"}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isSuperAdmin
                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                  : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}
            >
              {isSuperAdmin ? "Super Admin Access" : "Admin Access"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900">{session?.user?.email}</p>
              <p className="text-[10px] text-slate-500">Active Session</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>
    </div>
  );
}
