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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createProperty, uploadPropertyImage, addPropertyMedia, useAuth } from '@repo/api';
import { PropertyType, ListingType } from '@repo/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ImageCropperModal, CroppedImageResult, CropperImageInput } from '../../components/ImageCropperModal';

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
        status: submitStatus,
        is_approved: false,
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
});
