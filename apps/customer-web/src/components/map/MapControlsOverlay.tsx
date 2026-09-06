"use client";

import React from "react";
import { Plus, Minus, Maximize2, Box, Pencil, X } from "lucide-react";
import { MapStyleKey } from "./mapboxConfig";

export interface MapControlsOverlayProps {
  mapStyleKey: MapStyleKey;
  onMapStyleChange: (key: MapStyleKey) => void;
  is3D: boolean;
  onToggle3D: () => void;
  bearing: number;
  onResetNorth: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitAll: () => void;
  isDrawingMode: boolean;
  onStartDraw: () => void;
  onCancelDraw: () => void;
  hasDrawnPolygon: boolean;
  onClearBoundary: () => void;
  searchAsMapMoves: boolean;
  onToggleSearchAsMapMoves: (enabled: boolean) => void;
}

export const MapControlsOverlay: React.FC<MapControlsOverlayProps> = ({
  mapStyleKey,
  onMapStyleChange,
  is3D,
  onToggle3D,
  bearing,
  onResetNorth,
  onZoomIn,
  onZoomOut,
  onFitAll,
  isDrawingMode,
  onStartDraw,
  onCancelDraw,
  hasDrawnPolygon,
  onClearBoundary,
  searchAsMapMoves,
  onToggleSearchAsMapMoves,
}) => {
  return (
    <>
      {/* Drawing Instructions Banner (Top Center while drawing) */}
      {isDrawingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <div className="bg-slate-900/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-semibold">
                Draw a shape around the area you want to search
              </span>
            </div>
            <button
              type="button"
              onClick={onCancelDraw}
              className="text-xs font-bold text-slate-300 hover:text-white px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Top-Center Floating Pill Container: Draw Tool | Search as I move | Clear Badge */}
      {!isDrawingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-slate-200/90 flex items-center gap-3 transition-all hover:shadow-xl">
            {/* ✏️ Draw Button */}
            <button
              type="button"
              onClick={onStartDraw}
              className="group flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all cursor-pointer text-slate-700 hover:text-rose-600 hover:bg-rose-50 active:scale-95"
              title="Draw a custom boundary to filter listings"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-600 transition-colors" />
              <span>Draw</span>
            </button>

            <span className="text-slate-200 font-light select-none">|</span>

            {/* "Search as I move the map" Tactile Micro-Switch Toggle */}
            <div
              onClick={() => onToggleSearchAsMapMoves(!searchAsMapMoves)}
              className="flex items-center gap-2 cursor-pointer select-none group"
              title="Automatically refresh listings when moving or zooming the map"
            >
              <div
                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                  searchAsMapMoves ? "bg-rose-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out my-auto ml-0.5 ${
                    searchAsMapMoves ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </div>
              <span className="text-xs font-semibold text-slate-800 whitespace-nowrap group-hover:text-rose-600 transition-colors">
                Search as I move the map
              </span>
            </div>

            {/* If boundary drawn: Clear Area pill button */}
            {hasDrawnPolygon && (
              <>
                <span className="text-slate-200 font-light select-none">|</span>
                <button
                  type="button"
                  onClick={onClearBoundary}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-full transition-all cursor-pointer active:scale-95"
                  title="Clear active boundary polygon"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  <span>Boundary Active</span>
                  <X className="w-3 h-3 ml-0.5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Top-Right: Segmented Pill [ 🗺️ 3D Streets | 🛰️ 3D Satellite ] */}
      <div className="absolute top-4 right-4 z-30 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200/90 p-1 flex items-center gap-1 transition-all hover:shadow-xl">
          <button
            type="button"
            onClick={() => onMapStyleChange("streets")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
              mapStyleKey === "streets"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Mapbox Standard 3D Streets with architectural buildings & lighting"
          >
            <span>🗺️</span>
            <span className="hidden sm:inline">3D Streets</span>
          </button>
          <button
            type="button"
            onClick={() => onMapStyleChange("satellite")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
              mapStyleKey === "satellite"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Mapbox Standard 3D Satellite with photorealistic aerial imagery"
          >
            <span>🛰️</span>
            <span className="hidden sm:inline">3D Satellite</span>
          </button>
        </div>
      </div>

      {/* Floating HUD on Right: Dedicated 3D Toggle Pill + Vertical Control Cluster */}
      <div className="absolute top-16 right-4 flex flex-col items-end gap-2.5 z-30 pointer-events-auto">
        {/* Dedicated 3D / 2D Perspective Toggle Pill */}
        <button
          type="button"
          onClick={onToggle3D}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black tracking-tight transition-all duration-300 shadow-md cursor-pointer select-none active:scale-95 ${
            is3D
              ? "bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-rose-600/30 ring-2 ring-rose-400/60"
              : "bg-white/95 backdrop-blur-md text-slate-700 border border-slate-200 hover:text-rose-600 hover:border-rose-300"
          }`}
          title={is3D ? "Click to flatten camera to 2D bird's-eye view" : "Click to tilt camera into 3D perspective view (55°)"}
        >
          <Box className={`w-4 h-4 transition-transform duration-300 ${is3D ? "rotate-12 scale-110" : ""}`} />
          <span>{is3D ? "3D Active" : "3D View"}</span>
          {is3D && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          )}
        </button>

        {/* Vertical Control Cluster (Zoom +, Zoom -, Dynamic True North Needle, Fit All) */}
        <div className="flex flex-col bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {/* Zoom In */}
          <button
            type="button"
            onClick={onZoomIn}
            className="p-2.5 text-slate-700 hover:text-rose-600 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
            title="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={onZoomOut}
            className="p-2.5 text-slate-700 hover:text-rose-600 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
            title="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* True North Navigation Compass with Custom Rotating Dual Needle */}
          <button
            type="button"
            onClick={onResetNorth}
            className="p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer group"
            title={bearing !== 0 ? `Bearing: ${bearing}°. Click to reset to true North.` : "Aligned with North. Click to reset."}
          >
            <div
              className="w-4 h-4 flex items-center justify-center transition-transform duration-200"
              style={{ transform: `rotate(${-bearing}deg)` }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor">
                {/* North Needle (Solid Red) */}
                <polygon points="12,2 16,12 12,9 8,12" fill="#e11d48" stroke="#be123c" strokeWidth="0.5" />
                {/* South Needle (Slate) */}
                <polygon points="12,22 16,12 12,9 8,12" fill="#94a3b8" stroke="#64748b" strokeWidth="0.5" />
              </svg>
            </div>
          </button>

          {/* Fit All Properties in View */}
          <button
            type="button"
            onClick={onFitAll}
            className="p-2.5 text-slate-700 hover:text-rose-600 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
            title="Fit all property markers in viewport"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};

export default MapControlsOverlay;
