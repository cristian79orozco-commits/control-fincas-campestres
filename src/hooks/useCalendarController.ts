import { useState, useMemo, useEffect, useCallback } from 'react';
import type {
  Finca, BloqueoDisponibilidad, Reserva, Cliente, CotizacionDB,
  Menu as MenuType, ConfiguracionGeneral, PagoTipo, Pago, CierreReserva
} from '../types';

export interface UseCalendarControllerParams {
  fincas: Finca[];
  bloquesAdmin: BloqueoDisponibilidad[];
  reservas?: Reserva[];
  clientes?: Cliente[];
  cotizaciones?: CotizacionDB[];
  menus?: MenuType[];
  configuracion?: ConfiguracionGeneral;
  userEmail?: string | null;
  onMarcarDias: (fincaId: string, fechas: string[], estado: 'ocupado' | 'libre', nombreCliente?: string) => Promise<{ success: boolean; error?: string }>;
  onEliminarBloqueo?: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  onGuardarReserva?: (datos: Partial<Reserva>) => Promise<{ success: boolean; id?: string; error?: string }>;
  onCambiarEstadoReserva?: (id: string, estado: any) => Promise<{ success: boolean; error?: string }>;
  onRegistrarPago?: (reservaId: string, pago: { tipo: PagoTipo; fecha: string; valor: number; observacion?: string }) => Promise<{ success: boolean; error?: string }>;
  onEliminarPago?: (pagoId: string) => Promise<{ success: boolean; error?: string }>;
  onCerrarReserva?: (
    reservaId: string,
    datosCierre: Partial<CierreReserva>,
    pagoLiquidacion?: { valor: number; tipo: PagoTipo; observacion?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onReabrirReserva?: (reservaId: string) => Promise<{ success: boolean; error?: string }>;
  onEliminarReserva?: (id: string) => Promise<{ success: boolean; error?: string }>;
  onRegistrarComunicacion?: (com: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const TIPOS_PAGO: { valor: PagoTipo; label: string }[] = [
  { valor: 'separacion', label: 'Separación' },
  { valor: 'abono', label: 'Abono' },
  { valor: 'pago_total', label: 'Pago total' },
  { valor: 'devolucion', label: 'Devolución' },
];

export const PAGO_VACIO = {
  tipo: 'abono' as PagoTipo,
  fecha: new Date().toISOString().split('T')[0],
  valor: 0,
  observacion: ''
};

export function formatCOP(v: number) {
  return '$' + (v || 0).toLocaleString('es-CO') + ' COP';
}

export function formatFecha(f?: string) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

export interface ModalWaReservaState {
  abierto: boolean;
  reserva?: Reserva;
  titulo: string;
  nombreDoc?: string;
  mensaje: string;
  onGenerarPdf?: () => void;
  tipo: any;
}

export interface DiaCalendarioModel {
  diaNum: number;
  fechaStr: string;
  esOcupado: boolean;
  esSeleccionado: boolean;
  esHoy: boolean;
  reservaVinculada?: Reserva;
  bloqueoVinculado?: BloqueoDisponibilidad;
  clienteEtiqueta: string;
  consecutivoTexto: string;
  className: string;
}

/**
 * Custom Hook Controller para AdminCalendar
 * Desacopla la lógica de estado, fechas, ocupación y reservas
 * Diseñado bajo el estándar de rendimiento a 60 FPS y blindaje de lógica funcional.
 */
export function useCalendarController({
  fincas,
  bloquesAdmin,
  reservas = [],
  clientes = [],
  cotizaciones = [],
  menus = [],
  configuracion,
  userEmail,
  onMarcarDias,
  onEliminarBloqueo,
  onGuardarReserva,
  onCambiarEstadoReserva,
  onRegistrarPago,
  onEliminarPago,
  onCerrarReserva,
  onReabrirReserva,
  onEliminarReserva,
  onRegistrarComunicacion,
  showToast,
  openConfirm,
}: UseCalendarControllerParams) {
  // Preseleccionar la primera finca por defecto
  const [selectedFincaId, setSelectedFincaId] = useState<string>(() => {
    return fincas[0]?.id || '';
  });

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState<Set<string>>(new Set());
  const [nombreCliente, setNombreCliente] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [busquedaFinca, setBusquedaFinca] = useState('');
  const [fechaInspeccionada, setFechaInspeccionada] = useState<string | null>(null);

  // Estados de interfaz de reservas inferiores
  const [filtroFincaReservas, setFiltroFincaReservas] = useState<'esta_finca' | 'todas'>('esta_finca');
  const [reservaExpandida, setReservaExpandida] = useState<string | null>(null);
  const [pagoReservaId, setPagoReservaId] = useState<string | null>(null);
  const [pagoForm, setPagoForm] = useState<typeof PAGO_VACIO>(PAGO_VACIO);
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [reservaParaCierre, setReservaParaCierre] = useState<Reserva | null>(null);
  const [reservaParaExpediente, setReservaParaExpediente] = useState<Reserva | null>(null);

  const [modalWaReserva, setModalWaReserva] = useState<ModalWaReservaState>({
    abierto: false,
    titulo: '',
    mensaje: '',
    tipo: 'general',
  });

  // Asegurar que si fincas cargan de forma asíncrona, se preseleccione la primera automáticamente
  useEffect(() => {
    if (!selectedFincaId && fincas.length > 0) {
      setSelectedFincaId(fincas[0].id);
    }
  }, [fincas, selectedFincaId]);

  const anio = currentDate.getFullYear();
  const mes = currentDate.getMonth();

  const handlePrevMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const handleIrAHoy = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const diasMes = useMemo(() => new Date(anio, mes + 1, 0).getDate(), [anio, mes]);
  const primerDiaSemana = useMemo(() => new Date(anio, mes, 1).getDay(), [anio, mes]);
  const offset = useMemo(() => (primerDiaSemana === 0 ? 6 : primerDiaSemana - 1), [primerDiaSemana]);

  const hoyStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Finca seleccionada actual
  const fincaActual = useMemo(() => {
    return fincas.find(f => f.id === selectedFincaId) || fincas[0] || null;
  }, [fincas, selectedFincaId]);

  // Mapa de fechas ocupadas y detalle de reservas para la finca actualmente seleccionada
  const { ocupadosSet, reservasPorFecha, bloqueosPorFecha } = useMemo(() => {
    const set = new Set<string>();
    const resMap = new Map<string, Reserva>();
    const bloqMap = new Map<string, BloqueoDisponibilidad>();

    if (!selectedFincaId) return { ocupadosSet: set, reservasPorFecha: resMap, bloqueosPorFecha: bloqMap };

    // 1. Bloqueos administrativos en Supabase
    bloquesAdmin
      .filter(b => b.finca_id === selectedFincaId && b.estado === 'ocupado')
      .forEach(b => {
        const d = new Date(b.fecha_inicio + 'T00:00:00');
        const fin = new Date(b.fecha_fin + 'T00:00:00');
        while (d <= fin) {
          const iso = d.toISOString().split('T')[0];
          set.add(iso);
          bloqMap.set(iso, b);
          d.setDate(d.getDate() + 1);
        }
      });

    // 2. Reservas activas asociadas a la finca
    reservas
      .filter(r => r.finca_id === selectedFincaId && r.estado === 'activa')
      .forEach(r => {
        const d = new Date(r.fecha_inicio + 'T00:00:00');
        const fin = new Date(r.fecha_fin + 'T00:00:00');
        while (d <= fin) {
          const iso = d.toISOString().split('T')[0];
          set.add(iso);
          resMap.set(iso, r);
          d.setDate(d.getDate() + 1);
        }
      });

    return { ocupadosSet: set, reservasPorFecha: resMap, bloqueosPorFecha: bloqMap };
  }, [bloquesAdmin, reservas, selectedFincaId]);

  // Reservas activas para mostrar en el listado inferior
  const reservasActivas = useMemo(() => {
    return reservas.filter(r => {
      if (r.estado !== 'activa') return false;
      if (filtroFincaReservas === 'esta_finca' && selectedFincaId) {
        return r.finca_id === selectedFincaId;
      }
      return true;
    });
  }, [reservas, filtroFincaReservas, selectedFincaId]);

  // Conteo de reservas activas por finca para mostrar en los chips
  const conteoPorFinca = useMemo(() => {
    const map: Record<string, number> = {};
    fincas.forEach(f => {
      map[f.id] = reservas.filter(r => r.finca_id === f.id && r.estado === 'activa').length;
    });
    return map;
  }, [fincas, reservas]);

  // Fincas filtradas para la ventana menú estática
  const fincasFiltradasMenu = useMemo(() => {
    if (!busquedaFinca.trim()) return fincas;
    const q = busquedaFinca.toLowerCase();
    return fincas.filter(f =>
      f.nombre.toLowerCase().includes(q) ||
      (f.zona && f.zona.toLowerCase().includes(q))
    );
  }, [fincas, busquedaFinca]);

  // Métricas objetivas de ocupación para el mes visible
  const metricasMes = useMemo(() => {
    let ocupados = 0;
    for (let dia = 1; dia <= diasMes; dia++) {
      const fStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      if (ocupadosSet.has(fStr)) ocupados++;
    }
    const libres = diasMes - ocupados;
    const porcentaje = diasMes > 0 ? Math.round((ocupados / diasMes) * 100) : 0;
    return { diasMes, ocupados, libres, porcentaje };
  }, [anio, mes, diasMes, ocupadosSet]);

  // Modelado memoizado de días para renderizado instantáneo a 60 FPS
  const diasDelMesGrid: DiaCalendarioModel[] = useMemo(() => {
    return Array.from({ length: diasMes }).map((_, i) => {
      const diaNum = i + 1;
      const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
      const esOcupado = ocupadosSet.has(fechaStr);
      const esSeleccionado = fechasSeleccionadas.has(fechaStr);
      const esHoy = fechaStr === hoyStr;

      const reservaVinculada = reservasPorFecha.get(fechaStr);
      const bloqueoVinculado = bloqueosPorFecha.get(fechaStr);

      let clienteEtiqueta = '';
      let consecutivoTexto = '';

      if (reservaVinculada) {
        const nom = reservaVinculada.clientes
          ? `${reservaVinculada.clientes.nombre} ${reservaVinculada.clientes.apellido || ''}`.trim()
          : 'Reserva activa';
        clienteEtiqueta = nom;
        consecutivoTexto = reservaVinculada.consecutivo ? `#${reservaVinculada.consecutivo}` : '';
      } else if (bloqueoVinculado?.notas) {
        clienteEtiqueta = bloqueoVinculado.notas;
      }

      let cls = 'admin-cal-day-large';
      if (esSeleccionado) cls += ' selected';
      else if (bloqueoVinculado) cls += ' busy-admin';
      else if (esOcupado) cls += ' busy';
      else cls += ' free';
      if (esHoy) cls += ' today';

      return {
        diaNum,
        fechaStr,
        esOcupado,
        esSeleccionado,
        esHoy,
        reservaVinculada,
        bloqueoVinculado,
        clienteEtiqueta,
        consecutivoTexto,
        className: cls,
      };
    });
  }, [diasMes, anio, mes, ocupadosSet, fechasSeleccionadas, hoyStr, reservasPorFecha, bloqueosPorFecha]);

  const toggleDia = useCallback((fechaStr: string) => {
    setFechasSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(fechaStr)) next.delete(fechaStr);
      else next.add(fechaStr);
      return next;
    });
    setFechaInspeccionada(fechaStr);
  }, []);

  // Atajo: Seleccionar fines de semana (Viernes, Sábado y Domingo)
  const handleSeleccionarFinesDeSemana = useCallback(() => {
    const nuevos = new Set(fechasSeleccionadas);
    for (let dia = 1; dia <= diasMes; dia++) {
      const dateObj = new Date(anio, mes, dia);
      const dayOfWeek = dateObj.getDay(); // 0 = Dom, 5 = Vie, 6 = Sáb
      if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
        const fStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        nuevos.add(fStr);
      }
    }
    setFechasSeleccionadas(nuevos);
    showToast('Fines de semana (Vie-Sáb-Dom) seleccionados', 'info');
  }, [fechasSeleccionadas, diasMes, anio, mes, showToast]);

  // Liberar fecha individual directamente desde el inspector de fecha
  const handleLiberarBloqueoRapido = useCallback(async (bloqueo: BloqueoDisponibilidad) => {
    setProcesando(true);
    let res: { success: boolean; error?: string };
    if (onEliminarBloqueo) {
      res = await onEliminarBloqueo(bloqueo.id);
    } else {
      res = await onMarcarDias(selectedFincaId, [bloqueo.fecha_inicio], 'libre');
    }
    setProcesando(false);

    if (res.success) {
      showToast('Bloqueo eliminado y fecha liberada ✅', 'success');
      setFechaInspeccionada(null);
      setFechasSeleccionadas(prev => {
        const next = new Set(prev);
        next.delete(bloqueo.fecha_inicio);
        return next;
      });
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  }, [onEliminarBloqueo, onMarcarDias, selectedFincaId, showToast]);

  const handleMarcar = useCallback(async (estado: 'ocupado' | 'libre') => {
    if (!selectedFincaId) {
      showToast('Selecciona una finca primero', 'error');
      return;
    }
    if (!fechasSeleccionadas.size) {
      showToast('Selecciona al menos un día en el calendario', 'error');
      return;
    }

    setProcesando(true);
    const res = await onMarcarDias(
      selectedFincaId,
      Array.from(fechasSeleccionadas),
      estado,
      nombreCliente.trim() || undefined
    );
    setProcesando(false);

    if (res.success) {
      showToast(`Días marcados como "${estado}" correctamente ✅`, 'success');
      setFechasSeleccionadas(new Set());
      setNombreCliente('');
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  }, [selectedFincaId, fechasSeleccionadas, onMarcarDias, nombreCliente, showToast]);

  // Registrar abono desde el listado inferior
  const handleRegistrarPago = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pagoReservaId || !onRegistrarPago) return;
    if (!pagoForm.valor || pagoForm.valor <= 0) {
      showToast('El valor debe ser mayor a cero', 'error');
      return;
    }
    setGuardandoPago(true);
    const res = await onRegistrarPago(pagoReservaId, pagoForm);
    setGuardandoPago(false);
    if (res.success) {
      showToast('Pago registrado correctamente ✅', 'success');
      setPagoForm(PAGO_VACIO);
      setPagoReservaId(null);
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  }, [pagoReservaId, onRegistrarPago, pagoForm, showToast]);

  const handleEliminarPagoClick = useCallback((p: Pago) => {
    if (!onEliminarPago) return;
    if (openConfirm) {
      openConfirm(
        '¿Eliminar pago?',
        `Se eliminará el registro de ${formatCOP(p.valor)} (${p.tipo}).`,
        async () => {
          const res = await onEliminarPago(p.id);
          if (res.success) showToast('Pago eliminado', 'info');
          else showToast(`Error: ${res.error}`, 'error');
        }
      );
    } else {
      onEliminarPago(p.id).then(() => showToast('Pago eliminado', 'info'));
    }
  }, [onEliminarPago, openConfirm, showToast]);

  const handleSeleccionarFinca = useCallback((id: string) => {
    setSelectedFincaId(id);
    setFechasSeleccionadas(new Set());
    setFechaInspeccionada(null);
  }, []);

  return {
    // Fechas y matriz
    anio,
    mes,
    diasMes,
    offset,
    hoyStr,
    handlePrevMonth,
    handleNextMonth,
    handleIrAHoy,
    diasDelMesGrid,

    // Fincas y filtros
    fincas,
    selectedFincaId,
    fincaActual,
    busquedaFinca,
    setBusquedaFinca,
    fincasFiltradasMenu,
    conteoPorFinca,
    handleSeleccionarFinca,

    // Selección e inspección
    fechasSeleccionadas,
    setFechasSeleccionadas,
    fechaInspeccionada,
    setFechaInspeccionada,
    nombreCliente,
    setNombreCliente,
    procesando,
    toggleDia,
    handleSeleccionarFinesDeSemana,
    handleLiberarBloqueoRapido,
    handleMarcar,

    // Métricas
    metricasMes,
    reservasPorFecha,
    bloqueosPorFecha,

    // Reservas activas y listado
    filtroFincaReservas,
    setFiltroFincaReservas,
    reservasActivas,
    reservas,
    reservaExpandida,
    setReservaExpandida,

    // Pagos
    pagoReservaId,
    setPagoReservaId,
    pagoForm,
    setPagoForm,
    guardandoPago,
    handleRegistrarPago,
    handleEliminarPagoClick,

    // Modales
    reservaParaCierre,
    setReservaParaCierre,
    reservaParaExpediente,
    setReservaParaExpediente,
    modalWaReserva,
    setModalWaReserva,

    // Callbacks del padre
    onCerrarReserva,
    onReabrirReserva,
    onEliminarPago,
    onRegistrarComunicacion,
    showToast,
    userEmail,
    configuracion,
  };
}

export type UseCalendarControllerReturn = ReturnType<typeof useCalendarController>;
