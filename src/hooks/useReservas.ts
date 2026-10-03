import { useApp } from '../context/AppContext';
import type { Reserva, ReservaEstado, PagoTipo, CierreReserva } from '../types';

export function useReservas() {
  const {
    reservas,
    loading,
    recargarTodo,
    guardarReserva,
    cambiarEstadoReserva,
    cerrarReserva,
    reabrirReserva,
    eliminarReserva,
    registrarPago,
    eliminarPago,
    metricasReservas,
  } = useApp();

  return {
    reservas,
    loading,
    cargar: recargarTodo,
    guardar: guardarReserva,
    cambiarEstado: cambiarEstadoReserva,
    cerrarReserva,
    reabrirReserva,
    eliminar: eliminarReserva,
    registrarPago,
    eliminarPago,
    metricas: metricasReservas,
  };
}
