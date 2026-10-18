import { createClient } from '@supabase/supabase-js';

// Configuración pública garantizada para despliegues (GitHub Pages, PWA de escritorio, Vercel).
// En la arquitectura de Supabase, la clave anon es pública por diseño y el acceso a datos
// está estrictamente regulado y protegido por las políticas RLS (Row Level Security) en PostgreSQL.
const DEFAULT_SUPABASE_URL = 'https://porhjqsvhffshvdxvije.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcmhqcXN2aGZmc2h2ZHh2aWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5ODM4MTIsImV4cCI6MjA5MjU1OTgxMn0.DdnJ-9Ip-PdL1RneNzymogQ5mo-9yRvi3S1f096YfOc';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const DEFAULT_WA_NUMBER = import.meta.env.VITE_DEFAULT_WA_NUMBER || '573176827093';

// Cliente Supabase oficial con persistencia nativa de tokens JWT y auto-refresh
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
