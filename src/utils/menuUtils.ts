import type { Menu } from '../types';

/**
 * Resuelve la mejor imagen para mostrar en un menú.
 * Prioriza fotos reales subidas por el usuario (en Supabase Storage o menu_imagenes)
 * sobre URLs de muestra/semilla (Unsplash).
 */
export function obtenerFotoMenu(menu?: Menu | null): string {
  if (!menu) return '';

  const hijas = menu.menu_imagenes || [];
  const principalHija = hijas.find(h => h.es_principal)?.url;
  const primeraHija = hijas[0]?.url;

  // 1. Si hay alguna foto subida a Supabase o no-Unsplash en menu_imagenes, tiene máxima prioridad
  if (principalHija && (principalHija.includes('supabase.co') || !principalHija.includes('unsplash.com'))) {
    return principalHija;
  }
  if (primeraHija && (primeraHija.includes('supabase.co') || !primeraHija.includes('unsplash.com'))) {
    return primeraHija;
  }

  // 2. Revisar imagen_url directa del menú
  if (menu.imagen_url) {
    if (menu.imagen_url.includes('supabase.co') || !menu.imagen_url.includes('unsplash.com')) {
      return menu.imagen_url;
    }
  }

  // 3. Si alguna hija es de Supabase
  const supabaseHija = hijas.find(h => h.url?.includes('supabase.co'))?.url;
  if (supabaseHija) return supabaseHija;

  // 4. Fallbacks a la imagen disponible
  return principalHija || primeraHija || menu.imagen_url || '';
}

/**
 * Obtiene la galería depurada de imágenes de un menú.
 * Si el menú ya cuenta con fotografías reales subidas por el administrador (ej. WebP en Supabase),
 * excluye automáticamente las URLs de plantilla/semilla (Unsplash) residuales y URLs con error de carga.
 */
export function obtenerGaleriaFotosMenu(
  menu?: Menu | null,
  urlsRotas?: Record<string, boolean>
): string[] {
  if (!menu) return [];

  const candidatas: string[] = [];
  const principal = obtenerFotoMenu(menu);
  if (principal) candidatas.push(principal.trim());

  if (menu.menu_imagenes && menu.menu_imagenes.length > 0) {
    [...menu.menu_imagenes]
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .forEach(img => {
        const u = img.url?.trim();
        if (u && !candidatas.includes(u)) {
          candidatas.push(u);
        }
      });
  }

  if (menu.imagen_url?.trim() && !candidatas.includes(menu.imagen_url.trim())) {
    candidatas.push(menu.imagen_url.trim());
  }

  // Filtrar URLs que hayan reportado error de carga
  const validas = urlsRotas
    ? candidatas.filter(u => !urlsRotas[u])
    : candidatas;

  // Si existen fotos reales subidas por el usuario (no-Unsplash), descartar fotos semilla de Unsplash
  const fotosPropias = validas.filter(u => !u.includes('unsplash.com'));
  if (fotosPropias.length > 0) {
    return fotosPropias;
  }

  return validas;
}

