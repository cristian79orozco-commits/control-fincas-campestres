import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Menu, MenuCategoria } from '../types';
import { obtenerGaleriaFotosMenu } from '../utils/menuUtils';

const ORDEN_CATEGORIAS: MenuCategoria[] = [
  'Desayuno',
  'Almuerzo',
  'Parrilla',
  'Cena',
  'Refrigerio',
  'Menú especial',
  'Paquetes',
];

export interface LightboxMenuState {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  title?: string;
  subtitle?: string;
}

export function useMenusPublicosController(menus: Menu[]) {
  // 1. Menús activos memoizados (60 FPS)
  const menusActivos = useMemo(() => menus.filter(m => m.activo), [menus]);

  // 2. Estado de visibilidad general de la sección
  const [seccionAbierta, setSeccionAbierta] = useState(true);

  // 3. Filtro rápido por categoría gastronómica
  const [categoriaActiva, setCategoriaActiva] = useState<'todas' | MenuCategoria>('todas');

  // 4. Menú expandido en el acordeón
  const [menuExpandidoId, setMenuExpandidoId] = useState<string | null>(() => menusActivos[0]?.id || null);

  // 5. Índice de foto activa por cada menú y control de URLs rotas
  const [fotoActivaPorMenu, setFotoActivaPorMenu] = useState<Record<string, number>>({});
  const [urlsRotas, setUrlsRotas] = useState<Record<string, boolean>>({});

  // 6. Estado del visor Lightbox a pantalla completa
  const [lightbox, setLightbox] = useState<LightboxMenuState>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  });

  // Categorías con conteo memoizadas
  const categoriasConConteo = useMemo(() => {
    const mapa = new Map<MenuCategoria, number>();
    for (const m of menusActivos) {
      mapa.set(m.categoria, (mapa.get(m.categoria) || 0) + 1);
    }
    return ORDEN_CATEGORIAS
      .filter(cat => (mapa.get(cat) || 0) > 0)
      .map(cat => ({
        categoria: cat,
        count: mapa.get(cat) || 0,
      }));
  }, [menusActivos]);

  // Menús filtrados según la categoría seleccionada
  const menusFiltrados = useMemo(() => {
    if (categoriaActiva === 'todas') return menusActivos;
    return menusActivos.filter(m => m.categoria === categoriaActiva);
  }, [menusActivos, categoriaActiva]);

  // Galerías de fotos depuradas por menú (excluyendo semillas de Unsplash si ya hay fotos propias)
  const galeriasPorMenu = useMemo(() => {
    const res: Record<string, string[]> = {};
    for (const m of menusActivos) {
      res[m.id] = obtenerGaleriaFotosMenu(m, urlsRotas);
    }
    return res;
  }, [menusActivos, urlsRotas]);

  // Asegurar que si la categoría activa se queda sin menús, vuelva a 'todas'
  useEffect(() => {
    if (categoriaActiva !== 'todas' && menusFiltrados.length === 0 && menusActivos.length > 0) {
      setCategoriaActiva('todas');
    }
  }, [categoriaActiva, menusFiltrados.length, menusActivos.length]);

  const toggleSeccion = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSeccionAbierta(prev => !prev);
  }, []);

  const seleccionarCategoria = useCallback((cat: 'todas' | MenuCategoria) => {
    setCategoriaActiva(cat);
    const lista = cat === 'todas' ? menusActivos : menusActivos.filter(m => m.categoria === cat);
    if (lista.length > 0) {
      setMenuExpandidoId(prev => (lista.some(m => m.id === prev) ? prev : lista[0].id));
    }
  }, [menusActivos]);

  const toggleMenu = useCallback((id: string) => {
    setMenuExpandidoId(prev => (prev === id ? null : id));
  }, []);

  const setFotoIndex = useCallback((menuId: string, idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFotoActivaPorMenu(prev => ({ ...prev, [menuId]: idx }));
  }, []);

  const cambiarFotoRelativa = useCallback((menuId: string, totalFotos: number, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (totalFotos <= 1) return;
    setFotoActivaPorMenu(prev => {
      const actual = prev[menuId] || 0;
      const nuevo = (actual + delta + totalFotos) % totalFotos;
      return { ...prev, [menuId]: nuevo };
    });
  }, []);

  const marcarImagenRota = useCallback((url: string) => {
    if (!url) return;
    setUrlsRotas(prev => (prev[url] ? prev : { ...prev, [url]: true }));
  }, []);

  const abrirLightboxMenu = useCallback((
    fotos: string[],
    index: number,
    nombreMenu: string,
    categoriaMenu: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    if (!fotos || fotos.length === 0) return;
    setLightbox({
      isOpen: true,
      images: fotos,
      currentIndex: Math.max(0, Math.min(index, fotos.length - 1)),
      title: nombreMenu,
      subtitle: `Categoría: ${categoriaMenu}`,
    });
  }, []);

  const cerrarLightbox = useCallback(() => {
    setLightbox(prev => ({ ...prev, isOpen: false }));
  }, []);

  const setLightboxIndex = useCallback((idx: number) => {
    setLightbox(prev => ({ ...prev, currentIndex: idx }));
  }, []);

  const irACatalogoFincas = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const el = document.getElementById('catalogo');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return {
    menusActivos,
    menusFiltrados,
    categoriasConConteo,
    categoriaActiva,
    seleccionarCategoria,
    seccionAbierta,
    setSeccionAbierta,
    toggleSeccion,
    menuExpandidoId,
    toggleMenu,
    fotoActivaPorMenu,
    setFotoIndex,
    cambiarFotoRelativa,
    galeriasPorMenu,
    marcarImagenRota,
    lightbox,
    abrirLightboxMenu,
    cerrarLightbox,
    setLightboxIndex,
    irACatalogoFincas,
  };
}

