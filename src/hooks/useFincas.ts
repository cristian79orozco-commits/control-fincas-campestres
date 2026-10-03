import { useState, useEffect, useCallback } from 'react';
import { supabase, DEFAULT_WA_NUMBER } from '../services/supabase';
import type { Finca, FincaImagen } from '../types';

export function useFincas() {
  const [todasLasFincas, setTodasLasFincas] = useState<Finca[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarFincas = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fincas')
        .select(`
          *,
          finca_imagenes(id, finca_id, url, alt, orden, es_principal),
          finca_amenidades(id, finca_id, nombre, icono),
          finca_planes(id, finca_id, nombre)
        `)
        .order('nombre');

      if (error) {
        throw error;
      }

      setTodasLasFincas(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error cargando fincas:', err);
      setError(err.message || 'Error al conectar con Supabase');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarFincas();

    // Suscripción en tiempo real a cambios en fincas
    const channel = supabase
      .channel('fincas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fincas' }, () => {
        cargarFincas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cargarFincas]);

  // Fincas activas filtradas para el panel público de clientes y cotizador
  const fincas = todasLasFincas.filter(f => f.activo !== false);

  const guardarFinca = async (fincaData: Partial<Finca>, imagenesUrls?: string[], planesStr?: string) => {
    try {
      const payload: any = {
        nombre: fincaData.nombre,
        zona: fincaData.zona || 'Santa Elena, Valle',
        capacidad: fincaData.capacidad || 10,
        precio_pp: fincaData.precio_pp || 0,
        descripcion: fincaData.descripcion || '',
        estado: fincaData.estado || 'disponible',
        whatsapp: (fincaData.whatsapp || DEFAULT_WA_NUMBER).replace(/[^0-9]/g, ''),
        activo: fincaData.activo !== undefined ? fincaData.activo : true,
      };

      if (fincaData.id && fincaData.id !== 'new') {
        payload.id = fincaData.id;
      }

      const { data, error } = await supabase
        .from('fincas')
        .upsert(payload, { onConflict: 'id' })
        .select('id')
        .single();

      if (error) throw error;
      const savedId = data?.id || fincaData.id;

      // Guardar imágenes si fueron provistas
      if (savedId && imagenesUrls) {
        await supabase.from('finca_imagenes').delete().eq('finca_id', savedId);
        const rows = imagenesUrls.map((url, i) => ({
          finca_id: savedId,
          url,
          orden: i,
          es_principal: i === 0,
        }));
        if (rows.length > 0) {
          await supabase.from('finca_imagenes').insert(rows);
        }
      }

      // Guardar planes si fueron provistos
      if (savedId && planesStr !== undefined) {
        await supabase.from('finca_planes').delete().eq('finca_id', savedId);
        const planes = planesStr.split(',').map(p => p.trim()).filter(Boolean);
        if (planes.length > 0) {
          await supabase.from('finca_planes').insert(planes.map(nombre => ({ finca_id: savedId, nombre })));
        }
      }

      await cargarFincas();
      return { success: true, id: savedId };
    } catch (err: any) {
      console.error('Error guardando finca:', err);
      return { success: false, error: err.message };
    }
  };

  const desactivarFinca = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fincas')
        .update({ activo: false })
        .eq('id', id);

      if (error) throw error;
      await cargarFincas();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const reactivarFinca = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fincas')
        .update({ activo: true })
        .eq('id', id);

      if (error) throw error;
      await cargarFincas();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Métricas calculadas en tiempo real (sobre fincas activas)
  const total = fincas.length;
  const disponibles = fincas.filter(f => f.estado === 'disponible').length;
  const ocupadas = fincas.filter(f => f.estado === 'no_disponible' || f.estado === 'alta_demanda').length;
  const porcentajeOcupacion = total > 0 ? Math.round((ocupadas / total) * 100) : 0;

  return {
    fincas, // Solo activas para el catálogo de clientes
    todasLasFincas, // Todas las fincas (incluyendo inactivas) para administración
    loading,
    error,
    recargar: cargarFincas,
    guardarFinca,
    desactivarFinca,
    reactivarFinca,
    metricas: {
      total,
      disponibles,
      ocupadas,
      porcentajeOcupacion,
    },
  };
}
