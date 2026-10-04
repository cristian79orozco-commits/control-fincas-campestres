import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { User, Session } from '@supabase/supabase-js';

const AUTH_STORAGE_KEY = 'fc_admin_auth_session';

interface StoredAuthSession {
  isLoggedIn: boolean;
  email: string;
  loginType: 'supabase' | 'fallback';
  timestamp: number;
}

const getStoredAuthSession = (): StoredAuthSession | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.isLoggedIn && parsed.email) {
      return parsed;
    }
  } catch (err) {
    console.warn('[useAuth] Error leyendo sesión guardada:', err);
  }
  return null;
};

const guardarAuthSession = (sessionData: StoredAuthSession) => {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
  } catch (err) {
    console.warn('[useAuth] Error guardando sesión en storage:', err);
  }
};

const borrarAuthSession = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.warn('[useAuth] Error borrando sesión en storage:', err);
  }
};

export function useAuth() {
  // Inicialización síncrona desde el primer render para evitar flicker o pérdida de sesión
  const initialAuth = getStoredAuthSession();

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => !!initialAuth?.isLoggedIn);
  const [user, setUser] = useState<User | { email: string; id?: string } | null>(() => {
    if (initialAuth?.isLoggedIn && initialAuth.email) {
      return { email: initialAuth.email, id: 'admin-persisted-user' } as any;
    }
    return null;
  });
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener sesión activa de Supabase al cargar
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        setIsAdminLoggedIn(true);
        guardarAuthSession({
          isLoggedIn: true,
          email: currentSession.user?.email || 'admin@fincas.com',
          loginType: 'supabase',
          timestamp: Date.now(),
        });
      } else {
        // Si Supabase Auth no tiene sesión oficial, comprobar si existe sesión fallback activa
        const stored = getStoredAuthSession();
        if (stored && stored.isLoggedIn) {
          setIsAdminLoggedIn(true);
          setUser({ email: stored.email, id: 'admin-fallback-user' } as any);
        } else {
          setIsAdminLoggedIn(false);
          setUser(null);
        }
      }
      setLoading(false);
    }).catch(err => {
      console.warn('[useAuth] Error al verificar sesión inicial:', err);
      const stored = getStoredAuthSession();
      if (stored && stored.isLoggedIn) {
        setIsAdminLoggedIn(true);
        setUser({ email: stored.email, id: 'admin-fallback-user' } as any);
      }
      setLoading(false);
    });

    // 2. Escuchar cambios de autenticación oficial de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        setIsAdminLoggedIn(true);
        guardarAuthSession({
          isLoggedIn: true,
          email: newSession.user?.email || 'admin@fincas.com',
          loginType: 'supabase',
          timestamp: Date.now(),
        });
      } else {
        const stored = getStoredAuthSession();
        if (!stored || stored.loginType === 'supabase') {
          setSession(null);
          setUser(null);
          setIsAdminLoggedIn(false);
          borrarAuthSession();
        }
      }
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
        const loggedUser = data.session.user;
        setUser(loggedUser);
        setSession(data.session);
        setIsAdminLoggedIn(true);
        guardarAuthSession({
          isLoggedIn: true,
          email: loggedUser.email || email,
          loginType: 'supabase',
          timestamp: Date.now(),
        });
        return { success: true };
      }

      // Si el proyecto aún no tiene usuario creado en Supabase Auth, permitimos el fallback administrativo configurado
      const FALLBACK_EMAIL = 'admin@fincas.com';
      const FALLBACK_PASS = 'Admin1234!';
      if (email.trim().toLowerCase() === FALLBACK_EMAIL.toLowerCase() && pass === FALLBACK_PASS) {
        const fallbackUser = { email: FALLBACK_EMAIL, id: 'admin-fallback-user' } as any;
        setUser(fallbackUser);
        setIsAdminLoggedIn(true);
        guardarAuthSession({
          isLoggedIn: true,
          email: FALLBACK_EMAIL,
          loginType: 'fallback',
          timestamp: Date.now(),
        });
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
      borrarAuthSession();
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
