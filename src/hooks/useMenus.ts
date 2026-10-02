import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Menu, MenuImagen } from '../types';

// Datos semilla de respaldo si Supabase aún no tiene la tabla migrada o está vacía
export const MENUS_DEFAULT: Menu[] = [
  {
    id: 'menu-1',
    nombre: 'Desayuno Campestre Típico',
    categoria: 'Desayuno',
    precio_pp: 18000,
    descripcion: 'Calentao tradicional de la casa con fríjol y hogao, huevos al gusto, arepa de choclo con quesito cuajada, pan caliente, jugo de naranja natural y chocolate en jarra o café de greca.',
    condiciones: 'Servicio entre 7:30 a.m. y 10:00 a.m. Mínimo 4 personas. Incluye menaje y vajilla.',
    imagen_url: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80',
    activo: true,
  },
  {
    id: 'menu-2',
    nombre: 'Sancocho Tradicional de Gallina en Leña',
    categoria: 'Almuerzo',
    precio_pp: 35000,
    descripcion: 'Cocido tradicional en leña de gallina criolla con plátano verde, yuca suave, papa pastusa y mazorca tierna. Acompañado de presa dorada, arroz blanco, aguacate maduro, ensalada campesina y limonada natural con panela.',
    condiciones: 'Preparación en sitio por cocinera campesina. Mínimo 8 personas. Confirmar con 24 horas de anticipación.',
    imagen_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
    activo: true,
  },
  {
    id: 'menu-3',
    nombre: 'Gran Parrillada Mixta Campestre',
    categoria: 'Parrilla',
    precio_pp: 48000,
    descripcion: 'Corte grueso de churrasco de res a la parrilla, pechuga marinada a las finas hierbas, chorizo santarrosano artesanal y morcilla criolla. Servido con papas saladas, arepas con mantequilla, chimichurri argentino de la casa y guacamole rústico.',
    condiciones: 'Incluye servicio de parrillero profesional durante 3 horas, carbón vegetal de leña y montaje.',
    imagen_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
    activo: true,
  },
  {
    id: 'menu-4',
    nombre: 'Cena Ligera Gourmet Campestre',
    categoria: 'Cena',
    precio_pp: 25000,
    descripcion: 'Crema aterciopelada de calabaza y zanahoria de la huerta con croutons aromatizados, pechuga a la plancha sobre cama de vegetales salteados al wok y tostadas con finas hierbas y queso campesino.',
    condiciones: 'Servicio entre 6:30 p.m. y 8:30 p.m. Mínimo 4 personas.',
    imagen_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    activo: true,
  },
  {
    id: 'menu-5',
    nombre: 'Refrigerio Valluno con Empanadas Crocantes',
    categoria: 'Refrigerio',
    precio_pp: 12000,
    descripcion: 'Dúo de empanadas artesanales crocantes de carne y papa con ají casero pique suave y limón, acompañado de champús valluno frío o maracuyada refrescante.',
    condiciones: 'Ideal para la media tarde o receso de actividades. Mínimo 6 personas.',
    imagen_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80',
    activo: true,
  },
  {
    id: 'menu-6',
    nombre: 'Costillas BBQ Ahumadas en Madera Frutal',
    categoria: 'Menú especial',
    precio_pp: 42000,
    descripcion: 'Costillar tierno de cerdo glaseado lentamente en salsa barbacoa artesanal de panela y especias, papas rústicas al romero y mazorquitas asadas a la mantequilla.',
    condiciones: 'Tiempo de preparación en sitio: 4 horas. Solicitar con 48h de anticipación.',
    imagen_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    activo: true,
  },
  {
    id: 'menu-7',
    nombre: 'Paquete Pensión Completa Campestre',
    categoria: 'Paquetes',
    precio_pp: 75000,
    descripcion: 'Plan todo incluido de alimentación por persona y día: Desayuno típico campesino + Almuerzo a elección (Sancocho o Parrillada) + Refrigerio de la tarde + Cena completa.',
    condiciones: 'Tarifa por persona y por día completo. Aplica para toda la estancia de los huéspedes registrados.',
    imagen_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    activo: true,
  },
];

export function useMenus() {
  const [menus, setMenus] = useState<Menu[]>(MENUS_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('menus')
        .select(`
          *,
          menu_imagenes (
            id,
            menu_id,
            url,
            alt,
            orden,
            es_principal
          )
        `)
        .order('categoria', { ascending: true })
        .order('nombre', { ascending: true });

      if (err) {
        // Si la tabla no existe aún en Supabase, usamos el fallback local
        console.warn('Supabase: tabla menus no encontrada o no migrada aún, usando fallback:', err.message);
        // Intentar leer de localStorage si el usuario creó menús locales
        const cached = localStorage.getItem('fc_menus_cache');
        if (cached) {
          try {
            setMenus(JSON.parse(cached));
          } catch {
            setMenus(MENUS_DEFAULT);
          }
        } else {
          setMenus(MENUS_DEFAULT);
        }
      } else if (data && data.length > 0) {
        setMenus(data as Menu[]);
        localStorage.setItem('fc_menus_cache', JSON.stringify(data));
      } else {
        // Si la tabla existe pero está vacía, usar defaults
        setMenus(MENUS_DEFAULT);
      }
    } catch (ex: any) {
      console.error('Error fetching menus:', ex);
      setError(ex.message || 'Error cargando menús');
      const cached = localStorage.getItem('fc_menus_cache');
      if (cached) {
        try { setMenus(JSON.parse(cached)); } catch { setMenus(MENUS_DEFAULT); }
      } else {
        setMenus(MENUS_DEFAULT);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  // Guardar (crear o editar)
  const guardar = async (
    menuData: Partial<Menu>,
    imagenesUrls: string[] = []
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const payload = {
        nombre: menuData.nombre?.trim() || 'Nuevo Menú',
        descripcion: menuData.descripcion?.trim() || null,
        categoria: menuData.categoria || 'Almuerzo',
        precio_pp: Number(menuData.precio_pp) || 0,
        condiciones: menuData.condiciones?.trim() || null,
        imagen_url: imagenesUrls[0] || menuData.imagen_url || null,
        activo: menuData.activo ?? true,
      };

      let menuId = menuData.id;

      // Intentar en Supabase
      const { data, error: err } = menuId && !menuId.startsWith('menu-')
        ? await supabase.from('menus').update(payload).eq('id', menuId).select().single()
        : await supabase.from('menus').insert(payload).select().single();

      if (err) {
        console.warn('Guardando en almacenamiento local por error Supabase:', err.message);
        // Fallback local
        const idLocal = menuId || `menu-${Date.now()}`;
        const nuevoMenu: Menu = {
          id: idLocal,
          ...payload,
          menu_imagenes: imagenesUrls.map((url, i) => ({
            menu_id: idLocal,
            url,
            orden: i,
            es_principal: i === 0,
          })),
        };

        setMenus(prev => {
          const index = prev.findIndex(m => m.id === idLocal);
          const updated = index >= 0
            ? prev.map(m => (m.id === idLocal ? nuevoMenu : m))
            : [nuevoMenu, ...prev];
          localStorage.setItem('fc_menus_cache', JSON.stringify(updated));
          return updated;
        });

        return { success: true, id: idLocal };
      }

      menuId = data.id;

      // Gestionar imágenes si hay URLs nuevas
      if (imagenesUrls.length > 0 && menuId) {
        try {
          // Eliminar imágenes anteriores y reinsertar
          await supabase.from('menu_imagenes').delete().eq('menu_id', menuId);
          const imagenesRows = imagenesUrls.map((url, idx) => ({
            menu_id: menuId,
            url,
            orden: idx,
            es_principal: idx === 0,
          }));
          await supabase.from('menu_imagenes').insert(imagenesRows);
        } catch (imgErr) {
          console.warn('Error sincronizando imagenes de menú en Supabase:', imgErr);
        }
      }

      await fetchMenus();
      return { success: true, id: menuId };
    } catch (e: any) {
      console.error('Error guardando menú:', e);
      return { success: false, error: e.message || 'Error desconocido' };
    }
  };

  // Cambiar estado activo/inactivo
  const cambiarEstado = async (id: string, activo: boolean): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: err } = await supabase.from('menus').update({ activo }).eq('id', id);
      if (err) {
        // Fallback local
        setMenus(prev => {
          const updated = prev.map(m => m.id === id ? { ...m, activo } : m);
          localStorage.setItem('fc_menus_cache', JSON.stringify(updated));
          return updated;
        });
        return { success: true };
      }
      await fetchMenus();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  // Eliminar
  const eliminar = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: err } = await supabase.from('menus').delete().eq('id', id);
      if (err) {
        // Fallback local
        setMenus(prev => {
          const updated = prev.filter(m => m.id !== id);
          localStorage.setItem('fc_menus_cache', JSON.stringify(updated));
          return updated;
        });
        return { success: true };
      }
      await fetchMenus();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  return {
    menus,
    loading,
    error,
    recargarMenus: fetchMenus,
    guardar,
    cambiarEstado,
    eliminar,
  };
}
