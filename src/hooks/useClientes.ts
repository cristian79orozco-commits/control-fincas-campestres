import { useApp } from '../context/AppContext';

export function useClientes() {
  const {
    clientes,
    loading,
    recargarTodo,
    guardarCliente,
    desactivarCliente,
  } = useApp();

  return {
    clientes,
    loading,
    cargar: recargarTodo,
    guardar: guardarCliente,
    desactivar: desactivarCliente,
  };
}
