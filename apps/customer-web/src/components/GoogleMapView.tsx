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
  Mountain,
  Info,
  Map as MapOutlineIcon,
} from "lucide-react";
import SafeImage from "./SafeImage";
import { formatPricePill } from "../utils/formatters";
export { formatPricePill };

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

export interface GoogleMapViewProps {
  properties: MapProperty[];
  selectedPropertyId?: string | null;
  hoveredPropertyId?: string | null;
  onSelectProperty?: (property: MapProperty | null) => void;
  onHoverProperty?: (propertyId: string | null) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  searchAsMapMoves?: boolean;
  onToggleSearchAsMapMoves?: (enabled: boolean) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

// Deterministic lat/lng generator for items missing coordinates
export function getDeterministicCoords(item: MapProperty, index: number): { lat: number; lng: number } {
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

export default function GoogleMapView({
  properties,
  selectedPropertyId,
  hoveredPropertyId,
  onSelectProperty,
  onHoverProperty,
  onBoundsChange,
  searchAsMapMoves = true,
  onToggleSearchAsMapMoves,
  center: defaultCenter,
  zoom: defaultZoom = 13,
  className = "",
}: GoogleMapViewProps) {
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "terrain">("roadmap");
  const [activeProperty, setActiveProperty] = useState<MapProperty | null>(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);
  const [billingErrorDetected, setBillingErrorDetected] = useState(false);

  // Controlled or internal "Search as I move the map"
  const [internalSearchAsMove, setInternalSearchAsMove] = useState(searchAsMapMoves);
  const isSearchAsMapMoves = searchAsMapMoves !== undefined ? searchAsMapMoves : internalSearchAsMove;

  const handleToggleSearchAsMapMoves = (val: boolean) => {
    setInternalSearchAsMove(val);
    onToggleSearchAsMapMoves?.(val);
  };

  // Google Map DOM & instance refs
  const mapElementRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<Map<string, any>>(new Map());

  // Debouncing and bounds tracker refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedBoundsRef = useRef<MapBounds | null>(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;

  const searchAsMoveRef = useRef(isSearchAsMapMoves);
  searchAsMoveRef.current = isSearchAsMapMoves;

  const onSelectPropertyRef = useRef(onSelectProperty);
  onSelectPropertyRef.current = onSelectProperty;

  const onHoverPropertyRef = useRef(onHoverProperty);
  onHoverPropertyRef.current = onHoverProperty;

  const hasInitialFitRef = useRef(false);

  // Fallback Simulation map transform state
  const [simCenter, setSimCenter] = useState<{ lat: number; lng: number }>(
    defaultCenter || { lat: 19.076, lng: 72.8777 }
  );
  const [simZoom, setSimZoom] = useState(defaultZoom);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Synchronize active property from prop
  useEffect(() => {
    if (selectedPropertyId) {
      const found = properties.find((p) => p.id === selectedPropertyId);
      if (found) setActiveProperty(found);
    }
  }, [selectedPropertyId, properties]);

  // Properties with resolved coordinates and formatting
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

  // Set initial simulation center if not provided
  useEffect(() => {
    if (!hasInitialFitRef.current && mappedProperties.length > 0) {
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

  // Check and dynamically load Google Maps JS API if key is present
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const isValidApiKey = Boolean(
    apiKey &&
    apiKey.trim() !== "" &&
    apiKey !== "YOUR_GOOGLE_MAPS_API_KEY" &&
    apiKey.length > 10
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Intercept Google Maps billing and auth console errors so Next.js doesn't show Redbox crash overlay
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const errorMsg = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
        .join(" ");

      if (
        errorMsg.includes("BillingNotEnabledMapError") ||
        errorMsg.includes("billing-not-enabled") ||
        errorMsg.includes("ApiNotActivatedMapError") ||
        errorMsg.includes("InvalidKeyMapError") ||
        errorMsg.includes("DeletedKeyMapError")
      ) {
        console.warn(
          "⚠️ [Google Maps Notice]: Google Cloud Billing is not enabled for this project. Activating interactive map view.",
          ...args
        );
        setBillingErrorDetected(true);
        setMapLoadError(true);
        setGoogleMapsLoaded(false);
        return; // Suppress from console.error to prevent Next.js Redbox modal
      }
      originalConsoleError.apply(console, args);
    };

    (window as any).gm_authFailure = () => {
      console.warn("Google Maps authentication or billing check failed. Switching to interactive vector map.");
      setBillingErrorDetected(true);
      setMapLoadError(true);
      setGoogleMapsLoaded(false);
    };

    if (!isValidApiKey) {
      setGoogleMapsLoaded(false);
      return () => {
        console.error = originalConsoleError;
      };
    }

    if ((window as any).google?.maps) {
      setGoogleMapsLoaded(true);
      return () => {
        console.error = originalConsoleError;
      };
    }

    const scriptId = "google-maps-script-loader";
    if (document.getElementById(scriptId)) {
      return () => {
        console.error = originalConsoleError;
      };
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if ((window as any).google?.maps) {
        setGoogleMapsLoaded(true);
      } else {
        setMapLoadError(true);
      }
    };

    script.onerror = () => {
      console.warn("Failed to load Google Maps script. Switching to interactive vector map.");
      setMapLoadError(true);
      setGoogleMapsLoaded(false);
    };

    document.head.appendChild(script);

    return () => {
      console.error = originalConsoleError;
    };
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

      const mapTypeId =
        mapType === "satellite"
          ? g.MapTypeId.HYBRID
          : mapType === "terrain"
          ? g.MapTypeId.TERRAIN
          : g.MapTypeId.ROADMAP;

      const map = new g.Map(mapElementRef.current, {
        center: initialCenter,
        zoom: defaultZoom,
        mapTypeId,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        clickableIcons: false,
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

      // Fit bounds once on initial load if multiple properties exist
      if (!hasInitialFitRef.current && mappedProperties.length > 1) {
        const bounds = new g.LatLngBounds();
        mappedProperties.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
        map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
        hasInitialFitRef.current = true;
      }

      // Google Maps 'idle' event listener for "Search as I move the map"
      const idleListener = map.addListener("idle", () => {
        if (!searchAsMoveRef.current) return;
        const bounds = map.getBounds();
        if (!bounds) return;

        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const calculatedBounds: MapBounds = {
          north: ne.lat(),
          south: sw.lat(),
          east: ne.lng(),
          west: sw.lng(),
        };

        triggerDebouncedBoundsChange(calculatedBounds);
      });

      // Background click closes popup
      const clickListener = map.addListener("click", () => {
        setActiveProperty(null);
        if (onSelectPropertyRef.current) {
          onSelectPropertyRef.current(null);
        }
      });

      return () => {
        if (g.event) {
          g.event.removeListener(idleListener);
          g.event.removeListener(clickListener);
        }
      };
    } catch (e) {
      console.error("Error initializing Google Map:", e);
      setMapLoadError(true);
    }
  }, [googleMapsLoaded, defaultCenter, defaultZoom, triggerDebouncedBoundsChange]);

  // Google Maps Custom Overlay implementation for Custom Price Pill Markers
  useEffect(() => {
    if (!googleMapsLoaded || !googleMapInstanceRef.current || !(window as any).google?.maps) {
      return;
    }

    const g = (window as any).google.maps;
    const map = googleMapInstanceRef.current;

    // Custom OverlayView Class
    class PricePillOverlay extends g.OverlayView {
      div: HTMLDivElement | null = null;
      property: any;
      position: any;
      onClick: () => void;
      onMouseEnter: () => void;
      onMouseLeave: () => void;
      isHighlighted: boolean = false;
      currentMapType: "roadmap" | "satellite" | "terrain";

      constructor(
        property: any,
        onClick: () => void,
        onMouseEnter: () => void,
        onMouseLeave: () => void,
        currentMapType: "roadmap" | "satellite" | "terrain",
        isHighlighted: boolean
      ) {
        super();
        this.property = property;
        this.position = new g.LatLng(property.lat, property.lng);
        this.onClick = onClick;
        this.onMouseEnter = onMouseEnter;
        this.onMouseLeave = onMouseLeave;
        this.currentMapType = currentMapType;
        this.isHighlighted = isHighlighted;
      }

      onAdd() {
        this.div = document.createElement("div");
        this.div.style.position = "absolute";
        this.div.style.cursor = "pointer";
        this.div.style.userSelect = "none";
        this.div.style.transform = "translate(-50%, -50%)";
        this.div.style.zIndex = this.isHighlighted ? "50" : "10";

        this.renderHtml();

        this.div.addEventListener("click", (e) => {
          e.stopPropagation();
          this.onClick();
        });
        this.div.addEventListener("mouseenter", () => {
          this.onMouseEnter();
        });
        this.div.addEventListener("mouseleave", () => {
          this.onMouseLeave();
        });

        const panes = this.getPanes();
        if (panes && panes.overlayMouseTarget) {
          panes.overlayMouseTarget.appendChild(this.div);
        }
      }

      draw() {
        const projection = this.getProjection();
        if (!projection || !this.div) return;
        const point = projection.fromLatLngToDivPixel(this.position);
        if (point) {
          this.div.style.left = `${point.x}px`;
          this.div.style.top = `${point.y}px`;
        }
      }

      onRemove() {
        if (this.div && this.div.parentElement) {
          this.div.parentElement.removeChild(this.div);
          this.div = null;
        }
      }

      setHighlighted(highlighted: boolean) {
        if (this.isHighlighted === highlighted) return;
        this.isHighlighted = highlighted;
        if (this.div) {
          this.div.style.zIndex = highlighted ? "50" : "10";
          this.renderHtml();
        }
      }

      setMapType(type: "roadmap" | "satellite" | "terrain") {
        if (this.currentMapType === type) return;
        this.currentMapType = type;
        if (this.div) {
          this.renderHtml();
        }
      }

      renderHtml() {
        if (!this.div) return;
        const isDark = this.currentMapType === "satellite";
        const pillClass = this.isHighlighted
          ? "bg-rose-600 text-white shadow-xl scale-110 ring-3 ring-white ring-offset-2 ring-offset-rose-600"
          : isDark
          ? "bg-slate-900/90 text-white border border-slate-700 shadow-md hover:scale-105 hover:bg-slate-800 backdrop-blur-sm"
          : "bg-white text-slate-900 border border-slate-300 shadow-md hover:scale-105 hover:bg-slate-50";

        const caretColor = this.isHighlighted
          ? "bg-rose-600"
          : isDark
          ? "bg-slate-900 border-r border-b border-slate-700"
          : "bg-white border-r border-b border-slate-300";

        this.div.innerHTML = `
          <button type="button" class="group relative flex items-center justify-center font-bold px-3 py-1.5 rounded-full text-xs transition-all duration-200 ${pillClass}">
            <span>${this.property.pricePill}</span>
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 transition-colors ${caretColor}"></div>
          </button>
        `;
      }
    }

    const currentMap = overlaysRef.current;
    const nextMap = new Map<string, any>();

    mappedProperties.forEach((property) => {
      const isHighlighted =
        property.id === hoveredPropertyId ||
        property.id === (selectedPropertyId || activeProperty?.id);

      if (currentMap.has(property.id)) {
        const existingOverlay = currentMap.get(property.id);
        existingOverlay.setHighlighted(isHighlighted);
        existingOverlay.setMapType(mapType);
        nextMap.set(property.id, existingOverlay);
        currentMap.delete(property.id);
      } else {
        const overlay = new PricePillOverlay(
          property,
          () => {
            setActiveProperty(property);
            if (onSelectPropertyRef.current) {
              onSelectPropertyRef.current(property);
            }
          },
          () => {
            if (onHoverPropertyRef.current) {
              onHoverPropertyRef.current(property.id);
            }
          },
          () => {
            if (onHoverPropertyRef.current) {
              onHoverPropertyRef.current(null);
            }
          },
          mapType,
          isHighlighted
        );
        overlay.setMap(map);
        nextMap.set(property.id, overlay);
      }
    });

    // Remove old overlays
    currentMap.forEach((overlay) => {
      overlay.setMap(null);
    });

    overlaysRef.current = nextMap;

    return () => {
      // Keep overlays active across property updates
    };
  }, [
    googleMapsLoaded,
    mappedProperties,
    hoveredPropertyId,
    selectedPropertyId,
    activeProperty?.id,
    mapType,
  ]);

  // Clean up all Google Maps overlays on unmount
  useEffect(() => {
    return () => {
      overlaysRef.current.forEach((overlay) => {
        overlay.setMap(null);
      });
      overlaysRef.current.clear();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Update map type for real Google Map
  const handleMapTypeChange = (newType: "roadmap" | "satellite" | "terrain") => {
    setMapType(newType);
    if (googleMapInstanceRef.current && (window as any).google?.maps) {
      const g = (window as any).google.maps;
      let targetTypeId = g.MapTypeId.ROADMAP;
      if (newType === "satellite") targetTypeId = g.MapTypeId.HYBRID;
      if (newType === "terrain") targetTypeId = g.MapTypeId.TERRAIN;
      googleMapInstanceRef.current.setMapTypeId(targetTypeId);
    }
  };

  // Map Controls: Zoom in/out, fit all
  const handleZoomIn = () => {
    if (googleMapInstanceRef.current && typeof googleMapInstanceRef.current.getZoom === "function") {
      googleMapInstanceRef.current.setZoom(googleMapInstanceRef.current.getZoom() + 1);
    } else {
      const newZoom = Math.min(simZoom + 1, 18);
      setSimZoom(newZoom);
      triggerFallbackBounds(simCenter, newZoom);
    }
  };

  const handleZoomOut = () => {
    if (googleMapInstanceRef.current && typeof googleMapInstanceRef.current.getZoom === "function") {
      googleMapInstanceRef.current.setZoom(googleMapInstanceRef.current.getZoom() - 1);
    } else {
      const newZoom = Math.max(simZoom - 1, 8);
      setSimZoom(newZoom);
      triggerFallbackBounds(simCenter, newZoom);
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
      const newCenter = { lat: avgLat, lng: avgLng };
      const newZoom = 13;
      setSimCenter(newCenter);
      setSimZoom(newZoom);
      triggerFallbackBounds(newCenter, newZoom);
    }
  };

  // Helper for Fallback simulated bounds
  const triggerFallbackBounds = (center: { lat: number; lng: number }, zoom: number) => {
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    const scaleFactor = 0.00008 * Math.pow(2, 13 - zoom);
    const bounds: MapBounds = {
      north: center.lat + (height / 2) * scaleFactor,
      south: center.lat - (height / 2) * scaleFactor,
      east: center.lng + (width / 2) * scaleFactor,
      west: center.lng - (width / 2) * scaleFactor,
    };
    triggerDebouncedBoundsChange(bounds);
  };

  // Fallback Simulation Drag & Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (googleMapsLoaded && !mapLoadError) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart || (googleMapsLoaded && !mapLoadError)) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    const scaleFactor = 0.00008 * Math.pow(2, 13 - simZoom);
    const newCenter = {
      lat: simCenter.lat + dy * scaleFactor,
      lng: simCenter.lng - dx * scaleFactor,
    };
    setSimCenter(newCenter);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      triggerFallbackBounds(simCenter, simZoom);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (googleMapsLoaded && !mapLoadError) return;
    e.preventDefault();
    const newZoom = e.deltaY < 0 ? Math.min(simZoom + 0.5, 18) : Math.max(simZoom - 0.5, 8);
    setSimZoom(newZoom);
    triggerFallbackBounds(simCenter, newZoom);
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
      {/* Real Google Map Canvas (when API key is active) */}
      {googleMapsLoaded && !mapLoadError && (
        <div ref={mapElementRef} className="absolute inset-0 w-full h-full z-0" />
      )}

      {/* Fallback Interactive Vector / Satellite / Terrain Canvas (when API key is missing or failed) */}
      {(!googleMapsLoaded || mapLoadError) && (
        <div
          className="absolute inset-0 w-full h-full z-0 overflow-hidden"
          onClick={() => {
            setActiveProperty(null);
            if (onSelectProperty) onSelectProperty(null);
          }}
        >
          {/* Base Vector Canvas */}
          <div
            className={`absolute inset-0 transition-colors duration-500 ${
              mapType === "satellite"
                ? "bg-[#0a1526]"
                : mapType === "terrain"
                ? "bg-[#edf4ea]"
                : "bg-[#eef2f6]"
            }`}
          >
            <svg
              className="absolute inset-0 w-full h-full opacity-70"
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
                  ) : mapType === "terrain" ? (
                    <>
                      <path
                        d="M 60 0 L 0 0 0 60"
                        fill="none"
                        stroke="rgba(101,163,13,0.12)"
                        strokeWidth="1"
                      />
                      <circle cx="30" cy="30" r="1" fill="rgba(132,204,22,0.2)" />
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
                    stroke={
                      mapType === "satellite"
                        ? "rgba(255,255,255,0.12)"
                        : mapType === "terrain"
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(255,255,255,0.9)"
                    }
                    strokeWidth={mapType === "satellite" ? "2" : "5"}
                  />
                  <path
                    d="M 0 120 Q 120 140 240 120"
                    fill="none"
                    stroke={
                      mapType === "satellite"
                        ? "rgba(251,191,36,0.3)"
                        : mapType === "terrain"
                        ? "rgba(234,179,8,0.4)"
                        : "rgba(254,240,138,0.8)"
                    }
                    strokeWidth="3"
                  />
                </pattern>
              </defs>

              {/* Water body simulation */}
              <path
                d="M -100 320 C 150 240, 300 460, 600 390 C 850 330, 1100 510, 1400 430 L 1400 900 L -100 900 Z"
                fill={
                  mapType === "satellite"
                    ? "#061320"
                    : mapType === "terrain"
                    ? "#bae6fd"
                    : "#c6e2ff"
                }
                opacity={mapType === "satellite" ? "0.95" : "0.75"}
              />

              {/* Terrain elevation contours / parks */}
              {mapType === "terrain" ? (
                <>
                  <path
                    d="M 0 80 Q 200 20, 500 90 T 1000 70 T 1500 120"
                    fill="none"
                    stroke="rgba(101,163,13,0.3)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M 0 140 Q 250 80, 550 150 T 1100 130 T 1500 180"
                    fill="none"
                    stroke="rgba(101,163,13,0.3)"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M 0 200 Q 300 140, 600 210 T 1200 190 T 1500 240"
                    fill="none"
                    stroke="rgba(101,163,13,0.25)"
                    strokeWidth="1.5"
                    strokeDasharray="6 3"
                  />
                  <circle cx="280" cy="170" r="110" fill="rgba(190,242,100,0.35)" />
                  <circle cx="820" cy="220" r="160" fill="rgba(163,230,53,0.25)" />
                </>
              ) : (
                <>
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
                </>
              )}

              {/* Grid overlay */}
              <rect width="100%" height="100%" fill={`url(#map-grid-${mapType})`} />
              <rect width="100%" height="100%" fill="url(#road-lines)" />
            </svg>

            {/* City landmark badges */}
            <div className="absolute top-14 left-1/4 pointer-events-none opacity-40">
              <span
                className={`text-[11px] font-bold tracking-wider uppercase ${
                  mapType === "satellite" ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Central District
              </span>
            </div>
            <div className="absolute bottom-24 right-1/3 pointer-events-none opacity-40">
              <span
                className={`text-[11px] font-bold tracking-wider uppercase ${
                  mapType === "satellite" ? "text-slate-400" : "text-slate-500"
                }`}
              >
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
                const isSelected =
                  selectedPropertyId === property.id || activeProperty?.id === property.id;
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

      {/* Floating Toggle Pill: "Search as I move the map" (Top Center) */}
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

      {/* Informational Banner (Top Left) */}
      {billingErrorDetected && (
        <div className="absolute top-4 left-4 z-30 max-w-[260px] sm:max-w-sm pointer-events-auto">
          <div className="inline-flex items-center gap-2 bg-amber-950/90 text-amber-100 text-[11px] font-medium px-3 py-1.5 rounded-xl shadow-lg border border-amber-500/30 backdrop-blur-md">
            <Info className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              Google Cloud Billing not linked yet. Showing interactive map view. Link billing in Google Cloud to activate official tiles.
            </span>
          </div>
        </div>
      )}

      {!isValidApiKey && !billingErrorDetected && (
        <div className="absolute top-4 left-4 z-30 max-w-[200px] sm:max-w-xs pointer-events-none hidden sm:block">
          <div className="inline-flex items-center gap-2 bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-medium px-3 py-1.5 rounded-full shadow-lg border border-white/10">
            <Info className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">
              Tip: Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local to activate official Google Maps tiles
            </span>
          </div>
        </div>
      )}

      {/* Floating Map Controls (Top Right): Roadmap, Satellite, Terrain Switcher + Zoom */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-30 pointer-events-auto">
        {/* Layer Controls */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 p-1 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => handleMapTypeChange("roadmap")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mapType === "roadmap"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Roadmap View"
          >
            <MapOutlineIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Map</span>
          </button>
          <button
            type="button"
            onClick={() => handleMapTypeChange("satellite")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mapType === "satellite"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Satellite Imagery View"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Satellite</span>
          </button>
          <button
            type="button"
            onClick={() => handleMapTypeChange("terrain")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mapType === "terrain"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Terrain Topographic View"
          >
            <Mountain className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Terrain</span>
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
            title="Fit all homes in view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Micro-Card Preview Popup directly on the map */}
      {activeProperty && (
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[92%] sm:w-84 md:w-88 max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-40 animate-in fade-in slide-in-from-bottom-3 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button (✕) */}
          <button
            type="button"
            onClick={() => {
              setActiveProperty(null);
              if (onSelectProperty) onSelectProperty(null);
            }}
            className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white backdrop-blur-md transition-colors cursor-pointer"
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
