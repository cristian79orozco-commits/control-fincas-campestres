import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { ContenidoSitio, SeccionClave } from '../types';
import {
  CONTENIDO_SITIO_DEFAULT,
  getContenidoSitioGlobal,
  setContenidoSitioGlobal,
} from '../services/contenidoSitio';

const STORAGE_KEY = 'fc_contenido_sitio';

export function useContenidoSitio() {
  const [contenido, setContenido] = useState<ContenidoSitio>(() => getContenidoSitioGlobal());
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Cargar configuración de contenido desde Supabase
  const cargarContenido = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contenido_sitio')
        .select('*')
        .eq('id', 'principal')
        .maybeSingle();

      if (error) {
        console.warn('Usando contenido local (tabla Supabase aún no disponible):', error.message);
        const guardado = localStorage.getItem(STORAGE_KEY);
        if (guardado) {
          const parsed = { ...CONTENIDO_SITIO_DEFAULT, ...JSON.parse(guardado) };
          setContenido(parsed);
          setContenidoSitioGlobal(parsed);
        }
      } else if (data) {
        const completa: ContenidoSitio = {
          ...CONTENIDO_SITIO_DEFAULT,
          ...data,
          orden_secciones: Array.isArray(data.orden_secciones) && data.orden_secciones.length > 0
            ? data.orden_secciones
            : CONTENIDO_SITIO_DEFAULT.orden_secciones,
          destacados_items: Array.isArray(data.destacados_items) && data.destacados_items.length > 0
            ? data.destacados_items
            : CONTENIDO_SITIO_DEFAULT.destacados_items,
          faq_items: Array.isArray(data.faq_items) && data.faq_items.length > 0
            ? data.faq_items
            : CONTENIDO_SITIO_DEFAULT.faq_items,
        };
        setContenido(completa);
        setContenidoSitioGlobal(completa);
      } else {
        // No hay fila 'principal', intentar insertarla en Supabase
        const initData = { ...CONTENIDO_SITIO_DEFAULT };
        await supabase.from('contenido_sitio').upsert(initData);
      }
    } catch (err) {
      console.warn('Error al consultar contenido_sitio:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarContenido();
  }, [cargarContenido]);

  // Guardar o actualizar contenido
  const guardarContenido = async (
    nuevosDatos: Partial<ContenidoSitio>
  ): Promise<{ success: boolean; error?: string }> => {
    setGuardando(true);
    try {
      const contenidoActualizado: ContenidoSitio = {
        ...contenido,
        ...nuevosDatos,
        id: 'principal',
        updated_at: new Date().toISOString(),
      };

      // 1. Guardar en memoria y localStorage primero para reactividad instantánea
      setContenido(contenidoActualizado);
      setContenidoSitioGlobal(contenidoActualizado);

      // 2. Persistir en Supabase
      const { error } = await supabase
        .from('contenido_sitio')
        .upsert(contenidoActualizado);

      if (error) {
        console.warn('Error al guardar en Supabase contenido_sitio (se mantiene local):', error.message);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error inesperado al guardar contenido:', err);
      return { success: false, error: err?.message || 'Error al guardar personalización' };
    } finally {
      setGuardando(false);
    }
  };

  // Mover una sección arriba o abajo en el orden de visualización
  const moverSeccion = async (seccion: SeccionClave, direccion: 'arriba' | 'abajo') => {
    const orden = [...contenido.orden_secciones];
    const index = orden.indexOf(seccion);
    if (index === -1) return;

    if (direccion === 'arriba' && index > 0) {
      const temp = orden[index - 1];
      orden[index - 1] = orden[index];
      orden[index] = temp;
    } else if (direccion === 'abajo' && index < orden.length - 1) {
      const temp = orden[index + 1];
      orden[index + 1] = orden[index];
      orden[index] = temp;
    } else {
      return; // No se puede mover más allá de los extremos
    }

    await guardarContenido({ orden_secciones: orden });
  };

  // Alternar visibilidad de una sección
  const toggleSeccionVisible = async (seccion: SeccionClave) => {
    let campo: keyof ContenidoSitio;
    switch (seccion) {
      case 'banner': campo = 'banner_visible'; break;
      case 'hero': campo = 'hero_visible'; break;
      case 'destacados': campo = 'destacados_visible'; break;
      case 'estado': campo = 'estado_visible'; break;
      case 'filtros': campo = 'filtros_visible'; break;
      case 'catalogo': campo = 'catalogo_visible'; break;
      case 'menus': campo = 'menus_visible'; break;
      case 'faq': campo = 'faq_visible'; break;
      default: return;
    }

    const nuevoEstado = !contenido[campo];
    await guardarContenido({ [campo]: nuevoEstado } as Partial<ContenidoSitio>);
  };

  // Restablecer valores predeterminados
  const restablecerPorDefecto = async (): Promise<{ success: boolean; error?: string }> => {
    return await guardarContenido(CONTENIDO_SITIO_DEFAULT);
  };

  return {
    contenido,
    loading,
    guardando,
    cargarContenido,
    guardarContenido,
    moverSeccion,
    toggleSeccionVisible,
    restablecerPorDefecto,
  };
}
