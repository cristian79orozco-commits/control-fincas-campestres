import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Reserva } from '../types';

interface ReservasState {
  reservas: Reserva[];
  loading: boolean;
  error: string | null;
  subscriptionActive: boolean;

  // Acciones
  cargarReservas: () => Promise<void>;
  iniciarSuscripcionRealtime: () => () => void;
  crearReservaOptimista: (nuevaReserva: Omit<Reserva, 'id' | 'createdAt'>) => Promise<boolean>;
  actualizarEstadoOptimista: (id: string, nuevoEstado: Reserva['estado']) => Promise<boolean>;
}

export const useReservasStore = create<ReservasState>((set, get) => ({
  reservas: [],
  loading: false,
  error: null,
  subscriptionActive: false,

  cargarReservas: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      set({ reservas: (data as Reserva[]) || [], loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Error cargando reservas', loading: false });
    }
  },

  iniciarSuscripcionRealtime: () => {
    if (get().subscriptionActive) return () => {};

    const channel = supabase
      .channel('reservas_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservas' },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          set((state) => {
            let updatedList = [...state.reservas];

            if (eventType === 'INSERT') {
              // Si no existe ya en la lista local, se inserta
              if (!updatedList.some((r) => r.id === (newRecord as Reserva).id)) {
                updatedList = [newRecord as Reserva, ...updatedList];
              }
            } else if (eventType === 'UPDATE') {
              updatedList = updatedList.map((r) =>
                r.id === (newRecord as Reserva).id ? (newRecord as Reserva) : r
              );
            } else if (eventType === 'DELETE') {
              updatedList = updatedList.filter((r) => r.id !== oldRecord.id);
            }

            return { reservas: updatedList };
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          set({ subscriptionActive: true });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      set({ subscriptionActive: false });
    };
  },

  actualizarEstadoOptimista: async (id: string, nuevoEstado: Reserva['estado']) => {
    const estadoAnterior = get().reservas;

    // 1. ACTUALIZACIÓN OPTIMISTA INMEDIATA (< 16ms en UI)
    set((state) => ({
      reservas: state.reservas.map((r) =>
        r.id === id ? { ...r, estado: nuevoEstado } : r
      ),
    }));

    try {
      // 2. LLAMADA EN SEGUNDO PLANO A SUPABASE
      const { error } = await supabase
        .from('reservas')
        .update({ estado: nuevoEstado })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err: any) {
      // 3. ROLLBACK EN CASO DE FALLO
      console.error('[Rollback] Fallo al actualizar reserva en Supabase:', err);
      set({ reservas: estadoAnterior, error: 'No se pudo sincronizar el cambio' });
      return false;
    }
  },

  crearReservaOptimista: async (datos) => {
    const tempId = `temp_${Date.now()}`;
    const estadoAnterior = get().reservas;
    const reservaTemporal: Reserva = {
      ...(datos as any),
      id: tempId,
      createdAt: new Date().toISOString(),
    };

    // Actualización optimista inmediata
    set((state) => ({
      reservas: [reservaTemporal, ...state.reservas],
    }));

    try {
      const { data, error } = await supabase
        .from('reservas')
        .insert([datos])
        .select()
        .single();

      if (error) throw error;

      // Reemplaza el temporal por el registro real de Supabase
      set((state) => ({
        reservas: state.reservas.map((r) => (r.id === tempId ? (data as Reserva) : r)),
      }));

      return true;
    } catch (err: any) {
      // Rollback
      set({ reservas: estadoAnterior, error: 'Error al crear la reserva' });
      return false;
    }
  },
}));
