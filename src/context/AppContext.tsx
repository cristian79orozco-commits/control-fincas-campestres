import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, DEFAULT_WA_NUMBER } from '../services/supabase';
import type {
  Finca, Cliente, CotizacionDB, Reserva, Pago, PagoTipo,
  ReservaEstado, CotizacionEstado, BloqueoDisponibilidad,
  Menu as MenuType, Comunicacion, ConfiguracionGeneral,
  ContenidoSitio, CierreReserva
} from '../types';
import { calcularSaldo } from '../types';
import { obtenerSiguienteConsecutivo } from '../utils/consecutivos';
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
  guardarFinca: (fincaData: Partial<Finca>, imagenesUrls: string[], planesStr: string) => Promise<{ success: boolean; id?: string; error?: string }>;
  desactivarFinca: (id: string) => Promise<{ success: boolean; error?: string }>;
  reactivarFinca: (id: string) => Promise<{ success: boolean; error?: string }>;
  marcarDiasAdmin: (fincaId: string, fechas: string[], estado: 'ocupado' | 'libre', nombreCliente?: string) => Promise<{ success: boolean; error?: string }>;
  eliminarBloqueo: (id: number | string) => Promise<{ success: boolean; error?: string }>;

  // Operaciones de Clientes
  guardarCliente: (datos: Partial<Cliente>) => Promise<{ success: boolean; id?: string; error?: string }>;
  desactivarCliente: (id: string) => Promise<{ success: boolean; error?: string }>;

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

const AppContext = createContext<AppContextValue | null>(null);

// -----------------------------------------------------------------------------
// Proveedor Centralizado (AppProvider)
// -----------------------------------------------------------------------------

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Estado local centralizado
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [bloquesAdmin, setBloquesAdmin] = useState<BloqueoDisponibilidad[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cotizaciones, setCotizaciones] = useState<CotizacionDB[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [menus, setMenus] = useState<MenuType[]>([]);
  const [comunicaciones, setComunicaciones] = useState<Comunicacion[]>([]);
  const [configuracion, setConfiguracion] = useState<ConfiguracionGeneral>(CONFIGURACION_DEFAULT);
  const [contenidoSitio, setContenidoSitio] = useState<ContenidoSitio>(CONTENIDO_SITIO_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [guardandoContenido, setGuardandoContenido] = useState(false);

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
      setFincas((data as Finca[]) || []);
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
      setBloquesAdmin((data as unknown as BloqueoDisponibilidad[]) || []);
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
      setClientes((data as Cliente[]) || []);
    } catch (err) {
      console.warn('[AppContext] Error cargando clientes:', err);
    }
  }, []);

  const cargarCotizaciones = useCallback(async () => {
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
      setCotizaciones((data as unknown as CotizacionDB[]) || []);
    } catch (err) {
      console.warn('[AppContext] Error cargando cotizaciones:', err);
    }
  }, []);

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

      setReservas(procesadas);
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
      setMenus((data as MenuType[]) || []);
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

  // Carga inicial y Suscripción Realtime multi-tabla
  useEffect(() => {
    recargarTodo();

    // Sincronización en tiempo real con Supabase
    const channel = supabase
      .channel('app-global-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cotizaciones' }, () => {
        cargarCotizaciones();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, () => {
        cargarReservas();
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracion_general' }, () => {
        cargarConfiguracion();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contenido_sitio' }, () => {
        cargarContenidoSitio();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    recargarTodo,
    cargarCotizaciones,
    cargarReservas,
    cargarClientes,
    cargarDisponibilidad,
    cargarMenus,
    cargarConfiguracion,
    cargarContenidoSitio,
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

      const { data: existentes } = await supabase
        .from('clientes')
        .select('id, nombre, apellido, telefono, whatsapp')
        .or(`telefono.eq.${digitosTel},whatsapp.eq.${digitosTel},telefono.eq.${digitosTel10},whatsapp.eq.${digitosTel10},telefono.eq.${digitosTel57},whatsapp.eq.${digitosTel57}`)
        .limit(1);

      let clienteId: string;
      let clienteObj: Cliente;

      if (existentes && existentes.length > 0) {
        clienteId = existentes[0].id;
        clienteObj = {
          ...existentes[0],
          nombre: datos.clienteNombre.trim(),
          whatsapp: datos.clienteWhatsapp.replace(/\D/g, '') || digitosTel57,
          activo: true,
        };

        // Actualizar en memoria y BD
        setClientes(prev => prev.map(c => (c.id === clienteId ? clienteObj : c)));
        try {
          await supabase.from('clientes').update({
            nombre: datos.clienteNombre.trim(),
            whatsapp: clienteObj.whatsapp,
          }).eq('id', clienteId);
        } catch { /* silent */ }
      } else {
        const nuevoClienteId = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `cli-${Date.now()}`;

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

        // Actualización optimista inmediata
        setClientes(prev => [clienteObj, ...prev]);

        try {
          await supabase.from('clientes').insert(clienteObj);
        } catch (errInsCli) {
          console.warn('[AppContext] Aviso insertando cliente:', errInsCli);
        }
      }

      // 2. Consecutivo estricto iniciando en 1001
      const consecutivo = await obtenerSiguienteConsecutivo('cotizacion');

      // 3. Crear cotización con ID propio
      const newCotId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `cot-${Date.now()}`;

      const fincaSel = fincas.find(f => f.id === datos.fincaId);

      const nuevaCotizacion: CotizacionDB = {
        id: newCotId,
        cliente_id: clienteId,
        finca_id: datos.fincaId,
        fecha_inicio: datos.fechaInicio,
        fecha_fin: datos.fechaFin,
        personas: datos.personas,
        alimentacion: datos.alimentacion,
        menu_id: datos.menuId || null,
        cantidad_alimentacion: datos.cantidadServicios,
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

      // Persistir en Supabase
      const payloadBD: any = {
        id: newCotId,
        cliente_id: clienteId,
        finca_id: datos.fincaId,
        fecha_inicio: datos.fechaInicio,
        fecha_fin: datos.fechaFin,
        personas: datos.personas,
        alimentacion: datos.alimentacion,
        precio_base_pp: datos.precioBasePp,
        subtotal_alojamiento: datos.subtotalAlojamiento,
        costo_alimentacion: datos.costoAlimentacion,
        cantidad_alimentacion: datos.cantidadServicios,
        descuento: 0,
        recargo: 0,
        total: datos.total,
        consecutivo: consecutivo,
        estado: 'cotizada',
        notas: nuevaCotizacion.notas,
      };
      if (datos.menuId) payloadBD.menu_id = datos.menuId;

      const { error: errorCot } = await supabase.from('cotizaciones').insert(payloadBD);
      if (errorCot) {
        console.warn('[AppContext] Aviso insertando cotización en Supabase:', errorCot);
      }

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

      // 2. Generar consecutivo para la reserva (preservando número si es posible)
      let consecutivoReserva: string;
      if (cotizacion.consecutivo) {
        consecutivoReserva = cotizacion.consecutivo.replace(/^COT-/, 'RES-');
      } else {
        consecutivoReserva = await obtenerSiguienteConsecutivo('reserva');
      }

      const newResId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `res-${Date.now()}`;

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

      // Actualización optimista de reserva
      setReservas(prev => [nuevaReserva, ...prev]);

      // Bloquear calendario en memoria
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
      setBloquesAdmin(prev => [...prev, nuevoBloqueo]);

      // Persistir en Supabase
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
      const resId = datos.id || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `res-${Date.now()}`);
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

      // Actualización optimista
      setReservas(prev => {
        if (isNew) return [payloadReserva, ...prev];
        return prev.map(r => (r.id === resId ? { ...r, ...payloadReserva } : r));
      });

      // Persistir
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

      const { error } = await supabase.from('reservas').upsert(dbPayload, { onConflict: 'id' });
      if (error) throw error;

      if (isNew && datos.separacion && datos.separacion > 0) {
        await supabase.from('pagos').insert({
          reserva_id: resId,
          tipo: 'separacion',
          fecha: new Date().toISOString().split('T')[0],
          valor: datos.separacion,
          observacion: 'Separación registrada al crear reserva',
        });
      }

      if (isNew && datos.finca_id && datos.fecha_inicio && datos.fecha_fin) {
        await supabase.from('disponibilidad').insert({
          finca_id: datos.finca_id,
          fecha_inicio: datos.fecha_inicio,
          fecha_fin: datos.fecha_fin,
          estado: 'ocupado',
          personas: datos.personas || 1,
          notas: `Reserva ${payloadReserva.consecutivo || resId}`,
        });
        cargarDisponibilidad();
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
      setReservas(prev => prev.filter(r => r.id !== id));
      const { error } = await supabase.from('reservas').delete().eq('id', id);
      if (error) throw error;
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
      const nuevoPagoId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `pago-${Date.now()}`;
      const objPago: Pago = {
        id: nuevoPagoId,
        reserva_id: reservaId,
        tipo: pago.tipo,
        fecha: pago.fecha,
        valor: pago.valor,
        observacion: pago.observacion || null,
      };

      // Actualización optimista de pagos: ¡El saldo se recalcula al milisegundo!
      setReservas(prev =>
        prev.map(r => {
          if (r.id === reservaId) {
            return {
              ...r,
              pagos: [...(r.pagos || []), objPago],
            };
          }
          return r;
        })
      );

      const { error } = await supabase.from('pagos').insert({
        id: nuevoPagoId,
        reserva_id: reservaId,
        tipo: pago.tipo,
        fecha: pago.fecha,
        valor: pago.valor,
        observacion: pago.observacion || null,
      });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error('[AppContext.registrarPago]', err);
      return { success: false, error: err.message };
    }
  };

  const eliminarPago = async (pagoId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setReservas(prev =>
        prev.map(r => ({
          ...r,
          pagos: (r.pagos || []).filter(p => p.id !== pagoId),
        }))
      );
      const { error } = await supabase.from('pagos').delete().eq('id', pagoId);
      if (error) throw error;
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
      const cid = datos.id || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `cli-${Date.now()}`);

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
        if (isNew) return [clienteObj, ...prev];
        return prev.map(c => (c.id === cid ? { ...c, ...clienteObj } : c));
      });

      const { error } = await supabase.from('clientes').upsert(clienteObj, { onConflict: 'id' });
      if (error) throw error;
      return { success: true, id: cid };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const desactivarCliente = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setClientes(prev => prev.filter(c => c.id !== id));
      const { error } = await supabase.from('clientes').update({ activo: false }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const guardarCotizacion = async (datos: Partial<CotizacionDB>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const isNew = !datos.id;
      const cotId = datos.id || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `cot-${Date.now()}`);
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
        if (isNew) return [cotizacionObj, ...prev];
        return prev.map(c => (c.id === cotId ? { ...c, ...cotizacionObj } : c));
      });

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

      if (error) throw error;
      return { success: true, id: cotId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const cambiarEstadoCotizacion = async (id: string, estado: CotizacionEstado): Promise<{ success: boolean; error?: string }> => {
    try {
      setCotizaciones(prev => prev.map(c => (c.id === id ? { ...c, estado } : c)));
      const { error } = await supabase.from('cotizaciones').update({ estado }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const eliminarCotizacion = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setCotizaciones(prev => prev.filter(c => c.id !== id));
      const { error } = await supabase.from('cotizaciones').delete().eq('id', id);
      if (error) throw error;
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
    planesStr: string
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const payload: any = {
        nombre: fincaData.nombre,
        zona: fincaData.zona || 'Santa Elena, Valle',
        capacidad: fincaData.capacidad || 10,
        precio_pp: fincaData.precio_pp || 0,
        descripcion: fincaData.descripcion || null,
        estado: fincaData.estado || 'disponible',
        whatsapp: fincaData.whatsapp || null,
        activo: true,
      };
      if (fincaData.id) payload.id = fincaData.id;

      const { data, error } = await supabase.from('fincas').upsert(payload).select('id').single();
      if (error) throw error;

      const fincaId = data.id;

      // Actualizar imágenes y planes
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

      if (planesStr !== undefined) {
        await supabase.from('finca_planes').delete().eq('finca_id', fincaId);
        const planes = planesStr.split(',').map(p => p.trim()).filter(Boolean);
        if (planes.length > 0) {
          await supabase.from('finca_planes').insert(planes.map(nombre => ({ finca_id: fincaId, nombre })));
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
      const payload: any = {
        nombre: menuData.nombre,
        descripcion: menuData.descripcion || null,
        categoria: menuData.categoria || 'Almuerzo',
        precio_pp: menuData.precio_pp || 0,
        condiciones: menuData.condiciones || null,
        imagen_url: menuData.imagen_url || null,
        activo: menuData.activo ?? true,
      };
      if (menuData.id) payload.id = menuData.id;

      const { data, error } = await supabase.from('menus').upsert(payload).select('id').single();
      if (error) throw error;

      const menuId = data.id;
      if (imagenesUrls && imagenesUrls.length > 0) {
        await supabase.from('menu_imagenes').delete().eq('menu_id', menuId);
        const imgInserts = imagenesUrls.map((url, idx) => ({
          menu_id: menuId,
          url,
          orden: idx,
          es_principal: idx === 0,
        }));
        await supabase.from('menu_imagenes').insert(imgInserts);
      }

      await cargarMenus();
      return { success: true, id: menuId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const cambiarEstadoMenu = async (id: string, activo: boolean): Promise<{ success: boolean; error?: string }> => {
    try {
      setMenus(prev => prev.map(m => (m.id === id ? { ...m, activo } : m)));
      const { error } = await supabase.from('menus').update({ activo }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const eliminarMenu = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setMenus(prev => prev.filter(m => m.id !== id));
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
    metricasFincas,
    metricasReservas,
    recargarTodo,
    guardarCotizacionPublica,
    guardarFinca,
    desactivarFinca,
    reactivarFinca,
    marcarDiasAdmin,
    eliminarBloqueo,
    guardarCliente,
    desactivarCliente,
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
