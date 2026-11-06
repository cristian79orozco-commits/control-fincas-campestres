/**
 * useReinicioDatosController.ts
 * Capa 2 de la Arquitectura de Blindaje (Architecture Shield)
 *
 * Controlador desacoplado para el mantenimiento, diagnóstico y reinicio de datos
 * de prueba y operacionales en la plataforma.
 *
 * Directivas de blindaje:
 * - Aislamiento total de lógica de negocio y llamadas a Supabase de la vista visual.
 * - Validación de seguridad de doble paso para acciones destructivas.
 * - Sincronización multi-panel sin re-renders masivos (60 FPS).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { OpcionesReinicioDatos, ConteoDatosBD, ResultadoReinicioDatos } from '../types';
import { obtenerDiagnosticoDatos } from '../services/reinicioDatos';
import { useApp } from '../context/AppContext';

export interface UseReinicioDatosControllerProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onReiniciarPersonalizado?: (opciones: OpcionesReinicioDatos) => Promise<ResultadoReinicioDatos>;
}

export const OPCIONES_PREDETERMINADAS_PRUEBA: OpcionesReinicioDatos = {
  reservasYPagos: true,
  cotizaciones: true,
  disponibilidad: true,
  clientes: true,
  comunicaciones: true,
  reiniciarConsecutivos: true,
  fincas: false,
  menus: false,
};

export function useReinicioDatosController({
  showToast,
  onReiniciarPersonalizado,
}: UseReinicioDatosControllerProps) {
  const { reiniciarDatos: reiniciarDesdeContexto, recargarTodo } = useApp();

  // Opciones de reinicio seleccionadas
  const [opciones, setOpciones] = useState<OpcionesReinicioDatos>(OPCIONES_PREDETERMINADAS_PRUEBA);

  // Diagnóstico de registros reales en BD
  const [conteos, setConteos] = useState<ConteoDatosBD>({
    reservas: 0,
    pagos: 0,
    cotizaciones: 0,
    disponibilidad: 0,
    clientes: 0,
    comunicaciones: 0,
    fincas: 0,
    menus: 0,
    siguienteCotizacion: 1001,
    siguienteSeparacion: 1001,
  });

  const [cargandoConteos, setCargandoConteos] = useState<boolean>(true);
  const [ejecutando, setEjecutando] = useState<boolean>(false);
  const [modalSeguridadAbierto, setModalSeguridadAbierto] = useState<boolean>(false);
  const [palabraConfirmacion, setPalabraConfirmacion] = useState<string>('');
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoReinicioDatos | null>(null);

  // Cargar conteos al montar o cuando se solicite refrescar
  const refrescarDiagnostico = useCallback(async () => {
    setCargandoConteos(true);
    try {
      const data = await obtenerDiagnosticoDatos();
      setConteos(data);
    } catch (err) {
      console.warn('[useReinicioDatosController] Error al obtener conteos:', err);
    } finally {
      setCargandoConteos(false);
    }
  }, []);

  useEffect(() => {
    refrescarDiagnostico();
  }, [refrescarDiagnostico]);

  // Manejo de switches de opciones
  const toggleOpcion = useCallback((clave: keyof OpcionesReinicioDatos) => {
    setOpciones(prev => ({
      ...prev,
      [clave]: !prev[clave],
    }));
  }, []);

  const seleccionarTodoPrueba = useCallback(() => {
    setOpciones({
      reservasYPagos: true,
      cotizaciones: true,
      disponibilidad: true,
      clientes: true,
      comunicaciones: true,
      reiniciarConsecutivos: true,
      fincas: false,
      menus: false,
    });
    showToast('Opciones de datos de prueba seleccionadas', 'info');
  }, [showToast]);

  const desmarcarTodo = useCallback(() => {
    setOpciones({
      reservasYPagos: false,
      cotizaciones: false,
      disponibilidad: false,
      clientes: false,
      comunicaciones: false,
      reiniciarConsecutivos: false,
      fincas: false,
      menus: false,
    });
  }, []);

  // Total de elementos que serán afectados según las opciones activas
  const totalRegistrosAfectados = useMemo(() => {
    let total = 0;
    if (opciones.reservasYPagos) total += (conteos.reservas + conteos.pagos);
    if (opciones.cotizaciones) total += conteos.cotizaciones;
    if (opciones.disponibilidad) total += conteos.disponibilidad;
    if (opciones.clientes) total += conteos.clientes;
    if (opciones.comunicaciones) total += conteos.comunicaciones;
    if (opciones.fincas) total += conteos.fincas;
    if (opciones.menus) total += conteos.menus;
    return total;
  }, [opciones, conteos]);

  const hayAlgunaOpcionSeleccionada = useMemo(() => {
    return Object.values(opciones).some(v => v === true);
  }, [opciones]);

  // Apertura de modal de confirmación con validación
  const abrirModalSeguridad = useCallback(() => {
    if (!hayAlgunaOpcionSeleccionada) {
      showToast('Por favor selecciona al menos una categoría para reiniciar', 'info');
      return;
    }
    setPalabraConfirmacion('');
    setModalSeguridadAbierto(true);
  }, [hayAlgunaOpcionSeleccionada, showToast]);

  const cerrarModalSeguridad = useCallback(() => {
    if (!ejecutando) {
      setModalSeguridadAbierto(false);
      setPalabraConfirmacion('');
    }
  }, [ejecutando]);

  // Ejecución definitiva del reinicio
  const ejecutarReinicioDefinitivo = useCallback(async () => {
    if (palabraConfirmacion.trim().toUpperCase() !== 'REINICIAR') {
      showToast('Escribe exactamente la palabra "REINICIAR" para autorizar la operación', 'error');
      return;
    }

    setEjecutando(true);
    try {
      showToast('Iniciando proceso de limpieza en la base de datos...', 'info');

      const accionReinicio = onReiniciarPersonalizado || reiniciarDesdeContexto;
      const res = await accionReinicio(opciones);

      if (res.success) {
        setUltimoResultado(res);
        setModalSeguridadAbierto(false);
        setPalabraConfirmacion('');

        // Resumen detallado de la limpieza
        const detalles = res.eliminados || {};
        const itemsBorrados = [
          detalles.disponibilidad ? `${detalles.disponibilidad} fechas de disponibilidad` : null,
          detalles.reservas ? `${detalles.reservas} reservas` : null,
          detalles.pagos ? `${detalles.pagos} pagos` : null,
          detalles.cotizaciones ? `${detalles.cotizaciones} cotizaciones` : null,
          detalles.clientes ? `${detalles.clientes} clientes` : null,
          detalles.comunicaciones ? `${detalles.comunicaciones} mensajes` : null,
        ].filter(Boolean).join(', ');

        const msgExito = itemsBorrados
          ? `¡Reinicio completado con éxito! Se purgaron: ${itemsBorrados} ✅`
          : '¡Reinicio de prueba completado exitosamente! ✅';

        showToast(msgExito, 'success');

        // Refrescar diagnóstico y forzar sincronización
        await refrescarDiagnostico();
        await recargarTodo();
      } else {
        showToast(res.error || 'Ocurrió un error al procesar el reinicio', 'error');
      }
    } catch (err: any) {
      console.error('[useReinicioDatosController] Error en ejecución:', err);
      showToast(`Error de conexión: ${err?.message || 'Fallo inesperado'}`, 'error');
    } finally {
      setEjecutando(false);
    }
  }, [
    palabraConfirmacion,
    showToast,
    onReiniciarPersonalizado,
    reiniciarDesdeContexto,
    opciones,
    refrescarDiagnostico,
    recargarTodo,
  ]);

  return {
    opciones,
    conteos,
    cargandoConteos,
    ejecutando,
    modalSeguridadAbierto,
    palabraConfirmacion,
    ultimoResultado,
    totalRegistrosAfectados,
    hayAlgunaOpcionSeleccionada,
    setPalabraConfirmacion,
    toggleOpcion,
    seleccionarTodoPrueba,
    desmarcarTodo,
    abrirModalSeguridad,
    cerrarModalSeguridad,
    ejecutarReinicioDefinitivo,
    refrescarDiagnostico,
  };
}

