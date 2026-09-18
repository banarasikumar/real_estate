"use client";

import React from "react";
import dynamic from "next/dynamic";

// Dynamic import with SSR false for Mapbox GL engine
const CityBoundaryManager = dynamic(
  () => import("../../components/CityBoundaryManager"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-950 text-white gap-3">
        <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
          Initializing iOS GIS Polygon Engine...
        </p>
      </div>
    ),
  }
);

export default function RegionsPage() {
  return (
    <div className="w-full h-full relative overflow-hidden">
      <CityBoundaryManager />
    </div>
  );
}
