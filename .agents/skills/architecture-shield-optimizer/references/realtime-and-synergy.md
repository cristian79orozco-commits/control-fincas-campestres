# Sincronización en Tiempo Real y Sinergia Multi-Panel

Esta guía establece el protocolo para sincronizar paneles y asegurar que todos los cambios en la base de datos Supabase impacten inmediatamente en el frontend sin recargas.

---

## 1. El Reto de la Sincronización Multi-Panel
En una plataforma con múltiples paneles operativos (Calendario, Tabla de Reservas, Métricas Financieras, Chat de WhatsApp, Ficha de Clientes):
- Si el usuario modifica una reserva en el **Calendario**, la **Tabla de Reservas** y el **Dashboard de Métricas** deben reflejarlo en menos de 50ms.
- Si otro administrador (o un webhook externo de WhatsApp o pasarela de pago) actualiza un registro en Supabase, la interfaz local debe enterarse por WebSockets y actualizarse en vivo.

---

## 2. Configuración de Canales Supabase Realtime

Para suscribirse a eventos de tabla con tipado y reconexión:

```typescript
import { supabase } from '../services/supabase';
import type { Reserva } from '../types';

export function setupReservasRealtimeSubscription(
  onInsert: (reserva: Reserva) => void,
  onUpdate: (reserva: Reserva) => void,
  onDelete: (id: string) => void
) {
  const channel = supabase
    .channel('realtime:reservas_sync')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'reservas',
      },
      (payload) => {
        onInsert(payload.new as Reserva);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'reservas',
      },
      (payload) => {
        onUpdate(payload.new as Reserva);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'reservas',
      },
      (payload) => {
        onDelete(payload.old.id);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Conectado exitosamente al canal de reservas');
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
```

---

## 3. Actualización In-Memory en el Store Global

Al recibir un payload de PostgreSQL, el Store de Zustand actualiza sus arreglos inmutables y recalcula las métricas derivadas sin hacer `fetch` completo a toda la base de datos:

```typescript
// En el Store:
handleRealtimeUpdate: (reservaActualizada: Reserva) => {
  set((state) => {
    const existe = state.reservas.some(r => r.id === reservaActualizada.id);
    const nuevasReservas = existe
      ? state.reservas.map(r => r.id === reservaActualizada.id ? reservaActualizada : r)
      : [reservaActualizada, ...state.reservas];

    return {
      reservas: nuevasReservas,
      // Se recalculan las métricas automáticamente
      metricasReservas: calcularMetricas(nuevasReservas),
    };
  });
}
```

---

## 4. Reconciliación con Actualizaciones Optimistas (Optimistic Sync)

Para garantizar velocidad instantánea en la UI:

1. **Paso 1 (Local):** La acción del Store genera un `id` temporal o actualiza el registro en el estado antes de llamar a Supabase.
2. **Paso 2 (Servidor):** Se envía `supabase.from('reservas').upsert(...)`.
3. **Paso 3 (Confirmación):** El WebSocket de Supabase o la respuesta HTTP confirma el estado. El Store sustituye el registro temporal por el confirmado.
4. **Paso 4 (Error / Rollback):** Si ocurre un error de red, el Store revierte al estado previo guardado en memoria y notifica al usuario con un toast de error.
