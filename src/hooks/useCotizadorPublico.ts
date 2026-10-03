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
      // PASO 1 — Buscar cliente existente por número de celular
      // ----------------------------------------------------------------
      const telefonoNormalizado = datos.clienteCelular.trim().replace(/\s/g, '');

      const { data: clientesExistentes, error: errorBusqueda } = await supabase
        .from('clientes')
        .select('id, nombre')
        .or(`telefono.eq.${telefonoNormalizado},whatsapp.eq.${telefonoNormalizado}`)
        .limit(1);

      if (errorBusqueda) throw errorBusqueda;

      let clienteId: string;

      if (clientesExistentes && clientesExistentes.length > 0) {
        // ----------------------------------------------------------------
        // PASO 2a — Reutilizar cliente existente
        // ----------------------------------------------------------------
        clienteId = clientesExistentes[0].id;
      } else {
        // ----------------------------------------------------------------
        // PASO 2b — Crear nuevo cliente
        // ----------------------------------------------------------------
        const whatsappNormalizado = datos.clienteWhatsapp.trim().replace(/\s/g, '') || telefonoNormalizado;

        const { data: nuevoCliente, error: errorCliente } = await supabase
          .from('clientes')
          .insert({
            nombre: datos.clienteNombre.trim(),
            telefono: telefonoNormalizado,
            whatsapp: whatsappNormalizado,
            activo: true,
          })
          .select('id')
          .single();

        if (errorCliente) throw errorCliente;
        if (!nuevoCliente?.id) throw new Error('No se pudo crear el cliente');

        clienteId = nuevoCliente.id;
      }

      // ----------------------------------------------------------------
      // PASO 3 — Obtener consecutivo atómico vía RPC
      // ----------------------------------------------------------------
      const { data: consecutivo, error: errorConsecutivo } = await supabase
        .rpc('siguiente_consecutivo_cotizacion');

      if (errorConsecutivo) throw errorConsecutivo;
      if (!consecutivo) throw new Error('No se obtuvo consecutivo de Supabase');

      // ----------------------------------------------------------------
      // PASO 4 — Insertar cotización
      // ----------------------------------------------------------------
      const payload: Record<string, unknown> = {
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

      const { data: cotizacion, error: errorCotizacion } = await supabase
        .from('cotizaciones')
        .insert(payload)
        .select('id')
        .single();

      if (errorCotizacion) throw errorCotizacion;

      return {
        success: true,
        consecutivo: consecutivo as string,
        cotizacionId: cotizacion?.id,
      };
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido al guardar cotización';
      console.error('[useCotizadorPublico]', err);
      return { success: false, error: mensaje };
    }
  };

  return { guardarCotizacionPublica };
}
