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
import { getConfiguracionGlobal, setConfiguracionGlobal } from './configuracion';
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
  autoDescargar?: boolean;
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

// ===============================================================
// Caché en memoria y persistente de firma digital en formato DataURL
// Permite que jsPDF estampe la imagen de firma de manera 100% sincrónica
// sin retrasos de red, problemas de CORS ni parpadeos.
// ===============================================================
export const firmaDataUrlCache = new Map<string, string>();
export const KEY_FIRMA_CACHE_LOCAL = 'fc_firma_digital_dataurl';
const firmaImageCache = new Map<string, HTMLImageElement>();

/**
 * Obtiene de forma sincrónica el DataURL de la firma si ya se encuentra
 * en memoria o en el almacenamiento local del navegador.
 */
export function obtenerFirmaDataUrlSincrona(url?: string | null): string | null {
  if (!url || typeof url !== 'string' || url.trim().length === 0) return null;
  if (url.startsWith('data:image')) return url;
  
  if (firmaDataUrlCache.has(url)) {
    return firmaDataUrlCache.get(url) || null;
  }
  
  try {
    const guardada = localStorage.getItem(KEY_FIRMA_CACHE_LOCAL);
    if (guardada && guardada.startsWith('data:image')) {
      firmaDataUrlCache.set(url, guardada);
      return guardada;
    }
  } catch {
    // Si localStorage no está disponible
  }
  
  return null;
}

/**
 * Guarda en caché local y memoria el DataURL de la firma digital activa
 */
export function guardarFirmaEnCacheLocal(url: string, dataUrl: string): void {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return;
  if (url) firmaDataUrlCache.set(url, dataUrl);
  firmaDataUrlCache.set('active', dataUrl);
  try {
    localStorage.setItem(KEY_FIRMA_CACHE_LOCAL, dataUrl);
  } catch {
    // ignorar error de cuota
  }
}

/**
 * Descarga y convierte asincrónicamente una URL pública de Supabase Storage
 * en un DataURL Base64 y lo almacena en caché para estampar en jsPDF.
 */
export async function precargarFirmaDataUrl(url?: string | null): Promise<string | null> {
  if (!url || typeof url !== 'string' || url.trim().length === 0) return null;
  if (url.startsWith('data:image')) {
    guardarFirmaEnCacheLocal(url, url);
    return url;
  }

  const enCache = obtenerFirmaDataUrlSincrona(url);
  if (enCache) return enCache;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (dataUrl && dataUrl.startsWith('data:image')) {
          guardarFirmaEnCacheLocal(url, dataUrl);
          resolve(dataUrl);
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[documentos] Aviso al precargar DataURL de firma:', err);
    return null;
  }
}

export function predescargarFirma(url?: string | null) {
  if (!url || typeof url !== 'string' || url.startsWith('data:image')) return;
  // Disparar precarga a DataURL garantizada
  precargarFirmaDataUrl(url);

  if (firmaImageCache.has(url)) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => firmaImageCache.set(url, img);
  img.src = url;
}

/**
 * Estampa de manera elegante y centrada el bloque de firma de la Administración.
 * Sigue fielmente el diseño de la previsualización del sistema (Imagen 1):
 * - Trazo de firma recortado y transparente, perfectamente centrado.
 * - Línea de firma institucional centrada.
 * - Nombre / Cargo en negrita verde esmeralda (#1a6b5e) centrado.
 * - Leyenda "Firma Autorizada Paraíso Terrenal" en gris (#64748b) centrada.
 * 
 * Además, verifica el espacio vertical restante de la página (A4: 297mm):
 * - El pie de página institucional ocupa desde Y=282 hasta Y=297 (15mm).
 * - Si el contenido anterior deja menos de 30mm antes del pie (es decir, Y > 248),
 *   salta automáticamente a una nueva página y dibuja el membrete, garantizando
 *   que la firma nunca colisione con el pie independientemente de la cantidad de texto.
 */
export function parseHexRgb(hex?: string | null, fallback: [number, number, number] = [26, 107, 94]): [number, number, number] {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return fallback;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
  }
  return fallback;
}

/**
 * Estampa de manera elegante, mapeada y adaptable el bloque de firma de la Administración.
 * Soporta alineación dinámica (centro, izquierda, derecha), escala proporcional (0.5 a 1.5),
 * preservación de relación de aspecto de la firma manuscrita, y alternancia de leyenda/línea.
 */
function dibujarBloqueFirmaAdmin(
  doc: jsPDF,
  x: number,
  y: number,
  anchoLinea: number = 80,
  tituloEncabezado?: string,
  pieTexto?: string,
  configParam?: ConfiguracionGeneral,
  tituloDocParaNuevaPagina?: string,
  consecutivoParaNuevaPagina?: string
): number {
  const config = configParam || getConfiguracionGlobal();
  const plantillas = config.plantillas_pdf || {};
  const firmaUrl = config.firma_digital_url || plantillas.firma_digital_url;
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const centroX = anchoPagina / 2;

  const colorPrimario = parseHexRgb(plantillas.tema_color_primario, [26, 107, 94]);
  const posicion = plantillas.firma_posicion || 'centro';
  const escala = Math.max(0.4, Math.min(2.0, plantillas.firma_escala ?? 1.0));
  const anchoBase = (plantillas.firma_ancho_mm || 48) * escala;
  const altoBase = (plantillas.firma_alto_mm || 16) * escala;

  const altoPie = 15;
  const yTopeInferior = altoPagina - altoPie; // 282 mm en A4
  const espacioRequeridoFirma = Math.max(28, altoBase + 14);

  // 1. Control dinámico de desbordamiento de página (Page Overflow Protection)
  if (y + espacioRequeridoFirma > yTopeInferior - 2) {
    doc.addPage();
    if (tituloDocParaNuevaPagina) {
      encabezado(doc, tituloDocParaNuevaPagina, consecutivoParaNuevaPagina, config);
      y = 52;
    } else {
      y = 48;
    }
  } else {
    const maxPermitido = yTopeInferior - espacioRequeridoFirma - 3;
    y = Math.min(Math.max(y + 4, y + 6), maxPermitido);
  }

  // 2. Título de la sección de firma si existe
  if (tituloEncabezado && tituloEncabezado.trim().length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...colorPrimario);
    let xTitulo = centroX;
    let alignTitulo: 'center' | 'left' | 'right' = 'center';
    if (posicion === 'izquierda') {
      xTitulo = 14;
      alignTitulo = 'left';
    } else if (posicion === 'derecha') {
      xTitulo = anchoPagina - 14;
      alignTitulo = 'right';
    }
    doc.text(sanearTextoParaPdf(tituloEncabezado), xTitulo, y, { align: alignTitulo });
    y += 3.5;
  }

  const anchoFirma = anchoBase;
  const altoFirma = altoBase;

  let xFirma = centroX - (anchoFirma / 2);
  if (posicion === 'izquierda') {
    xFirma = 14;
  } else if (posicion === 'derecha') {
    xFirma = anchoPagina - 14 - anchoFirma;
  }

  const yFirma = y;
  const yLinea = yFirma + altoFirma + 0.8;

  // 3. Estampa de la imagen de la firma manuscrita transparente
  if (firmaUrl && typeof firmaUrl === 'string' && firmaUrl.trim().length > 0) {
    try {
      const dataUrl = obtenerFirmaDataUrlSincrona(firmaUrl) || (firmaUrl.startsWith('data:image') ? firmaUrl : null);
      if (dataUrl) {
        const formato = dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
        doc.addImage(dataUrl, formato, xFirma, yFirma, anchoFirma, altoFirma);
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

  // 4. Línea de firma
  const anchoFinalLinea = Math.max(anchoLinea || 80, anchoFirma + 16, 75);
  let xLineaInicio = centroX - (anchoFinalLinea / 2);
  let xLineaFin = centroX + (anchoFinalLinea / 2);
  let xTexto = centroX;
  let alignTexto: 'center' | 'left' | 'right' = 'center';

  if (posicion === 'izquierda') {
    xLineaInicio = 14;
    xLineaFin = 14 + anchoFinalLinea;
    xTexto = 14 + (anchoFinalLinea / 2);
  } else if (posicion === 'derecha') {
    xLineaInicio = anchoPagina - 14 - anchoFinalLinea;
    xLineaFin = anchoPagina - 14;
    xTexto = anchoPagina - 14 - (anchoFinalLinea / 2);
  }

  if (plantillas.firma_mostrar_linea !== false) {
    doc.setDrawColor(30, 27, 19);
    doc.setLineWidth(0.6);
    doc.line(xLineaInicio, yLinea, xLineaFin, yLinea);
  }

  // 5. Nombre / Cargo institucional
  const textoFirma = pieTexto || plantillas.pie_firma_admin || (config.nombre_empresa ? `Administración • ${config.nombre_empresa}` : 'Administración • Paraíso Terrenal');
  if (plantillas.firma_mostrar_cargo !== false) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...colorPrimario);
    doc.text(sanearTextoParaPdf(textoFirma), xTexto, yLinea + 4.5, { align: alignTexto });
  }

  // 6. Leyenda inferior de verificación
  if (plantillas.firma_mostrar_leyenda !== false) {
    const leyenda = plantillas.firma_leyenda_personalizada || 'Firma Autorizada Paraíso Terrenal';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(sanearTextoParaPdf(leyenda), xTexto, yLinea + 8.5, { align: alignTexto });
  }

  doc.setTextColor(30, 27, 19);
  return yLinea + 12;
}

// ---------------------------------------------------------------
// Encabezado corporativo adaptable (Fase 4 y Fase PDF Pro)
// ---------------------------------------------------------------
function encabezado(doc: jsPDF, titulo: string, numero?: string, configParam?: ConfiguracionGeneral) {
  const config = configParam || getConfiguracionGlobal();
  const plantillas = config.plantillas_pdf || {};
  const ancho = doc.internal.pageSize.getWidth();

  const colorPrimario = parseHexRgb(plantillas.tema_color_primario, [26, 107, 94]);
  const colorAcento = parseHexRgb(plantillas.tema_color_acento, [212, 172, 63]);

  // Franja institucional (personalizable)
  doc.setFillColor(...colorPrimario);
  doc.rect(0, 0, ancho, 42, 'F');

  // Filete de acento inferior para papelería de lujo
  doc.setDrawColor(...colorAcento);
  doc.setLineWidth(0.8);
  doc.line(0, 42, ancho, 42);

  // Tarjeta / Emblema contenedor del Logo oficial
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

/**
 * Dibuja una marca de agua diagonal con opacidad suave en todas las páginas del PDF
 */
export function dibujarMarcaDeAgua(doc: jsPDF, texto: string, colorHex?: string) {
  if (!texto || !texto.trim()) return;
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const color = parseHexRgb(colorHex, [26, 107, 94]);
  const numPaginas = doc.getNumberOfPages();

  for (let i = 1; i <= numPaginas; i++) {
    doc.setPage(i);
    try {
      doc.saveGraphicsState();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(40);
      // Color muy suave (mezcla al 92% con blanco para simular opacidad sin depender de GState)
      const rWatermark = Math.round(255 - (255 - color[0]) * 0.12);
      const gWatermark = Math.round(255 - (255 - color[1]) * 0.12);
      const bWatermark = Math.round(255 - (255 - color[2]) * 0.12);
      doc.setTextColor(rWatermark, gWatermark, bWatermark);
      doc.text(sanearTextoParaPdf(texto.toUpperCase()), ancho / 2, alto / 2, {
        align: 'center',
        angle: 45,
      });
      doc.restoreGraphicsState();
    } catch {
      // Ignorar si saveGraphicsState no está disponible
    }
  }
}

// ---------------------------------------------------------------
// PIE DE PÁGINA INSTITUCIONAL MULTIPÁGINA
// Estampa el pie de página y filete con los colores del tema oficial
// ---------------------------------------------------------------
function pie(doc: jsPDF, configParam?: ConfiguracionGeneral) {
  const config = configParam || getConfiguracionGlobal();
  const plantillas = config.plantillas_pdf || {};
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const totalPaginas = doc.getNumberOfPages();

  const colorPrimario = parseHexRgb(plantillas.tema_color_primario, [26, 107, 94]);
  const colorAcento = parseHexRgb(plantillas.tema_color_acento, [212, 172, 63]);

  // Si tiene marca de agua activa
  if (plantillas.mostrar_marca_agua && plantillas.texto_marca_agua) {
    dibujarMarcaDeAgua(doc, plantillas.texto_marca_agua, plantillas.tema_color_primario);
  }

  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);

    doc.setFillColor(...colorPrimario);
    doc.rect(0, alto - 15, ancho, 15, 'F');

    // Filete de acento superior en pie de página
    doc.setDrawColor(...colorAcento);
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

    // Indicador de página discreto en documentos multipágina
    if (totalPaginas > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(215, 238, 225);
      doc.text(`Pág. ${p} de ${totalPaginas}`, ancho - 14, alto - 4, { align: 'right' });
    }
  }

  doc.setTextColor(30, 27, 19);
}

/**
 * Consulta y extrae el estado más reciente y fresco directamente de Supabase
 * antes de generar o previsualizar cualquier documento PDF, garantizando que nunca
 * se emita papelería con datos desactualizados, firmas cacheadas obsoletas o saldos vencidos.
 */
export async function obtenerEstadoFrescoParaDocumento(params: {
  tipo: 'cotizacion' | 'separacion' | 'abono' | 'estado_cuenta' | 'paz_salvo' | 'menu';
  reservaId?: string;
  cotizacionId?: string;
  configActual?: ConfiguracionGeneral;
}): Promise<{
  configFresco: ConfiguracionGeneral;
  reservaFresca?: Reserva | null;
  cotizacionFresca?: CotizacionDB | null;
  fincaFresca?: Finca | null;
  clienteFresco?: Cliente | null;
}> {
  let configFresco: ConfiguracionGeneral = params.configActual ? { ...params.configActual } : getConfiguracionGlobal();

  try {
    const { supabase } = await import('./supabase');

    // 1. Obtener fila más reciente de configuracion_general
    try {
      const { data: dbConfig } = await supabase
        .from('configuracion_general')
        .select('*')
        .eq('id', 'general')
        .maybeSingle();

      if (dbConfig) {
        const plantillasExt = dbConfig.plantillas_pdf || dbConfig.plantillas_comunicacion?._plantillas_pdf || {};
        configFresco = {
          ...configFresco,
          ...dbConfig,
          plantillas_pdf: {
            ...(configFresco.plantillas_pdf || {}),
            ...plantillasExt,
            firma_digital_url: dbConfig.firma_digital_url || plantillasExt.firma_digital_url || configFresco.firma_digital_url || '',
          },
        };
        setConfiguracionGlobal(configFresco);
      }
    } catch (cfgErr) {
      console.warn('[documentos] Aviso al refrescar configuración en BD:', cfgErr);
    }

    // 2. Precargar firma digital fresca
    const firmaUrl = configFresco.firma_digital_url || configFresco.plantillas_pdf?.firma_digital_url;
    if (firmaUrl) {
      await precargarFirmaDataUrl(firmaUrl);
    }

    let reservaFresca: Reserva | null = null;
    let cotizacionFresca: CotizacionDB | null = null;
    let fincaFresca: Finca | null = null;
    let clienteFresco: Cliente | null = null;

    // 3. Reserva con pagos y finca actualizada
    if (params.reservaId) {
      const { data: resData } = await supabase
        .from('reservas')
        .select('*, clientes(*), fincas(*), pagos(*)')
        .eq('id', params.reservaId)
        .maybeSingle();

      if (resData) {
        reservaFresca = resData as Reserva;
        fincaFresca = resData.fincas as Finca;
        clienteFresco = resData.clientes as Cliente;
      }
    }

    // 4. Cotización con cliente y finca actualizada
    if (params.cotizacionId) {
      const { data: cotData } = await supabase
        .from('cotizaciones')
        .select('*, clientes(*), fincas(*)')
        .eq('id', params.cotizacionId)
        .maybeSingle();

      if (cotData) {
        cotizacionFresca = cotData as CotizacionDB;
        fincaFresca = cotData.fincas as Finca;
        clienteFresco = cotData.clientes as Cliente;
      }
    }

    return { configFresco, reservaFresca, cotizacionFresca, fincaFresca, clienteFresco };
  } catch (err) {
    console.warn('[documentos] Excepción en obtenerEstadoFrescoParaDocumento:', err);
    return { configFresco };
  }
}

// ================================================================
// ================================================================
// 1. DOCUMENTO DE SEPARACIÓN
// ================================================================
export function generarDocSeparacion(
  reserva: Reserva,
  configParam?: ConfiguracionGeneral,
  fincaParam?: Finca | Pick<Finca, 'id' | 'nombre'> | any | null,
  autoDescargar: boolean = true
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
  y = dibujarBloqueFirmaAdmin(
    doc,
    14,
    y,
    80,
    undefined,
    plantillasPdf.pie_firma_admin || (config.nombre_empresa ? `Administración • ${config.nombre_empresa}` : 'Administración • Paraíso Terrenal'),
    config,
    tituloDoc,
    num
  );

  pie(doc, config);
  const nombreArchivo = `Separacion_${num}.pdf`;
  if (autoDescargar) {
    doc.save(nombreArchivo);
  }
  const blob = doc.output('blob');
  return { doc, num, blob, nombreArchivo };
}

// ================================================================
// 2. COMPROBANTE DE ABONO
// ================================================================
export function generarComprobantePago(
  reserva: Reserva,
  pago: Pago,
  configParam?: ConfiguracionGeneral,
  autoDescargar: boolean = true
): ResultadoDocumentoPdf {
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

  // Firma y sello oficial de recaudos (Centrado institucional)
  y = dibujarBloqueFirmaAdmin(
    doc,
    14,
    y,
    80,
    undefined,
    plantillasPdf.pie_firma_admin || `Tesorería • ${config.nombre_empresa || 'Paraíso Terrenal'}`,
    config,
    tituloDoc,
    num
  );

  pie(doc, config);
  const nombreArchivo = `Abono_${num}.pdf`;
  if (autoDescargar) {
    doc.save(nombreArchivo);
  }
  const blob = doc.output('blob');
  return { doc, num, blob, nombreArchivo };
}

// ================================================================
// 3. ESTADO DE CUENTA
// ================================================================
export function generarEstadoCuenta(
  reserva: Reserva,
  configParam?: ConfiguracionGeneral,
  autoDescargar: boolean = true
): ResultadoDocumentoPdf {
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

  // Firma y certificación administrativa (Centrado institucional)
  y = dibujarBloqueFirmaAdmin(
    doc,
    14,
    y,
    80,
    undefined,
    plantillasPdf.pie_firma_admin || `Auditoría • ${config.nombre_empresa || 'Paraíso Terrenal'}`,
    config,
    tituloDoc,
    num
  );

  pie(doc, config);
  const nombreArchivo = `EstadoCuenta_${num}.pdf`;
  if (autoDescargar) {
    doc.save(nombreArchivo);
  }
  const blob = doc.output('blob');
  return { doc, num, blob, nombreArchivo };
}

// ================================================================
// 4. PAZ Y SALVO
// ================================================================
export function generarPazYSalvo(
  reserva: Reserva,
  configParam?: ConfiguracionGeneral,
  autoDescargar: boolean = true
): ResultadoDocumentoPdf | null {
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

  // Firma y certificación administrativa (Centrado institucional)
  y = dibujarBloqueFirmaAdmin(
    doc,
    14,
    y,
    80,
    undefined,
    plantillasPdf.pie_firma_admin || (config.nombre_empresa ? `Administración • ${config.nombre_empresa}` : 'Administración • Paraíso Terrenal'),
    config,
    tituloDoc,
    num
  );

  pie(doc, config);
  const nombreArchivo = `PazYSalvo_${num}.pdf`;
  if (autoDescargar) {
    doc.save(nombreArchivo);
  }
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
        const altoFoto = 36;
        doc.setDrawColor(219, 212, 195);
        doc.setFillColor(248, 247, 244);
        doc.roundedRect(14, y, 75, altoFoto, 2, 2, 'FD');
        doc.addImage(b64, 'JPEG', 15, y + 1, 73, altoFoto - 2);

        doc.setFillColor(244, 241, 234);
        doc.roundedRect(95, y, ancho - 109, altoFoto, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(26, 107, 94);
        doc.text('ASPECTOS DESTACADOS', 100, y + 6.5);
        doc.setTextColor(30, 27, 19);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`• Categoría: ${menu.categoria}`, 100, y + 13.5);
        doc.text(`• Valor individual: ${formatCOP(menu.precio_pp)} /pp`, 100, y + 20.5);
        doc.text(`• Servicio para: ${personas} personas`, 100, y + 27.5);
        doc.text(`• Total servicios: ${cantidadServicios}`, 100, y + 33.5);

        y += altoFoto + 4;
      }
    } catch {
      // Continuar limpiamente si la imagen no responde CORS
    }
  }

  y = linea(doc, y);
  y += 2;

  // TABLA DE LIQUIDACIÓN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('COTIZACIÓN Y VALOR DEL SERVICIO', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 6;

  // Cabecera de tabla
  doc.setFillColor(244, 241, 234);
  doc.rect(14, y - 4, 182, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Concepto / Menú', 16, y);
  doc.text('Precio / Persona', 90, y);
  doc.text('Comensales', 130, y);
  doc.text('Subtotal', 182, y, { align: 'right' });
  y += 5.5;
  y = linea(doc, y);
  y += 2.5;

  const totalServicio = (menu.precio_pp || 0) * personas * cantidadServicios;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(menu.nombre.slice(0, 38), 16, y);
  doc.text(formatCOP(menu.precio_pp), 90, y);
  doc.text(`${personas} pers. × ${cantidadServicios} serv.`, 130, y);
  doc.text(formatCOP(totalServicio), 182, y, { align: 'right' });
  y += 6.5;

  y = linea(doc, y);
  y += 2.5;

  // Total destacado
  doc.setFillColor(230, 243, 240);
  doc.rect(14, y - 4, 182, 8.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(26, 107, 94);
  doc.text('VALOR TOTAL PROPUESTA:', 18, y + 1.8);
  doc.text(formatCOP(totalServicio), 182, y + 1.8, { align: 'right' });
  doc.setTextColor(30, 27, 19);
  y += 10;

  // CONDICIONES (Fase 4: desde plantillas_pdf)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(26, 107, 94);
  doc.text('CONDICIONES Y POLÍTICAS DEL SERVICIO', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
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
      y += lines.length * 3.8;
    }
  }

  // Forma de Pago / Cuenta Bancaria de la Administración (Paraíso Terrenal)
  if (config.banco_cuenta) {
    y += 1.5;
    doc.setFillColor(244, 248, 246);
    doc.setDrawColor(26, 107, 94);
    doc.roundedRect(14, y, 182, 11.5, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(26, 107, 94);
    doc.text('DATOS BANCARIOS DE ADMINISTRACIÓN PARA TRANSFERENCIA (ALIMENTACIÓN):', 18, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
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
    doc.text(lineaBanco, 18, y + 8);
    y += 14;
  } else {
    y += 3;
  }

  // Firma Oficial de Coordinación Gastronómica (Centrada e institucional como la vista previa)
  const cargoGastronomico = plantillasPdf.pie_firma_admin || `Coordinación Gastronómica • ${config.nombre_empresa || 'Paraíso Terrenal'}`;
  y = dibujarBloqueFirmaAdmin(
    doc,
    14,
    y,
    80,
    undefined,
    cargoGastronomico,
    config,
    tituloDoc,
    num
  );

  pie(doc, config);

  const nombreArchivo = `Propuesta_Menu_${num}.pdf`;
  if (datos.autoDescargar !== false) {
    doc.save(nombreArchivo);
  }
  const blob = doc.output('blob');
  return { doc, num, blob, nombreArchivo };
}

// ================================================================
// 6. PROPUESTA FORMAL DE COTIZACIÓN (FASE 4)
// ================================================================
export function generarDocCotizacion(
  cotizacion: CotizacionDB,
  configParam?: ConfiguracionGeneral,
  fincaParam?: Finca | Pick<Finca, 'id' | 'nombre'> | any | null,
  autoDescargar: boolean = true
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

  // Firma Oficial de Asesoría Comercial (Centrado institucional)
  y = dibujarBloqueFirmaAdmin(
    doc,
    14,
    y,
    80,
    undefined,
    plantillasPdf.pie_firma_admin || `Asesoría Comercial • ${config.nombre_empresa || 'Paraíso Terrenal'}`,
    config,
    tituloDoc,
    num
  );

  pie(doc, config);
  const nombreArchivo = `Cotizacion_${num}.pdf`;
  if (autoDescargar) {
    doc.save(nombreArchivo);
  }
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

  // Firma institucional administrativa (Centrado institucional)
  y = dibujarBloqueFirmaAdmin(
    doc,
    14,
    y,
    80,
    undefined,
    `${responsableCierre} • ${config.nombre_empresa || 'Paraíso Terrenal'}`,
    config,
    'EXPEDIENTE HISTÓRICO Y ACTA DE CIERRE',
    numExpediente
  );

  pie(doc, config);
  const nombreArchivo = reserva.consecutivo ? reserva.consecutivo.replace(/[^a-zA-Z0-9_-]/g, '') : reserva.id.slice(0, 8);
  doc.save(`Expediente_${nombreArchivo}.pdf`);
}

/**
 * Genera el Blob y DataURL de un documento de muestra o real en memoria
 * sin disparar descargas de archivos en el navegador, ideal para el visor interactivo.
 */
export async function generarPreviewBlobAsync(
  tipo: 'cotizacion' | 'separacion' | 'abono' | 'estado_cuenta' | 'paz_salvo' | 'menu' | 'membrete',
  config: ConfiguracionGeneral,
  datosDemo?: {
    reserva?: any;
    cotizacion?: any;
    finca?: any;
    cliente?: any;
    menu?: any;
  }
): Promise<{ blob: Blob; blobUrl: string; num: string; nombreArchivo: string }> {
  const firmaUrl = config.firma_digital_url || config.plantillas_pdf?.firma_digital_url;
  if (firmaUrl && typeof firmaUrl === 'string' && firmaUrl.trim().length > 0) {
    await precargarFirmaDataUrl(firmaUrl);
  }

  const clienteEfectivo = datosDemo?.cliente || {
    id: 'demo-cli',
    nombre: 'Carlos',
    apellido: 'Rodríguez',
    whatsapp: config.whatsapp || '573176827093',
    telefono: config.telefono || '+57 317 682 7093',
    correo: config.correo || 'cliente@ejemplo.com',
    activo: true,
  };

  const fincaEfectiva = datosDemo?.finca || {
    id: 'demo-finca',
    nombre: 'Finca Villa Paraíso Campestre',
    zona: 'Santa Elena, Valle del Cauca',
    capacidad: 20,
    precio_pp: 75000,
    banco_nombre: 'Bancolombia',
    banco_tipo_cuenta: 'Ahorros',
    banco_cuenta: '315-998877-01',
    banco_titular: 'Propietario Finca Villa Paraíso',
    banco_identificacion: '1.118.234.567',
    estado: 'disponible',
    activo: true,
  };

  const reservaEfectiva = datosDemo?.reserva || {
    id: 'demo-reserva-1001',
    consecutivo: '1001',
    cliente_id: 'demo-cli',
    finca_id: 'demo-finca',
    fecha_inicio: '2026-11-15',
    fecha_fin: '2026-11-17',
    personas: 12,
    valor_total: 2280000,
    separacion: 900000,
    costo_alimentacion: 480000,
    alimentacion: 'Asado campestre gourmet + Desayuno típico',
    estado: 'activa',
    clientes: clienteEfectivo,
    fincas: fincaEfectiva,
    pagos: [
      {
        id: 'demo-pago-01',
        reserva_id: 'demo-reserva-1001',
        tipo: 'separacion',
        fecha: '2026-10-01',
        valor: 900000,
        observacion: 'Transferencia Bancolombia - Separación 50% Finca',
      },
    ],
  };

  let resultado: ResultadoDocumentoPdf;

  if (tipo === 'cotizacion' || tipo === 'membrete') {
    const cotDemo = datosDemo?.cotizacion || {
      id: 'demo-cot-1001',
      consecutivo: '1001',
      cliente_id: 'demo-cli',
      finca_id: 'demo-finca',
      fecha_inicio: '2026-11-15',
      fecha_fin: '2026-11-17',
      personas: 12,
      subtotal_alojamiento: 1800000,
      costo_alimentacion: 480000,
      descuento: 0,
      recargo: 0,
      total: 2280000,
      estado: 'cotizada',
      clientes: clienteEfectivo,
      fincas: fincaEfectiva,
      alimentacion: 'Asado campestre gourmet + Desayuno típico campesino',
    };
    resultado = generarDocCotizacion(cotDemo, config, fincaEfectiva, false);
  } else if (tipo === 'separacion') {
    resultado = generarDocSeparacion(reservaEfectiva, config, fincaEfectiva, false);
  } else if (tipo === 'abono') {
    resultado = generarComprobantePago(reservaEfectiva, reservaEfectiva.pagos[0], config, false);
  } else if (tipo === 'estado_cuenta') {
    resultado = generarEstadoCuenta(reservaEfectiva, config, false);
  } else if (tipo === 'paz_salvo') {
    const resPagada = {
      ...reservaEfectiva,
      pagos: [
        ...reservaEfectiva.pagos,
        {
          id: 'demo-pago-02',
          reserva_id: 'demo-reserva-1001',
          tipo: 'pago_total',
          fecha: '2026-10-10',
          valor: 1380000,
          observacion: 'Saldo de alojamiento y comida liquidado 100%',
        },
      ],
    };
    const resPs = generarPazYSalvo(resPagada, config, false);
    if (!resPs) throw new Error('No se pudo generar Paz y Salvo');
    resultado = resPs;
  } else if (tipo === 'menu') {
    const demoMenu = datosDemo?.menu || {
      id: 'demo-menu-1',
      nombre: 'Sancocho Tradicional de Gallina en Leña',
      categoria: 'Almuerzo',
      precio_pp: 35000,
      descripcion: 'Cocido tradicional en leña con plátano verde, yuca campesina, papa pastusa y mazorca tierna. Acompañado de arroz, ensalada y limonada natural con panela.',
      activo: true,
    };
    resultado = await generarPropuestaAlimentacion({
      menu: demoMenu,
      cliente: clienteEfectivo,
      finca: fincaEfectiva,
      personas: 12,
      cantidadServicios: 1,
      consecutivo: '1001',
      tituloDocumento: config.plantillas_pdf?.titulo_propuesta_menu || 'PROPUESTA DE SERVICIO GASTRONÓMICO',
      config,
      autoDescargar: false,
    });
  } else {
    resultado = generarDocCotizacion(datosDemo?.cotizacion || {}, config, fincaEfectiva, false);
  }

  const blobUrl = URL.createObjectURL(resultado.blob);
  return {
    blob: resultado.blob,
    blobUrl,
    num: resultado.num,
    nombreArchivo: resultado.nombreArchivo,
  };
}

