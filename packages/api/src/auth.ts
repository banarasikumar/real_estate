import { supabase } from './client';

export const signInWithEmail = async (email: string, password?: string) => {
  return await supabase.auth.signInWithPassword({ email, password: password || '' });
};

export const signUpWithEmail = async (email: string, password?: string) => {
  return await supabase.auth.signUp({ email, password: password || '' });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getSession = async () => {
  return await supabase.auth.getSession();
};

export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(`Error fetching profile (${userId}):`, error);
      return null;
    }
    return data;
  } catch (err) {
    console.error(`Unexpected error fetching profile (${userId}):`, err);
    return null;
  }
};

export const getAllProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching profiles:', err);
    return [];
  }
};

export const updateUserRole = async (userId: string, newRole: import('./database.types').UserRole) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error(`Error updating role for user (${userId}):`, error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error(`Unexpected error updating role for user (${userId}):`, err);
    return { success: false, error: err };
  }
};
