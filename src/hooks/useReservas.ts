import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Reserva, ReservaEstado, Pago, PagoTipo } from '../types';

export function useReservas() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          *,
          clientes(id, nombre, apellido, whatsapp, telefono),
          fincas(id, nombre),
          pagos(id, reserva_id, tipo, fecha, valor, observacion, created_at)
        `)
        .order('fecha_inicio', { ascending: false });
      if (error) throw error;
      setReservas((data as unknown as Reserva[]) || []);
    } catch (e) {
      console.error('Error cargando reservas:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();

    // Realtime: escuchar cambios en reservas y pagos
    const channel = supabase
      .channel('reservas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos' }, cargar)
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
      const { error } = await supabase.from('reservas').update({ estado }).eq('id', id);
      if (error) throw error;
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

  // Métricas
  const activas = reservas.filter(r => r.estado === 'activa');
  const hoy = new Date().toISOString().split('T')[0];
  const llegasHoy = activas.filter(r => r.fecha_inicio === hoy);
  const salenHoy  = activas.filter(r => r.fecha_fin === hoy);

  return {
    reservas,
    loading,
    cargar,
    guardar,
    cambiarEstado,
    eliminar,
    registrarPago,
    eliminarPago,
    metricas: {
      total: reservas.length,
      activas: activas.length,
      llegasHoy: llegasHoy.length,
      salenHoy: salenHoy.length,
    },
  };
}
