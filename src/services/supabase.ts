import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://porhjqsvhffshvdxvije.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const DEFAULT_WA_NUMBER = import.meta.env.VITE_DEFAULT_WA_NUMBER || '573176827093';

if (!supabaseAnonKey) {
  console.warn('⚠️ VITE_SUPABASE_ANON_KEY no está configurada en .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
