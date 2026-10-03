import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { BloqueoDisponibilidad } from '../types';

export function useDisponibilidad(fincaIdSeleccionada?: string | null) {
  const {
    bloquesAdmin,
    loading,
    marcarDiasAdmin,
    eliminarBloqueo,
    recargarTodo,
  } = useApp();

  const bloquesFinca = useMemo(() => {
    if (!fincaIdSeleccionada) return [];
    const hoy = new Date().toISOString().split('T')[0];
    return bloquesAdmin.filter(b => b.finca_id === fincaIdSeleccionada && b.fecha_fin >= hoy);
  }, [bloquesAdmin, fincaIdSeleccionada]);

  return {
    bloquesFinca,
    bloquesAdmin,
    loading,
    cargarDisponibilidadFinca: recargarTodo,
    cargarDisponibilidadAdmin: recargarTodo,
    marcarDiasAdmin,
    eliminarBloqueo,
  };
}
