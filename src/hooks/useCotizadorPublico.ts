/**
 * useCotizadorPublico.ts
 * Hook orquestador del flujo público de cotización.
 *
 * Responsabilidades:
 * 1. Buscar si el cliente ya existe por número de celular (evitar duplicados).
 * 2. Si no existe → crear cliente en Supabase.
 * 3. Si existe → reutilizar su ID.
 * 4. Obtener consecutivo COT-XXXXXX mediante función SQL atómica (RPC).
 * 5. Crear cotización vinculada al cliente_id, finca_id y menu_id.
 * 6. Retornar { success, consecutivo, cotizacionId }.
 */

import { supabase } from '../services/supabase';
import { obtenerSiguienteConsecutivo } from '../utils/consecutivos';
import { generarUUID } from '../utils/uuid';

// -----------------------------------------------------------------------
// Tipos públicos
// -----------------------------------------------------------------------

export interface DatosCotizacionPublica {
  clienteNombre: string;
  clienteCelular: string;
  clienteWhatsapp: string;
  fincaId: string;
  fechaInicio: string;
  fechaFin: string;
  personas: number;
  alimentacion: string;
  menuId?: string;
  cantidadServicios: number;
  precioBasePp: number;
  subtotalAlojamiento: number;
  costoAlimentacion: number;
  total: number;
}

export interface ResultadoCotizacionPublica {
  success: boolean;
  consecutivo?: string;
  cotizacionId?: string;
  error?: string;
}

// -----------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------

export function useCotizadorPublico() {
  /**
   * Orquesta la creación de un cliente (o reutilización si ya existe)
   * y la inserción de la cotización con su consecutivo atómico.
   */
  const guardarCotizacionPublica = async (
    datos: DatosCotizacionPublica
  ): Promise<ResultadoCotizacionPublica> => {
    try {
      // ----------------------------------------------------------------
      // PASO 1 — Buscar cliente existente por número de celular (deduplicación inteligente)
      // ----------------------------------------------------------------
      const digitosTel = datos.clienteCelular.replace(/\D/g, '');
      const digitosTel10 = digitosTel.startsWith('57') && digitosTel.length === 12 ? digitosTel.slice(2) : digitosTel;
      const digitosTel57 = digitosTel.length === 10 ? `57${digitosTel}` : digitosTel;

      // Buscar si existe por cualquiera de los formatos comunes
      const { data: clientesExistentes, error: errorBusqueda } = await supabase
        .from('clientes')
        .select('id, nombre, apellido, telefono, whatsapp')
        .or(`telefono.eq.${digitosTel},whatsapp.eq.${digitosTel},telefono.eq.${digitosTel10},whatsapp.eq.${digitosTel10},telefono.eq.${digitosTel57},whatsapp.eq.${digitosTel57}`)
        .limit(1);

      if (errorBusqueda) throw errorBusqueda;

      let clienteId: string;

      if (clientesExistentes && clientesExistentes.length > 0) {
        // ----------------------------------------------------------------
        // PASO 2a — Reutilizar cliente existente (no duplicar en la base de datos)
        // ----------------------------------------------------------------
        clienteId = clientesExistentes[0].id;

        // Actualizar datos del cliente si el nombre previo estaba incompleto
        try {
          await supabase
            .from('clientes')
            .update({
              nombre: datos.clienteNombre.trim(),
              whatsapp: datos.clienteWhatsapp.replace(/\D/g, '') || digitosTel57,
              activo: true,
            })
            .eq('id', clienteId);
        } catch {
          // Silencioso si falla la actualización menor
        }
      } else {
        // ----------------------------------------------------------------
        // PASO 2b — Crear nuevo cliente
        // ----------------------------------------------------------------
        const whatsappFinal = datos.clienteWhatsapp.replace(/\D/g, '') || digitosTel57;

        const { data: nuevoCliente, error: errorCliente } = await supabase
          .from('clientes')
          .insert({
            nombre: datos.clienteNombre.trim(),
            telefono: digitosTel10 || digitosTel,
            whatsapp: whatsappFinal,
            activo: true,
          })
          .select('id')
          .single();

        if (errorCliente) throw errorCliente;
        if (!nuevoCliente?.id) throw new Error('No se pudo crear el cliente');

        clienteId = nuevoCliente.id;
      }

      // ----------------------------------------------------------------
      // PASO 3 — Obtener consecutivo estrictamente secuencial iniciando en 1001
      // ----------------------------------------------------------------
      const consecutivo = await obtenerSiguienteConsecutivo('cotizacion');

      // ----------------------------------------------------------------
      // PASO 4 — Insertar cotización con UUID propio para evitar chequeo SELECT en RLS
      // ----------------------------------------------------------------
      const newCotId = generarUUID();

      const payload: Record<string, unknown> = {
        id: newCotId,
        cliente_id: clienteId,
        finca_id: datos.fincaId,
        fecha_inicio: datos.fechaInicio,
        fecha_fin: datos.fechaFin,
        personas: datos.personas,
        alimentacion: datos.alimentacion,
        precio_base_pp: datos.precioBasePp,
        subtotal_alojamiento: datos.subtotalAlojamiento,
        costo_alimentacion: datos.costoAlimentacion,
        cantidad_alimentacion: datos.cantidadServicios,
        descuento: 0,
        recargo: 0,
        total: datos.total,
        consecutivo: consecutivo,
        estado: 'cotizada',
      };

      // Incluir menu_id solo si está definido
      if (datos.menuId) {
        payload.menu_id = datos.menuId;
      }

      // IMPORTANTE: No encadenar .select('id') porque el rol anon en Supabase
      // solo tiene política de INSERT, y .select() dispara un chequeo SELECT en Postgres
      const { error: errorCotizacion } = await supabase
        .from('cotizaciones')
        .insert(payload);

      if (errorCotizacion) throw errorCotizacion;

      return {
        success: true,
        consecutivo: consecutivo,
        cotizacionId: newCotId,
      };
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido al guardar cotización';
      console.error('[useCotizadorPublico]', err);
      return { success: false, error: mensaje };
    }
  };

  return { guardarCotizacionPublica };
}
