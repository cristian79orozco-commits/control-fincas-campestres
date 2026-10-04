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
