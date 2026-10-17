/**
 * Servicio de generación de documentos PDF — Fase 1, 2 y 4
 * Utiliza jsPDF para crear documentos oficiales vinculados a reservas, cotizaciones y menús.
 *
 * Fase 4: Integración automática con ConfiguracionGeneral:
 *  - Nombre, NIT, eslogan, logo y datos de contacto de la empresa
 *  - Encabezados y pie de página parametrizados desde Supabase
 *  - Términos, condiciones y cláusulas legales dinámicas
 *  - Prefijos y numeración consecutiva configurable
 *
 * Documentos disponibles:
 *  - cotizacion     : Propuesta formal de cotización
 *  - separacion     : Documento de separación / reserva inicial
 *  - abono          : Comprobante de abono de pago
 *  - estado_cuenta  : Estado de cuenta con historial de pagos
 *  - paz_salvo      : Paz y salvo (solo cuando saldo = 0)
 *  - propuesta_alim : Propuesta gastronómica de menús
 */

import jsPDF from 'jspdf';
import type { Reserva, Pago, Menu, Cliente, Finca, CotizacionDB, ConfiguracionGeneral, CierreReserva } from '../types';
import {
  calcularSaldo,
  desglosarFinanzasReserva,
  obtenerNombreClienteHistorico,
  obtenerNombreFincaHistorico,
  obtenerContactoClienteHistorico,
} from '../types';
import { getConfiguracionGlobal } from './configuracion';
import { formatearConsecutivoConPrefijo, formatearConsecutivoSimple } from '../utils/consecutivos';
import { LOGO_EMPRESA_BASE64, LOGO_FORMAT } from '../assets/logoBase64';

export interface ResultadoDocumentoPdf {
  doc: jsPDF;
  num: string;
  blob: Blob;
  nombreArchivo: string;
}

export async function subirDocumentoStorage(blob: Blob, nombreArchivo: string): Promise<string | null> {
  try {
    const { supabase } = await import('./supabase');
    const path = `documentos/${Date.now()}_${nombreArchivo}`;
    const { error } = await supabase.storage.from('finca-imagenes').upload(path, blob, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (error) {
      console.warn('[documentos] Aviso al subir a storage:', error.message);
      return null;
    }
    const { data } = supabase.storage.from('finca-imagenes').getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (err) {
    console.warn('[documentos] Excepción al subir documento:', err);
    return null;
  }
}

export interface PropuestaAlimentacionDatos {
  menu: Menu;
  cliente?: Pick<Cliente, 'nombre' | 'apellido' | 'whatsapp' | 'correo'> | null;
  finca?: { nombre: string; zona?: string } | null;
  personas?: number;
  cantidadServicios?: number;
  fechaEvento?: string;
  notasEspeciales?: string;
  config?: ConfiguracionGeneral;
  consecutivo?: string | number | null;
  tituloDocumento?: string;
}

// ---------------------------------------------------------------
// Helpers de formato
// ---------------------------------------------------------------
function formatFecha(f?: string | null): string {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

function formatCOP(v: number): string {
  return '$' + v.toLocaleString('es-CO') + ' COP';
}

function nombreCompleto(reserva: Reserva): string {
  if (!reserva.clientes) return 'Cliente sin nombre';
  return `${reserva.clientes.nombre} ${reserva.clientes.apellido || ''}`.trim();
}

async function urlABase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------
// Sanitizador de texto y adaptadores vectoriales para jsPDF
// ---------------------------------------------------------------

/**
 * Normaliza y sanea cualquier texto que vaya a ser impreso en jsPDF con fuentes estándar (Helvetica).
 * Reemplaza viñetas complejas, caracteres fuera de norma WinAnsi y emojis que corrompen el PDF.
 */
export function sanearTextoParaPdf(texto?: string | null): string {
  if (!texto) return '';
  return texto
    // Normalizar viñetas que inician línea a "- "
    .replace(/(^|\n)\s*[•\u2022\u2023\u25E6\u2043\u2219]\s*/g, '$1- ')
    // Cualquier otra viñeta intermedia cambiarla a separador limpio " | "
    .replace(/[•\u2022\u2023\u25E6\u2043\u2219]/g, ' | ')
    // Eliminar checkmarks Unicode directos (los checkmarks se dibujan vectorialmente)
    .replace(/[\u2713\u2714\u2611\u2705]/g, '')
    // Eliminar emojis (2 a 4 bytes de surrogates) que corrompen el flujo PostScript de jsPDF
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    // Normalizar comillas y guiones tipográficos
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-');
}

/**
 * Dibuja un chulo (check / marca de verificación) vectorial nítido en el PDF.
 * Evita cualquier corrupción de fuentes o caracteres no legibles.
 */
export function dibujarChuloVector(
  doc: jsPDF,
  x: number,
  y: number,
  tamano: number = 3.5,
  color: [number, number, number] = [26, 107, 94],
  grosor: number = 0.8
) {
  doc.setDrawColor(...color);
  doc.setLineWidth(grosor);
  const esc = tamano / 4;
  doc.line(x - 2 * esc, y, x - 0.6 * esc, y + 1.8 * esc);
  doc.line(x - 0.6 * esc, y + 1.8 * esc, x + 2.4 * esc, y - 2 * esc);
}

/**
 * Dibuja un distintivo circular con chulo blanco en su interior (Checkmark Badge)
 */
export function dibujarInsigniaChulo(
  doc: jsPDF,
  cx: number,
  cy: number,
  radio: number = 4.5,
  colorFondo: [number, number, number] = [26, 107, 94]
) {
  doc.setFillColor(...colorFondo);
  doc.circle(cx, cy, radio, 'F');
  dibujarChuloVector(doc, cx, cy, radio * 0.9, [255, 255, 255], radio * 0.22);
}

const firmaImageCache = new Map<string, HTMLImageElement>();

export function predescargarFirma(url?: string | null) {
  if (!url || typeof url !== 'string' || url.startsWith('data:image') || firmaImageCache.has(url)) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => firmaImageCache.set(url, img);
  img.src = url;
}

/**
 * Estampa de manera elegante el bloque de firma de la Administración Paraíso Terrenal.
 * Si se ha subido una firma digital (imagen recortada con fondo transparente), se
 * posiciona suavemente sobre la línea de firma manuscrita.
 */
function dibujarBloqueFirmaAdmin(
  doc: jsPDF,
  x: number,
  y: number,
  anchoLinea: number = 75,
  tituloEncabezado: string = 'Por la Administración:',
  pieTexto?: string,
  configParam?: ConfiguracionGeneral
): number {
  const config = configParam || getConfiguracionGlobal();
  const plantillas = config.plantillas_pdf || {};
  const firmaUrl = config.firma_digital_url || plantillas.firma_digital_url;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 27, 19);
  doc.text(sanearTextoParaPdf(tituloEncabezado), x, y);

  const yLinea = y + 16;

  // Si existe firma digital manuscrita, estamparla sobre la línea
  if (firmaUrl && typeof firmaUrl === 'string' && firmaUrl.trim().length > 0) {
    try {
      const anchoFirma = 42;
      const altoFirma = 16;
      // Centrada sobre la línea o con margen izquierdo
      const xFirma = x + Math.max(0, (anchoLinea - anchoFirma) / 2);
      const yFirma = yLinea - altoFirma + 1.2; // se apoya directamente sobre la línea

      if (firmaUrl.startsWith('data:image')) {
        const formato = firmaUrl.includes('image/jpeg') || firmaUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
        doc.addImage(firmaUrl, formato, xFirma, yFirma, anchoFirma, altoFirma);
      } else {
        const cached = firmaImageCache.get(firmaUrl);
        if (cached && cached.complete && cached.naturalWidth > 0) {
          doc.addImage(cached, 'PNG', xFirma, yFirma, anchoFirma, altoFirma);
        } else {
          predescargarFirma(firmaUrl);
        }
      }
    } catch (err) {
      console.warn('[documentos] Aviso al incrustar firma digital en PDF:', err);
    }
  }

  // Línea de firma
  doc.setDrawColor(30, 27, 19);
  doc.setLineWidth(0.5);
  doc.line(x, yLinea, x + anchoLinea, yLinea);

  // Leyenda o cargo de la firma
  const textoFirma = pieTexto || plantillas.pie_firma_admin || (config.nombre_empresa ? `Administración • ${config.nombre_empresa}` : 'Administración Paraíso Terrenal');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 27, 19);
  doc.text(sanearTextoParaPdf(textoFirma), x, yLinea + 4.5);

  return yLinea + 8;
}

// ---------------------------------------------------------------
// Encabezado corporativo adaptable (Fase 4 - Logo Paraíso Terrenal)
// ---------------------------------------------------------------
function encabezado(doc: jsPDF, titulo: string, numero?: string, configParam?: ConfiguracionGeneral) {
  const config = configParam || getConfiguracionGlobal();
  const ancho = doc.internal.pageSize.getWidth();

  // Franja verde institucional (esmeralda corporativo)
  doc.setFillColor(26, 107, 94);
  doc.rect(0, 0, ancho, 42, 'F');

  // Filete dorado inferior para acabado de papelería de lujo
  doc.setDrawColor(212, 172, 63);
  doc.setLineWidth(0.8);
  doc.line(0, 42, ancho, 42);

  // Tarjeta / Emblema contenedor del Logo oficial
  // Fondo marfil cálido (#FAF7EE) con borde sutil para destacar el logo sobre el verde
  doc.setFillColor(250, 247, 238);
  doc.setDrawColor(219, 212, 195);
  doc.roundedRect(12, 5.5, 31, 31, 2.5, 2.5, 'FD');

  // Incrustación de la imagen del logo
  try {
    doc.addImage(LOGO_EMPRESA_BASE64, LOGO_FORMAT, 12.5, 6, 30, 30);
  } catch (err) {
    console.warn('[documentos] Aviso al incrustar logo en PDF:', err);
  }

  // Bloque tipográfico corporativo (inicia a la derecha del logo: X = 47 mm)
  const xTexto = 47;

  // Nombre de empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(255, 255, 255);
  doc.text(sanearTextoParaPdf(config.nombre_empresa || 'Paraíso Terrenal'), xTexto, 13);

  // Eslogan o Encabezado institucional
  const esloganTxt = config.eslogan || 'Fincas de Alquiler · Experiencias exclusivas y descanso en la naturaleza';
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(215, 238, 225);
  doc.text(sanearTextoParaPdf(esloganTxt.slice(0, 75)), xTexto, 19);

  // Título del documento
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(sanearTextoParaPdf(titulo), xTexto, 28);

  // Información de contacto rápida (teléfono / NIT / ubicación)
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 240, 235);
  const infoExtra = [
    config.nit ? `NIT: ${config.nit}` : '',
    config.telefono || '+57 317 682 7093',
    config.ciudad || 'Santa Elena, Valle',
  ].filter(Boolean).join(' | ');
  if (infoExtra) {
    doc.text(sanearTextoParaPdf(infoExtra), xTexto, 35);
  }

  // Bloque derecho: Número de documento y fecha de emisión
  if (numero) {
    const numTexto = String(numero);
    const numWidth = Math.max(doc.getTextWidth(numTexto) + 8, 32);
    // Caja destacada tipo píldora para el número
    doc.setFillColor(18, 76, 67);
    doc.roundedRect(ancho - 14 - numWidth, 11, numWidth, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(numTexto, ancho - 14 - (numWidth / 2), 17.2, { align: 'center' });
  }

  // Fecha de emisión
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(215, 238, 225);
  doc.text(`Emitido: ${formatFecha(new Date().toISOString().split('T')[0])}`, ancho - 14, 28, { align: 'right' });
  doc.setFontSize(7);
  doc.setTextColor(190, 225, 215);
  doc.text('Validez Oficial Verificada', ancho - 14, 34, { align: 'right' });

  doc.setTextColor(30, 27, 19);
}

// ---------------------------------------------------------------
// Sección de datos del cliente y finca
// ---------------------------------------------------------------
function datosClienteFinca(doc: jsPDF, reserva: Reserva, y: number): number {
  const ancho = doc.internal.pageSize.getWidth();

  doc.setFillColor(244, 241, 234);
  doc.rect(0, y, ancho, 32, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('DATOS DE LA RESERVA', 14, y + 8);
  doc.setTextColor(30, 27, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const col2 = ancho / 2 + 4;

  doc.text(`Cliente: ${nombreCompleto(reserva)}`, 14, y + 17);
  doc.text(`Finca: ${reserva.fincas?.nombre || '—'}`, col2, y + 17);

  const wa = reserva.clientes?.whatsapp || reserva.clientes?.telefono || '—';
  doc.text(`WhatsApp / Tel: ${wa}`, 14, y + 26);
  doc.text(`Personas: ${reserva.personas}`, col2, y + 26);

  return y + 32;
}

// ---------------------------------------------------------------
// Línea separadora
// ---------------------------------------------------------------
function linea(doc: jsPDF, y: number): number {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setDrawColor(219, 212, 195);
  doc.line(14, y, ancho - 14, y);
  return y + 4;
}

// ---------------------------------------------------------------
// Fila de tabla simple
// ---------------------------------------------------------------
function fila(doc: jsPDF, y: number, izq: string, der: string, negrita = false): number {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', negrita ? 'bold' : 'normal');
  doc.setFontSize(9);
  doc.text(izq, 14, y);
  doc.text(der, ancho - 14, y, { align: 'right' });
  return y + 7;
}

// ---------------------------------------------------------------
// PIE DE PÁGINA (Fase 4: parametrizable)
// ---------------------------------------------------------------
function pie(doc: jsPDF, configParam?: ConfiguracionGeneral) {
  const config = configParam || getConfiguracionGlobal();
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();

  doc.setFillColor(26, 107, 94);
  doc.rect(0, alto - 15, ancho, 15, 'F');

  // Filete dorado superior en pie de página
  doc.setDrawColor(212, 172, 63);
  doc.setLineWidth(0.5);
  doc.line(0, alto - 15, ancho, alto - 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(255, 255, 255);

  const textoPie = config.doc_pie_pagina || 'Paraíso Terrenal | Fincas de Alquiler | Documento oficial generado automáticamente';
  doc.text(sanearTextoParaPdf(textoPie), ancho / 2, alto - 8.5, { align: 'center' });

  const textoContacto = config.doc_contacto_info || `${config.whatsapp ? `WhatsApp: +${config.whatsapp}` : ''} | ${config.correo || ''}`;
  if (textoContacto.trim()) {
    doc.setFontSize(6.5);
    doc.setTextColor(209, 234, 217);
    doc.text(sanearTextoParaPdf(textoContacto.trim()), ancho / 2, alto - 4, { align: 'center' });
  }

  doc.setTextColor(30, 27, 19);
}

// ================================================================
// ================================================================
// 1. DOCUMENTO DE SEPARACIÓN
// ================================================================
export function generarDocSeparacion(
  reserva: Reserva,
  configParam?: ConfiguracionGeneral,
  fincaParam?: Finca | Pick<Finca, 'id' | 'nombre'> | any | null
): ResultadoDocumentoPdf {
  const config = configParam || getConfiguracionGlobal();
  const plantillasPdf = config.plantillas_pdf || {};
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const num = formatearConsecutivoConPrefijo(
    reserva.consecutivo,
    'separacion',
    undefined,
    { separacion: config.prefijo_separacion }
  );

  const tituloDoc = plantillasPdf.titulo_separacion || 'DOCUMENTO DE SEPARACIÓN';
  encabezado(doc, tituloDoc, num, config);

  let y = 48;
  y = datosClienteFinca(doc, reserva, y);
  y += 8;
  y = linea(doc, y);

  // Fechas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('DETALLE DE LA RESERVA', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  y = fila(doc, y, 'Fecha de llegada:', formatFecha(reserva.fecha_inicio));
  y = fila(doc, y, 'Fecha de salida:', formatFecha(reserva.fecha_fin));
  y = fila(doc, y, 'Personas:', String(reserva.personas));
  if (reserva.alimentacion && reserva.alimentacion !== 'Sin alimentación') {
    y = fila(doc, y, 'Servicio gastronómico:', reserva.alimentacion);
  }
  y += 4;
  y = linea(doc, y);

  // Valores y Desglose Financiero
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('DESGLOSE ECONÓMICO Y ESTADO DE PAGOS', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  const finanzas = desglosarFinanzasReserva(reserva);
  const tieneAlimentacion = (reserva.costo_alimentacion || 0) > 0;

  if (tieneAlimentacion) {
    // 1. Alojamiento
    y = fila(doc, y, 'Alojamiento en Finca (Valor Total):', formatCOP(finanzas.subtotalAlojamiento));
    y = fila(doc, y, 'Abono de Separación de Finca Pagado:', formatCOP(finanzas.pagadoFinca), true);
    y = fila(doc, y, 'Saldo Restante de Alojamiento (al Check-in):', formatCOP(finanzas.saldoFincaCheckIn), true);
    y += 2;

    // 2. Alimentación
    y = fila(doc, y, 'Alimentación · Admón Paraíso Terrenal:', formatCOP(finanzas.costoAlimentacion));
    y = fila(doc, y, 'Abono de Alimentación Pagado:', formatCOP(finanzas.pagadoAlimentacion), true);
    y = fila(doc, y, 'Saldo Restante de Alimentación:', formatCOP(finanzas.saldoAlimentacionAdmin), true);
    y += 3;
    y = linea(doc, y);
    y += 1;

    // Consolidado
    y = fila(doc, y, 'VALOR TOTAL CONSOLIDADO:', formatCOP(reserva.valor_total), true);
    y = fila(doc, y, 'SALDO TOTAL PENDIENTE:', formatCOP(finanzas.saldoConsolidado), true);
  } else {
    y = fila(doc, y, 'Valor total de la reserva:', formatCOP(reserva.valor_total));
    y = fila(doc, y, 'Valor de separación pagado:', formatCOP(reserva.separacion), true);
    const saldo = calcularSaldo(reserva);
    y = fila(doc, y, 'Saldo pendiente:', formatCOP(saldo), true);
  }

  y += 5;
  y = linea(doc, y);

  // CUENTAS BANCARIAS SEPARADAS
  const fInfo = fincaParam || (reserva.fincas as any);
  const saldoAlojamiento = tieneAlimentacion ? finanzas.saldoFincaCheckIn : calcularSaldo(reserva);

  // 1. Cuenta del Propietario para saldo de Alojamiento
  if (saldoAlojamiento > 0 && fInfo?.banco_cuenta) {
    doc.setFillColor(248, 249, 248);
    doc.setDrawColor(219, 212, 195);
    doc.roundedRect(14, y, 182, 13, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(26, 107, 94);
    doc.text('1. CUENTA DEL PROPIETARIO PARA LIQUIDACIÓN DE ALOJAMIENTO EN CHECK-IN:', 18, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 27, 19);
    let datosOwner = `Banco: ${fInfo.banco_nombre || 'Bancolombia'}  •  ${fInfo.banco_tipo_cuenta || 'Ahorros'} N°: ${fInfo.banco_cuenta}  •  Titular: ${fInfo.banco_titular || 'Propietario de la Finca'}`;
    if (fInfo.banco_identificacion?.trim()) {
      datosOwner += `  •  Identificación: ${fInfo.banco_identificacion.trim()}`;
    }
    doc.text(datosOwner, 18, y + 9);
    y += 15;
  }

  // 2. Cuenta de la Administración Paraíso Terrenal para Alimentación
  if (tieneAlimentacion && finanzas.saldoAlimentacionAdmin > 0 && config.banco_cuenta) {
    doc.setFillColor(244, 248, 246);
    doc.setDrawColor(26, 107, 94);
    doc.roundedRect(14, y, 182, 13, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(26, 107, 94);
    doc.text('2. CUENTA DE LA ADMINISTRACIÓN PARA PAGO DE ALIMENTACIÓN (PARAÍSO TERRENAL):', 18, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 27, 19);
    let datosAdmin = `Banco: ${config.banco_nombre || 'Bancolombia'}  •  ${config.banco_tipo_cuenta || 'Ahorros'} N°: ${config.banco_cuenta}  •  Titular: ${config.banco_titular || 'Administración Paraíso Terrenal'}`;
    if (config.banco_identificacion?.trim()) {
      datosAdmin += `  •  NIT / Cédula: ${config.banco_identificacion.trim()}`;
    }
    doc.text(datosAdmin, 18, y + 9);
    y += 15;
  }

  // Condiciones (Fase 4: extraídas de configuración)
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('TÉRMINOS Y CONDICIONES DE RESERVA', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);

  const terminosTexto = sanearTextoParaPdf(plantillasPdf.clausulas_separacion || config.terminos_condiciones || `• La separación garantiza la disponibilidad de la finca para las fechas indicadas.\n• El saldo restante de alojamiento debe cancelarse al momento del check-in directamente al propietario.\n• En caso de cancelación, la separación no es reembolsable salvo acuerdo previo.\n• Este documento no es una factura comercial.`);
  const lineasCondiciones = terminosTexto.split('\n');

  for (const c of lineasCondiciones) {
    if (c.trim()) {
      const split = doc.splitTextToSize(c.trim(), 182);
      doc.text(split, 14, y);
      y += split.length * 4.2;
    }
  }

  // Firma Oficial de Administración (Firma del cliente eliminada por directriz)
  y += 6;
  y = dibujarBloqueFirmaAdmin(doc, 14, y, 75, 'Por la Administración:', plantillasPdf.pie_firma_admin, config);

  pie(doc, config);
  const nombreArchivo = `Separacion_${num}.pdf`;
  doc.save(nombreArchivo);
  const blob = doc.output('blob');
  return { doc, num, blob, nombreArchivo };
}

// ================================================================
// 2. COMPROBANTE DE ABONO
// ================================================================
export function generarComprobantePago(reserva: Reserva, pago: Pago, configParam?: ConfiguracionGeneral): ResultadoDocumentoPdf {
  const config = configParam || getConfiguracionGlobal();
  const plantillasPdf = config.plantillas_pdf || {};
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const indexPago = (reserva.pagos || []).findIndex(p => p.id === pago.id);
  const sub = indexPago > 0 ? indexPago + 1 : undefined;
  const num = formatearConsecutivoConPrefijo(
    reserva.consecutivo,
    'abono',
    sub,
    { abono: config.prefijo_abono }
  );

  const tituloDoc = plantillasPdf.titulo_abono || 'COMPROBANTE DE ABONO / PAGO';
  encabezado(doc, tituloDoc, num, config);

  let y = 48;
  y = datosClienteFinca(doc, reserva, y);
  y += 8;
  y = linea(doc, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('DETALLE DEL PAGO', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  y = fila(doc, y, 'Tipo de pago:', pago.tipo.replace('_', ' ').toUpperCase());
  y = fila(doc, y, 'Fecha del pago:', formatFecha(pago.fecha));
  y = fila(doc, y, 'Valor pagado:', formatCOP(pago.valor), true);
  if (pago.observacion) {
    y = fila(doc, y, 'Referencia / Observación:', pago.observacion);
  }
  y += 4;
  y = linea(doc, y);

  // Resumen de la reserva
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('RESUMEN DE LA RESERVA', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  y = fila(doc, y, 'Valor total:', formatCOP(reserva.valor_total));
  const pagado = (reserva.pagos || []).reduce((acc, p) =>
    acc + (p.tipo === 'devolucion' ? -p.valor : p.valor), 0);
  y = fila(doc, y, 'Total pagado hasta la fecha:', formatCOP(pagado), true);
  const saldo = calcularSaldo(reserva);
  y = fila(doc, y, 'Saldo pendiente:', formatCOP(saldo), true);
  y += 4;
  y = linea(doc, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 100, 87);
  const textoLegal = config.textos_legales || 'Este comprobante es válido como recibo de pago parcial o total de la reserva indicada.';
  doc.text(sanearTextoParaPdf(textoLegal), 14, y, { maxWidth: 182 });

  // Firma y sello oficial de recaudos
  y += 8;
  y = dibujarBloqueFirmaAdmin(doc, 14, y, 75, 'Firma y Sello de Recibido:', plantillasPdf.pie_firma_admin || `Tesorería • ${config.nombre_empresa || 'Paraíso Terrenal'}`, config);

  pie(doc, config);
  const nombreArchivo = `Abono_${num}.pdf`;
  doc.save(nombreArchivo);
  const blob = doc.output('blob');
  return { doc, num, blob, nombreArchivo };
}

// ================================================================
// 3. ESTADO DE CUENTA
// ================================================================
export function generarEstadoCuenta(reserva: Reserva, configParam?: ConfiguracionGeneral): ResultadoDocumentoPdf {
  const config = configParam || getConfiguracionGlobal();
  const plantillasPdf = config.plantillas_pdf || {};
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const num = formatearConsecutivoConPrefijo(
    reserva.consecutivo,
    'estado_cuenta',
    undefined,
    { estado_cuenta: config.prefijo_estado_cuenta }
  );

  const tituloDoc = plantillasPdf.titulo_estado_cuenta || 'ESTADO DE CUENTA CONSOLIDADO';
  encabezado(doc, tituloDoc, num, config);

  let y = 48;
  y = datosClienteFinca(doc, reserva, y);
  y += 8;
  y = linea(doc, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('HISTORIAL DE PAGOS', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  const pagos = reserva.pagos || [];
  if (pagos.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('No se han registrado pagos para esta reserva.', 14, y);
    y += 8;
  } else {
    // Cabecera de tabla
    doc.setFillColor(244, 241, 234);
    doc.rect(14, y - 4, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Fecha', 16, y);
    doc.text('Tipo', 50, y);
    doc.text('Observación', 90, y);
    doc.text('Valor', 182, y, { align: 'right' });
    y += 6;
    linea(doc, y);
    y += 3;

    for (const p of pagos) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(formatFecha(p.fecha), 16, y);
      doc.text(p.tipo.replace('_', ' '), 50, y);
      if (p.observacion) doc.text(p.observacion.slice(0, 35), 90, y);
      doc.text(formatCOP(Math.abs(p.valor)), 182, y, { align: 'right' });
      y += 6;
    }
    y += 2;
  }

  y = linea(doc, y);

  // Totales finales con doble balance si incluye alimentación
  const finanzas = desglosarFinanzasReserva(reserva);
  if (finanzas.costoAlimentacion > 0) {
    // 1. Bloque Alojamiento / Propietario
    doc.setFillColor(248, 249, 248);
    doc.setDrawColor(219, 212, 195);
    doc.roundedRect(14, y + 2, 182, 15, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(26, 107, 94);
    doc.text('1. ALOJAMIENTO · PROPIETARIO DE LA FINCA', 18, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 27, 19);
    doc.text(`Valor Finca: ${formatCOP(finanzas.subtotalAlojamiento)}   •   Abonado al Propietario: ${formatCOP(finanzas.pagadoFinca)}`, 18, y + 12.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`SALDO CHECK-IN: ${formatCOP(finanzas.saldoFincaCheckIn)}`, 182, y + 12.5, { align: 'right' });
    y += 20;

    // 2. Bloque Alimentación / Administración
    doc.setFillColor(244, 248, 246);
    doc.setDrawColor(26, 107, 94);
    doc.roundedRect(14, y, 182, 15, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(26, 107, 94);
    doc.text('2. ALIMENTACIÓN · ADMINISTRACIÓN PARAÍSO TERRENAL', 18, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 27, 19);
    doc.text(`Servicio Menú: ${formatCOP(finanzas.costoAlimentacion)}   •   Abonado Administración: ${formatCOP(finanzas.pagadoAlimentacion)}`, 18, y + 10.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`SALDO ALIMENTACIÓN: ${formatCOP(finanzas.saldoAlimentacionAdmin)}`, 182, y + 10.5, { align: 'right' });
    y += 18;

    // Resumen consolidado total
    doc.setFillColor(finanzas.saldoConsolidado === 0 ? 209 : 244, finanzas.saldoConsolidado === 0 ? 234 : 212, finanzas.saldoConsolidado === 0 ? 217 : 216);
    doc.rect(14, y - 2, 182, 9, 'F');
    y = fila(doc, y + 3, 'SALDO TOTAL RESTANTE:', formatCOP(finanzas.saldoConsolidado), true);
  } else {
    y += 4;
    y = fila(doc, y, 'Valor total de la reserva:', formatCOP(reserva.valor_total));
    const pagado = pagos.reduce((acc, p) => acc + (p.tipo === 'devolucion' ? -p.valor : p.valor), 0);
    y = fila(doc, y, 'Total pagado:', formatCOP(pagado), true);
    const saldo = calcularSaldo(reserva);

    doc.setFillColor(saldo === 0 ? 209 : 244, saldo === 0 ? 234 : 212, saldo === 0 ? 217 : 216);
    doc.rect(14, y - 4, 182, 9, 'F');
    y = fila(doc, y, 'SALDO PENDIENTE:', formatCOP(saldo), true);
  }

  const textoLegal = config.textos_legales || 'Documento expedido de conformidad con las disposiciones turísticas y comerciales colombianas vigentes.';
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 105, 95);
  doc.text(sanearTextoParaPdf(textoLegal), 14, y, { maxWidth: 182 });

  // Firma y certificación administrativa
  y += 8;
  y = dibujarBloqueFirmaAdmin(doc, 14, y, 75, 'Auditoría y Aprobación:', plantillasPdf.pie_firma_admin || `Auditoría • ${config.nombre_empresa || 'Paraíso Terrenal'}`, config);

  pie(doc, config);
  const nombreArchivo = `EstadoCuenta_${num}.pdf`;
  doc.save(nombreArchivo);
  const blob = doc.output('blob');
  return { doc, num, blob, nombreArchivo };
}

// ================================================================
// 4. PAZ Y SALVO
// ================================================================
export function generarPazYSalvo(reserva: Reserva, configParam?: ConfiguracionGeneral): ResultadoDocumentoPdf | null {
  const config = configParam || getConfiguracionGlobal();
  const plantillasPdf = config.plantillas_pdf || {};
  const saldo = calcularSaldo(reserva);
  if (saldo > 0) {
    alert('No es posible generar el Paz y Salvo: la reserva tiene saldo pendiente.');
    return null;
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const num = formatearConsecutivoConPrefijo(
    reserva.consecutivo,
    'paz_salvo',
    undefined,
    { paz_salvo: config.prefijo_paz_salvo }
  );
  const ancho = doc.internal.pageSize.getWidth();

  const tituloDoc = plantillasPdf.titulo_paz_salvo || 'CERTIFICADO DE PAZ Y SALVO';
  encabezado(doc, tituloDoc, num, config);

  let y = 56;

  // Sello visual con insignia de chulo vectorial (sin caracteres unicode no soportados)
  doc.setFillColor(209, 234, 217);
  doc.roundedRect(ancho / 2 - 52, y, 104, 22, 4, 4, 'F');
  dibujarInsigniaChulo(doc, ancho / 2 - 36, y + 11, 4.8, [26, 107, 94]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(26, 107, 94);
  doc.text('PAGADO EN SU TOTALIDAD', ancho / 2 + 6, y + 12.8, { align: 'center' });
  doc.setTextColor(30, 27, 19);

  y += 32;
  y = datosClienteFinca(doc, reserva, y);
  y += 8;
  y = linea(doc, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('CERTIFICACIÓN OFICIAL', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const texto = [
    `Por medio del presente documento, ${config.nombre_empresa || 'la administración'} certifica que el/la señor(a)`,
    `${nombreCompleto(reserva)} ha cancelado en su TOTALIDAD el valor correspondiente a la reserva`,
    `de la finca "${reserva.fincas?.nombre || '—'}", para el período comprendido entre el`,
    `${formatFecha(reserva.fecha_inicio)} y el ${formatFecha(reserva.fecha_fin)}.`,
    '',
    `Valor total cancelado: ${formatCOP(reserva.valor_total)}`,
    `Saldo pendiente: ${formatCOP(0)}`,
    '',
    sanearTextoParaPdf(plantillasPdf.texto_paz_salvo || config.textos_legales || 'En consecuencia, se expide el presente paz y salvo a plena conformidad de las partes.'),
  ];
  for (const lineaTexto of texto) {
    doc.text(lineaTexto, 14, y, { maxWidth: 182 });
    y += lineaTexto === '' ? 4 : 6.5;
  }

  y += 12;
  y = dibujarBloqueFirmaAdmin(doc, 14, y, 80, 'Firma y autorización administrativa:', plantillasPdf.pie_firma_admin, config);

  pie(doc, config);
  const nombreArchivo = `PazYSalvo_${num}.pdf`;
  doc.save(nombreArchivo);
  const blob = doc.output('blob');
  return { doc, num, blob, nombreArchivo };
}

// ================================================================
// 5. PROPUESTA DE ALIMENTACIÓN (FASE 2 & 4)
// ================================================================
export async function generarPropuestaAlimentacion(datos: PropuestaAlimentacionDatos): Promise<ResultadoDocumentoPdf> {
  const {
    menu,
    cliente,
    finca,
    personas = 10,
    cantidadServicios = 1,
    notasEspeciales,
    config: configParam,
  } = datos;

  const config = configParam || getConfiguracionGlobal();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();

  // Centralización del consecutivo:
  // 1. Si viene asociado a una cotización o reserva, usa su consecutivo numérico (ej: 1001)
  // 2. Si es independiente generado desde Menús, usa config.siguiente_propuesta_menu || 1001
  const numRaw = datos.consecutivo !== undefined && datos.consecutivo !== null && String(datos.consecutivo).trim() !== ''
    ? String(datos.consecutivo)
    : String(config.siguiente_propuesta_menu || 1001);

  const numBase = formatearConsecutivoSimple(numRaw);
  const prefijoMenu = (config.prefijo_propuesta_menu !== undefined && config.prefijo_propuesta_menu !== null && config.prefijo_propuesta_menu.trim() !== '')
    ? config.prefijo_propuesta_menu.trim()
    : 'PROP-';

  const num = formatearConsecutivoConPrefijo(
    numBase,
    'menu',
    undefined,
    { menu: prefijoMenu }
  );

  const plantillasPdf = config.plantillas_pdf || {};
  const tituloDoc = datos.tituloDocumento || plantillasPdf.titulo_propuesta_menu || 'PROPUESTA DE SERVICIO GASTRONÓMICO';
  encabezado(doc, tituloDoc, num, config);

  let y = 48;

  // Franja datos cliente y finca
  doc.setFillColor(244, 241, 234);
  doc.rect(0, y, ancho, 32, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('DATOS DE LA SOLICITUD', 14, y + 8);
  doc.setTextColor(30, 27, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const col2 = ancho / 2 + 4;

  const nombreCli = cliente ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : 'Cliente particular';
  doc.text(`Cliente: ${nombreCli}`, 14, y + 17);
  doc.text(`Finca / Lugar: ${finca?.nombre || 'Finca Campestre'}`, col2, y + 17);

  const contactoCli = cliente?.whatsapp || cliente?.correo || 'Coordinación directa';
  doc.text(`Contacto: ${contactoCli}`, 14, y + 26);
  doc.text(`Comensales: ${personas} personas • ${cantidadServicios} servicio(s)`, col2, y + 26);

  y += 38;

  // DETALLE DEL MENÚ
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 107, 94);
  doc.text('MENÚ SELECCIONADO', 14, y);
  doc.setTextColor(30, 27, 19);

  // Badge categoría
  doc.setFillColor(230, 243, 240);
  doc.roundedRect(ancho - 55, y - 4.5, 41, 6, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 107, 94);
  doc.text(menu.categoria.toUpperCase(), ancho - 34.5, y - 0.5, { align: 'center' });
  doc.setTextColor(30, 27, 19);

  y += 7;

  // Título del Menú
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(menu.nombre, 14, y);
  y += 6;

  // Descripción del menú
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 70, 60);
  const descLineas = doc.splitTextToSize(
    menu.descripcion || 'Servicio gastronómico completo elaborado con ingredientes frescos y preparación artesanal campesina.',
    182
  );
  doc.text(descLineas, 14, y);
  y += descLineas.length * 4.5 + 4;
  doc.setTextColor(30, 27, 19);

  // Intentar cargar e incrustar imagen si está disponible
  const imagenUrl = menu.imagen_url || (menu.menu_imagenes && menu.menu_imagenes[0]?.url);
  if (imagenUrl) {
    try {
      const b64 = await urlABase64(imagenUrl);
      if (b64) {
        doc.setDrawColor(219, 212, 195);
        doc.setFillColor(248, 247, 244);
        doc.roundedRect(14, y, 75, 45, 2, 2, 'FD');
        doc.addImage(b64, 'JPEG', 15, y + 1, 73, 43);

        doc.setFillColor(244, 241, 234);
        doc.roundedRect(95, y, ancho - 109, 45, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(26, 107, 94);
        doc.text('ASPECTOS DESTACADOS', 100, y + 8);
        doc.setTextColor(30, 27, 19);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`• Categoría: ${menu.categoria}`, 100, y + 16);
        doc.text(`• Valor individual: ${formatCOP(menu.precio_pp)} /pp`, 100, y + 23);
        doc.text(`• Servicio para: ${personas} personas`, 100, y + 30);
        doc.text(`• Total servicios: ${cantidadServicios}`, 100, y + 37);

        y += 50;
      }
    } catch {
      // Continuar limpiamente si la imagen no responde CORS
    }
  }

  y = linea(doc, y);
  y += 2;

  // TABLA DE LIQUIDACIÓN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(26, 107, 94);
  doc.text('COTIZACIÓN Y VALOR DEL SERVICIO', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 7;

  // Cabecera de tabla
  doc.setFillColor(244, 241, 234);
  doc.rect(14, y - 4, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Concepto / Menú', 16, y);
  doc.text('Precio / Persona', 90, y);
  doc.text('Comensales', 130, y);
  doc.text('Subtotal', 182, y, { align: 'right' });
  y += 6;
  y = linea(doc, y);
  y += 3;

  const totalServicio = (menu.precio_pp || 0) * personas * cantidadServicios;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(menu.nombre.slice(0, 38), 16, y);
  doc.text(formatCOP(menu.precio_pp), 90, y);
  doc.text(`${personas} pers. × ${cantidadServicios} serv.`, 130, y);
  doc.text(formatCOP(totalServicio), 182, y, { align: 'right' });
  y += 8;

  y = linea(doc, y);
  y += 3;

  // Total destacado
  doc.setFillColor(230, 243, 240);
  doc.rect(14, y - 4, 182, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 107, 94);
  doc.text('VALOR TOTAL PROPUESTA:', 18, y + 2.5);
  doc.text(formatCOP(totalServicio), 182, y + 2.5, { align: 'right' });
  doc.setTextColor(30, 27, 19);
  y += 14;

  // CONDICIONES (Fase 4: desde plantillas_pdf)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('CONDICIONES Y POLÍTICAS DEL SERVICIO', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  const textoCondicionesGastronomicas = plantillasPdf.condiciones_gastronomicas || `• Preparación con ingredientes seleccionados y frescos de la región.
• Para confirmar el servicio de alimentación se requiere el 50% de anticipo junto con la reserva.
• Toda modificación en el número de comensales debe notificarse con al menos 48 horas de anticipación.
• Incluye menaje estándar, vajilla campestre y atención durante el horario pactado del servicio.`;

  const condicionesLista = menu.condiciones
    ? [`• ${menu.condiciones}`, ...textoCondicionesGastronomicas.split('\n')]
    : textoCondicionesGastronomicas.split('\n');

  if (notasEspeciales) {
    condicionesLista.push(`• Observaciones particulares: ${notasEspeciales}`);
  }

  for (const cond of condicionesLista) {
    if (cond.trim()) {
      const lines = doc.splitTextToSize(cond.trim(), 182);
      doc.text(lines, 14, y);
      y += lines.length * 4.2;
    }
  }

  // Forma de Pago / Cuenta Bancaria de la Administración (Paraíso Terrenal)
  if (config.banco_cuenta) {
    y += 2;
    doc.setFillColor(244, 248, 246);
    doc.setDrawColor(26, 107, 94);
    doc.roundedRect(14, y, 182, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(26, 107, 94);
    doc.text('DATOS BANCARIOS DE ADMINISTRACIÓN PARA TRANSFERENCIA (ALIMENTACIÓN):', 18, y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 27, 19);

    const bancoNombre = config.banco_nombre || 'Bancolombia';
    const tipoCta = config.banco_tipo_cuenta || 'Ahorros';
    const numCta = config.banco_cuenta;
    const titular = config.banco_titular || 'Administración Paraíso Terrenal';
    const iden = (config as any)?.banco_identificacion?.trim();

    let lineaBanco = `Banco: ${bancoNombre} | ${tipoCta} N°: ${numCta} | Titular: ${titular}`;
    if (iden) {
      lineaBanco += ` | Identificación / NIT: ${iden}`;
    }
    doc.text(lineaBanco, 18, y + 9.5);
    y += 18;
  } else {
    y += 4;
  }

  // Firma Oficial de Coordinación Gastronómica (Firma del cliente removida según requerimiento)
  y += 6;
  y = dibujarBloqueFirmaAdmin(doc, 14, y, 75, 'Atentamente / Coordinación Gastronómica:', plantillasPdf.pie_firma_admin || `Coordinación • ${config.nombre_empresa || 'Paraíso Terrenal'}`, config);

  pie(doc, config);

  const nombreArchivo = `Propuesta_Menu_${num}.pdf`;
  doc.save(nombreArchivo);
  const blob = doc.output('blob');
  return { doc, num, blob, nombreArchivo };
}

// ================================================================
// 6. PROPUESTA FORMAL DE COTIZACIÓN (FASE 4)
// ================================================================
export function generarDocCotizacion(
  cotizacion: CotizacionDB,
  configParam?: ConfiguracionGeneral,
  fincaParam?: Finca | Pick<Finca, 'id' | 'nombre'> | any | null
): ResultadoDocumentoPdf {
  const config = configParam || getConfiguracionGlobal();
  const plantillasPdf = config.plantillas_pdf || {};
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const num = formatearConsecutivoConPrefijo(
    cotizacion.consecutivo,
    'cotizacion',
    undefined,
    { cotizacion: config.prefijo_cotizacion }
  );
  const ancho = doc.internal.pageSize.getWidth();

  const tituloDoc = plantillasPdf.titulo_cotizacion || 'COTIZACIÓN FORMAL DE SERVICIOS';
  encabezado(doc, tituloDoc, num, config);

  let y = 48;

  // Datos cliente y finca
  doc.setFillColor(244, 241, 234);
  doc.rect(0, y, ancho, 32, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('DATOS DE LA COTIZACIÓN', 14, y + 8);
  doc.setTextColor(30, 27, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const col2 = ancho / 2 + 4;

  const cliNombre = cotizacion.clientes
    ? `${cotizacion.clientes.nombre} ${cotizacion.clientes.apellido || ''}`.trim()
    : 'Cliente Particular';
  doc.text(`Cliente: ${cliNombre}`, 14, y + 17);
  doc.text(`Finca: ${fincaParam?.nombre || cotizacion.fincas?.nombre || 'Finca Campestre'}`, col2, y + 17);

  const waCli = cotizacion.clientes?.whatsapp || 'Coordinación directa';
  doc.text(`WhatsApp: ${waCli}`, 14, y + 26);
  doc.text(`Grupo: ${cotizacion.personas} personas`, col2, y + 26);

  y += 38;

  // Detalle de la estadía
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('DETALLE DE FECHAS Y ALOJAMIENTO', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  y = fila(doc, y, 'Fecha de ingreso:', formatFecha(cotizacion.fecha_inicio));
  y = fila(doc, y, 'Fecha de salida:', formatFecha(cotizacion.fecha_fin));
  y = fila(doc, y, 'Total de personas:', `${cotizacion.personas} huéspedes`);
  if (cotizacion.alimentacion && cotizacion.alimentacion !== 'Sin alimentación') {
    y = fila(doc, y, 'Servicio gastronómico:', cotizacion.alimentacion);
  }
  y += 4;
  y = linea(doc, y);

  // Liquidación de valores
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('DESGLOSE ECONÓMICO', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  y = fila(doc, y, 'Subtotal alojamiento:', formatCOP(cotizacion.subtotal_alojamiento));
  if (cotizacion.costo_alimentacion > 0) {
    y = fila(doc, y, 'Alimentación seleccionada:', formatCOP(cotizacion.costo_alimentacion));
  }
  if (cotizacion.descuento > 0) {
    y = fila(doc, y, 'Descuento aplicado:', `-${formatCOP(cotizacion.descuento)}`);
  }
  if (cotizacion.recargo > 0) {
    y = fila(doc, y, 'Recargos adicionales:', `+${formatCOP(cotizacion.recargo)}`);
  }

  y += 2;
  // Total destacado
  doc.setFillColor(230, 243, 240);
  doc.rect(14, y - 4, 182, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 107, 94);
  doc.text('VALOR TOTAL COTIZADO:', 18, y + 2.5);
  doc.text(formatCOP(cotizacion.total), 182, y + 2.5, { align: 'right' });
  doc.setTextColor(30, 27, 19);
  y += 10;

  // Abono requerido (50% de alojamiento de la finca) para formalizar y bloquear disponibilidad
  const valorAlojamiento = (cotizacion.subtotal_alojamiento && cotizacion.subtotal_alojamiento > 0)
    ? cotizacion.subtotal_alojamiento
    : Math.max(0, (cotizacion.total || 0) - (cotizacion.costo_alimentacion || 0));
  const abono50 = Math.round(valorAlojamiento * 0.5);
  doc.setFillColor(254, 249, 195);
  doc.setDrawColor(202, 138, 4);
  doc.roundedRect(14, y, 182, 8.5, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(161, 98, 7);
  const textoInstruccionAbono = plantillasPdf.instruccion_abono_cotizacion || 'ABONO REQUERIDO (50% ALOJAMIENTO PARA BLOQUEAR):';
  doc.text(textoInstruccionAbono, 18, y + 5.5);
  doc.text(formatCOP(abono50), 182, y + 5.5, { align: 'right' });
  doc.setTextColor(30, 27, 19);
  y += 12;

  // CUENTAS BANCARIAS SEPARADAS
  // 1. Cuenta del Propietario de la Finca para transferencia del anticipo de alojamiento
  const fInfo = fincaParam || (cotizacion.fincas as any);
  if (fInfo?.banco_cuenta) {
    doc.setFillColor(248, 249, 248);
    doc.setDrawColor(219, 212, 195);
    doc.roundedRect(14, y, 182, 13, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(26, 107, 94);
    doc.text('1. CUENTA DEL PROPIETARIO PARA TRANSFERENCIA DEL ABONO (50% ALOJAMIENTO):', 18, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 27, 19);
    let datosOwner = `Banco: ${fInfo.banco_nombre || 'Bancolombia'}  •  ${fInfo.banco_tipo_cuenta || 'Ahorros'} N°: ${fInfo.banco_cuenta}  •  Titular: ${fInfo.banco_titular || 'Propietario de la Finca'}`;
    if (fInfo.banco_identificacion?.trim()) {
      datosOwner += `  •  Identificación: ${fInfo.banco_identificacion.trim()}`;
    }
    doc.text(datosOwner, 18, y + 9);
    y += 15;
  }

  // 2. Cuenta de la Administración Paraíso Terrenal si incluye servicio gastronómico
  if (cotizacion.costo_alimentacion > 0 && config.banco_cuenta) {
    doc.setFillColor(244, 248, 246);
    doc.setDrawColor(26, 107, 94);
    doc.roundedRect(14, y, 182, 13, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(26, 107, 94);
    doc.text('2. CUENTA DE LA ADMINISTRACIÓN PARA TRANSFERENCIA DE ALIMENTACIÓN (PARAÍSO TERRENAL):', 18, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 27, 19);
    let datosAdmin = `Banco: ${config.banco_nombre || 'Bancolombia'}  •  ${config.banco_tipo_cuenta || 'Ahorros'} N°: ${config.banco_cuenta}  •  Titular: ${config.banco_titular || 'Administración Paraíso Terrenal'}`;
    if (config.banco_identificacion?.trim()) {
      datosAdmin += `  •  NIT / Cédula: ${config.banco_identificacion.trim()}`;
    }
    doc.text(datosAdmin, 18, y + 9);
    y += 15;
  } else if (!fInfo?.banco_cuenta) {
    y += 2;
  }

  // Condiciones y Políticas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('TÉRMINOS Y VALIDEZ DE LA COTIZACIÓN', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const terminos = sanearTextoParaPdf(plantillasPdf.vigencia_cotizacion || config.terminos_condiciones || `• Esta cotización tiene una vigencia de 5 días hábiles a partir de su emisión.\n• Para formalizar y bloquear la disponibilidad de las fechas se requiere un anticipo del 50%.\n• Los precios pactados se respetan únicamente con la confirmación oportuna de la reserva.`);
  const lineas = terminos.split('\n');
  for (const l of lineas) {
    if (l.trim()) {
      const split = doc.splitTextToSize(l.trim(), 182);
      doc.text(split, 14, y);
      y += split.length * 4.2;
    }
  }

  // Firma Oficial de Asesoría Comercial (Firma del cliente removida según requerimiento)
  y += 10;
  y = dibujarBloqueFirmaAdmin(doc, 14, y, 75, 'Elaborado por / Asesor Comercial:', plantillasPdf.pie_firma_admin || `Asesor Comercial • ${config.nombre_empresa || 'Paraíso Terrenal'}`, config);

  pie(doc, config);
  const nombreArchivo = `Cotizacion_${num}.pdf`;
  doc.save(nombreArchivo);
  const blob = doc.output('blob');
  return { doc, num, blob, nombreArchivo };
}

// ---------------------------------------------------------------
// 7. EXPEDIENTE COMPLETO Y ACTA DE CIERRE (Fase 6)
// ---------------------------------------------------------------
export function generarExpedienteCompleto(
  reserva: Reserva,
  cierre?: CierreReserva | null,
  configParam?: ConfiguracionGeneral
) {
  const config = configParam || getConfiguracionGlobal();
  const doc = new jsPDF();
  const ancho = doc.internal.pageSize.getWidth();
  const col2 = 110;

  const cliNombre = obtenerNombreClienteHistorico(reserva);
  const cliContacto = obtenerContactoClienteHistorico(reserva);
  const finNombre = obtenerNombreFincaHistorico(reserva);
  const saldo = calcularSaldo(reserva);
  const totalPagado = reserva.valor_total - saldo;
  const consecBase = reserva.consecutivo ? reserva.consecutivo.replace(/[^a-zA-Z0-9_-]/g, '') : reserva.id.slice(0, 8).toUpperCase();
  const numExpediente = reserva.consecutivo ? `EXP-${consecBase}` : `EXP-${reserva.id.slice(0, 8).toUpperCase()}`;

  encabezado(doc, 'EXPEDIENTE HISTÓRICO Y ACTA DE CIERRE', numExpediente, config);

  let y = 47;

  // Estado general
  doc.setFillColor(245, 247, 246);
  doc.roundedRect(14, y, ancho - 28, 12, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(26, 107, 94);
  doc.text(`EXPEDIENTE DE AUDITORÍA: ${numExpediente}`, 18, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 85, 75);
  const estadoStr = (reserva.estado || 'completada').toUpperCase();
  const fechaCierreStr = reserva.fecha_cierre || cierre?.fecha_cierre
    ? formatFecha((reserva.fecha_cierre || cierre?.fecha_cierre || '').split('T')[0])
    : formatFecha(new Date().toISOString().split('T')[0]);
  doc.text(`Estado: ${estadoStr}  •  Fecha de Cierre: ${fechaCierreStr}  •  Registros Inmutables Protegidos`, 18, y + 9);
  doc.setTextColor(30, 27, 19);
  y += 16;

  // Bloque 1: Datos del Huésped / Cliente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('1. EXPEDIENTE DEL CLIENTE / HUÉSPED TITULAR', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 5;

  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(220, 225, 222);
  doc.rect(14, y, ancho - 28, 22, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre completo: ${cliNombre}`, 18, y + 5.5);
  doc.text(`Teléfono / Celular: ${cliContacto.telefono || 'No registrado'}`, 18, y + 10.5);
  doc.text(`WhatsApp: ${cliContacto.whatsapp || 'No registrado'}`, 18, y + 15.5);

  doc.text(`Correo: ${cliContacto.correo || 'No registrado'}`, col2, y + 5.5);
  doc.text(`Identificador de Cliente: ${reserva.cliente_id.slice(0, 13)}…`, col2, y + 10.5);
  doc.text(`Integridad: Datos preservados en Snapshot inmutable`, col2, y + 15.5);
  y += 26;

  // Bloque 2: Datos de la Finca Campestre y Estancia
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('2. DETALLES DE LA FINCA Y ESTANCIA', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 5;

  doc.setFillColor(252, 252, 252);
  doc.rect(14, y, ancho - 28, 24, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Finca Campestre: ${finNombre}`, 18, y + 5.5);
  const zonaFinca = reserva.finca_snapshot?.zona || (reserva.fincas as any)?.zona || 'Santa Elena, El Cerrito';
  doc.text(`Ubicación / Sector: ${zonaFinca}`, 18, y + 10.5);
  doc.text(`Número de Huéspedes: ${reserva.personas} personas`, 18, y + 15.5);

  const [y1, m1, d1] = (reserva.fecha_inicio || '').split('-');
  const [y2, m2, d2] = (reserva.fecha_fin || '').split('-');
  const dt1 = new Date(reserva.fecha_inicio);
  const dt2 = new Date(reserva.fecha_fin);
  const nochesCalc = Math.max(1, Math.round((dt2.getTime() - dt1.getTime()) / (1000 * 3600 * 24)));

  doc.text(`Fecha de Entrada (Check-in): ${d1}/${m1}/${y1}`, col2, y + 5.5);
  doc.text(`Fecha de Salida (Check-out): ${d2}/${m2}/${y2}`, col2, y + 10.5);
  doc.text(`Total Noches de Alojamiento: ${nochesCalc} noche(s)`, col2, y + 15.5);
  y += 28;

  // Bloque 3: Balance Económico y Liquidación
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('3. DESGLOSE ECONÓMICO Y LIQUIDACIÓN DEFINITIVA', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 5;

  doc.setFillColor(248, 249, 248);
  doc.rect(14, y, ancho - 28, 26, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Concepto', 18, y + 5.5);
  doc.text('Monto COP', 182, y + 5.5, { align: 'right' });
  doc.line(14, y + 7.5, ancho - 14, y + 7.5);

  const costoAlim = reserva.costo_alimentacion || 0;
  const servAlim = reserva.alimentacion || 'Sin alimentación';
  doc.text(`Alojamiento por la estancia (${nochesCalc} noches, ${reserva.personas} pers.)`, 18, y + 12);
  doc.text(formatCOP(reserva.valor_total - costoAlim), 182, y + 12, { align: 'right' });

  if (costoAlim > 0) {
    doc.text(`Servicio de Alimentación (${servAlim})`, 18, y + 16.5);
    doc.text(formatCOP(costoAlim), 182, y + 16.5, { align: 'right' });
  }

  // Fila total liquidado
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL CONTRATADO:', 18, y + 21.5);
  doc.text(formatCOP(reserva.valor_total), 182, y + 21.5, { align: 'right' });
  y += 30;

  // Bloque 4: Historial de Pagos y Abonos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('4. HISTORIAL DE RECAUDO Y MOVIMIENTOS FINANCIEROS', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 5;

  const pagos = reserva.pagos || [];
  doc.setFillColor(26, 107, 94);
  doc.rect(14, y, ancho - 28, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha', 18, y + 4.2);
  doc.text('Tipo de Pago', 48, y + 4.2);
  doc.text('Detalle / Observación', 90, y + 4.2);
  doc.text('Valor COP', 182, y + 4.2, { align: 'right' });
  doc.setTextColor(30, 27, 19);
  y += 6;

  if (pagos.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.text('No hay registros detallados de abonos adicionales en la base de datos.', 18, y + 5);
    y += 8;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    pagos.forEach((p, idx) => {
      const fondo = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(fondo, fondo, fondo);
      doc.rect(14, y, ancho - 28, 5.5, 'F');
      doc.text(formatFecha(p.fecha), 18, y + 4);
      doc.text(p.tipo.toUpperCase(), 48, y + 4);
      doc.text((p.observacion || 'Abono verificado').slice(0, 42), 90, y + 4);
      const signo = p.tipo === 'devolucion' ? '-' : '+';
      doc.text(`${signo}${formatCOP(p.valor)}`, 182, y + 4, { align: 'right' });
      y += 5.5;
    });
  }

  // Resumen de saldo final
  doc.setFillColor(saldo <= 0 ? 230 : 255, saldo <= 0 ? 245 : 235, saldo <= 0 ? 236 : 235);
  doc.rect(14, y, ancho - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Total Recaudado: ${formatCOP(totalPagado)}`, 18, y + 4.8);
  doc.text(`Saldo Pendiente al Cierre: ${formatCOP(saldo)}`, 182, y + 4.8, { align: 'right' });
  y += 11;

  // Bloque 5: Acta de Cierre Operativo y Check-out
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('5. ACTA DE CIERRE OPERATIVO, ENTREGA Y OBSERVACIONES', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 5;

  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(220, 225, 222);
  doc.rect(14, y, ancho - 28, 26, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');

  const responsableCierre = reserva.cerrada_por || cierre?.responsable || 'Administración de Fincas';
  const calif = cierre?.calificacion ? `${cierre.calificacion} / 5 Estrellas ★` : 'No calificada';
  const estadoFinca = cierre?.estado_entrega_finca
    ? cierre.estado_entrega_finca.replace('_', ' ').toUpperCase()
    : 'ENTREGA CONFORME EN BUEN ESTADO';
  const depGarantia = cierre?.deposito_garantia_devuelto
    ? `Depósito de garantía devuelto (${formatCOP(cierre?.valor_deposito_devuelto || 0)})`
    : 'Sin retenciones de depósito reportadas';

  doc.text(`Responsable de Cierre: ${responsableCierre}`, 18, y + 5);
  doc.text(`Calificación de la Estadía: ${calif}`, 18, y + 9.5);
  doc.text(`Estado de Entrega del Inmueble: ${estadoFinca}`, 18, y + 14);
  doc.text(`Garantía: ${depGarantia}`, 18, y + 18.5);

  const notasFinales = reserva.notas_cierre || cierre?.notas_cierre || reserva.observaciones || 'Operación finalizada a entera satisfacción sin novedades pendientes.';
  doc.text(`Observaciones de Cierre: ${notasFinales.slice(0, 110)}`, 18, y + 23);
  y += 30;

  // Firma institucional administrativa (Firma de cliente removida)
  y = dibujarBloqueFirmaAdmin(doc, 14, y, 80, 'Por la Empresa Administradora:', `${responsableCierre} • ${config.nombre_empresa || 'Paraíso Terrenal'}`, config);

  pie(doc, config);
  const nombreArchivo = reserva.consecutivo ? reserva.consecutivo.replace(/[^a-zA-Z0-9_-]/g, '') : reserva.id.slice(0, 8);
  doc.save(`Expediente_${nombreArchivo}.pdf`);
}

