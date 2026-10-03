import { supabase } from '../services/supabase';

/**
 * Utilidad unificada de Consecutivos Ordenados (iniciando en 1001).
 * Garantiza que nunca se generen números aleatorios y que siempre
 * se mantenga una secuencia estricta y sincronizada.
 */

export async function obtenerSiguienteConsecutivo(tipo: 'cotizacion' | 'reserva'): Promise<string> {
  const rpcNombre = tipo === 'cotizacion' ? 'siguiente_consecutivo_cotizacion' : 'siguiente_consecutivo_reserva';
  const prefijoDefecto = tipo === 'cotizacion' ? 'COT-' : 'RES-';

  // 1. Intentar vía RPC en Supabase (función atómica segura contra concurrencia)
  try {
    const { data: numRpc, error: errorRpc } = await supabase.rpc(rpcNombre);
    if (!errorRpc && numRpc && typeof numRpc === 'string') {
      // Normalizar: si viene con 6 ceros como COT-001001, convertir a COT-1001
      const match = numRpc.match(/^([A-Za-z]+-?)0*([1-9]\d*)$/);
      if (match) {
        const pref = match[1];
        const num = match[2];
        const numVal = parseInt(num, 10);
        return `${pref}${Math.max(1001, numVal)}`;
      }
      return numRpc;
    }
  } catch (errRpc) {
    console.warn(`[consecutivos] Aviso al invocar RPC ${rpcNombre}:`, errRpc);
  }

  // 2. Fallback resiliente: consultar último consecutivo en la base de datos
  try {
    const tabla = tipo === 'cotizacion' ? 'cotizaciones' : 'reservas';
    const { data: filas, error: errorSelect } = await supabase
      .from(tabla)
      .select('consecutivo')
      .not('consecutivo', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    let maxNumero = 1000;

    if (!errorSelect && filas && filas.length > 0) {
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
    }

    const siguienteNum = Math.max(1001, maxNumero + 1);

    // Intentar sincronizar en configuracion_general en segundo plano
    try {
      const campoConfig = tipo === 'cotizacion' ? 'siguiente_cotizacion' : 'siguiente_separacion';
      await supabase
        .from('configuracion_general')
        .update({ [campoConfig]: siguienteNum + 1 })
        .eq('id', 'general');
    } catch {
      // Silencioso si falla la actualización de configuración
    }

    return `${prefijoDefecto}${siguienteNum}`;
  } catch (errFallback) {
    console.error(`[consecutivos] Error en fallback de consecutivo para ${tipo}:`, errFallback);
    return `${prefijoDefecto}1001`;
  }
}

/**
 * Formatea un consecutivo para visualización limpia en insignias y mensajes
 * Ej: 'COT-1001' -> '#1001', 'RES-1002' -> '#1002'
 */
export function formatearConsecutivoSimple(consecutivo?: string | null): string {
  if (!consecutivo) return '#1001';
  const match = consecutivo.match(/\d+/);
  if (match) {
    return `#${match[0]}`;
  }
  return consecutivo.startsWith('#') ? consecutivo : `#${consecutivo}`;
}
