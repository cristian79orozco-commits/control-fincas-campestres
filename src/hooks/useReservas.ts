import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Reserva, ReservaEstado, Pago, PagoTipo, CierreReserva } from '../types';

export function useReservas() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);

      // Intento 1: Traer reservas con clientes, fincas, pagos y cierres_reservas (Fase 6)
      let data: any[] | null = null;
      const resFull = await supabase
        .from('reservas')
        .select(`
          *,
          clientes(id, nombre, apellido, whatsapp, telefono),
          fincas(id, nombre),
          pagos(id, reserva_id, tipo, fecha, valor, observacion, created_at),
          cierres_reservas(*)
        `)
        .order('fecha_inicio', { ascending: false });

      if (resFull.error) {
        // Fallback resiliente si cierres_reservas aún no está creada en Supabase
        const resFallback = await supabase
          .from('reservas')
          .select(`
            *,
            clientes(id, nombre, apellido, whatsapp, telefono),
            fincas(id, nombre),
            pagos(id, reserva_id, tipo, fecha, valor, observacion, created_at)
          `)
          .order('fecha_inicio', { ascending: false });

        if (resFallback.error) throw resFallback.error;
        data = resFallback.data;
      } else {
        data = resFull.data;
      }

      const procesadas: Reserva[] = (data || []).map((r: any) => {
        const cierreRaw = r.cierres_reservas;
        const cierre = Array.isArray(cierreRaw)
          ? (cierreRaw[0] || null)
          : (cierreRaw || null);
        return {
          ...r,
          cierre,
        };
      });

      setReservas(procesadas);
    } catch (e) {
      console.error('Error cargando reservas:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();

    // Realtime: escuchar cambios en reservas, pagos y cierres
    const channel = supabase
      .channel('reservas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cierres_reservas' }, cargar)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cargar]);

  const guardar = async (datos: Partial<Reserva>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const payload: any = {
        cotizacion_id: datos.cotizacion_id || null,
        cliente_id: datos.cliente_id,
        finca_id: datos.finca_id,
        fecha_inicio: datos.fecha_inicio,
        fecha_fin: datos.fecha_fin,
        personas: datos.personas || 1,
        valor_total: datos.valor_total || 0,
        separacion: datos.separacion || 0,
        estado: datos.estado || 'activa',
        observaciones: datos.observaciones || null,
      };
      if (datos.id) payload.id = datos.id;
      if (!datos.id) {
        if (datos.consecutivo) {
          payload.consecutivo = datos.consecutivo;
        } else {
          try {
            const { data: numRes } = await supabase.rpc('siguiente_consecutivo_reserva');
            if (numRes) payload.consecutivo = numRes;
          } catch (eRpc) {
            console.warn('No se pudo generar consecutivo automático de reserva:', eRpc);
          }
        }
      } else if (datos.consecutivo) {
        payload.consecutivo = datos.consecutivo;
      }
      if (datos.cliente_snapshot) payload.cliente_snapshot = datos.cliente_snapshot;
      if (datos.finca_snapshot) payload.finca_snapshot = datos.finca_snapshot;
      if (datos.cotizacion_snapshot) payload.cotizacion_snapshot = datos.cotizacion_snapshot;
      if (datos.fecha_cierre) payload.fecha_cierre = datos.fecha_cierre;
      if (datos.cerrada_por) payload.cerrada_por = datos.cerrada_por;
      if (datos.notas_cierre) payload.notas_cierre = datos.notas_cierre;

      const { data, error } = await supabase
        .from('reservas')
        .upsert(payload, { onConflict: 'id' })
        .select('id')
        .single();

      if (error) throw error;

      // Si la reserva tiene separación y es nueva, registrar automáticamente el pago de separación
      if (!datos.id && datos.separacion && datos.separacion > 0) {
        await supabase.from('pagos').insert({
          reserva_id: data.id,
          tipo: 'separacion' as PagoTipo,
          fecha: new Date().toISOString().split('T')[0],
          valor: datos.separacion,
          observacion: 'Separación registrada al crear la reserva',
        });
      }

      await cargar();
      return { success: true, id: data?.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const cambiarEstado = async (id: string, estado: ReservaEstado): Promise<{ success: boolean; error?: string }> => {
    try {
      const updateData: any = { estado };
      if (estado === 'completada' || estado === 'cancelada' || estado === 'no_show') {
        updateData.fecha_cierre = new Date().toISOString();
      } else if (estado === 'activa') {
        updateData.fecha_cierre = null;
        updateData.cerrada_por = null;
        updateData.notas_cierre = null;
      }
      const { error } = await supabase.from('reservas').update(updateData).eq('id', id);
      if (error) throw error;
      await cargar();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const cerrarReserva = async (
    reservaId: string,
    datosCierre: Partial<CierreReserva>,
    pagoLiquidacion?: { valor: number; tipo: PagoTipo; observacion?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Si se adjunta un pago de liquidación final, registrarlo primero
      if (pagoLiquidacion && pagoLiquidacion.valor > 0) {
        const { error: pagoErr } = await supabase.from('pagos').insert({
          reserva_id: reservaId,
          tipo: pagoLiquidacion.tipo || 'pago_total',
          fecha: new Date().toISOString().split('T')[0],
          valor: pagoLiquidacion.valor,
          observacion: pagoLiquidacion.observacion || 'Liquidación final de saldo al cierre',
        });
        if (pagoErr) console.warn('Aviso registrando pago final de cierre:', pagoErr);
      }

      const fechaCierreIso = datosCierre.fecha_cierre || new Date().toISOString();
      const estadoFinal = datosCierre.estado_cierre || 'completada';
      const responsable = datosCierre.responsable || 'Administrador';
      const notas = datosCierre.notas_cierre || null;

      // 2. Actualizar la reserva a su estado de cierre
      const { error: updateReservaErr } = await supabase
        .from('reservas')
        .update({
          estado: estadoFinal,
          fecha_cierre: fechaCierreIso,
          cerrada_por: responsable,
          notas_cierre: notas,
        })
        .eq('id', reservaId);

      if (updateReservaErr) throw updateReservaErr;

      // 3. Registrar en tabla cierres_reservas
      try {
        await supabase
          .from('cierres_reservas')
          .upsert({
            reserva_id: reservaId,
            fecha_cierre: fechaCierreIso,
            responsable,
            estado_cierre: estadoFinal,
            calificacion: datosCierre.calificacion || null,
            estado_entrega_finca: datosCierre.estado_entrega_finca || 'excelente',
            deposito_garantia_devuelto: datosCierre.deposito_garantia_devuelto ?? true,
            valor_deposito_devuelto: datosCierre.valor_deposito_devuelto || 0,
            notas_cierre: notas,
            observaciones_entrega: datosCierre.observaciones_entrega || null,
          }, { onConflict: 'reserva_id' });
      } catch (cierreErr) {
        console.warn('Nota: tabla cierres_reservas no disponible o error menor:', cierreErr);
      }

      await cargar();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const reabrirReserva = async (reservaId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('reservas')
        .update({
          estado: 'activa',
          fecha_cierre: null,
          cerrada_por: null,
          notas_cierre: null,
        })
        .eq('id', reservaId);

      if (error) throw error;

      // Eliminar registro de cierre si existe
      try {
        await supabase.from('cierres_reservas').delete().eq('reserva_id', reservaId);
      } catch (delErr) {
        console.warn('Nota eliminando cierre al reabrir:', delErr);
      }

      await cargar();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const eliminar = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('reservas').delete().eq('id', id);
      if (error) throw error;
      await cargar();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // ---- PAGOS ----
  const registrarPago = async (
    reservaId: string,
    pago: { tipo: PagoTipo; fecha: string; valor: number; observacion?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('pagos').insert({
        reserva_id: reservaId,
        tipo: pago.tipo,
        fecha: pago.fecha,
        valor: pago.valor,
        observacion: pago.observacion || null,
      });
      if (error) throw error;
      await cargar();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const eliminarPago = async (pagoId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('pagos').delete().eq('id', pagoId);
      if (error) throw error;
      await cargar();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Métricas de reservas activas
  const activas = reservas.filter(r => r.estado === 'activa');
  const cerradas = reservas.filter(r => r.estado === 'completada' || r.estado === 'cancelada' || r.estado === 'no_show');
  const hoy = new Date().toISOString().split('T')[0];
  const llegasHoy = activas.filter(r => r.fecha_inicio === hoy);
  const salenHoy  = activas.filter(r => r.fecha_fin === hoy);

  return {
    reservas,
    loading,
    cargar,
    guardar,
    cambiarEstado,
    cerrarReserva,
    reabrirReserva,
    eliminar,
    registrarPago,
    eliminarPago,
    metricas: {
      total: reservas.length,
      activas: activas.length,
      cerradas: cerradas.length,
      llegasHoy: llegasHoy.length,
      salenHoy: salenHoy.length,
    },
  };
}

