import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Vibration,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface FootprintPoint {
  latitude: number;
  longitude: number;
}

export interface OwnerMapPinPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (result: {
    latitude: number;
    longitude: number;
    footprint?: FootprintPoint[] | null;
  }) => void;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialFootprint?: FootprintPoint[] | null;
  address?: string;
}

export const OwnerMapPinPickerModal: React.FC<OwnerMapPinPickerModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialLatitude,
  initialLongitude,
  initialFootprint,
  address,
}) => {
  // Default coordinates fallback: Bandra West, Mumbai or Los Angeles
  const defaultLat = initialLatitude ?? 19.0596;
  const defaultLng = initialLongitude ?? 72.8295;

  const [latitude, setLatitude] = useState<number>(defaultLat);
  const [longitude, setLongitude] = useState<number>(defaultLng);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard');
  const [footprintMode, setFootprintMode] = useState<boolean>(false);
  const [footprint, setFootprint] = useState<FootprintPoint[]>(initialFootprint || []);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);

  // Spring animation for button press
  const confirmScaleAnim = useRef(new Animated.Value(1)).current;
  const webViewRef = useRef<WebView>(null);

  // Reset coordinates whenever modal opens or props change
  useEffect(() => {
    if (visible) {
      const lat = initialLatitude ?? defaultLat;
      const lng = initialLongitude ?? defaultLng;
      setLatitude(lat);
      setLongitude(lng);
      setFootprint(initialFootprint || []);
      setFootprintMode(false);
      setIsMapReady(false);
    }
  }, [visible, initialLatitude, initialLongitude, initialFootprint]);

  const mapboxToken =
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
    'pk.eyJ1IjoiYmFuYXJhc2lrdW1hciIsImEiOiJjbXRvazNsamUwZnVqMnhyMWo0eTVpZGFnIn0.3g6cFy0DWAMq4ExD-Jixzw';

  // Haptic simulation
  const triggerHaptic = useCallback(() => {
    try {
      if (Platform.OS === 'ios') {
        Vibration.vibrate(10);
      } else {
        Vibration.vibrate(15);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleToggleMapStyle = (newStyle: 'standard' | 'satellite') => {
    triggerHaptic();
    setMapStyle(newStyle);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.setMapStyle) {
          window.setMapStyle('${newStyle}');
        }
        true;
      `);
    }
  };

  const handleToggleFootprint = () => {
    triggerHaptic();
    const nextState = !footprintMode;
    setFootprintMode(nextState);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.setFootprintMode) {
          window.setFootprintMode(${nextState});
        }
        true;
      `);
    }
  };

  const handleClearFootprint = () => {
    triggerHaptic();
    setFootprint([]);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.clearFootprint) {
          window.clearFootprint();
        }
        true;
      `);
    }
  };

  const handleConfirmPress = () => {
    triggerHaptic();
    Animated.sequence([
      Animated.timing(confirmScaleAnim, {
        toValue: 0.95,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(confirmScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onConfirm({
        latitude: parseFloat(latitude.toFixed(6)),
        longitude: parseFloat(longitude.toFixed(6)),
        footprint: footprint.length >= 3 ? footprint : null,
      });
      onClose();
    });
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'COORD_CHANGE') {
        setLatitude(data.latitude);
        setLongitude(data.longitude);
      } else if (data.type === 'FOOTPRINT_CHANGE') {
        setFootprint(data.footprint || []);
        triggerHaptic();
      } else if (data.type === 'MAP_READY') {
        setIsMapReady(true);
      }
    } catch (err) {
      // ignore JSON parse error
    }
  };

  const formatCoordinateDisplay = (lat: number, lng: number) => {
    const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
    const lngStr = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
    return `📍 ${latStr}, ${lngStr} • Precise Accuracy`;
  };

  // Mapbox HTML payload
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
    }
    .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { display: none !important; }

    /* Centered Pin Container */
    #pin-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -100%);
      pointer-events: none;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    #pin-overlay.lifted {
      transform: translate(-50%, -130%) scale(1.12);
    }

    /* Luxury Pin Head */
    .pin-head {
      width: 44px;
      height: 44px;
      border-radius: 50% 50% 50% 0;
      background: linear-gradient(135deg, #10b981 0%, #047857 100%);
      border: 3px solid #ffffff;
      box-shadow: 0 4px 16px rgba(4, 120, 87, 0.45);
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pin-inner-dot {
      width: 15px;
      height: 15px;
      background: #ffffff;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.25);
    }

    /* Floating Shadow */
    #pin-shadow {
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 18px;
      height: 7px;
      background: rgba(15, 23, 42, 0.35);
      border-radius: 50%;
      filter: blur(1.5px);
      transition: all 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    #pin-overlay.lifted #pin-shadow {
      transform: translateX(-50%) scale(0.65);
      opacity: 0.18;
      filter: blur(3.5px);
    }

    /* Footprint marker pins */
    .footprint-marker {
      width: 24px;
      height: 24px;
      background: #10b981;
      border: 2.5px solid #ffffff;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    }

    /* Tap Ripple Effect */
    .ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.35);
      transform: scale(0);
      animation: rippleEffect 0.6s ease-out;
      pointer-events: none;
    }
    @keyframes rippleEffect {
      to {
        transform: scale(3);
        opacity: 0;
      }
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <!-- Center Pin with Dynamic Spring Elevation -->
  <div id="pin-overlay">
    <div class="pin-head">
      <div class="pin-inner-dot"></div>
    </div>
    <div id="pin-shadow"></div>
  </div>

  <script>
    mapboxgl.accessToken = '${mapboxToken}';

    var currentLng = ${defaultLng};
    var currentLat = ${defaultLat};
    var isFootprintMode = false;
    var footprintPoints = ${JSON.stringify(
      (initialFootprint || []).map((p) => [p.longitude, p.latitude])
    )};
    var footprintMarkers = [];

    var map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [currentLng, currentLat],
      zoom: 16.2,
      pitch: 0,
      bearing: 0,
      attributionControl: false
    });

    var pinOverlay = document.getElementById('pin-overlay');

    map.on('load', function() {
      // Add GeoJSON source & layer for footprint polygon
      map.addSource('footprint-source', {
        type: 'geojson',
        data: getFootprintGeoJSON()
      });

      map.addLayer({
        id: 'footprint-fill',
        type: 'fill',
        source: 'footprint-source',
        paint: {
          'fill-color': '#10b981',
          'fill-opacity': 0.28
        }
      });

      map.addLayer({
        id: 'footprint-stroke',
        type: 'line',
        source: 'footprint-source',
        paint: {
          'line-color': '#059669',
          'line-width': 2.8,
          'line-dasharray': [2, 1]
        }
      });

      renderFootprintMarkers();

      sendToRN({ type: 'MAP_READY' });
      emitCenter();
    });

    // Spring elevation on pan
    map.on('movestart', function() {
      if (!isFootprintMode) {
        pinOverlay.classList.add('lifted');
      }
    });

    map.on('move', function() {
      if (!isFootprintMode) {
        var center = map.getCenter();
        sendToRN({
          type: 'COORD_CHANGE',
          latitude: center.lat,
          longitude: center.lng
        });
      }
    });

    map.on('moveend', function() {
      pinOverlay.classList.remove('lifted');
      emitCenter();
    });

    // Map tap handler
    map.on('click', function(e) {
      if (isFootprintMode) {
        if (footprintPoints.length >= 4) {
          footprintPoints = [];
        }
        footprintPoints.push([e.lngLat.lng, e.lngLat.lat]);
        updateFootprintLayers();
        renderFootprintMarkers();

        var payload = footprintPoints.map(function(p) {
          return { longitude: p[0], latitude: p[1] };
        });
        sendToRN({ type: 'FOOTPRINT_CHANGE', footprint: payload });
      } else {
        map.easeTo({ center: e.lngLat, duration: 320 });
      }
    });

    function emitCenter() {
      var center = map.getCenter();
      currentLng = center.lng;
      currentLat = center.lat;
      sendToRN({
        type: 'COORD_CHANGE',
        latitude: center.lat,
        longitude: center.lng
      });
    }

    function getFootprintGeoJSON() {
      if (footprintPoints.length < 3) {
        return {
          type: 'FeatureCollection',
          features: []
        };
      }
      var closedRing = footprintPoints.slice();
      // Ensure polygon is closed
      if (
        closedRing[0][0] !== closedRing[closedRing.length - 1][0] ||
        closedRing[0][1] !== closedRing[closedRing.length - 1][1]
      ) {
        closedRing.push(closedRing[0]);
      }
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [closedRing]
            }
          }
        ]
      };
    }

    function updateFootprintLayers() {
      if (map.getSource('footprint-source')) {
        map.getSource('footprint-source').setData(getFootprintGeoJSON());
      }
    }

    function renderFootprintMarkers() {
      footprintMarkers.forEach(function(m) { m.remove(); });
      footprintMarkers = [];

      footprintPoints.forEach(function(pt, idx) {
        var el = document.createElement('div');
        el.className = 'footprint-marker';
        el.innerText = (idx + 1).toString();

        var marker = new mapboxgl.Marker({ element: el })
          .setLngLat(pt)
          .addTo(map);

        footprintMarkers.push(marker);
      });
    }

    // React Native Communication API
    window.setMapStyle = function(styleType) {
      if (styleType === 'satellite') {
        map.setStyle('mapbox://styles/mapbox/satellite-streets-v12');
        map.easeTo({ pitch: 48, bearing: -12, duration: 600 });
      } else {
        map.setStyle('mapbox://styles/mapbox/streets-v12');
        map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
      }
      // Re-apply footprint when style finishes reloading
      map.once('style.load', function() {
        if (!map.getSource('footprint-source')) {
          map.addSource('footprint-source', {
            type: 'geojson',
            data: getFootprintGeoJSON()
          });
          map.addLayer({
            id: 'footprint-fill',
            type: 'fill',
            source: 'footprint-source',
            paint: { 'fill-color': '#10b981', 'fill-opacity': 0.28 }
          });
          map.addLayer({
            id: 'footprint-stroke',
            type: 'line',
            source: 'footprint-source',
            paint: { 'line-color': '#059669', 'line-width': 2.8, 'line-dasharray': [2, 1] }
          });
        }
      });
    };

    window.setFootprintMode = function(enabled) {
      isFootprintMode = enabled;
      if (enabled) {
        pinOverlay.style.display = 'none';
      } else {
        pinOverlay.style.display = 'flex';
      }
    };

    window.clearFootprint = function() {
      footprintPoints = [];
      updateFootprintLayers();
      renderFootprintMarkers();
      sendToRN({ type: 'FOOTPRINT_CHANGE', footprint: [] });
    };

    function sendToRN(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }
  </script>
</body>
</html>
  `;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={false}
    >
      <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
        {/* FormSheet Drag Grabber & Header */}
        <View style={styles.sheetHeader}>
          <View style={styles.dragGrabber} />
          <View style={styles.headerTitleRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>Pin Property Location</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {address || 'Drag map or tap to set exact coordinates'}
              </Text>
            </View>

            {/* Apple Haptic Close Button */}
            <TouchableOpacity
              style={styles.closeCircleButton}
              onPress={() => {
                triggerHaptic();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Coordinate Display Banner */}
        <View style={styles.coordinateBanner}>
          <View style={styles.coordLivePulse} />
          <Text style={styles.coordinateText}>
            {formatCoordinateDisplay(latitude, longitude)}
          </Text>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            style={styles.mapWebView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.mapLoadingOverlay}>
                <ActivityIndicator size="large" color="#059669" />
                <Text style={styles.mapLoadingText}>Initializing 3D Mapbox...</Text>
              </View>
            )}
            onMessage={handleMessage}
          />

          {/* Floating Controls Overlay */}
          <View style={styles.floatingControlsContainer}>
            {/* Style Toggle Pill: Standard vs. Satellite */}
            <View style={styles.stylePillContainer}>
              <TouchableOpacity
                style={[
                  styles.stylePillSegment,
                  mapStyle === 'standard' && styles.stylePillActive,
                ]}
                onPress={() => handleToggleMapStyle('standard')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="map-outline"
                  size={14}
                  color={mapStyle === 'standard' ? '#0f172a' : '#64748b'}
                />
                <Text
                  style={[
                    styles.stylePillText,
                    mapStyle === 'standard' && styles.stylePillTextActive,
                  ]}
                >
                  Standard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.stylePillSegment,
                  mapStyle === 'satellite' && styles.stylePillActive,
                ]}
                onPress={() => handleToggleMapStyle('satellite')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="earth-outline"
                  size={14}
                  color={mapStyle === 'satellite' ? '#0f172a' : '#64748b'}
                />
                <Text
                  style={[
                    styles.stylePillText,
                    mapStyle === 'satellite' && styles.stylePillTextActive,
                  ]}
                >
                  Satellite 3D
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footprint Polygon Toggle Button */}
            <View style={styles.footprintBtnGroup}>
              <TouchableOpacity
                style={[
                  styles.footprintToggleButton,
                  footprintMode && styles.footprintToggleActive,
                ]}
                onPress={handleToggleFootprint}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={footprintMode ? 'crop' : 'crop-outline'}
                  size={15}
                  color={footprintMode ? '#ffffff' : '#0f172a'}
                />
                <Text
                  style={[
                    styles.footprintToggleText,
                    footprintMode && styles.footprintToggleTextActive,
                  ]}
                >
                  {footprintMode ? 'Footprint Active' : 'Draw Footprint'}
                </Text>
              </TouchableOpacity>

              {footprint.length > 0 && (
                <TouchableOpacity
                  style={styles.footprintClearButton}
                  onPress={handleClearFootprint}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={14} color="#dc2626" />
                  <Text style={styles.footprintClearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Footprint Tap Instructional Tooltip */}
          {footprintMode && (
            <View style={styles.footprintInstructionsCard}>
              <Ionicons name="finger-print-outline" size={16} color="#059669" />
              <Text style={styles.footprintInstructionsText}>
                Tap 4 corners on the map to outline the building footprint (
                {footprint.length}/4 corners)
              </Text>
            </View>
          )}
        </View>

        {/* Modal Bottom Confirm Bar */}
        <View style={styles.bottomActionBar}>
          <Animated.View style={{ transform: [{ scale: confirmScaleAnim }] }}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmPress}
              activeOpacity={0.9}
            >
              <View style={styles.confirmButtonContent}>
                <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                <Text style={styles.confirmButtonText}>
                  {footprint.length >= 3
                    ? `Confirm Pin & Footprint (${footprint.length} pts)`
                    : 'Confirm Location'}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  dragGrabber: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  closeCircleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordinateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  coordLivePulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  coordinateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    letterSpacing: -0.2,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  mapWebView: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLoadingText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  floatingControlsContainer: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  stylePillContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 24,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  stylePillSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 5,
  },
  stylePillActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  stylePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  stylePillTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  footprintBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footprintToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 24,
    paddingVertical: 7,
    paddingHorizontal: 12,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  footprintToggleActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  footprintToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  footprintToggleTextActive: {
    color: '#ffffff',
  },
  footprintClearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  footprintClearText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  footprintInstructionsCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  footprintInstructionsText: {
    flex: 1,
    fontSize: 12,
    color: '#065f46',
    fontWeight: '600',
  },
  bottomActionBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  confirmButton: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
