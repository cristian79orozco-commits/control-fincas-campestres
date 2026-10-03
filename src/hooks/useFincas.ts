import { useApp } from '../context/AppContext';
import type { Finca } from '../types';

export function useFincas() {
  const {
    fincas,
    todasLasFincas,
    loading,
    guardarFinca,
    desactivarFinca,
    reactivarFinca,
    recargarTodo,
  } = useApp();

  return {
    fincas,
    todasLasFincas,
    loading,
    error: null,
    guardarFinca,
    desactivarFinca,
    reactivarFinca,
    recargarFincas: recargarTodo,
  };
}
