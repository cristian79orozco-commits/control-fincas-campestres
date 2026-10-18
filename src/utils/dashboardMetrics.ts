import groupBy from 'lodash/groupBy';
import sumBy from 'lodash/sumBy';
import orderBy from 'lodash/orderBy';
import countBy from 'lodash/countBy';
import round from 'lodash/round';
import type { Reserva, CotizacionDB, Finca } from '../types';
import { desglosarFinanzasReserva } from '../types';
import type { DashboardPeriodo } from '../store/useAdminDashboardStore';

export interface MetricasKPIResumen {
  ingresosTotalesRecaudados: number;
  ingresosHospedaje: number;
  ingresosAlimentacionAdmin: number;
  totalSaldoPendiente: number;
  saldoPendienteFincasDueños: number;
  saldoPendienteAdminAlimentacion: number;
  reservasActivas: number;
  reservasTotal: number;
  llegadasHoy: number;
  salidasHoy: number;
  cotizacionesPendientes: number;
  cotizacionesTotal: number;
  tasaConversionCotizaciones: number;
  ticketPromedio: number;
  totalHuespedes: number;
  totalComensales: number;
  alimentacionCobrada: number;
  alimentacionPorCobrar: number;
  alimentacionProyeccionCotiz: number;
}

export interface SerieMensualFinanzas {
  labels: string[];
  alojamiento: number[];
  alimentacion: number[];
  saldosPendientes: number[];
}

export interface RendimientoFincaItem {
  id: string;
  nombre: string;
  totalIngresos: number;
  reservasCount: number;
  nochesTotal: number;
  ticketPromedio: number;
}

export interface EmbudoCotizacionesData {
  labels: string[];
  data: number[];
  porcentajes: number[];
  total: number;
  tasaConversion: number;
}

/**
 * Obtiene la fecha ISO local en formato YYYY-MM-DD
 */
export function getFechaHoyLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Filtra colecciones de reservas y cotizaciones por el periodo y finca seleccionados
 */
export function filtrarDatosPorPeriodoYFinca(
  reservas: Reserva[] = [],
  cotizaciones: CotizacionDB[] = [],
  periodo: DashboardPeriodo = 'mes_actual',
  fincaId: string = 'todas'
) {
  const safeReservas = Array.isArray(reservas) ? reservas : [];
  const safeCotizaciones = Array.isArray(cotizaciones) ? cotizaciones : [];

  const hoyStr = getFechaHoyLocal();
  const hoyDate = new Date(hoyStr + 'T00:00:00');

  // Filtro por finca
  const reservasFinca = fincaId === 'todas'
    ? safeReservas
    : safeReservas.filter(r => r && r.finca_id === fincaId);

  const cotizacionesFinca = fincaId === 'todas'
    ? safeCotizaciones
    : safeCotizaciones.filter(c => c && c.finca_id === fincaId);

  // Si es todos, retornar directamente
  if (periodo === 'todos') {
    return { reservas: reservasFinca, cotizaciones: cotizacionesFinca };
  }

  const calcularEstaEnRango = (fechaStr?: string | null): boolean => {
    if (!fechaStr || typeof fechaStr !== 'string') return false;
    const fStr = fechaStr.slice(0, 10);
    const fDate = new Date(fStr + 'T00:00:00');
    if (isNaN(fDate.getTime())) return false;
    const diffDias = Math.floor((hoyDate.getTime() - fDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (periodo) {
      case 'hoy':
        return fStr === hoyStr;
      case '7dias':
        return diffDias >= 0 && diffDias <= 7;
      case '30dias':
        return diffDias >= 0 && diffDias <= 30;
      case 'mes_actual': {
        const mesActual = hoyStr.slice(0, 7);
        return fStr.startsWith(mesActual);
      }
      case 'ano_actual': {
        const anoActual = hoyStr.slice(0, 4);
        return fStr.startsWith(anoActual);
      }
      default:
        return true;
    }
  };

  const reservasFiltradas = reservasFinca.filter(r => {
    return r && (calcularEstaEnRango(r.fecha_inicio) || calcularEstaEnRango(r.created_at));
  });

  const cotizacionesFiltradas = cotizacionesFinca.filter(c => {
    return c && (calcularEstaEnRango(c.fecha_inicio) || calcularEstaEnRango(c.created_at));
  });

  return { reservas: reservasFiltradas, cotizaciones: cotizacionesFiltradas };
}

/**
 * Calcula todas las métricas ejecutivas consolidadas del Dashboard
 */
export function calcularMetricasDashboard(
  reservas: Reserva[] = [],
  cotizaciones: CotizacionDB[] = [],
  metricasReservasProp?: { total: number; activas: number; llegasHoy: number; salenHoy: number }
): MetricasKPIResumen {
  const safeReservas = Array.isArray(reservas) ? reservas : [];
  const safeCotizaciones = Array.isArray(cotizaciones) ? cotizaciones : [];
  const hoyStr = getFechaHoyLocal();

  let ingresosHospedaje = 0;
  let ingresosAlimentacionAdmin = 0;
  let saldoPendienteFincasDueños = 0;
  let saldoPendienteAdminAlimentacion = 0;
  let totalHuespedes = 0;
  let totalComensales = 0;

  let llegadasHoy = metricasReservasProp?.llegasHoy ?? 0;
  let salidasHoy = metricasReservasProp?.salenHoy ?? 0;
  let reservasActivas = 0;

  safeReservas.forEach((r) => {
    if (!r) return;
    try {
      const fin = desglosarFinanzasReserva(r);
      ingresosHospedaje += (fin.pagadoFinca || 0);
      ingresosAlimentacionAdmin += (fin.pagadoAlimentacion || 0);

      if (r.estado === 'activa') {
        reservasActivas++;
        saldoPendienteFincasDueños += (fin.saldoFincaCheckIn || 0);
        saldoPendienteAdminAlimentacion += (fin.saldoAlimentacionAdmin || 0);

        if (!metricasReservasProp) {
          if (r.fecha_inicio === hoyStr) llegadasHoy++;
          if (r.fecha_fin === hoyStr) salidasHoy++;
        }
      }

      if (['activa', 'completada'].includes(r.estado)) {
        totalHuespedes += (r.personas || 1);
        if ((r.costo_alimentacion || 0) > 0 || (r.alimentacion && r.alimentacion !== 'Sin alimentación')) {
          totalComensales += (r.personas || 1);
        }
      }
    } catch (e) {
      console.warn('[dashboardMetrics] Error procesando finanzas de reserva:', e);
    }
  });

  const ingresosTotalesRecaudados = ingresosHospedaje + ingresosAlimentacionAdmin;
  const totalSaldoPendiente = saldoPendienteFincasDueños + saldoPendienteAdminAlimentacion;

  const cotizacionesPendientes = safeCotizaciones.filter((c) =>
    c && ['borrador', 'cotizada', 'pendiente'].includes(c.estado)
  ).length;

  const cotizacionesConfirmadas = safeCotizaciones.filter((c) => c && c.estado === 'confirmada').length;
  const tasaConversionCotizaciones = safeCotizaciones.length > 0
    ? round((cotizacionesConfirmadas / safeCotizaciones.length) * 100, 1)
    : 0;

  const reservasEfectivas = safeReservas.filter((r) => r && ['activa', 'completada'].includes(r.estado));
  const ticketPromedio = reservasEfectivas.length > 0
    ? round(sumBy(reservasEfectivas, (r) => r.valor_total || 0) / reservasEfectivas.length)
    : 0;

  const alimentacionProyeccionCotiz = safeCotizaciones
    .filter((c) => c && ['borrador', 'cotizada', 'pendiente'].includes(c.estado))
    .reduce((acc, c) => acc + (c.costo_alimentacion || 0), 0);

  return {
    ingresosTotalesRecaudados,
    ingresosHospedaje,
    ingresosAlimentacionAdmin,
    totalSaldoPendiente,
    saldoPendienteFincasDueños,
    saldoPendienteAdminAlimentacion,
    reservasActivas: metricasReservasProp?.activas ?? reservasActivas,
    reservasTotal: metricasReservasProp?.total ?? safeReservas.length,
    llegadasHoy,
    salidasHoy,
    cotizacionesPendientes,
    cotizacionesTotal: safeCotizaciones.length,
    tasaConversionCotizaciones,
    ticketPromedio,
    totalHuespedes,
    totalComensales,
    alimentacionCobrada: ingresosAlimentacionAdmin,
    alimentacionPorCobrar: saldoPendienteAdminAlimentacion,
    alimentacionProyeccionCotiz,
  };
}

/**
 * Genera la serie cronológica mensual para el gráfico combinado de Chart.js
 */
export function generarSerieMensualFinanzas(reservas: Reserva[] = []): SerieMensualFinanzas {
  const safeReservas = Array.isArray(reservas) ? reservas : [];
  const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const hoy = new Date();
  const mesesLabels: string[] = [];
  const mesesClaves: string[] = [];

  // Últimos 6 meses
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    mesesClaves.push(`${yyyy}-${mm}`);
    mesesLabels.push(`${mesesNombres[d.getMonth()]} ${yyyy.toString().slice(-2)}`);
  }

  // Agrupar reservas por mes
  const reservasPorMes = groupBy(safeReservas, (r) => {
    if (!r) return '';
    const f = r.fecha_inicio || r.created_at || '';
    return typeof f === 'string' ? f.slice(0, 7) : '';
  });

  const alojamiento: number[] = [];
  const alimentacion: number[] = [];
  const saldosPendientes: number[] = [];

  mesesClaves.forEach((clave) => {
    const lista = reservasPorMes[clave] || [];
    let pagadoAloja = 0;
    let pagadoAlim = 0;
    let saldoTotal = 0;

    lista.forEach((r) => {
      if (!r) return;
      try {
        const fin = desglosarFinanzasReserva(r);
        pagadoAloja += (fin.pagadoFinca || 0);
        pagadoAlim += (fin.pagadoAlimentacion || 0);
        if (r.estado === 'activa') {
          saldoTotal += (fin.saldoConsolidado || 0);
        }
      } catch (e) {
        // Ignorar reserva corrupta
      }
    });

    alojamiento.push(pagadoAloja);
    alimentacion.push(pagadoAlim);
    saldosPendientes.push(saldoTotal);
  });

  return {
    labels: mesesLabels,
    alojamiento,
    alimentacion,
    saldosPendientes,
  };
}

/**
 * Calcula el rendimiento comparativo por cada Finca
 */
export function calcularRendimientoFincas(fincas: Finca[] = [], reservas: Reserva[] = []): RendimientoFincaItem[] {
  const safeFincas = Array.isArray(fincas) ? fincas : [];
  const safeReservas = Array.isArray(reservas) ? reservas : [];
  const reservasPorFinca = groupBy(safeReservas, 'finca_id');

  const rendimiento = safeFincas.map((f) => {
    const lista = reservasPorFinca[f.id] || [];
    const efectivas = lista.filter((r) => r && ['activa', 'completada'].includes(r.estado));

    let totalIngresos = 0;
    let nochesTotal = 0;

    efectivas.forEach((r) => {
      try {
        const fin = desglosarFinanzasReserva(r);
        totalIngresos += (fin.subtotalAlojamiento || 0);

        if (r.fecha_inicio && r.fecha_fin) {
          const d1 = new Date(r.fecha_inicio + 'T00:00:00');
          const d2 = new Date(r.fecha_fin + 'T00:00:00');
          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            const diff = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
            nochesTotal += diff;
          } else {
            nochesTotal += 1;
          }
        } else {
          nochesTotal += 1;
        }
      } catch (e) {
        nochesTotal += 1;
      }
    });

    const ticketPromedio = efectivas.length > 0 ? round(totalIngresos / efectivas.length) : 0;

    return {
      id: f.id,
      nombre: f.nombre || 'Finca',
      totalIngresos,
      reservasCount: efectivas.length,
      nochesTotal,
      ticketPromedio,
    };
  });

  return orderBy(rendimiento, ['totalIngresos', 'reservasCount'], ['desc', 'desc']);
}

/**
 * Calcula la distribución y embudo de conversión de cotizaciones
 */
export function calcularEmbudoCotizaciones(cotizaciones: CotizacionDB[] = []): EmbudoCotizacionesData {
  const safeCotizaciones = Array.isArray(cotizaciones) ? cotizaciones : [];
  const total = safeCotizaciones.length;
  if (total === 0) {
    return {
      labels: ['Borrador', 'Cotizada', 'Pendiente', 'Confirmada', 'Rechazada'],
      data: [0, 0, 0, 0, 0],
      porcentajes: [0, 0, 0, 0, 0],
      total: 0,
      tasaConversion: 0,
    };
  }

  const conteo = countBy(safeCotizaciones, 'estado');
  const borrador = conteo['borrador'] || 0;
  const cotizada = conteo['cotizada'] || 0;
  const pendiente = conteo['pendiente'] || 0;
  const confirmada = conteo['confirmada'] || 0;
  const rechazada = conteo['rechazada'] || 0;

  const data = [borrador, cotizada, pendiente, confirmada, rechazada];
  const porcentajes = data.map((val) => round((val / total) * 100, 1));
  const tasaConversion = round((confirmada / total) * 100, 1);

  return {
    labels: ['Borrador', 'Cotizada', 'Pendiente', 'Confirmada (Ganada)', 'Rechazada'],
    data,
    porcentajes,
    total,
    tasaConversion,
  };
}
