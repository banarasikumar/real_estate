import React, { useRef, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface MobileMapProperty {
  id: string;
  title?: string;
  price?: number;
  latitude?: number | null;
  longitude?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqft?: number | null;
  address?: string | null;
  isVerified?: boolean;
  isNew?: boolean;
  unitsCount?: number;
  startingPrice?: number;
  startingPriceFormatted?: string;
  showThumbnail?: boolean;
  thumbnailUrl?: string;
  [key: string]: any;
}

export interface MobileMapboxViewRef {
  recenter: () => void;
  convertPointsToCoords: (points: Array<{ x: number; y: number }>) => void;
  flyToRegion: (center: [number, number], zoom: number) => void;
}

export interface MobileMapboxViewProps {
  markers?: any[]; // ClusteredMarker[] (SingleUnitMarker | MultiUnitBuildingMarker)
  selectedId?: string | null;
  viewedIds?: Set<string>;
  mapType: 'standard' | 'satellite';
  is3D: boolean;
  listType?: 'SALE' | 'RENT' | string;
  drawnPolygon?: Array<{ latitude: number; longitude: number }> | null;
  regionBoundary?: Array<[number, number]> | null;
  onSelectMarker?: (marker: any | null) => void;
  onRegionChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onPolygonCreated?: (coords: Array<{ latitude: number; longitude: number }>) => void;
  onMapTouch?: () => void;
  // Legacy aliases for backward compatibility
  properties?: any[];
  selectedPropertyId?: string | null;
  viewedPropertyIds?: Set<string>;
  onSelectProperty?: (property: any | null) => void;
}

export function formatRawPrice(price: number): string {
  if (!price && price !== 0) return '--';
  if (price >= 10000000) {
    const cr = price / 10000000;
    return `${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
  }
  if (price >= 100000) {
    const l = price / 100000;
    return `${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)} L`;
  }
  if (price >= 1000) {
    return `${(price / 1000).toFixed(0)}k`;
  }
  return `${price.toLocaleString()}`;
}

export function formatPricePill(price: number): string {
  if (!price && price !== 0) return '₹--';
  return `₹${formatRawPrice(price)}`;
}

const MobileMapboxViewComponent = forwardRef<MobileMapboxViewRef, MobileMapboxViewProps>(
  (
    {
      markers,
      selectedId,
      viewedIds,
      mapType,
      is3D,
      listType = 'SALE',
      drawnPolygon,
      regionBoundary,
      onSelectMarker,
      onRegionChange,
      onPolygonCreated,
      onMapTouch,
      // Legacy props
      properties,
      selectedPropertyId,
      viewedPropertyIds,
      onSelectProperty,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null);

    const effectiveMarkers = markers || properties || [];
    const effectiveSelectedId = selectedId !== undefined ? selectedId : (selectedPropertyId || null);
    const effectiveViewedIds = viewedIds || viewedPropertyIds || new Set<string>();
    const effectiveListType = listType || 'SALE';

    useImperativeHandle(ref, () => ({
      recenter: () => {
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`if (window.recenter) { window.recenter(); }`);
        }
      },
      convertPointsToCoords: (points: Array<{ x: number; y: number }>) => {
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(
            `if (window.convertPointsToCoords) { window.convertPointsToCoords(${JSON.stringify(points)}); }`
          );
        }
      },
      flyToRegion: (center: [number, number], zoom: number) => {
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(
            `if (window.flyToRegion) { window.flyToRegion(${JSON.stringify(center)}, ${zoom}); }`
          );
        }
      },
    }));

    const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

    // Markers payload formatted for Mapbox injection
    const markersPayload = useMemo(() => {
      return effectiveMarkers
        .filter((m: any) => typeof m.latitude === 'number' && typeof m.longitude === 'number')
        .map((m: any) => {
          const isMulti = Boolean(
            (typeof m.unitsCount === 'number' && m.unitsCount > 1) ||
            (typeof m.units_count === 'number' && m.units_count > 1) ||
            m.isMultiUnit === true ||
            m.type === 'multi_unit' ||
            m.type === 'building' ||
            (Array.isArray(m.units) && m.units.length > 1)
          );
          const unitsCount =
            m.unitsCount ||
            m.units_count ||
            (Array.isArray(m.units) ? m.units.length : 1);
          const rawPrice = m.startingPrice ?? m.minPrice ?? m.price ?? 0;
          const startingPriceFormatted = m.startingPriceFormatted
            ? String(m.startingPriceFormatted).replace(/^₹/, '')
            : formatRawPrice(rawPrice);
          const priceFormatted = m.priceFormatted || formatPricePill(rawPrice);
          const isNew = Boolean(m.isNew || m.is_new || m.isNewListing);
          const photoUrl =
            m.thumbnailUrl ||
            m.thumbnail ||
            m.imageUrl ||
            m.photo ||
            m.image ||
            (Array.isArray(m.photos) ? m.photos[0] : null) ||
            (Array.isArray(m.images) ? m.images[0] : null) ||
            null;

          return {
            ...m,
            isMultiUnit: isMulti,
            unitsCount,
            startingPriceFormatted,
            priceFormatted,
            isNew,
            showThumbnail: Boolean(m.showThumbnail && photoUrl),
            thumbnailUrl: photoUrl,
            isViewed: effectiveViewedIds.has(m.id),
            isSelected: m.id === effectiveSelectedId,
          };
        });
    }, [effectiveMarkers, effectiveSelectedId, effectiveViewedIds]);

    // Handle messages sent from WebGL Mapbox to React Native
    const handleMessage = useCallback(
      (event: any) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'SELECT_MARKER' || data.type === 'SELECT_PROPERTY') {
            const markerId = data.markerId !== undefined ? data.markerId : data.propertyId;
            const list = markers || properties || [];
            const found = markerId ? (list.find((m: any) => m.id === markerId) || null) : null;
            if (onSelectMarker) {
              onSelectMarker(found);
            }
            if (onSelectProperty) {
              onSelectProperty(found);
            }
          } else if (data.type === 'REGION_CHANGE') {
            onRegionChange?.(data.bounds);
          } else if (data.type === 'POLYGON_CREATED') {
            onPolygonCreated?.(data.coordinates);
          } else if (data.type === 'MAP_TOUCH') {
            onMapTouch?.();
          }
        } catch (err) {
          // ignore JSON parse errors
        }
      },
      [markers, properties, onSelectMarker, onSelectProperty, onRegionChange, onPolygonCreated, onMapTouch]
    );

    // Send adaptive listType (Rent/Sale) update to WebView
    useEffect(() => {
      if (webViewRef.current) {
        const script = `
          if (window.setListType) {
            window.setListType('${effectiveListType}');
          }
        `;
        webViewRef.current.injectJavaScript(script);
      }
    }, [effectiveListType]);

    // Send markers updates to WebView
    useEffect(() => {
      if (webViewRef.current) {
        const script = `
          if (window.updateMarkers) {
            window.updateMarkers(${JSON.stringify(markersPayload)});
          }
        `;
        webViewRef.current.injectJavaScript(script);
      }
    }, [markersPayload]);

    // Send 3D tilt update to WebView
    useEffect(() => {
      if (webViewRef.current) {
        const script = `
          if (window.toggle3D) {
            window.toggle3D(${is3D});
          }
        `;
        webViewRef.current.injectJavaScript(script);
      }
    }, [is3D]);

    // Send Map Type (Streets / Satellite) update to WebView
    useEffect(() => {
      if (webViewRef.current) {
        const script = `
          if (window.setMapStyle) {
            window.setMapStyle('${mapType}');
          }
        `;
        webViewRef.current.injectJavaScript(script);
      }
    }, [mapType]);

    // Send Selected Marker Fly-to
    useEffect(() => {
      if (effectiveSelectedId && webViewRef.current) {
        const target = effectiveMarkers.find((m: any) => m.id === effectiveSelectedId);
        if (target && target.latitude && target.longitude) {
          const script = `
            if (window.flyToCoords) {
              window.flyToCoords(${target.longitude}, ${target.latitude});
            }
          `;
          webViewRef.current.injectJavaScript(script);
        }
      }
    }, [effectiveSelectedId, effectiveMarkers]);

    // Send Drawn Polygon update to WebView
    useEffect(() => {
      if (webViewRef.current) {
        const script = `
          if (window.updatePolygon) {
            window.updatePolygon(${JSON.stringify(drawnPolygon || null)});
          }
        `;
        webViewRef.current.injectJavaScript(script);
      }
    }, [drawnPolygon]);

    // Send Region Boundary update to WebView
    useEffect(() => {
      if (webViewRef.current) {
        const script = `
          if (window.updateRegionBoundary) {
            window.updateRegionBoundary(${JSON.stringify(regionBoundary || null)});
          }
        `;
        webViewRef.current.injectJavaScript(script);
      }
    }, [regionBoundary]);

    // Adaptive Dynamic Color Palette
    const isRent = effectiveListType === 'RENT';
    const primaryColor = isRent ? '#7B1FA2' : '#e11d48';
    const selectedColor = isRent ? '#511270' : '#be123c';
    const softTint = isRent ? '#f3e5f5' : '#fff1f2';
    const viewedTextColor = isRent ? '#4a148c' : '#9f1239';
    const viewedBorderColor = isRent ? '#ce93d8' : '#fecdd3';

    // HTML content rendering Mapbox GL JS v3 with LOD, two-tier badges, and thumbnail cards
    const htmlContent = useMemo(() => {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
  <style>
    :root {
      --primary: ${primaryColor};
      --selected: ${selectedColor};
      --soft-tint: ${softTint};
      --viewed-text: ${viewedTextColor};
      --viewed-border: ${viewedBorderColor};
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    /* 6. Ensure the Mapbox watermark logo is completely hidden */
    .mapboxgl-ctrl-logo,
    .mapboxgl-ctrl-bottom-left,
    .mapboxgl-ctrl-attrib {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }

    /* Base Marker Container */
    .marker-container {
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      -webkit-tap-highlight-color: transparent;
      transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .marker-container:active {
      transform: scale(0.92);
    }
    .marker-container.selected {
      z-index: 999 !important;
    }

    /* Zoom LOD Display Rules */
    .lod-far {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .lod-close {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
    }

    #map.zoom-far .lod-far,
    .marker-container.zoom-far .lod-far {
      display: flex !important;
    }
    #map.zoom-far .lod-close,
    .marker-container.zoom-far .lod-close {
      display: none !important;
    }

    #map.zoom-close .lod-far,
    .marker-container.zoom-close .lod-far {
      display: none !important;
    }
    #map.zoom-close .lod-close,
    .marker-container.zoom-close .lod-close {
      display: flex !important;
    }

    /* --- FAR ZOOM STYLES (zoom < 12.5) --- */

    /* Single unit marker: dot */
    .single-far-dot {
      width: 10px;
      height: 10px;
      border-radius: 5px;
      background-color: var(--primary);
      border: 1.5px solid #ffffff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
      transition: transform 0.15s ease, background-color 0.15s ease;
    }
    .marker-container.selected .single-far-dot {
      background-color: var(--selected);
      transform: scale(1.3);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }
    .marker-container.viewed .single-far-dot {
      background-color: var(--soft-tint);
      border-color: var(--viewed-border);
    }

    /* Single unit marker: 'New' pill */
    .single-far-new {
      background-color: var(--primary);
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
      border: 1.5px solid #ffffff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
      white-space: nowrap;
      letter-spacing: 0.2px;
      transition: transform 0.15s ease, background-color 0.15s ease;
    }
    .marker-container.selected .single-far-new {
      background-color: var(--selected);
      transform: scale(1.15);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }
    .marker-container.viewed .single-far-new {
      background-color: var(--soft-tint);
      color: var(--viewed-text);
      border-color: var(--viewed-border);
    }

    /* Multi-unit Far Badge (26x26 circular) */
    .multi-far-badge {
      width: 26px;
      height: 26px;
      border-radius: 13px;
      background-color: var(--primary);
      border: 1.5px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s ease, background-color 0.15s ease;
    }
    .multi-far-badge svg {
      display: block;
    }
    .marker-container.selected .multi-far-badge {
      background-color: var(--selected);
      transform: scale(1.18);
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
    }
    .marker-container.viewed .multi-far-badge {
      background-color: var(--soft-tint);
      border-color: var(--viewed-border);
    }
    .marker-container.viewed .multi-far-badge svg path {
      stroke: var(--viewed-text);
    }

    /* --- CLOSE ZOOM STYLES (zoom >= 12.5) --- */

    /* Single unit horizontal price pill */
    .single-close-pill {
      background-color: var(--primary);
      color: #ffffff;
      font-weight: 800;
      font-size: 11px;
      padding: 4px 9px;
      border-radius: 20px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
      border: 1.5px solid #ffffff;
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s ease, background-color 0.15s ease;
    }
    .marker-container.selected .single-close-pill {
      background-color: var(--selected);
      transform: scale(1.15);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    }
    .marker-container.viewed .single-close-pill {
      background-color: var(--soft-tint);
      color: var(--viewed-text);
      border-color: var(--viewed-border);
    }

    /* Multi-unit Two-Tier Capsule */
    .multi-two-tier-capsule {
      background-color: var(--primary);
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 14px;
      border: 1.5px solid #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      transition: transform 0.15s ease, background-color 0.15s ease;
    }
    .multi-top-row {
      font-size: 10px;
      font-weight: 700;
      opacity: 0.95;
      line-height: 1.2;
      letter-spacing: 0.2px;
    }
    .multi-bottom-row {
      font-size: 11.5px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 3.5px;
      line-height: 1.3;
      margin-top: 1px;
    }
    .multi-bottom-row svg {
      stroke: currentColor;
      flex-shrink: 0;
    }
    .marker-container.selected .multi-two-tier-capsule {
      background-color: var(--selected);
      transform: scale(1.15);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
    }
    .marker-container.viewed .multi-two-tier-capsule {
      background-color: var(--soft-tint);
      color: var(--viewed-text);
      border-color: var(--viewed-border);
    }

    /* Downward Caret */
    .price-caret {
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 5px solid var(--primary);
      margin-top: -1px;
      transition: border-top-color 0.15s ease;
    }
    .marker-container.selected .price-caret {
      border-top-color: var(--selected);
    }
    .marker-container.viewed .price-caret {
      border-top-color: var(--soft-tint);
    }

    /* Photo Thumbnail Card */
    .thumbnail-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 5px;
      position: relative;
      pointer-events: none;
    }
    .thumbnail-container {
      width: 72px;
      height: 48px;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      background-color: #0f172a;
    }
    .thumbnail-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .thumbnail-pointer {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 5px solid #ffffff;
      margin-top: -1px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    mapboxgl.accessToken = '${token}';

    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/standard',
      center: [72.8777, 19.076],
      zoom: 11,
      pitch: 0,
      attributionControl: false
    });

    window.__listType = '${effectiveListType}';
    let currentMarkers = {};
    let currentMarkersData = {};

    map.on('style.load', function() {
      if (map.setConfigProperty) {
        map.setConfigProperty('basemap', 'lightPreset', 'day');
        map.setConfigProperty('basemap', 'show3dObjects', true);
      }
      if (window.__pendingPolygon) {
        window.updatePolygon(window.__pendingPolygon);
      }
      if (window.__pendingRegionBoundary) {
        window.updateRegionBoundary(window.__pendingRegionBoundary);
      }
    });

    // 4. Zoom Event Handling (LOD)
    function updateLOD() {
      const currentZoom = map.getZoom();
      const isFar = currentZoom < 12.5;
      const mapEl = document.getElementById('map');
      if (mapEl) {
        if (isFar) {
          mapEl.classList.add('zoom-far');
          mapEl.classList.remove('zoom-close');
        } else {
          mapEl.classList.add('zoom-close');
          mapEl.classList.remove('zoom-far');
        }
      }

      // Also toggle class on all marker elements
      Object.keys(currentMarkers).forEach(function(id) {
        const marker = currentMarkers[id];
        if (marker) {
          const el = marker.getElement();
          if (el) {
            if (isFar) {
              el.classList.add('zoom-far');
              el.classList.remove('zoom-close');
            } else {
              el.classList.add('zoom-close');
              el.classList.remove('zoom-far');
            }
          }
        }
      });
    }

    map.on('zoom', updateLOD);

    // 2. Adaptive Dynamic Colors handler
    window.setListType = function(type) {
      window.__listType = type;
      const isRent = type === 'RENT';
      const root = document.documentElement;
      root.style.setProperty('--primary', isRent ? '#7B1FA2' : '#e11d48');
      root.style.setProperty('--selected', isRent ? '#511270' : '#be123c');
      root.style.setProperty('--soft-tint', isRent ? '#f3e5f5' : '#fff1f2');
      root.style.setProperty('--viewed-text', isRent ? '#4a148c' : '#9f1239');
      root.style.setProperty('--viewed-border', isRent ? '#ce93d8' : '#fecdd3');

      if (map.getLayer('drawn-polygon-fill')) {
        map.setPaintProperty('drawn-polygon-fill', 'fill-color', isRent ? '#7B1FA2' : '#e11d48');
      }
      if (map.getLayer('drawn-polygon-stroke')) {
        map.setPaintProperty('drawn-polygon-stroke', 'line-color', isRent ? '#7B1FA2' : '#e11d48');
      }
    };

    // Helper: Create HTML structure for marker
    function createMarkerElement(m) {
      const el = document.createElement('div');
      el.className = 'marker-container ' + (m.isMultiUnit ? 'marker-multi' : 'marker-single') +
        (m.isSelected ? ' selected' : '') + (m.isViewed ? ' viewed' : '');

      const isFar = map.getZoom() < 12.5;
      el.classList.add(isFar ? 'zoom-far' : 'zoom-close');

      if (m.isSelected) {
        el.style.zIndex = '999';
      }

      // --- FAR ZOOM CONTENT (.lod-far) ---
      const lodFar = document.createElement('div');
      lodFar.className = 'lod-far';

      if (m.isMultiUnit) {
        // Multi-unit Far: Circular purple/rose badge (26x26) with crisp white building icon
        const badge = document.createElement('div');
        badge.className = 'multi-far-badge';
        badge.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>';
        lodFar.appendChild(badge);
      } else {
        // Single unit Far:
        // If isNew: Small pill with text "New" (font-size: 10px, padding: 2px 6px)
        // Otherwise: Small circular dot (10x10)
        if (m.isNew) {
          const newPill = document.createElement('div');
          newPill.className = 'single-far-new';
          newPill.textContent = 'New';
          lodFar.appendChild(newPill);
        } else {
          const dot = document.createElement('div');
          dot.className = 'single-far-dot';
          lodFar.appendChild(dot);
        }
      }
      el.appendChild(lodFar);

      // --- CLOSE ZOOM CONTENT (.lod-close) ---
      const lodClose = document.createElement('div');
      lodClose.className = 'lod-close';

      // Photo Thumbnail Card (for markers with showThumbnail === true)
      if (m.showThumbnail && m.thumbnailUrl) {
        const thumbWrapper = document.createElement('div');
        thumbWrapper.className = 'thumbnail-wrapper';

        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'thumbnail-container';

        const img = document.createElement('img');
        img.src = m.thumbnailUrl;
        img.alt = 'Property photo';
        img.loading = 'lazy';
        img.onerror = function() {
          thumbWrapper.style.display = 'none';
        };

        const pointer = document.createElement('div');
        pointer.className = 'thumbnail-pointer';

        thumbContainer.appendChild(img);
        thumbWrapper.appendChild(thumbContainer);
        thumbWrapper.appendChild(pointer);
        lodClose.appendChild(thumbWrapper);
      }

      if (m.isMultiUnit) {
        // Multi-unit Close: Two-tier rounded capsule
        const capsule = document.createElement('div');
        capsule.className = 'multi-two-tier-capsule';

        // Top row: {unitsCount} units (font-size: 10px, font-weight: 700, opacity: 0.95)
        const topRow = document.createElement('div');
        topRow.className = 'multi-top-row';
        topRow.textContent = (m.unitsCount || 2) + ' units';
        capsule.appendChild(topRow);

        // Bottom row: SVG building icon + ₹{startingPriceFormatted}+ (font-size: 11.5px, font-weight: 800)
        const bottomRow = document.createElement('div');
        bottomRow.className = 'multi-bottom-row';
        bottomRow.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg><span>₹' + (m.startingPriceFormatted || '--') + '+</span>';
        capsule.appendChild(bottomRow);

        lodClose.appendChild(capsule);

        // Downward caret
        const caret = document.createElement('div');
        caret.className = 'price-caret';
        lodClose.appendChild(caret);
      } else {
        // Single unit Close: Classic horizontal price pill with caret
        const pill = document.createElement('div');
        pill.className = 'single-close-pill';
        pill.textContent = m.priceFormatted || '₹--';
        lodClose.appendChild(pill);

        const caret = document.createElement('div');
        caret.className = 'price-caret';
        lodClose.appendChild(caret);
      }

      el.appendChild(lodClose);

      // 5. Click Events: Clicking a marker posts message: { type: 'SELECT_MARKER', markerId: m.id }
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SELECT_MARKER',
            markerId: m.id
          }));
        }
      });

      return el;
    }

    // Update Markers
    window.updateMarkers = function(props) {
      const newIds = new Set(props.map(function(p) { return p.id; }));
      Object.keys(currentMarkers).forEach(function(id) {
        if (!newIds.has(id)) {
          currentMarkers[id].remove();
          delete currentMarkers[id];
          delete currentMarkersData[id];
        }
      });

      if (props.length === 0) return;

      const bounds = new mapboxgl.LngLatBounds();

      props.forEach(function(p) {
        bounds.extend([p.longitude, p.latitude]);

        const prev = currentMarkersData[p.id];
        if (currentMarkers[p.id]) {
          // If structure didn't change, smoothly toggle classes
          if (
            prev &&
            prev.isMultiUnit === p.isMultiUnit &&
            prev.showThumbnail === p.showThumbnail &&
            prev.thumbnailUrl === p.thumbnailUrl &&
            prev.priceFormatted === p.priceFormatted &&
            prev.startingPriceFormatted === p.startingPriceFormatted &&
            prev.unitsCount === p.unitsCount &&
            prev.isNew === p.isNew
          ) {
            const el = currentMarkers[p.id].getElement();
            if (el) {
              el.classList.toggle('selected', !!p.isSelected);
              el.classList.toggle('viewed', !!p.isViewed);
              el.style.zIndex = p.isSelected ? '999' : '';
            }
            currentMarkersData[p.id] = p;
            return;
          } else {
            currentMarkers[p.id].remove();
            delete currentMarkers[p.id];
          }
        }

        const el = createMarkerElement(p);
        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([p.longitude, p.latitude])
          .addTo(map);

        currentMarkers[p.id] = marker;
        currentMarkersData[p.id] = p;
      });

      window.__lastBounds = bounds;

      if (!window.__hasFitted && props.length > 0) {
        window.__hasFitted = true;
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
      }

      updateLOD();
    };

    // Legacy alias
    window.updateProperties = window.updateMarkers;

    // 7. Ref Methods & Map Actions
    window.toggle3D = function(is3d) {
      map.easeTo({ pitch: is3d ? 50 : 0, duration: 600 });
    };

    window.setMapStyle = function(type) {
      const styleUrl = type === 'satellite' 
        ? 'mapbox://styles/mapbox/standard-satellite' 
        : 'mapbox://styles/mapbox/standard';
      map.setStyle(styleUrl);
    };

    window.flyToCoords = function(lng, lat) {
      map.flyTo({
        center: [lng, lat],
        zoom: 15.5,
        duration: 700,
        essential: true
      });
    };

    window.flyToRegion = function(center, zoom) {
      if (!center || center.length < 2) return;
      map.flyTo({
        center: center,
        zoom: typeof zoom === 'number' ? zoom : 12,
        duration: 800,
        essential: true
      });
    };

    window.recenter = function() {
      if (window.__lastBounds && !window.__lastBounds.isEmpty()) {
        map.fitBounds(window.__lastBounds, { padding: 60, maxZoom: 14, duration: 700 });
      }
    };

    window.convertPointsToCoords = function(points) {
      try {
        var coords = points.map(function(pt) {
          var ll = map.unproject([pt.x, pt.y]);
          return { latitude: ll.lat, longitude: ll.lng };
        });
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'POLYGON_CREATED',
            coordinates: coords
          }));
        }
      } catch (err) {
        console.error('convertPoints error', err);
      }
    };

    window.updatePolygon = function(coords) {
      window.__pendingPolygon = coords;
      if (!map.isStyleLoaded()) return;

      const isRent = window.__listType === 'RENT';
      const polyColor = isRent ? '#7B1FA2' : '#e11d48';

      const sourceData = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: coords && coords.length >= 3 ? [coords.map(function(c) { return [c.longitude, c.latitude]; })] : []
        }
      };

      if (map.getSource('drawn-polygon')) {
        map.getSource('drawn-polygon').setData(sourceData);
      } else if (coords && coords.length >= 3) {
        map.addSource('drawn-polygon', {
          type: 'geojson',
          data: sourceData
        });
        map.addLayer({
          id: 'drawn-polygon-fill',
          type: 'fill',
          source: 'drawn-polygon',
          paint: {
            'fill-color': polyColor,
            'fill-opacity': 0.16
          }
        });
        map.addLayer({
          id: 'drawn-polygon-stroke',
          type: 'line',
          source: 'drawn-polygon',
          paint: {
            'line-color': polyColor,
            'line-width': 2.5
          }
        });
      }
    };

    window.updateRegionBoundary = function(coords) {
      window.__pendingRegionBoundary = coords;
      if (!map.isStyleLoaded()) return;

      var ring = [];
      if (coords && coords.length >= 3) {
        ring = coords.slice();
        var first = ring[0];
        var last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          ring.push([first[0], first[1]]);
        }
      }

      var sourceData = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: ring.length >= 4 ? [ring] : []
        }
      };

      if (map.getSource('region-boundary')) {
        map.getSource('region-boundary').setData(sourceData);
      } else if (ring.length >= 4) {
        map.addSource('region-boundary', {
          type: 'geojson',
          data: sourceData
        });
        map.addLayer({
          id: 'region-boundary-fill',
          type: 'fill',
          source: 'region-boundary',
          paint: {
            'fill-color': 'rgba(37, 99, 235, 0.08)',
            'fill-opacity': 1
          }
        });
        map.addLayer({
          id: 'region-boundary-stroke',
          type: 'line',
          source: 'region-boundary',
          paint: {
            'line-color': '#2563eb',
            'line-width': 2.5
          }
        });
      }
    };

    map.on('moveend', function() {
      if (window.ReactNativeWebView) {
        const b = map.getBounds();
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'REGION_CHANGE',
          bounds: {
            north: b.getNorth(),
            south: b.getSouth(),
            east: b.getEast(),
            west: b.getWest()
          }
        }));
      }
    });

    function notifyMapTouch() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'MAP_TOUCH'
        }));
      }
    }
    map.on('touchstart', notifyMapTouch);
    map.on('dragstart', notifyMapTouch);
    map.on('mousedown', notifyMapTouch);

    // 5. Clicking empty map posts: { type: 'SELECT_MARKER', markerId: null }
    map.on('click', function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SELECT_MARKER',
          markerId: null
        }));
      }
    });

    map.on('load', function() {
      updateLOD();
    });
  </script>
</body>
</html>`;
    }, [token, primaryColor, selectedColor, softTint, viewedTextColor, viewedBorderColor, effectiveListType]);

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleMessage}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          style={styles.webView}
        />
      </View>
    );
  }
);

MobileMapboxViewComponent.displayName = 'MobileMapboxView';

export const MobileMapboxView = React.memo(MobileMapboxViewComponent);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8fafc',
  },
  webView: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'transparent',
  },
});

export default MobileMapboxView;
