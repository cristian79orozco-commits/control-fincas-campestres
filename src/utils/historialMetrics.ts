import groupBy from 'lodash/groupBy';
import sumBy from 'lodash/sumBy';
import orderBy from 'lodash/orderBy';
import countBy from 'lodash/countBy';
import round from 'lodash/round';
import type { Reserva, Finca } from '../types';
import { calcularSaldo, obtenerNombreFincaHistorico } from '../types';

export interface SerieHistorialTiempo {
  labels: string[];
  ingresos: number[];
  operaciones: number[];
}

export interface FincaHistorialItem {
  nombre: string;
  ingresos: number;
  operaciones: number;
}

export interface EstadosCierreData {
  labels: string[];
  data: number[];
  porcentajes: number[];
}

/**
 * Agrupa ingresos y reservas históricas en los últimos 6-12 meses
 */
export function generarSerieHistorialTiempo(reservas: Reserva[] = []): SerieHistorialTiempo {
  const safeReservas = Array.isArray(reservas) ? reservas : [];
  const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const hoy = new Date();
  const mesesLabels: string[] = [];
  const mesesClaves: string[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    mesesClaves.push(`${yyyy}-${mm}`);
    mesesLabels.push(`${mesesNombres[d.getMonth()]} ${yyyy.toString().slice(-2)}`);
  }

  const reservasPorMes = groupBy(safeReservas, (r) => {
    if (!r) return '';
    const f = r.fecha_cierre || r.fecha_inicio || r.created_at || '';
    return typeof f === 'string' ? f.slice(0, 7) : '';
  });

  const ingresos: number[] = [];
  const operaciones: number[] = [];

  mesesClaves.forEach((clave) => {
    const lista = reservasPorMes[clave] || [];
    let rec = 0;
    lista.forEach((r) => {
      if (!r) return;
      const saldo = calcularSaldo(r);
      rec += Math.max(0, (r.valor_total || 0) - saldo);
    });
    ingresos.push(rec);
    operaciones.push(lista.length);
  });

  return {
    labels: mesesLabels,
    ingresos,
    operaciones,
  };
}

/**
 * Calcula la recaudación histórica consolidada por finca
 */
export function generarDistribucionHistorialFincas(
  fincas: Finca[] = [],
  reservas: Reserva[] = []
): FincaHistorialItem[] {
  const safeReservas = Array.isArray(reservas) ? reservas : [];
  const agrupado = groupBy(safeReservas, (r) => obtenerNombreFincaHistorico(r) || 'Finca');

  const items: FincaHistorialItem[] = Object.keys(agrupado).map((nombreFinca) => {
    const lista = agrupado[nombreFinca] || [];
    let ingresos = 0;

    lista.forEach((r) => {
      const saldo = calcularSaldo(r);
      ingresos += Math.max(0, (r.valor_total || 0) - saldo);
    });

    return {
      nombre: nombreFinca,
      ingresos,
      operaciones: lista.length,
    };
  });

  return orderBy(items, ['ingresos', 'operaciones'], ['desc', 'desc']).slice(0, 7);
}

/**
 * Calcula la distribución porcentual de los estados de cierre
 */
export function generarDistribucionEstadosCierre(reservas: Reserva[] = []): EstadosCierreData {
  const safeReservas = Array.isArray(reservas) ? reservas : [];
  const total = safeReservas.length;

  if (total === 0) {
    return {
      labels: ['Completada', 'Cancelada', 'No Show', 'Activa'],
      data: [0, 0, 0, 0],
      porcentajes: [0, 0, 0, 0],
    };
  }

  const conteo = countBy(safeReservas, (r) => r.estado || 'activa');
  const completadas = conteo['completada'] || 0;
  const canceladas = conteo['cancelada'] || 0;
  const noShow = conteo['no_show'] || 0;
  const activas = conteo['activa'] || 0;

  const data = [completadas, canceladas, noShow, activas];
  const porcentajes = data.map((v) => round((v / total) * 100, 1));

  return {
    labels: ['Completadas (Éxito)', 'Canceladas', 'No Show', 'En Operación (Activas)'],
    data,
    porcentajes,
  };
}
