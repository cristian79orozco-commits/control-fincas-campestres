/**
 * calcularCotizacion.ts
 * Función compartida de cálculo de cotizaciones.
 * Usada tanto por el cotizador público (QuoteCalculator) como por el panel admin (AdminCotizaciones).
 * Fuente única de verdad — garantiza que ambos paneles calculen valores consistentes.
 */

import { Menu } from '../types';

export interface ParamsCotizacion {
  noches: number;
  personas: number;
  precioPp: number;          // precio base por persona / noche
  menuPrecioPp?: number;     // precio por persona del menú seleccionado
  cantidadServicios?: number; // número de servicios de alimentación (días)
  cantidadMascotas?: number;  // cantidad de mascotas incluidas
  valorMascota?: number;      // tarifa unitaria por mascota (va directamente al propietario de la finca)
  descuento?: number;        // descuento opcional
  recargo?: number;          // recargo opcional
}

export interface ResultadoCotizacion {
  subtotalAlojamiento: number;
  cantidadMascotas: number;
  valorMascota: number;
  costoMascotas: number;
  subtotalPropietario: number; // subtotalAlojamiento + costoMascotas
  costoAlimentacion: number;
  descuento: number;
  recargo: number;
  total: number;
}

export interface ItemMenuResuelto {
  menu?: Menu;
  menuCatalogo?: Menu;
  nombre: string;
  categoria: string;
  descripcion: string;
  imagenUrl?: string | null;
  condiciones?: string | null;
  precioPp: number;
  personas: number;
  cantidadServicios: number;
  subtotal: number;
}

/**
 * Calcula los subtotales de alojamiento, mascotas, alimentación, recargos/descuentos y total estimado.
 * El cobro de mascotas va directamente al dueño de la finca junto con el alojamiento.
 *
 * @param params - Parámetros de la cotización
 * @returns Subtotales y total garantizados
 */
export function calcularCotizacion(params: ParamsCotizacion): ResultadoCotizacion {
  const {
    noches,
    personas,
    precioPp,
    menuPrecioPp = 0,
    cantidadServicios = 0,
    cantidadMascotas = 0,
    valorMascota = 0,
    descuento = 0,
    recargo = 0,
  } = params;

  const n = Math.max(1, noches || 1);
  const p = Math.max(1, personas || 1);
  const subtotalAlojamiento = n * p * (precioPp || 0);

  const cantMascotas = Math.max(0, Math.round(cantidadMascotas || 0));
  const valMascota = Math.max(0, valorMascota || 0);
  const costoMascotas = cantMascotas * valMascota;
  const subtotalPropietario = subtotalAlojamiento + costoMascotas;

  const cant = cantidadServicios > 0 ? cantidadServicios : n;
  const costoAlimentacion = (menuPrecioPp || 0) > 0
    ? (menuPrecioPp || 0) * p * cant
    : 0;

  const total = Math.max(
    0,
    subtotalAlojamiento + costoMascotas + costoAlimentacion - (descuento || 0) + (recargo || 0)
  );

  return {
    subtotalAlojamiento,
    cantidadMascotas: cantMascotas,
    valorMascota: valMascota,
    costoMascotas,
    subtotalPropietario,
    costoAlimentacion,
    descuento: descuento || 0,
    recargo: recargo || 0,
    total,
  };
}

/**
 * Parsea y resuelve todos los menús seleccionados en una cotización o reserva
 * a partir del texto resumen (ej: "Gran Parrillada Mixta Campestre (1 serv. × 25 pers.) + Refrigerio Valluno (1 serv. × 10 pers.)")
 * y los cruza con el catálogo de menús para obtener descripciones, fotos, precios reales y subtotales exactos.
 */
export function resolverPlanesAlimentacionDetalle(params: {
  alimentacionTexto?: string | null;
  costoTotalReal?: number | null;
  menusCatalogo?: Menu[];
  menuPrincipal?: Menu | null;
  menuIdFallback?: string | null;
  personasDefault?: number;
  serviciosDefault?: number;
}): {
  items: ItemMenuResuelto[];
  totalCalculado: number;
  totalServicios: number;
  esMultiMenu: boolean;
} {
  const {
    alimentacionTexto,
    costoTotalReal = 0,
    menusCatalogo = [],
    menuPrincipal = null,
    menuIdFallback = null,
    personasDefault = 1,
    serviciosDefault = 1,
  } = params;

  const texto = (alimentacionTexto || '').trim();
  const catalogo = menusCatalogo || [];

  const buscarMenuEnCatalogo = (nombreBuscado: string, idFallback?: string | null): Menu | undefined => {
    const limpio = nombreBuscado.trim().toLowerCase();
    if (!limpio) return idFallback ? catalogo.find(m => m.id === idFallback) : undefined;
    // Coincidencia exacta
    const exacto = catalogo.find(m => m.nombre.trim().toLowerCase() === limpio);
    if (exacto) return exacto;
    // Coincidencia parcial
    const parcial = catalogo.find(
      m => limpio.includes(m.nombre.trim().toLowerCase()) || m.nombre.trim().toLowerCase().includes(limpio)
    );
    if (parcial) return parcial;
    if (idFallback) return catalogo.find(m => m.id === idFallback);
    return undefined;
  };

  const items: ItemMenuResuelto[] = [];

  if (texto && texto.toLowerCase() !== 'sin alimentación' && texto.toLowerCase() !== 'solo alojamiento') {
    const segmentos = texto.split(/\s+\+\s+/).map(s => s.trim()).filter(Boolean);

    for (let i = 0; i < segmentos.length; i++) {
      const seg = segmentos[i];
      // Patrón 1: "Nombre del Menú (X serv. × Y pers.)" o "Nombre del Menú (X serv. x Y pers.)"
      const matchServPers = seg.match(/^(.*?)\s*\((\d+)\s*serv(?:icio|\.)?s?\s*[×xX*]\s*(\d+)\s*pers(?:ona|\.)?s?\)\s*$/i);
      // Patrón 2: "Nombre del Menú (X servicio(s))"
      const matchSoloServ = !matchServPers ? seg.match(/^(.*?)\s*\((\d+)\s*servicio(?:\(s\)|s)?\)\s*$/i) : null;

      let nombreItem = seg;
      let cantServ = i === 0 ? Math.max(1, serviciosDefault) : 1;
      let cantPers = Math.max(1, personasDefault);

      if (matchServPers) {
        nombreItem = matchServPers[1].trim();
        cantServ = Math.max(1, parseInt(matchServPers[2], 10) || 1);
        cantPers = Math.max(1, parseInt(matchServPers[3], 10) || personasDefault);
      } else if (matchSoloServ) {
        nombreItem = matchSoloServ[1].trim();
        cantServ = Math.max(1, parseInt(matchSoloServ[2], 10) || 1);
      }

      const menuEncontrado =
        buscarMenuEnCatalogo(nombreItem, i === 0 ? (menuPrincipal?.id || menuIdFallback) : null) ||
        (segmentos.length === 1 && menuPrincipal ? menuPrincipal : undefined);

      const precioUnitario = menuEncontrado?.precio_pp
        ? Number(menuEncontrado.precio_pp)
        : (segmentos.length === 1 && costoTotalReal && costoTotalReal > 0
            ? Math.round(costoTotalReal / Math.max(1, cantPers * cantServ))
            : 0);

      const subtotalItem = precioUnitario * cantPers * cantServ;

      items.push({
        menu: menuEncontrado,
        menuCatalogo: menuEncontrado,
        nombre: menuEncontrado?.nombre || nombreItem,
        categoria: menuEncontrado?.categoria || 'Menú Campestre',
        descripcion:
          menuEncontrado?.descripcion ||
          'Preparación tradicional campestre elaborada con ingredientes frescos seleccionados para el grupo.',
        imagenUrl:
          menuEncontrado?.imagen_url ||
          menuEncontrado?.menu_imagenes?.find(img => img.es_principal)?.url ||
          menuEncontrado?.menu_imagenes?.[0]?.url ||
          null,
        condiciones: menuEncontrado?.condiciones || null,
        precioPp: precioUnitario,
        personas: cantPers,
        cantidadServicios: cantServ,
        subtotal: subtotalItem,
      });
    }
  }

  if (items.length === 0 && menuPrincipal) {
    const cantServ = Math.max(1, serviciosDefault);
    const cantPers = Math.max(1, personasDefault);
    const precioUnit = Number(menuPrincipal.precio_pp || 0);
    const sub = costoTotalReal && costoTotalReal > 0 ? costoTotalReal : precioUnit * cantPers * cantServ;
    items.push({
      menu: menuPrincipal,
      menuCatalogo: menuPrincipal,
      nombre: menuPrincipal.nombre,
      categoria: menuPrincipal.categoria || 'Menú Campestre',
      descripcion:
        menuPrincipal.descripcion ||
        'Preparación tradicional campestre elaborada con ingredientes frescos seleccionados para el grupo.',
      imagenUrl:
        menuPrincipal.imagen_url ||
        menuPrincipal.menu_imagenes?.find(img => img.es_principal)?.url ||
        menuPrincipal.menu_imagenes?.[0]?.url ||
        null,
      condiciones: menuPrincipal.condiciones || null,
      precioPp: precioUnit,
      personas: cantPers,
      cantidadServicios: cantServ,
      subtotal: sub,
    });
  }

  const sumaSubtotales = items.reduce((acc, it) => acc + it.subtotal, 0);
  if (items.length === 1 && costoTotalReal && costoTotalReal > 0 && sumaSubtotales !== costoTotalReal) {
    items[0].subtotal = costoTotalReal;
    if (items[0].precioPp <= 0) {
      items[0].precioPp = Math.round(costoTotalReal / Math.max(1, items[0].personas * items[0].cantidadServicios));
    }
  }

  const totalFinal =
    costoTotalReal && costoTotalReal > 0
      ? costoTotalReal
      : items.reduce((acc, it) => acc + it.subtotal, 0);

  const totalServicios = items.reduce((acc, it) => acc + it.cantidadServicios, 0);

  return {
    items,
    totalCalculado: totalFinal,
    totalServicios: Math.max(1, totalServicios),
    esMultiMenu: items.length > 1,
  };
}
