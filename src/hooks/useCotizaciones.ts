import { useApp } from '../context/AppContext';
import type { CotizacionDB, CotizacionEstado } from '../types';

export function useCotizaciones() {
  const {
    cotizaciones,
    loading,
    recargarTodo,
    guardarCotizacion,
    cambiarEstadoCotizacion,
    eliminarCotizacion,
  } = useApp();

  return {
    cotizaciones,
    loading,
    cargar: recargarTodo,
    guardar: guardarCotizacion,
    cambiarEstado: cambiarEstadoCotizacion,
    eliminar: eliminarCotizacion,
  };
}
