import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { ConfiguracionGeneral } from '../types';
import { CONFIGURACION_DEFAULT, getConfiguracionGlobal, setConfiguracionGlobal } from '../services/configuracion';

const STORAGE_KEY = 'fc_configuracion_general';

export function useConfiguracion() {
  const [config, setConfig] = useState<ConfiguracionGeneral>(() => getConfiguracionGlobal());
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Cargar configuración desde Supabase
  const cargarConfiguracion = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('configuracion_general')
        .select('*')
        .eq('id', 'general')
        .maybeSingle();

      if (error) {
        console.warn('Usando configuración local (tabla Supabase aún no disponible):', error.message);
        const guardado = localStorage.getItem(STORAGE_KEY);
        if (guardado) {
          const parsed = { ...CONFIGURACION_DEFAULT, ...JSON.parse(guardado) };
          setConfig(parsed);
          setConfiguracionGlobal(parsed);
        }
      } else if (data) {
        const completa: ConfiguracionGeneral = {
          ...CONFIGURACION_DEFAULT,
          ...data,
          redes_sociales: data.redes_sociales || CONFIGURACION_DEFAULT.redes_sociales,
        };
        setConfig(completa);
        setConfiguracionGlobal(completa);
      } else {
        // No hay fila 'general', intentar insertarla
        const initData = { ...CONFIGURACION_DEFAULT };
        await supabase.from('configuracion_general').upsert(initData);
      }
    } catch (err) {
      console.warn('Error al consultar configuracion_general:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarConfiguracion();
  }, [cargarConfiguracion]);

  // Guardar o actualizar configuración general
  const guardarConfiguracion = async (
    nuevosDatos: Partial<ConfiguracionGeneral>
  ): Promise<{ success: boolean; error?: string }> => {
    setGuardando(true);
    try {
      const configActualizada: ConfiguracionGeneral = {
        ...config,
        ...nuevosDatos,
        id: 'general',
        updated_at: new Date().toISOString(),
      };

      // 1. Guardar en memoria y localStorage primero para respuesta inmediata
      setConfig(configActualizada);
      setConfiguracionGlobal(configActualizada);

      // 2. Persistir en Supabase
      const { error } = await supabase
        .from('configuracion_general')
        .upsert(configActualizada);

      if (error) {
        console.warn('Error al guardar en Supabase configuracion_general (se mantiene local):', error.message);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error inesperado al guardar configuracion:', err);
      return { success: false, error: err?.message || 'Error al guardar configuración' };
    } finally {
      setGuardando(false);
    }
  };

  // Obtener y avanzar el número consecutivo de un tipo de documento
  const obtenerSiguienteNumero = async (
    tipo: 'cotizacion' | 'separacion' | 'abono' | 'estado_cuenta' | 'paz_salvo' | 'propuesta_menu'
  ): Promise<string> => {
    let prefijo = 'DOC-';
    let consecutivo = 1001;
    const campoConsecutivo: keyof ConfiguracionGeneral =
      tipo === 'cotizacion' ? 'siguiente_cotizacion' :
      tipo === 'separacion' ? 'siguiente_separacion' :
      tipo === 'abono' ? 'siguiente_abono' :
      tipo === 'estado_cuenta' ? 'siguiente_estado_cuenta' :
      tipo === 'paz_salvo' ? 'siguiente_paz_salvo' : 'siguiente_propuesta_menu';

    const campoPrefijo: keyof ConfiguracionGeneral =
      tipo === 'cotizacion' ? 'prefijo_cotizacion' :
      tipo === 'separacion' ? 'prefijo_separacion' :
      tipo === 'abono' ? 'prefijo_abono' :
      tipo === 'estado_cuenta' ? 'prefijo_estado_cuenta' :
      tipo === 'paz_salvo' ? 'prefijo_paz_salvo' : 'prefijo_propuesta_menu';

    prefijo = (config[campoPrefijo] as string) || 'DOC-';
    consecutivo = (config[campoConsecutivo] as number) || 1001;

    const formatted = `${prefijo}${consecutivo}`;

    // Incrementar en 1
    const nuevoNumero = consecutivo + 1;
    await guardarConfiguracion({ [campoConsecutivo]: nuevoNumero } as Partial<ConfiguracionGeneral>);

    return formatted;
  };

  // Restablecer valores de fábrica
  const restablecerPorDefecto = async (): Promise<{ success: boolean; error?: string }> => {
    return await guardarConfiguracion(CONFIGURACION_DEFAULT);
  };

  return {
    config,
    loading,
    guardando,
    cargarConfiguracion,
    guardarConfiguracion,
    obtenerSiguienteNumero,
    restablecerPorDefecto,
  };
}
