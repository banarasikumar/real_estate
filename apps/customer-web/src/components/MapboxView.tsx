"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Layers,
  Plus,
  Minus,
  Maximize2,
  X,
  Bed,
  Bath,
  Square,
  ShieldCheck,
  Heart,
  Navigation,
  Eye,
  Compass,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Info,
  Mountain,
} from "lucide-react";
import SafeImage from "./SafeImage";
import { formatPricePill, formatPriceLabel } from "../utils/formatters";

export { formatPricePill, formatPriceLabel };

export interface MapProperty {
  id: string;
  title: string;
  price: number | string;
  address?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqft?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  prop_type?: string;
  list_type?: string;
  status?: string;
  isVerified?: boolean;
  property_media?: Array<{ url: string }>;
  images?: string[];
  [key: string]: any;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapboxViewProps {
  properties: MapProperty[];
  selectedPropertyId?: string | null;
  hoveredPropertyId?: string | null;
  viewedPropertyIds?: string[] | Set<string>;
  savedPropertyIds?: string[];
  onSelectProperty?: (property: MapProperty | null) => void;
  onHoverProperty?: (propertyId: string | null) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  onToggleSave?: (propertyId: string) => void;
  searchAsMapMoves?: boolean;
  onToggleSearchAsMapMoves?: (enabled: boolean) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  pitch?: number;
  className?: string;
}

// Deterministic lat/lng generator for items missing coordinates
export function getDeterministicCoords(
  item: MapProperty,
  index: number
): { lat: number; lng: number } {
  if (
    typeof item.latitude === "number" &&
    typeof item.longitude === "number" &&
    !isNaN(item.latitude) &&
    !isNaN(item.longitude) &&
    item.latitude !== 0 &&
    item.longitude !== 0
  ) {
    return { lat: item.latitude, lng: item.longitude };
  }

  // Base center: Mumbai (or detect from address/title)
  let baseLat = 19.076;
  let baseLng = 72.8777;

  const text = `${item.address || ""} ${item.title || ""}`.toLowerCase();
  if (text.includes("bangalore") || text.includes("bengaluru")) {
    baseLat = 12.9716;
    baseLng = 77.5946;
  } else if (text.includes("delhi") || text.includes("noida") || text.includes("gurgaon")) {
    baseLat = 28.6139;
    baseLng = 77.209;
  } else if (text.includes("pune")) {
    baseLat = 18.5204;
    baseLng = 73.8567;
  } else if (text.includes("hyderabad")) {
    baseLat = 17.385;
    baseLng = 78.4867;
  } else if (text.includes("goa")) {
    baseLat = 15.2993;
    baseLng = 74.124;
  }

  let hash = 0;
  const str = item.id || `prop-${index}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const offsetLat = ((Math.abs(hash) % 100) - 50) * 0.0015 + (index % 5) * 0.004;
  const offsetLng = ((Math.abs(hash >> 3) % 100) - 50) * 0.0018 + (index % 4) * 0.005;

  return {
    lat: baseLat + offsetLat,
    lng: baseLng + offsetLng,
  };
}

// High-Res Esri Satellite pure MapLibre style JSON (zero keys required)
export const SATELLITE_STYLE: any = {
  version: 8,
  sources: {
    "esri-satellite": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri",
    },
  },
  layers: [
    {
      id: "esri-satellite-layer",
      type: "raster",
      source: "esri-satellite",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// MapLibre Styles: Streets (Default vibrant vector streets), Satellite (High-Res Aerial), Minimal (Warm gray)
export const MAP_STYLES = {
  streets: "https://tiles.openfreemap.org/styles/liberty",
  satellite: SATELLITE_STYLE,
  minimal: "https://tiles.openfreemap.org/styles/positron",
  // Aliases for compatibility
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  positron: "https://tiles.openfreemap.org/styles/positron",
} as const;

export type MapStyleKey = keyof typeof MAP_STYLES;

// Aliases for backwards compatibility
export const MAPBOX_STYLES = MAP_STYLES;
export type MapboxStyleKey = MapStyleKey;

export function MapboxView({
  properties,
  selectedPropertyId,
  hoveredPropertyId,
  viewedPropertyIds: externalViewedIds,
  savedPropertyIds = [],
  onSelectProperty,
  onHoverProperty,
  onBoundsChange,
  onToggleSave,
  searchAsMapMoves = true,
  onToggleSearchAsMapMoves,
  center: defaultCenter,
  zoom: defaultZoom = 12.5,
  pitch: defaultPitch = 0,
  className = "",
}: MapboxViewProps) {
  // Styles and camera state: Default to vibrant detailed Streets
  const [mapStyleKey, setMapStyleKey] = useState<MapStyleKey>("streets");
  const [is3D, setIs3D] = useState(defaultPitch > 20);
  const [activeProperty, setActiveProperty] = useState<MapProperty | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [internalViewedIds, setInternalViewedIds] = useState<Set<string>>(new Set());
  const [toggledSavedIds, setToggledSavedIds] = useState<Record<string, boolean>>({});

  // Check if a property is saved (respecting optimistic toggles and external props)
  const isPropertySaved = useCallback(
    (id: string) => {
      if (toggledSavedIds[id] !== undefined) {
        return toggledSavedIds[id];
      }
      return Array.isArray(savedPropertyIds) && savedPropertyIds.includes(id);
    },
    [toggledSavedIds, savedPropertyIds]
  );

  // "Search as I move the map"
  const [internalSearchAsMove, setInternalSearchAsMove] = useState(searchAsMapMoves);
  const isSearchAsMapMoves =
    searchAsMapMoves !== undefined ? searchAsMapMoves : internalSearchAsMove;

  const handleToggleSearchAsMapMoves = (val: boolean) => {
    setInternalSearchAsMove(val);
    onToggleSearchAsMapMoves?.(val);
  };

  // DOM and MapLibre refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const currentStyleRef = useRef<MapStyleKey>(mapStyleKey);
  currentStyleRef.current = mapStyleKey;

  const markersRef = useRef<
    Map<
      string,
      {
        marker: maplibregl.Marker;
        element: HTMLDivElement;
        pillBtn: HTMLButtonElement;
        pointerCaret: HTMLDivElement;
      }
    >
  >(new Map());

  // Debouncing refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedBoundsRef = useRef<MapBounds | null>(null);

  // Props synchronization refs
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;

  const searchAsMoveRef = useRef(isSearchAsMapMoves);
  searchAsMoveRef.current = isSearchAsMapMoves;

  const onSelectPropertyRef = useRef(onSelectProperty);
  onSelectPropertyRef.current = onSelectProperty;

  const onHoverPropertyRef = useRef(onHoverProperty);
  onHoverPropertyRef.current = onHoverProperty;

  // Combined viewed IDs
  const isPropertyViewed = useCallback(
    (id: string) => {
      if (externalViewedIds) {
        if (externalViewedIds instanceof Set || typeof (externalViewedIds as any).has === "function") {
          if ((externalViewedIds as Set<string>).has(id)) return true;
        } else if (Array.isArray(externalViewedIds)) {
          if (externalViewedIds.includes(id)) return true;
        }
      }
      return internalViewedIds.has(id);
    },
    [externalViewedIds, internalViewedIds]
  );

  // Properties with resolved coordinates and formatting
  const mappedProperties = useMemo(() => {
    return properties.map((prop, idx) => {
      const coords = getDeterministicCoords(prop, idx);
      const mediaUrls: string[] = [];
      if (prop.images && Array.isArray(prop.images)) {
        mediaUrls.push(...prop.images);
      }
      if (prop.property_media && Array.isArray(prop.property_media)) {
        prop.property_media.forEach((m) => {
          if (m?.url) mediaUrls.push(m.url);
        });
      }
      if (mediaUrls.length === 0) {
        mediaUrls.push(
          "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80"
        );
      }

      return {
        ...prop,
        lat: coords.lat,
        lng: coords.lng,
        displayImages: mediaUrls,
        pricePill: formatPricePill(prop.price),
      };
    });
  }, [properties]);

  // Center calculation
  const averageCenter = useMemo(() => {
    if (defaultCenter) return defaultCenter;
    if (mappedProperties.length === 0) return { lat: 19.076, lng: 72.8777 };
    const totalLat = mappedProperties.reduce((acc, p) => acc + p.lat, 0);
    const totalLng = mappedProperties.reduce((acc, p) => acc + p.lng, 0);
    return {
      lat: totalLat / mappedProperties.length,
      lng: totalLng / mappedProperties.length,
    };
  }, [mappedProperties, defaultCenter]);

  // Sync active property from prop
  useEffect(() => {
    if (selectedPropertyId) {
      const found = mappedProperties.find((p) => p.id === selectedPropertyId);
      if (found) {
        setActiveProperty(found);
        setActiveImageIndex(0);
        setInternalViewedIds((prev) => new Set(prev).add(selectedPropertyId));
      }
    }
  }, [selectedPropertyId, mappedProperties]);

  // Debounced bounds dispatch function
  const triggerDebouncedBoundsChange = useCallback((newBounds: MapBounds) => {
    if (!searchAsMoveRef.current) return;

    if (lastReportedBoundsRef.current) {
      const prev = lastReportedBoundsRef.current;
      const isMeaningfulChange =
        Math.abs(prev.north - newBounds.north) > 0.0001 ||
        Math.abs(prev.south - newBounds.south) > 0.0001 ||
        Math.abs(prev.east - newBounds.east) > 0.0001 ||
        Math.abs(prev.west - newBounds.west) > 0.0001;

      if (!isMeaningfulChange) return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      lastReportedBoundsRef.current = newBounds;
      if (onBoundsChangeRef.current) {
        onBoundsChangeRef.current(newBounds);
      }
    }, 300);
  }, []);

  // Helper to add 3D building extrusion layer on Positron/Liberty
  const add3DBuildingsLayer = useCallback((map: maplibregl.Map, currentStyle: string) => {
    try {
      if (currentStyle !== "satellite" && !map.getLayer("3d-buildings")) {
        if (map.getSource("openmaptiles")) {
          map.addLayer({
            id: "3d-buildings",
            source: "openmaptiles",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#e2e8f0",
              "fill-extrusion-height": ["get", "render_height"],
              "fill-extrusion-base": ["get", "render_min_height"],
              "fill-extrusion-opacity": 0.65,
            },
          });
        }
      }
    } catch (err) {
      console.warn("Could not inject 3D buildings layer:", err);
    }
  }, []);

  // Initialize MapLibre GL instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter: [number, number] = [averageCenter.lng, averageCenter.lat];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[mapStyleKey] as any,
      center: initialCenter,
      zoom: defaultZoom,
      pitch: defaultPitch,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      add3DBuildingsLayer(map, currentStyleRef.current);
    });

    map.on("style.load", () => {
      add3DBuildingsLayer(map, currentStyleRef.current);
    });

    map.on("moveend", () => {
      if (searchAsMoveRef.current) {
        const b = map.getBounds();
        if (b) {
          triggerDebouncedBoundsChange({
            north: b.getNorth(),
            south: b.getSouth(),
            east: b.getEast(),
            west: b.getWest(),
          });
        }
      }
    });

    map.on("pitch", () => {
      setIs3D(map.getPitch() > 20);
    });

    map.on("click", () => {
      setActiveProperty(null);
      onSelectPropertyRef.current?.(null);
    });

    mapInstanceRef.current = map;

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Map Style dynamically
  const handleMapStyleChange = (key: MapStyleKey) => {
    setMapStyleKey(key);
    currentStyleRef.current = key;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setStyle(MAP_STYLES[key] as any);
    }
  };

  // Toggle 3D pitch camera between 0° and 50°
  const handleToggle3D = () => {
    if (mapInstanceRef.current) {
      const targetPitch = is3D ? 0 : 50;
      mapInstanceRef.current.easeTo({
        pitch: targetPitch,
        duration: 600,
      });
      setIs3D(!is3D);
    } else {
      setIs3D(!is3D);
    }
  };

  // Reset Bearing / North
  const handleResetNorth = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.easeTo({
        bearing: 0,
        pitch: is3D ? 50 : 0,
        duration: 500,
      });
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn({ duration: 300 });
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut({ duration: 300 });
    }
  };

  // Fit all properties
  const handleFitAll = () => {
    if (mappedProperties.length === 0 || !mapInstanceRef.current) return;

    const bounds = new maplibregl.LngLatBounds();
    mappedProperties.forEach((p) => {
      bounds.extend([p.lng, p.lat]);
    });
    mapInstanceRef.current.fitBounds(bounds, {
      padding: 80,
      maxZoom: 15,
      duration: 800,
    });
  };

  // Pan to hovered or selected property
  useEffect(() => {
    const targetId = hoveredPropertyId || selectedPropertyId;
    if (targetId && mapInstanceRef.current) {
      const target = mappedProperties.find((p) => p.id === targetId);
      if (target) {
        mapInstanceRef.current.easeTo({
          center: [target.lng, target.lat],
          duration: 600,
        });
      }
    }
  }, [hoveredPropertyId, selectedPropertyId, mappedProperties]);

  // Property Selection Handler
  const handlePropertyClick = useCallback(
    (property: MapProperty) => {
      setActiveProperty(property);
      setActiveImageIndex(0);
      setInternalViewedIds((prev) => new Set(prev).add(property.id));
      onSelectPropertyRef.current?.(property);

      const lat = property.lat;
      const lng = property.lng;
      if (lat && lng && mapInstanceRef.current) {
        mapInstanceRef.current.easeTo({
          center: [lng, lat],
          duration: 500,
        });
      }
    },
    []
  );

  // Favorite / Save toggle handler
  const handleToggleFavorite = (e: React.MouseEvent, propId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const currentlySaved = isPropertySaved(propId);
    setToggledSavedIds((prev) => ({
      ...prev,
      [propId]: !currentlySaved,
    }));

    onToggleSave?.(propId);
  };

  // Update or Create Custom Airbnb-Style Price Pill Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const currentPropIds = new Set(mappedProperties.map((p) => p.id));

    // Clean up markers that are no longer present
    markersRef.current.forEach((markerObj, id) => {
      if (!currentPropIds.has(id)) {
        markerObj.marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Create or update markers
    mappedProperties.forEach((property) => {
      let markerItem = markersRef.current.get(property.id);

      if (!markerItem) {
        // Container element
        const el = document.createElement("div");
        el.className = "maplibre-marker-container cursor-pointer select-none transition-transform duration-200";

        // Price Pill Button
        const pillBtn = document.createElement("button");
        pillBtn.type = "button";
        pillBtn.className =
          "relative flex items-center justify-center font-bold px-3 py-1.5 rounded-full text-xs transition-all duration-200";

        const textSpan = document.createElement("span");
        textSpan.innerText = property.pricePill;
        pillBtn.appendChild(textSpan);

        // Pointer caret beneath pill
        const pointerCaret = document.createElement("div");
        pointerCaret.className =
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 transition-colors duration-200";
        pillBtn.appendChild(pointerCaret);

        el.appendChild(pillBtn);

        // Event Listeners
        el.addEventListener("mouseenter", () => {
          onHoverPropertyRef.current?.(property.id);
        });

        el.addEventListener("mouseleave", () => {
          onHoverPropertyRef.current?.(null);
        });

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          handlePropertyClick(property);
        });

        const marker = new maplibregl.Marker({
          element: el,
          anchor: "bottom",
        })
          .setLngLat([property.lng, property.lat])
          .addTo(map);

        markerItem = { marker, element: el, pillBtn, pointerCaret };
        markersRef.current.set(property.id, markerItem);
      } else {
        markerItem.marker.setLngLat([property.lng, property.lat]);
      }

      // Dynamic Styling state calculation
      const isSelected =
        selectedPropertyId === property.id || activeProperty?.id === property.id;
      const isHovered = hoveredPropertyId === property.id;
      const isViewed = isPropertyViewed(property.id);
      const isHighlighted = isSelected || isHovered;

      markerItem.element.style.zIndex = isHighlighted ? "50" : "10";

      if (isHighlighted) {
        markerItem.pillBtn.className =
          "relative flex items-center justify-center font-bold px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 scale-110 shadow-xl bg-rose-600 text-white ring-2 ring-white";
        markerItem.pointerCaret.className =
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-rose-600";
      } else if (isViewed) {
        // Subtle muted slate indicating user has already inspected this property
        markerItem.pillBtn.className =
          "relative flex items-center justify-center font-bold px-3 py-1.5 rounded-full text-xs transition-all duration-200 bg-slate-200 text-slate-600 border border-slate-300 shadow-sm hover:scale-105 hover:bg-slate-300 hover:text-slate-800";
        markerItem.pointerCaret.className =
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-200 border-r border-b border-slate-300";
      } else if (mapStyleKey === "satellite") {
        markerItem.pillBtn.className =
          "relative flex items-center justify-center font-bold px-3 py-1.5 rounded-full text-xs transition-all duration-200 bg-slate-900/90 text-white border border-slate-700 shadow-md hover:scale-105 hover:bg-slate-800 backdrop-blur-sm";
        markerItem.pointerCaret.className =
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900";
      } else {
        // Default: Crisp white background, charcoal bold text, subtle shadow, pointer caret
        markerItem.pillBtn.className =
          "relative flex items-center justify-center font-bold px-3 py-1.5 rounded-full text-xs transition-all duration-200 bg-white text-slate-900 border border-slate-300/90 shadow-md hover:scale-105 hover:bg-slate-50";
        markerItem.pointerCaret.className =
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-white border-r border-b border-slate-300";
      }
    });
  }, [
    mappedProperties,
    selectedPropertyId,
    hoveredPropertyId,
    activeProperty?.id,
    isPropertyViewed,
    mapStyleKey,
    handlePropertyClick,
  ]);

  // Images for current active preview popup
  const activeImages = activeProperty?.displayImages || [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
  ];

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : activeImages.length - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev < activeImages.length - 1 ? prev + 1 : 0));
  };

  return (
    <div
      ref={mapContainerRef}
      className={`relative w-full h-full bg-slate-100 overflow-hidden select-none ${className}`}
    >
      {/* 1. Floating Toggle Switch: "Search as I move the map" (Top Center) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-slate-200/90 flex items-center gap-2 transition-all hover:shadow-xl">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isSearchAsMapMoves}
              onChange={(e) => handleToggleSearchAsMapMoves(e.target.checked)}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer accent-rose-600"
            />
            <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">
              Search as I move the map
            </span>
          </label>
        </div>
      </div>

      {/* 2. Top-Left Badge: MapLibre Engine Info Badge */}
      <div className="absolute top-4 left-4 z-30 max-w-[260px] pointer-events-auto hidden sm:block">
        <div className="inline-flex items-center gap-2 bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-medium px-3.5 py-2 rounded-xl shadow-lg border border-white/10">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="leading-tight">
            MapLibre GL • OpenFreeMap & Esri
          </span>
        </div>
      </div>

      {/* 3. Top-Right Map Controls: Style Switcher, 3D Tilt, Reset North, Zoom In/Out, Fit All */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-30 pointer-events-auto">
        {/* Style Switcher: Streets (Default), Satellite, Minimal */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 p-1 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => handleMapStyleChange("streets")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mapStyleKey === "streets" || mapStyleKey === "liberty"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Streets (Vibrant Vector Street Map)"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Streets</span>
          </button>
          <button
            type="button"
            onClick={() => handleMapStyleChange("satellite")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mapStyleKey === "satellite"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Esri Satellite (High-Res Aerial View)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Satellite</span>
          </button>
          <button
            type="button"
            onClick={() => handleMapStyleChange("minimal")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mapStyleKey === "minimal" || mapStyleKey === "positron"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Minimal (Warm Low-Contrast View)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Minimal</span>
          </button>
        </div>

        {/* 3D Tilt & Orientation Controls */}
        <div className="flex bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 overflow-hidden divide-x divide-slate-100">
          <button
            type="button"
            onClick={handleToggle3D}
            className={`flex-1 px-2.5 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              is3D
                ? "bg-rose-50 text-rose-600"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
            }`}
            title={is3D ? "Switch to 2D Top-Down View" : "Switch to 3D Extruded Buildings View"}
          >
            <Mountain className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-wider font-extrabold">3D</span>
            <Compass className={`w-3.5 h-3.5 transition-transform ${is3D ? "rotate-45" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleResetNorth}
            className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
            title="Reset Bearing to North"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom & Fit Controls */}
        <div className="flex flex-col bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 overflow-hidden divide-y divide-slate-100">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
            title="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
            title="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleFitAll}
            className="p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
            title="Fit all properties in view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Interactive Photo Carousel Popup Preview Card */}
      {activeProperty && (
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[92%] sm:w-84 md:w-92 max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-40 animate-in fade-in slide-in-from-bottom-3 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button (✕) */}
          <button
            type="button"
            onClick={() => {
              setActiveProperty(null);
              onSelectPropertyRef.current?.(null);
            }}
            className="absolute top-2.5 right-2.5 z-30 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white backdrop-blur-md transition-colors cursor-pointer"
            title="Close preview"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Favorite Heart Button */}
          <button
            type="button"
            onClick={(e) => handleToggleFavorite(e, activeProperty.id)}
            className="absolute top-2.5 left-2.5 z-30 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white backdrop-blur-md transition-all cursor-pointer active:scale-90"
            title={
              isPropertySaved(activeProperty.id) ? "Remove from saved" : "Save property"
            }
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isPropertySaved(activeProperty.id)
                  ? "fill-rose-500 text-rose-500"
                  : "text-white hover:text-rose-300"
              }`}
            />
          </button>

          <Link href={`/property/${activeProperty.id}`} className="block group">
            {/* Interactive Photo Carousel */}
            <div className="relative w-full h-44 bg-slate-900 overflow-hidden">
              <SafeImage
                src={activeImages[activeImageIndex] || activeImages[0]}
                alt={activeProperty.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Carousel Left / Right Controls */}
              {activeImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-opacity opacity-80 hover:opacity-100 cursor-pointer"
                    title="Previous image"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-opacity opacity-80 hover:opacity-100 cursor-pointer"
                    title="Next image"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Image index counter indicator badge */}
                  <div className="absolute bottom-2 right-2 z-20 bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    {activeImageIndex + 1} / {activeImages.length}
                  </div>
                </>
              )}

              {/* Verified Badge */}
              {activeProperty.isVerified && (
                <div className="absolute bottom-2 left-2 z-20 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified</span>
                </div>
              )}
            </div>

            {/* Micro-Card Details */}
            <div className="p-3.5">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="text-lg font-black text-slate-900 tracking-tight">
                  {formatPricePill(activeProperty.price)}
                </div>
                {isPropertyViewed(activeProperty.id) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    <Eye className="w-3 h-3" />
                    Viewed
                  </span>
                )}
              </div>

              <h4 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-rose-600 transition-colors">
                {activeProperty.title}
              </h4>

              <p className="text-xs text-slate-500 line-clamp-1 flex items-center mt-1">
                <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-slate-400" />
                {activeProperty.address || "Prime Location"}
              </p>

              {/* Amenities pill bar */}
              <div className="flex items-center gap-3 text-xs text-slate-600 pt-2.5 mt-2.5 border-t border-slate-100">
                {activeProperty.bedrooms !== undefined && activeProperty.bedrooms !== null && (
                  <div className="flex items-center gap-1 font-medium">
                    <Bed className="w-3.5 h-3.5 text-slate-400" />
                    <span>{activeProperty.bedrooms} bd</span>
                  </div>
                )}
                {activeProperty.bathrooms !== undefined && activeProperty.bathrooms !== null && (
                  <div className="flex items-center gap-1 font-medium">
                    <Bath className="w-3.5 h-3.5 text-slate-400" />
                    <span>{activeProperty.bathrooms} ba</span>
                  </div>
                )}
                {activeProperty.area_sqft && (
                  <div className="flex items-center gap-1 font-medium">
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>{activeProperty.area_sqft} sqft</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

export default MapboxView;
