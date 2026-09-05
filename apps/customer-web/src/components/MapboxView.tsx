"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
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

export const MAPBOX_STYLES = {
  light: "mapbox://styles/mapbox/light-v11",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  streets: "mapbox://styles/mapbox/streets-v12",
} as const;

export type MapboxStyleKey = keyof typeof MAPBOX_STYLES;

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
  // Token validation
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
  const isValidToken = Boolean(
    mapboxToken &&
    mapboxToken.trim() !== "" &&
    mapboxToken.startsWith("pk.") &&
    mapboxToken.length > 20
  );

  // States
  const [mapStyleKey, setMapStyleKey] = useState<MapboxStyleKey>("light");
  const [is3D, setIs3D] = useState(defaultPitch > 20);
  const [activeProperty, setActiveProperty] = useState<MapProperty | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [internalViewedIds, setInternalViewedIds] = useState<Set<string>>(new Set());
  const [internalSavedIds, setInternalSavedIds] = useState<Set<string>>(new Set(savedPropertyIds));

  // "Search as I move the map"
  const [internalSearchAsMove, setInternalSearchAsMove] = useState(searchAsMapMoves);
  const isSearchAsMapMoves =
    searchAsMapMoves !== undefined ? searchAsMapMoves : internalSearchAsMove;

  const handleToggleSearchAsMapMoves = (val: boolean) => {
    setInternalSearchAsMove(val);
    onToggleSearchAsMapMoves?.(val);
  };

  // Fallback map simulation state (when token is missing or invalid)
  const [simCenter, setSimCenter] = useState<{ lat: number; lng: number }>(
    defaultCenter || { lat: 19.076, lng: 72.8777 }
  );
  const [simZoom, setSimZoom] = useState(defaultZoom);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // DOM and Mapbox refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<
    Map<
      string,
      {
        marker: mapboxgl.Marker;
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

  // Sync external saved IDs
  useEffect(() => {
    setInternalSavedIds(new Set(savedPropertyIds));
  }, [savedPropertyIds]);

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

  // Keep fallback center aligned
  useEffect(() => {
    if (!isValidToken && mappedProperties.length > 0) {
      setSimCenter(averageCenter);
    }
  }, [isValidToken, averageCenter, mappedProperties.length]);

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

  // Helper to add 3D building layer
  const add3DBuildingsLayer = useCallback((map: mapboxgl.Map) => {
    try {
      const style = map.getStyle();
      if (!style || !style.layers) return;
      const layers = style.layers;
      const labelLayerId = layers.find(
        (l) => l.type === "symbol" && (l.layout as any)?.["text-field"]
      )?.id;

      if (!map.getLayer("3d-buildings")) {
        map.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#e2e8f0",
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "min_height"],
              "fill-extrusion-opacity": 0.6,
            },
          },
          labelLayerId
        );
      }
    } catch (err) {
      console.warn("Could not inject 3D buildings layer:", err);
    }
  }, []);

  // Initialize Mapbox instance
  useEffect(() => {
    if (!isValidToken || !mapContainerRef.current) return;

    mapboxgl.accessToken = mapboxToken;

    const initialCenter: [number, number] = [averageCenter.lng, averageCenter.lat];

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_STYLES[mapStyleKey],
      center: initialCenter,
      zoom: defaultZoom,
      pitch: defaultPitch,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      add3DBuildingsLayer(map);
    });

    map.on("style.load", () => {
      add3DBuildingsLayer(map);
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
      setIs3D(map.getPitch() > 25);
    });

    mapInstanceRef.current = map;

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isValidToken, mapboxToken]);

  // Switch Map Style dynamically
  const handleMapStyleChange = (key: MapboxStyleKey) => {
    setMapStyleKey(key);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setStyle(MAPBOX_STYLES[key]);
    }
  };

  // Toggle 3D pitch
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
    } else {
      setSimZoom((prev) => Math.min(prev + 0.6, 18));
      triggerFallbackBounds(simCenter, simZoom + 0.6);
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut({ duration: 300 });
    } else {
      setSimZoom((prev) => Math.max(prev - 0.6, 8));
      triggerFallbackBounds(simCenter, simZoom - 0.6);
    }
  };

  // Fit all properties
  const handleFitAll = () => {
    if (mappedProperties.length === 0) return;

    if (mapInstanceRef.current) {
      const bounds = new mapboxgl.LngLatBounds();
      mappedProperties.forEach((p) => {
        bounds.extend([p.lng, p.lat]);
      });
      mapInstanceRef.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 15,
        duration: 800,
      });
    } else {
      setSimCenter(averageCenter);
      setSimZoom(12.5);
      triggerFallbackBounds(averageCenter, 12.5);
    }
  };

  // Pan to hovered or selected property
  useEffect(() => {
    const targetId = hoveredPropertyId || selectedPropertyId;
    if (targetId) {
      const target = mappedProperties.find((p) => p.id === targetId);
      if (target) {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.easeTo({
            center: [target.lng, target.lat],
            duration: 600,
          });
        } else {
          setSimCenter({ lat: target.lat, lng: target.lng });
        }
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

    setInternalSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(propId)) {
        next.delete(propId);
      } else {
        next.add(propId);
      }
      return next;
    });

    onToggleSave?.(propId);
  };

  // Update or Create Mapbox Markers
  useEffect(() => {
    if (!isValidToken || !mapInstanceRef.current) return;
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
        el.className = "mapbox-marker-container cursor-pointer select-none transition-transform duration-200";

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

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: "bottom",
        })
          .setLngLat([property.lng, property.lat])
          .addTo(map);

        markerItem = { marker, element: el, pillBtn, pointerCaret };
        markersRef.current.set(property.id, markerItem);
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
    isValidToken,
    mappedProperties,
    selectedPropertyId,
    hoveredPropertyId,
    activeProperty?.id,
    isPropertyViewed,
    mapStyleKey,
    handlePropertyClick,
  ]);

  // Fallback map bounds calculator
  const triggerFallbackBounds = useCallback(
    (centerCoord: { lat: number; lng: number }, currentZoom: number) => {
      const latDelta = 0.08 * Math.pow(2, 12 - currentZoom);
      const lngDelta = 0.12 * Math.pow(2, 12 - currentZoom);
      triggerDebouncedBoundsChange({
        north: centerCoord.lat + latDelta,
        south: centerCoord.lat - latDelta,
        east: centerCoord.lng + lngDelta,
        west: centerCoord.lng - lngDelta,
      });
    },
    [triggerDebouncedBoundsChange]
  );

  // Fallback drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isValidToken) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isValidToken || !isDragging || !dragStart) return;
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
    if (!isValidToken && isDragging) {
      setIsDragging(false);
      setDragStart(null);
      triggerFallbackBounds(simCenter, simZoom);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isValidToken) return;
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
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: !isValidToken ? (isDragging ? "grabbing" : "grab") : undefined }}
    >
      {/* 1. Graceful Interactive Fallback Canvas (when Token is missing or invalid) */}
      {!isValidToken && (
        <div
          className="absolute inset-0 w-full h-full z-0 overflow-hidden"
          onClick={() => {
            setActiveProperty(null);
            onSelectProperty?.(null);
          }}
        >
          {/* Base Vector Canvas */}
          <div
            className={`absolute inset-0 transition-colors duration-500 ${
              mapStyleKey === "satellite"
                ? "bg-[#0a1526]"
                : mapStyleKey === "streets"
                ? "bg-[#e5ecf4]"
                : "bg-[#f8fafc]"
            }`}
            style={{
              transform: is3D ? "perspective(900px) rotateX(25deg) scale(1.05)" : "none",
              transformOrigin: "center bottom",
              transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <svg
              className="absolute inset-0 w-full h-full opacity-70"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id={`mapbox-grid-${mapStyleKey}`}
                  width={mapStyleKey === "satellite" ? "80" : "60"}
                  height={mapStyleKey === "satellite" ? "80" : "60"}
                  patternUnits="userSpaceOnUse"
                >
                  {mapStyleKey === "satellite" ? (
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
                        stroke="rgba(203,213,225,0.4)"
                        strokeWidth="1"
                      />
                      <circle cx="30" cy="30" r="1" fill="rgba(148,163,184,0.35)" />
                    </>
                  )}
                </pattern>

                <pattern
                  id="mapbox-roads"
                  width="240"
                  height="240"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 0 60 Q 120 40 240 60 M 60 0 Q 80 120 60 240 M 0 180 Q 120 200 240 180"
                    fill="none"
                    stroke={
                      mapStyleKey === "satellite"
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(255,255,255,0.9)"
                    }
                    strokeWidth={mapStyleKey === "satellite" ? "2" : "5"}
                  />
                  <path
                    d="M 0 120 Q 120 140 240 120"
                    fill="none"
                    stroke={
                      mapStyleKey === "satellite"
                        ? "rgba(251,191,36,0.3)"
                        : "rgba(254,240,138,0.7)"
                    }
                    strokeWidth="3"
                  />
                </pattern>
              </defs>

              {/* Water body simulation */}
              <path
                d="M -100 320 C 150 240, 300 460, 600 390 C 850 330, 1100 510, 1400 430 L 1400 900 L -100 900 Z"
                fill={mapStyleKey === "satellite" ? "#061320" : "#dbeafe"}
                opacity={mapStyleKey === "satellite" ? "0.95" : "0.75"}
              />

              {/* Parks / Green areas */}
              <rect
                x="15%"
                y="20%"
                width="140"
                height="110"
                rx="20"
                fill={mapStyleKey === "satellite" ? "#0e2918" : "#dcfce7"}
                opacity="0.85"
              />
              <rect
                x="65%"
                y="55%"
                width="180"
                height="130"
                rx="30"
                fill={mapStyleKey === "satellite" ? "#0e2918" : "#dcfce7"}
                opacity="0.85"
              />

              {/* Grid overlay */}
              <rect width="100%" height="100%" fill={`url(#mapbox-grid-${mapStyleKey})`} />
              <rect width="100%" height="100%" fill="url(#mapbox-roads)" />
            </svg>

            {/* City landmark badges */}
            <div className="absolute top-14 left-1/4 pointer-events-none opacity-40">
              <span
                className={`text-[11px] font-bold tracking-wider uppercase ${
                  mapStyleKey === "satellite" ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Central District
              </span>
            </div>
            <div className="absolute bottom-24 right-1/3 pointer-events-none opacity-40">
              <span
                className={`text-[11px] font-bold tracking-wider uppercase ${
                  mapStyleKey === "satellite" ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Bayfront & Promenade
              </span>
            </div>
          </div>

          {/* Fallback Plotted Markers */}
          <div className="absolute inset-0 pointer-events-none">
            {mapContainerRef.current &&
              mappedProperties.map((property) => {
                const width = mapContainerRef.current?.clientWidth || 800;
                const height = mapContainerRef.current?.clientHeight || 600;
                const { x, y } = projectCoords(property.lat, property.lng, width, height);

                // Filter out-of-bounds markers
                if (x < -100 || x > width + 100 || y < -100 || y > height + 100) {
                  return null;
                }

                const isHovered = hoveredPropertyId === property.id;
                const isSelected =
                  selectedPropertyId === property.id || activeProperty?.id === property.id;
                const isHighlighted = isHovered || isSelected;
                const isViewed = isPropertyViewed(property.id);

                return (
                  <div
                    key={property.id}
                    className="absolute pointer-events-auto transition-transform duration-200"
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: "translate(-50%, -100%)",
                      zIndex: isHighlighted ? 50 : 10,
                    }}
                    onMouseEnter={() => onHoverPropertyRef.current?.(property.id)}
                    onMouseLeave={() => onHoverPropertyRef.current?.(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePropertyClick(property);
                    }}
                  >
                    {/* Custom HTML Price Pill Marker */}
                    <button
                      type="button"
                      className={`relative flex items-center justify-center font-bold px-3 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer ${
                        isHighlighted
                          ? "bg-rose-600 text-white shadow-xl scale-110 ring-2 ring-white"
                          : isViewed
                          ? "bg-slate-200 text-slate-600 border border-slate-300 shadow-sm hover:scale-105 hover:bg-slate-300"
                          : mapStyleKey === "satellite"
                          ? "bg-slate-900/90 text-white border border-slate-700 shadow-md hover:scale-105 hover:bg-slate-800 backdrop-blur-sm"
                          : "bg-white text-slate-900 border border-slate-300/90 shadow-md hover:scale-105 hover:bg-slate-50"
                      }`}
                    >
                      <span>{property.pricePill}</span>

                      {/* Marker pin pointer dot */}
                      <div
                        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 transition-colors ${
                          isHighlighted
                            ? "bg-rose-600"
                            : isViewed
                            ? "bg-slate-200 border-r border-b border-slate-300"
                            : mapStyleKey === "satellite"
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

      {/* 2. Floating Toggle Switch: "Search as I move the map" (Top Center) */}
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

      {/* 3. Top-Left Badge: Graceful Fallback Warning / Mapbox Info */}
      {!isValidToken && (
        <div className="absolute top-4 left-4 z-30 max-w-[240px] sm:max-w-xs pointer-events-auto">
          <div className="inline-flex items-center gap-2 bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-medium px-3.5 py-2 rounded-xl shadow-lg border border-white/10">
            <Info className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Tip: Add NEXT_PUBLIC_MAPBOX_TOKEN in .env.local to activate official Mapbox
              vector tiles (Free 50k loads at mapbox.com)
            </span>
          </div>
        </div>
      )}

      {/* 4. Top-Right Map Controls: Style Switcher, 3D Tilt, Reset North, Zoom In/Out, Fit All */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-30 pointer-events-auto">
        {/* Style Switcher */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 p-1 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => handleMapStyleChange("light")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mapStyleKey === "light"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Luxury Light Map View"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Light</span>
          </button>
          <button
            type="button"
            onClick={() => handleMapStyleChange("satellite")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mapStyleKey === "satellite"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Satellite Streets View"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Satellite</span>
          </button>
          <button
            type="button"
            onClick={() => handleMapStyleChange("streets")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mapStyleKey === "streets"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Streets View"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Streets</span>
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

      {/* 5. Interactive Photo Carousel Popup Preview Card */}
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
              onSelectProperty?.(null);
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
              internalSavedIds.has(activeProperty.id) ? "Remove from saved" : "Save property"
            }
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                internalSavedIds.has(activeProperty.id)
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
