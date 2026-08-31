export * from './client';
import { supabase } from './client';

export const getProperties = async () => {
  const { data, error } = await supabase.from('properties').select('*');
  if (error) {
    console.error('Error fetching properties:', error);
    throw error;
  }
  return data;
};

export * from './database.types';
export * from './auth';
export * from './AuthProvider';
export * from './properties';
export * from './storage';
export * from './enquiries';

