import { supabase } from './client';
import { decode } from 'base64-arraybuffer';

export interface UploadImageInput {
  uri?: string;
  base64?: string;
  arrayBuffer?: ArrayBuffer;
  contentType?: string;
  fileExt?: string;
}

export const uploadPropertyImage = async (
  input: string | UploadImageInput,
  propertyId: string
): Promise<{ success: boolean; url?: string; error?: any }> => {
  try {
    let uploadBody: any;
    let contentType = 'image/webp';
    let fileExt = 'webp';

    if (typeof input === 'string') {
      if (input.startsWith('data:')) {
        const matches = input.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          contentType = matches[1];
          fileExt = contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg';
          uploadBody = decode(matches[2]);
        } else {
          uploadBody = decode(input);
        }
      } else if (
        !input.startsWith('http://') &&
        !input.startsWith('https://') &&
        !input.startsWith('file://') &&
        !input.startsWith('content://')
      ) {
        // Raw base64 string
        uploadBody = decode(input);
      } else {
        // HTTP or standard fetch
        const res = await fetch(input);
        uploadBody = await res.blob();
        contentType = res.headers.get('content-type') || 'image/webp';
        fileExt = contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg';
      }
    } else {
      contentType = input.contentType || 'image/webp';
      fileExt = input.fileExt || (contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg');

      if (input.arrayBuffer) {
        uploadBody = input.arrayBuffer;
      } else if (input.base64) {
        uploadBody = decode(input.base64);
      } else if (input.uri) {
        const res = await fetch(input.uri);
        uploadBody = await res.blob();
      } else {
        throw new Error('No valid image data provided for upload');
      }
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `${propertyId}/${uniqueId}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('property_images')
      .upload(path, uploadBody, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Error uploading image to Supabase Storage:', error);
      return { success: false, error };
    }

    const { data: publicUrlData } = supabase.storage
      .from('property_images')
      .getPublicUrl(path);

    return { success: true, url: publicUrlData.publicUrl };
  } catch (err) {
    console.error('Unexpected error uploading image:', err);
    return { success: false, error: err };
  }
};

export const deletePropertyImageFromStorage = async (
  url: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    if (!url) {
      return { success: true };
    }

    let filePath = url;
    const bucket = 'property_images';
    if (filePath.includes('/' + bucket + '/')) {
      filePath = filePath.split('/' + bucket + '/')[1];
    } else if (filePath.includes(bucket + '/')) {
      filePath = filePath.split(bucket + '/')[1];
    } else if (filePath.includes('/')) {
      const parts = filePath.split('/');
      if (parts.length >= 2) {
        filePath = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
      }
    }

    filePath = filePath.split('?')[0].split('#')[0];
    filePath = decodeURIComponent(filePath);

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting image from Supabase Storage:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error deleting image from storage:', err);
    return { success: false, error: err };
  }
};

export const deletePropertyStorageFolder = async (
  propertyId: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    if (!propertyId) {
      return { success: false, error: 'Property ID is required' };
    }

    const { data: files, error: listError } = await supabase.storage
      .from('property_images')
      .list(propertyId);

    if (listError) {
      console.error(`Error listing storage files for property (${propertyId}):`, listError);
      return { success: false, error: listError };
    }

    if (!files || files.length === 0) {
      return { success: true };
    }

    const filePaths = files.map((file) => `${propertyId}/${file.name}`);

    const { error: removeError } = await supabase.storage
      .from('property_images')
      .remove(filePaths);

    if (removeError) {
      console.error(`Error deleting storage folder files for property (${propertyId}):`, removeError);
      return { success: false, error: removeError };
    }

    return { success: true };
  } catch (err) {
    console.error(`Unexpected error deleting storage folder for property (${propertyId}):`, err);
    return { success: false, error: err };
  }
};

