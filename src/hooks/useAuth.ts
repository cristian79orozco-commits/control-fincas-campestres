import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { User, Session } from '@supabase/supabase-js';

// Verificación síncrona inicial de existencia de token de Supabase Auth
const checkSupabaseAuthTokenExists = (): boolean => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.access_token || parsed.user)) {
            return true;
          }
        }
      }
    }
  } catch {
    // Ignorar errores de acceso a storage
  }
  return false;
};

export function useAuth() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => checkSupabaseAuthTokenExists());
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener sesión activa oficial de Supabase Auth
    supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
      if (error) {
        console.warn('[useAuth] Error al recuperar sesión de Supabase:', error.message);
      }
      if (currentSession && currentSession.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        setIsAdminLoggedIn(true);
      } else {
        setSession(null);
        setUser(null);
        setIsAdminLoggedIn(false);
      }
      setLoading(false);
    }).catch(err => {
      console.warn('[useAuth] Error al verificar sesión inicial:', err);
      setSession(null);
      setUser(null);
      setIsAdminLoggedIn(false);
      setLoading(false);
    });

    // 2. Escuchar cambios de autenticación oficial de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession && newSession.user) {
        setSession(newSession);
        setUser(newSession.user);
        setIsAdminLoggedIn(true);
      } else {
        setSession(null);
        setUser(null);
        setIsAdminLoggedIn(false);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const cleanEmail = email.trim();
      if (!cleanEmail || !pass) {
        return { success: false, message: 'Ingresa correo y contraseña' };
      }

      // Autenticación estricta con Supabase Auth (sin backdoors ni credenciales en duro)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (error) {
        return {
          success: false,
          message: error.message === 'Invalid login credentials'
            ? 'Credenciales incorrectas. Verifica tu correo y contraseña registrados en Supabase.'
            : (error.message || 'Error de autenticación'),
        };
      }

      if (data && data.session) {
        setUser(data.session.user);
        setSession(data.session);
        setIsAdminLoggedIn(true);
        return { success: true };
      }

      return {
        success: false,
        message: 'No se pudo iniciar sesión. Verifica tu conexión y credenciales.',
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error de conexión con el servidor de autenticación' };
    }
  };

  const logout = async () => {
    try {
      try {
        localStorage.setItem('fc_app_view', 'cliente');
      } catch {}
      await supabase.auth.signOut();
    } catch (e) {
      console.error('[useAuth] Error al cerrar sesión:', e);
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
