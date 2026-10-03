import { useApp } from '../context/AppContext';

export function useContenidoSitio() {
  const {
    contenidoSitio,
    loading,
    guardandoContenido,
    guardarContenido,
    restablecerContenido,
    recargarTodo,
  } = useApp();

  return {
    contenido: contenidoSitio,
    loading,
    guardando: guardandoContenido,
    guardarContenido,
    restablecerContenido,
    recargarContenido: recargarTodo,
  };
}
