import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { BloqueoDisponibilidad } from '../types';

export function useDisponibilidad(fincaIdSeleccionada?: string | null) {
  const [bloquesFinca, setBloquesFinca] = useState<BloqueoDisponibilidad[]>([]);
  const [bloquesAdmin, setBloquesAdmin] = useState<BloqueoDisponibilidad[]>([]);
  const [loading, setLoading] = useState(false);

  // Carga disponibilidad para el cliente (fechas futuras de la finca seleccionada)
  const cargarDisponibilidadFinca = useCallback(async (fincaId: string) => {
    try {
      setLoading(true);
      const hoy = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('disponibilidad')
        .select('id, finca_id, fecha_inicio, fecha_fin, estado, personas')
        .eq('finca_id', fincaId)
        .gte('fecha_fin', hoy)
        .order('fecha_inicio');

      if (error) throw error;
      setBloquesFinca((data as BloqueoDisponibilidad[]) || []);
    } catch (e) {
      console.error('Error cargando disponibilidad de finca:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga todas las reservas y bloqueos para la vista admin (incluye notas/nombre cliente)
  const cargarDisponibilidadAdmin = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('disponibilidad')
        .select(`
          id, finca_id, fecha_inicio, fecha_fin, estado, personas, notas, created_at,
          fincas(nombre)
        `)
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;
      setBloquesAdmin((data as unknown as BloqueoDisponibilidad[]) || []);
    } catch (e) {
      console.error('Error cargando disponibilidad admin:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fincaIdSeleccionada) {
      cargarDisponibilidadFinca(fincaIdSeleccionada);
    }
  }, [fincaIdSeleccionada, cargarDisponibilidadFinca]);

  // Suscripción Realtime para disponibilidad
  useEffect(() => {
    const channel = supabase
      .channel('disponibilidad-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disponibilidad' }, () => {
        if (fincaIdSeleccionada) cargarDisponibilidadFinca(fincaIdSeleccionada);
        cargarDisponibilidadAdmin();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fincaIdSeleccionada, cargarDisponibilidadFinca, cargarDisponibilidadAdmin]);

  const guardarBloqueo = async (datos: {
    finca_id: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado: 'ocupado' | 'libre';
    personas?: number | null;
    notas?: string | null;
  }) => {
    try {
      const { error } = await supabase.from('disponibilidad').insert([datos]);
      if (error) throw error;
      await cargarDisponibilidadAdmin();
      if (fincaIdSeleccionada === datos.finca_id) {
        await cargarDisponibilidadFinca(datos.finca_id);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const eliminarBloqueo = async (id: number | string) => {
    try {
      const { error } = await supabase.from('disponibilidad').delete().eq('id', id);
      if (error) throw error;
      await cargarDisponibilidadAdmin();
      if (fincaIdSeleccionada) {
        await cargarDisponibilidadFinca(fincaIdSeleccionada);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Bloqueo masivo desde el calendario interactivo de administración
  const marcarDiasAdmin = async (
    targetFincaId: string,
    fechasSeleccionadas: string[],
    estado: 'ocupado' | 'libre',
    nombreCliente?: string | null
  ) => {
    try {
      if (!fechasSeleccionadas.length) return { success: false, error: 'No hay fechas seleccionadas' };
      const fechas = [...fechasSeleccionadas].sort();

      // Agrupar fechas continuas en bloques de inicio-fin
      const bloques: { inicio: string; fin: string }[] = [];
      let inicio = fechas[0];
      let prev = fechas[0];

      for (let i = 1; i < fechas.length; i++) {
        const curr = fechas[i];
        const diff = new Date(curr + 'T00:00:00').getTime() - new Date(prev + 'T00:00:00').getTime();
        if (diff > 86400000) {
          bloques.push({ inicio, fin: prev });
          inicio = curr;
        }
        prev = curr;
      }
      bloques.push({ inicio, fin: prev });

      const fechaMin = fechas[0];
      const fechaMax = fechas[fechas.length - 1];

      // Eliminar colisiones previas en el rango
      const { error: errDel } = await supabase
        .from('disponibilidad')
        .delete()
        .eq('finca_id', targetFincaId)
        .lte('fecha_inicio', fechaMax)
        .gte('fecha_fin', fechaMin);

      if (errDel) throw errDel;

      // Insertar nuevos bloques
      const inserts = bloques.map(b => ({
        finca_id: targetFincaId,
        fecha_inicio: b.inicio,
        fecha_fin: b.fin,
        estado,
        notas: estado === 'ocupado' ? (nombreCliente || null) : null,
      }));

      const { error: errInsert } = await supabase.from('disponibilidad').insert(inserts);
      if (errInsert) throw errInsert;

      await cargarDisponibilidadAdmin();
      if (fincaIdSeleccionada === targetFincaId) {
        await cargarDisponibilidadFinca(targetFincaId);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error al marcar días en calendario:', err);
      return { success: false, error: err.message };
    }
  };

  // Verifica si una finca está libre en un rango específico de fechas
  const verificarRangoLibre = (bloques: BloqueoDisponibilidad[], inicio: string, fin: string): boolean => {
    if (!inicio || !fin) return true;
    const ini = new Date(inicio + 'T00:00:00').getTime();
    const fn = new Date(fin + 'T00:00:00').getTime();

    for (const b of bloques) {
      if (b.estado === 'ocupado') {
        const bIni = new Date(b.fecha_inicio + 'T00:00:00').getTime();
        const bFin = new Date(b.fecha_fin + 'T00:00:00').getTime();
        // Existe traslape si (ini <= bFin && fn >= bIni)
        if (ini <= bFin && fn >= bIni) {
          return false;
        }
      }
    }
    return true;
  };

  return {
    bloquesFinca,
    bloquesAdmin,
    loading,
    cargarDisponibilidadFinca,
    cargarDisponibilidadAdmin,
    guardarBloqueo,
    eliminarBloqueo,
    marcarDiasAdmin,
    verificarRangoLibre,
  };
}
