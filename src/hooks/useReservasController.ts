import { useState, useMemo, useEffect, useCallback } from 'react';
import type {
  Reserva, ReservaEstado, Cliente, Finca, Pago, PagoTipo,
  CotizacionDB, CierreReserva, ConfiguracionGeneral
} from '../types';
import { calcularSaldo, desglosarFinanzasReserva } from '../types';
import { useApp } from '../context/AppContext';
import { getConfiguracionGlobal } from '../services/configuracion';
import {
  plantillaCobroAlimentacion,
  plantillaRecordatorioPago,
  plantillaBienvenida,
  plantillaSeparacion,
  plantillaPazYSalvo,
  plantillaEstadoCuenta,
} from '../services/whatsapp';
import {
  generarDocSeparacion,
  generarPazYSalvo,
  generarEstadoCuenta,
  generarPropuestaAlimentacion,
} from '../services/documentos';

export interface UseReservasControllerParams {
  reservas: Reserva[];
  clientes: Cliente[];
  fincas: Finca[];
  cotizaciones: CotizacionDB[];
  configuracion?: ConfiguracionGeneral;
  userEmail?: string | null;
  onGuardar: (datos: Partial<Reserva>) => Promise<{ success: boolean; id?: string; error?: string }>;
  onCambiarEstado: (id: string, estado: ReservaEstado) => Promise<{ success: boolean; error?: string }>;
  onCerrarReserva?: (
    reservaId: string,
    datosCierre: Partial<CierreReserva>,
    pagoLiquidacion?: { valor: number; tipo: PagoTipo; observacion?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onReabrirReserva?: (reservaId: string) => Promise<{ success: boolean; error?: string }>;
  onEliminar: (id: string) => Promise<{ success: boolean; error?: string }>;
  onRegistrarPago: (reservaId: string, pago: { tipo: PagoTipo; fecha: string; valor: number; observacion?: string }) => Promise<{ success: boolean; error?: string }>;
  onEliminarPago: (pagoId: string) => Promise<{ success: boolean; error?: string }>;
  onRegistrarComunicacion?: (com: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
  cotizacionInicial?: CotizacionDB | null;
  onCotizacionInicialUsada?: () => void;
}

export type FiltroReservaTab = 'activas' | 'completadas' | 'canceladas' | 'todas';

export const ESTADOS_RESERVA: ReservaEstado[] = ['activa', 'completada', 'cancelada', 'no_show'];
export const TIPOS_PAGO: { valor: PagoTipo; label: string }[] = [
  { valor: 'separacion', label: 'Separación' },
  { valor: 'abono', label: 'Abono' },
  { valor: 'pago_total', label: 'Pago total' },
  { valor: 'devolucion', label: 'Devolución' },
];

export const ESTADO_COLORS: Record<ReservaEstado, string> = {
  activa: 's-avail',
  completada: 's-avail',
  cancelada: 's-busy',
  no_show: 's-busy',
};

export const FORM_VACIO: Partial<Reserva> = {
  cliente_id: '',
  finca_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  personas: 1,
  valor_total: 0,
  separacion: 0,
  estado: 'activa',
  observaciones: '',
};

export const PAGO_VACIO = {
  tipo: 'abono' as PagoTipo,
  fecha: new Date().toISOString().split('T')[0],
  valor: 0,
  observacion: '',
};

export function formatCOP(v: number) {
  return '$' + (v || 0).toLocaleString('es-CO') + ' COP';
}

export function formatFecha(f?: string) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Controller Hook desacoplado para AdminReservas.
 * Implementa Actualizaciones Optimistas (< 16ms) con Rollback seguro ante fallos.
 */
export function useReservasController({
  reservas = [],
  clientes,
  fincas,
  cotizaciones,
  configuracion,
  userEmail,
  onGuardar,
  onCambiarEstado,
  onCerrarReserva,
  onReabrirReserva,
  onEliminar,
  onRegistrarPago,
  onEliminarPago,
  onRegistrarComunicacion,
  showToast,
  openConfirm,
  cotizacionInicial,
  onCotizacionInicialUsada,
}: UseReservasControllerParams) {
  const { abrirComunicacionesConExpediente, cambiarEstadoAlimentacionReserva } = useApp();

  // Estado local reactivo optimista (< 16ms)
  const [reservasState, setReservasState] = useState<Reserva[]>(() => reservas || []);

  useEffect(() => {
    setReservasState(reservas || []);
  }, [reservas]);

  // Formulario y UI
  const [form, setForm] = useState<Partial<Reserva>>(FORM_VACIO);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [reservaExpandida, setReservaExpandida] = useState<string | null>(null);

  // Pagos
  const [pagoForm, setPagoForm] = useState<typeof PAGO_VACIO>(PAGO_VACIO);
  const [pagoReservaId, setPagoReservaId] = useState<string | null>(null);
  const [destinoAbono, setDestinoAbono] = useState<'alojamiento' | 'alimentacion'>('alojamiento');
  const [metodoPagoAbono, setMetodoPagoAbono] = useState<string>('Transferencia Bancolombia / Nequi');
  const [guardandoPago, setGuardandoPago] = useState(false);

  // Filtros
  const [tabReservaActiva, setTabReservaActiva] = useState<FiltroReservaTab>('activas');

  // Modales
  const [reservaParaCierre, setReservaParaCierre] = useState<Reserva | null>(null);
  const [reservaParaExpediente, setReservaParaExpediente] = useState<Reserva | null>(null);
  const [modalWaReserva, setModalWaReserva] = useState<{
    abierto: boolean;
    reserva?: Reserva;
    titulo: string;
    nombreDoc?: string;
    mensaje: string;
    onGenerarPdf?: () => void;
    tipo: any;
  }>({
    abierto: false,
    titulo: '',
    mensaje: '',
    tipo: 'recordatorio_pago',
  });

  // Pre-cargar datos si viene una cotización convertida
  useEffect(() => {
    if (cotizacionInicial) {
      setForm({
        cotizacion_id: cotizacionInicial.id,
        consecutivo: cotizacionInicial.consecutivo
          ? (cotizacionInicial.consecutivo.match(/\d+/g)?.join('') || cotizacionInicial.consecutivo.replace(/^[A-Za-z\-]+/, ''))
          : undefined,
        cliente_id: cotizacionInicial.cliente_id || '',
        finca_id: cotizacionInicial.finca_id,
        fecha_inicio: cotizacionInicial.fecha_inicio,
        fecha_fin: cotizacionInicial.fecha_fin,
        personas: cotizacionInicial.personas,
        valor_total: cotizacionInicial.total,
        separacion: Math.round((cotizacionInicial.total || 0) * 0.5),
        menu_id: cotizacionInicial.menu_id || null,
        alimentacion: cotizacionInicial.alimentacion || null,
        costo_alimentacion: cotizacionInicial.costo_alimentacion || 0,
        estado: 'activa',
        observaciones: cotizacionInicial.alimentacion && cotizacionInicial.alimentacion !== 'Sin alimentación'
          ? `Incluye menú: ${cotizacionInicial.alimentacion}`
          : '',
      });
      setEditando(true);
      onCotizacionInicialUsada?.();
    }
  }, [cotizacionInicial, onCotizacionInicialUsada]);

  // Acciones de formulario
  const abrirNuevo = useCallback(() => {
    setForm(FORM_VACIO);
    setEditando(true);
  }, []);

  const abrirEdicion = useCallback((r: Reserva) => {
    setForm({ ...r });
    setEditando(true);
  }, []);

  const cerrar = useCallback(() => {
    setForm(FORM_VACIO);
    setEditando(false);
  }, []);

  const handleGuardar = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente_id) { showToast('Selecciona un cliente', 'error'); return; }
    if (!form.finca_id) { showToast('Selecciona una finca', 'error'); return; }
    if (!form.fecha_inicio || !form.fecha_fin) { showToast('Las fechas son obligatorias', 'error'); return; }

    setGuardando(true);
    const res = await onGuardar(form);
    setGuardando(false);

    if (res.success) {
      showToast(form.id ? 'Reserva actualizada ✅' : 'Reserva creada ✅', 'success');
      cerrar();
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  }, [form, onGuardar, showToast, cerrar]);

  // 1. ACTUALIZACIÓN OPTIMISTA: Cambiar estado de reserva (<16ms) con Rollback
  const handleCambiarEstadoOptimista = useCallback(async (id: string, nuevoEstado: ReservaEstado) => {
    const prevReservas = [...reservasState];
    // Inmediato: reflejar en la interfaz < 16ms
    setReservasState(prev => prev.map(r => r.id === id ? { ...r, estado: nuevoEstado } : r));

    try {
      const res = await onCambiarEstado(id, nuevoEstado);
      if (res.success) {
        showToast(`Estado actualizado a: ${nuevoEstado} ✅`, 'success');
      } else {
        // Rollback seguro si la base de datos no pudo persistir
        setReservasState(prevReservas);
        showToast(`Error: ${res.error || 'No se pudo cambiar el estado'}`, 'error');
      }
    } catch {
      // Rollback ante excepción de red
      setReservasState(prevReservas);
      showToast('Error de conexión al actualizar estado', 'error');
    }
  }, [reservasState, onCambiarEstado, showToast]);

  // 2. ACTUALIZACIÓN OPTIMISTA: Registrar abono / pago (<16ms) con Rollback
  const handleRegistrarPagoOptimista = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pagoReservaId) return;
    if (!pagoForm.valor || pagoForm.valor <= 0) {
      showToast('El valor debe ser mayor a cero', 'error');
      return;
    }

    const r = reservasState.find(res => res.id === pagoReservaId);
    if (!r) return;

    const prevReservas = [...reservasState];
    const monto = pagoForm.valor;

    if (destinoAbono === 'alimentacion') {
      setGuardandoPago(true);
      try {
        const desglose = desglosarFinanzasReserva(r);
        const nuevoTotalPagadoAlim = desglose.pagadoAlimentacion + monto;
        const esPagadaTotal = nuevoTotalPagadoAlim >= desglose.costoAlimentacion;

        const res = await cambiarEstadoAlimentacionReserva(
          r.id,
          esPagadaTotal ? 'pagada' : 'parcial',
          {
            metodo: metodoPagoAbono,
            notas: pagoForm.observacion || undefined,
            monto,
          }
        );
        setGuardandoPago(false);

        if (res.success) {
          showToast(esPagadaTotal ? '¡Alimentación liquidada totalmente! 🍽️✅' : 'Abono a alimentación registrado 🍽️✅', 'success');
          setPagoForm(PAGO_VACIO);
          setPagoReservaId(null);
        } else {
          showToast(`Error al registrar alimentación: ${res.error}`, 'error');
        }
      } catch {
        setGuardandoPago(false);
        showToast('Error de conexión al registrar alimentación', 'error');
      }
    } else {
      // Registrar pago de alojamiento con respuesta optimista inmediata
      const pagoOptimista: Pago = {
        id: `opt-${Date.now()}`,
        reserva_id: pagoReservaId,
        tipo: pagoForm.tipo,
        fecha: pagoForm.fecha,
        valor: monto,
        observacion: pagoForm.observacion || 'Abono de alojamiento - Propietario',
        created_at: new Date().toISOString(),
      };

      // 1. Inserción optimista en memoria (< 16ms)
      setReservasState(prev => prev.map(res => {
        if (res.id !== pagoReservaId) return res;
        return {
          ...res,
          pagos: [...(res.pagos || []), pagoOptimista],
        };
      }));

      const datosAbono = {
        ...pagoForm,
        observacion: pagoForm.observacion || 'Abono de alojamiento - Propietario',
      };
      const targetId = pagoReservaId;

      // Cerrar formulario de inmediato
      setPagoForm(PAGO_VACIO);
      setPagoReservaId(null);

      // 2. Persistir en Supabase en segundo plano
      try {
        const res = await onRegistrarPago(targetId, datosAbono);
        if (res.success) {
          showToast('Abono registrado con éxito ✅', 'success');
        } else {
          // Rollback si la base de datos reportó error
          setReservasState(prevReservas);
          showToast(`Error: ${res.error || 'No se pudo guardar el pago'}`, 'error');
        }
      } catch {
        // Rollback ante fallo de red
        setReservasState(prevReservas);
        showToast('Error de conexión al registrar pago', 'error');
      }
    }
  }, [pagoReservaId, pagoForm, reservasState, destinoAbono, metodoPagoAbono, cambiarEstadoAlimentacionReserva, onRegistrarPago, showToast]);

  const handleEliminar = useCallback((r: Reserva) => {
    openConfirm(
      '¿Eliminar reserva?',
      'Se eliminarán también todos los pagos asociados. Esta acción es irreversible.',
      async () => {
        const res = await onEliminar(r.id);
        if (res.success) showToast('Reserva eliminada', 'info');
        else showToast(`Error: ${res.error}`, 'error');
      }
    );
  }, [openConfirm, onEliminar, showToast]);

  const handleEliminarPagoClick = useCallback((p: Pago) => {
    openConfirm(
      '¿Eliminar pago?',
      `Se eliminará el registro de ${formatCOP(p.valor)} (${p.tipo}).`,
      async () => {
        const res = await onEliminarPago(p.id);
        if (res.success) showToast('Pago eliminado', 'info');
        else showToast(`Error: ${res.error}`, 'error');
      }
    );
  }, [openConfirm, onEliminarPago, showToast]);

  // Modal para cobro de alimentación
  const handleAbrirCobroAlimentacion = useCallback((r: Reserva) => {
    const cfg = configuracion || getConfiguracionGlobal();
    const iden = (cfg as any)?.banco_identificacion ? (cfg as any).banco_identificacion.trim() : undefined;
    const bancosAdmin = cfg?.banco_cuenta ? {
      banco: cfg.banco_nombre || 'Bancolombia',
      tipoCuenta: cfg.banco_tipo_cuenta || 'Ahorros',
      cuenta: cfg.banco_cuenta,
      titular: cfg.banco_titular || 'Administración Paraíso Terrenal',
      nit: iden || undefined,
    } : null;

    const f = fincas.find(x => x.id === r.finca_id) || r.fincas;

    let cantPersonas = r.personas || 4;
    let cantServ = (r as any).cantidad_alimentacion || 1;
    if (r.alimentacion) {
      const match = r.alimentacion.match(/(\d+)\s*serv(?:\.|\w*)\s*×\s*(\d+)\s*pers/i);
      if (match) {
        cantServ = parseInt(match[1], 10) || cantServ;
        cantPersonas = parseInt(match[2], 10) || cantPersonas;
      }
    }

    const onGenPdf = async () => {
      const m = (r.alimentacion && r.alimentacion !== 'Sin alimentación' ? {
        id: 'res-menu',
        nombre: r.alimentacion,
        categoria: 'Almuerzo' as const,
        precio_pp: (r.costo_alimentacion || 0) / Math.max(1, cantPersonas * cantServ),
        activo: true,
      } : null);

      if (!m) return;
      try {
        await generarPropuestaAlimentacion({
          menu: m,
          cliente: r.clientes,
          finca: f,
          personas: cantPersonas,
          cantidadServicios: cantServ,
          consecutivo: r.consecutivo,
          tituloDocumento: 'DETALLE Y COBRO DE ALIMENTACIÓN',
          config: configuracion,
        });
        showToast('Detalle de alimentación descargado en PDF ✅', 'success');
      } catch {
        showToast('Error generando PDF de alimentación', 'error');
      }
    };

    setModalWaReserva({
      abierto: true,
      reserva: r,
      titulo: `Cobro de Alimentación (Paraíso Terrenal) · ${f?.nombre || r.fincas?.nombre || 'Finca'}`,
      mensaje: plantillaCobroAlimentacion(r, f, r.clientes, bancosAdmin),
      nombreDoc: 'Detalle de Alimentación (PDF)',
      onGenerarPdf: onGenPdf,
      tipo: 'cobro_alimentacion',
    });
  }, [configuracion, fincas, showToast]);

  const handleAbrirModalPago = useCallback((r: Reserva) => {
    const f = desglosarFinanzasReserva(r);
    setPagoReservaId(r.id);
    if (f.saldoAlimentacionAdmin > 0 && f.saldoFincaCheckIn === 0) {
      setDestinoAbono('alimentacion');
      setPagoForm({
        tipo: 'abono',
        fecha: new Date().toISOString().split('T')[0],
        valor: f.saldoAlimentacionAdmin,
        observacion: 'Abono de alimentación - Administración',
      });
    } else {
      setDestinoAbono('alojamiento');
      setPagoForm({
        tipo: 'abono',
        fecha: new Date().toISOString().split('T')[0],
        valor: f.saldoFincaCheckIn > 0 ? f.saldoFincaCheckIn : calcularSaldo(r),
        observacion: 'Abono de alojamiento - Propietario',
      });
    }
  }, []);

  // Deduplicación inteligente por cotizacion_id y por ID para eliminar cualquier borrador accidental
  const reservasUnicas = useMemo(() => {
    const cotizVistas = new Set<string>();
    const idsVistos = new Set<string>();
    const lista: Reserva[] = [];

    for (const r of reservasState) {
      if (idsVistos.has(r.id)) continue;
      if (r.cotizacion_id) {
        if (cotizVistas.has(r.cotizacion_id)) continue;
        cotizVistas.add(r.cotizacion_id);
      }
      idsVistos.add(r.id);
      lista.push(r);
    }
    return lista;
  }, [reservasState]);

  const conteos = useMemo(() => {
    const activas = reservasUnicas.filter(r => r.estado === 'activa').length;
    const completadas = reservasUnicas.filter(r => r.estado === 'completada').length;
    const canceladas = reservasUnicas.filter(r => ['cancelada', 'no_show'].includes(r.estado)).length;
    const todas = reservasUnicas.length;
    return { activas, completadas, canceladas, todas };
  }, [reservasUnicas]);

  // Filtrado memoizado por pestañas con orden de llegada estricto
  const reservasFiltradas = useMemo(() => {
    const list = reservasUnicas.filter(r => {
      if (tabReservaActiva === 'activas') return r.estado === 'activa';
      if (tabReservaActiva === 'completadas') return r.estado === 'completada';
      if (tabReservaActiva === 'canceladas') return ['cancelada', 'no_show'].includes(r.estado);
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
  }, [reservasUnicas, tabReservaActiva]);

  return {
    reservas: reservasState,
    reservasFiltradas,
    conteos,
    clientes,
    fincas,
    cotizaciones,
    configuracion,
    userEmail,

    // Formulario
    form,
    setForm,
    editando,
    guardando,
    abrirNuevo,
    abrirEdicion,
    cerrar,
    handleGuardar,

    // Pagos
    pagoForm,
    setPagoForm,
    pagoReservaId,
    setPagoReservaId,
    destinoAbono,
    setDestinoAbono,
    metodoPagoAbono,
    setMetodoPagoAbono,
    guardandoPago,
    handleRegistrarPago: handleRegistrarPagoOptimista,
    handleEliminarPago: handleEliminarPagoClick,
    handleAbrirModalPago,

    // Estado & Acciones Optimistas
    handleEstado: handleCambiarEstadoOptimista,
    handleEliminar,
    handleAbrirCobroAlimentacion,

    // Pestañas y vistas
    tabReservaActiva,
    setTabReservaActiva,
    reservaExpandida,
    setReservaExpandida,

    // Modales
    reservaParaCierre,
    setReservaParaCierre,
    reservaParaExpediente,
    setReservaParaExpediente,
    modalWaReserva,
    setModalWaReserva,

    // Callbacks
    onCerrarReserva,
    onReabrirReserva,
    onRegistrarComunicacion,
    showToast,
    abrirComunicacionesConExpediente,
  };
}

export type UseReservasControllerReturn = ReturnType<typeof useReservasController>;
