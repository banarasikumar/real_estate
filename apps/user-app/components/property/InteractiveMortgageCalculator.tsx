import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { EnrichedPropertyDetails } from '../../types/propertyDetails';

// Colors conforming to spec
const COLORS = {
  // SALE Colors
  principalAndInterest: '#2563eb', // Royal Blue
  propertyTaxes: '#e11d48',        // Rose
  homeInsurance: '#f59e0b',        // Amber
  hoaFees: '#10b981',              // Emerald

  // RENT Colors
  monthlyRent: '#e11d48',          // Brand Rose
  utilities: '#2563eb',            // Blue
  rentersInsurance: '#f59e0b',     // Amber
  parkingAmenity: '#10b981',       // Emerald

  // Neutral UI
  background: '#ffffff',
  surfaceSubtle: '#f8fafc',
  border: '#f1f5f9',
  borderDarker: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
};

export type LoanTermType = '30-Year Fixed' | '15-Year Fixed' | '5/1 ARM';

export interface InteractiveMortgageCalculatorProps {
  property?: Partial<EnrichedPropertyDetails> & {
    price?: number;
    list_type?: 'SALE' | 'RENT';
    hoaMonthly?: number;
    annualTaxRate?: number;
    annualInsurance?: number;
    parkingSpaces?: number;
  };
  containerStyle?: StyleProp<ViewStyle>;
}

interface CostItem {
  id: string;
  label: string;
  amount: number;
  color: string;
  percentage: number;
}

export function formatCurrency(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

// ---------------------------------------------------------------------------
// iOS-Style Touch Slider with PanResponder & Stepper Controls
// ---------------------------------------------------------------------------
interface IOSSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  prefix?: string;
  color?: string;
  badge?: string;
  onChange: (val: number) => void;
  formatDisplay?: (val: number) => string;
}

const IOSSlider: React.FC<IOSSliderProps> = React.memo(({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  prefix = '',
  color = '#2563eb',
  badge,
  onChange,
  formatDisplay,
}) => {
  const [trackWidth, setTrackWidth] = useState(240);
  const trackWidthRef = useRef(240);
  const isDragging = useRef(false);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      trackWidthRef.current = w;
      setTrackWidth(w);
    }
  }, []);

  const updateFromPosition = useCallback((locationX: number) => {
    const width = trackWidthRef.current;
    if (width <= 0) return;
    const ratio = Math.max(0, Math.min(1, locationX / width));
    const rawVal = min + ratio * (max - min);
    // Snap to step precision
    const precision = step < 1 ? Math.round(1 / step) : 1;
    const snapped = Math.round(rawVal / step) * step;
    const clamped = Math.max(min, Math.min(max, Math.round(snapped * precision) / precision));
    onChange(clamped);
  }, [min, max, step, onChange]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        updateFromPosition(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        if (isDragging.current) {
          updateFromPosition(evt.nativeEvent.locationX);
        }
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
      },
    })
  ).current;

  // Percentage for track progress
  const progressRatio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const thumbLeft = progressRatio * trackWidth;

  const handleStepMinus = () => {
    const next = Math.max(min, Math.round((value - step) * 100) / 100);
    onChange(next);
  };

  const handleStepPlus = () => {
    const next = Math.min(max, Math.round((value + step) * 100) / 100);
    onChange(next);
  };

  const displayText = formatDisplay
    ? formatDisplay(value)
    : `${prefix}${step < 1 ? value.toFixed(1) : value.toLocaleString('en-IN')}${unit}`;

  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.headerRow}>
        <View style={sliderStyles.labelGroup}>
          <Text style={sliderStyles.label}>{label}</Text>
          {badge ? <Text style={sliderStyles.badge}>{badge}</Text> : null}
        </View>

        <View style={sliderStyles.valueGroup}>
          <TouchableOpacity
            style={sliderStyles.stepButton}
            onPress={handleStepMinus}
            disabled={value <= min}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="remove"
              size={15}
              color={value <= min ? COLORS.textMuted : COLORS.textPrimary}
            />
          </TouchableOpacity>

          <View style={sliderStyles.valueDisplayBadge}>
            <Text style={sliderStyles.valueText}>{displayText}</Text>
          </View>

          <TouchableOpacity
            style={sliderStyles.stepButton}
            onPress={handleStepPlus}
            disabled={value >= max}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="add"
              size={15}
              color={value >= max ? COLORS.textMuted : COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Slider Track and Thumb */}
      <View
        style={sliderStyles.trackTouchableArea}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <View style={sliderStyles.trackBackground}>
          <View
            style={[
              sliderStyles.trackActive,
              { width: `${progressRatio * 100}%`, backgroundColor: color },
            ]}
          />
        </View>

        {/* Thumb Knob */}
        <View
          style={[
            sliderStyles.thumbKnob,
            {
              transform: [{ translateX: Math.max(0, Math.min(trackWidth - 22, thumbLeft - 11)) }],
              borderColor: color,
            },
          ]}
        >
          <View style={[sliderStyles.thumbInnerDot, { backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
});

const sliderStyles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  badge: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  valueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueDisplayBadge: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDarker,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stepButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackTouchableArea: {
    height: 28,
    justifyContent: 'center',
  },
  trackBackground: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
    width: '100%',
  },
  trackActive: {
    height: '100%',
    borderRadius: 3,
  },
  thumbKnob: {
    position: 'absolute',
    top: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  thumbInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

// ---------------------------------------------------------------------------
// Circular SVG Donut Chart Visualizer
// ---------------------------------------------------------------------------
interface SegmentedDonutVisualizerProps {
  items: CostItem[];
  totalMonthly: number;
}

const SegmentedDonutVisualizer: React.FC<SegmentedDonutVisualizerProps> = React.memo(({
  items,
  totalMonthly,
}) => {
  const size = 110;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute strokeDasharray and offsets
  let accumulatedPercent = 0;
  const segments = items.map((item) => {
    const strokeDashoffset = -circumference * (accumulatedPercent / 100);
    const strokeDasharray = `${(circumference * item.percentage) / 100} ${circumference}`;
    accumulatedPercent += item.percentage;
    return {
      id: item.id,
      color: item.color,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <View style={donutStyles.wrapper}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background track circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Data segments */}
          {totalMonthly > 0 &&
            segments.map((seg) => (
              <Circle
                key={seg.id}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="butt"
                fill="none"
              />
            ))}
        </G>
      </Svg>
      {/* Center label */}
      <View style={donutStyles.centerContent}>
        <Text style={donutStyles.centerLabel}>Per Mo</Text>
        <Text style={donutStyles.centerAmount} numberOfLines={1}>
          {formatCurrency(totalMonthly)}
        </Text>
      </View>
    </View>
  );
});

const donutStyles = StyleSheet.create({
  wrapper: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});

// ---------------------------------------------------------------------------
// Segmented Cost Progress Bar Visualizer
// ---------------------------------------------------------------------------
interface SegmentedCostBarProps {
  items: CostItem[];
}

const SegmentedCostBar: React.FC<SegmentedCostBarProps> = React.memo(({ items }) => {
  return (
    <View style={barStyles.barTrack}>
      {items.map((item, index) => {
        if (item.percentage <= 0) return null;
        return (
          <View
            key={item.id}
            style={[
              barStyles.barSegment,
              {
                width: `${item.percentage}%`,
                backgroundColor: item.color,
                borderTopLeftRadius: index === 0 ? 5 : 0,
                borderBottomLeftRadius: index === 0 ? 5 : 0,
                borderTopRightRadius: index === items.length - 1 ? 5 : 0,
                borderBottomRightRadius: index === items.length - 1 ? 5 : 0,
              },
            ]}
          />
        );
      })}
    </View>
  );
});

const barStyles = StyleSheet.create({
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    overflow: 'hidden',
    marginVertical: 14,
  },
  barSegment: {
    height: '100%',
  },
});

// ---------------------------------------------------------------------------
// Main Interactive Mortgage Calculator Component
// ---------------------------------------------------------------------------
export const InteractiveMortgageCalculator: React.FC<InteractiveMortgageCalculatorProps> = ({
  property,
  containerStyle,
}) => {
  // Determine initial list type from property
  const initialMode = property?.list_type === 'RENT' ? 'RENT' : 'SALE';
  const [activeMode, setActiveMode] = useState<'SALE' | 'RENT'>(initialMode);

  // Home price base
  const homePrice = useMemo(() => {
    if (typeof property?.price === 'number' && property.price > 0) {
      return property.price;
    }
    return activeMode === 'RENT' ? 150000 : 35000000;
  }, [property?.price, activeMode]);

  // -------------------------
  // SALE MODE STATE
  // -------------------------
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(20);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [loanTerm, setLoanTerm] = useState<LoanTermType>('30-Year Fixed');

  // Quick preset pills for down payment
  const downPaymentPresets = [0, 5, 10, 20, 30];

  // When loan term changes, optionally set benchmark interest rates
  const handleLoanTermChange = (term: LoanTermType) => {
    setLoanTerm(term);
    if (term === '30-Year Fixed') setInterestRate(8.5);
    else if (term === '15-Year Fixed') setInterestRate(8.1);
    else if (term === '5/1 ARM') setInterestRate(8.25);
  };

  // -------------------------
  // RENT MODE STATE
  // -------------------------
  const defaultUtilities = useMemo(() => {
    const beds = property?.bedrooms || 2;
    return Math.round(4000 + beds * 1000);
  }, [property?.bedrooms]);

  const [rentUtilities, setRentUtilities] = useState<number>(defaultUtilities);
  const [rentersInsurance, setRentersInsurance] = useState<number>(1000);
  const [rentParkingFee, setRentParkingFee] = useState<number>(
    (property?.parkingSpaces && property.parkingSpaces > 0) ? 5000 : 0
  );

  // -------------------------
  // SALE CALCULATIONS
  // -------------------------
  const saleCalculations = useMemo(() => {
    const downPaymentDollar = Math.round(homePrice * (downPaymentPercent / 100));
    const principal = Math.max(0, homePrice - downPaymentDollar);

    // Number of months
    let n = 360;
    if (loanTerm === '15-Year Fixed') n = 180;
    else if (loanTerm === '5/1 ARM') n = 360;

    // Monthly interest rate
    const r = (interestRate / 100) / 12;

    // Monthly Principal & Interest: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    let monthlyPI = 0;
    if (principal > 0) {
      if (r > 0) {
        const factor = Math.pow(1 + r, n);
        monthlyPI = (principal * (r * factor)) / (factor - 1);
      } else {
        monthlyPI = principal / n;
      }
    }

    // Property Taxes
    const taxRate = property?.annualTaxRate ?? 0.004;
    const monthlyTax = Math.round((homePrice * taxRate) / 12);

    // Homeowners Insurance
    const annualInsurance = property?.annualInsurance ?? Math.round(homePrice * 0.001);
    const monthlyInsurance = Math.round(annualInsurance / 12);

    // HOA / Maintenance Fees
    const monthlyHOA = property?.hoaMonthly ?? (Math.round(homePrice * 0.00045) || 15000);

    const totalMonthly = Math.round(monthlyPI + monthlyTax + monthlyInsurance + monthlyHOA);

    const piRounded = Math.round(monthlyPI);

    // Segment items with percentages
    const items: CostItem[] = [
      {
        id: 'pi',
        label: 'Principal & Interest',
        amount: piRounded,
        color: COLORS.principalAndInterest,
        percentage: totalMonthly > 0 ? (piRounded / totalMonthly) * 100 : 0,
      },
      {
        id: 'tax',
        label: 'Property Taxes',
        amount: monthlyTax,
        color: COLORS.propertyTaxes,
        percentage: totalMonthly > 0 ? (monthlyTax / totalMonthly) * 100 : 0,
      },
      {
        id: 'ins',
        label: 'Homeowners Insurance',
        amount: monthlyInsurance,
        color: COLORS.homeInsurance,
        percentage: totalMonthly > 0 ? (monthlyInsurance / totalMonthly) * 100 : 0,
      },
      {
        id: 'hoa',
        label: 'HOA & Maintenance',
        amount: monthlyHOA,
        color: COLORS.hoaFees,
        percentage: totalMonthly > 0 ? (monthlyHOA / totalMonthly) * 100 : 0,
      },
    ];

    return {
      downPaymentDollar,
      principal,
      totalMonthly,
      items,
    };
  }, [homePrice, downPaymentPercent, interestRate, loanTerm, property]);

  // -------------------------
  // RENT CALCULATIONS
  // -------------------------
  const rentCalculations = useMemo(() => {
    const baseRent = homePrice;
    const totalMonthly = Math.round(baseRent + rentUtilities + rentersInsurance + rentParkingFee);

    // One-time move-in costs
    const securityDeposit = baseRent * 2;
    const applicationFee = 5000;
    const totalMoveIn = baseRent + securityDeposit + applicationFee;

    const items: CostItem[] = [
      {
        id: 'rent',
        label: 'Monthly Rent',
        amount: baseRent,
        color: COLORS.monthlyRent,
        percentage: totalMonthly > 0 ? (baseRent / totalMonthly) * 100 : 0,
      },
      {
        id: 'utilities',
        label: 'Estimated Utilities',
        amount: rentUtilities,
        color: COLORS.utilities,
        percentage: totalMonthly > 0 ? (rentUtilities / totalMonthly) * 100 : 0,
      },
      {
        id: 'renters_ins',
        label: "Renter's Insurance",
        amount: rentersInsurance,
        color: COLORS.rentersInsurance,
        percentage: totalMonthly > 0 ? (rentersInsurance / totalMonthly) * 100 : 0,
      },
      {
        id: 'parking',
        label: 'Parking & Amenity Fee',
        amount: rentParkingFee,
        color: COLORS.parkingAmenity,
        percentage: totalMonthly > 0 ? (rentParkingFee / totalMonthly) * 100 : 0,
      },
    ];

    return {
      baseRent,
      totalMonthly,
      securityDeposit,
      applicationFee,
      totalMoveIn,
      items,
    };
  }, [homePrice, rentUtilities, rentersInsurance, rentParkingFee]);

  const activeData = activeMode === 'SALE' ? saleCalculations : rentCalculations;

  return (
    <View style={[styles.card, containerStyle]}>
      {/* Header Bar with Title & Dual Mode Switcher */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={activeMode === 'SALE' ? 'calculator-outline' : 'receipt-outline'}
              size={18}
              color="#2563eb"
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>
              {activeMode === 'SALE' ? 'Mortgage Calculator' : 'Rental Expense Breakdown'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {activeMode === 'SALE' ? 'Interactive Payment Estimator' : 'Comprehensive Monthly Budget'}
            </Text>
          </View>
        </View>

        {/* Dual Mode Switcher Pill */}
        <View style={styles.modeSwitcher}>
          <TouchableOpacity
            style={[styles.modeButton, activeMode === 'SALE' && styles.modeButtonActive]}
            onPress={() => setActiveMode('SALE')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeButtonText, activeMode === 'SALE' && styles.modeButtonTextActive]}>
              Buy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, activeMode === 'RENT' && styles.modeButtonActive]}
            onPress={() => setActiveMode('RENT')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeButtonText, activeMode === 'RENT' && styles.modeButtonTextActive]}>
              Rent
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Payment Highlight Banner */}
      <View style={styles.heroSection}>
        <SegmentedDonutVisualizer
          items={activeData.items}
          totalMonthly={activeData.totalMonthly}
        />

        <View style={styles.heroRightContent}>
          <Text style={styles.heroSubLabel}>Estimated Total Monthly</Text>
          <View style={styles.heroNumberRow}>
            <Text style={styles.heroCurrency}>₹</Text>
            <Text style={styles.heroAmount}>
              {Math.round(activeData.totalMonthly).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.heroPerMo}>/mo</Text>
          </View>
          <Text style={styles.propertyPriceContext}>
            Based on {activeMode === 'SALE' ? 'Listing Price' : 'Base Rent'} of {formatCurrency(homePrice)}
          </Text>
        </View>
      </View>

      {/* Segmented Color Bar Visualizer */}
      <SegmentedCostBar items={activeData.items} />

      {/* Itemized Legend Rows */}
      <View style={styles.legendContainer}>
        {activeData.items.map((item) => (
          <View key={item.id} style={styles.legendRow}>
            <View style={styles.legendLeft}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendPercent}>({item.percentage.toFixed(0)}%)</Text>
            </View>
            <Text style={styles.legendAmount}>{formatCurrency(item.amount)}/mo</Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      {/* ===================================================================
          MODE-SPECIFIC CONTROLS
          =================================================================== */}
      {activeMode === 'SALE' ? (
        <View style={styles.controlsSection}>
          <Text style={styles.controlsSectionTitle}>Mortgage Customization</Text>

          {/* Loan Term Segmented Pills */}
          <View style={styles.termSelectorContainer}>
            <Text style={styles.controlLabel}>Loan Term</Text>
            <View style={styles.termPillsGroup}>
              {(['30-Year Fixed', '15-Year Fixed', '5/1 ARM'] as LoanTermType[]).map((term) => {
                const isSelected = loanTerm === term;
                return (
                  <TouchableOpacity
                    key={term}
                    style={[styles.termPill, isSelected && styles.termPillActive]}
                    onPress={() => handleLoanTermChange(term)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.termPillText, isSelected && styles.termPillTextActive]}>
                      {term}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Down Payment Slider with Dynamic Dollar Amount */}
          <IOSSlider
            label="Down Payment"
            value={downPaymentPercent}
            min={0}
            max={50}
            step={1}
            unit="%"
            color={COLORS.principalAndInterest}
            badge={formatCurrency(saleCalculations.downPaymentDollar)}
            onChange={setDownPaymentPercent}
            formatDisplay={(val) => `${val}%`}
          />

          {/* Quick Down Payment Preset Chips */}
          <View style={styles.presetsRow}>
            <Text style={styles.presetsLabel}>Presets:</Text>
            <View style={styles.presetsChipsGroup}>
              {downPaymentPresets.map((pct) => (
                <TouchableOpacity
                  key={pct}
                  style={[
                    styles.presetChip,
                    downPaymentPercent === pct && styles.presetChipActive,
                  ]}
                  onPress={() => setDownPaymentPercent(pct)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      downPaymentPercent === pct && styles.presetChipTextActive,
                    ]}
                  >
                    {pct}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Interest Rate Slider */}
          <IOSSlider
            label="Interest Rate"
            value={interestRate}
            min={3.0}
            max={12.0}
            step={0.1}
            unit="%"
            color={COLORS.principalAndInterest}
            onChange={setInterestRate}
            formatDisplay={(val) => `${val.toFixed(1)}%`}
          />

          {/* Loan Principal Summary Tag */}
          <View style={styles.loanSummaryBox}>
            <Ionicons name="information-circle-outline" size={16} color="#64748b" />
            <Text style={styles.loanSummaryText}>
              Principal Loan Amount: <Text style={styles.loanSummaryBold}>{formatCurrency(saleCalculations.principal)}</Text> ({100 - downPaymentPercent}% of purchase price)
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.controlsSection}>
          <Text style={styles.controlsSectionTitle}>Rental Cost Adjustments</Text>

          {/* Estimated Utilities Slider */}
          <IOSSlider
            label="Estimated Utilities"
            value={rentUtilities}
            min={1000}
            max={25000}
            step={500}
            prefix="₹"
            color={COLORS.utilities}
            badge="Electricity, Gas, Water"
            onChange={setRentUtilities}
            formatDisplay={(val) => `${formatCurrency(val)}/mo`}
          />

          {/* Renter's Insurance Slider */}
          <IOSSlider
            label="Renter's Insurance"
            value={rentersInsurance}
            min={200}
            max={5000}
            step={100}
            prefix="₹"
            color={COLORS.rentersInsurance}
            badge="Personal Property"
            onChange={setRentersInsurance}
            formatDisplay={(val) => `${formatCurrency(val)}/mo`}
          />

          {/* Parking / Amenity Fee Slider */}
          <IOSSlider
            label="Parking & Amenity Fee"
            value={rentParkingFee}
            min={0}
            max={20000}
            step={1000}
            prefix="₹"
            color={COLORS.parkingAmenity}
            badge={rentParkingFee === 0 ? 'Included' : 'Reserved Slot'}
            onChange={setRentParkingFee}
            formatDisplay={(val) => (val === 0 ? 'Free' : `${formatCurrency(val)}/mo`)}
          />

          {/* One-Time Move-In Cost Estimate Card */}
          <View style={styles.moveInCard}>
            <View style={styles.moveInHeader}>
              <Ionicons name="key-outline" size={16} color="#0f172a" />
              <Text style={styles.moveInTitle}>Estimated Move-In Costs</Text>
            </View>

            <View style={styles.moveInRow}>
              <Text style={styles.moveInLabel}>First Month's Rent</Text>
              <Text style={styles.moveInValue}>
                {formatCurrency(rentCalculations.baseRent)}
              </Text>
            </View>

            <View style={styles.moveInRow}>
              <Text style={styles.moveInLabel}>Security Deposit (2 Months)</Text>
              <Text style={styles.moveInValue}>
                {formatCurrency(rentCalculations.securityDeposit)}
              </Text>
            </View>

            <View style={styles.moveInRow}>
              <Text style={styles.moveInLabel}>Agreement & Society Move-In Fee</Text>
              <Text style={styles.moveInValue}>
                {formatCurrency(rentCalculations.applicationFee)}
              </Text>
            </View>

            <View style={styles.moveInDivider} />

            <View style={styles.moveInTotalRow}>
              <Text style={styles.moveInTotalLabel}>Total Due at Signing</Text>
              <Text style={styles.moveInTotalValue}>
                {formatCurrency(rentCalculations.totalMoveIn)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default InteractiveMortgageCalculator;

// ---------------------------------------------------------------------------
// Card & Layout Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 2,
  },
  modeButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modeButtonTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  heroRightContent: {
    flex: 1,
    marginLeft: 16,
  },
  heroSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  heroCurrency: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  heroPerMo: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    alignSelf: 'flex-end',
    marginBottom: 6,
    marginLeft: 3,
  },
  propertyPriceContext: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  legendContainer: {
    gap: 8,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  legendPercent: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  legendAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  controlsSection: {
    gap: 10,
  },
  controlsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  termSelectorContainer: {
    marginBottom: 6,
  },
  termPillsGroup: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  termPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  termPillActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  termPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  termPillTextActive: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -4,
    marginBottom: 6,
  },
  presetsLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginRight: 8,
  },
  presetsChipsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderDarker,
  },
  presetChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  presetChipTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  loanSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
    gap: 6,
  },
  loanSummaryText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  loanSummaryBold: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  moveInCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDarker,
    padding: 14,
    marginTop: 6,
    gap: 8,
  },
  moveInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  moveInTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  moveInRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moveInLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  moveInValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  moveInDivider: {
    height: 1,
    backgroundColor: COLORS.borderDarker,
    marginVertical: 2,
  },
  moveInTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moveInTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  moveInTotalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#e11d48',
  },
});
