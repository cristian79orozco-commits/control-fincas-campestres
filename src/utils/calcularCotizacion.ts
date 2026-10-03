/**
 * calcularCotizacion.ts
 * Función compartida de cálculo de cotizaciones.
 * Usada tanto por el cotizador público (QuoteCalculator) como por el panel admin.
 * Fuente única de verdad — no duplicar esta lógica en otros componentes.
 */

export interface ParamsCotizacion {
  noches: number;
  personas: number;
  precioPp: number;          // precio base por persona / noche
  menuPrecioPp?: number;     // precio por persona del menú seleccionado
  cantidadServicios?: number; // número de servicios de alimentación (días)
}

export interface ResultadoCotizacion {
  subtotalAlojamiento: number;
  costoAlimentacion: number;
  total: number;
}

/**
 * Calcula los subtotales y el total de una cotización.
 *
 * @param params - Parámetros de la cotización
 * @returns Subtotales y total
 */
export function calcularCotizacion(params: ParamsCotizacion): ResultadoCotizacion {
  const { noches, personas, precioPp, menuPrecioPp = 0, cantidadServicios = 0 } = params;

  const subtotalAlojamiento = noches * personas * precioPp;
  const costoAlimentacion = menuPrecioPp > 0
    ? menuPrecioPp * personas * (cantidadServicios || noches || 1)
    : 0;
  const total = subtotalAlojamiento + costoAlimentacion;

  return { subtotalAlojamiento, costoAlimentacion, total };
}
