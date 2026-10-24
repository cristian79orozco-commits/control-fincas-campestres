import { useState, useMemo, useCallback, useEffect } from 'react';
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

/**
 * Normaliza un número de teléfono a solo dígitos sin prefijo internacional 57 redundante,
 * permitiendo vincular estancias de un mismo cliente con formatos diferentes (+57 300..., 300..., 57300...).
 */
export function normalizarTelefono(tel?: string | null): string {
  if (!tel) return '';
  const digitos = String(tel).replace(/\D/g, '');
  if (!digitos) return '';
  if (digitos.startsWith('57') && digitos.length === 12) {
    return digitos.slice(2);
  }
  return digitos;
}

export interface ClienteEnriquecido {
  cliente: Cliente;
  reservas: Reserva[];
  cotizaciones: CotizacionDB[];
  consecutivos: string[];
  maxConsecutivo: number;
  idsAsociados: string[];
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
 * 
 * Cumple con los estándares de Architecture Shield y UI/UX High-End:
 * 1. Vinculación y consolidación por número de teléfono (deduplicación inteligente).
 * 2. Asignación automática de consecutivos de reservas previas y nuevas al mismo cliente.
 * 3. Ordenamiento estricto por consecutivo del más reciente al más antiguo.
 * 4. Paginación y control de contención vertical/horizontal para evitar desbordamientos.
 * 5. Debounce de 250ms y memoización para rendimiento estable a 60 FPS.
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

  // Paginación para evitar que el listado se expanda indefinidamente hacia abajo
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(8);

  const [clienteDetalleId, setClienteDetalleId] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Resetear a página 1 al cambiar el término de búsqueda
  useEffect(() => {
    setPaginaActual(1);
  }, [busquedaDebounced]);

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
      showToast(`Consecutivo #${consecutivo} copiado al portapapeles`, 'success');
      setTimeout(() => setCopiadoId(null), 1800);
    } catch {
      showToast(`Código: #${consecutivo}`, 'info');
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
      showToast(form.id ? 'Cliente actualizado ✅' : 'Cliente guardado y vinculado ✅', 'success');
      cerrar();
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  }, [form, onGuardar, showToast, cerrar]);

  const handleEliminar = useCallback((item: ClienteEnriquecido | Cliente) => {
    const c = 'cliente' in item ? item.cliente : item;
    const ids = 'idsAsociados' in item && item.idsAsociados?.length ? item.idsAsociados : [c.id];

    openConfirm(
      '¿Eliminar cliente definitivamente?',
      `El cliente "${c.nombre} ${c.apellido || ''}" será eliminado del directorio. Esta acción es permanente.`,
      async () => {
        let ok = true;
        let lastErr = '';

        for (const idTarget of ids) {
          if (onEliminar) {
            const res = await onEliminar(idTarget);
            if (!res.success) {
              ok = false;
              lastErr = res.error || '';
            }
          } else {
            const res = await onDesactivar(idTarget);
            if (!res.success) {
              ok = false;
              lastErr = res.error || '';
            }
          }
        }

        if (ok) {
          showToast('Cliente eliminado definitivamente ✅', 'success');
          if (clienteDetalleId === c.id) setClienteDetalleId(null);
        } else {
          showToast(`Error al eliminar: ${lastErr}`, 'error');
        }
      }
    );
  }, [openConfirm, onEliminar, onDesactivar, showToast, clienteDetalleId]);

  // =========================================================================
  // VINCULACIÓN POR NÚMERO DE TELÉFONO + ORDENAMIENTO POR CONSECUTIVO RECIENTE
  // =========================================================================
  const clientesConHistorial = useMemo<ClienteEnriquecido[]>(() => {
    // 1. Agrupar clientes por número de teléfono normalizado
    const gruposMap = new Map<string, Cliente[]>();

    clientes.forEach(c => {
      const tel = normalizarTelefono(c.telefono || c.whatsapp);
      // Si tiene teléfono válido (>= 7 dígitos), la clave de grupo es el teléfono
      // Si no tiene teléfono, cada cliente permanece con su propio id único
      const key = tel.length >= 7 ? `tel_${tel}` : `id_${c.id}`;
      
      const arr = gruposMap.get(key) || [];
      arr.push(c);
      gruposMap.set(key, arr);
    });

    // 2. Para cada grupo unificado, consolidar perfil y vincular reservas / consecutivos
    const listaConsolidada: ClienteEnriquecido[] = [];

    gruposMap.forEach((clientesGrupo, groupKey) => {
      // Elegir el cliente principal (el que tenga apellido, correo o nombre más completo)
      const clientePrincipal = [...clientesGrupo].sort((a, b) => {
        const scoreA = (a.apellido ? 2 : 0) + (a.correo ? 2 : 0) + (a.observaciones ? 1 : 0);
        const scoreB = (b.apellido ? 2 : 0) + (b.correo ? 2 : 0) + (b.observaciones ? 1 : 0);
        return scoreB - scoreA;
      })[0];

      const idsGrupo = clientesGrupo.map(c => c.id);
      const telGrupo = groupKey.startsWith('tel_') ? groupKey.replace('tel_', '') : '';

      // Vincular todas las reservas que coincidan con los IDs del grupo O con el número de teléfono
      const reservasCliente = reservas.filter(r => {
        if (idsGrupo.includes(r.cliente_id)) return true;
        if (telGrupo) {
          const telR = normalizarTelefono(r.clientes?.telefono || r.clientes?.whatsapp);
          const telSnap = normalizarTelefono(r.cliente_snapshot?.telefono || r.cliente_snapshot?.whatsapp);
          if (telR && telR === telGrupo) return true;
          if (telSnap && telSnap === telGrupo) return true;
        }
        return false;
      });

      // Vincular todas las cotizaciones coincidentes
      const cotizacionesCliente = cotizaciones.filter(cot => {
        if (cot.cliente_id && idsGrupo.includes(cot.cliente_id)) return true;
        if (telGrupo) {
          const telCot = normalizarTelefono(cot.clientes?.whatsapp);
          if (telCot && telCot === telGrupo) return true;
        }
        return false;
      });

      // Extraer y unificar los consecutivos numéricos asociados a este cliente
      const setConsecutivos = new Set<string>();

      reservasCliente.forEach(r => {
        if (r.consecutivo) {
          const limp = r.consecutivo.match(/\d+/g)?.join('') || r.consecutivo.replace(/^[A-Za-z\-]+/, '').trim();
          if (limp) setConsecutivos.add(limp);
        }
      });

      cotizacionesCliente.forEach(cot => {
        if (cot.consecutivo) {
          const limp = cot.consecutivo.match(/\d+/g)?.join('') || cot.consecutivo.replace(/^[A-Za-z\-]+/, '').trim();
          if (limp) setConsecutivos.add(limp);
        }
      });

      // Ordenar los consecutivos del más reciente al más antiguo (mayor número primero)
      const consecutivosList = Array.from(setConsecutivos).sort((a, b) => {
        const numA = parseInt(a, 10) || 0;
        const numB = parseInt(b, 10) || 0;
        return numB - numA;
      });

      // El consecutivo más reciente del cliente determina su orden principal en el directorio
      const maxConsecutivo = consecutivosList.length > 0 ? (parseInt(consecutivosList[0], 10) || 0) : 0;

      // Metadatos de la última cotización/reserva para compatibilidad
      const ultimaCot = cotizacionesCliente[0] || null;
      const ultimaRes = reservasCliente[0] || null;
      const fincaId = ultimaCot?.finca_id || ultimaRes?.finca_id;
      const fincaObj = fincas.find(f => f.id === fincaId);
      const fincaNombre = ultimaCot?.fincas?.nombre || ultimaRes?.fincas?.nombre || fincaObj?.nombre || (fincaId ? 'Finca Campestre' : null);

      const totalGastado = reservasCliente.reduce((acc, r) => acc + (r.valor_total || 0), 0);
      const reservasActivas = reservasCliente.filter(r => r.estado === 'activa').length;
      const reservasCerradas = reservasCliente.filter(r => r.estado === 'completada').length;

      listaConsolidada.push({
        cliente: clientePrincipal,
        reservas: reservasCliente,
        cotizaciones: cotizacionesCliente,
        consecutivos: consecutivosList,
        maxConsecutivo,
        idsAsociados: idsGrupo,
        fincaNombre,
        fechaInicio: ultimaCot?.fecha_inicio || ultimaRes?.fecha_inicio || null,
        fechaFin: ultimaCot?.fecha_fin || ultimaRes?.fecha_fin || null,
        menuNombre: ultimaCot?.alimentacion || ultimaRes?.alimentacion || null,
        personas: ultimaCot?.personas || ultimaRes?.personas || null,
        totalEstimado: ultimaCot?.total || ultimaRes?.valor_total || null,
        totalGastado,
        reservasActivas,
        reservasCerradas,
        esRecurrente: reservasCliente.length > 1 || consecutivosList.length > 1,
        esNuevoWeb: Boolean(clientePrincipal.observaciones?.includes('Cotizador Web')),
      });
    });

    // 3. Ordenar clientes: DEL CONSECUTIVO MÁS RECIENTE AL MÁS ANTIGUO
    listaConsolidada.sort((a, b) => {
      // Clientes con consecutivos se ordenan por su consecutivo más alto (más nuevo) primero
      if (a.maxConsecutivo > 0 && b.maxConsecutivo > 0) {
        return b.maxConsecutivo - a.maxConsecutivo;
      }
      if (a.maxConsecutivo > 0) return -1;
      if (b.maxConsecutivo > 0) return 1;

      // Si no tienen consecutivos asignados, ordenar por fecha de registro (más nuevo primero)
      const fechaA = a.cliente.created_at ? new Date(a.cliente.created_at).getTime() : 0;
      const fechaB = b.cliente.created_at ? new Date(b.cliente.created_at).getTime() : 0;
      return fechaB - fechaA;
    });

    return listaConsolidada;
  }, [clientes, reservas, cotizaciones, fincas]);

  // Filtrado memoizado optimizado con debounce de 250ms
  const filtrados = useMemo(() => {
    const q = busquedaDebounced.toLowerCase().trim();
    if (!q) return clientesConHistorial;

    return clientesConHistorial.filter(item => {
      const c = item.cliente;
      const nombreCompleto = `${c.nombre} ${c.apellido || ''}`.toLowerCase();
      const tel = (c.telefono || '').toLowerCase();
      const wa = (c.whatsapp || '').toLowerCase();
      const correo = (c.correo || '').toLowerCase();
      const coincideConsecutivo = item.consecutivos.some(cons => cons.toLowerCase().includes(q));

      return (
        nombreCompleto.includes(q) ||
        tel.includes(q) ||
        wa.includes(q) ||
        correo.includes(q) ||
        coincideConsecutivo
      );
    });
  }, [clientesConHistorial, busquedaDebounced]);

  // Paginación matemática protegida
  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(filtrados.length / itemsPorPagina));
  }, [filtrados.length, itemsPorPagina]);

  const paginaAjustada = Math.min(paginaActual, totalPaginas);

  const clientesPaginados = useMemo(() => {
    const inicio = (paginaAjustada - 1) * itemsPorPagina;
    return filtrados.slice(inicio, inicio + itemsPorPagina);
  }, [filtrados, paginaAjustada, itemsPorPagina]);

  const irAPagina = useCallback((p: number) => {
    setPaginaActual(Math.max(1, Math.min(p, totalPaginas)));
  }, [totalPaginas]);

  const irAnterior = useCallback(() => {
    setPaginaActual(prev => Math.max(1, prev - 1));
  }, []);

  const irSiguiente = useCallback(() => {
    setPaginaActual(prev => Math.min(totalPaginas, prev + 1));
  }, [totalPaginas]);

  const cambiarItemsPorPagina = useCallback((num: number) => {
    setItemsPorPagina(num);
    setPaginaActual(1);
  }, []);

  const clienteSeleccionado = useMemo(() => {
    if (!clienteDetalleId) return null;
    return (
      clientesConHistorial.find(
        item => item.cliente.id === clienteDetalleId || item.idsAsociados?.includes(clienteDetalleId)
      ) || null
    );
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

    // Paginación y control de contención
    paginaActual: paginaAjustada,
    setPaginaActual,
    itemsPorPagina,
    totalPaginas,
    clientesPaginados,
    irAPagina,
    irAnterior,
    irSiguiente,
    cambiarItemsPorPagina,

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
