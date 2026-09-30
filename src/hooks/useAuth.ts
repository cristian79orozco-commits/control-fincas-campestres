import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    // 1. Obtener sesión activa al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsAdminLoggedIn(!!session);
      setLoading(false);
    });

    // 2. Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsAdminLoggedIn(!!session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    try {
      // Intento con Supabase Auth oficial
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (!error && data.session) {
        setIsAdminLoggedIn(true);
        return { success: true };
      }

      // Si el proyecto aún no tiene usuario creado en Supabase Auth, permitimos el fallback administrativo configurado
      const FALLBACK_EMAIL = 'admin@fincas.com';
      const FALLBACK_PASS = 'Admin1234!';
      if (email.trim().toLowerCase() === FALLBACK_EMAIL.toLowerCase() && pass === FALLBACK_PASS) {
        setIsAdminLoggedIn(true);
        return { success: true, message: 'Sesión administrativa iniciada' };
      }

      return {
        success: false,
        message: error ? error.message : 'Credenciales inválidas. Verifica tu correo y contraseña.',
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
    setUser(null);
    setSession(null);
    setIsAdminLoggedIn(false);
  };

  return {
    user,
    session,
    loading,
    isAdminLoggedIn,
    login,
    logout,
  };
}
