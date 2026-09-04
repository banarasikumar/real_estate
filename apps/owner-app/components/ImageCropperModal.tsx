import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  PanResponder,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { manipulateAsync, SaveFormat, Action } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';

export interface CropperImageInput {
  uri: string;
  width?: number;
  height?: number;
}

export interface CroppedImageResult {
  originalUri: string;
  uri: string;
  base64?: string;
  width: number;
  height: number;
}

interface ImageCropperModalProps {
  visible: boolean;
  images: (string | CropperImageInput)[];
  onCancel: () => void;
  onComplete: (results: CroppedImageResult[]) => void;
}

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1200;
const MIN_SCALE = 1.0;
const MAX_SCALE = 3.0;

export function ImageCropperModal({
  visible,
  images,
  onCancel,
  onComplete,
}: ImageCropperModalProps) {
  const windowDimensions = Dimensions.get('window');
  // 4:3 Crop Box Dimensions
  const boxWidth = Math.min(windowDimensions.width - 32, 420);
  const boxHeight = Math.round(boxWidth * (3 / 4));

  const normalizedImages: CropperImageInput[] = useMemo(() => {
    return (images || []).map((item) => (typeof item === 'string' ? { uri: item } : item));
  }, [images]);

  const [viewportSize, setViewportSize] = useState({
    width: windowDimensions.width,
    height: Math.round(boxHeight + 80),
  });

  const cropLeft = Math.max(0, (viewportSize.width - boxWidth) / 2);
  const cropTop = Math.max(0, (viewportSize.height - boxHeight) / 2);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [croppedMap, setCroppedMap] = useState<Record<number, CroppedImageResult>>({});
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Transform state: scale (1.0 to 3.0) and pan (x, y)
  const [scale, setScale] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Refs for tracking image gestures smoothly without stale closures or jitter
  const scaleRef = useRef(1.0);
  const panRef = useRef({ x: 0, y: 0 });
  const dragStartTouchRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartPanRef = useRef({ x: 0, y: 0 });
  const lastDistanceRef = useRef<number | null>(null);
  const lastMidpointRef = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef(false);
  const lastTapTimestampRef = useRef<number>(0);

  // Slider refs for tracking continuous zoom bar interaction
  const sliderViewRef = useRef<View>(null);
  const sliderWidthRef = useRef<number>(0);
  const sliderPageXRef = useRef<number>(0);

  // Keep refs synchronized with state
  scaleRef.current = scale;
  panRef.current = pan;

  // Reset index when modal opens or images change
  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      setCroppedMap({});
    }
  }, [visible]);

  // Load natural dimensions of current image
  useEffect(() => {
    if (!visible || !normalizedImages[currentIndex]) {
      setImageSize(null);
      return;
    }

    const currentItem = normalizedImages[currentIndex];

    // If dimensions were provided by ImagePicker, use immediately
    if (currentItem.width && currentItem.height && currentItem.width > 0 && currentItem.height > 0) {
      setImageSize({ width: currentItem.width, height: currentItem.height });
      setScale(1.0);
      scaleRef.current = 1.0;
      setPan({ x: 0, y: 0 });
      panRef.current = { x: 0, y: 0 };
      return;
    }

    // Fallback: fetch natural dimensions with Image.getSize
    let isMounted = true;
    setImageSize(null);

    Image.getSize(
      currentItem.uri,
      (origW, origH) => {
        if (isMounted) {
          setImageSize({ width: origW, height: origH });
          setScale(1.0);
          scaleRef.current = 1.0;
          setPan({ x: 0, y: 0 });
          panRef.current = { x: 0, y: 0 };
        }
      },
      (error) => {
        console.error('Failed to get image size for uri:', currentItem.uri, error);
        if (isMounted) {
          // Default fallback size so the user can still view and crop
          setImageSize({ width: 1200, height: 900 });
          setScale(1.0);
          setPan({ x: 0, y: 0 });
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [visible, currentIndex, normalizedImages]);

  // Base display dimensions: guarantees image covers 100% of 4:3 box at scale = 1.0
  const baseDimensions = useMemo(() => {
    if (!imageSize || imageSize.width <= 0 || imageSize.height <= 0) {
      return { width: boxWidth, height: boxHeight };
    }

    const imageRatio = imageSize.width / imageSize.height;
    const frameRatio = 4 / 3;

    if (imageRatio >= frameRatio) {
      // Landscape / wider than 4:3 -> height fits boxHeight exactly, width overflows
      const height = boxHeight;
      const width = Math.round(boxHeight * imageRatio);
      return { width, height };
    } else {
      // Portrait / taller than 4:3 -> width fits boxWidth exactly, height overflows
      const width = boxWidth;
      const height = Math.round(boxWidth / imageRatio);
      return { width, height };
    }
  }, [imageSize, boxWidth, boxHeight]);

  const baseDimensionsRef = useRef(baseDimensions);
  baseDimensionsRef.current = baseDimensions;

  // Clamp translation so image never leaves the 4:3 box (no voids or black bars)
  const clampPan = useCallback(
    (targetX: number, targetY: number, currentScale: number) => {
      const bDim = baseDimensionsRef.current;
      const currentW = bDim.width * currentScale;
      const currentH = bDim.height * currentScale;

      const maxPanX = Math.max(0, (currentW - boxWidth) / 2);
      const maxPanY = Math.max(0, (currentH - boxHeight) / 2);

      const clampedX = Math.min(maxPanX, Math.max(-maxPanX, targetX));
      const clampedY = Math.min(maxPanY, Math.max(-maxPanY, targetY));
      return { x: clampedX, y: clampedY };
    },
    [boxWidth, boxHeight]
  );

  const clampPanRef = useRef(clampPan);
  clampPanRef.current = clampPan;

  // Helper to programmatically apply scale and safely clamp pan
  const applyScale = useCallback(
    (targetScale: number) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));
      const clamped = clampPanRef.current(panRef.current.x, panRef.current.y, newScale);
      setScale(newScale);
      scaleRef.current = newScale;
      setPan(clamped);
      panRef.current = clamped;
    },
    []
  );

  // Continuous Zoom Slider PanResponder
  const updateScaleFromSliderTouch = useCallback(
    (pageX: number) => {
      if (sliderWidthRef.current <= 0) return;
      const localX = pageX - sliderPageXRef.current;
      const progress = Math.max(0, Math.min(1, localX / sliderWidthRef.current));
      const targetScale = MIN_SCALE + progress * (MAX_SCALE - MIN_SCALE);
      // Fine 0.05 step resolution for buttery smooth slider drag
      const rounded = Math.round(targetScale * 20) / 20;
      applyScale(rounded);
    },
    [applyScale]
  );

  const sliderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt) => {
        const touch = evt.nativeEvent.touches[0];
        if (!touch) return;
        if (sliderWidthRef.current > 0) {
          updateScaleFromSliderTouch(touch.pageX);
        }
        sliderViewRef.current?.measure((_x, _y, width, _height, pageX) => {
          if (width > 0) {
            sliderWidthRef.current = width;
            sliderPageXRef.current = pageX;
            updateScaleFromSliderTouch(touch.pageX);
          }
        });
      },

      onPanResponderMove: (evt) => {
        const touch = evt.nativeEvent.touches[0];
        if (touch) {
          updateScaleFromSliderTouch(touch.pageX);
        }
      },
    })
  ).current;

  // PanResponder to handle silky smooth 1-finger pan and 2-finger pinch-zoom
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        const now = Date.now();

        if (touches.length === 1) {
          // Double-tap detection to toggle 1.0x <-> 2.0x zoom
          if (now - lastTapTimestampRef.current < 300) {
            const target = scaleRef.current > 1.15 ? 1.0 : 2.0;
            applyScale(target);
            lastTapTimestampRef.current = 0;
            dragStartTouchRef.current = null;
            return;
          }
          lastTapTimestampRef.current = now;
          isPinchingRef.current = false;
          lastDistanceRef.current = null;
          dragStartPanRef.current = { ...panRef.current };
          dragStartTouchRef.current = { x: touches[0].pageX, y: touches[0].pageY };
        } else if (touches.length >= 2) {
          isPinchingRef.current = true;
          dragStartTouchRef.current = null;
          const t1 = touches[0];
          const t2 = touches[1];
          lastDistanceRef.current = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
          lastMidpointRef.current = {
            x: (t1.pageX + t2.pageX) / 2,
            y: (t1.pageY + t2.pageY) / 2,
          };
        }
      },

      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length >= 2) {
          // 2 or more touches -> Pinch to zoom + Pan with midpoint
          isPinchingRef.current = true;
          dragStartTouchRef.current = null;

          const t1 = touches[0];
          const t2 = touches[1];
          const currentDistance = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
          const currentMidX = (t1.pageX + t2.pageX) / 2;
          const currentMidY = (t1.pageY + t2.pageY) / 2;

          if (!lastDistanceRef.current || lastDistanceRef.current <= 0) {
            lastDistanceRef.current = currentDistance;
            lastMidpointRef.current = { x: currentMidX, y: currentMidY };
            return;
          }

          // Incremental ratio scaling: smooth and immune to transient touch drops
          const ratio = currentDistance / lastDistanceRef.current;
          lastDistanceRef.current = currentDistance;

          let nextScale = scaleRef.current * ratio;
          nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));

          // Midpoint movement delta (pan with fingers while pinching)
          let nextPanX = panRef.current.x;
          let nextPanY = panRef.current.y;
          if (lastMidpointRef.current) {
            const dx = currentMidX - lastMidpointRef.current.x;
            const dy = currentMidY - lastMidpointRef.current.y;
            nextPanX += dx;
            nextPanY += dy;
          }
          lastMidpointRef.current = { x: currentMidX, y: currentMidY };

          const clamped = clampPanRef.current(nextPanX, nextPanY, nextScale);
          setScale(nextScale);
          scaleRef.current = nextScale;
          setPan(clamped);
          panRef.current = clamped;
        } else if (touches.length === 1) {
          // 1 touch -> Silky smooth baseline panning
          if (isPinchingRef.current) {
            // Transitioning out of pinch: reset drag baseline cleanly
            lastDistanceRef.current = null;
            lastMidpointRef.current = null;
            isPinchingRef.current = false;
            dragStartPanRef.current = { ...panRef.current };
            dragStartTouchRef.current = { x: touches[0].pageX, y: touches[0].pageY };
            return;
          }

          const touch = touches[0];
          if (!dragStartTouchRef.current) {
            dragStartTouchRef.current = { x: touch.pageX, y: touch.pageY };
            dragStartPanRef.current = { ...panRef.current };
            return;
          }

          const totalDeltaX = touch.pageX - dragStartTouchRef.current.x;
          const totalDeltaY = touch.pageY - dragStartTouchRef.current.y;

          const targetX = dragStartPanRef.current.x + totalDeltaX;
          const targetY = dragStartPanRef.current.y + totalDeltaY;
          const clamped = clampPanRef.current(targetX, targetY, scaleRef.current);

          // Sub-pixel deadband to eliminate digitizer sensor jitter
          if (
            Math.abs(clamped.x - panRef.current.x) > 0.25 ||
            Math.abs(clamped.y - panRef.current.y) > 0.25
          ) {
            setPan(clamped);
            panRef.current = clamped;
          }
        }
      },

      onPanResponderRelease: () => {
        lastDistanceRef.current = null;
        lastMidpointRef.current = null;
        dragStartTouchRef.current = null;
        isPinchingRef.current = false;
      },
      onPanResponderTerminate: () => {
        lastDistanceRef.current = null;
        lastMidpointRef.current = null;
        dragStartTouchRef.current = null;
        isPinchingRef.current = false;
      },
    })
  ).current;

  // Reset current crop to center-fill
  const handleReset = () => {
    applyScale(1.0);
    setPan({ x: 0, y: 0 });
    dragStartTouchRef.current = null;
    dragStartPanRef.current = { x: 0, y: 0 };
  };

  // Perform crop on the currently active image
  const cropCurrentImage = async (): Promise<CroppedImageResult | null> => {
    if (!imageSize || !normalizedImages[currentIndex]) return null;
    try {
      setIsProcessing(true);
      const origW = imageSize.width;
      const origH = imageSize.height;

      const currentW = baseDimensions.width * scale;
      const currentH = baseDimensions.height * scale;

      // Crop coordinates: distance from image top-left to 4:3 box top-left
      const cropScreenX = (currentW - boxWidth) / 2 - pan.x;
      const cropScreenY = (currentH - boxHeight) / 2 - pan.y;

      // Scale from original bitmap pixels to screen display pixels
      const screenScale = currentW / origW;

      let originX = Math.round(cropScreenX / screenScale);
      let originY = Math.round(cropScreenY / screenScale);
      let cropWidth = Math.round(boxWidth / screenScale);
      let cropHeight = Math.round(boxHeight / screenScale);

      // Boundary protections within original image
      originX = Math.max(0, Math.min(origW - cropWidth, originX));
      originY = Math.max(0, Math.min(origH - cropHeight, originY));
      cropWidth = Math.min(origW - originX, cropWidth);
      cropHeight = Math.min(origH - originY, cropHeight);

      // Enforce strict 4:3 aspect ratio
      const expectedH = Math.round((cropWidth * 3) / 4);
      if (expectedH <= origH - originY) {
        cropHeight = expectedH;
      } else {
        cropWidth = Math.round((cropHeight * 4) / 3);
      }

      const actions: Action[] = [
        {
          crop: {
            originX,
            originY,
            width: cropWidth,
            height: cropHeight,
          },
        },
      ];

      // If dimensions exceed 1600x1200, clamp down while preserving 4:3
      if (cropWidth > MAX_WIDTH || cropHeight > MAX_HEIGHT) {
        actions.push({
          resize: {
            width: MAX_WIDTH,
            height: MAX_HEIGHT,
          },
        });
      }

      // Convert to WebP with 0.82 compression and extract base64 for fast binary upload
      const result = await manipulateAsync(normalizedImages[currentIndex].uri, actions, {
        compress: 0.82,
        format: SaveFormat.WEBP,
        base64: true,
      });

      const croppedResult: CroppedImageResult = {
        originalUri: normalizedImages[currentIndex].uri,
        uri: result.uri,
        base64: result.base64,
        width: result.width,
        height: result.height,
      };

      setCroppedMap((prev) => ({
        ...prev,
        [currentIndex]: croppedResult,
      }));

      return croppedResult;
    } catch (err: any) {
      console.error('Error cropping image:', err);
      Alert.alert('Crop Failed', err?.message || 'Could not crop image.');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  // Crop current and move to next uncropped image
  const handleCropAndNext = async () => {
    const cropped = await cropCurrentImage();
    if (!cropped) return;

    // Check if there are other uncropped images
    const nextUncroppedIndex = normalizedImages.findIndex(
      (_, idx) => idx !== currentIndex && !croppedMap[idx]
    );

    if (nextUncroppedIndex !== -1) {
      setCurrentIndex(nextUncroppedIndex);
    } else {
      // All images are now cropped! Stay on screen so user can review before tapping Done
      Alert.alert(
        'All Photos Cropped!',
        'Every selected photo has been framed. Review your cropped gallery below or tap "Done & Continue" to add them to your listing.',
        [{ text: 'Review Gallery' }]
      );
    }
  };

  // Complete and pass results to caller
  const handleDone = async () => {
    let latestMap = { ...croppedMap };

    // If current photo has not been cropped yet, crop it now
    if (!latestMap[currentIndex]) {
      const result = await cropCurrentImage();
      if (result) {
        latestMap[currentIndex] = result;
      }
    }

    // Require all photos to be explicitly reviewed and cropped
    const uncroppedIndices = normalizedImages
      .map((_, idx) => idx)
      .filter((idx) => !latestMap[idx]);

    if (uncroppedIndices.length > 0) {
      const remainingCount = uncroppedIndices.length;
      Alert.alert(
        'Uncropped Photos Remaining',
        `Please review and crop all selected photos before continuing (${remainingCount} remaining).`,
        [
          {
            text: `Go to Photo ${uncroppedIndices[0] + 1}`,
            onPress: () => setCurrentIndex(uncroppedIndices[0]),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    const results: CroppedImageResult[] = normalizedImages
      .map((_, idx) => latestMap[idx])
      .filter((item): item is CroppedImageResult => !!item);

    onComplete(results);
  };

  const totalCroppedCount = Object.keys(croppedMap).length;
  const isCurrentCropped = !!croppedMap[currentIndex];
  const allImagesCropped = totalCroppedCount === normalizedImages.length && normalizedImages.length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancel}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              Crop Photo {currentIndex + 1} of {normalizedImages.length}
            </Text>
            <Text style={styles.headerSubtitle}>Fixed 4:3 Aspect Ratio (Fill Mode)</Text>
          </View>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Ionicons name="refresh" size={18} color="#38bdf8" />
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Viewport Area */}
        <View
          style={styles.viewportContainer}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) {
              setViewportSize({ width, height });
            }
          }}
          {...panResponder.panHandlers}
        >
          {/* Active Image (Extends into shadow area) */}
          {imageSize && normalizedImages[currentIndex] ? (
            <View pointerEvents="none">
              <Image
                source={{ uri: normalizedImages[currentIndex].uri }}
                style={{
                  width: baseDimensions.width,
                  height: baseDimensions.height,
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { scale },
                  ],
                }}
                resizeMode="cover"
              />
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#059669" />
              <Text style={styles.loadingText}>Loading image preview...</Text>
            </View>
          )}

          {/* 4-Quadrant 60% Dimmed Shadow Mask */}
          {/* Top Shadow */}
          <View
            pointerEvents="none"
            style={[
              styles.shadowOverlay,
              {
                top: 0,
                left: 0,
                right: 0,
                height: cropTop,
              },
            ]}
          />
          {/* Bottom Shadow */}
          <View
            pointerEvents="none"
            style={[
              styles.shadowOverlay,
              {
                top: cropTop + boxHeight,
                left: 0,
                right: 0,
                bottom: 0,
              },
            ]}
          />
          {/* Left Shadow */}
          <View
            pointerEvents="none"
            style={[
              styles.shadowOverlay,
              {
                top: cropTop,
                height: boxHeight,
                left: 0,
                width: cropLeft,
              },
            ]}
          />
          {/* Right Shadow */}
          <View
            pointerEvents="none"
            style={[
              styles.shadowOverlay,
              {
                top: cropTop,
                height: boxHeight,
                left: cropLeft + boxWidth,
                right: 0,
              },
            ]}
          />

          {/* 4:3 Clear Crop Frame (Positioned at exact center) */}
          <View
            pointerEvents="none"
            style={[
              styles.cropFrame,
              {
                top: cropTop,
                left: cropLeft,
                width: boxWidth,
                height: boxHeight,
              },
            ]}
          >
            {/* Visual Grid Lines & Corner Brackets */}
            <View pointerEvents="none" style={styles.gridOverlay}>
              <View style={styles.gridLineH1} />
              <View style={styles.gridLineH2} />
              <View style={styles.gridLineV1} />
              <View style={styles.gridLineV2} />
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>

            {/* Zoom Factor Pill */}
            <View pointerEvents="none" style={styles.zoomPill}>
              <Text style={styles.zoomPillText}>{scale.toFixed(1)}x</Text>
            </View>
          </View>
        </View>

        {/* Interactive Continuous Zoom Slider Bar */}
        <View style={styles.zoomControlBar}>
          <TouchableOpacity
            style={[styles.zoomStepButton, scale <= MIN_SCALE && styles.zoomButtonDisabled]}
            onPress={() => applyScale(Math.max(MIN_SCALE, Math.round((scale - 0.2) * 10) / 10))}
            disabled={scale <= MIN_SCALE}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="remove" size={20} color={scale <= MIN_SCALE ? '#475569' : '#ffffff'} />
          </TouchableOpacity>

          <View
            ref={sliderViewRef}
            style={styles.sliderTrackWrapper}
            onLayout={() => {
              sliderViewRef.current?.measure((_x, _y, width, _height, pageX) => {
                if (width > 0) {
                  sliderWidthRef.current = width;
                  sliderPageXRef.current = pageX;
                }
              });
            }}
            {...sliderPanResponder.panHandlers}
          >
            {/* Background Rail */}
            <View style={styles.sliderRail}>
              {/* Active Fill Rail */}
              <View
                style={[
                  styles.sliderActiveRail,
                  {
                    width: `${Math.min(
                      100,
                      Math.max(0, ((scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 100)
                    )}%`,
                  },
                ]}
              />
            </View>

            {/* Draggable Knob / Thumb */}
            <View
              style={[
                styles.sliderThumb,
                {
                  left: `${Math.min(
                    100,
                    Math.max(0, ((scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 100)
                  )}%`,
                },
              ]}
            >
              <View style={styles.sliderThumbInner} />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.zoomStepButton, scale >= MAX_SCALE && styles.zoomButtonDisabled]}
            onPress={() => applyScale(Math.min(MAX_SCALE, Math.round((scale + 0.2) * 10) / 10))}
            disabled={scale >= MAX_SCALE}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add" size={20} color={scale >= MAX_SCALE ? '#475569' : '#ffffff'} />
          </TouchableOpacity>
        </View>

        {/* Labels below slider: 1.0x on left, current zoom in center, 3.0x on right */}
        <View style={styles.sliderLabelsRow}>
          <Text style={styles.sliderMinMaxLabel}>1.0x</Text>
          <View style={styles.sliderValueBadge}>
            <Text style={styles.sliderValueBadgeText}>{scale.toFixed(1)}x</Text>
          </View>
          <Text style={styles.sliderMinMaxLabel}>3.0x</Text>
        </View>

        <Text style={styles.gestureHint}>
          Drag slider or pinch to zoom · Double-tap for 2.0x · Drag image to position
        </Text>

        {/* Bottom Carousel of Selected Images */}
        <View style={styles.bottomSection}>
          <View style={styles.thumbnailHeader}>
            <Text style={styles.thumbnailLabel}>Selected Images ({normalizedImages.length})</Text>
            <View style={styles.statusBadge}>
              <Ionicons
                name={allImagesCropped ? 'checkmark-circle' : 'hourglass-outline'}
                size={14}
                color={allImagesCropped ? '#34d399' : '#38bdf8'}
              />
              <Text style={[styles.thumbnailStatus, allImagesCropped && styles.thumbnailStatusComplete]}>
                {totalCroppedCount} of {normalizedImages.length} Cropped
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailList}
          >
            {normalizedImages.map((item, idx) => {
              const isSelected = idx === currentIndex;
              const hasCropped = !!croppedMap[idx];
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.thumbnailWrap, isSelected && styles.thumbnailWrapActive]}
                  onPress={() => setCurrentIndex(idx)}
                >
                  <Image source={{ uri: croppedMap[idx]?.uri || item.uri }} style={styles.thumbnailImage} />
                  <View style={styles.thumbnailBadge}>
                    <Text style={styles.thumbnailBadgeText}>{idx + 1}</Text>
                  </View>
                  {hasCropped && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.cropButton, isProcessing && styles.buttonDisabled]}
              onPress={handleCropAndNext}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={isCurrentCropped ? 'checkmark-circle-outline' : 'crop-outline'}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.cropButtonText}>
                    {isCurrentCropped ? 'Update Crop' : 'Crop & Next'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.continueButton,
                (!allImagesCropped && !isCurrentCropped) && styles.continueButtonMuted,
                isProcessing && styles.buttonDisabled,
              ]}
              onPress={handleDone}
              disabled={isProcessing}
            >
              <Text style={styles.continueButtonText}>
                {allImagesCropped ? 'Done & Continue' : `Crop & Finish (${totalCroppedCount}/${normalizedImages.length})`}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerButton: {
    padding: 6,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  viewportContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#090d16',
  },
  shadowOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(9, 13, 22, 0.60)',
  },
  cropFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLineH1: {
    position: 'absolute',
    top: '33.33%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  gridLineH2: {
    position: 'absolute',
    top: '66.66%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  gridLineV1: {
    position: 'absolute',
    left: '33.33%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  gridLineV2: {
    position: 'absolute',
    left: '66.66%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: '#34d399',
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  zoomPill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  zoomPillText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  zoomControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  zoomStepButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonDisabled: {
    opacity: 0.35,
    borderColor: '#1e293b',
  },
  sliderTrackWrapper: {
    flex: 1,
    height: 38,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderRail: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    width: '100%',
  },
  sliderActiveRail: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    top: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#10b981',
    marginLeft: -14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
  sliderThumbInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginTop: 2,
  },
  sliderMinMaxLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  sliderValueBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  sliderValueBadgeText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
  },
  gestureHint: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  bottomSection: {
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  thumbnailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  thumbnailLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  thumbnailStatus: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  thumbnailStatusComplete: {
    color: '#34d399',
  },
  thumbnailList: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  thumbnailWrap: {
    width: 64,
    height: 48,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#334155',
    position: 'relative',
  },
  thumbnailWrapActive: {
    borderColor: '#059669',
    borderWidth: 2.5,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e293b',
  },
  thumbnailBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  thumbnailBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#059669',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cropButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
  },
  cropButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
  },
  continueButtonMuted: {
    backgroundColor: '#0f766e',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
