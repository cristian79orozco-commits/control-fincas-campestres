import { useState, useMemo, useCallback } from 'react';
import type { Cliente, Reserva, CotizacionDB, Finca } from '../types';
import { useDebounce } from './useDebounce';

export interface UseClientesControllerParams {
  clientes: Cliente[];
  reservas?: Reserva[];
  cotizaciones?: CotizacionDB[];
  fincas?: Finca[];
  onGuardar: (datos: Partial<Cliente>) => Promise<{ success: boolean; id?: string; error?: string }>;
  onDesactivar: (id: string) => Promise<{ success: boolean; error?: string }>;
  onEliminar?: (id: string) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const VACIO_CLIENTE: Partial<Cliente> = {
  nombre: '',
  apellido: '',
  telefono: '',
  whatsapp: '',
  correo: '',
  observaciones: '',
};

export function formatCOP(v: number): string {
  return '$' + (v || 0).toLocaleString('es-CO') + ' COP';
}

export function calcularNoches(inicio?: string | null, fin?: string | null): number {
  if (!inicio || !fin) return 0;
  const d1 = new Date(inicio);
  const d2 = new Date(fin);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

export interface ClienteEnriquecido {
  cliente: Cliente;
  reservas: Reserva[];
  cotizaciones: CotizacionDB[];
  consecutivos: string[];
  fincaNombre: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  menuNombre: string | null;
  personas: number | null;
  totalEstimado: number | null;
  totalGastado: number;
  reservasActivas: number;
  reservasCerradas: number;
  esRecurrente: boolean;
  esNuevoWeb: boolean;
}

/**
 * Controller Hook desacoplado para AdminClientes.
 * Implementa debounce de 250ms en la barra de búsqueda y memoización intensiva
 * del mapeo histórico y filtrado para garantizar una tasa constante de 60 FPS.
 */
export function useClientesController({
  clientes = [],
  reservas = [],
  cotizaciones = [],
  fincas = [],
  onGuardar,
  onDesactivar,
  onEliminar,
  showToast,
  openConfirm,
}: UseClientesControllerParams) {
  const [form, setForm] = useState<Partial<Cliente>>(VACIO_CLIENTE);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Barra de búsqueda con respuesta inmediata al teclado (<16ms)
  const [busqueda, setBusqueda] = useState('');
  // Debounce de 250ms para el cálculo de filtrado a 60 FPS
  const busquedaDebounced = useDebounce(busqueda, 250);

  const [clienteDetalleId, setClienteDetalleId] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const abrirNuevo = useCallback(() => {
    setForm(VACIO_CLIENTE);
    setEditando(true);
  }, []);

  const abrirEdicion = useCallback((c: Cliente) => {
    setForm({ ...c });
    setEditando(true);
  }, []);

  const cerrar = useCallback(() => {
    setForm(VACIO_CLIENTE);
    setEditando(false);
  }, []);

  const copiarConsecutivo = useCallback(async (consecutivo: string) => {
    try {
      await navigator.clipboard.writeText(consecutivo);
      setCopiadoId(consecutivo);
      showToast(`Consecutivo ${consecutivo} copiado al portapapeles`, 'success');
      setTimeout(() => setCopiadoId(null), 1800);
    } catch {
      showToast(`Código: ${consecutivo}`, 'info');
    }
  }, [showToast]);

  const handleGuardar = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre?.trim()) {
      showToast('El nombre es obligatorio', 'error');
      return;
    }
    setGuardando(true);
    const res = await onGuardar(form);
    setGuardando(false);
    if (res.success) {
      showToast(form.id ? 'Cliente actualizado ✅' : 'Cliente creado ✅', 'success');
      cerrar();
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  }, [form, onGuardar, showToast, cerrar]);

  const handleEliminar = useCallback((c: Cliente) => {
    openConfirm(
      '¿Eliminar cliente definitivamente?',
      `El cliente "${c.nombre} ${c.apellido || ''}" será eliminado de la base de datos y de la caché local. Esta acción es permanente.`,
      async () => {
        if (onEliminar) {
          const res = await onEliminar(c.id);
          if (res.success) showToast('Cliente eliminado definitivamente ✅', 'success');
          else showToast(`Error: ${res.error}`, 'error');
        } else {
          const res = await onDesactivar(c.id);
          if (res.success) showToast('Cliente desactivado', 'info');
          else showToast(`Error: ${res.error}`, 'error');
        }
      }
    );
  }, [openConfirm, onEliminar, onDesactivar, showToast]);

  // Mapeo enriquecido de clientes con sus consecutivos, historial y detalles de cotización
  const clientesConHistorial = useMemo<ClienteEnriquecido[]>(() => {
    return clientes.map(c => {
      const reservasCliente = reservas.filter(r => r.cliente_id === c.id);
      const cotizacionesCliente = cotizaciones.filter(cot => cot.cliente_id === c.id);

      // Consecutivos únicos del cliente (limpios de letras)
      const consecutivosList: string[] = [];
      reservasCliente.forEach(r => {
        if (r.consecutivo) {
          const limp = r.consecutivo.match(/\d+/g)?.join('') || r.consecutivo.replace(/^[A-Za-z\-]+/, '');
          if (limp && !consecutivosList.includes(limp)) consecutivosList.push(limp);
        }
      });
      cotizacionesCliente.forEach(cot => {
        if (cot.consecutivo) {
          const limp = cot.consecutivo.match(/\d+/g)?.join('') || cot.consecutivo.replace(/^[A-Za-z\-]+/, '');
          if (limp && !consecutivosList.includes(limp)) consecutivosList.push(limp);
        }
      });

      // Última cotización o reserva para extraer Finca, Días y Menú
      const ultimaCot = cotizacionesCliente[0] || null;
      const ultimaRes = reservasCliente[0] || null;

      const fincaId = ultimaCot?.finca_id || ultimaRes?.finca_id;
      const fincaObj = fincas.find(f => f.id === fincaId);
      const fincaNombre = ultimaCot?.fincas?.nombre || ultimaRes?.fincas?.nombre || fincaObj?.nombre || (fincaId ? 'Finca Campestre' : null);

      const fechaInicio = ultimaCot?.fecha_inicio || ultimaRes?.fecha_inicio || null;
      const fechaFin = ultimaCot?.fecha_fin || ultimaRes?.fecha_fin || null;
      const menuNombre = ultimaCot?.alimentacion || ultimaRes?.alimentacion || null;
      const personas = ultimaCot?.personas || ultimaRes?.personas || null;
      const totalEstimado = ultimaCot?.total || ultimaRes?.valor_total || null;

      const totalGastado = reservasCliente.reduce((acc, r) => acc + (r.valor_total || 0), 0);
      const reservasActivas = reservasCliente.filter(r => r.estado === 'activa').length;
      const reservasCerradas = reservasCliente.filter(r => r.estado === 'completada').length;

      return {
        cliente: c,
        reservas: reservasCliente,
        cotizaciones: cotizacionesCliente,
        consecutivos: consecutivosList,
        fincaNombre,
        fechaInicio,
        fechaFin,
        menuNombre,
        personas,
        totalEstimado,
        totalGastado,
        reservasActivas,
        reservasCerradas,
        esRecurrente: reservasCliente.length > 1,
        esNuevoWeb: Boolean(c.observaciones?.includes('Cotizador Web')),
      };
    });
  }, [clientes, reservas, cotizaciones, fincas]);

  // Filtrado memoizado optimizado con término con debounce de 250ms
  const filtrados = useMemo(() => {
    const q = busquedaDebounced.toLowerCase().trim();
    if (!q) return clientesConHistorial;

    return clientesConHistorial.filter(item => {
      const c = item.cliente;
      const nombreCompleto = `${c.nombre} ${c.apellido || ''}`.toLowerCase();
      const tel = (c.telefono || '').toLowerCase();
      const wa = (c.whatsapp || '').toLowerCase();
      const correo = (c.correo || '').toLowerCase();
      const finca = (item.fincaNombre || '').toLowerCase();
      const coincideConsecutivo = item.consecutivos.some(cons => cons.toLowerCase().includes(q));

      return (
        nombreCompleto.includes(q) ||
        tel.includes(q) ||
        wa.includes(q) ||
        correo.includes(q) ||
        finca.includes(q) ||
        coincideConsecutivo
      );
    });
  }, [clientesConHistorial, busquedaDebounced]);

  const clienteSeleccionado = useMemo(() => {
    if (!clienteDetalleId) return null;
    return clientesConHistorial.find(item => item.cliente.id === clienteDetalleId) || null;
  }, [clientesConHistorial, clienteDetalleId]);

  return {
    clientes,
    clientesConHistorial,
    filtrados,
    clienteSeleccionado,

    // Búsqueda y Debounce
    busqueda,
    setBusqueda,
    busquedaDebounced,

    // Formulario y Modales
    form,
    setForm,
    editando,
    guardando,
    abrirNuevo,
    abrirEdicion,
    cerrar,
    handleGuardar,

    // Detalle / Expediente
    clienteDetalleId,
    setClienteDetalleId,

    // Acciones adicionales
    copiadoId,
    copiarConsecutivo,
    handleEliminar,
  };
}

export type UseClientesControllerReturn = ReturnType<typeof useClientesController>;
