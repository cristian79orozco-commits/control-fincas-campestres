import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, DEFAULT_WA_NUMBER } from '../services/supabase';
import type {
  Finca, Cliente, CotizacionDB, Reserva, Pago, PagoTipo,
  ReservaEstado, CotizacionEstado, BloqueoDisponibilidad,
  Menu as MenuType, Comunicacion, ConfiguracionGeneral,
  ContenidoSitio, CierreReserva, ViewType, AdminSection
} from '../types';
import type { ToastMessage } from '../components/Toast';
import { calcularSaldo } from '../types';
import { obtenerSiguienteConsecutivo } from '../utils/consecutivos';
import { generarUUID, esUUID } from '../utils/uuid';
import { CONFIGURACION_DEFAULT, setConfiguracionGlobal } from '../services/configuracion';
import { CONTENIDO_SITIO_DEFAULT, setContenidoSitioGlobal } from '../services/contenidoSitio';
import type { DatosCotizacionPublica, ResultadoCotizacionPublica } from '../hooks/useCotizadorPublico';

// -----------------------------------------------------------------------------
// Interfaz del Estado y Acciones Centralizadas
// -----------------------------------------------------------------------------

interface AppContextValue {
  // Datos reactivos globales
  fincas: Finca[];
  todasLasFincas: Finca[];
  bloquesAdmin: BloqueoDisponibilidad[];
  clientes: Cliente[];
  cotizaciones: CotizacionDB[];
  reservas: Reserva[];
  menus: MenuType[];
  comunicaciones: Comunicacion[];
  configuracion: ConfiguracionGeneral;
  contenidoSitio: ContenidoSitio;
  loading: boolean;

  // Navegación centralizada e interacción cruzada Admin <-> Cliente
  view: ViewType;
  selectedFincaId: string | null;
  adminActiveSection: AdminSection;
  fincaParaEditarId: string | null;
  setView: (view: ViewType) => void;
  setSelectedFincaId: (id: string | null) => void;
  setAdminActiveSection: (section: AdminSection) => void;
  setFincaParaEditarId: (id: string | null) => void;
  navegarACliente: (fincaId?: string) => void;
  navegarAAdmin: (seccion?: AdminSection, fincaIdParaEditar?: string) => void;
  previsualizarFinca: (fincaId: string) => void;

  // Notificaciones Toast y Confirmaciones Globales
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  confirmModalState: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  };
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirm: () => void;

  // Métricas reactivas globales
  metricasFincas: {
    total: number;
    disponibles: number;
    ocupadas: number;
    porcentajeOcupacion: number;
  };
  metricasReservas: {
    total: number;
    activas: number;
    cerradas: number;
    llegasHoy: number;
    salenHoy: number;
  };

  // Recarga global
  recargarTodo: () => Promise<void>;

  // Flujo público y captación de clientes
  guardarCotizacionPublica: (datos: DatosCotizacionPublica) => Promise<ResultadoCotizacionPublica>;

  // Operaciones de Fincas y Disponibilidad
  guardarFinca: (
    fincaData: Partial<Finca>,
    imagenesUrls: string[],
    planesStr: string,
    amenidadesArr?: { nombre: string; icono?: string }[]
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  desactivarFinca: (id: string) => Promise<{ success: boolean; error?: string }>;
  reactivarFinca: (id: string) => Promise<{ success: boolean; error?: string }>;
  eliminarFinca: (id: string) => Promise<{ success: boolean; error?: string }>;
  marcarDiasAdmin: (fincaId: string, fechas: string[], estado: 'ocupado' | 'libre', nombreCliente?: string) => Promise<{ success: boolean; error?: string }>;
  eliminarBloqueo: (id: number | string) => Promise<{ success: boolean; error?: string }>;

  // Operaciones de Clientes
  guardarCliente: (datos: Partial<Cliente>) => Promise<{ success: boolean; id?: string; error?: string }>;
  desactivarCliente: (id: string) => Promise<{ success: boolean; error?: string }>;
  eliminarCliente: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Operaciones de Cotizaciones
  guardarCotizacion: (datos: Partial<CotizacionDB>) => Promise<{ success: boolean; id?: string; error?: string }>;
  cambiarEstadoCotizacion: (id: string, estado: CotizacionEstado) => Promise<{ success: boolean; error?: string }>;
  eliminarCotizacion: (id: string) => Promise<{ success: boolean; error?: string }>;
  convertirCotizacionAReserva: (cotizacion: CotizacionDB, anticipo?: number) => Promise<{ success: boolean; reservaId?: string; error?: string }>;

  // Operaciones de Reservas y Pagos
  guardarReserva: (datos: Partial<Reserva>) => Promise<{ success: boolean; id?: string; error?: string }>;
  cambiarEstadoReserva: (id: string, estado: ReservaEstado) => Promise<{ success: boolean; error?: string }>;
  cerrarReserva: (
    reservaId: string,
    datosCierre: Partial<CierreReserva>,
    pagoLiquidacion?: { valor: number; tipo: PagoTipo; observacion?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  reabrirReserva: (reservaId: string) => Promise<{ success: boolean; error?: string }>;
  eliminarReserva: (id: string) => Promise<{ success: boolean; error?: string }>;
  registrarPago: (reservaId: string, pago: { tipo: PagoTipo; fecha: string; valor: number; observacion?: string }) => Promise<{ success: boolean; error?: string }>;
  eliminarPago: (pagoId: string) => Promise<{ success: boolean; error?: string }>;

  // Menús
  guardarMenu: (menuData: Partial<MenuType>, imagenesUrls?: string[]) => Promise<{ success: boolean; id?: string; error?: string }>;
  cambiarEstadoMenu: (id: string, activo: boolean) => Promise<{ success: boolean; error?: string }>;
  eliminarMenu: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Comunicaciones
  registrarComunicacion: (com: any) => Promise<any>;
  limpiarHistorialComunicaciones: () => void;

  // Configuración y Contenido
  guardandoConfig: boolean;
  guardarConfiguracion: (datos: Partial<ConfiguracionGeneral>) => Promise<{ success: boolean; error?: string }>;
  restablecerConfiguracion: () => Promise<{ success: boolean; error?: string }>;
  guardandoContenido: boolean;
  guardarContenido: (datos: Partial<ContenidoSitio>) => Promise<{ success: boolean; error?: string }>;
  restablecerContenido: () => Promise<{ success: boolean; error?: string }>;
}

// Helpers de persistencia local resiliente
const leerCache = <T,>(key: string, fallback: T): T => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const guardarCache = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('[AppContext Cache] Error guardando:', key, err);
  }
};

const AppContext = createContext<AppContextValue | null>(null);

// -----------------------------------------------------------------------------
// Proveedor Centralizado (AppProvider)
// -----------------------------------------------------------------------------

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Estado local centralizado con rehidratación instantánea de caché local
  const [fincas, setFincas] = useState<Finca[]>(() => leerCache('fc_cache_fincas', []));
  const [bloquesAdmin, setBloquesAdmin] = useState<BloqueoDisponibilidad[]>(() => leerCache('fc_cache_disponibilidad', []));
  const [clientes, setClientes] = useState<Cliente[]>(() => leerCache('fc_cache_clientes', []));
  const [cotizaciones, setCotizaciones] = useState<CotizacionDB[]>(() => leerCache('fc_cache_cotizaciones', []));
  const [reservas, setReservas] = useState<Reserva[]>(() => leerCache('fc_cache_reservas', []));
  const [menus, setMenus] = useState<MenuType[]>(() => leerCache('fc_cache_menus', []));
  const [comunicaciones, setComunicaciones] = useState<Comunicacion[]>(() => leerCache('fc_cache_comunicaciones', []));
  const [configuracion, setConfiguracion] = useState<ConfiguracionGeneral>(() => leerCache('fc_configuracion_general', CONFIGURACION_DEFAULT));
  const [contenidoSitio, setContenidoSitio] = useState<ContenidoSitio>(() => leerCache('fc_contenido_sitio_v1', CONTENIDO_SITIO_DEFAULT));
  const [loading, setLoading] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [guardandoContenido, setGuardandoContenido] = useState(false);

  // Helpers para persistencia de navegación
  const getInitialView = (): ViewType => {
    try {
      const saved = localStorage.getItem('fc_app_view') as ViewType;
      if (saved === 'admin') {
        const authRaw = localStorage.getItem('fc_admin_auth_session');
        if (authRaw) {
          const auth = JSON.parse(authRaw);
          if (auth?.isLoggedIn) return 'admin';
        }
        return 'cliente';
      }
      if (saved === 'detalle') {
        const fId = localStorage.getItem('fc_selected_finca_id');
        if (fId) return 'detalle';
      }
      if (saved === 'cliente') return 'cliente';
    } catch {}
    return 'cliente';
  };

  const getInitialAdminSection = (): AdminSection => {
    try {
      const saved = localStorage.getItem('fc_admin_section') as AdminSection;
      if (saved) return saved;
    } catch {}
    return 'dashboard';
  };

  // Navegación centralizada e interacción cruzada Admin <-> Cliente persistida
  const [view, setView] = useState<ViewType>(getInitialView);
  const [selectedFincaId, setSelectedFincaId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('fc_selected_finca_id') || null;
    } catch {
      return null;
    }
  });
  const [adminActiveSection, setAdminActiveSection] = useState<AdminSection>(getInitialAdminSection);
  const [fincaParaEditarId, setFincaParaEditarId] = useState<string | null>(null);

  // Sincronizar navegación con localStorage
  useEffect(() => {
    try {
      localStorage.setItem('fc_app_view', view);
    } catch {}
  }, [view]);

  useEffect(() => {
    try {
      localStorage.setItem('fc_admin_section', adminActiveSection);
    } catch {}
  }, [adminActiveSection]);

  useEffect(() => {
    try {
      if (selectedFincaId) {
        localStorage.setItem('fc_selected_finca_id', selectedFincaId);
      } else {
        localStorage.removeItem('fc_selected_finca_id');
      }
    } catch {}
  }, [selectedFincaId]);

  // Notificaciones Toast centralizadas
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Modal de confirmación centralizado
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const openConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmModalState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      },
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Métodos de navegación unificada con persistencia inmediata
  const navegarACliente = useCallback((fincaId?: string) => {
    if (fincaId) {
      setSelectedFincaId(fincaId);
      setView('detalle');
      try {
        localStorage.setItem('fc_app_view', 'detalle');
        localStorage.setItem('fc_selected_finca_id', fincaId);
      } catch {}
    } else {
      setView('cliente');
      try {
        localStorage.setItem('fc_app_view', 'cliente');
      } catch {}
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navegarAAdmin = useCallback((seccion?: AdminSection, fincaIdParaEditar?: string) => {
    setView('admin');
    try {
      localStorage.setItem('fc_app_view', 'admin');
    } catch {}
    if (seccion) {
      setAdminActiveSection(seccion);
      try {
        localStorage.setItem('fc_admin_section', seccion);
      } catch {}
    }
    if (fincaIdParaEditar) setFincaParaEditarId(fincaIdParaEditar);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const previsualizarFinca = useCallback((fincaId: string) => {
    setSelectedFincaId(fincaId);
    setView('detalle');
    try {
      localStorage.setItem('fc_app_view', 'detalle');
      localStorage.setItem('fc_selected_finca_id', fincaId);
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ---------------------------------------------------------------------------
  // CARGA DE DATOS CENTRALIZADA
  // ---------------------------------------------------------------------------

  const cargarFincas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fincas')
        .select(`
          *,
          finca_imagenes(id, url, orden, es_principal),
          finca_amenidades(id, nombre, icono),
          finca_planes(id, nombre)
        `)
        .order('nombre');
      if (error) throw error;
      const arr = (data as Finca[]) || [];
      if (arr.length > 0) {
        setFincas(arr);
        guardarCache('fc_cache_fincas', arr);
      }
    } catch (err) {
      console.warn('[AppContext] Error cargando fincas:', err);
    }
  }, []);

  const cargarDisponibilidad = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('disponibilidad')
        .select('*, fincas(nombre)')
        .order('fecha_inicio');
      if (error) throw error;
      const arr = (data as unknown as BloqueoDisponibilidad[]) || [];
      setBloquesAdmin(arr);
      guardarCache('fc_cache_disponibilidad', arr);
    } catch (err) {
      console.warn('[AppContext] Error cargando disponibilidad:', err);
    }
  }, []);

  const cargarClientes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      const arr = (data as Cliente[]) || [];
      setClientes(arr);
      guardarCache('fc_cache_clientes', arr);
    } catch (err) {
      console.warn('[AppContext] Error cargando clientes:', err);
    }
  }, []);

  const cargarCotizaciones = useCallback(async (silencioso: boolean = false) => {
    try {
      const { data, error } = await supabase
        .from('cotizaciones')
        .select(`
          *,
          clientes(id, nombre, apellido, whatsapp, telefono),
          fincas(id, nombre)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const arr = (data as unknown as CotizacionDB[]) || [];
      const ordenadas = arr.sort(
        (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      );
      setCotizaciones(prev => {
        if (!silencioso && prev.length > 0 && ordenadas.length > prev.length) {
          const prevIds = new Set(prev.map(c => c.id));
          const nuevas = ordenadas.filter(c => !prevIds.has(c.id));
          if (nuevas.length > 0) {
            const masReciente = nuevas[0];
            const num = masReciente.consecutivo ? `[#${masReciente.consecutivo}]` : '';
            const nom = masReciente.clientes?.nombre ? ` de ${masReciente.clientes.nombre}` : '';
            showToast(`🔔 ¡Nueva cotización web recibida! ${num}${nom}`, 'info');
          }
        }
        return ordenadas;
      });
      guardarCache('fc_cache_cotizaciones', ordenadas);
    } catch (err) {
      console.warn('[AppContext] Error cargando cotizaciones:', err);
    }
  }, [showToast]);

  const cargarReservas = useCallback(async () => {
    try {
      let data: any[] | null = null;
      const resFull = await supabase
        .from('reservas')
        .select(`
          *,
          clientes(id, nombre, apellido, whatsapp, telefono),
          fincas(id, nombre),
          pagos(id, reserva_id, tipo, fecha, valor, observacion, created_at),
          cierres_reservas(*)
        `)
        .order('fecha_inicio', { ascending: false });

      if (resFull.error) {
        const resFallback = await supabase
          .from('reservas')
          .select(`
            *,
            clientes(id, nombre, apellido, whatsapp, telefono),
            fincas(id, nombre),
            pagos(id, reserva_id, tipo, fecha, valor, observacion, created_at)
          `)
          .order('fecha_inicio', { ascending: false });

        if (resFallback.error) throw resFallback.error;
        data = resFallback.data;
      } else {
        data = resFull.data;
      }

      const procesadas: Reserva[] = (data || []).map((r: any) => {
        const cierreRaw = r.cierres_reservas;
        const cierre = Array.isArray(cierreRaw) ? (cierreRaw[0] || null) : (cierreRaw || null);
        return { ...r, cierre };
      });

      const ordenadas = procesadas.sort(
        (a, b) => new Date(b.fecha_inicio || '').getTime() - new Date(a.fecha_inicio || '').getTime()
      );
      setReservas(ordenadas);
      guardarCache('fc_cache_reservas', ordenadas);
    } catch (err) {
      console.warn('[AppContext] Error cargando reservas:', err);
    }
  }, []);

  const cargarMenus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*, menu_imagenes(*)')
        .order('created_at', { ascending: true });
      if (error) throw error;
      const arr = ((data as MenuType[]) || []).map(m => {
        const sortedImgs = (m.menu_imagenes || []).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
        return { ...m, menu_imagenes: sortedImgs };
      });
      setMenus(arr);
      guardarCache('fc_cache_menus', arr);
    } catch (err) {
      console.warn('[AppContext] Error cargando menus:', err);
    }
  }, []);

  const cargarComunicaciones = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('comunicaciones')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(150);
      if (error) throw error;
      setComunicaciones((data as Comunicacion[]) || []);
    } catch (err) {
      console.warn('[AppContext] Error cargando comunicaciones:', err);
    }
  }, []);

  const cargarConfiguracion = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_general')
        .select('*')
        .eq('id', 'general')
        .maybeSingle();

      if (!error && data) {
        setConfiguracion(data as ConfiguracionGeneral);
        setConfiguracionGlobal(data as ConfiguracionGeneral);
      }
    } catch (err) {
      console.warn('[AppContext] Error cargando configuracion:', err);
    }
  }, []);

  const cargarContenidoSitio = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('contenido_sitio')
        .select('*')
        .eq('id', 'principal')
        .maybeSingle();

      if (!error && data) {
        setContenidoSitio(data as ContenidoSitio);
        setContenidoSitioGlobal(data as ContenidoSitio);
      }
    } catch (err) {
      console.warn('[AppContext] Error cargando contenido sitio:', err);
    }
  }, []);

  const recargarTodo = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      cargarFincas(),
      cargarDisponibilidad(),
      cargarClientes(),
      cargarCotizaciones(),
      cargarReservas(),
      cargarMenus(),
      cargarComunicaciones(),
      cargarConfiguracion(),
      cargarContenidoSitio(),
    ]);
    setLoading(false);
  }, [
    cargarFincas,
    cargarDisponibilidad,
    cargarClientes,
    cargarCotizaciones,
    cargarReservas,
    cargarMenus,
    cargarComunicaciones,
    cargarConfiguracion,
    cargarContenidoSitio,
  ]);

  // Carga inicial y Suscripción Realtime multi-capa (Supabase + BroadcastChannel + Smart Polling)
  useEffect(() => {
    recargarTodo();

    // 1. Sincronización en tiempo real oficial con Supabase
    const channel = supabase
      .channel('app-global-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cotizaciones' }, (payload) => {
        cargarCotizaciones();
        if (payload.eventType === 'INSERT') {
          const nueva = payload.new as any;
          const consecutivo = nueva?.consecutivo ? `[${nueva.consecutivo}] ` : '';
          showToast(`🔔 ¡Nueva cotización web recibida! ${consecutivo}Disponible en el panel admin.`, 'info');
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fincas' }, () => {
        cargarFincas();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, () => {
        cargarReservas();
        cargarDisponibilidad();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos' }, () => {
        cargarReservas();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => {
        cargarClientes();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disponibilidad' }, () => {
        cargarDisponibilidad();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menus' }, () => {
        cargarMenus();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comunicaciones' }, () => {
        cargarComunicaciones();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracion_general' }, () => {
        cargarConfiguracion();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contenido_sitio' }, () => {
        cargarContenidoSitio();
      })
      .subscribe();

    // 2. Sincronización instantánea cross-tab en el mismo navegador (BroadcastChannel)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('fc_realtime_sync_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'NUEVA_COTIZACION') {
            cargarCotizaciones();
            cargarClientes();
          }
        };
      }
    } catch (e) {
      console.warn('[AppContext] BroadcastChannel no soportado o fallido:', e);
    }

    // 3. Respaldo multi-pestaña mediante eventos de Storage
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fc_sync_tick') {
        cargarCotizaciones();
        cargarClientes();
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Polling inteligente suave (cada 10 segundos) cuando la pestaña está activa
    const intervalId = setInterval(() => {
      if (!document.hidden) {
        cargarCotizaciones(true);
      }
    }, 10000);

    // 5. Refresco inmediato cuando el usuario vuelve a enfocar la pestaña
    const handleReenfoque = () => {
      if (!document.hidden) {
        cargarCotizaciones(true);
        cargarReservas();
      }
    };
    document.addEventListener('visibilitychange', handleReenfoque);
    window.addEventListener('focus', handleReenfoque);

    return () => {
      supabase.removeChannel(channel);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
      window.removeEventListener('storage', handleStorage);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleReenfoque);
      window.removeEventListener('focus', handleReenfoque);
    };
  }, [
    recargarTodo,
    cargarFincas,
    cargarCotizaciones,
    cargarReservas,
    cargarClientes,
    cargarDisponibilidad,
    cargarMenus,
    cargarComunicaciones,
    cargarConfiguracion,
    cargarContenidoSitio,
    showToast,
  ]);

  // ---------------------------------------------------------------------------
  // ACCIONES CENTRALIZADAS: FLUJO PÚBLICO Y CONSECUTIVOS DESDE 1001
  // ---------------------------------------------------------------------------

  const guardarCotizacionPublica = async (
    datos: DatosCotizacionPublica
  ): Promise<ResultadoCotizacionPublica> => {
    try {
      // 1. Deduplicación inteligente de cliente
      const digitosTel = datos.clienteCelular.replace(/\D/g, '');
      const digitosTel10 = digitosTel.startsWith('57') && digitosTel.length === 12 ? digitosTel.slice(2) : digitosTel;
      const digitosTel57 = digitosTel.length === 10 ? `57${digitosTel}` : digitosTel;

      let clienteId: string = '';
      let clienteObj: Cliente | null = null;

      // Buscar si el cliente ya existe en la base de datos por teléfono
      if (digitosTel.length >= 7) {
        const filtrosOr = Array.from(new Set([digitosTel, digitosTel10, digitosTel57].filter(Boolean)))
          .flatMap(tel => [`telefono.eq.${tel}`, `whatsapp.eq.${tel}`])
          .join(',');

        try {
          const { data: existentes, error: errBusq } = await supabase
            .from('clientes')
            .select('id, nombre, apellido, telefono, whatsapp')
            .or(filtrosOr)
            .limit(1);

          if (!errBusq && existentes && existentes.length > 0) {
            clienteId = existentes[0].id;
            clienteObj = {
              ...existentes[0],
              nombre: datos.clienteNombre.trim(),
              whatsapp: datos.clienteWhatsapp.replace(/\D/g, '') || digitosTel57,
              activo: true,
            };
          }
        } catch (errBusq) {
          console.warn('[AppContext] Aviso en búsqueda de cliente existente:', errBusq);
        }
      }

      if (clienteId && clienteObj) {
        // Actualizar en memoria local
        const objActualizado = clienteObj;
        setClientes(prev => prev.map(c => (c.id === clienteId ? objActualizado : c)));

        // Persistir actualización en Supabase
        const { error: errUpd } = await supabase.from('clientes').update({
          nombre: datos.clienteNombre.trim(),
          whatsapp: clienteObj.whatsapp,
        }).eq('id', clienteId);

        if (errUpd) {
          console.warn('[AppContext] Aviso al actualizar cliente en Supabase:', errUpd);
        }
      } else {
        // Generar UUID v4 estándar válido para Postgres
        const nuevoClienteId = generarUUID();
        clienteId = nuevoClienteId;
        clienteObj = {
          id: nuevoClienteId,
          nombre: datos.clienteNombre.trim(),
          apellido: null,
          telefono: digitosTel10 || digitosTel,
          whatsapp: datos.clienteWhatsapp.replace(/\D/g, '') || digitosTel57,
          correo: null,
          observaciones: 'Registrado desde Cotizador Web',
          activo: true,
        };

        // Actualización optimista inmediata en memoria
        setClientes(prev => [clienteObj!, ...prev]);

        // Insertar cliente en Supabase
        const { error: errInsCli } = await supabase.from('clientes').insert({
          id: nuevoClienteId,
          nombre: clienteObj.nombre,
          apellido: null,
          telefono: clienteObj.telefono,
          whatsapp: clienteObj.whatsapp,
          correo: null,
          observaciones: clienteObj.observaciones,
          activo: true,
        });

        if (errInsCli) {
          console.error('[AppContext] Error al insertar cliente en Supabase:', errInsCli);
        }
      }

      // 2. Consecutivo estricto iniciando en 1001 (sin letras al inicio)
      const consecutivo = await obtenerSiguienteConsecutivo('cotizacion');

      // 3. Crear cotización con UUID propio de Postgres
      const newCotId = generarUUID();
      const fincaSel = fincas.find(f => f.id === datos.fincaId);

      // Normalizar y blindar fechas de estancia para cumplir CHECK (fecha_fin > fecha_inicio)
      const hoy = new Date().toISOString().split('T')[0];
      const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const fInicio = (datos.fechaInicio && datos.fechaInicio.length === 10) ? datos.fechaInicio : hoy;
      let fFin = (datos.fechaFin && datos.fechaFin.length === 10) ? datos.fechaFin : manana;
      if (fFin <= fInicio) {
        const dFin = new Date(new Date(fInicio).getTime() + 86400000);
        fFin = dFin.toISOString().split('T')[0];
      }

      const nuevaCotizacion: CotizacionDB = {
        id: newCotId,
        cliente_id: clienteId,
        finca_id: datos.fincaId,
        fecha_inicio: fInicio,
        fecha_fin: fFin,
        personas: datos.personas || 1,
        alimentacion: datos.alimentacion,
        menu_id: (datos.menuId && esUUID(datos.menuId)) ? datos.menuId : null,
        cantidad_alimentacion: datos.cantidadServicios || 1,
        precio_base_pp: datos.precioBasePp,
        subtotal_alojamiento: datos.subtotalAlojamiento,
        costo_alimentacion: datos.costoAlimentacion,
        descuento: 0,
        recargo: 0,
        total: datos.total,
        consecutivo: consecutivo,
        estado: 'cotizada',
        notas: `Solicitud web directa por WhatsApp · Consecutivo ${consecutivo}`,
        created_at: new Date().toISOString(),
        clientes: {
          id: clienteObj.id,
          nombre: clienteObj.nombre,
          apellido: clienteObj.apellido,
          whatsapp: clienteObj.whatsapp,
        },
        fincas: {
          id: datos.fincaId,
          nombre: fincaSel?.nombre || 'Finca Campestre',
        },
      };

      // Actualización optimista inmediata en memoria: ¡El Panel Admin la ve EN TIEMPO REAL!
      setCotizaciones(prev => [nuevaCotizacion, ...prev]);

      // Persistir cotización en Supabase
      const payloadBD: Record<string, unknown> = {
        id: newCotId,
        cliente_id: clienteId,
        finca_id: datos.fincaId,
        fecha_inicio: fInicio,
        fecha_fin: fFin,
        personas: datos.personas || 1,
        alimentacion: datos.alimentacion,
        precio_base_pp: datos.precioBasePp,
        subtotal_alojamiento: datos.subtotalAlojamiento,
        costo_alimentacion: datos.costoAlimentacion,
        cantidad_alimentacion: datos.cantidadServicios || 1,
        descuento: 0,
        recargo: 0,
        total: datos.total,
        consecutivo: consecutivo,
        estado: 'cotizada',
        notas: nuevaCotizacion.notas,
      };
      if (datos.menuId && esUUID(datos.menuId)) {
        payloadBD.menu_id = datos.menuId;
      }

      const { error: errorCot } = await supabase.from('cotizaciones').insert(payloadBD);
      if (errorCot) {
        console.error('[AppContext] Error al insertar cotización en Supabase:', errorCot);
      }

      // Sincronización instantánea cross-tab para reflejo inmediato en Panel Admin
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('fc_realtime_sync_channel');
          bc.postMessage({
            type: 'NUEVA_COTIZACION',
            payload: nuevaCotizacion,
            cliente: clienteObj,
          });
          bc.close();
        }
      } catch (e) {
        console.warn('[AppContext] Error notificando BroadcastChannel:', e);
      }

      try {
        localStorage.setItem('fc_sync_tick', Date.now().toString());
      } catch {}

      showToast(`✓ Cotización ${consecutivo} registrada con éxito`, 'success');

      return {
        success: true,
        consecutivo: consecutivo,
        cotizacionId: newCotId,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al procesar cotización';
      console.error('[AppContext.guardarCotizacionPublica]', err);
      return { success: false, error: msg };
    }
  };

  // ---------------------------------------------------------------------------
  // CONVERTIR COTIZACIÓN A RESERVA (Sinergia Total)
  // ---------------------------------------------------------------------------

  const convertirCotizacionAReserva = async (
    cotizacion: CotizacionDB,
    anticipo: number = 0
  ): Promise<{ success: boolean; reservaId?: string; error?: string }> => {
    try {
      // 1. Marcar cotización como confirmada en memoria y BD
      setCotizaciones(prev =>
        prev.map(c => (c.id === cotizacion.id ? { ...c, estado: 'confirmada' } : c))
      );
      try {
        await supabase.from('cotizaciones').update({ estado: 'confirmada' }).eq('id', cotizacion.id);
      } catch { /* silent */ }

      // 2. Generar consecutivo para la reserva (preservando el número de seguimiento sin letras)
      let consecutivoReserva: string;
      if (cotizacion.consecutivo) {
        const match = cotizacion.consecutivo.match(/\d+/g);
        consecutivoReserva = match ? match.join('') : cotizacion.consecutivo.replace(/^[A-Za-z\-]+/, '');
      } else {
        consecutivoReserva = await obtenerSiguienteConsecutivo('reserva');
      }

      const newResId = generarUUID();

      const fincaSel = fincas.find(f => f.id === cotizacion.finca_id);
      const clienteSel = clientes.find(c => c.id === cotizacion.cliente_id);

      const nuevaReserva: Reserva = {
        id: newResId,
        cotizacion_id: cotizacion.id,
        cliente_id: cotizacion.cliente_id || '',
        finca_id: cotizacion.finca_id,
        fecha_inicio: cotizacion.fecha_inicio,
        fecha_fin: cotizacion.fecha_fin,
        personas: cotizacion.personas,
        valor_total: cotizacion.total,
        separacion: anticipo,
        consecutivo: consecutivoReserva,
        estado: 'activa',
        observaciones: `Convertida de cotización ${cotizacion.consecutivo || cotizacion.id}`,
        created_at: new Date().toISOString(),
        clientes: clienteSel ? {
          id: clienteSel.id,
          nombre: clienteSel.nombre,
          apellido: clienteSel.apellido,
          whatsapp: clienteSel.whatsapp,
          telefono: clienteSel.telefono,
        } : cotizacion.clientes,
        fincas: fincaSel ? {
          id: fincaSel.id,
          nombre: fincaSel.nombre,
        } : cotizacion.fincas,
        pagos: anticipo > 0 ? [{
          id: `pago-${Date.now()}`,
          reserva_id: newResId,
          tipo: 'separacion',
          fecha: new Date().toISOString().split('T')[0],
          valor: anticipo,
          observacion: 'Anticipo registrado al convertir cotización en reserva',
        }] : [],
      };

      // Actualización optimista de reserva con persistencia local
      setReservas(prev => {
        const up = [nuevaReserva, ...prev];
        guardarCache('fc_cache_reservas', up);
        return up;
      });

      // Bloquear calendario en memoria y persistir en caché
      const nuevoBloqueo: BloqueoDisponibilidad = {
        id: Date.now(),
        finca_id: cotizacion.finca_id,
        fecha_inicio: cotizacion.fecha_inicio,
        fecha_fin: cotizacion.fecha_fin,
        estado: 'ocupado',
        personas: cotizacion.personas,
        notas: `Reserva ${consecutivoReserva}`,
        fincas: { nombre: fincaSel?.nombre || 'Finca' },
      };
      setBloquesAdmin(prev => {
        const up = [...prev, nuevoBloqueo];
        guardarCache('fc_cache_disponibilidad', up);
        return up;
      });

      // Actualizar cotización a confirmada en estado y caché
      setCotizaciones(prev => {
        const up = prev.map(c => (c.id === cotizacion.id ? { ...c, estado: 'confirmada' as const } : c));
        guardarCache('fc_cache_cotizaciones', up);
        return up;
      });

      // Persistir en Supabase (con fallback silencioso para no bloquear la app si RLS está pendiente)
      try {
        await supabase.from('reservas').insert({
          id: newResId,
          cotizacion_id: cotizacion.id,
          cliente_id: cotizacion.cliente_id,
          finca_id: cotizacion.finca_id,
          fecha_inicio: cotizacion.fecha_inicio,
          fecha_fin: cotizacion.fecha_fin,
          personas: cotizacion.personas,
          valor_total: cotizacion.total,
          separacion: anticipo,
          consecutivo: consecutivoReserva,
          estado: 'activa',
          observaciones: nuevaReserva.observaciones,
        });

        if (anticipo > 0) {
          await supabase.from('pagos').insert({
            reserva_id: newResId,
            tipo: 'separacion',
            fecha: new Date().toISOString().split('T')[0],
            valor: anticipo,
            observacion: 'Anticipo registrado al convertir cotización en reserva',
          });
        }

        await supabase.from('disponibilidad').insert({
          finca_id: cotizacion.finca_id,
          fecha_inicio: cotizacion.fecha_inicio,
          fecha_fin: cotizacion.fecha_fin,
          estado: 'ocupado',
          personas: cotizacion.personas,
          notas: `Reserva ${consecutivoReserva}`,
        });
      } catch (errDb) {
        console.warn('[convertirCotizacionAReserva] Aviso de sincronización Supabase:', errDb);
      }

      return { success: true, reservaId: newResId };
    } catch (err: any) {
      console.error('[AppContext.convertirCotizacionAReserva]', err);
      return { success: false, error: err.message };
    }
  };

  // ---------------------------------------------------------------------------
  // OPERACIONES DE RESERVAS Y PAGOS
  // ---------------------------------------------------------------------------

  const guardarReserva = async (datos: Partial<Reserva>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const isNew = !datos.id;
      const resId = datos.id || generarUUID();
      const consecutivo = datos.consecutivo || (isNew ? await obtenerSiguienteConsecutivo('reserva') : undefined);

      const fincaSel = fincas.find(f => f.id === datos.finca_id);
      const clienteSel = clientes.find(c => c.id === datos.cliente_id);

      const payloadReserva: Reserva = {
        id: resId,
        cliente_id: datos.cliente_id || '',
        finca_id: datos.finca_id || '',
        fecha_inicio: datos.fecha_inicio || '',
        fecha_fin: datos.fecha_fin || '',
        personas: datos.personas || 1,
        valor_total: datos.valor_total || 0,
        separacion: datos.separacion || 0,
        estado: datos.estado || 'activa',
        observaciones: datos.observaciones || null,
        consecutivo: consecutivo || datos.consecutivo,
        cotizacion_id: datos.cotizacion_id || null,
        clientes: clienteSel ? {
          id: clienteSel.id,
          nombre: clienteSel.nombre,
          apellido: clienteSel.apellido,
          whatsapp: clienteSel.whatsapp,
          telefono: clienteSel.telefono,
        } : undefined,
        fincas: fincaSel ? {
          id: fincaSel.id,
          nombre: fincaSel.nombre,
        } : undefined,
        pagos: isNew && datos.separacion && datos.separacion > 0 ? [{
          id: `pago-${Date.now()}`,
          reserva_id: resId,
          tipo: 'separacion',
          fecha: new Date().toISOString().split('T')[0],
          valor: datos.separacion,
          observacion: 'Separación registrada al crear reserva',
        }] : [],
      };

      // Actualización optimista y persistencia en cache local
      setReservas(prev => {
        const up = isNew ? [payloadReserva, ...prev] : prev.map(r => (r.id === resId ? { ...r, ...payloadReserva } : r));
        guardarCache('fc_cache_reservas', up);
        return up;
      });

      // Sincronizar bloqueo en disponibilidad de la finca
      if (datos.finca_id && datos.fecha_inicio && datos.fecha_fin) {
        setBloquesAdmin(prev => {
          const filtrados = prev.filter(b => !(
            b.finca_id === datos.finca_id &&
            ((b.fecha_inicio === datos.fecha_inicio && b.fecha_fin === datos.fecha_fin) ||
             (payloadReserva.consecutivo && b.notas && b.notas.includes(payloadReserva.consecutivo)))
          ));
          const nuevoBloqueo: BloqueoDisponibilidad = {
            id: Date.now(),
            finca_id: datos.finca_id!,
            fecha_inicio: datos.fecha_inicio!,
            fecha_fin: datos.fecha_fin!,
            estado: 'ocupado',
            personas: datos.personas || 1,
            notas: `Reserva ${payloadReserva.consecutivo || resId}`,
            fincas: { nombre: fincaSel?.nombre || 'Finca' },
          };
          const up = [...filtrados, nuevoBloqueo];
          guardarCache('fc_cache_disponibilidad', up);
          return up;
        });

        try {
          await supabase.from('disponibilidad').insert({
            finca_id: datos.finca_id,
            fecha_inicio: datos.fecha_inicio,
            fecha_fin: datos.fecha_fin,
            estado: 'ocupado',
            personas: datos.personas || 1,
            notas: `Reserva ${payloadReserva.consecutivo || resId}`,
          });
        } catch { /* silent */ }
      }

      // Persistir en Supabase
      const dbPayload: any = {
        id: resId,
        cliente_id: datos.cliente_id,
        finca_id: datos.finca_id,
        fecha_inicio: datos.fecha_inicio,
        fecha_fin: datos.fecha_fin,
        personas: datos.personas || 1,
        valor_total: datos.valor_total || 0,
        separacion: datos.separacion || 0,
        estado: datos.estado || 'activa',
        observaciones: datos.observaciones || null,
        consecutivo: payloadReserva.consecutivo,
        cotizacion_id: datos.cotizacion_id || null,
      };

      try {
        const { error } = await supabase.from('reservas').upsert(dbPayload, { onConflict: 'id' });
        if (error) console.warn('[guardarReserva] Supabase error:', error);

        if (isNew && datos.separacion && datos.separacion > 0) {
          await supabase.from('pagos').insert({
            reserva_id: resId,
            tipo: 'separacion',
            fecha: new Date().toISOString().split('T')[0],
            valor: datos.separacion,
            observacion: 'Separación registrada al crear reserva',
          });
        }
      } catch (errSup) {
        console.warn('[guardarReserva] Aviso de sincronización Supabase:', errSup);
      }

      return { success: true, id: resId };
    } catch (err: any) {
      console.error('[AppContext.guardarReserva]', err);
      return { success: false, error: err.message };
    }
  };

  const cambiarEstadoReserva = async (id: string, estado: ReservaEstado): Promise<{ success: boolean; error?: string }> => {
    try {
      const fechaCierre = (estado === 'completada' || estado === 'cancelada' || estado === 'no_show')
        ? new Date().toISOString()
        : null;

      // Actualización optimista inmediata
      setReservas(prev =>
        prev.map(r => (r.id === id ? { ...r, estado, fecha_cierre: fechaCierre } : r))
      );

      const updateData: any = { estado };
      if (fechaCierre) updateData.fecha_cierre = fechaCierre;
      else {
        updateData.fecha_cierre = null;
        updateData.cerrada_por = null;
        updateData.notas_cierre = null;
      }

      const { error } = await supabase.from('reservas').update(updateData).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const cerrarReserva = async (
    reservaId: string,
    datosCierre: Partial<CierreReserva>,
    pagoLiquidacion?: { valor: number; tipo: PagoTipo; observacion?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const fechaCierreIso = datosCierre.fecha_cierre || new Date().toISOString();
      const estadoFinal = datosCierre.estado_cierre || 'completada';
      const responsable = datosCierre.responsable || 'Administrador';
      const notas = datosCierre.notas_cierre || null;

      // 1. Si hay pago final, registrarlo optimista
      let nuevoPago: Pago | null = null;
      if (pagoLiquidacion && pagoLiquidacion.valor > 0) {
        nuevoPago = {
          id: `pago-${Date.now()}`,
          reserva_id: reservaId,
          tipo: pagoLiquidacion.tipo || 'pago_total',
          fecha: new Date().toISOString().split('T')[0],
          valor: pagoLiquidacion.valor,
          observacion: pagoLiquidacion.observacion || 'Liquidación final de saldo al cierre',
        };
      }

      // Actualización optimista de reserva a Historial
      setReservas(prev =>
        prev.map(r => {
          if (r.id === reservaId) {
            const pagosActualizados = nuevoPago ? [...(r.pagos || []), nuevoPago] : (r.pagos || []);
            const cierreObj: CierreReserva = {
              id: `cierre-${Date.now()}`,
              reserva_id: reservaId,
              fecha_cierre: fechaCierreIso,
              responsable,
              estado_cierre: estadoFinal,
              calificacion: datosCierre.calificacion,
              estado_entrega_finca: datosCierre.estado_entrega_finca,
              deposito_garantia_devuelto: datosCierre.deposito_garantia_devuelto,
              valor_deposito_devuelto: datosCierre.valor_deposito_devuelto,
              notas_cierre: notas,
              observaciones_entrega: datosCierre.observaciones_entrega,
            };
            return {
              ...r,
              estado: estadoFinal,
              fecha_cierre: fechaCierreIso,
              cerrada_por: responsable,
              notas_cierre: notas,
              cierre: cierreObj,
              pagos: pagosActualizados,
            };
          }
          return r;
        })
      );

      // Persistir en Supabase
      if (nuevoPago) {
        await supabase.from('pagos').insert({
          reserva_id: reservaId,
          tipo: nuevoPago.tipo,
          fecha: nuevoPago.fecha,
          valor: nuevoPago.valor,
          observacion: nuevoPago.observacion,
        });
      }

      await supabase.from('reservas').update({
        estado: estadoFinal,
        fecha_cierre: fechaCierreIso,
        cerrada_por: responsable,
        notas_cierre: notas,
      }).eq('id', reservaId);

      try {
        await supabase.from('cierres_reservas').upsert({
          reserva_id: reservaId,
          fecha_cierre: fechaCierreIso,
          responsable,
          estado_cierre: estadoFinal,
          calificacion: datosCierre.calificacion || null,
          estado_entrega_finca: datosCierre.estado_entrega_finca || 'excelente',
          deposito_garantia_devuelto: datosCierre.deposito_garantia_devuelto ?? true,
          valor_deposito_devuelto: datosCierre.valor_deposito_devuelto || 0,
          notas_cierre: notas,
          observaciones_entrega: datosCierre.observaciones_entrega || null,
        }, { onConflict: 'reserva_id' });
      } catch { /* silent */ }

      return { success: true };
    } catch (err: any) {
      console.error('[AppContext.cerrarReserva]', err);
      return { success: false, error: err.message };
    }
  };

  const reabrirReserva = async (reservaId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setReservas(prev =>
        prev.map(r => (r.id === reservaId ? { ...r, estado: 'activa', fecha_cierre: null, cierre: null } : r))
      );

      await supabase.from('reservas').update({
        estado: 'activa',
        fecha_cierre: null,
        cerrada_por: null,
        notas_cierre: null,
      }).eq('id', reservaId);

      try {
        await supabase.from('cierres_reservas').delete().eq('reserva_id', reservaId);
      } catch { /* silent */ }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const eliminarReserva = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const resAEliminar = reservas.find(r => r.id === id);

      // 1. Eliminar optimista y actualizar caché local
      setReservas(prev => {
        const up = prev.filter(r => r.id !== id);
        guardarCache('fc_cache_reservas', up);
        return up;
      });

      // 2. Liberar automáticamente el calendario en disponibilidad
      if (resAEliminar) {
        setBloquesAdmin(prev => {
          const up = prev.filter(b => !(
            b.finca_id === resAEliminar.finca_id &&
            ((b.fecha_inicio === resAEliminar.fecha_inicio && b.fecha_fin === resAEliminar.fecha_fin) ||
             (resAEliminar.consecutivo && b.notas && b.notas.includes(resAEliminar.consecutivo)))
          ));
          guardarCache('fc_cache_disponibilidad', up);
          return up;
        });

        try {
          await supabase
            .from('disponibilidad')
            .delete()
            .eq('finca_id', resAEliminar.finca_id)
            .eq('fecha_inicio', resAEliminar.fecha_inicio)
            .eq('fecha_fin', resAEliminar.fecha_fin);
        } catch { /* silent */ }
      }

      // 3. Eliminar pagos y cierres asociados en Supabase
      try {
        await supabase.from('pagos').delete().eq('reserva_id', id);
        await supabase.from('cierres_reservas').delete().eq('reserva_id', id);
      } catch { /* silent */ }

      // 4. Eliminar reserva en Supabase
      try {
        const { error } = await supabase.from('reservas').delete().eq('id', id);
        if (error) console.warn('[eliminarReserva] Aviso de sincronización Supabase:', error);
      } catch (errSup) {
        console.warn('[eliminarReserva] Supabase error:', errSup);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const registrarPago = async (
    reservaId: string,
    pago: { tipo: PagoTipo; fecha: string; valor: number; observacion?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const nuevoPagoId = generarUUID();
      const objPago: Pago = {
        id: nuevoPagoId,
        reserva_id: reservaId,
        tipo: pago.tipo,
        fecha: pago.fecha,
        valor: pago.valor,
        observacion: pago.observacion || null,
      };

      // Actualización optimista de pagos y persistencia en caché
      setReservas(prev => {
        const up = prev.map(r => {
          if (r.id === reservaId) {
            return {
              ...r,
              pagos: [...(r.pagos || []), objPago],
            };
          }
          return r;
        });
        guardarCache('fc_cache_reservas', up);
        return up;
      });

      try {
        await supabase.from('pagos').insert({
          id: nuevoPagoId,
          reserva_id: reservaId,
          tipo: pago.tipo,
          fecha: pago.fecha,
          valor: pago.valor,
          observacion: pago.observacion || null,
        });
      } catch (errDb) {
        console.warn('[registrarPago] Aviso Supabase:', errDb);
      }

      return { success: true };
    } catch (err: any) {
      console.error('[AppContext.registrarPago]', err);
      return { success: false, error: err.message };
    }
  };

  const eliminarPago = async (pagoId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setReservas(prev => {
        const up = prev.map(r => ({
          ...r,
          pagos: (r.pagos || []).filter(p => p.id !== pagoId),
        }));
        guardarCache('fc_cache_reservas', up);
        return up;
      });

      try {
        await supabase.from('pagos').delete().eq('id', pagoId);
      } catch { /* silent */ }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // ---------------------------------------------------------------------------
  // OPERACIONES DE CLIENTES Y COTIZACIONES
  // ---------------------------------------------------------------------------

  const guardarCliente = async (datos: Partial<Cliente>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const isNew = !datos.id;
      const cid = datos.id || generarUUID();

      const clienteObj: Cliente = {
        id: cid,
        nombre: datos.nombre || '',
        apellido: datos.apellido || null,
        telefono: datos.telefono || null,
        whatsapp: datos.whatsapp || null,
        correo: datos.correo || null,
        observaciones: datos.observaciones || null,
        activo: true,
      };

      setClientes(prev => {
        const up = isNew ? [clienteObj, ...prev] : prev.map(c => (c.id === cid ? { ...c, ...clienteObj } : c));
        guardarCache('fc_cache_clientes', up);
        return up;
      });

      try {
        const { error } = await supabase.from('clientes').upsert(clienteObj, { onConflict: 'id' });
        if (error) console.warn('[guardarCliente] Aviso Supabase:', error);
      } catch (errSup) {
        console.warn('[guardarCliente] Supabase error:', errSup);
      }

      return { success: true, id: cid };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const desactivarCliente = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setClientes(prev => {
        const up = prev.filter(c => c.id !== id);
        guardarCache('fc_cache_clientes', up);
        return up;
      });
      try {
        await supabase.from('clientes').update({ activo: false }).eq('id', id);
      } catch { /* silent */ }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const eliminarCliente = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Eliminar de la lista de clientes local y cache
      setClientes(prev => {
        const up = prev.filter(c => c.id !== id);
        guardarCache('fc_cache_clientes', up);
        return up;
      });

      // 2. Desvincular id en cotizaciones y reservas locales
      setCotizaciones(prev => {
        const up = prev.map(c => (c.cliente_id === id ? { ...c, cliente_id: null, clientes: undefined } : c));
        guardarCache('fc_cache_cotizaciones', up);
        return up;
      });

      setReservas(prev => {
        const up = prev.map(r => (r.cliente_id === id ? { ...r, cliente_id: '', clientes: undefined } : r));
        guardarCache('fc_cache_reservas', up);
        return up;
      });

      // 3. Eliminar físicamente en Supabase
      try {
        const { error } = await supabase.from('clientes').delete().eq('id', id);
        if (error) console.warn('[eliminarCliente] Aviso Supabase:', error);
      } catch (errDb) {
        console.warn('[eliminarCliente] Supabase error:', errDb);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const guardarCotizacion = async (datos: Partial<CotizacionDB>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const isNew = !datos.id;
      const cotId = datos.id || generarUUID();
      const consecutivo = datos.consecutivo || (isNew ? await obtenerSiguienteConsecutivo('cotizacion') : undefined);

      const fincaSel = fincas.find(f => f.id === datos.finca_id);
      const clienteSel = clientes.find(c => c.id === datos.cliente_id);

      const cotizacionObj: CotizacionDB = {
        id: cotId,
        cliente_id: datos.cliente_id || null,
        finca_id: datos.finca_id || '',
        fecha_inicio: datos.fecha_inicio || '',
        fecha_fin: datos.fecha_fin || '',
        personas: datos.personas || 1,
        alimentacion: datos.alimentacion || 'Sin alimentación',
        menu_id: datos.menu_id || null,
        cantidad_alimentacion: datos.cantidad_alimentacion ?? 1,
        precio_base_pp: datos.precio_base_pp || 0,
        subtotal_alojamiento: datos.subtotal_alojamiento || 0,
        costo_alimentacion: datos.costo_alimentacion || 0,
        descuento: datos.descuento || 0,
        recargo: datos.recargo || 0,
        total: datos.total || 0,
        consecutivo: consecutivo || datos.consecutivo,
        estado: datos.estado || 'borrador',
        notas: datos.notas || null,
        created_at: new Date().toISOString(),
        clientes: clienteSel ? {
          id: clienteSel.id,
          nombre: clienteSel.nombre,
          apellido: clienteSel.apellido,
          whatsapp: clienteSel.whatsapp,
        } : undefined,
        fincas: fincaSel ? {
          id: fincaSel.id,
          nombre: fincaSel.nombre,
        } : undefined,
      };

      setCotizaciones(prev => {
        const up = isNew ? [cotizacionObj, ...prev] : prev.map(c => (c.id === cotId ? { ...c, ...cotizacionObj } : c));
        guardarCache('fc_cache_cotizaciones', up);
        return up;
      });

      try {
        const { error } = await supabase.from('cotizaciones').upsert({
          id: cotId,
          cliente_id: datos.cliente_id || null,
          finca_id: datos.finca_id,
          fecha_inicio: datos.fecha_inicio,
          fecha_fin: datos.fecha_fin,
          personas: datos.personas || 1,
          alimentacion: datos.alimentacion || 'Sin alimentación',
          menu_id: datos.menu_id || null,
          cantidad_alimentacion: datos.cantidad_alimentacion ?? 1,
          precio_base_pp: datos.precio_base_pp || 0,
          subtotal_alojamiento: datos.subtotal_alojamiento || 0,
          costo_alimentacion: datos.costo_alimentacion || 0,
          descuento: datos.descuento || 0,
          recargo: datos.recargo || 0,
          total: datos.total || 0,
          consecutivo: cotizacionObj.consecutivo,
          estado: datos.estado || 'borrador',
          notas: datos.notas || null,
        }, { onConflict: 'id' });

        if (error) console.warn('[guardarCotizacion] Aviso Supabase:', error);
      } catch (errSup) {
        console.warn('[guardarCotizacion] Supabase error:', errSup);
      }

      return { success: true, id: cotId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const cambiarEstadoCotizacion = async (id: string, estado: CotizacionEstado): Promise<{ success: boolean; error?: string }> => {
    try {
      setCotizaciones(prev => {
        const up = prev.map(c => (c.id === id ? { ...c, estado } : c));
        guardarCache('fc_cache_cotizaciones', up);
        return up;
      });
      try {
        await supabase.from('cotizaciones').update({ estado }).eq('id', id);
      } catch { /* silent */ }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const eliminarCotizacion = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setCotizaciones(prev => {
        const up = prev.filter(c => c.id !== id);
        guardarCache('fc_cache_cotizaciones', up);
        return up;
      });
      try {
        const { error } = await supabase.from('cotizaciones').delete().eq('id', id);
        if (error) console.warn('[eliminarCotizacion] Aviso Supabase:', error);
      } catch (errDb) {
        console.warn('[eliminarCotizacion] Supabase error:', errDb);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // ---------------------------------------------------------------------------
  // OPERACIONES DE FINCAS Y DISPONIBILIDAD
  // ---------------------------------------------------------------------------

  const guardarFinca = async (
    fincaData: Partial<Finca>,
    imagenesUrls: string[],
    planesStr: string,
    amenidadesArr?: { nombre: string; icono?: string }[]
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      // 1. Preparar payload completo con campos extendidos
      const payloadExtendido: any = {
        nombre: fincaData.nombre,
        zona: fincaData.zona || 'Santa Elena, Valle',
        capacidad: fincaData.capacidad !== undefined ? fincaData.capacidad : 10,
        precio_pp: fincaData.precio_pp !== undefined ? fincaData.precio_pp : 0,
        descripcion: fincaData.descripcion || null,
        estado: fincaData.estado || 'disponible',
        whatsapp: fincaData.whatsapp || null,
        activo: fincaData.activo !== undefined ? fincaData.activo : true,
        // Campos profesionales extendidos
        habitaciones: fincaData.habitaciones !== undefined ? fincaData.habitaciones : 3,
        camas: fincaData.camas !== undefined ? fincaData.camas : 5,
        banos: fincaData.banos !== undefined ? fincaData.banos : 2,
        checkin_hora: fincaData.checkin_hora || '15:00',
        checkout_hora: fincaData.checkout_hora || '13:00',
        politica_mascotas: fincaData.politica_mascotas || 'permitido',
        valor_mascota: fincaData.valor_mascota !== undefined ? fincaData.valor_mascota : 0,
        politica_musica: fincaData.politica_musica || 'moderada',
        precio_finca_completa: fincaData.precio_finca_completa || 0,
        deposito_garantia: fincaData.deposito_garantia || 0,
        normas: fincaData.normas || null,
        indicaciones_llegada: fincaData.indicaciones_llegada || null,
      };
      if (fincaData.id) payloadExtendido.id = fincaData.id;

      let fincaId: string;

      // Intentar guardar con campos extendidos
      let res = await supabase.from('fincas').upsert(payloadExtendido).select('id').single();

      // Si falla por alguna columna no migrada en la base de datos remota, recurrir de forma segura a columnas base
      if (res.error && res.error.message?.includes('column')) {
        console.warn('[AppContext] Supabase reporta columna pendiente de migración. Guardando con columnas base:', res.error.message);
        const payloadBase: any = {
          nombre: fincaData.nombre,
          zona: fincaData.zona || 'Santa Elena, Valle',
          capacidad: fincaData.capacidad || 10,
          precio_pp: fincaData.precio_pp || 0,
          descripcion: fincaData.descripcion || null,
          estado: fincaData.estado || 'disponible',
          whatsapp: fincaData.whatsapp || null,
          activo: fincaData.activo !== undefined ? fincaData.activo : true,
        };
        if (fincaData.id) payloadBase.id = fincaData.id;
        const resBase = await supabase.from('fincas').upsert(payloadBase).select('id').single();
        if (resBase.error) throw resBase.error;
        fincaId = resBase.data.id;
      } else if (res.error) {
        throw res.error;
      } else {
        fincaId = res.data.id;
      }

      // Actualizar imágenes
      if (imagenesUrls && imagenesUrls.length > 0) {
        await supabase.from('finca_imagenes').delete().eq('finca_id', fincaId);
        const imgInserts = imagenesUrls.map((url, idx) => ({
          finca_id: fincaId,
          url,
          orden: idx,
          es_principal: idx === 0,
        }));
        await supabase.from('finca_imagenes').insert(imgInserts);
      }

      // Actualizar planes de alimentación
      if (planesStr !== undefined) {
        await supabase.from('finca_planes').delete().eq('finca_id', fincaId);
        const planes = planesStr.split(',').map(p => p.trim()).filter(Boolean);
        if (planes.length > 0) {
          await supabase.from('finca_planes').insert(planes.map(nombre => ({ finca_id: fincaId, nombre })));
        }
      }

      // Actualizar amenidades en tabla finca_amenidades
      if (amenidadesArr !== undefined) {
        try {
          await supabase.from('finca_amenidades').delete().eq('finca_id', fincaId);
          if (amenidadesArr.length > 0) {
            await supabase.from('finca_amenidades').insert(
              amenidadesArr.map(a => ({
                finca_id: fincaId,
                nombre: a.nombre,
                icono: a.icono || 'check',
              }))
            );
          }
        } catch (amenityErr) {
          console.warn('[AppContext] Error guardando amenidades:', amenityErr);
        }
      }

      await cargarFincas();
      return { success: true, id: fincaId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const desactivarFinca = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setFincas(prev => prev.filter(f => f.id !== id));
      const { error } = await supabase.from('fincas').update({ activo: false }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const reactivarFinca = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('fincas').update({ activo: true }).eq('id', id);
      if (error) throw error;
      await cargarFincas();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const eliminarFinca = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Limpieza en cascada en tablas dependientes
      await Promise.allSettled([
        supabase.from('finca_imagenes').delete().eq('finca_id', id),
        supabase.from('finca_planes').delete().eq('finca_id', id),
        supabase.from('finca_amenidades').delete().eq('finca_id', id),
        supabase.from('disponibilidad').delete().eq('finca_id', id),
      ]);

      // 2. Eliminar la finca de la base de datos
      const { error } = await supabase.from('fincas').delete().eq('id', id);
      if (error) throw error;

      // 3. Actualización de estado local optimista
      setFincas(prev => prev.filter(f => f.id !== id));

      await Promise.all([cargarFincas(), cargarDisponibilidad()]);
      return { success: true };
    } catch (err: any) {
      console.error('[AppContext] Error al eliminar finca:', err);
      return { success: false, error: err.message };
    }
  };

  const marcarDiasAdmin = async (
    fincaId: string,
    fechas: string[],
    estado: 'ocupado' | 'libre',
    nombreCliente?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (estado === 'libre') {
        for (const fecha of fechas) {
          await supabase
            .from('disponibilidad')
            .delete()
            .eq('finca_id', fincaId)
            .lte('fecha_inicio', fecha)
            .gte('fecha_fin', fecha);
        }
      } else {
        const registros = fechas.map(f => ({
          finca_id: fincaId,
          fecha_inicio: f,
          fecha_fin: f,
          estado: 'ocupado' as const,
          notas: nombreCliente || 'Bloqueado por administrador',
        }));
        await supabase.from('disponibilidad').insert(registros);
      }
      await cargarDisponibilidad();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const eliminarBloqueo = async (id: number | string): Promise<{ success: boolean; error?: string }> => {
    try {
      setBloquesAdmin(prev => prev.filter(b => b.id !== id));
      const { error } = await supabase.from('disponibilidad').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // ---------------------------------------------------------------------------
  // OPERACIONES DE MENÚS, COMUNICACIONES Y CONFIGURACIÓN
  // ---------------------------------------------------------------------------

  const guardarMenu = async (menuData: Partial<MenuType>, imagenesUrls: string[] = []): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      // Determinar la foto principal: si menuData.imagen_url está en la lista de imágenes, usarla.
      // Si no, tomar la primera de imagenesUrls; si no hay fotos, dejar null.
      const fotoPrincipal = imagenesUrls.length > 0
        ? (menuData.imagen_url && imagenesUrls.includes(menuData.imagen_url) ? menuData.imagen_url : imagenesUrls[0])
        : null;

      const payload: any = {
        nombre: menuData.nombre?.trim(),
        descripcion: menuData.descripcion?.trim() || null,
        categoria: menuData.categoria || 'Almuerzo',
        precio_pp: Number(menuData.precio_pp) || 0,
        condiciones: menuData.condiciones?.trim() || null,
        imagen_url: fotoPrincipal,
        activo: menuData.activo ?? true,
      };
      if (menuData.id) payload.id = menuData.id;

      const { data, error } = await supabase.from('menus').upsert(payload).select('id').single();
      if (error) throw error;

      const menuId = data.id;

      // Limpiar imágenes existentes en Supabase para evitar fotos huérfanas
      await supabase.from('menu_imagenes').delete().eq('menu_id', menuId);

      // Si hay fotos, insertarlas con orden y marcar la foto principal
      if (imagenesUrls && imagenesUrls.length > 0) {
        const imgInserts = imagenesUrls.map((url, idx) => ({
          menu_id: menuId,
          url,
          orden: idx,
          es_principal: url === fotoPrincipal || (idx === 0 && !fotoPrincipal),
        }));
        await supabase.from('menu_imagenes').insert(imgInserts);
      }

      await cargarMenus();
      return { success: true, id: menuId };
    } catch (err: any) {
      console.error('[AppContext] Error guardando menú:', err);
      return { success: false, error: err.message };
    }
  };

  const cambiarEstadoMenu = async (id: string, activo: boolean): Promise<{ success: boolean; error?: string }> => {
    try {
      setMenus(prev => {
        const updated = prev.map(m => (m.id === id ? { ...m, activo } : m));
        guardarCache('fc_cache_menus', updated);
        return updated;
      });
      const { error } = await supabase.from('menus').update({ activo }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const eliminarMenu = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setMenus(prev => {
        const updated = prev.filter(m => m.id !== id);
        guardarCache('fc_cache_menus', updated);
        return updated;
      });
      const { error } = await supabase.from('menus').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const registrarComunicacion = async (com: any): Promise<any> => {
    try {
      const obj = {
        id: `com-${Date.now()}`,
        ...com,
        created_at: new Date().toISOString(),
      };
      setComunicaciones(prev => [obj, ...prev]);
      await supabase.from('comunicaciones').insert(com);
      return { success: true };
    } catch (err) {
      console.warn('[AppContext] Aviso registrando comunicacion:', err);
      return { success: false };
    }
  };

  const limpiarHistorialComunicaciones = () => {
    setComunicaciones([]);
  };

  const guardarConfiguracion = async (datos: Partial<ConfiguracionGeneral>): Promise<{ success: boolean; error?: string }> => {
    setGuardandoConfig(true);
    try {
      const actualizado = { ...configuracion, ...datos };
      setConfiguracion(actualizado);
      setConfiguracionGlobal(actualizado);

      const { error } = await supabase
        .from('configuracion_general')
        .upsert({ id: 'general', ...datos }, { onConflict: 'id' });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setGuardandoConfig(false);
    }
  };

  const restablecerConfiguracion = async (): Promise<{ success: boolean; error?: string }> => {
    return guardarConfiguracion(CONFIGURACION_DEFAULT);
  };

  const guardarContenido = async (datos: Partial<ContenidoSitio>): Promise<{ success: boolean; error?: string }> => {
    setGuardandoContenido(true);
    try {
      const actualizado = { ...contenidoSitio, ...datos };
      setContenidoSitio(actualizado);
      setContenidoSitioGlobal(actualizado);

      const { error } = await supabase
        .from('contenido_sitio')
        .upsert({ id: 'principal', ...datos }, { onConflict: 'id' });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setGuardandoContenido(false);
    }
  };

  const restablecerContenido = async (): Promise<{ success: boolean; error?: string }> => {
    return guardarContenido(CONTENIDO_SITIO_DEFAULT);
  };

  // ---------------------------------------------------------------------------
  // MÉTRICAS REACTIVAS
  // ---------------------------------------------------------------------------

  const todasLasFincas = fincas;
  const fincasActivas = useMemo(() => fincas.filter(f => f.activo), [fincas]);

  const metricasFincas = useMemo(() => {
    const total = fincasActivas.length;
    const ocupadas = fincasActivas.filter(f => f.estado === 'no_disponible').length;
    const disponibles = total - ocupadas;
    const porcentajeOcupacion = total > 0 ? Math.round((ocupadas / total) * 100) : 0;
    return { total, disponibles, ocupadas, porcentajeOcupacion };
  }, [fincasActivas]);

  const metricasReservas = useMemo(() => {
    const hoyStr = new Date().toISOString().split('T')[0];
    const activas = reservas.filter(r => r.estado === 'activa');
    const cerradas = reservas.filter(r => r.estado === 'completada' || r.estado === 'cancelada' || r.estado === 'no_show');
    const llegasHoy = activas.filter(r => r.fecha_inicio === hoyStr).length;
    const salenHoy = activas.filter(r => r.fecha_fin === hoyStr).length;
    return {
      total: reservas.length,
      activas: activas.length,
      cerradas: cerradas.length,
      llegasHoy,
      salenHoy,
    };
  }, [reservas]);

  const value = useMemo<AppContextValue>(() => ({
    fincas: fincasActivas,
    todasLasFincas,
    bloquesAdmin,
    clientes,
    cotizaciones,
    reservas,
    menus,
    comunicaciones,
    configuracion,
    contenidoSitio,
    loading,

    // Navegación centralizada e interacción cruzada Admin <-> Cliente
    view,
    selectedFincaId,
    adminActiveSection,
    fincaParaEditarId,
    setView,
    setSelectedFincaId,
    setAdminActiveSection,
    setFincaParaEditarId,
    navegarACliente,
    navegarAAdmin,
    previsualizarFinca,

    // Notificaciones Toast y Confirmaciones Globales
    toasts,
    showToast,
    dismissToast,
    confirmModalState,
    openConfirm,
    closeConfirm,

    metricasFincas,
    metricasReservas,
    recargarTodo,
    guardarCotizacionPublica,
    guardarFinca,
    desactivarFinca,
    reactivarFinca,
    eliminarFinca,
    marcarDiasAdmin,
    eliminarBloqueo,
    guardarCliente,
    desactivarCliente,
    eliminarCliente,
    guardarCotizacion,
    cambiarEstadoCotizacion,
    eliminarCotizacion,
    convertirCotizacionAReserva,
    guardarReserva,
    cambiarEstadoReserva,
    cerrarReserva,
    reabrirReserva,
    eliminarReserva,
    registrarPago,
    eliminarPago,
    guardarMenu,
    cambiarEstadoMenu,
    eliminarMenu,
    registrarComunicacion,
    limpiarHistorialComunicaciones,
    guardandoConfig,
    guardarConfiguracion,
    restablecerConfiguracion,
    guardandoContenido,
    guardarContenido,
    restablecerContenido,
  }), [
    fincasActivas,
    todasLasFincas,
    bloquesAdmin,
    clientes,
    cotizaciones,
    reservas,
    menus,
    comunicaciones,
    configuracion,
    contenidoSitio,
    loading,
    view,
    selectedFincaId,
    adminActiveSection,
    fincaParaEditarId,
    navegarACliente,
    navegarAAdmin,
    previsualizarFinca,
    toasts,
    showToast,
    dismissToast,
    confirmModalState,
    openConfirm,
    closeConfirm,
    metricasFincas,
    metricasReservas,
    recargarTodo,
    guardandoConfig,
    guardandoContenido,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// -----------------------------------------------------------------------------
// Hook consumidor centralizado
// -----------------------------------------------------------------------------

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
}
