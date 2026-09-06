import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface Point {
  x: number;
  y: number;
}

interface MobileTouchDrawOverlayProps {
  isDrawing: boolean;
  onFinishDraw: (screenPoints: Point[]) => void;
  onCancelDraw: () => void;
}

export const MobileTouchDrawOverlay: React.FC<MobileTouchDrawOverlayProps> = ({
  isDrawing,
  onFinishDraw,
  onCancelDraw,
}) => {
  const [points, setPoints] = useState<Point[]>([]);
  const pointsRef = useRef<Point[]>([]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const startPoint = { x: locationX, y: locationY };
        pointsRef.current = [startPoint];
        setPoints([startPoint]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPoint = { x: locationX, y: locationY };
        const last = pointsRef.current[pointsRef.current.length - 1];
        if (!last || Math.hypot(last.x - newPoint.x, last.y - newPoint.y) > 3) {
          pointsRef.current.push(newPoint);
          setPoints([...pointsRef.current]);
        }
      },
      onPanResponderRelease: () => {
        if (pointsRef.current.length >= 3) {
          onFinishDraw(pointsRef.current);
        }
        pointsRef.current = [];
        setPoints([]);
      },
    })
  ).current;

  const pathData = useMemo(() => {
    if (points.length < 2) return '';
    return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
  }, [points]);

  if (!isDrawing) return null;

  return (
    <View style={styles.overlayContainer}>
      {/* Drawing Instructions Floating Banner */}
      <View style={styles.instructionBanner}>
        <View style={styles.instructionLeft}>
          <View style={styles.pulsingDot} />
          <Text style={styles.instructionText}>
            Draw a shape around the area you want to search
          </Text>
        </View>
        <TouchableOpacity onPress={onCancelDraw} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Gesture Capture Surface */}
      <View style={styles.drawingSurface} {...panResponder.panHandlers}>
        {points.length > 0 && (
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            {points.length >= 2 && (
              <Path
                d={pathData}
                stroke="#2563eb"
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={points.length >= 3 ? 'rgba(37, 99, 235, 0.12)' : 'none'}
              />
            )}
            {points.length > 0 && (
              <Circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r={4}
                fill="#2563eb"
              />
            )}
          </Svg>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 60,
  },
  instructionBanner: {
    position: 'absolute',
    top: 54,
    left: 20,
    right: 20,
    zIndex: 70,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  instructionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f43f5e',
    marginRight: 8,
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cancelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  drawingSurface: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
  },
  drawPoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e11d48',
  },
});

export default MobileTouchDrawOverlay;
