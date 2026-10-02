import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Comunicacion } from '../types';

const STORAGE_KEY = 'fc_comunicaciones_local';

export function useComunicaciones() {
  const [comunicaciones, setComunicaciones] = useState<Comunicacion[]>([]);
  const [cargando, setCargando] = useState(false);

  // Cargar historial de comunicaciones
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('comunicaciones')
        .select(`
          id,
          cliente_id,
          reserva_id,
          cotizacion_id,
          tipo,
          destinatario,
          telefono,
          mensaje,
          estado,
          created_at,
          clientes (id, nombre, apellido, whatsapp, telefono)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        // Fallback a localStorage si la tabla aún no existe en Supabase
        console.warn('Usando almacenamiento local para comunicaciones (tabla Supabase no disponible):', error.message);
        const guardado = localStorage.getItem(STORAGE_KEY);
        if (guardado) {
          setComunicaciones(JSON.parse(guardado));
        }
      } else if (data) {
        setComunicaciones(data as unknown as Comunicacion[]);
      }
    } catch (err) {
      console.warn('Fallo consultando comunicaciones de Supabase, usando local:', err);
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado) {
        setComunicaciones(JSON.parse(guardado));
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Registrar un envío en el historial
  const registrarComunicacion = async (item: Omit<Comunicacion, 'id' | 'created_at'>): Promise<Comunicacion> => {
    const nuevoId = crypto.randomUUID ? crypto.randomUUID() : `com-${Date.now()}`;
    const fechaActual = new Date().toISOString();
    const nuevaCom: Comunicacion = {
      ...item,
      id: nuevoId,
      created_at: fechaActual,
    };

    // 1. Intentar persistir en Supabase
    try {
      const { data, error } = await supabase
        .from('comunicaciones')
        .insert({
          cliente_id: item.cliente_id || null,
          reserva_id: item.reserva_id || null,
          cotizacion_id: item.cotizacion_id || null,
          tipo: item.tipo,
          destinatario: item.destinatario,
          telefono: item.telefono,
          mensaje: item.mensaje,
          estado: item.estado,
        })
        .select()
        .single();

      if (!error && data) {
        nuevaCom.id = data.id;
        nuevaCom.created_at = data.created_at;
      }
    } catch (e) {
      console.warn('No se pudo guardar la comunicación en Supabase, se guarda local:', e);
    }

    // 2. Actualizar estado y caché local
    setComunicaciones(prev => {
      const lista = [nuevaCom, ...prev].slice(0, 100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
      return lista;
    });

    return nuevaCom;
  };

  const limpiarHistorial = () => {
    localStorage.removeItem(STORAGE_KEY);
    setComunicaciones([]);
  };

  return {
    comunicaciones,
    cargando,
    recargar: cargar,
    registrarComunicacion,
    limpiarHistorial,
  };
}
