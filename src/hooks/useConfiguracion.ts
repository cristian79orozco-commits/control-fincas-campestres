import { useApp } from '../context/AppContext';

export function useConfiguracion() {
  const {
    configuracion,
    loading,
    guardandoConfig,
    guardarConfiguracion,
    restablecerConfiguracion,
    recargarTodo,
  } = useApp();

  return {
    config: configuracion,
    loading,
    guardando: guardandoConfig,
    guardarConfiguracion,
    restablecerConfiguracion,
    recargarConfiguracion: recargarTodo,
  };
}
