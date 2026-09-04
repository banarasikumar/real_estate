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
        !input.startsWith('content://') &&
        input.length > 500
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
