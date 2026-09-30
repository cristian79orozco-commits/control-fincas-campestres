import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://porhjqsvhffshvdxvije.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcmhqcXN2aGZmc2h2ZHh2aWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5ODM4MTIsImV4cCI6MjA5MjU1OTgxMn0.DdnJ-9Ip-PdL1RneNzymogQ5mo-9yRvi3S1f096YfOc';

export const DEFAULT_WA_NUMBER = import.meta.env.VITE_DEFAULT_WA_NUMBER || '573176827093';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
