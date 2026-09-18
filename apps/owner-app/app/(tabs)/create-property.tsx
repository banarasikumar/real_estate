import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  Vibration,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createProperty, uploadPropertyImage, addPropertyMedia, useAuth, geocodeAddress } from '@repo/api';
import { PropertyType, ListingType } from '@repo/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ImageCropperModal, CroppedImageResult, CropperImageInput } from '../../components/ImageCropperModal';
import { OwnerMapPinPickerModal, FootprintPoint } from '../../components/OwnerMapPinPickerModal';

export default function CreatePropertyScreen() {
  const { session } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [listingType, setListingType] = useState('Sale');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Map Pin Picker & Footprint State
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [footprintPolygon, setFootprintPolygon] = useState<FootprintPoint[] | null>(null);

  // Multi-Unit Building / Tower State
  const [isComplex, setIsComplex] = useState(false);
  const [complexName, setComplexName] = useState('');
  const [totalUnits, setTotalUnits] = useState('48');
  const [floorCount, setFloorCount] = useState('16');

  // Cropped images with base64 WebP data ready for high-speed binary upload
  const [croppedImages, setCroppedImages] = useState<CroppedImageResult[]>([]);
  const [pendingRawImages, setPendingRawImages] = useState<CropperImageInput[]>([]);
  const [isCropperVisible, setIsCropperVisible] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const pickImages = async () => {
    const remainingSlots = 6 - croppedImages.length;
    if (remainingSlots <= 0) {
      Alert.alert('Limit Reached', 'You can upload up to 6 photos per property listing.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const assets: CropperImageInput[] = result.assets.map((asset) => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        }));
        setPendingRawImages(assets);
        setIsCropperVisible(true);
      }
    } catch (err: any) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const handleCropperComplete = (newCropped: CroppedImageResult[]) => {
    setCroppedImages((prev) => {
      const combined = [...prev, ...newCropped];
      return combined.slice(0, 6);
    });
    setIsCropperVisible(false);
    setPendingRawImages([]);
  };

  const removeImage = (index: number) => {
    setCroppedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    setCroppedImages((prev) => {
      const updated = [...prev];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= updated.length) return prev;
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const setAsCover = (index: number) => {
    if (index === 0) return;
    setCroppedImages((prev) => {
      const updated = [...prev];
      const [item] = updated.splice(index, 1);
      updated.unshift(item);
      return updated;
    });
  };

  // Automatically geocode address coordinates whenever owner types/changes address
  React.useEffect(() => {
    if (!address.trim()) {
      setLatitude(null);
      setLongitude(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsGeocoding(true);
      try {
        const coords = await geocodeAddress(address);
        if (coords) {
          setLatitude(coords.latitude);
          setLongitude(coords.longitude);
        }
      } catch (err) {
        console.error('Error geocoding address:', err);
      } finally {
        setIsGeocoding(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [address]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPropertyType('Apartment');
    setListingType('Sale');
    setPrice('');
    setArea('');
    setBedrooms('');
    setBathrooms('');
    setAddress('');
    setLatitude(null);
    setLongitude(null);
    setFootprintPolygon(null);
    setIsComplex(false);
    setComplexName('');
    setTotalUnits('48');
    setFloorCount('16');
    setCroppedImages([]);
    setPendingRawImages([]);
  };

  const handleSubmit = async (submitStatus: 'DRAFT' | 'PENDING_APPROVAL') => {
    if (!session?.user?.id) {
      Alert.alert('Error', 'You must be logged in to create a property.');
      return;
    }

    if (!title || !price || !address) {
      Alert.alert('Missing Fields', 'Please fill in Title, Price, and Address.');
      return;
    }

    setIsLoading(true);
    setUploadStatus('Creating property record...');

    try {
      const propTypeMapped = propertyType.toUpperCase() as PropertyType;
      const listTypeMapped = listingType.toUpperCase() as ListingType;

      let effectiveLat = latitude;
      let effectiveLng = longitude;
      if ((effectiveLat === null || effectiveLng === null) && address.trim()) {
        try {
          const resolved = await geocodeAddress(address.trim());
          if (resolved) {
            effectiveLat = resolved.latitude;
            effectiveLng = resolved.longitude;
            setLatitude(resolved.latitude);
            setLongitude(resolved.longitude);
          }
        } catch (e) {
          console.warn('Geocode resolution failed during submit:', e);
        }
      }

      const propertyData = {
        owner_id: session.user.id,
        title,
        description: description || null,
        prop_type: ['APARTMENT', 'HOUSE', 'VILLA', 'COMMERCIAL'].includes(propTypeMapped)
          ? propTypeMapped
          : 'APARTMENT',
        list_type: ['SALE', 'RENT'].includes(listTypeMapped) ? listTypeMapped : 'SALE',
        price: parseFloat(price) || 0,
        area_sqft: area ? parseFloat(area) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
        address,
        latitude: effectiveLat,
        longitude: effectiveLng,
        status: submitStatus,
        is_approved: false,
        is_complex: isComplex,
        complex_name: isComplex ? (complexName.trim() || title.trim()) : null,
        total_units: isComplex ? (parseInt(totalUnits, 10) || 1) : null,
        floor_count: isComplex ? (parseInt(floorCount, 10) || null) : null,
        footprint_polygon: footprintPolygon || null,
      };

      const { success, data: property, error } = await createProperty(propertyData);

      if (!success || !property) {
        throw error || new Error('Failed to create property');
      }

      // Upload all cropped WebP images using reliable binary ArrayBuffer payload
      if (croppedImages.length > 0) {
        for (let i = 0; i < croppedImages.length; i++) {
          setUploadStatus(`Uploading image ${i + 1} of ${croppedImages.length}...`);
          const img = croppedImages[i];

          const uploadPayload = img.base64
            ? { base64: img.base64, contentType: 'image/webp', fileExt: 'webp' }
            : { uri: img.uri, contentType: 'image/webp', fileExt: 'webp' };

          const { success: uploadSuccess, url: publicUrl, error: uploadErr } = await uploadPropertyImage(
            uploadPayload,
            property.id
          );

          if (uploadSuccess && publicUrl) {
            const isFeatured = i === 0;
            await addPropertyMedia(property.id, publicUrl, isFeatured, i);
          } else {
            console.warn(`Failed to upload photo ${i + 1}:`, uploadErr);
          }
        }
      }

      if (isComplex) {
        Alert.alert(
          '🏢 Multi-Unit Complex Saved!',
          'Your complex record and building footprint have been saved. You can now manage individual unit inventory, pricing, and availability.',
          [
            {
              text: 'Manage Units Now ➔',
              onPress: () => {
                resetForm();
                router.push(('/complex/' + property.id) as any);
              },
            },
            {
              text: 'View My Properties',
              onPress: () => {
                resetForm();
                router.push('/(tabs)/properties');
              },
            },
          ]
        );
      } else {
        const successMsg =
          submitStatus === 'PENDING_APPROVAL'
            ? 'Property submitted for Admin approval! Once approved, it will be published live to buyers.'
            : 'Property saved as Draft in your properties list.';

        Alert.alert('Success', successMsg, [
          {
            text: 'View My Properties',
            onPress: () => {
              resetForm();
              router.push('/(tabs)/properties');
            },
          },
        ]);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Something went wrong while submitting.');
    } finally {
      setIsLoading(false);
      setUploadStatus('');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Create Listing</Text>
          <Text style={styles.headerSubtitle}>Add your property details and high-res photos</Text>
        </View>

        {/* Basic Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Property Information</Text>

          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Modern 3 BHK High-Rise Apartment"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Key highlights, amenities, furnishings..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Property Type</Text>
              <TextInput
                style={styles.input}
                value={propertyType}
                onChangeText={setPropertyType}
                placeholder="Apartment, House, Villa"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Listing Type</Text>
              <TextInput
                style={styles.input}
                value={listingType}
                onChangeText={setListingType}
                placeholder="Sale or Rent"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <Text style={styles.label}>Price ($) *</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="e.g. 350000"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Area (sqft)</Text>
              <TextInput
                style={styles.input}
                value={area}
                onChangeText={setArea}
                placeholder="1450"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Bedrooms</Text>
              <TextInput
                style={styles.input}
                value={bedrooms}
                onChangeText={setBedrooms}
                placeholder="3"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Baths</Text>
              <TextInput
                style={styles.input}
                value={bathrooms}
                onChangeText={setBathrooms}
                placeholder="2"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.label}>Address / Locality *</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. Bandra West, Mumbai"
            placeholderTextColor="#94a3b8"
          />

          {/* Interactive Mini-Map Preview Card */}
          <View style={styles.miniMapCard}>
            <View style={styles.miniMapHeaderRow}>
              <View style={styles.miniMapTitleGroup}>
                <Ionicons name="map" size={18} color="#059669" />
                <Text style={styles.miniMapTitle}>Geographic Location</Text>
              </View>
              {latitude !== null && longitude !== null ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={13} color="#059669" />
                  <Text style={styles.verifiedBadgeText}>GPS Precise</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.miniMapTactileCanvas}>
              {latitude !== null && longitude !== null ? (
                <View style={styles.coordsCardContent}>
                  <View style={styles.miniMapPinCircle}>
                    <Ionicons name="location-sharp" size={22} color="#ffffff" />
                  </View>
                  <View style={styles.coordsCardTextGroup}>
                    <Text style={styles.coordsDisplayTitle}>
                      📍 {Math.abs(latitude).toFixed(4)}° {latitude >= 0 ? 'N' : 'S'}, {Math.abs(longitude).toFixed(4)}° {longitude >= 0 ? 'E' : 'W'}
                    </Text>
                    <Text style={styles.coordsDisplaySubtitle} numberOfLines={1}>
                      {address.trim() || 'Custom Pinned Coordinates'}
                    </Text>
                  </View>
                </View>
              ) : isGeocoding ? (
                <View style={styles.miniMapResolvingBox}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.miniMapResolvingText}>Locating on 3D Mapbox...</Text>
                </View>
              ) : (
                <View style={styles.coordsCardEmpty}>
                  <Ionicons name="navigate-circle-outline" size={26} color="#94a3b8" />
                  <Text style={styles.coordsCardEmptyText}>
                    No pin placed yet. Tap below to adjust pin and outline footprint on 3D Mapbox.
                  </Text>
                </View>
              )}

              {footprintPolygon && footprintPolygon.length >= 3 && (
                <View style={styles.footprintSummaryBadge}>
                  <Ionicons name="crop" size={13} color="#059669" />
                  <Text style={styles.footprintSummaryBadgeText}>
                    Building Footprint: {footprintPolygon.length} corners calibrated
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.adjustPinButton}
              onPress={() => {
                try {
                  Vibration.vibrate(10);
                } catch (e) {}
                setIsMapModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="pin" size={16} color="#059669" />
              <Text style={styles.adjustPinButtonText}>
                {latitude !== null && longitude !== null
                  ? '📍 Adjust Pin on Map'
                  : '📍 Pin Location on Map'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Multi-Unit Building / Tower Section */}
        <View style={styles.sectionCard}>
          <View style={styles.complexToggleRow}>
            <View style={styles.complexToggleIconCircle}>
              <Ionicons name="business" size={22} color="#059669" />
            </View>
            <View style={styles.complexToggleTextGroup}>
              <Text style={styles.complexToggleTitle}>Multi-Unit Building / Tower</Text>
              <Text style={styles.complexToggleSubtitle}>
                Residential tower, condominium, or apartment complex with multiple units
              </Text>
            </View>
            <Switch
              value={isComplex}
              onValueChange={(val) => {
                try {
                  Vibration.vibrate(10);
                } catch (e) {}
                setIsComplex(val);
                if (val && !complexName && title) {
                  setComplexName(title);
                }
              }}
              trackColor={{ false: '#cbd5e1', true: '#86efac' }}
              thumbColor={isComplex ? '#059669' : '#94a3b8'}
            />
          </View>

          {isComplex && (
            <View style={styles.complexExpandedContainer}>
              <View style={styles.complexDivider} />

              <Text style={styles.label}>Tower / Complex Name *</Text>
              <TextInput
                style={styles.input}
                value={complexName}
                onChangeText={setComplexName}
                placeholder="e.g. Skyline Residences Tower B"
                placeholderTextColor="#94a3b8"
              />

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Total Planned Units</Text>
                  <TextInput
                    style={styles.input}
                    value={totalUnits}
                    onChangeText={setTotalUnits}
                    placeholder="e.g. 48"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Total Floors</Text>
                  <TextInput
                    style={styles.input}
                    value={floorCount}
                    onChangeText={setFloorCount}
                    placeholder="e.g. 18"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Footprint Summary Badge */}
              <View style={styles.footprintStatusBox}>
                <Ionicons
                  name={footprintPolygon && footprintPolygon.length >= 3 ? 'checkmark-circle' : 'information-circle'}
                  size={18}
                  color={footprintPolygon && footprintPolygon.length >= 3 ? '#059669' : '#0284c7'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.footprintStatusTitle}>
                    {footprintPolygon && footprintPolygon.length >= 3
                      ? `Building Footprint Calibrated (${footprintPolygon.length} corners)`
                      : 'Building Footprint Polygon'}
                  </Text>
                  <Text style={styles.footprintStatusDesc}>
                    {footprintPolygon && footprintPolygon.length >= 3
                      ? 'Perimeter polygon recorded for 3D extrusion on Mapbox.'
                      : 'Tap "Adjust Pin on Map" above to outline the 4 corners of the building footprint.'}
                  </Text>
                </View>
              </View>

              {/* Explanatory iOS Alert Card */}
              <View style={styles.complexExplainerCard}>
                <Ionicons name="layers-outline" size={20} color="#2563eb" />
                <Text style={styles.complexExplainerText}>
                  You can add individual unit floor plans, pricing, and availability after saving this complex.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Photos Section */}
        <View style={styles.sectionCard}>
          <View style={styles.photoHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Property Photos</Text>
              <Text style={styles.photoSubtitle}>
                Up to 6 photos · 4:3 Aspect Ratio · Auto WebP compressed
              </Text>
            </View>
            <Text style={styles.photoCountText}>{croppedImages.length} / 6</Text>
          </View>

          {croppedImages.length < 6 && (
            <TouchableOpacity style={styles.pickButton} onPress={pickImages}>
              <Ionicons name="images-outline" size={22} color="#059669" />
              <Text style={styles.pickButtonText}>
                {croppedImages.length === 0 ? 'Select Photos (1 to 6)' : 'Add More Photos'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Photo Gallery with Cover badge and reordering */}
          {croppedImages.length > 0 && (
            <View style={styles.galleryList}>
              {croppedImages.map((item, index) => {
                const isCover = index === 0;
                return (
                  <View key={index} style={styles.photoCard}>
                    <Image source={{ uri: item.uri }} style={styles.photoCardImg} />

                    {/* Cover Photo Badge */}
                    {isCover ? (
                      <View style={styles.coverBadge}>
                        <Ionicons name="star" size={11} color="#fff" />
                        <Text style={styles.coverBadgeText}>Cover Photo</Text>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.makeCoverBtn} onPress={() => setAsCover(index)}>
                        <Text style={styles.makeCoverBtnText}>Set Cover</Text>
                      </TouchableOpacity>
                    )}

                    {/* Delete Button */}
                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removeImage(index)}>
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>

                    {/* Reordering Controls */}
                    <View style={styles.reorderBar}>
                      <TouchableOpacity
                        style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
                        onPress={() => moveImage(index, 'left')}
                        disabled={index === 0}
                      >
                        <Ionicons name="chevron-back" size={16} color={index === 0 ? '#94a3b8' : '#0f172a'} />
                      </TouchableOpacity>

                      <Text style={styles.reorderIndex}>#{index + 1}</Text>

                      <TouchableOpacity
                        style={[
                          styles.reorderBtn,
                          index === croppedImages.length - 1 && styles.reorderBtnDisabled,
                        ]}
                        onPress={() => moveImage(index, 'right')}
                        disabled={index === croppedImages.length - 1}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={index === croppedImages.length - 1 ? '#94a3b8' : '#0f172a'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#059669" />
              <Text style={styles.loadingStatusText}>{uploadStatus}</Text>
            </View>
          ) : (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.draftButton}
                onPress={() => handleSubmit('DRAFT')}
              >
                <Ionicons name="bookmark-outline" size={18} color="#475569" />
                <Text style={styles.draftButtonText}>Save as Draft</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.publishButton}
                onPress={() => handleSubmit('PENDING_APPROVAL')}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.publishButtonText}>Publish Listing</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Interactive 4:3 Multi-Image Cropper Modal */}
      <ImageCropperModal
        visible={isCropperVisible}
        images={pendingRawImages}
        onCancel={() => {
          setIsCropperVisible(false);
          setPendingRawImages([]);
        }}
        onComplete={handleCropperComplete}
      />

      {/* iOS-Grade Mapbox Pin-Dropper & Footprint Selector Modal */}
      <OwnerMapPinPickerModal
        visible={isMapModalVisible}
        onClose={() => setIsMapModalVisible(false)}
        onConfirm={(result) => {
          setLatitude(result.latitude);
          setLongitude(result.longitude);
          if (result.footprint) {
            setFootprintPolygon(result.footprint);
          }
        }}
        initialLatitude={latitude}
        initialLongitude={longitude}
        initialFootprint={footprintPolygon}
        address={address}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    marginBottom: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderRadius: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  textArea: {
    height: 85,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  photoSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  photoCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderStyle: 'dashed',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 14,
  },
  pickButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  galleryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoCard: {
    width: '47.5%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  photoCardImg: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#e2e8f0',
  },
  coverBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#059669',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  coverBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  makeCoverBtn: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  makeCoverBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ef4444',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reorderBtn: {
    padding: 4,
    borderRadius: 4,
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  reorderIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  buttonContainer: {
    marginTop: 8,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingStatusText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  draftButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  publishButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#059669',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  publishButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  locationPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  coordsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  coordsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  locationLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  locationLoadingText: {
    fontSize: 12,
    color: '#64748b',
  },
  // Mini-Map Preview Card Styles
  miniMapCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  miniMapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  miniMapTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniMapTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  miniMapTactileCanvas: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
  },
  coordsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  miniMapPinCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  coordsCardTextGroup: {
    flex: 1,
  },
  coordsDisplayTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  coordsDisplaySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  miniMapResolvingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  miniMapResolvingText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  coordsCardEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  coordsCardEmptyText: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  footprintSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 5,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  footprintSummaryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  adjustPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  adjustPinButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  // Multi-Unit Building & Complex Styles
  complexToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  complexToggleIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  complexToggleTextGroup: {
    flex: 1,
    paddingRight: 8,
  },
  complexToggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  complexToggleSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  complexExpandedContainer: {
    marginTop: 12,
  },
  complexDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 12,
  },
  footprintStatusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  footprintStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  footprintStatusDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  complexExplainerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  complexExplainerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
    lineHeight: 16,
  },
});
