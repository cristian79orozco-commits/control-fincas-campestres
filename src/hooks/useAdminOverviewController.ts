import { useState, useMemo, useCallback } from 'react';
import type { Finca, Cliente, CotizacionDB, Reserva, AdminSection, Menu as MenuType } from '../types';
import { useAdminDashboardStore, DashboardPeriodo, DashboardTab } from '../store/useAdminDashboardStore';
import { useApp } from '../context/AppContext';
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

  // 4. Próximas llegadas procesadas y listas para la vista operativa
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

  // Total de reservas activas totales registradas (para link en cabecera)
  const totalReservasActivas = useMemo(() => {
    const safe = Array.isArray(reservas) ? reservas : [];
    return safe.filter((r) => r && r.estado === 'activa').length;
  }, [reservas]);

  // 5. Fecha legible en español
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

  // 6. Handler memoizado de sincronización en tiempo real
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

    // Métricas KPI calculadas y memoizadas
    metricas,
    totalReservasActivas,

    // Series y Gráficos
    serieFinanzas,
    rendimientoFincas,
    embudoCotizaciones,

    // Agenda y Próximas Llegadas
    proximasLlegadas,

    // Acciones y Handlers
    handleSincronizarEnVivo,
    handleCambiarPeriodo,
    handleCambiarFinca,
    handleCambiarTab,
    handleResetFiltros,
    navigateTo,
    formatCOP,
  };
}

export type UseAdminOverviewControllerReturn = ReturnType<typeof useAdminOverviewController>;
