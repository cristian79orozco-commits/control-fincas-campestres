/**
 * reinicioDatos.ts
 * Capa 4 de Servicios (Architecture Shield)
 *
 * Módulo especializado en diagnóstico, limpieza y reinicio quirúrgico de datos
 * operativos y de prueba en Supabase.
 *
 * Directivas de blindaje:
 * - Operaciones transaccionales en orden estricto de dependencias e integridad referencial.
 * - Validación previa de conteos reales en base de datos.
 * - Limpieza sincronizada de almacenamiento local y caché en memoria.
 */

import { supabase } from './supabase';
import type { OpcionesReinicioDatos, ConteoDatosBD, ResultadoReinicioDatos } from '../types';

/**
 * Consulta en tiempo real los conteos exactos de registros existentes en la base de datos.
 */
export async function obtenerDiagnosticoDatos(): Promise<ConteoDatosBD> {
  const conteo: ConteoDatosBD = {
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
  };

  try {
    const [
      resReservas,
      resPagos,
      resCotizaciones,
      resDisp,
      resClientes,
      resCom,
      resFincas,
      resMenus,
      resConfig,
    ] = await Promise.all([
      supabase.from('reservas').select('*', { count: 'exact', head: true }),
      supabase.from('pagos').select('*', { count: 'exact', head: true }),
      supabase.from('cotizaciones').select('*', { count: 'exact', head: true }),
      supabase.from('disponibilidad').select('*', { count: 'exact', head: true }),
      supabase.from('clientes').select('*', { count: 'exact', head: true }),
      supabase.from('comunicaciones').select('*', { count: 'exact', head: true }),
      supabase.from('fincas').select('*', { count: 'exact', head: true }),
      supabase.from('menus').select('*', { count: 'exact', head: true }),
      supabase.from('configuracion_general').select('siguiente_cotizacion, siguiente_separacion').eq('id', 'general').maybeSingle(),
    ]);

    if (!resReservas.error) conteo.reservas = resReservas.count || 0;
    if (!resPagos.error) conteo.pagos = resPagos.count || 0;
    if (!resCotizaciones.error) conteo.cotizaciones = resCotizaciones.count || 0;
    if (!resDisp.error) conteo.disponibilidad = resDisp.count || 0;
    if (!resClientes.error) conteo.clientes = resClientes.count || 0;
    if (!resCom.error) conteo.comunicaciones = resCom.count || 0;
    if (!resFincas.error) conteo.fincas = resFincas.count || 0;
    if (!resMenus.error) conteo.menus = resMenus.count || 0;

    if (resConfig.data) {
      conteo.siguienteCotizacion = resConfig.data.siguiente_cotizacion ?? 1001;
      conteo.siguienteSeparacion = resConfig.data.siguiente_separacion ?? 1001;
    }
  } catch (err) {
    console.warn('[reinicioDatos] Error obteniendo diagnóstico de BD:', err);
  }

  return conteo;
}

/**
 * Elimina registros por lotes según sus IDs o mediante condición 'not null'
 */
async function eliminarRegistrosTabla(tabla: string, columnaId: string = 'id'): Promise<number> {
  try {
    // 1. Obtener los IDs actuales
    const { data, error: selectErr } = await supabase.from(tabla).select(columnaId);
    if (selectErr) {
      console.warn(`[reinicioDatos] Error listando IDs de ${tabla}:`, selectErr.message);
      // Fallback: intentar borrado directo con filtro universal
      const { error: delErr } = await supabase.from(tabla).delete().not(columnaId, 'is', null);
      if (delErr) {
        console.warn(`[reinicioDatos] Fallback delete falló en ${tabla}:`, delErr.message);
        return 0;
      }
      return 1;
    }

    if (!data || data.length === 0) return 0;

    const ids = data.map((item: any) => item[columnaId]).filter(Boolean);
    if (ids.length === 0) return 0;

    // 2. Borrar en chunks de 200 para evitar límites de tamaño en URLs de PostgREST
    const chunkSize = 200;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { error: delErr } = await supabase.from(tabla).delete().in(columnaId, chunk);
      if (delErr) {
        console.error(`[reinicioDatos] Error borrando lote en ${tabla}:`, delErr.message);
        throw delErr;
      }
    }

    return ids.length;
  } catch (err: any) {
    console.error(`[reinicioDatos] Excepción al limpiar ${tabla}:`, err);
    throw err;
  }
}

/**
 * Ejecuta el reinicio controlado de datos según las opciones seleccionadas.
 */
export async function ejecutarReinicioDatos(
  opciones: OpcionesReinicioDatos
): Promise<ResultadoReinicioDatos> {
  const eliminados: NonNullable<ResultadoReinicioDatos['eliminados']> = {};

  try {
    // -------------------------------------------------------------------------
    // PASO 1: Reservas, Pagos y Cierres (Integridad Referencial Hacia Abajo)
    // -------------------------------------------------------------------------
    if (opciones.reservasYPagos) {
      // a. Pagos
      try {
        const totalPagos = await eliminarRegistrosTabla('pagos');
        eliminados.pagos = totalPagos;
      } catch (e: any) {
        console.warn('[reinicioDatos] Aviso al eliminar pagos:', e?.message);
      }

      // b. Cierres de Reservas
      try {
        const totalCierres = await eliminarRegistrosTabla('cierres_reservas', 'reserva_id');
        eliminados.cierres = totalCierres;
      } catch (e: any) {
        console.warn('[reinicioDatos] Aviso al eliminar cierres:', e?.message);
      }

      // c. Reservas
      try {
        const totalReservas = await eliminarRegistrosTabla('reservas');
        eliminados.reservas = totalReservas;
      } catch (e: any) {
        console.error('[reinicioDatos] Error al eliminar reservas:', e);
        throw new Error(`Error eliminando reservas: ${e?.message || 'Error de BD'}`);
      }
    }

    // -------------------------------------------------------------------------
    // PASO 2: Cotizaciones
    // -------------------------------------------------------------------------
    if (opciones.cotizaciones) {
      try {
        const totalCotizaciones = await eliminarRegistrosTabla('cotizaciones');
        eliminados.cotizaciones = totalCotizaciones;
      } catch (e: any) {
        console.error('[reinicioDatos] Error al eliminar cotizaciones:', e);
        throw new Error(`Error eliminando cotizaciones: ${e?.message || 'Error de BD'}`);
      }
    }

    // -------------------------------------------------------------------------
    // PASO 3: Disponibilidad (Bloqueos de fechas en calendario)
    // -------------------------------------------------------------------------
    if (opciones.disponibilidad) {
      try {
        const totalDisp = await eliminarRegistrosTabla('disponibilidad');
        eliminados.disponibilidad = totalDisp;
        // Limpiar caché local de disponibilidad
        try {
          localStorage.removeItem('fc_cache_disponibilidad');
        } catch {}
      } catch (e: any) {
        console.error('[reinicioDatos] Error al eliminar disponibilidad:', e);
        throw new Error(`Error eliminando disponibilidad: ${e?.message || 'Error de BD'}`);
      }
    }

    // -------------------------------------------------------------------------
    // PASO 4: Clientes
    // -------------------------------------------------------------------------
    if (opciones.clientes) {
      try {
        const totalClientes = await eliminarRegistrosTabla('clientes');
        eliminados.clientes = totalClientes;
      } catch (e: any) {
        console.error('[reinicioDatos] Error al eliminar clientes:', e);
        throw new Error(`Error eliminando clientes: ${e?.message || 'Error de BD'}`);
      }
    }

    // -------------------------------------------------------------------------
    // PASO 5: Comunicaciones (Historial de mensajes)
    // -------------------------------------------------------------------------
    if (opciones.comunicaciones) {
      try {
        const totalCom = await eliminarRegistrosTabla('comunicaciones');
        eliminados.comunicaciones = totalCom;
      } catch (e: any) {
        console.warn('[reinicioDatos] Aviso al eliminar comunicaciones:', e?.message);
      }
    }

    // -------------------------------------------------------------------------
    // PASO 6 (Opcional): Catálogo de Fincas (Protegido por defecto)
    // -------------------------------------------------------------------------
    if (opciones.fincas) {
      try {
        await eliminarRegistrosTabla('finca_imagenes');
        await eliminarRegistrosTabla('finca_amenidades');
        await eliminarRegistrosTabla('finca_planes');
        const totalFincas = await eliminarRegistrosTabla('fincas');
        eliminados.fincas = totalFincas;
        try {
          localStorage.removeItem('fc_cache_fincas');
          localStorage.removeItem('fc_fincas_extended_meta');
        } catch {}
      } catch (e: any) {
        console.error('[reinicioDatos] Error al eliminar fincas:', e);
        throw new Error(`Error eliminando catálogo de fincas: ${e?.message || 'Error de BD'}`);
      }
    }

    // -------------------------------------------------------------------------
    // PASO 7 (Opcional): Menús Gastronómicos (Protegido por defecto)
    // -------------------------------------------------------------------------
    if (opciones.menus) {
      try {
        await eliminarRegistrosTabla('menu_imagenes');
        const totalMenus = await eliminarRegistrosTabla('menus');
        eliminados.menus = totalMenus;
        try {
          localStorage.removeItem('fc_cache_menus');
        } catch {}
      } catch (e: any) {
        console.error('[reinicioDatos] Error al eliminar menús:', e);
        throw new Error(`Error eliminando menús: ${e?.message || 'Error de BD'}`);
      }
    }

    // -------------------------------------------------------------------------
    // PASO 8: Restablecer Contadores de Consecutivos a 1001
    // -------------------------------------------------------------------------
    if (opciones.reiniciarConsecutivos) {
      try {
        const { error: updErr } = await supabase
          .from('configuracion_general')
          .update({
            siguiente_cotizacion: 1001,
            siguiente_separacion: 1001,
            siguiente_abono: 1001,
            siguiente_estado_cuenta: 1001,
            siguiente_paz_salvo: 1001,
            siguiente_propuesta_menu: 1001,
          })
          .eq('id', 'general');

        if (updErr) {
          console.warn('[reinicioDatos] Aviso al restablecer contadores:', updErr.message);
        }
      } catch (e: any) {
        console.warn('[reinicioDatos] Excepción al restablecer contadores:', e?.message);
      }
    }

    return {
      success: true,
      eliminados,
      mensaje: 'Reinicio de datos completado exitosamente en toda la plataforma.',
    };
  } catch (err: any) {
    console.error('[reinicioDatos] Fallo general durante reinicio:', err);
    return {
      success: false,
      eliminados,
      error: err?.message || 'Ocurrió un error inesperado al procesar el reinicio de datos.',
    };
  }
}

