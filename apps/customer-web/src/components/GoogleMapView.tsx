"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  Layers,
  Plus,
  Minus,
  Maximize2,
  X,
  Bed,
  Bath,
  Square,
  ShieldCheck,
  Navigation,
  ExternalLink,
  Info,
} from "lucide-react";
import SafeImage from "./SafeImage";

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

export interface GoogleMapViewProps {
  properties: MapProperty[];
  selectedPropertyId?: string | null;
  hoveredPropertyId?: string | null;
  onSelectProperty?: (property: MapProperty | null) => void;
  onHoverProperty?: (propertyId: string | null) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

import { formatPricePill } from "../utils/formatters";
export { formatPricePill };

// Deterministic lat/lng generator for items missing coordinates
function getDeterministicCoords(item: MapProperty, index: number): { lat: number; lng: number } {
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

  // Base center: Mumbai (or hash based on title/address)
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

  // Pseudo-random offset based on ID or index
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

export default function GoogleMapView({
  properties,
  selectedPropertyId,
  hoveredPropertyId,
  onSelectProperty,
  onHoverProperty,
  center: defaultCenter,
  zoom: defaultZoom = 13,
  className = "",
}: GoogleMapViewProps) {
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [activeProperty, setActiveProperty] = useState<MapProperty | null>(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);

  // Fallback Interactive Canvas/Vector Map state
  const containerRef = useRef<HTMLDivElement>(null);
  const mapElementRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Simulation map transform state
  const [simCenter, setSimCenter] = useState<{ lat: number; lng: number }>(
    defaultCenter || { lat: 19.076, lng: 72.8777 }
  );
  const [simZoom, setSimZoom] = useState(defaultZoom);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Synchronize active property from prop or internal state
  useEffect(() => {
    if (selectedPropertyId) {
      const found = properties.find((p) => p.id === selectedPropertyId);
      if (found) setActiveProperty(found);
    }
  }, [selectedPropertyId, properties]);

  // Properties with resolved coordinates
  const mappedProperties = useMemo(() => {
    return properties.map((prop, idx) => {
      const coords = getDeterministicCoords(prop, idx);
      const firstImage =
        prop.property_media?.[0]?.url ||
        prop.images?.[0] ||
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80";
      return {
        ...prop,
        lat: coords.lat,
        lng: coords.lng,
        displayImage: firstImage,
        pricePill: formatPricePill(prop.price),
      };
    });
  }, [properties]);

  // Center on average coords when properties change
  useEffect(() => {
    if (mappedProperties.length > 0) {
      const avgLat =
        mappedProperties.reduce((acc, p) => acc + p.lat, 0) / mappedProperties.length;
      const avgLng =
        mappedProperties.reduce((acc, p) => acc + p.lng, 0) / mappedProperties.length;
      setSimCenter({ lat: avgLat, lng: avgLng });
    }
  }, [mappedProperties]);

  // Pan to hovered or selected property
  useEffect(() => {
    const targetId = hoveredPropertyId || selectedPropertyId;
    if (targetId) {
      const target = mappedProperties.find((p) => p.id === targetId);
      if (target) {
        if (googleMapInstanceRef.current && typeof googleMapInstanceRef.current.panTo === "function") {
          googleMapInstanceRef.current.panTo({ lat: target.lat, lng: target.lng });
        } else {
          setSimCenter({ lat: target.lat, lng: target.lng });
        }
      }
    }
  }, [hoveredPropertyId, selectedPropertyId, mappedProperties]);

  // Check and dynamically load Google Maps JS API if key is set
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const isValidApiKey = Boolean(apiKey && apiKey !== "YOUR_GOOGLE_MAPS_API_KEY" && apiKey.length > 10);

  useEffect(() => {
    if (!isValidApiKey) {
      setGoogleMapsLoaded(false);
      return;
    }

    if (typeof window !== "undefined" && (window as any).google?.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    const scriptId = "google-maps-script-loader";
    if (document.getElementById(scriptId)) {
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setGoogleMapsLoaded(true);
    };

    script.onerror = () => {
      console.warn("Failed to load Google Maps script. Switching to interactive vector map.");
      setMapLoadError(true);
      setGoogleMapsLoaded(false);
    };

    document.head.appendChild(script);
  }, [apiKey, isValidApiKey]);

  // Initialize Real Google Map if loaded
  useEffect(() => {
    if (!googleMapsLoaded || !mapElementRef.current || !(window as any).google?.maps) {
      return;
    }

    try {
      const g = (window as any).google.maps;
      const initialCenter = defaultCenter || {
        lat: mappedProperties[0]?.lat || 19.076,
        lng: mappedProperties[0]?.lng || 72.8777,
      };

      const map = new g.Map(mapElementRef.current, {
        center: initialCenter,
        zoom: defaultZoom,
        mapTypeId: mapType === "satellite" ? g.MapTypeId.HYBRID : g.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        zoomControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "transit",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      googleMapInstanceRef.current = map;

      // Fit bounds if multiple properties
      if (mappedProperties.length > 1) {
        const bounds = new g.LatLngBounds();
        mappedProperties.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      }
    } catch (e) {
      console.error("Error initializing Google Map:", e);
      setMapLoadError(true);
    }
  }, [googleMapsLoaded, mapType, defaultCenter, defaultZoom, mappedProperties]);

  // Update map type for real Google Map
  useEffect(() => {
    if (googleMapInstanceRef.current && (window as any).google?.maps) {
      const g = (window as any).google.maps;
      googleMapInstanceRef.current.setMapTypeId(
        mapType === "satellite" ? g.MapTypeId.HYBRID : g.MapTypeId.ROADMAP
      );
    }
  }, [mapType]);

  // Map Controls: Zoom in/out, fit all
  const handleZoomIn = () => {
    if (googleMapInstanceRef.current && typeof googleMapInstanceRef.current.getZoom === "function") {
      googleMapInstanceRef.current.setZoom(googleMapInstanceRef.current.getZoom() + 1);
    } else {
      setSimZoom((prev) => Math.min(prev + 1, 18));
    }
  };

  const handleZoomOut = () => {
    if (googleMapInstanceRef.current && typeof googleMapInstanceRef.current.getZoom === "function") {
      googleMapInstanceRef.current.setZoom(googleMapInstanceRef.current.getZoom() - 1);
    } else {
      setSimZoom((prev) => Math.max(prev - 1, 8));
    }
  };

  const handleFitAll = () => {
    if (mappedProperties.length === 0) return;

    if (googleMapInstanceRef.current && (window as any).google?.maps) {
      const g = (window as any).google.maps;
      const bounds = new g.LatLngBounds();
      mappedProperties.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      googleMapInstanceRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    } else {
      const avgLat = mappedProperties.reduce((acc, p) => acc + p.lat, 0) / mappedProperties.length;
      const avgLng = mappedProperties.reduce((acc, p) => acc + p.lng, 0) / mappedProperties.length;
      setSimCenter({ lat: avgLat, lng: avgLng });
      setSimZoom(13);
    }
  };

  // Fallback Simulation Drag & Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (googleMapsLoaded) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart || googleMapsLoaded) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    // Convert pixel delta to lat/lng delta based on zoom
    const scaleFactor = 0.00008 * Math.pow(2, 13 - simZoom);
    setSimCenter((prev) => ({
      lat: prev.lat + dy * scaleFactor,
      lng: prev.lng - dx * scaleFactor,
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (googleMapsLoaded) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      setSimZoom((prev) => Math.min(prev + 0.5, 18));
    } else {
      setSimZoom((prev) => Math.max(prev - 0.5, 8));
    }
  };

  // Coordinate Projector for Fallback Map
  const projectCoords = useCallback(
    (lat: number, lng: number, width: number, height: number) => {
      const scale = Math.pow(2, simZoom) * 45;
      const x = width / 2 + (lng - simCenter.lng) * scale;
      const y = height / 2 - (lat - simCenter.lat) * scale;
      return { x, y };
    },
    [simCenter, simZoom]
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-slate-100 overflow-hidden select-none ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {/* Real Google Map Container (when API key is active) */}
      {googleMapsLoaded && !mapLoadError && (
        <div ref={mapElementRef} className="absolute inset-0 w-full h-full z-0" />
      )}

      {/* Fallback Interactive Vector / Satellite Canvas (when API key is not present) */}
      {(!googleMapsLoaded || mapLoadError) && (
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
          {/* Base Vector Canvas */}
          <div
            className={`absolute inset-0 transition-colors duration-500 ${
              mapType === "satellite"
                ? "bg-[#0b192c]"
                : "bg-[#e8ecef]"
            }`}
          >
            {/* Ambient Background Grid / Roads simulation */}
            <svg
              className="absolute inset-0 w-full h-full opacity-60"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id={`map-grid-${mapType}`}
                  width={mapType === "satellite" ? "80" : "60"}
                  height={mapType === "satellite" ? "80" : "60"}
                  patternUnits="userSpaceOnUse"
                >
                  {mapType === "satellite" ? (
                    <>
                      <path
                        d="M 80 0 L 0 0 0 80"
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="1"
                      />
                      <circle cx="40" cy="40" r="1.5" fill="rgba(255,255,255,0.15)" />
                    </>
                  ) : (
                    <>
                      <path
                        d="M 60 0 L 0 0 0 60"
                        fill="none"
                        stroke="rgba(203,213,225,0.5)"
                        strokeWidth="1"
                      />
                      <circle cx="30" cy="30" r="1" fill="rgba(148,163,184,0.4)" />
                    </>
                  )}
                </pattern>

                {/* Road patterns */}
                <pattern id="road-lines" width="240" height="240" patternUnits="userSpaceOnUse">
                  <path
                    d="M 0 60 Q 120 40 240 60 M 60 0 Q 80 120 60 240 M 0 180 Q 120 200 240 180"
                    fill="none"
                    stroke={mapType === "satellite" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.9)"}
                    strokeWidth={mapType === "satellite" ? "2" : "5"}
                  />
                  <path
                    d="M 0 120 Q 120 140 240 120"
                    fill="none"
                    stroke={mapType === "satellite" ? "rgba(251,191,36,0.3)" : "rgba(254,240,138,0.8)"}
                    strokeWidth="3"
                  />
                </pattern>
              </defs>

              {/* Water body simulation */}
              <path
                d="M -100 300 C 150 220, 300 450, 600 380 C 850 320, 1100 500, 1400 420 L 1400 900 L -100 900 Z"
                fill={mapType === "satellite" ? "#061320" : "#c6e2ff"}
                opacity={mapType === "satellite" ? "0.9" : "0.75"}
              />

              {/* Parks / Greenery simulation */}
              <rect
                x="15%"
                y="20%"
                width="140"
                height="110"
                rx="20"
                fill={mapType === "satellite" ? "#0e2918" : "#d1fae5"}
                opacity="0.8"
              />
              <rect
                x="65%"
                y="55%"
                width="180"
                height="130"
                rx="30"
                fill={mapType === "satellite" ? "#0e2918" : "#d1fae5"}
                opacity="0.8"
              />

              {/* Grid overlay */}
              <rect width="100%" height="100%" fill={`url(#map-grid-${mapType})`} />
              <rect width="100%" height="100%" fill="url(#road-lines)" />
            </svg>

            {/* City landmark badges */}
            <div className="absolute top-12 left-1/4 pointer-events-none opacity-40">
              <span className={`text-[11px] font-bold tracking-wider uppercase ${
                mapType === "satellite" ? "text-slate-400" : "text-slate-500"
              }`}>
                Central District
              </span>
            </div>
            <div className="absolute bottom-20 right-1/3 pointer-events-none opacity-40">
              <span className={`text-[11px] font-bold tracking-wider uppercase ${
                mapType === "satellite" ? "text-slate-400" : "text-slate-500"
              }`}>
                Bayfront & Promenade
              </span>
            </div>
          </div>

          {/* Fallback Plotted Markers */}
          <div className="absolute inset-0 pointer-events-none">
            {containerRef.current &&
              mappedProperties.map((property) => {
                const width = containerRef.current?.clientWidth || 800;
                const height = containerRef.current?.clientHeight || 600;
                const { x, y } = projectCoords(property.lat, property.lng, width, height);

                // Keep marker visible within or near bounds
                if (x < -100 || x > width + 100 || y < -100 || y > height + 100) {
                  return null;
                }

                const isHovered = hoveredPropertyId === property.id;
                const isSelected = selectedPropertyId === property.id || activeProperty?.id === property.id;
                const isHighlighted = isHovered || isSelected;

                return (
                  <div
                    key={property.id}
                    className="absolute pointer-events-auto transition-transform duration-200"
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: "translate(-50%, -50%)",
                      zIndex: isHighlighted ? 40 : 10,
                    }}
                    onMouseEnter={() => {
                      if (onHoverProperty) onHoverProperty(property.id);
                    }}
                    onMouseLeave={() => {
                      if (onHoverProperty) onHoverProperty(null);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveProperty(property);
                      if (onSelectProperty) onSelectProperty(property);
                    }}
                  >
                    {/* Custom HTML Price Pill Marker */}
                    <button
                      type="button"
                      className={`group relative flex items-center justify-center font-bold px-3 py-1.5 rounded-full text-xs transition-all duration-200 ${
                        isHighlighted
                          ? "bg-rose-600 text-white shadow-xl scale-115 ring-3 ring-white/90 ring-offset-2 ring-offset-rose-600"
                          : mapType === "satellite"
                          ? "bg-slate-900/90 text-white border border-slate-700 shadow-md hover:scale-105 hover:bg-slate-800 backdrop-blur-sm"
                          : "bg-white text-slate-900 border border-slate-300/90 shadow-md hover:scale-105 hover:bg-slate-50"
                      }`}
                    >
                      <span>{property.pricePill}</span>

                      {/* Small marker pin pointer dot */}
                      <div
                        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 transition-colors ${
                          isHighlighted
                            ? "bg-rose-600"
                            : mapType === "satellite"
                            ? "bg-slate-900"
                            : "bg-white border-r border-b border-slate-300"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Floating Map Controls (Top Right) */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
        {/* Satellite / Roadmap Switcher Toggle */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 p-1 flex items-center">
          <button
            type="button"
            onClick={() => setMapType("roadmap")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mapType === "roadmap"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Standard Roadmap View"
          >
            <span>Map</span>
          </button>
          <button
            type="button"
            onClick={() => setMapType("satellite")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mapType === "satellite"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Satellite Imagery View"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Satellite</span>
          </button>
        </div>

        {/* Zoom & Fit Controls */}
        <div className="flex flex-col bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 overflow-hidden divide-y divide-slate-100">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center"
            title="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center"
            title="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleFitAll}
            className="p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center"
            title="Fit all homes in view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Simulation / API Mode Banner */}
      {!isValidApiKey && (
        <div className="absolute top-4 left-4 z-30">
          <div className="inline-flex items-center gap-2 bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-medium px-3 py-1.5 rounded-full shadow-lg border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Interactive Map Active</span>
          </div>
        </div>
      )}

      {/* Selected / Hovered Mini Property Card Popover (Airbnb/Zillow Style) */}
      {activeProperty && (
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[92%] sm:w-80 md:w-88 max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-40 animate-in fade-in slide-in-from-bottom-3 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              setActiveProperty(null);
              if (onSelectProperty) onSelectProperty(null);
            }}
            className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white backdrop-blur-md transition-colors"
            title="Close preview"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <Link href={`/property/${activeProperty.id}`} className="flex group">
            {/* Thumbnail */}
            <div className="relative w-32 h-28 sm:w-36 sm:h-32 flex-shrink-0 bg-slate-100 overflow-hidden">
              <SafeImage
                src={
                  activeProperty.property_media?.[0]?.url ||
                  activeProperty.images?.[0] ||
                  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80"
                }
                alt={activeProperty.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {activeProperty.isVerified && (
                <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>Verified</span>
                </div>
              )}
            </div>

            {/* Content Details */}
            <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
              <div>
                <div className="text-base font-extrabold text-slate-900 mb-0.5">
                  {formatPricePill(activeProperty.price)}
                </div>
                <h4 className="text-xs font-semibold text-slate-800 line-clamp-1 group-hover:text-rose-600 transition-colors">
                  {activeProperty.title}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-1 flex items-center mt-0.5">
                  <MapPin className="w-3 h-3 mr-0.5 flex-shrink-0 text-slate-400" />
                  {activeProperty.address || "Prime Location"}
                </p>
              </div>

              {/* Amenities */}
              <div className="flex items-center gap-3 text-[11px] text-slate-600 pt-1.5 border-t border-slate-100">
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
