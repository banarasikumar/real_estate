"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  getAllSearchRegions,
  createSearchRegion,
  updateSearchRegion,
  deleteSearchRegion,
  toggleSearchRegionActive,
  SearchRegion,
} from "@repo/api";
import {
  MapPin,
  Pencil,
  Hand,
  Crosshair,
  Undo2,
  Trash2,
  Save,
  CheckCircle2,
  Sliders,
  Layers,
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  Compass,
  X,
  Check,
  Building2,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Navigation,
  Globe,
} from "lucide-react";

// Mapbox Token fallback
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Map Styles available for style toggling
const MAP_STYLES = [
  { id: "standard", name: "Standard 3D", uri: "mapbox://styles/mapbox/standard" },
  { id: "satellite", name: "Satellite", uri: "mapbox://styles/mapbox/satellite-streets-v12" },
  { id: "light", name: "Light Minimal", uri: "mapbox://styles/mapbox/light-v11" },
] as const;

type MapStyleId = (typeof MAP_STYLES)[number]["id"];
type InteractionMode = "pan" | "draw" | "test-pin";

// Fallback seed regions in case database is empty
const DEFAULT_SEED_REGIONS: SearchRegion[] = [
  {
    id: "seed-los-angeles",
    slug: "los-angeles",
    name: "Los Angeles CA Homes",
    city: "Los Angeles",
    state: "CA",
    center_lat: 34.0522,
    center_lng: -118.2437,
    zoom: 10.5,
    boundary_polygon: [
      [-118.6000, 34.2850],
      [-118.4500, 34.3400],
      [-118.3200, 34.2800],
      [-118.3150, 34.1850],
      [-118.2450, 34.1450],
      [-118.1850, 34.1350],
      [-118.1650, 34.0650],
      [-118.2150, 34.0150],
      [-118.2550, 33.9350],
      [-118.2850, 33.8400],
      [-118.2900, 33.7900],
      [-118.2950, 33.7150],
      [-118.2600, 33.7350],
      [-118.3050, 33.7850],
      [-118.3650, 33.9100],
      [-118.4350, 33.9450],
      [-118.4600, 33.9850],
      [-118.4900, 34.0250],
      [-118.5550, 34.0400],
      [-118.6250, 34.1450],
      [-118.6400, 34.2000],
      [-118.6000, 34.2850],
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "seed-new-york",
    slug: "new-york",
    name: "New York NY Metro",
    city: "New York",
    state: "NY",
    center_lat: 40.7488,
    center_lng: -73.9851,
    zoom: 11.0,
    boundary_polygon: [
      [-74.0400, 40.7000],
      [-74.0150, 40.7500],
      [-73.9900, 40.7950],
      [-73.9400, 40.8750],
      [-73.9100, 40.8500],
      [-73.9250, 40.7750],
      [-73.9550, 40.7250],
      [-73.9850, 40.6900],
      [-74.0200, 40.6500],
      [-74.0500, 40.6400],
      [-74.0400, 40.7000],
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "seed-mumbai",
    slug: "mumbai",
    name: "Mumbai Luxury Bay",
    city: "Mumbai",
    state: "Maharashtra",
    center_lat: 19.0760,
    center_lng: 72.8777,
    zoom: 11.0,
    boundary_polygon: [
      [72.8150, 18.9050],
      [72.8220, 18.9400],
      [72.8120, 19.0150],
      [72.8250, 19.0600],
      [72.8280, 19.1050],
      [72.8080, 19.1450],
      [72.7950, 19.1900],
      [72.8200, 19.2450],
      [72.8650, 19.2900],
      [72.9300, 19.2500],
      [72.9600, 19.1850],
      [72.9300, 19.0900],
      [72.9050, 19.0200],
      [72.8550, 18.9600],
      [72.8150, 18.9050],
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "seed-bangalore",
    slug: "bangalore",
    name: "Bangalore Tech Corridor",
    city: "Bangalore",
    state: "Karnataka",
    center_lat: 12.9716,
    center_lng: 77.5946,
    zoom: 11.0,
    boundary_polygon: [
      [77.5950, 13.1100],
      [77.6350, 13.0450],
      [77.7450, 12.9850],
      [77.7000, 12.9300],
      [77.6700, 12.8400],
      [77.5800, 12.8800],
      [77.5200, 12.9200],
      [77.4900, 12.9700],
      [77.5250, 13.0350],
      [77.5950, 13.1100],
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// --- GIS MATHEMATICAL UTILITIES ---

/** Haversine formula distance between two coordinates in km */
function haversineDistanceKm(p1: [number, number], p2: [number, number]): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
  const dLng = ((p2[0] - p1[0]) * Math.PI) / 180;
  const lat1 = (p1[1] * Math.PI) / 180;
  const lat2 = (p2[1] * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Compute total boundary perimeter in km */
function computePerimeterKm(points: Array<[number, number]>, isClosed: boolean): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineDistanceKm(points[i], points[i + 1]);
  }
  if (isClosed && points.length >= 3) {
    total += haversineDistanceKm(points[points.length - 1], points[0]);
  }
  return total;
}

/** Compute enclosed polygon land area in sq km via projection Shoelace */
function computeAreaSqKm(points: Array<[number, number]>): number {
  if (points.length < 3) return 0;
  const meanLat = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const latRad = (meanLat * Math.PI) / 180;
  const kx = 111.32 * Math.cos(latRad); // km per degree longitude
  const ky = 110.574; // km per degree latitude

  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = points[i][0] * kx;
    const yi = points[i][1] * ky;
    const xj = points[j][0] * kx;
    const yj = points[j][1] * ky;
    area += xi * yj - xj * yi;
  }
  return Math.abs(area) / 2;
}

/** Compute bounding box [minLng, minLat, maxLng, maxLat] */
function computeBBox(points: Array<[number, number]>): {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
} {
  if (points.length === 0) return { minLng: 0, minLat: 0, maxLng: 0, maxLat: 0 };
  let minLng = points[0][0];
  let maxLng = points[0][0];
  let minLat = points[0][1];
  let maxLat = points[0][1];
  for (const [lng, lat] of points) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLng, minLat, maxLng, maxLat };
}

/** Compute geometric centroid of coordinates */
function computeCentroid(points: Array<[number, number]>): [number, number] {
  if (points.length === 0) return [0, 0];
  const sum = points.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

/** Jordan Curve Ray-Casting algorithm for Point-in-Polygon test */
function isPointInPolygon(point: [number, number], polygon: Array<[number, number]>): boolean {
  if (polygon.length < 3) return false;
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Mini SVG Polygon outline preview generator */
function MiniPolygonPreview({ polygon }: { polygon: Array<[number, number]> }) {
  if (!polygon || polygon.length < 3) {
    return (
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200 dark:border-slate-800">
        <MapPin className="w-5 h-5 opacity-40" />
      </div>
    );
  }

  const { minLng, maxLng, minLat, maxLat } = computeBBox(polygon);
  const width = maxLng - minLng || 0.0001;
  const height = maxLat - minLat || 0.0001;
  const pad = 10;
  const svgSize = 56;
  const usable = svgSize - pad * 2;

  const pointsStr = polygon
    .map(([lng, lat]) => {
      const x = pad + ((lng - minLng) / width) * usable;
      const y = svgSize - (pad + ((lat - minLat) / height) * usable);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      className="rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-1 shrink-0 transition-transform group-hover:scale-105"
    >
      <polygon
        points={pointsStr}
        className="fill-emerald-500/25 stroke-emerald-500"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CityBoundaryManager() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const testPinMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Core State
  const [regions, setRegions] = useState<SearchRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isLoadingRegions, setIsLoadingRegions] = useState(true);

  // Drawing & Editing State
  const [vertices, setVertices] = useState<Array<[number, number]>>([]);
  const [isClosed, setIsClosed] = useState(false);
  const [mode, setInteractionMode] = useState<InteractionMode>("pan");

  // Map Appearance & Camera
  const [currentStyle, setCurrentStyle] = useState<MapStyleId>("standard");
  const [is3DActive, setIs3DActive] = useState(false);

  // Test Coordinate HUD State
  const [testCoords, setTestCoords] = useState<[number, number] | null>(null);
  const [testPinInputLat, setTestPinInputLat] = useState("");
  const [testPinInputLng, setTestPinInputLng] = useState("");

  // Drawer & Modals State
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<SearchRegion | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // FormSheet Fields
  const [formName, setFormName] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formZoom, setFormZoom] = useState(11);
  const [isSaving, setIsSaving] = useState(false);

  // Trigger brief iOS toast banner
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  }, []);

  // Fetch search regions on mount
  const fetchRegions = useCallback(async () => {
    setIsLoadingRegions(true);
    try {
      const data = await getAllSearchRegions();
      if (data && data.length > 0) {
        setRegions(data);
      } else {
        // Use seed data if database table is empty or offline
        setRegions(DEFAULT_SEED_REGIONS);
      }
    } catch (err) {
      console.warn("Using fallback seed regions due to fetch error:", err);
      setRegions(DEFAULT_SEED_REGIONS);
    } finally {
      setIsLoadingRegions(false);
    }
  }, []);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  // Real-Time Computed Analytics
  const analytics = useMemo(() => {
    const perimeterKm = computePerimeterKm(vertices, isClosed);
    const perimeterMi = perimeterKm * 0.621371;
    const areaSqKm = computeAreaSqKm(vertices);
    const areaSqMi = areaSqKm * 0.386102;
    const areaAcres = areaSqKm * 247.105;
    const bbox = computeBBox(vertices);
    const centroid = computeCentroid(vertices);

    return {
      totalVertices: vertices.length,
      perimeterKm: perimeterKm.toFixed(2),
      perimeterMi: perimeterMi.toFixed(2),
      areaSqKm: areaSqKm.toFixed(2),
      areaSqMi: areaSqMi.toFixed(2),
      areaAcres: Math.round(areaAcres).toLocaleString(),
      bbox,
      centroid,
    };
  }, [vertices, isClosed]);

  // Point-in-polygon evaluation for test coordinate
  const testPinResult = useMemo(() => {
    if (!testCoords || vertices.length < 3) return null;
    const isInside = isPointInPolygon(testCoords, vertices);
    const distanceToCentroidKm = haversineDistanceKm(testCoords, analytics.centroid);
    const distanceToCentroidMi = distanceToCentroidKm * 0.621371;

    return {
      isInside,
      distanceToCentroidKm: distanceToCentroidKm.toFixed(2),
      distanceToCentroidMi: distanceToCentroidMi.toFixed(2),
    };
  }, [testCoords, vertices, analytics.centroid]);

  // Setup 3D Buildings Extrusion Layer
  const setup3DBuildings = useCallback((map: mapboxgl.Map) => {
    if (map.getLayer("3d-buildings")) return;
    const layers = map.getStyle()?.layers;
    if (!layers) return;

    const labelLayer = layers.find(
      (l) => l.type === "symbol" && (l.layout as any)?.["text-field"]
    );
    const labelLayerId = labelLayer ? labelLayer.id : undefined;

    try {
      if (map.getSource("composite")) {
        map.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#94a3b8",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14,
                0,
                14.05,
                ["get", "height"],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14,
                0,
                14.05,
                ["get", "min_height"],
              ],
              "fill-extrusion-opacity": 0.55,
            },
          },
          labelLayerId
        );
      }
    } catch (e) {
      console.warn("Could not add 3D buildings layer:", e);
    }
  }, []);

  // Update GeoJSON polygon and line layers on Mapbox map
  const syncMapLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Build GeoJSON features
    const polygonFeature =
      vertices.length >= 3 && isClosed
        ? {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [[...vertices, vertices[0]]],
            },
            properties: {},
          }
        : {
            type: "FeatureCollection",
            features: [],
          };

    const lineCoordinates =
      vertices.length >= 2
        ? isClosed
          ? [...vertices, vertices[0]]
          : vertices
        : [];

    const lineFeature =
      lineCoordinates.length >= 2
        ? {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: lineCoordinates,
            },
            properties: {},
          }
        : {
            type: "FeatureCollection",
            features: [],
          };

    // Source & Layer for Fill
    const fillSource = map.getSource("boundary-polygon-src") as mapboxgl.GeoJSONSource;
    if (fillSource) {
      fillSource.setData(polygonFeature as any);
    } else {
      map.addSource("boundary-polygon-src", {
        type: "geojson",
        data: polygonFeature as any,
      });
      map.addLayer({
        id: "boundary-fill",
        type: "fill",
        source: "boundary-polygon-src",
        paint: {
          "fill-color": "#10b981",
          "fill-opacity": 0.22,
        },
      });
    }

    // Source & Layer for Glowing Boundary Stroke
    const lineSource = map.getSource("boundary-line-src") as mapboxgl.GeoJSONSource;
    if (lineSource) {
      lineSource.setData(lineFeature as any);
    } else {
      map.addSource("boundary-line-src", {
        type: "geojson",
        data: lineFeature as any,
      });

      // Outer glow line
      map.addLayer({
        id: "boundary-glow",
        type: "line",
        source: "boundary-line-src",
        paint: {
          "line-color": "#34d399",
          "line-width": 8,
          "line-blur": 4,
          "line-opacity": 0.45,
        },
      });

      // Sharp inner stroke
      map.addLayer({
        id: "boundary-stroke",
        type: "line",
        source: "boundary-line-src",
        paint: {
          "line-color": "#059669",
          "line-width": 3,
          "line-opacity": 0.95,
        },
      });
    }
  }, [vertices, isClosed]);

  // Synchronize draggable HTML vertex markers on map
  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing vertex markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Place an Apple-styled vertex marker for each point
    vertices.forEach(([lng, lat], idx) => {
      const isStart = idx === 0;
      const el = document.createElement("div");
      el.className = "group relative cursor-pointer select-none";

      if (isStart) {
        // Glowing start point with pulsating ring
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-emerald-400/40 animate-ping"></span>
            <div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-black">
              1
            </div>
            <div class="absolute -top-7 px-2 py-0.5 rounded-full bg-slate-900/90 backdrop-blur-md text-white text-[9px] font-bold tracking-tight whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Start (Click to Close)
            </div>
          </div>
        `;
      } else {
        // Regular vertex point
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="w-4 h-4 rounded-full bg-white border-2 border-emerald-600 shadow-md hover:scale-125 transition-transform flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
            </div>
            <div class="absolute -top-6 px-1.5 py-0.5 rounded-full bg-slate-900/90 text-white text-[9px] font-semibold whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              #${idx + 1}
            </div>
          </div>
        `;
      }

      // Clicking start point closes the polygon if >= 3 points
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isStart && vertices.length >= 3 && !isClosed) {
          setIsClosed(true);
          showToast("Boundary loop closed successfully!");
        }
      });

      // Draggable marker capability
      const marker = new mapboxgl.Marker({
        element: el,
        draggable: true,
      })
        .setLngLat([lng, lat])
        .addTo(map);

      // On drag, live update that vertex coordinate
      marker.on("drag", () => {
        const newLngLat = marker.getLngLat();
        setVertices((prev) => {
          const next = [...prev];
          next[idx] = [newLngLat.lng, newLngLat.lat];
          return next;
        });
      });

      markersRef.current.push(marker);
    });
  }, [vertices, isClosed, showToast]);

  // Synchronize test pin marker
  const syncTestPin = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!testCoords) {
      if (testPinMarkerRef.current) {
        testPinMarkerRef.current.remove();
        testPinMarkerRef.current = null;
      }
      return;
    }

    if (!testPinMarkerRef.current) {
      const pinEl = document.createElement("div");
      pinEl.className = "relative flex items-center justify-center cursor-pointer select-none";
      pinEl.innerHTML = `
        <div class="relative flex flex-col items-center">
          <span class="absolute w-10 h-10 rounded-full bg-blue-500/30 animate-ping -top-1"></span>
          <div class="w-8 h-8 rounded-2xl bg-blue-600 border-2 border-white shadow-2xl flex items-center justify-center text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <div class="w-1.5 h-1.5 rounded-full bg-blue-700 mt-0.5"></div>
        </div>
      `;

      testPinMarkerRef.current = new mapboxgl.Marker({
        element: pinEl,
        draggable: true,
      })
        .setLngLat(testCoords)
        .addTo(map);

      testPinMarkerRef.current.on("drag", () => {
        if (!testPinMarkerRef.current) return;
        const pt = testPinMarkerRef.current.getLngLat();
        setTestCoords([pt.lng, pt.lat]);
        setTestPinInputLat(pt.lat.toFixed(5));
        setTestPinInputLng(pt.lng.toFixed(5));
      });
    } else {
      testPinMarkerRef.current.setLngLat(testCoords);
    }
  }, [testCoords]);

  // Initialize Mapbox GL map instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initialRegion = DEFAULT_SEED_REGIONS[0];

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[0].uri,
      center: [initialRegion.center_lng, initialRegion.center_lat],
      zoom: initialRegion.zoom,
      pitch: 0,
      bearing: 0,
      antialias: true,
    });

    map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: true,
        visualizePitch: true,
      }),
      "bottom-right"
    );

    map.on("load", () => {
      mapRef.current = map;
      setup3DBuildings(map);
      // Load initial region polygon
      setVertices(initialRegion.boundary_polygon);
      setIsClosed(true);
      setSelectedRegionId(initialRegion.id);
      syncMapLayers();
    });

    map.on("style.load", () => {
      setup3DBuildings(map);
      syncMapLayers();
    });

    // Map Click Interaction Handler
    map.on("click", (e) => {
      // In Draw mode, add a vertex
      setInteractionMode((currentMode) => {
        if (currentMode === "draw") {
          const newPt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          setVertices((prev) => {
            // Check if clicking near first vertex to close loop
            if (prev.length >= 2) {
              const startDist = haversineDistanceKm(newPt, prev[0]);
              if (startDist < 0.3) {
                // Within 300m of start point -> close loop
                setIsClosed(true);
                return prev;
              }
            }
            return [...prev, newPt];
          });
        } else if (currentMode === "test-pin") {
          // In test-pin mode, set test coordinate
          setTestCoords([e.lngLat.lng, e.lngLat.lat]);
          setTestPinInputLat(e.lngLat.lat.toFixed(5));
          setTestPinInputLng(e.lngLat.lng.toFixed(5));
        }
        return currentMode;
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [setup3DBuildings, syncMapLayers]);

  // Re-sync layers & markers whenever vertices or closed state changes
  useEffect(() => {
    syncMapLayers();
    syncMarkers();
  }, [syncMapLayers, syncMarkers]);

  // Re-sync test pin marker
  useEffect(() => {
    syncTestPin();
  }, [syncTestPin]);

  // Handle Style Switching
  const handleStyleChange = (styleId: MapStyleId) => {
    const selected = MAP_STYLES.find((s) => s.id === styleId);
    if (!selected || !mapRef.current) return;
    setCurrentStyle(styleId);
    mapRef.current.setStyle(selected.uri);
  };

  // Toggle 3D Pitch
  const toggle3DView = () => {
    const map = mapRef.current;
    if (!map) return;

    if (!is3DActive) {
      map.easeTo({
        pitch: 58,
        bearing: -18,
        duration: 1400,
      });
      setIs3DActive(true);
    } else {
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 1000,
      });
      setIs3DActive(false);
    }
  };

  // Undo Vertex
  const handleUndoVertex = () => {
    if (vertices.length === 0) return;
    setVertices((prev) => prev.slice(0, -1));
    if (isClosed) setIsClosed(false);
  };

  // Clear Canvas
  const handleClear = () => {
    if (vertices.length === 0) return;
    if (window.confirm("Clear active boundary polygon? This action cannot be undone.")) {
      setVertices([]);
      setIsClosed(false);
      setSelectedRegionId(null);
      showToast("Canvas cleared.");
    }
  };

  // Close Loop
  const handleCloseLoop = () => {
    if (vertices.length < 3) {
      showToast("Polygon requires at least 3 vertices to close.");
      return;
    }
    setIsClosed(true);
    showToast("Boundary loop closed.");
  };

  // Fly to Centroid
  const handleFlyToCentroid = () => {
    const map = mapRef.current;
    if (!map || vertices.length === 0) return;
    const [cLng, cLat] = analytics.centroid;
    map.flyTo({
      center: [cLng, cLat],
      zoom: 12,
      duration: 1500,
      essential: true,
    });
  };

  // Load a Region onto the Canvas
  const handleSelectRegion = (region: SearchRegion) => {
    setSelectedRegionId(region.id);
    const poly = Array.isArray(region.boundary_polygon)
      ? region.boundary_polygon
      : [];
    setVertices(poly);
    setIsClosed(poly.length >= 3);

    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: [region.center_lng, region.center_lat],
        zoom: region.zoom || 11,
        duration: 1600,
        essential: true,
      });
    }
    showToast(`Loaded ${region.name}`);
  };

  // Toggle Active Status of a Region
  const handleToggleActive = async (region: SearchRegion, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !region.is_active;

    // Optimistic UI update
    setRegions((prev) =>
      prev.map((r) => (r.id === region.id ? { ...r, is_active: newStatus } : r))
    );

    try {
      const res = await toggleSearchRegionActive(region.id, newStatus);
      if (res.success) {
        showToast(`${region.name} marked ${newStatus ? "Active" : "Inactive"}`);
      } else {
        showToast("Status updated locally.");
      }
    } catch {
      showToast("Status updated locally.");
    }
  };

  // Open FormSheet Modal for New Region or Edit
  const openNewRegionModal = () => {
    setEditingRegion(null);
    setFormName("");
    setFormCity("");
    setFormState("");
    setFormSlug("");
    setFormZoom(mapRef.current ? Math.round(mapRef.current.getZoom()) : 11);
    setIsFormSheetOpen(true);
  };

  const openEditRegionModal = (region: SearchRegion, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRegion(region);
    setFormName(region.name);
    setFormCity(region.city);
    setFormState(region.state || "");
    setFormSlug(region.slug);
    setFormZoom(region.zoom);
    setIsFormSheetOpen(true);
  };

  // Auto-generate slug when typing region name
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingRegion) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setFormSlug(autoSlug);
    }
  };

  // Save Region (Create or Update)
  const handleSaveRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCity.trim() || !formSlug.trim()) {
      showToast("Please fill in required fields (Name, City, Slug).");
      return;
    }

    if (vertices.length < 3) {
      showToast("Boundary requires at least 3 vertices before saving.");
      return;
    }

    setIsSaving(true);
    const [cLng, cLat] = analytics.centroid;

    const payload = {
      name: formName.trim(),
      city: formCity.trim(),
      state: formState.trim() || null,
      slug: formSlug.trim(),
      center_lat: cLat,
      center_lng: cLng,
      zoom: Number(formZoom),
      boundary_polygon: vertices,
      is_active: true,
    };

    try {
      if (editingRegion) {
        const res = await updateSearchRegion(editingRegion.id, payload);
        if (res.success && res.data) {
          setRegions((prev) =>
            prev.map((r) => (r.id === editingRegion.id ? res.data! : r))
          );
          showToast(`Region "${formName}" updated.`);
        } else {
          // Optimistic local update
          setRegions((prev) =>
            prev.map((r) =>
              r.id === editingRegion.id
                ? { ...r, ...payload, updated_at: new Date().toISOString() }
                : r
            )
          );
          showToast(`Region "${formName}" updated locally.`);
        }
      } else {
        const res = await createSearchRegion(payload);
        if (res.success && res.data) {
          setRegions((prev) => [res.data!, ...prev]);
          setSelectedRegionId(res.data.id);
          showToast(`Region "${formName}" created.`);
        } else {
          // Optimistic local creation
          const fallbackNewRegion: SearchRegion = {
            id: "local-" + Date.now(),
            ...payload,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setRegions((prev) => [fallbackNewRegion, ...prev]);
          setSelectedRegionId(fallbackNewRegion.id);
          showToast(`Region "${formName}" created locally.`);
        }
      }
      setIsFormSheetOpen(false);
    } catch (err) {
      console.error("Save error:", err);
      showToast("Failed to save region.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Region
  const handleDeleteRegion = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete region "${name}"?`)) return;

    // Optimistic delete
    setRegions((prev) => prev.filter((r) => r.id !== id));
    if (selectedRegionId === id) {
      setSelectedRegionId(null);
    }

    try {
      await deleteSearchRegion(id);
      showToast(`Region "${name}" removed.`);
    } catch {
      showToast(`Region "${name}" removed locally.`);
    }
  };

  // Filtered regions for drawer
  const filteredRegions = useMemo(() => {
    if (!searchQuery.trim()) return regions;
    const q = searchQuery.toLowerCase();
    return regions.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        (r.state && r.state.toLowerCase().includes(q)) ||
        r.slug.toLowerCase().includes(q)
    );
  }, [regions, searchQuery]);

  return (
    <div className="relative w-full h-full min-h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-950 font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-5 py-2.5 rounded-full bg-slate-900/90 text-white text-xs font-semibold backdrop-blur-xl border border-white/20 shadow-2xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Map Canvas */}
      <div className="relative flex-1 h-full">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* --- FLOATING APPLE PILL HUD (TOP CENTER) --- */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-2 p-1.5 rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-white/30 dark:border-slate-700/80 shadow-2xl shadow-black/20 text-slate-800 dark:text-slate-100 transition-all">
          {/* Interaction Modes */}
          <button
            onClick={() => setInteractionMode("pan")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              mode === "pan"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/60"
            }`}
            title="Pan & Explore Map"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Pan</span>
          </button>

          <button
            onClick={() => setInteractionMode("draw")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              mode === "draw"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/50"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/60"
            }`}
            title="Click on map to add vertices"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>

          <button
            onClick={() => setInteractionMode("test-pin")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              mode === "test-pin"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400/50"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/60"
            }`}
            title="Click to drop test pin and check jurisdiction"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Test Pin</span>
          </button>

          <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Action Buttons */}
          <button
            onClick={handleCloseLoop}
            disabled={isClosed || vertices.length < 3}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              isClosed || vertices.length < 3
                ? "opacity-40 cursor-not-allowed text-slate-400"
                : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
            }`}
            title="Close boundary polygon"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Close Loop</span>
          </button>

          <button
            onClick={handleUndoVertex}
            disabled={vertices.length === 0}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              vertices.length === 0
                ? "opacity-40 cursor-not-allowed text-slate-400"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 cursor-pointer"
            }`}
            title="Undo last vertex point"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          <button
            onClick={handleClear}
            disabled={vertices.length === 0}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              vertices.length === 0
                ? "opacity-40 cursor-not-allowed text-slate-400"
                : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
            }`}
            title="Clear current polygon vertices"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Save Button */}
          <button
            onClick={openNewRegionModal}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition cursor-pointer"
            title="Save boundary as a municipal region"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>

        {/* --- MAP CONTROLS PILL (TOP LEFT) --- */}
        <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
          {/* Style Switcher Segmented Control */}
          <div className="flex items-center p-1 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-white/30 dark:border-slate-700/80 shadow-xl text-slate-800 dark:text-slate-100">
            {MAP_STYLES.map((st) => (
              <button
                key={st.id}
                onClick={() => handleStyleChange(st.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  currentStyle === st.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {st.name}
              </button>
            ))}
          </div>

          {/* 3D Pitch Toggle */}
          <button
            onClick={toggle3DView}
            className={`px-3 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 backdrop-blur-2xl border shadow-xl cursor-pointer ${
              is3DActive
                ? "bg-purple-600 text-white border-purple-400/50 shadow-purple-600/30"
                : "bg-white/85 dark:bg-slate-900/85 text-slate-700 dark:text-slate-200 border-white/30 dark:border-slate-700/80 hover:bg-white"
            }`}
            title="Toggle 3D Cinematic Perspective"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>3D</span>
          </button>
        </div>

        {/* --- REAL-TIME GIS ANALYTICS OVERLAY (BOTTOM LEFT) --- */}
        <div className="absolute bottom-6 left-6 z-20 w-84 max-w-[calc(100vw-3rem)] p-4 rounded-3xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-white/40 dark:border-slate-800 shadow-2xl shadow-black/30 text-slate-900 dark:text-white transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold tracking-tight uppercase text-slate-500 dark:text-slate-400">
                GIS Analytics
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                isClosed
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                  : vertices.length > 0
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {isClosed
                ? "Polygon Closed"
                : vertices.length > 0
                ? "Open Loop"
                : "Empty"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            {/* Perimeter */}
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-800/80">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Perimeter
              </p>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                {analytics.perimeterKm} <span className="text-[11px] font-normal text-slate-500">km</span>
              </p>
              <p className="text-[10px] text-slate-400">
                {analytics.perimeterMi} mi
              </p>
            </div>

            {/* Enclosed Area */}
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-800/80">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Enclosed Area
              </p>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                {analytics.areaSqKm} <span className="text-[11px] font-normal text-slate-500">km²</span>
              </p>
              <p className="text-[10px] text-slate-400">
                {analytics.areaSqMi} mi² ({analytics.areaAcres} ac)
              </p>
            </div>
          </div>

          {/* Vertex Count & Centroid Info */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {analytics.totalVertices} Vertices
              </span>
            </div>
            <button
              onClick={handleFlyToCentroid}
              disabled={vertices.length === 0}
              className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer disabled:opacity-40"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Fly to Centroid</span>
            </button>
          </div>
        </div>

        {/* --- TEST COORDINATE HUD (POINT-IN-POLYGON) --- */}
        {testCoords && (
          <div className="absolute top-20 left-6 z-20 w-84 p-4 rounded-3xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-white/40 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-white animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Crosshair className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ray-Cast Test Pin
                </span>
              </div>
              <button
                onClick={() => setTestCoords(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-2 text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Lat: {testCoords[1].toFixed(5)}</span>
                <span>Lng: {testCoords[0].toFixed(5)}</span>
              </div>

              {testPinResult ? (
                <div
                  className={`mt-2 p-3 rounded-2xl flex items-center gap-2.5 font-bold ${
                    testPinResult.isInside
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30"
                  }`}
                >
                  {testPinResult.isInside ? (
                    <>
                      <Check className="w-5 h-5 shrink-0" />
                      <div>
                        <p className="text-xs font-black leading-tight">INSIDE CITY BOUNDARY</p>
                        <p className="text-[10px] font-normal opacity-80 mt-0.5">
                          Point is within municipal jurisdiction.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 shrink-0" />
                      <div>
                        <p className="text-xs font-black leading-tight">OUTSIDE BOUNDARY</p>
                        <p className="text-[10px] font-normal opacity-80 mt-0.5">
                          Point lies outside current municipal boundary.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-amber-500 mt-2">
                  Need at least 3 vertices to compute ray-casting enclosure.
                </p>
              )}

              {testPinResult && (
                <div className="pt-2 text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
                  <span>Distance to Centroid:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {testPinResult.distanceToCentroidKm} km ({testPinResult.distanceToCentroidMi} mi)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Drawer Collapse / Expand Button */}
        <button
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          className="absolute top-6 right-6 z-20 p-2.5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-white/40 dark:border-slate-800 shadow-xl text-slate-700 dark:text-slate-200 hover:scale-105 transition cursor-pointer"
          title={isDrawerOpen ? "Collapse Drawer" : "Open Region Drawer"}
        >
          {isDrawerOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* --- REGION MANAGEMENT SIDEBAR / FLOATING DRAWER --- */}
      <aside
        className={`relative z-20 flex flex-col h-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-l border-slate-200/80 dark:border-slate-800 transition-all duration-300 ease-in-out shadow-2xl ${
          isDrawerOpen ? "w-96" : "w-0 opacity-0 overflow-hidden"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Search Regions
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {regions.length}
              </span>
            </div>

            <button
              onClick={openNewRegionModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Search Filter Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search region, city, state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Region List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoadingRegions ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-xs font-medium">Loading municipal search regions...</p>
            </div>
          ) : filteredRegions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <MapPin className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs font-medium">No search regions found.</p>
              <button
                onClick={openNewRegionModal}
                className="text-xs font-bold text-blue-500 hover:underline"
              >
                Create your first city boundary
              </button>
            </div>
          ) : (
            filteredRegions.map((region) => {
              const isSelected = selectedRegionId === region.id;
              const poly = Array.isArray(region.boundary_polygon)
                ? region.boundary_polygon
                : [];

              return (
                <div
                  key={region.id}
                  onClick={() => handleSelectRegion(region)}
                  className={`group relative p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-400/80 dark:border-blue-700 shadow-md ring-1 ring-blue-500/20"
                      : "bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Mini SVG Outline */}
                    <MiniPolygonPreview polygon={poly} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {region.name}
                        </h3>

                        {/* iOS Styled Active Toggle Switch */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={region.is_active}
                          onClick={(e) => handleToggleActive(region, e)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            region.is_active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                          title={region.is_active ? "Region is Active" : "Region is Inactive"}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              region.is_active ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {region.city}
                        {region.state ? `, ${region.state}` : ""}
                      </p>

                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-medium">
                        <span>{poly.length} Vertices</span>
                        <span>•</span>
                        <span>Zoom: {region.zoom}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions on hover / active */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-[10px] text-slate-400 font-mono">
                      /{region.slug}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => openEditRegionModal(region, e)}
                        className="font-bold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => handleDeleteRegion(region.id, region.name, e)}
                        className="font-bold text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* --- FORMSHEET MODAL (ADD / EDIT REGION) --- */}
      {isFormSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-white/20 dark:border-slate-800 text-slate-900 dark:text-white animate-slide-up">
            {/* Grabber Bar Handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black tracking-tight">
                  {editingRegion ? "Edit Search Region" : "Add New Search Region"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Save boundary polygon to Supabase search_regions
                </p>
              </div>
              <button
                onClick={() => setIsFormSheetOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRegion} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Region Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. San Francisco Bay Core"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. San Francisco"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. California"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. san-francisco-bay-core"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Default Zoom Level
                  </label>
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                    {formZoom}x
                  </span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="18"
                  step="0.5"
                  value={formZoom}
                  onChange={(e) => setFormZoom(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Boundary Summary Card */}
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Bound to Current Polygon</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {vertices.length} vertices • {analytics.areaSqKm} km² • Perimeter {analytics.perimeterKm} km
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormSheetOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingRegion ? "Update Region" : "Save Region"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
