"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@repo/api";

export function BottomNav() {
  const { session } = useAuth();
  const pathname = usePathname();

  const isActiveTab = (href: string) => {
    if (href === "/") {
      return pathname === "/" || pathname.startsWith("/search") || pathname.startsWith("/property");
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 shadow-lg"
    >
      <div className={`grid items-center ${session ? "grid-cols-5" : "grid-cols-3"} max-w-md mx-auto`}>
        {/* Explore */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-90 select-none ${
            isActiveTab("/")
              ? "text-rose-600 font-semibold"
              : "text-slate-500 hover:text-slate-800 font-medium"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={isActiveTab("/") ? "2.3" : "1.8"}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 transition-transform"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span className="text-[10px] tracking-tight leading-tight mt-1">Explore</span>
        </Link>

        {/* Saved */}
        <Link
          href="/saved"
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-90 select-none ${
            isActiveTab("/saved")
              ? "text-rose-600 font-semibold"
              : "text-slate-500 hover:text-slate-800 font-medium"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={isActiveTab("/saved") ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={isActiveTab("/saved") ? "2" : "1.8"}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 transition-transform"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <span className="text-[10px] tracking-tight leading-tight mt-1">Saved</span>
        </Link>

        {session ? (
          <>
            {/* Enquiries */}
            <Link
              href="/enquiries"
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-90 select-none ${
                isActiveTab("/enquiries")
                  ? "text-rose-600 font-semibold"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={isActiveTab("/enquiries") ? "2.3" : "1.8"}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 transition-transform"
              >
                <rect width="16" height="20" x="4" y="2" rx="2" />
                <path d="M8 6h8" />
                <path d="M8 10h8" />
                <path d="M8 14h6" />
                <path d="M8 18h3" />
              </svg>
              <span className="text-[10px] tracking-tight leading-tight mt-1">Enquiries</span>
            </Link>

            {/* Messages */}
            <Link
              href="/messages"
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-90 select-none ${
                isActiveTab("/messages")
                  ? "text-rose-600 font-semibold"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={isActiveTab("/messages") ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={isActiveTab("/messages") ? "1.5" : "1.8"}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 transition-transform"
              >
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
              </svg>
              <span className="text-[10px] tracking-tight leading-tight mt-1">Messages</span>
            </Link>

            {/* Profile */}
            <Link
              href="/profile"
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-90 select-none ${
                isActiveTab("/profile")
                  ? "text-rose-600 font-semibold"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={isActiveTab("/profile") ? "2.3" : "1.8"}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 transition-transform"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
              <span className="text-[10px] tracking-tight leading-tight mt-1">Profile</span>
            </Link>
          </>
        ) : (
          /* Log in */
          <Link
            href="/login"
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-90 select-none ${
              isActiveTab("/login") || isActiveTab("/signup")
                ? "text-rose-600 font-semibold"
                : "text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={isActiveTab("/login") || isActiveTab("/signup") ? "2.3" : "1.8"}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 transition-transform"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" x2="3" y1="12" y2="12" />
            </svg>
            <span className="text-[10px] tracking-tight leading-tight mt-1">Log in</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

export default BottomNav;
