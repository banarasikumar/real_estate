import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createProperty, uploadPropertyImage, addPropertyMedia, useAuth } from '@repo/api';
import { PropertyType, ListingType } from '@repo/api';

export default function CreatePropertyScreen() {
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [listingType, setListingType] = useState('Sale');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [address, setAddress] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const pickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const uris = result.assets.map(asset => asset.uri);
      setImages(prev => [...prev, ...uris]);
    }
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
    setImages([]);
  };

  const handleSubmit = async () => {
    if (!session?.user?.id) {
      Alert.alert('Error', 'You must be logged in to create a property.');
      return;
    }

    if (!title || !price || !address) {
      Alert.alert('Error', 'Please fill in the required fields (Title, Price, Address).');
      return;
    }

    setIsLoading(true);

    try {
      const propTypeMapped = propertyType.toUpperCase() as PropertyType;
      const listTypeMapped = listingType.toUpperCase() as ListingType;

      const propertyData = {
        owner_id: session.user.id,
        title,
        description: description || null,
        prop_type: ['APARTMENT', 'HOUSE', 'VILLA', 'COMMERCIAL'].includes(propTypeMapped) ? propTypeMapped : 'APARTMENT',
        list_type: ['SALE', 'RENT'].includes(listTypeMapped) ? listTypeMapped : 'SALE',
        price: parseFloat(price) || 0,
        area_sqft: area ? parseFloat(area) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
        address,
        status: 'PENDING_APPROVAL' as const,
      };

      const { success, data: property, error } = await createProperty(propertyData);

      if (!success || !property) {
        throw error || new Error('Failed to create property');
      }

      for (let i = 0; i < images.length; i++) {
        const uri = images[i];
        const { success: uploadSuccess, url: publicUrl } = await uploadPropertyImage(uri, property.id);
        
        if (uploadSuccess && publicUrl) {
          const isFeatured = i === 0;
          await addPropertyMedia(property.id, publicUrl, isFeatured, i);
        }
      }

      Alert.alert("Success", "Property Submitted Successfully!");
      resetForm();
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>Create New Property</Text>
      
      <Text style={styles.label}>Title *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Cozy Apartment" />
      
      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Detailed description..." multiline numberOfLines={4} />
      
      <Text style={styles.label}>Property Type (e.g., Apartment, House)</Text>
      <TextInput style={styles.input} value={propertyType} onChangeText={setPropertyType} placeholder="Apartment" />
      
      <Text style={styles.label}>Listing Type (Sale or Rent)</Text>
      <TextInput style={styles.input} value={listingType} onChangeText={setListingType} placeholder="Sale" />
      
      <Text style={styles.label}>Price ($) *</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="500000" keyboardType="numeric" />
      
      <Text style={styles.label}>Area (Sqft)</Text>
      <TextInput style={styles.input} value={area} onChangeText={setArea} placeholder="1200" keyboardType="numeric" />
      
      <Text style={styles.label}>Bedrooms</Text>
      <TextInput style={styles.input} value={bedrooms} onChangeText={setBedrooms} placeholder="2" keyboardType="numeric" />
      
      <Text style={styles.label}>Bathrooms</Text>
      <TextInput style={styles.input} value={bathrooms} onChangeText={setBathrooms} placeholder="1.5" keyboardType="numeric" />
      
      <Text style={styles.label}>Address *</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="123 Main St" />
      
      <Text style={styles.label}>Images</Text>
      <TouchableOpacity style={styles.imagePickerButton} onPress={pickImages}>
        <Text style={styles.imagePickerButtonText}>Pick Images</Text>
      </TouchableOpacity>
      
      {images.length > 0 && (
        <View style={styles.imagesContainer}>
          {images.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.imagePreview} />
          ))}
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="green" />
        ) : (
          <Button title="Submit Property" onPress={handleSubmit} color="green" />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 16,
    borderRadius: 8,
    fontSize: 16
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  imagePickerButton: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  imagePreview: {
    width: 80,
    height: 80,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 30
  }
});
