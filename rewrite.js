const fs = require("fs");
const content = `import React, { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity, Linking, Platform, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import Animated, { useAnimatedStyle, SharedValue, interpolate, Extrapolation, runOnJS } from "react-native-reanimated";
import { ZillowDrawIcon } from "./ZillowIcons";
import { ScrollView } from "react-native-gesture-handler";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_INNER_WIDTH = CARD_WIDTH - 2;

export type SheetSnapState = "PEEK" | "DUAL" | "FULL";

export interface MobileTriStateBottomSheetProps {
  availableHeight?: number;
  snapState: SheetSnapState;
  onSnapChange: (state: SheetSnapState) => void;
  properties: any[];
  selectedPropertyId: string | null;
  onSelectProperty: (property: any) => void;
  onToggleFavorite: (id: string) => void;
  isSaved: (id: string) => boolean;
  listType: "SALE" | "RENT" | string;
  onHeightChange?: (height: number) => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  mapType?: "standard" | "satellite";
  onToggleMapType?: () => void;
  isDrawingMode?: boolean;
  onStartDraw?: () => void;
  onRecenter?: () => void;
  isSearchSaved?: boolean;
  onToggleSaveSearch?: () => void;
  searchQuery?: string;
  onOpenSearchModal?: () => void;
  onClearSearch?: () => void;
  regionName?: string;
  animatedPosition?: SharedValue<number>;
  searchRowTotalHeight?: number;
}

const FALLBACK_PHOTOS = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
];

export function formatPropertyPrice(price: number, listType?: string): string {
  if (!price && price !== 0) return "--";
  const isRent = listType === "RENT";
  const suffix = isRent ? "/mo" : "";
  if (price > 0 && price <= 15000) return \`$\${price.toLocaleString()}\${suffix}\`;
  if (price >= 10000000) {
    const cr = price / 10000000;
    return \`?\${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr\${suffix}\`;
  }
  if (price >= 100000) {
    const l = price / 100000;
    return \`?\${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)} L\${suffix}\`;
  }
  if (price >= 1000) return \`?\${(price / 1000).toFixed(0)}k\${suffix}\`;
  return \`?\${price.toLocaleString()}\${suffix}\`;
}

const LuxuryPropertyCard = React.memo<any>(({ property, isFavorite, listType, onSelect, onToggleFavorite }) => {
  const router = useRouter();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const photos = useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(property.property_media)) property.property_media.forEach((m: any) => { if (m?.url) list.push(m.url); });
    if (Array.isArray(property.images)) property.images.forEach((img: any) => { if (typeof img === "string") list.push(img); });
    if (Array.isArray(property.photos)) property.photos.forEach((p: any) => { if (typeof p === "string") list.push(p); });
    if (property.thumbnailUrl) list.push(property.thumbnailUrl);
    if (property.imageUrl) list.push(property.imageUrl);
    let i = 0;
    while (list.length < 5 && i < FALLBACK_PHOTOS.length) {
      if (!list.includes(FALLBACK_PHOTOS[i])) list.push(FALLBACK_PHOTOS[i]);
      i++;
    }
    return list.slice(0, 5);
  }, [property]);

  const badge = useMemo(() => {
    if (property.badge) return { label: property.badge, icon: "sparkles" };
    if (property.specialOffer) return { label: property.specialOffer, icon: "pricetag" };
    if (property.isVerified) return { label: "Verified", icon: "shield-checkmark" };
    const id = String(property.id || "");
    if (id.endsWith("1") || id.endsWith("a")) return { label: "Cozy fireplace", icon: "flame" };
    if (id.endsWith("2") || id.endsWith("b")) return { label: "2 Months Free", icon: "gift" };
    return { label: "Verified", icon: "shield-checkmark" };
  }, [property]);

  const specsText = useMemo(() => {
    const parts: string[] = [];
    if (property.bedrooms !== undefined && property.bedrooms !== null) parts.push(\`\${property.bedrooms} bd\`);
    if (property.bathrooms !== undefined && property.bathrooms !== null) parts.push(\`\${property.bathrooms} ba\`);
    if (property.area_sqft) parts.push(\`\${property.area_sqft.toLocaleString()} sqft\`);
    const cleanType = (property.prop_type || "Apartment").charAt(0).toUpperCase() + (property.prop_type || "Apartment").slice(1).toLowerCase();
    parts.push(\`\${cleanType} \${listType === "RENT" ? "for rent" : "for sale"}\`);
    return parts.join(" | ");
  }, [property, listType]);

  return (
    <TouchableOpacity style={styles.cardContainer} activeOpacity={0.96} onPress={() => {
      onSelect(property);
      if (property.id) router.push(\`/property/\${property.id}\`);
    }}>
      <View style={styles.cardImageWrapper}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" onScroll={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / CARD_INNER_WIDTH);
          if (index !== activePhotoIndex) setActivePhotoIndex(index);
        }} scrollEventThrottle={16}>
          {photos.map((url, idx) => (
            <Image key={idx} source={{ uri: url }} style={styles.cardImage} resizeMode="cover" />
          ))}
        </ScrollView>
        <View style={styles.badgeWrapper}>
          <Ionicons name={badge.icon as any} size={12} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.badgeText}>{badge.label}</Text>
        </View>
        <TouchableOpacity style={styles.cardHeartBtn} onPress={(e) => { e.stopPropagation(); onToggleFavorite(property.id); }} activeOpacity={0.8}>
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={18} color={isFavorite ? "#ef4444" : "#ffffff"} />
        </TouchableOpacity>
        <View style={styles.dotsContainer} pointerEvents="none">
          {photos.map((_, idx) => (
            <View key={idx} style={[styles.dot, activePhotoIndex === idx && styles.dotActive]} />
          ))}
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.priceRow}>
          <Text style={styles.priceValue}>{formatPropertyPrice(property.price, listType)}</Text>
        </View>
        <Text style={styles.specsText} numberOfLines={1}>{specsText}</Text>
        <Text style={styles.addressText} numberOfLines={1}>{property.address || "1530 N Poinsettia Pl, LA"}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.availabilityButton} onPress={() => { onSelect(property); if (property.id) router.push(\`/property/\${property.id}\`); }} activeOpacity={0.88}>
            <Text style={styles.availabilityButtonText}>Check availability</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export const MobileTriStateBottomSheet: React.FC<MobileTriStateBottomSheetProps> = (props) => {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [sortOption, setSortOption] = useState<string>("Recommended");

  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 24) : insets.top;
  const headerPaddingTop = statusBarHeight + 8;
  const computedSearchRowTotalHeight = props.searchRowTotalHeight || (headerPaddingTop + 56);

  const fullHeight = props.availableHeight || (SCREEN_HEIGHT - 60);
  const PEEK_HEIGHT = 72;
  const DUAL_HEIGHT = Math.round(fullHeight * 0.44);
  const FULL_HEIGHT = fullHeight - computedSearchRowTotalHeight;

  // Snap points mapped exactly to the required heights: [PEEK, DUAL, FULL]
  const snapPoints = useMemo(() => [PEEK_HEIGHT, DUAL_HEIGHT, FULL_HEIGHT], [PEEK_HEIGHT, DUAL_HEIGHT, FULL_HEIGHT]);

  const internalAnimatedPosition = props.animatedPosition; // SharedValue<number>

  // Synchronize incoming state prop with bottom sheet index
  useEffect(() => {
    let index = 1;
    if (props.snapState === "PEEK") index = 0;
    if (props.snapState === "DUAL") index = 1;
    if (props.snapState === "FULL") index = 2;
    bottomSheetRef.current?.animateToIndex(index);
  }, [props.snapState]);

  const handleSheetChanges = useCallback((index: number) => {
    let newState: SheetSnapState = "DUAL";
    if (index === 0) newState = "PEEK";
    if (index === 1) newState = "DUAL";
    if (index === 2) newState = "FULL";
    if (props.onSnapChange && newState !== props.snapState) {
      props.onSnapChange(newState);
    }
  }, [props.onSnapChange, props.snapState]);

  const countRowStyle = useAnimatedStyle(() => {
    if (!internalAnimatedPosition) return { opacity: 1 };
    return {
      opacity: interpolate(
        internalAnimatedPosition.value,
        [computedSearchRowTotalHeight, computedSearchRowTotalHeight + 40, fullHeight - DUAL_HEIGHT],
        [0, 0.4, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  const sortRowStyle = useAnimatedStyle(() => {
    if (!internalAnimatedPosition) return { opacity: 1 };
    return {
      opacity: interpolate(
        internalAnimatedPosition.value,
        [computedSearchRowTotalHeight, computedSearchRowTotalHeight + 40, fullHeight - DUAL_HEIGHT],
        [1, 0.6, 0],
        Extrapolation.CLAMP
      ),
    };
  });

  const mapPillStyle = useAnimatedStyle(() => {
    if (!internalAnimatedPosition) return { opacity: 0 };
    return {
      opacity: interpolate(
        internalAnimatedPosition.value,
        [computedSearchRowTotalHeight, computedSearchRowTotalHeight + 30, computedSearchRowTotalHeight + 80],
        [1, 0.8, 0],
        Extrapolation.CLAMP
      ),
      pointerEvents: internalAnimatedPosition.value < computedSearchRowTotalHeight + 40 ? "auto" : "none",
    };
  });

  const hudOpacityStyle = useAnimatedStyle(() => {
    if (!internalAnimatedPosition) return { opacity: 1 };
    const dualY = fullHeight - DUAL_HEIGHT;
    const fullY = computedSearchRowTotalHeight;
    const peekY = fullHeight - PEEK_HEIGHT;
    return {
      opacity: interpolate(
        internalAnimatedPosition.value,
        [fullY, Math.max(fullY + 1, dualY - 80), dualY - 20, dualY, peekY],
        [0, 0, 0.7, 1, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  const handleFloatingPillPress = () => {
    props.onSnapChange("PEEK");
    bottomSheetRef.current?.animateToIndex(0);
  };

  const renderItem = useCallback(({ item }: { item: any }) => (
    <View style={styles.cardItemWrapper}>
      <LuxuryPropertyCard
        property={item}
        isSelected={props.selectedPropertyId === item.id}
        isFavorite={props.isSaved(item.id)}
        listType={props.listType}
        onSelect={props.onSelectProperty}
        onToggleFavorite={props.onToggleFavorite}
      />
    </View>
  ), [props.selectedPropertyId, props.isSaved, props.listType, props.onSelectProperty, props.onToggleFavorite]);

  return (
    <>
      <Animated.View style={[styles.anchoredHudContainer, hudOpacityStyle]} pointerEvents="box-none">
        <View style={styles.hudLeftGroup}>
          <TouchableOpacity style={styles.hudCircle} onPress={props.onOpenFilters} activeOpacity={0.8}>
            <Ionicons name="options-outline" size={20} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.hudCircle, props.isDrawingMode && styles.hudCircleActive]} onPress={props.onStartDraw} activeOpacity={0.8}>
            <ZillowDrawIcon color={props.isDrawingMode ? "#ffffff" : "#0f172a"} width={20} height={20} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.anchoredSaveSearchPill, props.isSearchSaved && styles.anchoredSaveSearchPillActive]}
          onPress={props.onToggleSaveSearch}
          activeOpacity={0.9}
        >
          <Ionicons name={props.isSearchSaved ? "checkmark-circle" : "notifications"} size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.anchoredSaveSearchText}>{props.isSearchSaved ? "Saved" : "Save search"}</Text>
        </TouchableOpacity>
      </Animated.View>

      <BottomSheet
        ref={bottomSheetRef}
        index={props.snapState === "FULL" ? 2 : props.snapState === "DUAL" ? 1 : 0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        animatedPosition={internalAnimatedPosition}
        enableContentPanningGesture={true}
        enableHandlePanningGesture={true}
        handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 36, height: 4 }}
        backgroundStyle={{ borderRadius: 24, backgroundColor: "#ffffff" }}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.subHeaderRowContainer}>
            <Animated.View style={[styles.countSubheaderLayer, countRowStyle]} pointerEvents={props.snapState === "FULL" ? "none" : "auto"}>
              <TouchableOpacity onPress={() => { props.onSnapChange("FULL"); bottomSheetRef.current?.animateToIndex(2); }} style={styles.headerRow} activeOpacity={0.9}>
                <Text style={styles.headerTitle}>{props.properties.length} homes</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={[styles.sortSubheaderLayer, sortRowStyle]} pointerEvents={props.snapState === "FULL" ? "auto" : "none"}>
              <View style={styles.subHeaderRow}>
                <Text style={styles.headerTitle}>{props.properties.length} {props.regionName || "homes"}</Text>
                <View style={styles.subHeaderRight}>
                  <TouchableOpacity style={styles.sortButton} onPress={() => setSortOption(sortOption === "Recommended" ? "Price: Low" : "Recommended")} activeOpacity={0.8}>
                    <Ionicons name="swap-vertical" size={14} color="#0f172a" style={{ marginRight: 4 }} />
                    <Text style={styles.sortButtonText}>{sortOption}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </View>

          <View style={styles.headerDivider} />

          <BottomSheetFlatList
            data={props.properties}
            keyExtractor={(i) => String(i.id)}
            renderItem={renderItem}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 90 }]}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </BottomSheet>

      <Animated.View style={[styles.floatingMapPillWrap, { bottom: insets.bottom + 16 }, mapPillStyle]}>
        <TouchableOpacity style={styles.floatingMapPill} onPress={handleFloatingPillPress} activeOpacity={0.9}>
          <Ionicons name="map-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.floatingMapPillText}>Map</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  cardItemWrapper: { width: "100%", alignItems: "center" },
  cardContainer: { width: CARD_WIDTH, backgroundColor: "#ffffff", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  cardImageWrapper: { width: "100%", height: 200, position: "relative", backgroundColor: "#0f172a" },
  cardImage: { width: CARD_INNER_WIDTH, height: 200 },
  badgeWrapper: { position: "absolute", top: 10, left: 10, backgroundColor: "rgba(15, 23, 42, 0.78)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, flexDirection: "row", alignItems: "center" },
  badgeText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  cardHeartBtn: { position: "absolute", top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0, 0, 0, 0.45)", alignItems: "center", justifyContent: "center" },
  dotsContainer: { position: "absolute", bottom: 8, alignSelf: "center", flexDirection: "row", gap: 5, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 8, paddingVertical: 3.5, borderRadius: 10 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "rgba(255, 255, 255, 0.45)" },
  dotActive: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#ffffff" },
  cardBody: { padding: 14 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  priceValue: { fontSize: 20, fontWeight: "900", color: "#0f172a" },
  specsText: { fontSize: 13.5, fontWeight: "600", color: "#334155", marginBottom: 4 },
  addressText: { fontSize: 12.5, fontWeight: "500", color: "#64748b", marginBottom: 12 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  availabilityButton: { flex: 1, height: 44, borderRadius: 12, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center" },
  availabilityButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  anchoredHudContainer: { position: "absolute", bottom: "100%", marginBottom: 12, left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 45 },
  hudLeftGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  hudCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 4, borderWidth: 1, borderColor: "#e2e8f0" },
  hudCircleActive: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  anchoredSaveSearchPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#2563eb", paddingHorizontal: 16, height: 44, borderRadius: 22 },
  anchoredSaveSearchPillActive: { backgroundColor: "#059669" },
  anchoredSaveSearchText: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
  subHeaderRowContainer: { height: 48, position: "relative" },
  countSubheaderLayer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "center" },
  sortSubheaderLayer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "center" },
  headerRow: { alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  subHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  subHeaderRight: { flexDirection: "row", gap: 8 },
  sortButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#e2e8f0" },
  sortButtonText: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
  headerDivider: { height: 1, backgroundColor: "#f1f5f9" },
  listContent: { paddingTop: 12, gap: 16 },
  floatingMapPillWrap: { position: "absolute", alignSelf: "center", zIndex: 50 },
  floatingMapPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#0f172a", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 }
});

export default MobileTriStateBottomSheet;
`
fs.writeFileSync("apps/user-app/components/MobileTriStateBottomSheet.tsx", content);

