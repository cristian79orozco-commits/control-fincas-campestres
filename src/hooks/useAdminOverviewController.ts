import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Finca, Cliente, CotizacionDB, Reserva, AdminSection, Menu as MenuType } from '../types';
import { resolverMetadatosFinca, desglosarFinanzasReserva, obtenerNombreClienteHistorico } from '../types';
import { useAdminDashboardStore, DashboardPeriodo, DashboardTab } from '../store/useAdminDashboardStore';
import { useApp } from '../context/AppContext';
import { abrirWhatsApp } from '../services/whatsapp';
import {
  toggleMasterNotificaciones,
  obtenerEstadoPermisoNotificaciones,
  isSoundEnabled,
  notificarComisionPendienteCobro,
  notificarAlertaComprasAlimentacion,
} from '../services/notificaciones';
import {
  filtrarDatosPorPeriodoYFinca,
  calcularMetricasDashboard,
  generarSerieMensualFinanzas,
  calcularRendimientoFincas,
  calcularEmbudoCotizaciones,
  getFechaHoyLocal,
  type MetricasKPIResumen,
  type SerieMensualFinanzas,
  type RendimientoFincaItem,
  type EmbudoCotizacionesData,
} from '../utils/dashboardMetrics';

export interface UseAdminOverviewControllerParams {
  fincas?: Finca[];
  reservas?: Reserva[];
  cotizaciones?: CotizacionDB[];
  clientes?: Cliente[];
  menus?: MenuType[];
  metricasReservas?: { total: number; activas: number; llegasHoy: number; salenHoy: number };
  navigateTo: (section: AdminSection) => void;
  userEmail?: string | null;
  onGuardarReserva?: (datos: Partial<Reserva>) => Promise<{ success: boolean; id?: string; error?: string }>;
}

export interface ProximaLlegadaItem {
  id: string;
  fincaNombre: string;
  clienteNombre: string;
  personas: number;
  numNoches: number;
  diaMes: string;
  esHoy: boolean;
  valorTotal: number;
  valorTotalFormateado: string;
  reservaOriginal: Reserva;
}

export interface PeriodoOpcion {
  id: DashboardPeriodo;
  label: string;
}

export const PERIODOS_OPCIONES: PeriodoOpcion[] = [
  { id: 'mes_actual', label: 'Este Mes' },
  { id: '30dias', label: 'Últimos 30d' },
  { id: '7dias', label: 'Últimos 7d' },
  { id: 'ano_actual', label: 'Este Año' },
  { id: 'todos', label: 'Histórico Completo' },
];

export function formatCOP(v: number): string {
  const num = typeof v === 'number' && !isNaN(v) ? v : 0;
  return '$' + Math.round(num).toLocaleString('es-CO');
}

// ─── Estructuras especializadas para el flujo del Broker / Administrador ─────

export interface BrokerAlertaComision {
  reservaId: string;
  consecutivo: string;
  fincaId: string;
  fincaNombre: string;
  propietarioNombre: string;
  propietarioTelefono: string;
  clienteNombre: string;
  fechaInicio: string;
  fechaFin: string;
  fechaFinLegible: string;
  subtotalAlojamiento: number;
  porcentajeComision: number;
  montoComision: number;
  montoComisionFormateado: string;
  diasDesdeSalida: number;
  mensajeWhatsApp: string;
  reservaOriginal: Reserva;
}

export interface RadarLlegadaItem {
  id: string;
  consecutivo: string;
  fincaNombre: string;
  clienteNombre: string;
  clienteTelefono: string;
  personas: number;
  numNoches: number;
  fechaInicio: string;
  fechaFin: string;
  diaMes: string;
  diasFaltantes: number;
  etiquetaCuentaRegresiva: string;
  esHoy: boolean;
  esManana: boolean;
  enCurso: boolean;
  tieneAlimentacion: boolean;
  menuNombre: string;
  costoAlimentacion: number;
  comprasAlimentacionListas: boolean;
  valorTotal: number;
  valorTotalFormateado: string;
  reservaOriginal: Reserva;
}

export interface AlertaCompraAlimentacion {
  reservaId: string;
  consecutivo: string;
  fincaNombre: string;
  clienteNombre: string;
  comensales: number;
  menuNombre: string;
  fechaInicio: string;
  diasFaltantes: number;
  comprasListas: boolean;
  reservaOriginal: Reserva;
}

export interface ResumenComisionesBroker {
  comisionesCobradas: number;
  comisionesPendientes: number;
  comisionesProyectadas: number;
  totalAlertasPendientes: number;
}

const STORAGE_COMISIONES_COBRADAS_KEY = 'fc_broker_comisiones_cobradas_ids';
const STORAGE_COMPRAS_LISTAS_KEY = 'fc_broker_compras_listas_ids';

function leerIdsStorage(key: string): Set<string> {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return new Set();
    const raw = localStorage.getItem(key);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

function guardarIdsStorage(key: string, ids: Set<string>): void {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch {}
}

function diferenciaEnDias(fechaRef: string, hoyStr: string): number {
  if (!fechaRef || !hoyStr) return 0;
  const dRef = new Date(fechaRef.slice(0, 10) + 'T00:00:00');
  const dHoy = new Date(hoyStr.slice(0, 10) + 'T00:00:00');
  if (isNaN(dRef.getTime()) || isNaN(dHoy.getTime())) return 0;
  return Math.round((dRef.getTime() - dHoy.getTime()) / (1000 * 60 * 60 * 24));
}

function formatFechaCorta(f?: string): string {
  if (!f) return '—';
  const partes = f.slice(0, 10).split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}`;
  return f;
}

/**
 * Controller Hook desacoplado para AdminDashboardOverview
 * Cumple con la arquitectura de 4 capas y optimización a 60 FPS:
 * - Selectores atómicos de Zustand (sin re-renders globales)
 * - Cálculos matemáticos y agregaciones 100% memoizadas con useMemo
 * - Callbacks protegidos con useCallback
 * - Entrega datos limpios, procesados y listos para presentación al componente Dumb UI
 */
export function useAdminOverviewController({
  fincas = [],
  reservas = [],
  cotizaciones = [],
  clientes = [],
  menus = [],
  metricasReservas = { total: 0, activas: 0, llegasHoy: 0, salenHoy: 0 },
  navigateTo,
  onGuardarReserva,
}: UseAdminOverviewControllerParams) {
  // Selectores atómicos de Zustand (Regla Maestra 3: 60 FPS)
  const periodo = useAdminDashboardStore((state) => state.periodo);
  const setPeriodo = useAdminDashboardStore((state) => state.setPeriodo);
  const fincaId = useAdminDashboardStore((state) => state.fincaId);
  const setFincaId = useAdminDashboardStore((state) => state.setFincaId);
  const tabActiva = useAdminDashboardStore((state) => state.tabActiva);
  const setTabActiva = useAdminDashboardStore((state) => state.setTabActiva);
  const resetFiltros = useAdminDashboardStore((state) => state.resetFiltros);

  // AppContext centralizado
  const { recargarTodo, loading: globalLoading, showToast } = useApp();
  const [sincronizando, setSincronizando] = useState(false);

  // Estados locales para persistencia de comisiones y compras
  const [comisionesCobradasIds, setComisionesCobradasIds] = useState<Set<string>>(() =>
    leerIdsStorage(STORAGE_COMISIONES_COBRADAS_KEY)
  );
  const [comprasListasIds, setComprasListasIds] = useState<Set<string>>(() =>
    leerIdsStorage(STORAGE_COMPRAS_LISTAS_KEY)
  );

  // Estado unificado de notificaciones y sonido
  const [notifPermiso, setNotifPermiso] = useState<NotificationPermission | 'unsupported'>(() =>
    obtenerEstadoPermisoNotificaciones()
  );
  const [sonidoActivo, setSonidoActivo] = useState<boolean>(() => isSoundEnabled());

  const hoyStr = useMemo(() => getFechaHoyLocal(), []);

  // 1. Filtrado dinámico memoizado por periodo y finca
  const { reservasFiltradas, cotizacionesFiltradas } = useMemo(() => {
    const rawReservas = Array.isArray(reservas) ? reservas : [];
    const rawCotizaciones = Array.isArray(cotizaciones) ? cotizaciones : [];
    const res = filtrarDatosPorPeriodoYFinca(rawReservas, rawCotizaciones, periodo, fincaId);
    return {
      reservasFiltradas: res.reservas,
      cotizacionesFiltradas: res.cotizaciones,
    };
  }, [reservas, cotizaciones, periodo, fincaId]);

  // 2. Cálculo memoizado de métricas consolidadas (Ingresos, Ocupación, Reservas Activas)
  const metricas: MetricasKPIResumen = useMemo(() => {
    return calcularMetricasDashboard(
      reservasFiltradas || [],
      cotizacionesFiltradas || [],
      metricasReservas
    );
  }, [reservasFiltradas, cotizacionesFiltradas, metricasReservas]);

  // 3. Series estadísticas memoizadas para Chart.js
  const serieFinanzas: SerieMensualFinanzas = useMemo(() => {
    return generarSerieMensualFinanzas(Array.isArray(reservas) ? reservas : []);
  }, [reservas]);

  const rendimientoFincas: RendimientoFincaItem[] = useMemo(() => {
    return calcularRendimientoFincas(
      Array.isArray(fincas) ? fincas : [],
      Array.isArray(reservas) ? reservas : []
    );
  }, [fincas, reservas]);

  const embudoCotizaciones: EmbudoCotizacionesData = useMemo(() => {
    return calcularEmbudoCotizaciones(Array.isArray(cotizaciones) ? cotizaciones : []);
  }, [cotizaciones]);

  // 4. Próximas llegadas históricas (compatibilidad)
  const proximasLlegadas: ProximaLlegadaItem[] = useMemo(() => {
    const safeReservas = Array.isArray(reservas) ? reservas : [];
    return safeReservas
      .filter((r) => r && r.estado === 'activa' && r.fecha_inicio && r.fecha_inicio >= hoyStr)
      .sort((a, b) => (a.fecha_inicio || '').localeCompare(b.fecha_inicio || ''))
      .slice(0, 5)
      .map((r) => {
        const clienteNombre = r.clientes
          ? `${r.clientes.nombre || ''} ${r.clientes.apellido || ''}`.trim()
          : (r.cliente_snapshot?.nombre || 'Cliente no registrado');

        const fechaPartes = (r.fecha_inicio || '').split('-');
        const diaMes = fechaPartes.length === 3 ? `${fechaPartes[2]}/${fechaPartes[1]}` : (r.fecha_inicio || '—');
        const esHoy = r.fecha_inicio === hoyStr;

        let numNoches = 1;
        if (r.fecha_inicio && r.fecha_fin) {
          const d1 = new Date(r.fecha_inicio + 'T00:00:00');
          const d2 = new Date(r.fecha_fin + 'T00:00:00');
          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            numNoches = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
          }
        }

        const valorTotal = r.valor_total || 0;

        return {
          id: r.id,
          fincaNombre: r.fincas?.nombre || r.finca_snapshot?.nombre || 'Finca',
          clienteNombre,
          personas: r.personas || 1,
          numNoches,
          diaMes,
          esHoy,
          valorTotal,
          valorTotalFormateado: formatCOP(valorTotal),
          reservaOriginal: r,
        };
      });
  }, [reservas, hoyStr]);

  // 5. CÁLCULO CENTRALIZADO DE COMISIONES DEL BROKER (Ingresos reales del admin)
  const { resumenComisiones, alertasComisionesPendientes } = useMemo(() => {
    const safeReservas = Array.isArray(reservas) ? reservas : [];
    let comisionesCobradas = 0;
    let comisionesPendientes = 0;
    let comisionesProyectadas = 0;
    const alertas: BrokerAlertaComision[] = [];

    safeReservas.forEach((r) => {
      if (!r || r.estado === 'cancelada') return;

      const fincaMeta = resolverMetadatosFinca(r.fincas || r.finca_snapshot, r.finca_id);
      const fin = desglosarFinanzasReserva(r, fincaMeta);
      const subtotalAlojamiento = fin.subtotalAlojamiento || 0;

      // Porcentaje de comisión acordado (predeterminado 10% si no está especificado)
      const pct = typeof r.comision_porcentaje === 'number'
        ? r.comision_porcentaje
        : (fincaMeta.porcentaje_comision ?? 10);

      // Monto de comisión calculado sobre el alojamiento
      const montoComision = typeof r.comision_monto === 'number'
        ? r.comision_monto
        : Math.round(subtotalAlojamiento * (pct / 100));

      const estaCobrada = r.comision_estado === 'cobrada' || comisionesCobradasIds.has(r.id);

      const diasDesdeSalida = r.fecha_fin ? diferenciaEnDias(hoyStr, r.fecha_fin) : 0;
      const fechaFinPasa = r.fecha_fin && r.fecha_fin <= hoyStr;

      if (estaCobrada) {
        comisionesCobradas += montoComision;
      } else {
        // Si la reserva ya fue completada o la fecha de checkout ya se cumplió: PENDIENTE POR COBRAR AL DUEÑO
        if (r.estado === 'completada' || fechaFinPasa) {
          comisionesPendientes += montoComision;

          const propNombre = fincaMeta.propietario_nombre || fincaMeta.banco_titular || 'Propietario';
          const propTel = fincaMeta.propietario_telefono || fincaMeta.whatsapp || '';
          const cliNombre = obtenerNombreClienteHistorico(r);
          const finNombre = fincaMeta.nombre || 'la finca';

          // Mensaje amigable y cercano pre-configurado para cobrar por WhatsApp
          const mensajeWhatsApp = `¡Hola ${propNombre}! 👋 ¿Cómo estás? ¿Qué tal estuvo la estadía de ${cliNombre} en ${finNombre}? Te escribo para cuadrar la comisión de esa reserva ($${montoComision.toLocaleString('es-CO')} COP). Me confirmas y te paso los daticos de mi cuenta. ¡Un abrazo!`;

          alertas.push({
            reservaId: r.id,
            consecutivo: r.consecutivo ? `#${r.consecutivo}` : `#${r.id.slice(0, 6)}`,
            fincaId: r.finca_id,
            fincaNombre: finNombre,
            propietarioNombre: propNombre,
            propietarioTelefono: propTel,
            clienteNombre: cliNombre,
            fechaInicio: r.fecha_inicio || '',
            fechaFin: r.fecha_fin || '',
            fechaFinLegible: formatFechaCorta(r.fecha_fin),
            subtotalAlojamiento,
            porcentajeComision: pct,
            montoComision,
            montoComisionFormateado: formatCOP(montoComision),
            diasDesdeSalida: Math.max(0, diasDesdeSalida),
            mensajeWhatsApp,
            reservaOriginal: r,
          });
        } else if (r.estado === 'activa' && r.fecha_inicio && r.fecha_inicio > hoyStr) {
          // Reservas futuras activas
          comisionesProyectadas += montoComision;
        }
      }
    });

    // Ordenar alertas: las salidas más recientes primero
    alertas.sort((a, b) => (b.fechaFin || '').localeCompare(a.fechaFin || ''));

    const resumen: ResumenComisionesBroker = {
      comisionesCobradas,
      comisionesPendientes,
      comisionesProyectadas,
      totalAlertasPendientes: alertas.length,
    };

    return { resumenComisiones: resumen, alertasComisionesPendientes: alertas };
  }, [reservas, hoyStr, comisionesCobradasIds]);

  // 6. RADAR COMPACTO DE LLEGADAS & FECHAS ACTIVAS CON CUENTA REGRESIVA
  const radarLlegadas: RadarLlegadaItem[] = useMemo(() => {
    const safeReservas = Array.isArray(reservas) ? reservas : [];

    return safeReservas
      .filter((r) => r && r.estado === 'activa' && r.fecha_fin && r.fecha_fin >= hoyStr)
      .sort((a, b) => (a.fecha_inicio || '').localeCompare(b.fecha_inicio || ''))
      .map((r) => {
        const fincaMeta = resolverMetadatosFinca(r.fincas || r.finca_snapshot, r.finca_id);
        const cliNombre = obtenerNombreClienteHistorico(r);
        const cliTel = r.clientes?.whatsapp || r.clientes?.telefono || r.cliente_snapshot?.whatsapp || '';

        const diasFaltantes = diferenciaEnDias(r.fecha_inicio, hoyStr);
        const esHoy = diasFaltantes === 0;
        const esManana = diasFaltantes === 1;
        const enCurso = r.fecha_inicio < hoyStr && r.fecha_fin >= hoyStr;

        let etiquetaCuentaRegresiva = `En ${diasFaltantes} días`;
        if (esHoy) etiquetaCuentaRegresiva = '🚨 LLEGA HOY';
        else if (esManana) etiquetaCuentaRegresiva = '⏰ MAÑANA';
        else if (enCurso) etiquetaCuentaRegresiva = '🟢 EN ESTANCIA';

        let numNoches = 1;
        if (r.fecha_inicio && r.fecha_fin) {
          const d1 = new Date(r.fecha_inicio + 'T00:00:00');
          const d2 = new Date(r.fecha_fin + 'T00:00:00');
          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            numNoches = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
          }
        }

        const tieneAlim = (r.costo_alimentacion || 0) > 0 || (!!r.alimentacion && r.alimentacion !== 'Sin alimentación') || !!r.menu_id;
        const menuNombre = r.menus?.nombre || r.alimentacion || 'Menú Especial';
        const comprasListas = r.alimentacion_compras_listas || comprasListasIds.has(r.id);

        return {
          id: r.id,
          consecutivo: r.consecutivo ? `#${r.consecutivo}` : `#${r.id.slice(0, 6)}`,
          fincaNombre: fincaMeta.nombre || 'Finca',
          clienteNombre: cliNombre,
          clienteTelefono: cliTel,
          personas: r.personas || 1,
          numNoches,
          fechaInicio: r.fecha_inicio || '',
          fechaFin: r.fecha_fin || '',
          diaMes: formatFechaCorta(r.fecha_inicio),
          diasFaltantes,
          etiquetaCuentaRegresiva,
          esHoy,
          esManana,
          enCurso,
          tieneAlimentacion: tieneAlim,
          menuNombre,
          costoAlimentacion: r.costo_alimentacion || 0,
          comprasAlimentacionListas: comprasListas,
          valorTotal: r.valor_total || 0,
          valorTotalFormateado: formatCOP(r.valor_total || 0),
          reservaOriginal: r,
        };
      });
  }, [reservas, hoyStr, comprasListasIds]);

  // 7. RADAR DE LOGÍSTICA GASTRONÓMICA: ALERTA DE COMPRAS DE MENÚS (Próximas 72h)
  const alertasComprasAlimentacion: AlertaCompraAlimentacion[] = useMemo(() => {
    return radarLlegadas
      .filter((item) => item.tieneAlimentacion && item.diasFaltantes >= 0 && item.diasFaltantes <= 3)
      .map((item) => ({
        reservaId: item.id,
        consecutivo: item.consecutivo,
        fincaNombre: item.fincaNombre,
        clienteNombre: item.clienteNombre,
        comensales: item.personas,
        menuNombre: item.menuNombre,
        fechaInicio: item.fechaInicio,
        diasFaltantes: item.diasFaltantes,
        comprasListas: item.comprasAlimentacionListas,
        reservaOriginal: item.reservaOriginal,
      }));
  }, [radarLlegadas]);

  // Total de reservas activas
  const totalReservasActivas = useMemo(() => {
    const safe = Array.isArray(reservas) ? reservas : [];
    return safe.filter((r) => r && r.estado === 'activa').length;
  }, [reservas]);

  // Fecha legible en español
  const fechaHoyLegible = useMemo(() => {
    try {
      const d = new Date();
      return d.toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Fecha del sistema';
    }
  }, []);

  // ─── ACCIONES Y HANDLERS ───────────────────────────────────────────────────

  const handleSincronizarEnVivo = useCallback(async () => {
    setSincronizando(true);
    try {
      if (recargarTodo) {
        await recargarTodo();
      }
      if (showToast) {
        showToast('✓ Base de datos sincronizada con éxito en tiempo real', 'success');
      }
    } catch (e) {
      if (showToast) {
        showToast('Error sincronizando datos con Supabase', 'error');
      }
    } finally {
      setSincronizando(false);
    }
  }, [recargarTodo, showToast]);

  const handleCambiarPeriodo = useCallback((nuevoPeriodo: DashboardPeriodo) => {
    setPeriodo(nuevoPeriodo);
  }, [setPeriodo]);

  const handleCambiarFinca = useCallback((nuevaFincaId: string) => {
    setFincaId(nuevaFincaId);
  }, [setFincaId]);

  const handleCambiarTab = useCallback((nuevaTab: DashboardTab) => {
    setTabActiva(nuevaTab);
  }, [setTabActiva]);

  const handleResetFiltros = useCallback(() => {
    resetFiltros();
  }, [resetFiltros]);

  // Marcar comisión como cobrada
  const handleMarcarComisionCobrada = useCallback(async (reservaId: string, cobrada = true) => {
    const nuevas = new Set(comisionesCobradasIds);
    if (cobrada) nuevas.add(reservaId);
    else nuevas.delete(reservaId);

    setComisionesCobradasIds(nuevas);
    guardarIdsStorage(STORAGE_COMISIONES_COBRADAS_KEY, nuevas);

    if (onGuardarReserva) {
      try {
        await onGuardarReserva({
          id: reservaId,
          comision_estado: cobrada ? 'cobrada' : 'pendiente',
          comision_fecha_cobro: cobrada ? new Date().toISOString() : null,
        });
      } catch (e) {
        // Persistencia garantizada en localStorage ante cualquier falla de red
      }
    }

    if (showToast) {
      showToast(cobrada ? '✓ Comisión marcada como cobrada exitosamente' : 'Comisión restaurada a pendiente', 'success');
    }
  }, [comisionesCobradasIds, onGuardarReserva, showToast]);

  // Marcar compras de alimentos como listas
  const handleMarcarComprasAlimentacion = useCallback(async (reservaId: string, listas = true) => {
    const nuevas = new Set(comprasListasIds);
    if (listas) nuevas.add(reservaId);
    else nuevas.delete(reservaId);

    setComprasListasIds(nuevas);
    guardarIdsStorage(STORAGE_COMPRAS_LISTAS_KEY, nuevas);

    if (onGuardarReserva) {
      try {
        await onGuardarReserva({
          id: reservaId,
          alimentacion_compras_listas: listas,
        });
      } catch (e) {
        // Fallback en localStorage
      }
    }

    if (showToast) {
      showToast(listas ? '✓ Logística de compras marcada como lista' : 'Compras marcadas como pendientes', 'info');
    }
  }, [comprasListasIds, onGuardarReserva, showToast]);

  // Abrir WhatsApp con el dueño para cobrar comisión
  const handleCobrarComisionWhatsApp = useCallback((alerta: BrokerAlertaComision) => {
    if (!alerta.propietarioTelefono) {
      if (showToast) {
        showToast(`No se encontró el teléfono del propietario de ${alerta.fincaNombre}. Configúralo en la finca.`, 'error');
      }
      return;
    }
    abrirWhatsApp(alerta.propietarioTelefono, alerta.mensajeWhatsApp);
    if (showToast) {
      showToast(`Abriendo chat con ${alerta.propietarioNombre} para cobrar comisión…`, 'info');
    }
  }, [showToast]);

  // Botón Maestro Unificado de Notificaciones
  const handleActivarNotificacionesMaster = useCallback(async () => {
    const res = await toggleMasterNotificaciones(showToast, () => navigateTo('dashboard'));
    setNotifPermiso(res.permiso);
    setSonidoActivo(res.soundEnabled);
  }, [showToast, navigateTo]);

  const filtrosModificados = useMemo(() => {
    return periodo !== 'mes_actual' || fincaId !== 'todas';
  }, [periodo, fincaId]);

  return {
    // Filtros & Estado UI
    periodo,
    fincaId,
    tabActiva,
    filtrosModificados,
    periodosOpciones: PERIODOS_OPCIONES,
    fincas: Array.isArray(fincas) ? fincas : [],
    fechaHoyLegible,
    sincronizando: sincronizando || globalLoading,

    // Métricas tradicionales (compatibilidad)
    metricas,
    totalReservasActivas,
    proximasLlegadas,

    // Series y Gráficos
    serieFinanzas,
    rendimientoFincas,
    embudoCotizaciones,

    // ===== NUEVAS HERRAMIENTAS DEL BROKER / PROMOTOR COMERCIAL =====
    resumenComisiones,
    alertasComisionesPendientes,
    radarLlegadas,
    alertasComprasAlimentacion,
    notifPermiso,
    sonidoActivo,

    // Handlers
    handleSincronizarEnVivo,
    handleCambiarPeriodo,
    handleCambiarFinca,
    handleCambiarTab,
    handleResetFiltros,
    handleMarcarComisionCobrada,
    handleMarcarComprasAlimentacion,
    handleCobrarComisionWhatsApp,
    handleActivarNotificacionesMaster,
    navigateTo,
    formatCOP,
  };
}

export type UseAdminOverviewControllerReturn = ReturnType<typeof useAdminOverviewController>;
