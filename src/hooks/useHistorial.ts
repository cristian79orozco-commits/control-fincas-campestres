import { useState, useMemo } from 'react';
import type { Reserva, Finca, Cliente, FiltrosHistorial } from '../types';
import {
  calcularSaldo,
  obtenerNombreClienteHistorico,
  obtenerNombreFincaHistorico,
} from '../types';

export const FILTROS_HISTORIAL_DEFECTO: FiltrosHistorial = {
  busqueda: '',
  fechaDesde: '',
  fechaHasta: '',
  mes: 'todos',
  anio: 'todos',
  fincaId: 'todas',
  clienteId: 'todos',
  estado: 'todas',
};

export function useHistorial(
  reservas: Reserva[],
  fincas: Finca[],
  clientes: Cliente[]
) {
  const [filtros, setFiltros] = useState<FiltrosHistorial>(FILTROS_HISTORIAL_DEFECTO);

  // Años disponibles detectados en las reservas
  const aniosDisponibles = useMemo(() => {
    const aniosSet = new Set<string>();
    const anioActual = new Date().getFullYear().toString();
    aniosSet.add(anioActual);

    reservas.forEach(r => {
      if (r.fecha_inicio) aniosSet.add(r.fecha_inicio.slice(0, 4));
      if (r.fecha_fin) aniosSet.add(r.fecha_fin.slice(0, 4));
      if (r.fecha_cierre) aniosSet.add(r.fecha_cierre.slice(0, 4));
    });

    return Array.from(aniosSet).sort((a, b) => b.localeCompare(a));
  }, [reservas]);

  // Filtrado exhaustivo según los requerimientos de la Fase 6:
  // Fecha · Finca · Cliente · Estado · Mes · Año
  const reservasFiltradas = useMemo(() => {
    return reservas.filter(r => {
      // 1. Filtro por Estado
      if (filtros.estado !== 'todas') {
        if (r.estado !== filtros.estado) return false;
      }

      // 2. Filtro por Finca
      if (filtros.fincaId !== 'todas') {
        if (r.finca_id !== filtros.fincaId && r.finca_snapshot?.id !== filtros.fincaId) {
          return false;
        }
      }

      // 3. Filtro por Cliente
      if (filtros.clienteId !== 'todos') {
        if (r.cliente_id !== filtros.clienteId && r.cliente_snapshot?.id !== filtros.clienteId) {
          return false;
        }
      }

      // 4. Filtro por Año
      if (filtros.anio !== 'todos') {
        const anioReserva = (r.fecha_inicio || '').slice(0, 4);
        const anioCierre = (r.fecha_cierre || '').slice(0, 4);
        if (anioReserva !== filtros.anio && anioCierre !== filtros.anio) {
          return false;
        }
      }

      // 5. Filtro por Mes (01 - 12)
      if (filtros.mes !== 'todos') {
        const mesReserva = (r.fecha_inicio || '').slice(5, 7);
        const mesCierre = (r.fecha_cierre || '').slice(5, 7);
        if (mesReserva !== filtros.mes && mesCierre !== filtros.mes) {
          return false;
        }
      }

      // 6. Filtro por rango de fechas (desde / hasta)
      if (filtros.fechaDesde) {
        if ((r.fecha_fin || r.fecha_inicio) < filtros.fechaDesde) return false;
      }
      if (filtros.fechaHasta) {
        if (r.fecha_inicio > filtros.fechaHasta) return false;
      }

      // 7. Búsqueda por texto (búsqueda libre sobre nombres, notas, id)
      if (filtros.busqueda.trim()) {
        const q = filtros.busqueda.toLowerCase().trim();
        const cliNom = obtenerNombreClienteHistorico(r).toLowerCase();
        const finNom = obtenerNombreFincaHistorico(r).toLowerCase();
        const obs = (r.observaciones || '').toLowerCase();
        const notasCierre = (r.notas_cierre || '').toLowerCase();
        const idCorto = r.id.toLowerCase();

        const match =
          cliNom.includes(q) ||
          finNom.includes(q) ||
          obs.includes(q) ||
          notasCierre.includes(q) ||
          idCorto.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [reservas, filtros]);

  // Métricas históricas consolidadas
  const metricas = useMemo(() => {
    const total = reservasFiltradas.length;
    let recaudado = 0;
    let sumaNoches = 0;
    let sumaPersonas = 0;
    let completadas = 0;
    let canceladas = 0;
    let saldoPendiente = 0;

    reservasFiltradas.forEach(r => {
      const saldo = calcularSaldo(r);
      const pagado = r.valor_total - saldo;
      recaudado += pagado;
      saldoPendiente += Math.max(0, saldo);

      if (r.estado === 'completada') completadas++;
      if (r.estado === 'cancelada' || r.estado === 'no_show') canceladas++;

      sumaPersonas += r.personas || 1;

      if (r.fecha_inicio && r.fecha_fin) {
        const d1 = new Date(r.fecha_inicio).getTime();
        const d2 = new Date(r.fecha_fin).getTime();
        const noches = Math.max(1, Math.round((d2 - d1) / (1000 * 3600 * 24)));
        sumaNoches += noches;
      } else {
        sumaNoches += 1;
      }
    });

    const promedioNoches = total > 0 ? (sumaNoches / total).toFixed(1) : '0';
    const promedioPersonas = total > 0 ? Math.round(sumaPersonas / total) : 0;
    const tasaExito = total > 0 ? Math.round((completadas / total) * 100) : 0;

    return {
      total,
      recaudado,
      saldoPendiente,
      completadas,
      canceladas,
      promedioNoches,
      promedioPersonas,
      tasaExito,
    };
  }, [reservasFiltradas]);

  const limpiarFiltros = () => {
    setFiltros(FILTROS_HISTORIAL_DEFECTO);
  };

  return {
    filtros,
    setFiltros,
    limpiarFiltros,
    reservasFiltradas,
    aniosDisponibles,
    metricas,
  };
}
