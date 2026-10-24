import { useState, useMemo, useCallback, useEffect } from 'react';
import type {
  Reserva, Finca, Cliente, ConfiguracionGeneral,
  CierreReserva, PagoTipo, FiltrosHistorial
} from '../types';
import {
  calcularSaldo,
  obtenerNombreClienteHistorico,
  obtenerNombreFincaHistorico,
  obtenerContactoClienteHistorico,
} from '../types';
import { useHistorial, FILTROS_HISTORIAL_DEFECTO } from './useHistorial';
import { useApp } from '../context/AppContext';
import { useAdminHistorialStore } from '../store/useAdminHistorialStore';
import {
  generarSerieHistorialTiempo,
  generarDistribucionHistorialFincas,
  generarDistribucionEstadosCierre
} from '../utils/historialMetrics';
import { generarExpedienteCompleto } from '../services/documentos';
import { useDebounce } from './useDebounce';

export interface UseHistorialControllerParams {
  reservas: Reserva[];
  fincas: Finca[];
  clientes: Cliente[];
  configuracion?: ConfiguracionGeneral;
  userEmail?: string | null;
  onCerrarReserva?: (
    reservaId: string,
    datosCierre: Partial<CierreReserva>,
    pagoLiquidacion?: { valor: number; tipo: PagoTipo; observacion?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onReabrirReserva?: (reservaId: string) => Promise<{ success: boolean; error?: string }>;
  onRegistrarComunicacion?: (com: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const MESES_HISTORIAL = [
  { val: 'todos', label: 'Todos los meses' },
  { val: '01', label: 'Enero' },
  { val: '02', label: 'Febrero' },
  { val: '03', label: 'Marzo' },
  { val: '04', label: 'Abril' },
  { val: '05', label: 'Mayo' },
  { val: '06', label: 'Junio' },
  { val: '07', label: 'Julio' },
  { val: '08', label: 'Agosto' },
  { val: '09', label: 'Septiembre' },
  { val: '10', label: 'Octubre' },
  { val: '11', label: 'Noviembre' },
  { val: '12', label: 'Diciembre' },
];

export function formatCOP(v: number): string {
  const num = typeof v === 'number' && !isNaN(v) ? v : 0;
  return '$' + Math.round(num).toLocaleString('es-CO');
}

export function formatFecha(f?: string): string {
  if (!f || typeof f !== 'string') return '—';
  const partes = f.split('T')[0].split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return f;
}

/**
 * Controller Hook desacoplado para AdminHistorial.
 * Implementa debounce de 250ms en la barra de búsqueda y memoización
 * a 60 FPS de métricas, filtrado, gráficos y exportaciones.
 */
export function useHistorialController({
  reservas = [],
  fincas = [],
  clientes = [],
  configuracion,
  userEmail,
  onCerrarReserva,
  onReabrirReserva,
  onRegistrarComunicacion,
  showToast,
  openConfirm,
}: UseHistorialControllerParams) {
  // Input local reactivo instantáneo (<16ms)
  const [busquedaInput, setBusquedaInput] = useState('');
  // Debounce de 250ms para evitar cálculos intensivos en cada pulsación de tecla
  const busquedaDebounced = useDebounce(busquedaInput, 250);

  // Hook base de filtros y métricas
  const {
    filtros,
    setFiltros,
    limpiarFiltros: limpiarFiltrosBase,
    reservasFiltradas,
    aniosDisponibles,
    metricas,
  } = useHistorial(reservas, fincas, clientes);

  // Sincronizar el término debounced con el estado de filtros
  useEffect(() => {
    setFiltros(prev => {
      if (prev.busqueda === busquedaDebounced) return prev;
      return { ...prev, busqueda: busquedaDebounced };
    });
  }, [busquedaDebounced, setFiltros]);

  // Zustand Store centralizado para gráficos
  const { chartTab, setChartTab, mostrarGraficos, toggleMostrarGraficos } = useAdminHistorialStore();

  // AppContext global
  const { recargarTodo, loading: globalLoading } = useApp();

  // Estados locales para sincronización y modales
  const [sincronizando, setSincronizando] = useState(false);
  const [reservaParaExpediente, setReservaParaExpediente] = useState<Reserva | null>(null);
  const [reservaParaCerrar, setReservaParaCerrar] = useState<Reserva | null>(null);
  const [descargandoId, setDescargandoId] = useState<string | null>(null);

  // Cálculos memoizados para gráficos estadísticos
  const serieTiempo = useMemo(() => {
    return generarSerieHistorialTiempo(reservasFiltradas);
  }, [reservasFiltradas]);

  const distribucionFincas = useMemo(() => {
    return generarDistribucionHistorialFincas(fincas, reservasFiltradas);
  }, [fincas, reservasFiltradas]);

  const estadosCierre = useMemo(() => {
    return generarDistribucionEstadosCierre(reservasFiltradas);
  }, [reservasFiltradas]);

  const hayFiltrosActivos = useMemo(() => {
    return Boolean(
      busquedaInput.trim() ||
      filtros.fechaDesde ||
      filtros.fechaHasta ||
      filtros.mes !== 'todos' ||
      filtros.anio !== 'todos' ||
      filtros.fincaId !== 'todas' ||
      filtros.clienteId !== 'todos' ||
      filtros.estado !== 'todas'
    );
  }, [busquedaInput, filtros]);

  const limpiarFiltros = useCallback(() => {
    setBusquedaInput('');
    limpiarFiltrosBase();
  }, [limpiarFiltrosBase]);

  const handleSincronizarEnVivo = useCallback(async () => {
    setSincronizando(true);
    try {
      if (recargarTodo) {
        await recargarTodo();
      }
      showToast('✓ Registros históricos sincronizados con Supabase', 'success');
    } catch {
      showToast('Error sincronizando historial', 'error');
    } finally {
      setSincronizando(false);
    }
  }, [recargarTodo, showToast]);

  const handleExportarCsv = useCallback(() => {
    if (reservasFiltradas.length === 0) {
      showToast('No hay registros para exportar', 'info');
      return;
    }

    const encabezados = [
      'Expediente',
      'Finca',
      'Cliente',
      'Telefono',
      'Fecha Llegada',
      'Fecha Salida',
      'Personas',
      'Valor Total',
      'Total Pagado',
      'Saldo',
      'Estado',
      'Fecha Cierre',
      'Responsable Cierre'
    ];

    const filas = reservasFiltradas.map(r => {
      const saldo = calcularSaldo(r);
      const pagado = (r.valor_total || 0) - saldo;
      const cliNom = obtenerNombreClienteHistorico(r).replace(/"/g, '""');
      const finNom = obtenerNombreFincaHistorico(r).replace(/"/g, '""');
      const tel = (obtenerContactoClienteHistorico(r).whatsapp || obtenerContactoClienteHistorico(r).telefono || '').replace(/"/g, '""');
      const responsable = (r.cerrada_por || r.cierre?.responsable || '').replace(/"/g, '""');

      return [
        `"EXP-${r.id.slice(0, 8).toUpperCase()}"`,
        `"${finNom}"`,
        `"${cliNom}"`,
        `"${tel}"`,
        `"${r.fecha_inicio || ''}"`,
        `"${r.fecha_fin || ''}"`,
        r.personas || 1,
        r.valor_total || 0,
        pagado,
        saldo,
        `"${r.estado || 'activa'}"`,
        `"${r.fecha_cierre || ''}"`,
        `"${responsable}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [encabezados.join(','), ...filas].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Historial_Operaciones_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Reporte CSV de operaciones descargado ✅', 'success');
  }, [reservasFiltradas, showToast]);

  const handleDescargaDirectaExpediente = useCallback((r: Reserva) => {
    setDescargandoId(r.id);
    setTimeout(() => {
      try {
        generarExpedienteCompleto(r, r.cierre, configuracion);
        showToast('Expediente histórico PDF generado ✅', 'success');
      } catch (err: any) {
        showToast(`Error generando PDF: ${err.message || err}`, 'error');
      } finally {
        setDescargandoId(null);
      }
    }, 100);
  }, [configuracion, showToast]);

  return {
    // Datos y Filtros
    reservas,
    fincas,
    clientes,
    filtros,
    setFiltros,
    limpiarFiltros,
    hayFiltrosActivos,
    reservasFiltradas,
    aniosDisponibles,
    metricas,

    // Buscador con Debounce
    busquedaInput,
    setBusquedaInput,
    busquedaDebounced,

    // Métricas y Gráficos
    chartTab,
    setChartTab,
    mostrarGraficos,
    toggleMostrarGraficos,
    serieTiempo,
    distribucionFincas,
    estadosCierre,

    // Estados de Carga y Sincronización
    sincronizando,
    globalLoading,
    handleSincronizarEnVivo,
    handleExportarCsv,
    handleDescargaDirectaExpediente,
    descargandoId,

    // Modales
    reservaParaExpediente,
    setReservaParaExpediente,
    reservaParaCerrar,
    setReservaParaCerrar,

    // Callbacks & Config
    configuracion,
    userEmail,
    onCerrarReserva,
    onReabrirReserva,
    onRegistrarComunicacion,
    showToast,
    openConfirm,
  };
}

export type UseHistorialControllerReturn = ReturnType<typeof useHistorialController>;
