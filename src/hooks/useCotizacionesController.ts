import { useState, useMemo, useEffect, useCallback } from 'react';
import type { CotizacionDB, CotizacionEstado, Cliente, Finca, Menu, ConfiguracionGeneral } from '../types';
import { calcularCotizacion } from '../utils/calcularCotizacion';
import { useApp } from '../context/AppContext';
import { getConfiguracionGlobal } from '../services/configuracion';
import {
  plantillaCotizacion,
  plantillaPedirAbonoCotizacion,
  plantillaCobroAlimentacion,
} from '../services/whatsapp';
import { generarDocCotizacion, generarPropuestaAlimentacion } from '../services/documentos';

export interface UseCotizacionesControllerParams {
  cotizaciones: CotizacionDB[];
  clientes: Cliente[];
  fincas: Finca[];
  menus?: Menu[];
  configuracion?: ConfiguracionGeneral;
  onGuardar: (datos: Partial<CotizacionDB>) => Promise<{ success: boolean; id?: string; error?: string }>;
  onCambiarEstado: (id: string, estado: CotizacionEstado) => Promise<{ success: boolean; error?: string }>;
  onEliminar: (id: string) => Promise<{ success: boolean; error?: string }>;
  onConvertirReserva?: (cotizacion: CotizacionDB) => void;
  onRegistrarComunicacion?: (com: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export type FiltroCotizTab = 'pendientes' | 'confirmadas' | 'canceladas' | 'todas';

export const VACIO_COTIZACION: Partial<CotizacionDB> = {
  cliente_id: '',
  finca_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  personas: 1,
  menu_id: null,
  cantidad_alimentacion: 1,
  alimentacion: 'Sin alimentación',
  precio_base_pp: 0,
  subtotal_alojamiento: 0,
  costo_alimentacion: 0,
  descuento: 0,
  recargo: 0,
  total: 0,
  estado: 'cotizada',
  notas: '',
};

export function noches(fi: string, ff: string): number {
  if (!fi || !ff) return 1;
  const d = new Date(ff + 'T00:00:00').getTime() - new Date(fi + 'T00:00:00').getTime();
  return Math.max(1, Math.round(d / 86400000));
}

export function formatCOP(v: number) {
  return '$' + (v || 0).toLocaleString('es-CO') + ' COP';
}

export function formatFecha(f?: string) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Controller Hook desacoplado para AdminCotizaciones.
 * Implementa actualizaciones optimistas instantáneas (<16ms) con rollback seguro.
 */
export function useCotizacionesController({
  cotizaciones = [],
  clientes,
  fincas,
  menus = [],
  configuracion: configProp,
  onGuardar,
  onCambiarEstado,
  onEliminar,
  onConvertirReserva,
  onRegistrarComunicacion,
  showToast,
  openConfirm,
}: UseCotizacionesControllerParams) {
  const {
    previsualizarFinca,
    configuracion: configApp,
    convertirCotizacionAReserva,
    navegarAAdmin,
    abrirComunicacionesConExpediente
  } = useApp();

  const configuracion = configProp || configApp;

  // Estado local reactivo optimista (< 16ms)
  const [cotizacionesState, setCotizacionesState] = useState<CotizacionDB[]>(() => cotizaciones || []);

  useEffect(() => {
    setCotizacionesState(cotizaciones || []);
  }, [cotizaciones]);

  const [form, setForm] = useState<Partial<CotizacionDB>>(VACIO_COTIZACION);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [tabActiva, setTabActiva] = useState<FiltroCotizTab>('pendientes');
  const [modoAlimentacionPersonalizada, setModoAlimentacionPersonalizada] = useState(false);

  // Modal para confirmar paso a reserva
  const [modalConfirmarReserva, setModalConfirmarReserva] = useState<{
    abierto: boolean;
    cotizacion: CotizacionDB | null;
    anticipoFinca: number;
    abonoAlimentacion: number;
    alimentacionPagadaTotal: boolean;
    metodoPagoAlimentacion: string;
    guardando: boolean;
  }>({
    abierto: false,
    cotizacion: null,
    anticipoFinca: 0,
    abonoAlimentacion: 0,
    alimentacionPagadaTotal: false,
    metodoPagoAlimentacion: 'Transferencia Bancolombia / Nequi',
    guardando: false,
  });

  // Modal para WhatsApp
  const [modalWaCotiz, setModalWaCotiz] = useState<{
    abierto: boolean;
    cotizacion?: CotizacionDB;
    titulo: string;
    nombreDoc?: string;
    mensaje: string;
    onGenerarPdf?: () => void;
    tipo: 'cotizacion' | 'menu';
  }>({
    abierto: false,
    titulo: '',
    mensaje: '',
    tipo: 'cotizacion',
  });

  const abrirNuevo = useCallback(() => {
    setForm(VACIO_COTIZACION);
    setModoAlimentacionPersonalizada(false);
    setEditando(true);
  }, []);

  const abrirEdicion = useCallback((c: CotizacionDB) => {
    setForm({ ...c });
    setModoAlimentacionPersonalizada(!c.menu_id && !!c.alimentacion && c.alimentacion !== 'Sin alimentación');
    setEditando(true);
  }, []);

  const cerrar = useCallback(() => {
    setForm(VACIO_COTIZACION);
    setEditando(false);
  }, []);

  // Recálculo inteligente con la utilidad centralizada
  const recalcular = useCallback((f: Partial<CotizacionDB>): Partial<CotizacionDB> => {
    const n = noches(f.fecha_inicio || '', f.fecha_fin || '');
    let menuPrecioPp = 0;
    if (f.menu_id && !modoAlimentacionPersonalizada) {
      const m = menus.find(x => x.id === f.menu_id);
      if (m) {
        menuPrecioPp = m.precio_pp || 0;
      }
    }

    const { subtotalAlojamiento, costoAlimentacion, total } = calcularCotizacion({
      noches: n,
      personas: f.personas || 1,
      precioPp: f.precio_base_pp || 0,
      menuPrecioPp,
      cantidadServicios: f.cantidad_alimentacion || n,
      descuento: f.descuento || 0,
      recargo: f.recargo || 0,
    });

    return {
      ...f,
      noches: n,
      subtotal_alojamiento: subtotalAlojamiento,
      costo_alimentacion: costoAlimentacion,
      total,
    };
  }, [menus, modoAlimentacionPersonalizada]);

  const updateField = useCallback((campo: keyof CotizacionDB, valor: any) => {
    setForm(prev => recalcular({ ...prev, [campo]: valor }));
  }, [recalcular]);

  const handleMenuSelect = useCallback((menuId: string) => {
    if (menuId === 'custom') {
      setModoAlimentacionPersonalizada(true);
      setForm(prev => ({ ...prev, menu_id: null, alimentacion: '' }));
      return;
    }
    setModoAlimentacionPersonalizada(false);
    if (!menuId) {
      setForm(prev => recalcular({
        ...prev,
        menu_id: null,
        alimentacion: 'Sin alimentación',
        costo_alimentacion: 0,
      }));
      return;
    }
    const m = menus.find(x => x.id === menuId);
    if (!m) return;
    const n = noches(form.fecha_inicio || '', form.fecha_fin || '');
    const cant = form.cantidad_alimentacion || n;
    const costo = (m.precio_pp || 0) * (form.personas || 1) * cant;
    setForm(prev => recalcular({
      ...prev,
      menu_id: m.id,
      alimentacion: `${m.categoria}: ${m.nombre}`,
      cantidad_alimentacion: cant,
      costo_alimentacion: costo,
    }));
  }, [menus, form.fecha_inicio, form.fecha_fin, form.cantidad_alimentacion, form.personas, recalcular]);

  const handleFincaChange = useCallback((fincaId: string) => {
    const finca = fincas.find(f => f.id === fincaId);
    const minPers = finca?.capacidad_minima || 1;
    setForm(prev => recalcular({
      ...prev,
      finca_id: fincaId,
      precio_base_pp: finca?.precio_pp || 0,
      personas: Math.max(minPers, prev.personas || 1),
    }));
  }, [fincas, recalcular]);

  const handleDescargarPdfAlimentacion = useCallback(async (c: CotizacionDB) => {
    const cantPersonas = c.personas || 4;
    const cantServ = c.cantidad_alimentacion || c.noches || 1;
    const m = (c.menu_id && menus.find(x => x.id === c.menu_id)) || (c.alimentacion && c.alimentacion !== 'Sin alimentación' ? {
      id: 'custom',
      nombre: c.alimentacion,
      categoria: 'Almuerzo' as const,
      precio_pp: (c.costo_alimentacion || 0) / Math.max(1, cantPersonas * cantServ),
      activo: true,
    } : null);

    if (!m) return;
    const f = fincas.find(x => x.id === c.finca_id);
    const cl = clientes.find(x => x.id === c.cliente_id);

    try {
      await generarPropuestaAlimentacion({
        menu: m,
        cliente: cl,
        finca: f,
        personas: cantPersonas,
        cantidadServicios: cantServ,
        consecutivo: c.consecutivo,
        tituloDocumento: 'PROPUESTA DE ALIMENTACIÓN',
        config: configuracion,
      });
      showToast('Propuesta de alimentación descargada en PDF ✅', 'success');
    } catch {
      showToast('Error generando PDF de alimentación', 'error');
    }
  }, [menus, fincas, clientes, configuracion, showToast]);

  const handleAbrirPedirAbono = useCallback((c: CotizacionDB) => {
    const f = fincas.find(x => x.id === c.finca_id) || (c.fincas as any);
    const bancosInfo = f?.banco_cuenta ? {
      banco: f.banco_nombre || 'Bancolombia',
      tipoCuenta: f.banco_tipo_cuenta || 'Ahorros',
      cuenta: f.banco_cuenta,
      titular: f.banco_titular || 'Propietario de la Finca',
      nit: f.banco_identificacion || undefined,
    } : null;

    setModalWaCotiz({
      abierto: true,
      cotizacion: c,
      titulo: `Solicitud de Separación (50% Finca) · ${f?.nombre || c.fincas?.nombre || 'Finca'}`,
      mensaje: plantillaPedirAbonoCotizacion(c, f, c.clientes, bancosInfo, 50),
      nombreDoc: 'Cotización Oficial y Separación (PDF)',
      onGenerarPdf: () => generarDocCotizacion(c, configuracion || getConfiguracionGlobal(), f),
      tipo: 'cotizacion',
    });
  }, [fincas, configuracion]);

  const handleAbrirCobroAlimentacion = useCallback((c: CotizacionDB) => {
    const cfg = configuracion || getConfiguracionGlobal();
    const iden = (cfg as any)?.banco_identificacion ? (cfg as any).banco_identificacion.trim() : undefined;
    const bancosAdmin = cfg?.banco_cuenta ? {
      banco: cfg.banco_nombre || 'Bancolombia',
      tipoCuenta: cfg.banco_tipo_cuenta || 'Ahorros',
      cuenta: cfg.banco_cuenta,
      titular: cfg.banco_titular || 'Administración Paraíso Terrenal',
      nit: iden || undefined,
    } : null;

    setModalWaCotiz({
      abierto: true,
      cotizacion: c,
      titulo: `Cobro de Alimentación (Paraíso Terrenal) · ${c.fincas?.nombre || 'Finca'}`,
      mensaje: plantillaCobroAlimentacion(c, c.fincas, c.clientes, bancosAdmin),
      nombreDoc: 'Detalle de Alimentación (PDF)',
      onGenerarPdf: () => handleDescargarPdfAlimentacion(c),
      tipo: 'menu',
    });
  }, [configuracion, handleDescargarPdfAlimentacion]);

  const handleIniciarPasoAReserva = useCallback((c: CotizacionDB) => {
    const valorAlojamiento = (c.subtotal_alojamiento && c.subtotal_alojamiento > 0)
      ? c.subtotal_alojamiento
      : Math.max(0, (c.total || 0) - (c.costo_alimentacion || 0));
    const anticipoSugerido = Math.round(valorAlojamiento * 0.5);

    setModalConfirmarReserva({
      abierto: true,
      cotizacion: c,
      anticipoFinca: anticipoSugerido,
      abonoAlimentacion: 0,
      alimentacionPagadaTotal: false,
      metodoPagoAlimentacion: 'Transferencia Bancolombia / Nequi',
      guardando: false,
    });
  }, []);

  const handleConfirmarPasoAReserva = useCallback(async () => {
    if (!modalConfirmarReserva.cotizacion) return;
    setModalConfirmarReserva(prev => ({ ...prev, guardando: true }));
    const c = modalConfirmarReserva.cotizacion;
    const anticipoFinca = modalConfirmarReserva.anticipoFinca;
    const abonoAlimentacion = modalConfirmarReserva.abonoAlimentacion;
    const alimentacionPagadaTotal = modalConfirmarReserva.alimentacionPagadaTotal;
    const metodo = modalConfirmarReserva.metodoPagoAlimentacion;

    try {
      const res = await convertirCotizacionAReserva(c, anticipoFinca, {
        abonoAlimentacion,
        pagadaTotal: alimentacionPagadaTotal,
        metodo,
      });
      setModalConfirmarReserva({
        abierto: false,
        cotizacion: null,
        anticipoFinca: 0,
        abonoAlimentacion: 0,
        alimentacionPagadaTotal: false,
        metodoPagoAlimentacion: 'Transferencia Bancolombia / Nequi',
        guardando: false,
      });
      if (res.success) {
        showToast(`✓ ¡Cotización #${c.consecutivo || ''} convertida en Reserva Activa con éxito!`, 'success');
        if (onConvertirReserva) {
          onConvertirReserva(c);
        }
      } else {
        showToast(`Error al convertir: ${res.error}`, 'error');
      }
    } catch (err: any) {
      setModalConfirmarReserva(prev => ({ ...prev, guardando: false }));
      showToast(`Error: ${err.message || 'No se pudo crear la reserva'}`, 'error');
    }
  }, [modalConfirmarReserva, convertirCotizacionAReserva, showToast, onConvertirReserva]);

  // ACTUALIZACIÓN OPTIMISTA: Cambiar estado con Rollback (<16ms)
  const handleCambiarEstadoOptimista = useCallback(async (id: string, nuevoEstado: CotizacionEstado) => {
    const prevCotizaciones = [...cotizacionesState];
    // 1. Reflejo inmediato en UI (< 16ms)
    setCotizacionesState(prev => prev.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c));

    try {
      const res = await onCambiarEstado(id, nuevoEstado);
      if (res.success) {
        showToast(`Estado actualizado a: ${nuevoEstado} ✅`, 'success');
      } else {
        // Rollback
        setCotizacionesState(prevCotizaciones);
        showToast(`Error: ${res.error}`, 'error');
      }
    } catch {
      // Rollback por red
      setCotizacionesState(prevCotizaciones);
      showToast('Error de conexión al actualizar estado', 'error');
    }
  }, [cotizacionesState, onCambiarEstado, showToast]);

  const handleCancelarCotizacion = useCallback((c: CotizacionDB) => {
    openConfirm(
      '¿Cancelar cotización?',
      `¿Deseas marcar la cotización #${c.consecutivo || ''} como cancelada por falta de pago? Se conservará en el historial de canceladas.`,
      async () => {
        await handleCambiarEstadoOptimista(c.id, 'cancelada');
      }
    );
  }, [openConfirm, handleCambiarEstadoOptimista]);

  const handleEliminarDefinitivo = useCallback((c: CotizacionDB) => {
    openConfirm(
      '¿Eliminar definitivamente?',
      'Esta acción eliminará de forma permanente el registro del historial.',
      async () => {
        const res = await onEliminar(c.id);
        if (res.success) showToast('Cotización eliminada del historial', 'info');
        else showToast(`Error: ${res.error}`, 'error');
      }
    );
  }, [openConfirm, onEliminar, showToast]);

  const handleGuardar = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.finca_id) { showToast('Selecciona una finca', 'error'); return; }
    if (!form.fecha_inicio || !form.fecha_fin) { showToast('Las fechas son obligatorias', 'error'); return; }
    setGuardando(true);
    const res = await onGuardar(form);
    setGuardando(false);
    if (res.success) {
      showToast(form.id ? 'Cotización actualizada ✅' : 'Cotización creada ✅', 'success');
      cerrar();
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  }, [form, onGuardar, showToast, cerrar]);

  // Filtrado y conteos memoizados
  const conteoPendientes = useMemo(() =>
    cotizacionesState.filter(c => ['borrador', 'cotizada', 'pendiente'].includes(c.estado)).length,
    [cotizacionesState]
  );

  const conteoConfirmadas = useMemo(() =>
    cotizacionesState.filter(c => ['confirmada', 'convertida'].includes(c.estado)).length,
    [cotizacionesState]
  );

  const conteoCanceladas = useMemo(() =>
    cotizacionesState.filter(c => ['cancelada', 'vencida'].includes(c.estado)).length,
    [cotizacionesState]
  );

  const cotizacionesFiltradas = useMemo(() => {
    const list = cotizacionesState.filter(c => {
      if (tabActiva === 'pendientes') return ['borrador', 'cotizada', 'pendiente'].includes(c.estado);
      if (tabActiva === 'confirmadas') return ['confirmada', 'convertida'].includes(c.estado);
      if (tabActiva === 'canceladas') return ['cancelada', 'vencida'].includes(c.estado);
      return true;
    });

    return [...list].sort((a, b) => {
      const fechaB = new Date(b.created_at || '').getTime();
      const fechaA = new Date(a.created_at || '').getTime();
      if (!isNaN(fechaB) && !isNaN(fechaA) && fechaB !== fechaA) {
        return fechaB - fechaA;
      }
      const numB = parseInt(String(b.consecutivo || '').replace(/\D/g, ''), 10) || 0;
      const numA = parseInt(String(a.consecutivo || '').replace(/\D/g, ''), 10) || 0;
      if (numB !== numA) return numB - numA;
      return new Date(b.fecha_inicio || '').getTime() - new Date(a.fecha_inicio || '').getTime();
    });
  }, [cotizacionesState, tabActiva]);

  return {
    cotizaciones: cotizacionesState,
    cotizacionesFiltradas,
    clientes,
    fincas,
    menus,
    configuracion,

    // Conteo pestañas
    conteoPendientes,
    conteoConfirmadas,
    conteoCanceladas,
    conteoTotal: cotizacionesState.length,

    // Formulario
    form,
    setForm,
    editando,
    guardando,
    modoAlimentacionPersonalizada,
    setModoAlimentacionPersonalizada,
    abrirNuevo,
    abrirEdicion,
    cerrar,
    updateField,
    handleMenuSelect,
    handleFincaChange,
    handleGuardar,

    // Modales
    modalConfirmarReserva,
    setModalConfirmarReserva,
    modalWaCotiz,
    setModalWaCotiz,

    // Acciones & Optimismo
    handleCambiarEstado: handleCambiarEstadoOptimista,
    handleCancelarCotizacion,
    handleEliminarDefinitivo,
    handleIniciarPasoAReserva,
    handleConfirmarPasoAReserva,
    handleAbrirPedirAbono,
    handleAbrirCobroAlimentacion,
    handleDescargarPdfAlimentacion,

    // Pestañas
    tabActiva,
    setTabActiva,

    // Callbacks adicionales
    onRegistrarComunicacion,
    showToast,
    openConfirm,
    previsualizarFinca,
    abrirComunicacionesConExpediente,
  };
}

export type UseCotizacionesControllerReturn = ReturnType<typeof useCotizacionesController>;
