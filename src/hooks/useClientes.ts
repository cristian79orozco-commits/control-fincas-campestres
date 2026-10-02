import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Cliente } from '../types';

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      setClientes((data as Cliente[]) || []);
    } catch (e) {
      console.error('Error cargando clientes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async (datos: Partial<Cliente>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const payload: any = {
        nombre: datos.nombre,
        apellido: datos.apellido || null,
        telefono: datos.telefono || null,
        whatsapp: datos.whatsapp || null,
        correo: datos.correo || null,
        observaciones: datos.observaciones || null,
        activo: true,
      };
      if (datos.id) payload.id = datos.id;

      const { data, error } = await supabase
        .from('clientes')
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

  const desactivar = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ activo: false })
        .eq('id', id);
      if (error) throw error;
      await cargar();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return { clientes, loading, cargar, guardar, desactivar };
}
