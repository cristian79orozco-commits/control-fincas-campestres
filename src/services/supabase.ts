import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase Config] Error crítico: Las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no están definidas. ' +
    'Configura el archivo .env localmente o en el panel de Vercel.'
  );
}

export const DEFAULT_WA_NUMBER = import.meta.env.VITE_DEFAULT_WA_NUMBER || '573176827093';

// Cliente Supabase oficial con persistencia nativa de tokens JWT y auto-refresh
export const supabase = createClient(
  supabaseUrl || 'https://porhjqsvhffshvdxvije.supabase.co',
  supabaseAnonKey || ''
);
