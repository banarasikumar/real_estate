"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin } from "lucide-react";
import { formatPricePill, formatPriceLabel } from "../utils/formatters";
import {
  MAPBOX_TOKEN,
  MAPBOX_STYLES,
  MAP_STYLES,
  MapStyleKey,
  MapboxStyleKey,
  DEFAULT_CAMERA_CONFIG,
  PITCH_3D,
  configureStandardStyle,
  logMissingTokenWarning,
  OSM_STYLE,
  SATELLITE_STYLE,
  LIGHT_CANVAS_STYLE,
} from "./map/mapboxConfig";
import { MapControlsOverlay } from "./map/MapControlsOverlay";
import { MapPropertyPopup, MapProperty } from "./map/MapPropertyPopup";

// Safe client-side setup for Mapbox Access Token
if (typeof window !== "undefined") {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || MAPBOX_TOKEN || "";
}

// Re-export formatters and types for backwards compatibility
export {
  formatPricePill,
  formatPriceLabel,
  MAP_STYLES,
  MAPBOX_STYLES,
  OSM_STYLE,
  SATELLITE_STYLE,
  LIGHT_CANVAS_STYLE,
};
export type { MapStyleKey, MapboxStyleKey, MapProperty };

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
  // Token validation state
  const [tokenConfigured, setTokenConfigured] = useState<boolean>(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || MAPBOX_TOKEN;
    return Boolean(token && token.trim().length > 0);
  });

  // Diagnostics check on mount
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || MAPBOX_TOKEN;
    if (!token || token.trim().length === 0) {
      logMissingTokenWarning();
      setTokenConfigured(false);
    } else {
      if (typeof window !== "undefined") {
        mapboxgl.accessToken = token;
      }
      setTokenConfigured(true);
    }
  }, []);

  const handleRetryToken = useCallback(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || MAPBOX_TOKEN;
    if (token && token.trim().length > 0) {
      if (typeof window !== "undefined") {
        mapboxgl.accessToken = token;
      }
      setTokenConfigured(true);
    } else {
      logMissingTokenWarning();
    }
  }, []);

  // Styles and camera state: Default to streets (Mapbox Standard 3D)
  const [mapStyleKey, setMapStyleKey] = useState<MapStyleKey>("streets");
  const [is3D, setIs3D] = useState<boolean>(defaultPitch > 20);
  const [bearing, setBearing] = useState<number>(0);
  const [activeProperty, setActiveProperty] = useState<MapProperty | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
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

  // Camera state recorded before starting freehand drawing
  const preDrawCameraRef = useRef<{ pitch: number; bearing: number } | null>(null);

  // Check if a property is saved
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

  // DOM and Mapbox refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const currentStyleRef = useRef<MapStyleKey>(mapStyleKey);
  currentStyleRef.current = mapStyleKey;

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

  // Auto-fit bounds on properties when first loaded into view
  const hasAutoCenteredRef = useRef(false);
  useEffect(() => {
    if (!hasAutoCenteredRef.current && mappedProperties.length > 0 && mapInstanceRef.current) {
      hasAutoCenteredRef.current = true;
      const bounds = new mapboxgl.LngLatBounds();

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

  // Sync boundary GeoJSON source and layers on Mapbox
  const syncBoundaryLayer = useCallback(
    (map: mapboxgl.Map, polygon: [number, number][] | null | undefined) => {
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

      const existingSource = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;

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
          console.warn("[Mapbox Boundary Layer]:", err);
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

  // Context-Aware Property Fly-To / Pan-To
  const flyToProperty = useCallback(
    (lat: number, lng: number) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const currentPitch = map.getPitch();
      const is3DActive = is3D || currentPitch > 20;

      if (is3DActive) {
        map.flyTo({
          center: [lng, lat],
          zoom: 16.5,
          pitch: 45,
          duration: 900,
        });
      } else {
        map.panTo([lng, lat], {
          duration: 600,
        });
      }
    },
    [is3D]
  );

  // Property Selection Handler
  const handlePropertyClick = useCallback(
    (property: MapProperty) => {
      setActiveProperty(property);
      setActiveImageIndex(0);
      setInternalViewedIds((prev) => new Set(prev).add(property.id));
      onSelectPropertyRef.current?.(property);

      const lat = property.lat;
      const lng = property.lng;
      if (lat && lng) {
        flyToProperty(lat, lng);
      }
    },
    [flyToProperty]
  );

  // Sync active property from prop and fly-to
  useEffect(() => {
    if (selectedPropertyId) {
      const found = mappedProperties.find((p) => p.id === selectedPropertyId);
      if (found) {
        setActiveProperty(found);
        setActiveImageIndex(0);
        setInternalViewedIds((prev) => new Set(prev).add(selectedPropertyId));
        if (found.lat && found.lng) {
          flyToProperty(found.lat, found.lng);
        }
      }
    }
  }, [selectedPropertyId, mappedProperties, flyToProperty]);

  // Pan to hovered property when not actively selecting
  useEffect(() => {
    if (hoveredPropertyId && !selectedPropertyId) {
      const target = mappedProperties.find((p) => p.id === hoveredPropertyId);
      if (target && target.lat && target.lng && mapInstanceRef.current) {
        mapInstanceRef.current.easeTo({
          center: [target.lng, target.lat],
          duration: 400,
        });
      }
    }
  }, [hoveredPropertyId, selectedPropertyId, mappedProperties]);

  // Initialize Mapbox GL instance
  useEffect(() => {
    if (!tokenConfigured || !mapContainerRef.current) return;

    const initialCenter: [number, number] = [averageCenter.lng, averageCenter.lat];

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAPBOX_STYLES[mapStyleKey] || "mapbox://styles/mapbox/standard",
        center: initialCenter,
        zoom: defaultZoom,
        minZoom: DEFAULT_CAMERA_CONFIG.minZoom,
        maxZoom: DEFAULT_CAMERA_CONFIG.maxZoom,
        pitch: DEFAULT_CAMERA_CONFIG.pitch,
        maxPitch: DEFAULT_CAMERA_CONFIG.maxPitch,
        attributionControl: false,
      });
    } catch (err) {
      console.warn("[Mapbox Initialization Exception]:", err);
      return;
    }

    // Observe container resize
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    // Multi-stage resize triggers ensuring zero blank canvas states
    requestAnimationFrame(() => map.resize());
    const t1 = setTimeout(() => map.resize(), 100);
    const t2 = setTimeout(() => map.resize(), 400);
    const t3 = setTimeout(() => map.resize(), 1000);

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      map.resize();
      syncBoundaryLayer(map, activePolygonRef.current);
    });

    map.on("style.load", () => {
      configureStandardStyle(map);
      map.resize();
      syncBoundaryLayer(map, activePolygonRef.current);
    });

    map.on("error", (e) => {
      const errMsg = e?.error?.message || "";
      const errStatus = (e?.error as any)?.status;
      if (
        errStatus === 401 ||
        errStatus === 403 ||
        errMsg.toLowerCase().includes("unauthorized") ||
        errMsg.toLowerCase().includes("token")
      ) {
        logMissingTokenWarning();
        setTokenConfigured(false);
      } else {
        console.warn("[Mapbox GL Notice]:", errMsg || e);
      }
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

    map.on("rotate", () => {
      setBearing(Math.round(map.getBearing()));
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
  }, [tokenConfigured]);

  // Switch Map Style dynamically between Streets & Satellite
  const handleMapStyleChange = (key: MapStyleKey) => {
    setMapStyleKey(key);
    currentStyleRef.current = key;
    const map = mapInstanceRef.current;
    if (map) {
      map.setStyle(MAPBOX_STYLES[key] || "mapbox://styles/mapbox/standard");
      setTimeout(() => mapInstanceRef.current?.resize(), 100);
    }
  };

  // 3D Perspective Toggle with smooth camera easing
  const handleToggle3D = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.easeTo({
      pitch: is3D ? 0 : PITCH_3D,
      duration: 800,
    });
  }, [is3D]);

  // Reset Bearing / North
  const handleResetNorth = useCallback(() => {
    const map = mapInstanceRef.current;
    if (map) {
      map.easeTo({
        bearing: 0,
        pitch: 0,
        duration: 400,
      });
    }
  }, []);

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

    const bounds = new mapboxgl.LngLatBounds();
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

  // Freehand Drawing Event Handlers with Smart Auto-Level
  const handleStartDraw = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentPitch = map.getPitch();
    const currentBearing = map.getBearing();
    preDrawCameraRef.current = { pitch: currentPitch, bearing: currentBearing };

    const activateOverlay = () => {
      setInternalPolygon(null);
      onDrawnPolygonChangeRef.current?.(null);
      screenPointsRef.current = [];
      setScreenPoints([]);
      setIsMouseDown(false);
      isMouseDownRef.current = false;
      setIsDrawingMode(true);

      map.dragPan.disable();
      map.doubleClickZoom.disable();
    };

    // If camera is tilted or rotated, auto-level to pitch 0, bearing 0 smoothly first
    if (currentPitch > 5 || Math.abs(currentBearing) > 2) {
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 350,
      });
      setTimeout(() => {
        activateOverlay();
      }, 360);
    } else {
      activateOverlay();
    }
  }, []);

  const restoreCameraAfterDraw = useCallback(() => {
    const map = mapInstanceRef.current;
    if (map && preDrawCameraRef.current) {
      const { pitch: prevPitch, bearing: prevBearing } = preDrawCameraRef.current;
      if (prevPitch > 5 || Math.abs(prevBearing) > 2) {
        map.easeTo({
          pitch: prevPitch,
          bearing: prevBearing,
          duration: 500,
        });
      }
      preDrawCameraRef.current = null;
    }
  }, []);

  const handleCancelDraw = useCallback(() => {
    setIsDrawingMode(false);
    setIsMouseDown(false);
    isMouseDownRef.current = false;
    screenPointsRef.current = [];
    setScreenPoints([]);

    const map = mapInstanceRef.current;
    if (map) {
      map.dragPan.enable();
      map.doubleClickZoom.enable();
    }
    restoreCameraAfterDraw();
  }, [restoreCameraAfterDraw]);

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
    if (distSq > 16) {
      pts.push(pt);
      setScreenPoints([...pts]);
    }
  };

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
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
        const geoPoints: [number, number][] = pts.map((p) => {
          const ll = map.unproject([p.x, p.y]);
          return [ll.lng, ll.lat];
        });

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
      restoreCameraAfterDraw();
    },
    [restoreCameraAfterDraw]
  );

  // Update or Create Custom Airbnb-Style Price Pill Markers using Brand Rose (#e11d48)
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
          "mapbox-marker-container cursor-pointer select-none transition-transform duration-200";

        // Price Pill Button with Brand Rose (#e11d48)
        const pillBtn = document.createElement("button");
        pillBtn.type = "button";
        pillBtn.className =
          "relative inline-flex items-center justify-center font-extrabold whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs tracking-tight transition-all duration-200 bg-[#e11d48] text-white";

        const textSpan = document.createElement("span");
        textSpan.innerText = property.pricePill;
        pillBtn.appendChild(textSpan);

        // Pointer caret beneath pill
        const pointerCaret = document.createElement("div");
        pointerCaret.className =
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 transition-colors duration-200 bg-[#e11d48]";
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
        // Soft rose-slate indicating user has inspected this property
        markerItem.pillBtn.className =
          "relative inline-flex items-center justify-center font-bold whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs tracking-tight transition-all duration-200 bg-rose-50 text-rose-800 border border-rose-200 shadow-xs hover:scale-105 hover:bg-rose-100 hover:text-rose-900";
        markerItem.pointerCaret.className =
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-rose-50 border-r border-b border-rose-200";
      } else if (mapStyleKey === "satellite") {
        markerItem.pillBtn.className =
          "relative inline-flex items-center justify-center font-extrabold whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs tracking-tight transition-all duration-200 bg-[#e11d48] text-white border border-rose-700 shadow-lg hover:scale-105 hover:bg-rose-700";
        markerItem.pointerCaret.className =
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#e11d48]";
      } else {
        // Default: Solid Brand Rose (#e11d48) with crisp text, subtle border & radiant pop
        markerItem.pillBtn.className =
          "relative inline-flex items-center justify-center font-extrabold whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs tracking-tight transition-all duration-200 bg-[#e11d48] text-white border border-rose-700 shadow-[0_3px_12px_rgba(225,29,72,0.38)] hover:scale-105 hover:bg-rose-700 hover:shadow-xl";
        markerItem.pointerCaret.className =
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#e11d48]";
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

  // If token is missing, display friendly user card without crashing
  if (!tokenConfigured) {
    return (
      <div
        className={`relative w-full h-full bg-slate-100 flex items-center justify-center p-6 select-none ${className}`}
      >
        <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-xl border border-slate-200/80 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Map temporarily unavailable. Please check back shortly.
            </h3>
            <p className="text-xs text-slate-500">
              We encountered an issue loading map services. Please check back shortly.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRetryToken}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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

      {/* Floating Map Controls Overlay (Style toggle, Draw, Search as I move, 3D, Bearing Compass, Zoom, Fit) */}
      <MapControlsOverlay
        mapStyleKey={mapStyleKey}
        onMapStyleChange={handleMapStyleChange}
        is3D={is3D}
        onToggle3D={handleToggle3D}
        bearing={bearing}
        onResetNorth={handleResetNorth}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitAll={handleFitAll}
        isDrawingMode={isDrawingMode}
        onStartDraw={handleStartDraw}
        onCancelDraw={handleCancelDraw}
        hasDrawnPolygon={Boolean(activePolygon && activePolygon.length >= 3)}
        onClearBoundary={handleClearBoundary}
        searchAsMapMoves={isSearchAsMapMoves}
        onToggleSearchAsMapMoves={handleToggleSearchAsMapMoves}
      />

      {/* Interactive Photo Carousel Popup Preview Card */}
      <MapPropertyPopup
        property={activeProperty}
        activeImageIndex={activeImageIndex}
        onPrevImage={handlePrevImage}
        onNextImage={handleNextImage}
        onClose={() => {
          setActiveProperty(null);
          onSelectPropertyRef.current?.(null);
        }}
        onToggleFavorite={handleToggleFavorite}
        isSaved={Boolean(activeProperty && isPropertySaved(activeProperty.id))}
        isViewed={Boolean(activeProperty && isPropertyViewed(activeProperty.id))}
      />
    </div>
  );
}

export default MapboxView;
