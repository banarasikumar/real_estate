import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  getPropertyById,
  updateProperty,
  updatePropertyMediaOrder,
  deletePropertyMedia,
  uploadPropertyImage,
  deletePropertyImageFromStorage,
  addPropertyMedia,
  PropertyType,
  ListingType,
} from '@repo/api';
import {
  ImageCropperModal,
  CroppedImageResult,
  CropperImageInput,
} from '../../components/ImageCropperModal';

type PropTypeOption = 'Apartment' | 'House' | 'Villa' | 'Commercial';
type ListTypeOption = 'Sale' | 'Rent';

interface GalleryItem {
  key: string;
  isExisting: boolean;
  existingId?: string;
  url: string;
  croppedResult?: CroppedImageResult;
}

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Loading and initial fetch state
  const [property, setProperty] = useState<any | null>(null);
  const [isLoadingProperty, setIsLoadingProperty] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form inputs
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState<PropTypeOption>('Apartment');
  const [listingType, setListingType] = useState<ListTypeOption>('Sale');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [address, setAddress] = useState('');

  // Media Management States
  const [existingMedia, setExistingMedia] = useState<
    { id: string; url: string; is_featured: boolean; display_order: number }[]
  >([]);
  const [newCroppedImages, setNewCroppedImages] = useState<CroppedImageResult[]>([]);
  const [deletedMediaIds, setDeletedMediaIds] = useState<string[]>([]);

  // Unified Gallery display and order state
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  // Image Cropper Modal states
  const [pendingRawImages, setPendingRawImages] = useState<CropperImageInput[]>([]);
  const [isCropperVisible, setIsCropperVisible] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState('');

  // Map to retain original media URLs for storage deletion
  const originalMediaMap = useRef<Map<string, string>>(new Map());

  // Load property details
  const fetchProperty = useCallback(async () => {
    if (!id) {
      setLoadError('Invalid property ID');
      setIsLoadingProperty(false);
      return;
    }

    try {
      setIsLoadingProperty(true);
      setLoadError(null);
      const data = await getPropertyById(id);

      if (!data) {
        setLoadError('Property not found');
        setIsLoadingProperty(false);
        return;
      }

      setProperty(data);

      // Populate form fields
      setTitle(data.title || '');
      setDescription(data.description || '');

      // Normalize property type
      const propUpper = (data.prop_type || 'APARTMENT').toUpperCase();
      if (propUpper === 'HOUSE') setPropertyType('House');
      else if (propUpper === 'VILLA') setPropertyType('Villa');
      else if (propUpper === 'COMMERCIAL') setPropertyType('Commercial');
      else setPropertyType('Apartment');

      // Normalize listing type
      const listUpper = (data.list_type || 'SALE').toUpperCase();
      if (listUpper === 'RENT') setListingType('Rent');
      else setListingType('Sale');

      setPrice(data.price != null ? String(data.price) : '');
      setArea(data.area_sqft != null ? String(data.area_sqft) : '');
      setBedrooms(data.bedrooms != null ? String(data.bedrooms) : '');
      setBathrooms(data.bathrooms != null ? String(data.bathrooms) : '');
      setAddress(data.address || '');

      // Existing Media
      const rawMedia: { id: string; url: string; is_featured: boolean; display_order: number }[] =
        (data.property_media || []).sort(
          (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)
        );

      setExistingMedia(rawMedia);

      // Populate original media map for cloud storage cleanup
      const mediaMap = new Map<string, string>();
      rawMedia.forEach((item) => {
        mediaMap.set(item.id, item.url);
      });
      originalMediaMap.current = mediaMap;

      // Populate unified gallery
      const items: GalleryItem[] = rawMedia.map((m) => ({
        key: `existing_${m.id}`,
        isExisting: true,
        existingId: m.id,
        url: m.url,
      }));
      setGalleryItems(items);
    } catch (err: any) {
      console.error('Error fetching property for edit:', err);
      setLoadError(err.message || 'Failed to load property');
    } finally {
      setIsLoadingProperty(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  // Image Picker & Cropper launcher
  const pickImages = async () => {
    const remainingSlots = 6 - galleryItems.length;
    if (remainingSlots <= 0) {
      Alert.alert('Limit Reached', 'You can have up to 6 photos per property listing.');
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

  // Append newly cropped images to state
  const handleCropperComplete = (newCropped: CroppedImageResult[]) => {
    setIsCropperVisible(false);
    setPendingRawImages([]);

    if (!newCropped || newCropped.length === 0) return;

    setNewCroppedImages((prev) => [...prev, ...newCropped]);

    setGalleryItems((prev) => {
      const remainingSlots = 6 - prev.length;
      const toAdd = newCropped.slice(0, remainingSlots);
      const newItems: GalleryItem[] = toAdd.map((crop, idx) => ({
        key: `new_${Date.now()}_${idx}_${Math.random()}`,
        isExisting: false,
        url: crop.uri,
        croppedResult: crop,
      }));
      return [...prev, ...newItems];
    });
  };

  // Remove photo handler
  const removeImage = (index: number) => {
    const item = galleryItems[index];
    if (!item) return;

    if (item.isExisting && item.existingId) {
      setDeletedMediaIds((prev) => [...prev, item.existingId!]);
      setExistingMedia((prev) => prev.filter((m) => m.id !== item.existingId));
    } else if (!item.isExisting && item.croppedResult) {
      setNewCroppedImages((prev) =>
        prev.filter((crop) => crop !== item.croppedResult && crop.uri !== item.url)
      );
    }

    setGalleryItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Set as Cover Photo (moves item to index 0)
  const setAsCover = (index: number) => {
    if (index === 0) return;
    setGalleryItems((prev) => {
      const updated = [...prev];
      const [item] = updated.splice(index, 1);
      updated.unshift(item);
      return updated;
    });
  };

  // Move photo left/right
  const moveImage = (index: number, direction: 'left' | 'right') => {
    setGalleryItems((prev) => {
      const updated = [...prev];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= updated.length) return prev;
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  // Validation and Save Trigger
  const handleSaveChanges = () => {
    if (!title.trim()) {
      Alert.alert('Missing Field', 'Please enter a property title.');
      return;
    }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert('Missing Field', 'Please enter a valid price.');
      return;
    }
    if (!propertyType) {
      Alert.alert('Missing Field', 'Please select a property type.');
      return;
    }
    if (!listingType) {
      Alert.alert('Missing Field', 'Please select a listing type.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Missing Field', 'Please enter a property address.');
      return;
    }

    if (property?.status === 'PUBLISHED') {
      Alert.alert(
        'Update Published Listing?',
        'Saving these changes will submit the property for Admin verification before it goes live again.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm & Save',
            style: 'default',
            onPress: () => performSave(),
          },
        ]
      );
    } else {
      performSave();
    }
  };

  // Execution of the Save sequence
  const performSave = async () => {
    setIsSaving(true);
    setSavingStatus('Removing deleted images...');

    try {
      // 1. Delete removed media records and clean up storage
      for (const mediaId of deletedMediaIds) {
        const url = originalMediaMap.current.get(mediaId);
        await deletePropertyMedia(mediaId);
        if (url) {
          await deletePropertyImageFromStorage(url);
        }
      }

      // 2. Upload newly cropped images and update order for all items
      for (let order = 0; order < galleryItems.length; order++) {
        const item = galleryItems[order];
        const isFeatured = order === 0;

        if (!item.isExisting && item.croppedResult) {
          setSavingStatus(`Uploading photo ${order + 1} of ${galleryItems.length}...`);
          const img = item.croppedResult;
          const uploadPayload = img.base64 || img.uri;

          const { success, url, error: uploadErr } = await uploadPropertyImage(uploadPayload, id);

          if (success && url) {
            await addPropertyMedia(id, url, isFeatured, order);
          } else {
            console.warn(`Failed to upload photo ${order + 1}:`, uploadErr);
          }
        } else if (item.isExisting && item.existingId) {
          await updatePropertyMediaOrder(item.existingId, order, isFeatured);
        }
      }

      // 3. Update property data payload
      setSavingStatus('Updating listing details...');
      const propTypeMapped = propertyType.toUpperCase() as PropertyType;
      const listTypeMapped = listingType.toUpperCase() as ListingType;

      const updatePayload = {
        title: title.trim(),
        description: description.trim() || null,
        prop_type: propTypeMapped,
        list_type: listTypeMapped,
        price: parseFloat(price) || 0,
        area_sqft: area ? parseFloat(area) : null,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
        address: address.trim(),
      };

      const isPublished = property?.status === 'PUBLISHED';
      const { success: updateSuccess, error: updateErr } = await updateProperty(
        id,
        updatePayload,
        isPublished
      );

      if (!updateSuccess) {
        throw updateErr || new Error('Failed to update property details');
      }

      const successMessage = isPublished
        ? 'Changes saved! The property has been submitted for Admin re-verification before going live again.'
        : 'Property details updated successfully!';

      Alert.alert('Success', successMessage, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      console.error('Error saving property changes:', err);
      Alert.alert('Error', err.message || 'Something went wrong while saving changes.');
    } finally {
      setIsSaving(false);
      setSavingStatus('');
    }
  };

  if (isLoadingProperty) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading property details...</Text>
      </SafeAreaView>
    );
  }

  if (loadError || !property) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={54} color="#ef4444" />
        <Text style={styles.errorTitle}>Unable to Load Property</Text>
        <Text style={styles.errorText}>{loadError || 'Listing could not be found.'}</Text>
        <TouchableOpacity style={styles.backButtonOutline} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color="#059669" />
          <Text style={styles.backButtonOutlineText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isPublished = property.status === 'PUBLISHED';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.navBackBtn}
          onPress={() => router.back()}
          disabled={isSaving}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.navTitleBox}>
          <Text style={styles.navTitle}>Edit Property</Text>
          <Text style={styles.navSubtitle} numberOfLines={1}>
            ID: {id.substring(0, 8)}...
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Published Listing Warning Banner */}
        {isPublished && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={24} color="#d97706" style={styles.warningIcon} />
            <View style={styles.warningTextBox}>
              <Text style={styles.warningTitle}>Published Listing</Text>
              <Text style={styles.warningText}>
                ⚠️ Note: Editing a published listing requires Admin re-approval. It will be submitted
                for review upon saving.
              </Text>
            </View>
          </View>
        )}

        {/* Basic Property Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Listing Information</Text>

          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Modern 3 BHK High-Rise Apartment"
            placeholderTextColor="#94a3b8"
            editable={!isSaving}
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
            editable={!isSaving}
          />

          {/* Property Type Selector */}
          <Text style={styles.label}>Property Type *</Text>
          <View style={styles.chipRow}>
            {(['Apartment', 'House', 'Villa', 'Commercial'] as const).map((type) => {
              const isSelected = propertyType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setPropertyType(type)}
                  disabled={isSaving}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Listing Type Selector */}
          <Text style={styles.label}>Listing Type *</Text>
          <View style={styles.chipRow}>
            {(['Sale', 'Rent'] as const).map((type) => {
              const isSelected = listingType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setListingType(type)}
                  disabled={isSaving}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {type === 'Sale' ? 'For Sale' : 'For Rent'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Price ($) *</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="e.g. 350000"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            editable={!isSaving}
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
                editable={!isSaving}
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
                editable={!isSaving}
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
                editable={!isSaving}
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
            editable={!isSaving}
          />
        </View>

        {/* Media Management Section */}
        <View style={styles.sectionCard}>
          <View style={styles.photoHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Property Photos</Text>
              <Text style={styles.photoSubtitle}>
                Up to 6 photos · 4:3 Aspect Ratio · First photo is Cover
              </Text>
            </View>
            <Text style={styles.photoCountText}>{galleryItems.length} / 6</Text>
          </View>

          {/* Add More Photos Button */}
          {galleryItems.length < 6 && (
            <TouchableOpacity
              style={styles.pickButton}
              onPress={pickImages}
              disabled={isSaving}
            >
              <Ionicons name="images-outline" size={20} color="#059669" />
              <Text style={styles.pickButtonText}>
                {galleryItems.length === 0 ? 'Select Photos (up to 6)' : 'Add More Photos'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Photo Gallery Grid */}
          {galleryItems.length > 0 ? (
            <View style={styles.galleryList}>
              {galleryItems.map((item, index) => {
                const isCover = index === 0;
                return (
                  <View key={item.key} style={styles.photoCard}>
                    <Image source={{ uri: item.url }} style={styles.photoCardImg} />

                    {/* Cover Photo Badge or Set as Cover Button */}
                    {isCover ? (
                      <View style={styles.coverBadge}>
                        <Ionicons name="star" size={11} color="#fff" />
                        <Text style={styles.coverBadgeText}>Cover Photo</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.makeCoverBtn}
                        onPress={() => setAsCover(index)}
                        disabled={isSaving}
                      >
                        <Ionicons name="star-outline" size={11} color="#fff" />
                        <Text style={styles.makeCoverBtnText}>Set Cover</Text>
                      </TouchableOpacity>
                    )}

                    {/* New photo indicator pill */}
                    {!item.isExisting && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    )}

                    {/* Remove Photo Button */}
                    <TouchableOpacity
                      style={styles.deletePhotoBtn}
                      onPress={() => removeImage(index)}
                      disabled={isSaving}
                    >
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>

                    {/* Reordering Controls Bar */}
                    <View style={styles.reorderBar}>
                      <TouchableOpacity
                        style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
                        onPress={() => moveImage(index, 'left')}
                        disabled={index === 0 || isSaving}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={16}
                          color={index === 0 ? '#cbd5e1' : '#0f172a'}
                        />
                      </TouchableOpacity>

                      <Text style={styles.reorderIndex}>#{index + 1}</Text>

                      <TouchableOpacity
                        style={[
                          styles.reorderBtn,
                          index === galleryItems.length - 1 && styles.reorderBtnDisabled,
                        ]}
                        onPress={() => moveImage(index, 'right')}
                        disabled={index === galleryItems.length - 1 || isSaving}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={index === galleryItems.length - 1 ? '#cbd5e1' : '#0f172a'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyGalleryBox}>
              <Ionicons name="image-outline" size={32} color="#94a3b8" />
              <Text style={styles.emptyGalleryText}>No photos added yet</Text>
            </View>
          )}
        </View>

        {/* Action Button Section */}
        <View style={styles.buttonContainer}>
          {isSaving ? (
            <View style={styles.savingBox}>
              <ActivityIndicator size="large" color="#059669" />
              <Text style={styles.savingStatusText}>{savingStatus || 'Saving changes...'}</Text>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveChanges}
                disabled={isSaving}
              >
                <Ionicons name="checkmark-done" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 4:3 Aspect Ratio Image Cropper Modal */}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#059669',
    gap: 6,
  },
  backButtonOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  navBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitleBox: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  navSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  warningIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  warningTextBox: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b45309',
    marginBottom: 3,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#92400e',
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
  newBadge: {
    position: 'absolute',
    top: 6,
    right: 32,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  reorderBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderBtnDisabled: {
    opacity: 0.35,
  },
  reorderIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  emptyGalleryBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyGalleryText: {
    marginTop: 6,
    fontSize: 13,
    color: '#94a3b8',
  },
  buttonContainer: {
    marginTop: 8,
  },
  savingBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  savingStatusText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
