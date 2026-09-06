export interface SingleUnitMarker {
  type: 'single';
  id: string;
  title: string;
  price: number;
  latitude: number;
  longitude: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqft?: number | null;
  address?: string | null;
  isVerified?: boolean;
  isNew?: boolean;
  property_media?: Array<{ url: string }>;
  list_type?: string;
  prop_type?: string;
  rawProperty: any;
}

export interface MultiUnitBuildingMarker {
  type: 'multi';
  id: string; // building unique id e.g. "bldg-<lat>-<lng>"
  buildingName: string;
  address: string;
  latitude: number;
  longitude: number;
  unitsCount: number;
  startingPrice: number;
  maxPrice: number;
  featuredPhoto?: string;
  isVerified: boolean;
  units: any[];
  showThumbnail?: boolean; // determined by collision detection
  list_type?: string;
}

export type ClusteredMarker = SingleUnitMarker | MultiUnitBuildingMarker;

const DEFAULT_BUILDING_PHOTO =
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80';

/**
 * Normalizes an address string for robust matching.
 */
function cleanAddressString(addr: any): string | null {
  if (typeof addr !== 'string') return null;
  const cleaned = addr.trim().toLowerCase().replace(/\s+/g, ' ');
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Disjoint Set Union (DSU) to group properties sharing coordinates or clean addresses.
 */
class DisjointSet {
  private parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }

  find(i: number): number {
    if (this.parent[i] === i) return i;
    this.parent[i] = this.find(this.parent[i]);
    return this.parent[i];
  }

  union(i: number, j: number): void {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      this.parent[rootI] = rootJ;
    }
  }
}

/**
 * Groups properties that share the same coordinates (rounded to 4 decimal places)
 * or same clean address into single or multi-unit markers.
 */
export function clusterPropertiesByBuilding(properties: any[]): ClusteredMarker[] {
  if (!Array.isArray(properties) || properties.length === 0) {
    return [];
  }

  // Filter properties with valid coordinate numbers
  const validProperties = properties.filter(
    (p) =>
      p &&
      typeof p.latitude === 'number' &&
      !isNaN(p.latitude) &&
      typeof p.longitude === 'number' &&
      !isNaN(p.longitude)
  );

  if (validProperties.length === 0) {
    return [];
  }

  const n = validProperties.length;
  const dsu = new DisjointSet(n);

  const coordMap = new Map<string, number>();
  const addressMap = new Map<string, number>();

  for (let i = 0; i < n; i++) {
    const p = validProperties[i];
    const coordKey = `${p.latitude.toFixed(4)}_${p.longitude.toFixed(4)}`;
    const addrKey = cleanAddressString(p.address);

    if (coordMap.has(coordKey)) {
      dsu.union(i, coordMap.get(coordKey)!);
    } else {
      coordMap.set(coordKey, i);
    }

    if (addrKey) {
      if (addressMap.has(addrKey)) {
        dsu.union(i, addressMap.get(addrKey)!);
      } else {
        addressMap.set(addrKey, i);
      }
    }
  }

  // Collect grouped properties
  const groupsMap = new Map<number, any[]>();
  for (let i = 0; i < n; i++) {
    const root = dsu.find(i);
    if (!groupsMap.has(root)) {
      groupsMap.set(root, []);
    }
    groupsMap.get(root)!.push(validProperties[i]);
  }

  const result: ClusteredMarker[] = [];
  const usedIds = new Set<string>();

  for (const group of groupsMap.values()) {
    if (group.length === 1) {
      const p = group[0];
      const singleMarker: SingleUnitMarker = {
        type: 'single',
        id: String(p.id),
        title: p.title || '',
        price: typeof p.price === 'number' ? p.price : Number(p.price) || 0,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        area_sqft: p.area_sqft,
        address: p.address || null,
        isVerified: Boolean(p.isVerified),
        isNew: Boolean(p.isNew),
        property_media: Array.isArray(p.property_media) ? p.property_media : [],
        list_type: p.list_type,
        prop_type: p.prop_type,
        rawProperty: p,
      };
      result.push(singleMarker);
    } else {
      const first = group[0];
      const lat = Number(first.latitude);
      const lng = Number(first.longitude);

      const prices = group.map((p) => (typeof p.price === 'number' ? p.price : Number(p.price) || 0));
      const startingPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const buildingName = first.address || first.title || 'Multi-Unit Building';
      const featuredPhoto =
        first.property_media?.[0]?.url || DEFAULT_BUILDING_PHOTO;
      const isVerified = group.some((p) => Boolean(p.isVerified));

      const baseId = `bldg-${lat.toFixed(4)}-${lng.toFixed(4)}`;
      let id = baseId;
      let counter = 1;
      while (usedIds.has(id)) {
        id = `${baseId}-${counter++}`;
      }
      usedIds.add(id);

      const multiMarker: MultiUnitBuildingMarker = {
        type: 'multi',
        id,
        buildingName,
        address: first.address || '',
        latitude: lat,
        longitude: lng,
        unitsCount: group.length,
        startingPrice,
        maxPrice,
        featuredPhoto,
        isVerified,
        units: group,
        showThumbnail: false,
        list_type: first.list_type,
      };
      result.push(multiMarker);
    }
  }

  return result;
}

/**
 * Calculates thumbnail collision for multi-unit buildings.
 * - Sorts multi-unit buildings by priority: (isVerified ? 1 : 0) + unitsCount
 * - Uses greedy non-overlapping algorithm ensuring top 3-5 multi-unit buildings with
 *   at least ~0.02 lat/lng distance from each other get showThumbnail = true
 * - Always sets showThumbnail = true for selectedId if it is a multi-unit marker.
 */
export function calculateThumbnailCollision(
  markers: ClusteredMarker[],
  selectedId: string | null
): ClusteredMarker[] {
  if (!Array.isArray(markers) || markers.length === 0) {
    return [];
  }

  const multiMarkers = markers.filter(
    (m): m is MultiUnitBuildingMarker => m.type === 'multi'
  );

  if (multiMarkers.length === 0) {
    return markers;
  }

  const DISTANCE_THRESHOLD = 0.02;
  const MAX_THUMBNAILS = 5;

  const thumbnailIds = new Set<string>();
  const acceptedLocations: Array<{ latitude: number; longitude: number }> = [];

  // If selectedId belongs to a multi-unit marker, always show its thumbnail
  const selectedMulti = selectedId
    ? multiMarkers.find((m) => m.id === selectedId)
    : null;

  if (selectedMulti) {
    thumbnailIds.add(selectedMulti.id);
    acceptedLocations.push({
      latitude: selectedMulti.latitude,
      longitude: selectedMulti.longitude,
    });
  }

  // Sort multi-unit markers by priority: (isVerified ? 1 : 0) + unitsCount
  const sortedMulti = [...multiMarkers].sort((a, b) => {
    const priorityA = (a.isVerified ? 1 : 0) + a.unitsCount;
    const priorityB = (b.isVerified ? 1 : 0) + b.unitsCount;
    if (priorityB !== priorityA) {
      return priorityB - priorityA;
    }
    // Secondary tie-breaker: verified first, then unitsCount
    if (a.isVerified !== b.isVerified) {
      return a.isVerified ? -1 : 1;
    }
    return b.unitsCount - a.unitsCount;
  });

  // Greedy collision check for top 3-5 non-overlapping multi-unit buildings
  for (const marker of sortedMulti) {
    if (thumbnailIds.has(marker.id)) {
      continue;
    }

    if (acceptedLocations.length >= MAX_THUMBNAILS) {
      break;
    }

    const collides = acceptedLocations.some(
      (loc) =>
        Math.hypot(marker.latitude - loc.latitude, marker.longitude - loc.longitude) <
        DISTANCE_THRESHOLD
    );

    if (!collides) {
      thumbnailIds.add(marker.id);
      acceptedLocations.push({
        latitude: marker.latitude,
        longitude: marker.longitude,
      });
    }
  }

  return markers.map((marker) => {
    if (marker.type === 'multi') {
      return {
        ...marker,
        showThumbnail: thumbnailIds.has(marker.id),
      };
    }
    return marker;
  });
}
