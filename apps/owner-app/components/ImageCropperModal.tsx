import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  SafeAreaView,
  Alert,
} from 'react-native';
import { manipulateAsync, SaveFormat, Action } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';

export interface CroppedImageResult {
  originalUri: string;
  uri: string;
  base64?: string;
  width: number;
  height: number;
}

interface ImageCropperModalProps {
  visible: boolean;
  images: string[];
  onCancel: () => void;
  onComplete: (results: CroppedImageResult[]) => void;
}

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1200;

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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [croppedMap, setCroppedMap] = useState<Record<number, CroppedImageResult>>({});
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Transform state for interactive canvas
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Refs for tracking pinch and pan gestures smoothly
  const minScaleRef = useRef(1);
  const scaleRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const startPanRef = useRef({ x: 0, y: 0 });
  const initialDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef(1);

  // Synchronize state with refs
  scaleRef.current = scale;
  panRef.current = pan;

  // Load natural dimensions of current image
  useEffect(() => {
    if (!visible || !images[currentIndex]) return;

    setImageSize(null);
    Image.getSize(
      images[currentIndex],
      (origW, origH) => {
        setImageSize({ width: origW, height: origH });
        // Calculate initial fill-mode scale: image MUST fully cover boxWidth x boxHeight
        const fillScale = Math.max(boxWidth / origW, boxHeight / origH);
        minScaleRef.current = fillScale;
        setScale(fillScale);
        scaleRef.current = fillScale;
        setPan({ x: 0, y: 0 });
        panRef.current = { x: 0, y: 0 };
      },
      (error) => {
        console.error('Failed to get image size:', error);
        Alert.alert('Error', 'Could not load selected image.');
      }
    );
  }, [visible, currentIndex, images, boxWidth, boxHeight]);

  // Clamp translation so image never leaves the 4:3 box (fill mode)
  const clampPan = useCallback(
    (targetX: number, targetY: number, currentScale: number) => {
      if (!imageSize) return { x: 0, y: 0 };
      const currentW = imageSize.width * currentScale;
      const currentH = imageSize.height * currentScale;

      const maxPanX = Math.max(0, (currentW - boxWidth) / 2);
      const maxPanY = Math.max(0, (currentH - boxHeight) / 2);

      const clampedX = Math.min(maxPanX, Math.max(-maxPanX, targetX));
      const clampedY = Math.min(maxPanY, Math.max(-maxPanY, targetY));
      return { x: clampedX, y: clampedY };
    },
    [imageSize, boxWidth, boxHeight]
  );

  // PanResponder to handle 1-finger pan and 2-finger pinch-zoom
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 1) {
          startPanRef.current = { ...panRef.current };
          initialDistanceRef.current = null;
        } else if (touches.length >= 2) {
          const t1 = touches[0];
          const t2 = touches[1];
          initialDistanceRef.current = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
          initialScaleRef.current = scaleRef.current;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 1 && initialDistanceRef.current === null) {
          // Pan
          const newX = startPanRef.current.x + gestureState.dx;
          const newY = startPanRef.current.y + gestureState.dy;
          const clamped = clampPan(newX, newY, scaleRef.current);
          setPan(clamped);
        } else if (touches.length >= 2) {
          // Pinch
          const t1 = touches[0];
          const t2 = touches[1];
          const currentDistance = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
          if (initialDistanceRef.current && initialDistanceRef.current > 0) {
            const distanceRatio = currentDistance / initialDistanceRef.current;
            const newScaleCandidate = initialScaleRef.current * distanceRatio;
            // Never zoom out smaller than fill scale!
            const newScale = Math.max(minScaleRef.current, Math.min(minScaleRef.current * 4, newScaleCandidate));
            setScale(newScale);
            // Reclamp pan with new scale
            const clamped = clampPan(panRef.current.x, panRef.current.y, newScale);
            setPan(clamped);
          }
        }
      },
      onPanResponderRelease: () => {
        initialDistanceRef.current = null;
      },
      onPanResponderTerminate: () => {
        initialDistanceRef.current = null;
      },
    })
  ).current;

  // Reset current crop to center-fill
  const handleReset = () => {
    if (!imageSize) return;
    const fillScale = Math.max(boxWidth / imageSize.width, boxHeight / imageSize.height);
    setScale(fillScale);
    setPan({ x: 0, y: 0 });
  };

  // Perform crop on the currently active image
  const cropCurrentImage = async (): Promise<CroppedImageResult | null> => {
    if (!imageSize) return null;
    try {
      setIsProcessing(true);
      const origW = imageSize.width;
      const origH = imageSize.height;

      // Crop coordinates relative to the original image dimensions
      const screenImgLeft = (boxWidth - origW * scale) / 2 + pan.x;
      const screenImgTop = (boxHeight - origH * scale) / 2 + pan.y;

      const cropRelX = -screenImgLeft;
      const cropRelY = -screenImgTop;

      let originX = Math.round(cropRelX / scale);
      let originY = Math.round(cropRelY / scale);
      let width = Math.round(boxWidth / scale);
      let height = Math.round(boxHeight / scale);

      // Boundary protections
      originX = Math.max(0, Math.min(origW - width, originX));
      originY = Math.max(0, Math.min(origH - height, originY));
      width = Math.min(origW - originX, width);
      height = Math.min(origH - originY, height);

      // Enforce 4:3 aspect ratio consistency
      if (width > 0 && height > 0) {
        const expectedH = Math.round((width * 3) / 4);
        if (expectedH <= origH - originY) {
          height = expectedH;
        }
      }

      const actions: Action[] = [
        {
          crop: {
            originX,
            originY,
            width,
            height,
          },
        },
      ];

      // If dimensions exceed 1600x1200, clamp down while preserving 4:3
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        actions.push({
          resize: {
            width: MAX_WIDTH,
            height: MAX_HEIGHT,
          },
        });
      }

      // Convert to WebP with 0.82 compression and extract base64 for fast binary upload
      const result = await manipulateAsync(images[currentIndex], actions, {
        compress: 0.82,
        format: SaveFormat.WEBP,
        base64: true,
      });

      const croppedResult: CroppedImageResult = {
        originalUri: images[currentIndex],
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

    // Check if there are other images to crop
    const nextUncroppedIndex = images.findIndex((_, idx) => idx !== currentIndex && !croppedMap[idx]);
    if (nextUncroppedIndex !== -1) {
      setCurrentIndex(nextUncroppedIndex);
    } else if (currentIndex + 1 < images.length) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Complete and pass results to caller
  const handleDone = async () => {
    // If current image has not been cropped yet, crop it first
    let latestMap = { ...croppedMap };
    if (!latestMap[currentIndex]) {
      const result = await cropCurrentImage();
      if (result) {
        latestMap[currentIndex] = result;
      }
    }

    const results: CroppedImageResult[] = images
      .map((_, idx) => latestMap[idx])
      .filter((item): item is CroppedImageResult => !!item);

    if (results.length === 0) {
      Alert.alert('No Images Cropped', 'Please crop at least one image before continuing.');
      return;
    }

    onComplete(results);
  };

  const totalCroppedCount = Object.keys(croppedMap).length;
  const isCurrentCropped = !!croppedMap[currentIndex];

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
              Crop Photo {currentIndex + 1} of {images.length}
            </Text>
            <Text style={styles.headerSubtitle}>Fixed 4:3 Aspect Ratio (Fill Mode)</Text>
          </View>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Ionicons name="refresh" size={18} color="#38bdf8" />
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Viewport Area */}
        <View style={styles.viewportContainer}>
          <View
            style={[
              styles.cropBox,
              {
                width: boxWidth,
                height: boxHeight,
              },
            ]}
            {...panResponder.panHandlers}
          >
            {imageSize ? (
              <Image
                source={{ uri: images[currentIndex] }}
                style={{
                  width: imageSize.width,
                  height: imageSize.height,
                  transform: [
                    { translateX: (boxWidth - imageSize.width) / 2 + pan.x },
                    { translateY: (boxHeight - imageSize.height) / 2 + pan.y },
                    { scale },
                  ],
                }}
                resizeMode="cover"
              />
            ) : (
              <ActivityIndicator size="large" color="#059669" />
            )}

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
          </View>

          <Text style={styles.gestureHint}>Pinch to zoom · Drag to position (Always fills frame)</Text>
        </View>

        {/* Bottom Carousel of Selected Images */}
        <View style={styles.bottomSection}>
          <View style={styles.thumbnailHeader}>
            <Text style={styles.thumbnailLabel}>Selected Images ({images.length})</Text>
            <Text style={styles.thumbnailStatus}>
              {totalCroppedCount} of {images.length} Cropped
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailList}>
            {images.map((uri, idx) => {
              const isSelected = idx === currentIndex;
              const hasCropped = !!croppedMap[idx];
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.thumbnailWrap, isSelected && styles.thumbnailWrapActive]}
                  onPress={() => setCurrentIndex(idx)}
                >
                  <Image source={{ uri: croppedMap[idx]?.uri || uri }} style={styles.thumbnailImage} />
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
              style={[styles.continueButton, isProcessing && styles.buttonDisabled]}
              onPress={handleDone}
              disabled={isProcessing}
            >
              <Text style={styles.continueButtonText}>Done & Continue</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  cropBox: {
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#059669',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
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
  gestureHint: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 14,
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
  thumbnailStatus: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '600',
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
  continueButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
