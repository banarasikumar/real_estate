"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, supabase } from "@repo/api";

export default function ProfilePage() {
  const { session } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  if (!session) {
    return (
      <div className="flex-1 container mx-auto px-4 py-16 flex flex-col items-center justify-center max-w-md text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Real Estate</h2>
        <p className="text-slate-500 mb-6 text-sm">
          Sign in to manage your saved properties, track active inquiries, customize search alerts, and configure your profile.
        </p>
        <div className="w-full space-y-3">
          <Link
            href="/login"
            className="w-full block bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md transition-all text-center"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="w-full block bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-6 rounded-xl border border-slate-200 transition-all text-center"
          >
            Create an Account
          </Link>
        </div>
      </div>
    );
  }

  const userEmail = session.user?.email || "User";
  const userInitial = userEmail.charAt(0).toUpperCase();

  return (
    <div className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-rose-500 to-rose-600 text-white font-bold text-3xl flex items-center justify-center shadow-lg shadow-rose-100 flex-shrink-0">
            {userInitial}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">
                {userEmail}
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Verified Account
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              User ID: <span className="font-mono text-slate-700">{session.user.id ? session.user.id.substring(0, 12) + "..." : "Active"}</span>
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                Member since {new Date().getFullYear()}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                India
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Hub */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Saved Properties Link */}
          <Link
            href="/saved"
            className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-rose-200 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                <svg className="w-6 h-6 fill-rose-600 stroke-rose-600" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors text-sm">
                  Saved Properties
                </h3>
                <p className="text-xs text-slate-500">
                  View and manage shortlisted homes
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>

          {/* My Enquiries Link */}
          <Link
            href="/enquiries"
            className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-rose-200 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="16" height="20" x="4" y="2" rx="2" />
                  <path d="M8 6h8" />
                  <path d="M8 10h8" />
                  <path d="M8 14h6" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors text-sm">
                  My Enquiries
                </h3>
                <p className="text-xs text-slate-500">
                  Check tour requests and owner replies
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>

          {/* Messages Link */}
          <Link
            href="/messages"
            className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-rose-200 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors text-sm">
                  Direct Messages
                </h3>
                <p className="text-xs text-slate-500">
                  Chat with property sellers and agents
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>

          {/* Explore Properties Link */}
          <Link
            href="/search"
            className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-rose-200 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors text-sm">
                  Explore Listings
                </h3>
                <p className="text-xs text-slate-500">
                  Discover verified flats, villas & plots
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>

        </div>
      </div>

      {/* Account Settings & Preferences */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm mb-8 space-y-6">
        <h2 className="text-lg font-bold text-slate-900">Notifications & Preferences</h2>

        <div className="space-y-4 divide-y divide-slate-100">
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">Email Notifications</p>
              <p className="text-xs text-slate-500">Receive price drop alerts & tour confirmations</p>
            </div>
            <button
              onClick={() => setEmailAlerts(!emailAlerts)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                emailAlerts ? "bg-rose-600" : "bg-slate-300"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  emailAlerts ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">WhatsApp & SMS Updates</p>
              <p className="text-xs text-slate-500">Instant agent replies and booking reminders</p>
            </div>
            <button
              onClick={() => setWhatsappAlerts(!whatsappAlerts)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                whatsappAlerts ? "bg-rose-600" : "bg-slate-300"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  whatsappAlerts ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Preferred Currency</p>
              <p className="text-xs text-slate-500">Display property prices in INR (₹)</p>
            </div>
            <span className="text-xs font-semibold bg-slate-100 px-3 py-1 rounded-lg text-slate-700">
              INR (₹ Lakh / Cr)
            </span>
          </div>
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Session Management</h3>
          <p className="text-xs text-slate-500">Sign out of your active session on this device.</p>
        </div>
        <button
          onClick={handleSignOut}
          disabled={loggingOut}
          className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors disabled:opacity-50"
        >
          {loggingOut ? "Signing Out..." : "Sign Out"}
        </button>
      </div>
    </div>
  );
}
