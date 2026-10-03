import { useApp } from '../context/AppContext';
import type { Cliente } from '../types';

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
