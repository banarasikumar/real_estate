import { supabase } from './client';

export const uploadPropertyImage = async (fileUri: string, propertyId: string): Promise<{ success: boolean; url?: string; error?: any }> => {
  try {
    const res = await fetch(fileUri);
    const blob = await res.blob();
    
    const path = `${propertyId}/${Date.now()}.jpg`;
    
    const { data, error } = await supabase.storage
      .from('property_images')
      .upload(path, blob, {
        contentType: 'image/jpeg',
      });
      
    if (error) {
      console.error('Error uploading image:', error);
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
