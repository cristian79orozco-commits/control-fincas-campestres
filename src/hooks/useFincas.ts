import { useApp } from '../context/AppContext';

export function useFincas() {
  const {
    fincas,
    todasLasFincas,
    loading,
    guardarFinca,
    desactivarFinca,
    reactivarFinca,
    eliminarFinca,
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
    eliminarFinca,
    recargarFincas: recargarTodo,
  };
}
