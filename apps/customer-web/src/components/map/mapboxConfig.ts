import mapboxgl from "mapbox-gl";

// Read public Mapbox token
export const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Safe client-side setup
if (typeof window !== "undefined" && MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

export const hasValidMapboxToken = Boolean(
  MAPBOX_TOKEN && MAPBOX_TOKEN.trim().length > 0
);

export function logMissingTokenWarning() {
  console.warn(
    "[Mapbox]: NEXT_PUBLIC_MAPBOX_TOKEN is not configured in apps/customer-web/.env.local"
  );
}

// Mapbox standard styles
export const MAPBOX_STYLES = {
  streets: "mapbox://styles/mapbox/standard",
  satellite: "mapbox://styles/mapbox/standard-satellite",
  // Backwards compatibility aliases
  standard: "mapbox://styles/mapbox/standard",
  osm: "mapbox://styles/mapbox/standard",
  canvas: "mapbox://styles/mapbox/standard",
  liberty: "mapbox://styles/mapbox/standard",
  topo: "mapbox://styles/mapbox/standard",
} as const;

export const MAP_STYLES = MAPBOX_STYLES;
export type MapStyleKey = "streets" | "satellite";
export type MapboxStyleKey = MapStyleKey;

// Camera configuration constants
export const DEFAULT_CAMERA_CONFIG = {
  pitch: 0,
  bearing: 0,
  maxPitch: 60,
  minZoom: 3,
  maxZoom: 22,
};

export const PITCH_3D = 55;
export const FLY_TO_3D_PITCH = 45;
export const FLY_TO_3D_ZOOM = 16.5;

// Configure Mapbox Standard 3D Basemap properties
export function configureStandardStyle(map: mapboxgl.Map) {
  if (typeof (map as any).setConfigProperty === "function") {
    try {
      (map as any).setConfigProperty("basemap", "lightPreset", "day");
      (map as any).setConfigProperty("basemap", "show3dObjects", true);
    } catch (err) {
      console.warn("[Mapbox Standard Config Notice]:", err);
    }
  }
}

// OpenStreetMap Classic Standard pure MapLibre style JSON (backwards-compatibility fallback)
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

// High-Res Esri Satellite pure MapLibre style JSON (backwards-compatibility fallback)
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
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "esri-satellite-layer",
      type: "raster",
      source: "esri-satellite",
      minzoom: 0,
      maxzoom: 24,
    },
  ],
};

// Luxury Light Canvas Basemap (backwards-compatibility fallback)
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
  },
  layers: [
    {
      id: "esri-light-gray-base-layer",
      type: "raster",
      source: "esri-light-gray-base",
      minzoom: 0,
      maxzoom: 24,
    },
  ],
};
