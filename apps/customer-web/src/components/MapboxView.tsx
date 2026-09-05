"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Configure MapLibre GL JS v6 Web Worker for Next.js client environment
if (typeof window !== "undefined") {
  try {
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
  } catch (err) {
    console.warn("[MapLibre Worker URL]:", err);
  }
}
import {
  Plus,
  Minus,
  Maximize2,
  X,
  Bed,
  Bath,
  Square,
  ShieldCheck,
  Heart,
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
  drawnPolygon?: [number, number][] | null;
  onDrawnPolygonChange?: (polygon: [number, number][] | null) => void;
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

// OpenStreetMap Classic Standard pure MapLibre style JSON (100% free forever)
export const OSM_STYLE: any = {
  version: 8,
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-layer",
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

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

// Airbnb-Style Luxury Light Canvas Basemap (100% Free, Zero Keys, Uncluttered & High Contrast for Price Markers)
export const LIGHT_CANVAS_STYLE: any = {
  version: 8,
  sources: {
    "esri-light-gray-base": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri",
      maxzoom: 16,
    },
    "esri-light-gray-ref": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri",
      maxzoom: 16,
    },
  },
  layers: [
    {
      id: "esri-light-gray-base-layer",
      type: "raster",
      source: "esri-light-gray-base",
      minzoom: 0,
      maxzoom: 22,
    },
    {
      id: "esri-light-gray-ref-layer",
      type: "raster",
      source: "esri-light-gray-ref",
      minzoom: 0,
      maxzoom: 22,
      paint: {
        "raster-opacity": 0.85,
      },
    },
  ],
};

// 100% Free 2-Map System (Minimalist Streets + High-Res Satellite)
export const MAP_STYLES = {
  streets: LIGHT_CANVAS_STYLE,
  satellite: SATELLITE_STYLE,
  // Backwards compatibility aliases
  osm: OSM_STYLE,
  canvas: LIGHT_CANVAS_STYLE,
  liberty: LIGHT_CANVAS_STYLE,
  topo: LIGHT_CANVAS_STYLE,
} as const;

export type MapStyleKey = "streets" | "satellite";

// Aliases for backwards compatibility
export const MAPBOX_STYLES = MAP_STYLES;
export type MapboxStyleKey = MapStyleKey;

// Point-in-Polygon Ray-Casting Algorithm
export function isPointInPolygon(
  point: [number, number], // [lng, lat]
  polygon: [number, number][] // array of [lng, lat]
): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function MapboxView({
  properties,
  selectedPropertyId,
  hoveredPropertyId,
  viewedPropertyIds: externalViewedIds,
  savedPropertyIds = [],
  drawnPolygon,
  onDrawnPolygonChange,
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
  // Styles and camera state: Default to streets
  const [mapStyleKey, setMapStyleKey] = useState<MapStyleKey>("streets");
  const [is3D, setIs3D] = useState(defaultPitch > 20);
  const [activeProperty, setActiveProperty] = useState<MapProperty | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [internalViewedIds, setInternalViewedIds] = useState<Set<string>>(new Set());
  const [toggledSavedIds, setToggledSavedIds] = useState<Record<string, boolean>>({});

  // Freehand border drawing state
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [screenPoints, setScreenPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [internalPolygon, setInternalPolygon] = useState<[number, number][] | null>(null);

  // Sync internalPolygon with drawnPolygon prop if passed
  useEffect(() => {
    if (drawnPolygon !== undefined) {
      setInternalPolygon(drawnPolygon);
    }
  }, [drawnPolygon]);

  const activePolygon = drawnPolygon !== undefined ? drawnPolygon : internalPolygon;

  // Refs for drawing interactions and synchronization
  const isMouseDownRef = useRef(false);
  const screenPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const activePolygonRef = useRef<[number, number][] | null>(activePolygon);
  activePolygonRef.current = activePolygon;

  const onDrawnPolygonChangeRef = useRef(onDrawnPolygonChange);
  onDrawnPolygonChangeRef.current = onDrawnPolygonChange;

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

  // Filter properties by active drawn boundary polygon
  const visibleProperties = useMemo(() => {
    if (!activePolygon || activePolygon.length < 3) {
      return mappedProperties;
    }
    return mappedProperties.filter((p) =>
      isPointInPolygon([p.lng, p.lat], activePolygon)
    );
  }, [mappedProperties, activePolygon]);

  // Center calculation (clustered to local region to avoid transatlantic averaging)
  const averageCenter = useMemo(() => {
    if (defaultCenter) return defaultCenter;
    const listToAvg = visibleProperties.length > 0 ? visibleProperties : mappedProperties;
    if (listToAvg.length === 0) return { lat: 19.076, lng: 72.8777 };

    const indiaProps = listToAvg.filter(
      (p) => p.lat >= 8 && p.lat <= 36 && p.lng >= 68 && p.lng <= 92
    );
    const targetList = indiaProps.length > 0 ? indiaProps : listToAvg;

    const totalLat = targetList.reduce((acc, p) => acc + p.lat, 0);
    const totalLng = targetList.reduce((acc, p) => acc + p.lng, 0);
    return {
      lat: totalLat / targetList.length,
      lng: totalLng / targetList.length,
    };
  }, [visibleProperties, mappedProperties, defaultCenter]);

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

  // Auto-fit bounds on properties when first loaded into view
  const hasAutoCenteredRef = useRef(false);
  useEffect(() => {
    if (!hasAutoCenteredRef.current && mappedProperties.length > 0 && mapInstanceRef.current) {
      hasAutoCenteredRef.current = true;
      const bounds = new maplibregl.LngLatBounds();

      const indiaProps = mappedProperties.filter(
        (p) => p.lat >= 8 && p.lat <= 36 && p.lng >= 68 && p.lng <= 92
      );
      const propsToFit = indiaProps.length > 0 ? indiaProps : mappedProperties;

      propsToFit.forEach((p) => {
        bounds.extend([p.lng, p.lat]);
      });
      mapInstanceRef.current.fitBounds(bounds, {
        padding: 80,
        minZoom: 6,
        maxZoom: 14,
        duration: 800,
      });
    }
  }, [mappedProperties]);

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

  // Sync boundary GeoJSON source and layers on MapLibre
  const syncBoundaryLayer = useCallback(
    (map: maplibregl.Map, polygon: [number, number][] | null | undefined) => {
      if (!map || !map.isStyleLoaded()) return;

      const sourceId = "drawn-boundary-source";
      const fillLayerId = "drawn-boundary-fill";
      const lineLayerId = "drawn-boundary-line";

      const data: any =
        polygon && polygon.length >= 3
          ? {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [polygon],
              },
              properties: {},
            }
          : {
              type: "FeatureCollection",
              features: [],
            };

      const existingSource = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;

      if (!existingSource) {
        try {
          map.addSource(sourceId, {
            type: "geojson",
            data,
          });

          if (!map.getLayer(fillLayerId)) {
            map.addLayer({
              id: fillLayerId,
              type: "fill",
              source: sourceId,
              paint: {
                "fill-color": "#f43f5e",
                "fill-opacity": 0.12,
              },
            });
          }

          if (!map.getLayer(lineLayerId)) {
            map.addLayer({
              id: lineLayerId,
              type: "line",
              source: sourceId,
              paint: {
                "line-color": "#e11d48",
                "line-width": 2.5,
                "line-dasharray": [2, 1],
              },
            });
          }
        } catch (err) {
          console.warn("[MapLibre Boundary Layer]:", err);
        }
      } else {
        existingSource.setData(data);
      }
    },
    []
  );

  // Sync boundary layer whenever activePolygon updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && map.isStyleLoaded()) {
      syncBoundaryLayer(map, activePolygon);
    }
  }, [activePolygon, syncBoundaryLayer]);

  // Initialize MapLibre GL instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter: [number, number] = [averageCenter.lng, averageCenter.lat];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[mapStyleKey] as any,
      center: initialCenter,
      zoom: defaultZoom,
      minZoom: 3,
      maxZoom: mapStyleKey === "satellite" ? 18.5 : 16.5,
      pitch: defaultPitch,
      attributionControl: false,
    });

    // 1. Observe container resize (handles flexbox dynamic layout calculations)
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    // 2. Multi-stage resize triggers ensuring zero 0x0 canvas blank states
    requestAnimationFrame(() => map.resize());
    const t1 = setTimeout(() => map.resize(), 100);
    const t2 = setTimeout(() => map.resize(), 400);
    const t3 = setTimeout(() => map.resize(), 1000);

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      map.resize();
      syncBoundaryLayer(map, activePolygonRef.current);
    });

    map.on("style.load", () => {
      map.resize();
      syncBoundaryLayer(map, activePolygonRef.current);
    });

    map.on("error", (e) => {
      console.warn("[MapLibre GL Notice]:", e?.error?.message || e);
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
    if (typeof window !== "undefined") {
      (window as any).__map = map;
    }

    return () => {
      resizeObserver.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Map Style dynamically between Streets & Satellite
  const handleMapStyleChange = (key: MapStyleKey) => {
    setMapStyleKey(key);
    currentStyleRef.current = key;
    const map = mapInstanceRef.current;
    if (map) {
      map.setMaxZoom(key === "satellite" ? 18.5 : 16.5);
      map.setStyle(MAP_STYLES[key] as any);
      setTimeout(() => mapInstanceRef.current?.resize(), 100);
    }
  };

  // Reset Bearing / North
  const handleResetNorth = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.easeTo({
        bearing: 0,
        pitch: 0,
        duration: 400,
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
    const listToFit = visibleProperties.length > 0 ? visibleProperties : mappedProperties;
    if (listToFit.length === 0 || !mapInstanceRef.current) return;

    const bounds = new maplibregl.LngLatBounds();
    const indiaProps = listToFit.filter(
      (p) => p.lat >= 8 && p.lat <= 36 && p.lng >= 68 && p.lng <= 92
    );
    const propsToFit = indiaProps.length > 0 ? indiaProps : listToFit;

    propsToFit.forEach((p) => {
      bounds.extend([p.lng, p.lat]);
    });
    mapInstanceRef.current.fitBounds(bounds, {
      padding: 80,
      minZoom: 6,
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

  // Freehand Drawing Event Handlers
  const handleStartDraw = () => {
    // Clear any existing boundary and re-arm lasso
    setInternalPolygon(null);
    onDrawnPolygonChangeRef.current?.(null);
    screenPointsRef.current = [];
    setScreenPoints([]);
    setIsMouseDown(false);
    isMouseDownRef.current = false;
    setIsDrawingMode(true);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.dragPan.disable();
      mapInstanceRef.current.doubleClickZoom.disable();
    }
  };

  const handleCancelDraw = () => {
    setIsDrawingMode(false);
    setIsMouseDown(false);
    isMouseDownRef.current = false;
    screenPointsRef.current = [];
    setScreenPoints([]);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.dragPan.enable();
      mapInstanceRef.current.doubleClickZoom.enable();
    }
  };

  const handleClearBoundary = () => {
    setInternalPolygon(null);
    onDrawnPolygonChangeRef.current?.(null);
    screenPointsRef.current = [];
    setScreenPoints([]);
  };

  const getSvgCoordinates = (e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {}

    setIsMouseDown(true);
    isMouseDownRef.current = true;
    const pt = getSvgCoordinates(e);
    screenPointsRef.current = [pt];
    setScreenPoints([pt]);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isMouseDownRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const pt = getSvgCoordinates(e);
    const pts = screenPointsRef.current;
    if (pts.length === 0) {
      screenPointsRef.current = [pt];
      setScreenPoints([pt]);
      return;
    }

    const last = pts[pts.length - 1];
    const distSq = (pt.x - last.x) ** 2 + (pt.y - last.y) ** 2;
    // Append current point if distance from last point > 4px (16px^2)
    if (distSq > 16) {
      pts.push(pt);
      setScreenPoints([...pts]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {}

    setIsMouseDown(false);
    isMouseDownRef.current = false;

    const map = mapInstanceRef.current;
    const pts = screenPointsRef.current;

    if (map && pts.length > 5) {
      // Convert screen coordinates to [lng, lat]
      const geoPoints: [number, number][] = pts.map((p) => {
        const ll = map.unproject([p.x, p.y]);
        return [ll.lng, ll.lat];
      });

      // Connect last point to first point to close polygon
      if (geoPoints.length > 0) {
        const first = geoPoints[0];
        const last = geoPoints[geoPoints.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          geoPoints.push([first[0], first[1]]);
        }
      }

      setInternalPolygon(geoPoints);
      onDrawnPolygonChangeRef.current?.(geoPoints);
    }

    screenPointsRef.current = [];
    setScreenPoints([]);

    if (map) {
      map.dragPan.enable();
      map.doubleClickZoom.enable();
    }
    setIsDrawingMode(false);
  };

  // Update or Create Custom Airbnb-Style Price Pill Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const currentPropIds = new Set(visibleProperties.map((p) => p.id));

    // Clean up markers that are no longer present
    markersRef.current.forEach((markerObj, id) => {
      if (!currentPropIds.has(id)) {
        markerObj.marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Create or update markers for visible properties
    visibleProperties.forEach((property) => {
      let markerItem = markersRef.current.get(property.id);

      if (!markerItem) {
        // Container element
        const el = document.createElement("div");
        el.className =
          "maplibre-marker-container cursor-pointer select-none transition-transform duration-200";

        // Price Pill Button
        const pillBtn = document.createElement("button");
        pillBtn.type = "button";
        pillBtn.className =
          "relative inline-flex items-center justify-center font-extrabold whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs tracking-tight transition-all duration-200 bg-rose-600 text-white";

        const textSpan = document.createElement("span");
        textSpan.innerText = property.pricePill;
        pillBtn.appendChild(textSpan);

        // Pointer caret beneath pill
        const pointerCaret = document.createElement("div");
        pointerCaret.className =
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 transition-colors duration-200 bg-rose-600";
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
          "relative inline-flex items-center justify-center font-extrabold whitespace-nowrap px-4 py-1.5 rounded-full text-xs tracking-tight transition-all duration-200 scale-110 shadow-2xl bg-rose-700 text-white ring-2 ring-white";
        markerItem.pointerCaret.className =
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-rose-700";
      } else if (isViewed) {
        // Subtle soft rose-slate indicating user has already inspected this property
        markerItem.pillBtn.className =
          "relative inline-flex items-center justify-center font-bold whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs tracking-tight transition-all duration-200 bg-rose-50 text-rose-800 border border-rose-200 shadow-xs hover:scale-105 hover:bg-rose-100 hover:text-rose-900";
        markerItem.pointerCaret.className =
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-rose-50 border-r border-b border-rose-200";
      } else if (mapStyleKey === "satellite") {
        markerItem.pillBtn.className =
          "relative inline-flex items-center justify-center font-extrabold whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs tracking-tight transition-all duration-200 bg-rose-600 text-white border border-rose-700 shadow-lg hover:scale-105 hover:bg-rose-700";
        markerItem.pointerCaret.className =
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-rose-600";
      } else {
        // Default: Solid Brand Rose (#e11d48) with crisp white text, subtle border & radiant pop
        markerItem.pillBtn.className =
          "relative inline-flex items-center justify-center font-extrabold whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs tracking-tight transition-all duration-200 bg-rose-600 text-white border border-rose-700 shadow-[0_3px_12px_rgba(225,29,72,0.38)] hover:scale-105 hover:bg-rose-700 hover:shadow-xl";
        markerItem.pointerCaret.className =
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-rose-600";
      }
    });
  }, [
    visibleProperties,
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
      {/* Freehand Drawing Overlay */}
      {isDrawingMode && (
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-auto z-40 cursor-crosshair touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {screenPoints.length > 1 && (
            <polyline
              points={screenPoints.map((p) => `${p.x},${p.y}`).join(" ")}
              stroke="#e11d48"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="4 2"
            />
          )}
        </svg>
      )}

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
              onClick={handleCancelDraw}
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
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-slate-200/90 flex items-center gap-2.5 transition-all hover:shadow-xl">
            {/* ✏️ Draw Button */}
            <button
              type="button"
              onClick={handleStartDraw}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full transition-all cursor-pointer ${
                isDrawingMode
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-700 hover:text-rose-600 hover:bg-rose-50"
              }`}
              title="Draw a custom boundary on the map"
            >
              <span>✏️</span>
              <span>Draw</span>
            </button>

            <span className="text-slate-300 font-light select-none">|</span>

            {/* "Search as I move the map" Checkbox Toggle */}
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

            {/* If boundary drawn: ✕ Clear Boundary badge */}
            {activePolygon && activePolygon.length >= 3 && (
              <>
                <span className="text-slate-300 font-light select-none">|</span>
                <button
                  type="button"
                  onClick={handleClearBoundary}
                  className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                  title="Clear drawn boundary"
                >
                  <span>Drawn Area active •</span>
                  <span className="flex items-center gap-0.5 underline">✕ Clear</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Top-Right: Segmented Pill [ 🗺️ Streets | 🛰️ Satellite ] */}
      <div className="absolute top-4 right-4 z-30 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200/90 p-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleMapStyleChange("streets")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              mapStyleKey === "streets"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Streets (Clean Minimalist Light Basemap • Airbnb Style)"
          >
            <span>🗺️</span>
            <span className="hidden sm:inline">Streets</span>
          </button>
          <button
            type="button"
            onClick={() => handleMapStyleChange("satellite")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              mapStyleKey === "satellite"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Satellite (High-Resolution Aerial Imagery)"
          >
            <span>🛰️</span>
            <span className="hidden sm:inline">Satellite</span>
          </button>
        </div>
      </div>

      {/* Vertical Floating Controls on right side: Zoom In (+), Zoom Out (−), Compass, Fit All */}
      <div className="absolute top-16 right-4 flex flex-col gap-2 z-30 pointer-events-auto">
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
            onClick={handleResetNorth}
            className="p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
            title="Reset bearing to North"
          >
            <Compass className="w-4 h-4" />
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

      {/* Interactive Photo Carousel Popup Preview Card */}
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
