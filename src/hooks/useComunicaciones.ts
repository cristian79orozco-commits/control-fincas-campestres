import { useApp } from '../context/AppContext';

export function useComunicaciones() {
  const {
    comunicaciones,
    registrarComunicacion,
    limpiarHistorialComunicaciones,
    recargarTodo,
  } = useApp();

  return {
    comunicaciones,
    cargando: false,
    registrarComunicacion,
    limpiarHistorial: limpiarHistorialComunicaciones,
    recargar: recargarTodo,
  };
}
