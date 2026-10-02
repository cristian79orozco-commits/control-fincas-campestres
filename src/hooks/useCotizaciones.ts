import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { CotizacionDB, CotizacionEstado } from '../types';

export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionDB[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cotizaciones')
        .select(`
          *,
          clientes(id, nombre, apellido, whatsapp),
          fincas(id, nombre)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCotizaciones((data as unknown as CotizacionDB[]) || []);
    } catch (e) {
      console.error('Error cargando cotizaciones:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async (datos: Partial<CotizacionDB>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const payload: any = {
        cliente_id: datos.cliente_id || null,
        finca_id: datos.finca_id,
        fecha_inicio: datos.fecha_inicio,
        fecha_fin: datos.fecha_fin,
        personas: datos.personas || 1,
        alimentacion: datos.alimentacion || 'Sin alimentación',
        precio_base_pp: datos.precio_base_pp || 0,
        subtotal_alojamiento: datos.subtotal_alojamiento || 0,
        costo_alimentacion: datos.costo_alimentacion || 0,
        descuento: datos.descuento || 0,
        recargo: datos.recargo || 0,
        total: datos.total || 0,
        estado: datos.estado || 'borrador',
        notas: datos.notas || null,
      };
      if (datos.id) payload.id = datos.id;

      const { data, error } = await supabase
        .from('cotizaciones')
        .upsert(payload, { onConflict: 'id' })
        .select('id')
        .single();

      if (error) throw error;
      await cargar();
      return { success: true, id: data?.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const cambiarEstado = async (id: string, estado: CotizacionEstado): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('cotizaciones')
        .update({ estado })
        .eq('id', id);
      if (error) throw error;
      await cargar();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const eliminar = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('cotizaciones').delete().eq('id', id);
      if (error) throw error;
      await cargar();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return { cotizaciones, loading, cargar, guardar, cambiarEstado, eliminar };
}
