/**
 * calcularCotizacion.ts
 * Función compartida de cálculo de cotizaciones.
 * Usada tanto por el cotizador público (QuoteCalculator) como por el panel admin (AdminCotizaciones).
 * Fuente única de verdad — garantiza que ambos paneles calculen valores consistentes.
 */

export interface ParamsCotizacion {
  noches: number;
  personas: number;
  precioPp: number;          // precio base por persona / noche
  menuPrecioPp?: number;     // precio por persona del menú seleccionado
  cantidadServicios?: number; // número de servicios de alimentación (días)
  descuento?: number;        // descuento opcional
  recargo?: number;          // recargo opcional
}

export interface ResultadoCotizacion {
  subtotalAlojamiento: number;
  costoAlimentacion: number;
  descuento: number;
  recargo: number;
  total: number;
}

/**
 * Calcula los subtotales de alojamiento, alimentación, recargos/descuentos y total estimado.
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
    descuento = 0,
    recargo = 0,
  } = params;

  const n = Math.max(1, noches || 1);
  const p = Math.max(1, personas || 1);
  const subtotalAlojamiento = n * p * (precioPp || 0);

  const cant = cantidadServicios > 0 ? cantidadServicios : n;
  const costoAlimentacion = (menuPrecioPp || 0) > 0
    ? (menuPrecioPp || 0) * p * cant
    : 0;

  const total = Math.max(0, subtotalAlojamiento + costoAlimentacion - (descuento || 0) + (recargo || 0));

  return {
    subtotalAlojamiento,
    costoAlimentacion,
    descuento: descuento || 0,
    recargo: recargo || 0,
    total,
  };
}
