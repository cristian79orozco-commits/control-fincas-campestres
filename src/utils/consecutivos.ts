import { supabase } from '../services/supabase';

/**
 * Utilidad unificada de Consecutivos Numéricos Ordenados (iniciando en 1001).
 * Garantiza formato puramente numérico (ej: 1001, 1002...) sin letras al inicio,
 * facilitando el seguimiento y unificando el flujo entre clientes y administración.
 */

export async function obtenerSiguienteConsecutivo(tipo: 'cotizacion' | 'reserva'): Promise<string> {
  const rpcNombre = tipo === 'cotizacion' ? 'siguiente_consecutivo_cotizacion' : 'siguiente_consecutivo_reserva';

  // 1. Intentar vía RPC en Supabase (función atómica concurrente)
  try {
    const { data: numRpc, error: errorRpc } = await supabase.rpc(rpcNombre);
    if (!errorRpc && numRpc !== null && numRpc !== undefined) {
      // Extraer únicamente los dígitos numéricos para garantizar formato '1001' sin letras iniciales
      const match = String(numRpc).match(/\d+/g);
      if (match) {
        const numVal = parseInt(match.join(''), 10);
        return String(Math.max(1001, numVal));
      }
      const limp = String(numRpc).replace(/^[A-Za-z\-]+/, '').trim();
      if (limp) return limp;
    }
  } catch (errRpc) {
    console.warn(`[consecutivos] Aviso al invocar RPC ${rpcNombre}:`, errRpc);
  }

  // 2. Fallback resiliente: consultar último consecutivo en la base de datos
  // Se evalúan ambas tablas para mantener sincronía sin duplicar códigos de seguimiento
  try {
    const [respCots, respRes] = await Promise.all([
      supabase.from('cotizaciones').select('consecutivo').not('consecutivo', 'is', null).limit(100),
      supabase.from('reservas').select('consecutivo').not('consecutivo', 'is', null).limit(100),
    ]);

    let maxNumero = 1000;

    const procesarFilas = (filas: Array<{ consecutivo?: string | null }> | null) => {
      if (!filas) return;
      for (const f of filas) {
        if (f.consecutivo) {
          const match = String(f.consecutivo).match(/\d+/g);
          if (match) {
            const num = parseInt(match.join(''), 10);
            if (!isNaN(num) && num > maxNumero && num < 999999) {
              maxNumero = num;
            }
          }
        }
      }
    };

    procesarFilas(respCots.data);
    procesarFilas(respRes.data);

    const siguienteNum = Math.max(1001, maxNumero + 1);

    // Intentar sincronizar en configuracion_general en segundo plano
    try {
      const campoConfig = tipo === 'cotizacion' ? 'siguiente_cotizacion' : 'siguiente_separacion';
      await supabase
        .from('configuracion_general')
        .update({ [campoConfig]: siguienteNum + 1 })
        .eq('id', 'general');
    } catch {
      // Silencioso si falla la sincronización en configuracion_general
    }

    return String(siguienteNum);
  } catch (errFallback) {
    console.error(`[consecutivos] Error en fallback de consecutivo para ${tipo}:`, errFallback);
    return '1001';
  }
}

/**
 * Formatea un consecutivo para visualización limpia
 * Devuelve el número secuencial limpio sin letras al inicio (ej: 'COT-1001' -> '1001', '1001' -> '1001')
 */
export function formatearConsecutivoSimple(consecutivo?: string | null): string {
  if (!consecutivo) return '1001';
  const match = String(consecutivo).match(/\d+/g);
  if (match) {
    return match.join('');
  }
  return String(consecutivo).replace(/^[A-Za-z\-]+/, '') || '1001';
}

export type TipoDocumentoPrefijo =
  | 'cotizacion'
  | 'separacion'
  | 'abono'
  | 'estado_cuenta'
  | 'paz_salvo'
  | 'menu';

export const PREFIJOS_DOCUMENTOS_DEFECTO: Record<TipoDocumentoPrefijo, string> = {
  cotizacion: 'COT-',
  separacion: 'SEP-',
  abono: 'ABO-',
  estado_cuenta: 'SAL-',
  paz_salvo: 'PAZ-',
  menu: 'MEN-',
};

/**
 * Formatea un consecutivo vinculando el número base de la cotización/reserva
 * con las letras iniciales (prefijo) correspondientes al tipo de documento a emitir.
 * Ejemplos:
 *  - Base '1001' + 'cotizacion' -> 'COT-1001'
 *  - Base '1001' + 'separacion' -> 'SEP-1001'
 *  - Base '1001' + 'abono' -> 'ABO-1001' (o 'ABO-1001-2' para segundo abono)
 *  - Base '1001' + 'estado_cuenta' -> 'SAL-1001'
 *  - Base '1001' + 'paz_salvo' -> 'PAZ-1001'
 *  - Base '1001' + 'menu' -> 'MEN-1001'
 */
export function formatearConsecutivoConPrefijo(
  consecutivoBase: string | number | undefined | null,
  tipo: TipoDocumentoPrefijo,
  subIndice?: number,
  prefijosPersonalizados?: Partial<Record<TipoDocumentoPrefijo, string>>
): string {
  const numBase = formatearConsecutivoSimple(consecutivoBase ? String(consecutivoBase) : '1001');
  const prefijoConfig = prefijosPersonalizados?.[tipo];
  
  let prefijoFinal: string;
  if (prefijoConfig !== undefined && prefijoConfig !== null) {
    // Si viene configurado (ej: 'COT-' o 'COT'), asegurar formato limpio
    prefijoFinal = prefijoConfig.trim();
    if (prefijoFinal && !prefijoFinal.endsWith('-')) {
      prefijoFinal += '-';
    }
  } else {
    prefijoFinal = PREFIJOS_DOCUMENTOS_DEFECTO[tipo] || '';
  }

  const sufijo = subIndice !== undefined && subIndice > 1 ? `-${subIndice}` : '';
  return `${prefijoFinal}${numBase}${sufijo}`;
}
