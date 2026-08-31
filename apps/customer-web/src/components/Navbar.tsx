"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth, supabase } from "@repo/api";

export function Navbar() {
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">RealEstate</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900">Buy</a>
          <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900">Rent</a>
          <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900">Sell</a>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-4">
          <button className="hidden md:flex text-sm font-medium text-slate-600 hover:text-slate-900">
            List your property
          </button>
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          
          {session ? (
            <div className="relative">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-slate-600">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </button>
              
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                  <Link 
                    href="/profile" 
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link 
                    href="/saved" 
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    Saved Properties
                  </Link>
                  <Link 
                    href="/enquiries" 
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Enquiries
                  </Link>
                  <Link 
                    href="/messages" 
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    Messages
                  </Link>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Login
              </Link>
              <Link href="/signup" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Sign Up
              </Link>
            </div>
          )}
          
          {/* Mobile Menu Button */}
          <button className="md:hidden flex items-center justify-center p-2 text-slate-600 hover:text-slate-900">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <line x1="4" x2="20" y1="12" y2="12"/>
              <line x1="4" x2="20" y1="6" y2="6"/>
              <line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
