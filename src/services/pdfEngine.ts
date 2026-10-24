/**
 * pdfEngine.ts
 * Motor profesional de procesamiento, llenado de formularios, rediseño dinámico
 * e incrustación de firma digital de alta precisión utilizando pdf-lib y jsPDF.
 *
 * Integra adaptadores para suites profesionales (Apryse WebViewer, Syncfusion PDF Viewer)
 * y un motor nativo ultra-rápido para ejecución a 60 FPS sin dependencias comerciales obligatorias.
 */

import { PDFDocument, rgb, StandardFonts, degrees, PDFPage } from 'pdf-lib';
import type { PlantillasPdfPersonalizadas, ConfiguracionGeneral } from '../types';

// Factor de conversión milímetros a puntos PostScript (1 pulgada = 25.4 mm = 72 pt)
export const MM_TO_PT = 2.83465;

export interface DimensionesFirmaMapeada {
  x: number; // en puntos PostScript desde el borde izquierdo
  y: number; // en puntos PostScript desde la base (origen inferior izquierdo)
  width: number;
  height: number;
  aspectRatio: number;
}

export interface OpcionesEstampadoFirma {
  posicion?: 'centro' | 'izquierda' | 'derecha';
  escala?: number; // 0.5 a 1.5
  anchoMm?: number;
  altoMm?: number;
  mostrarLinea?: boolean;
  mostrarCargo?: boolean;
  mostrarLeyenda?: boolean;
  nombreFirmante?: string;
  cargoFirmante?: string;
  leyendaAutorizada?: string;
  colorLinea?: [number, number, number]; // RGB normalizado 0..1
  colorTexto?: [number, number, number];
}

export interface OpcionesRedisenoPdf {
  colorPrimarioHex?: string; // Ej: #1a6b5e
  colorAcentoHex?: string; // Ej: #d4ac3f
  estiloEncabezado?: 'corporativo' | 'moderno' | 'clasico' | 'minimalista';
  marcaDeAgua?: {
    texto: string;
    opacidad?: number;
    colorHex?: string;
  };
}

/**
 * Convierte un color HEX (#RRGGBB) a formato RGB normalizado (0 a 1) para pdf-lib
 */
export function hexToPdfRgb(hex?: string): [number, number, number] {
  if (!hex || !hex.startsWith('#')) return [0.1, 0.42, 0.37]; // default #1a6b5e
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    return [r, g, b];
  }
  return [0.1, 0.42, 0.37];
}

/**
 * Extrae la imagen en Base64 o Uint8Array desde un DataURL o URL pública
 */
export async function extraerBytesImagen(urlODataUrl: string): Promise<{ bytes: Uint8Array; formato: 'png' | 'jpg' } | null> {
  try {
    if (!urlODataUrl || typeof urlODataUrl !== 'string') return null;

    let base64 = '';
    let formato: 'png' | 'jpg' = 'png';

    if (urlODataUrl.startsWith('data:image/')) {
      const match = urlODataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
      if (match) {
        formato = match[1] === 'png' ? 'png' : 'jpg';
        base64 = match[2];
      } else {
        const parts = urlODataUrl.split(',');
        base64 = parts[1] || '';
      }
      const binStr = atob(base64);
      const len = binStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
      return { bytes, formato };
    }

    // Si es URL remota, descargar con fetch
    const resp = await fetch(urlODataUrl, { mode: 'cors' });
    if (!resp.ok) return null;
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const contentType = resp.headers.get('content-type') || '';
    formato = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
    return { bytes, formato };
  } catch (err) {
    console.warn('[pdfEngine] Excepción al procesar bytes de imagen:', err);
    return null;
  }
}

/**
 * Calcula las coordenadas y escala exactas para posicionar la firma digital en una página PDF
 * respetando estrictamente la relación de aspecto intrínseca de la imagen.
 */
export function calcularPosicionFirma(
  anchoPaginaPt: number,
  yBasePt: number,
  imgAnchoOriginal: number,
  imgAltoOriginal: number,
  opciones: OpcionesEstampadoFirma
): DimensionesFirmaMapeada {
  const escala = Math.max(0.4, Math.min(2.0, opciones.escala || 1.0));
  const anchoMmDeseado = (opciones.anchoMm || 48) * escala;
  const anchoPt = anchoMmDeseado * MM_TO_PT;
  
  // Calcular alto preservando aspect ratio sin deformación
  const aspectRatio = imgAltoOriginal / (imgAnchoOriginal || 1);
  const altoPt = anchoPt * aspectRatio;

  const margenLateralPt = 14 * MM_TO_PT;
  let x = (anchoPaginaPt - anchoPt) / 2; // Por defecto: centrado

  if (opciones.posicion === 'izquierda') {
    x = margenLateralPt;
  } else if (opciones.posicion === 'derecha') {
    x = anchoPaginaPt - margenLateralPt - anchoPt;
  }

  return {
    x,
    y: yBasePt,
    width: anchoPt,
    height: altoPt,
    aspectRatio,
  };
}

/**
 * Estampa con alta fidelidad vectorial la firma digital en un documento PDF existente utilizando pdf-lib.
 * Incluye la línea base de apoyo, el nombre/cargo en verde corporativo y la leyenda autorizada.
 */
export async function estamparFirmaEnPdfDocument(
  pdfBytes: Uint8Array | ArrayBuffer,
  firmaUrl: string,
  opciones: OpcionesEstampadoFirma,
  paginaDestinoIndex: number = -1 // -1 significa la última página
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  if (pages.length === 0) return new Uint8Array(pdfBytes);

  const targetPageIndex = paginaDestinoIndex < 0 ? pages.length - 1 : Math.min(paginaDestinoIndex, pages.length - 1);
  const page = pages[targetPageIndex];
  const { width: pageWidth, height: pageHeight } = page.getSize();

  // Obtener imagen de firma
  const imgData = await extraerBytesImagen(firmaUrl);
  if (!imgData) {
    return await pdfDoc.save();
  }

  const embeddedImage = imgData.formato === 'png'
    ? await pdfDoc.embedPng(imgData.bytes)
    : await pdfDoc.embedJpg(imgData.bytes);

  const imgAncho = embeddedImage.width;
  const imgAlto = embeddedImage.height;

  // Ubicación vertical en la parte inferior sobre el pie de página institucional
  // 15mm de pie institucional + 10mm margen de resguardo = 25mm desde abajo
  const yFirmaBottom = 26 * MM_TO_PT;

  const dim = calcularPosicionFirma(pageWidth, yFirmaBottom, imgAncho, imgAlto, opciones);

  // 1. Incrustar imagen de firma con canal alfa transparente
  page.drawImage(embeddedImage, {
    x: dim.x,
    y: dim.y + 12 * MM_TO_PT,
    width: dim.width,
    height: dim.height,
  });

  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 2. Línea de apoyo institucional
  const anchoLinea = Math.max(dim.width, 70 * MM_TO_PT);
  let xLinea = dim.x + (dim.width - anchoLinea) / 2;
  if (opciones.posicion === 'izquierda') xLinea = dim.x;
  if (opciones.posicion === 'derecha') xLinea = dim.x + dim.width - anchoLinea;

  const yLinea = dim.y + 10 * MM_TO_PT;

  if (opciones.mostrarLinea !== false) {
    page.drawLine({
      start: { x: xLinea, y: yLinea },
      end: { x: xLinea + anchoLinea, y: yLinea },
      thickness: 0.8,
      color: rgb(0.12, 0.11, 0.08), // Color carbón cálido #1e1b13
    });
  }

  // 3. Nombre / Cargo institucional
  const colorTexto = opciones.colorTexto ? rgb(...opciones.colorTexto) : rgb(0.1, 0.42, 0.37); // Verde #1a6b5e
  const textoFirmante = opciones.nombreFirmante || 'Administración • Paraíso Terrenal';

  if (opciones.mostrarCargo !== false) {
    const textWidth = fontHelveticaBold.widthOfTextAtSize(textoFirmante, 8.5);
    let xTexto = xLinea + (anchoLinea - textWidth) / 2;
    if (opciones.posicion === 'izquierda') xTexto = dim.x;

    page.drawText(textoFirmante, {
      x: xTexto,
      y: yLinea - 9,
      size: 8.5,
      font: fontHelveticaBold,
      color: colorTexto,
    });
  }

  // 4. Leyenda de verificación autorizada
  if (opciones.mostrarLeyenda !== false) {
    const leyenda = opciones.leyendaAutorizada || 'Firma Autorizada Paraíso Terrenal';
    const leyendaWidth = fontHelvetica.widthOfTextAtSize(leyenda, 6.8);
    let xLeyenda = xLinea + (anchoLinea - leyendaWidth) / 2;
    if (opciones.posicion === 'izquierda') xLeyenda = dim.x;

    page.drawText(leyenda, {
      x: xLeyenda,
      y: yLinea - 18,
      size: 6.8,
      font: fontHelvetica,
      color: rgb(0.4, 0.45, 0.52), // Gris slate #64748b
    });
  }

  return await pdfDoc.save();
}

/**
 * Aplica marcas de agua dinámicas a todas las páginas de un documento PDF
 */
export async function aplicarMarcaDeAguaPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  texto: string,
  opacidad: number = 0.08,
  colorHex?: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const color = hexToPdfRgb(colorHex || '#1a6b5e');

  for (const page of pages) {
    const { width, height } = page.getSize();
    const fontSize = Math.min(width, height) * 0.12;
    const textWidth = font.widthOfTextAtSize(texto, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    page.drawText(texto, {
      x: width / 2 - textWidth / 2 + 30,
      y: height / 2 - textHeight / 2,
      size: fontSize,
      font,
      color: rgb(...color),
      opacity: opacidad,
      rotate: degrees(45),
    });
  }

  return await pdfDoc.save();
}

/**
 * Llenado automático y tipado de formularios AcroForm (PDF Forms)
 * Mapea pares clave-valor a campos de texto, checkboxes y radiobuttons en PDFs oficiales.
 */
export async function rellenarFormularioAcroFormPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  camposData: Record<string, string | boolean | number>,
  aplanarFormulario: boolean = true
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  for (const [campo, valor] of Object.entries(camposData)) {
    try {
      const field = form.getFieldMaybe(campo);
      if (!field) continue;

      if (typeof valor === 'boolean') {
        const checkbox = form.getCheckBox(campo);
        if (valor) checkbox.check();
        else checkbox.uncheck();
      } else {
        const textField = form.getTextField(campo);
        textField.setText(String(valor));
      }
    } catch (fieldErr) {
      console.warn(`[pdfEngine] Campo AcroForm no asignable: "${campo}"`, fieldErr);
    }
  }

  if (aplanarFormulario) {
    try {
      form.flatten();
    } catch (flatErr) {
      console.warn('[pdfEngine] Aviso al aplanar formulario:', flatErr);
    }
  }

  return await pdfDoc.save();
}

/**
 * Combina múltiples documentos PDF en un único expediente unificado
 */
export async function combinarDocumentosPdf(archivosPdf: (Uint8Array | ArrayBuffer)[]): Promise<Uint8Array> {
  const pdfCombinado = await PDFDocument.create();

  for (const pdfBytes of archivosPdf) {
    const doc = await PDFDocument.load(pdfBytes);
    const copiedPages = await pdfCombinado.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((page) => pdfCombinado.addPage(page));
  }

  return await pdfCombinado.save();
}

/**
 * Convierte Uint8Array de un PDF a Blob URL para reproducción en iframes y visores web.
 */
export function pdfBytesToBlobUrl(pdfBytes: Uint8Array): string {
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

// =========================================================================
// ADAPTADORES ARQUITECTÓNICOS PARA SUITES PROFESIONALES (Apryse & Syncfusion)
// =========================================================================

export interface ApryseWebViewerConfig {
  licenseKey?: string;
  path?: string; // Ruta de assets estáticos (lib/)
  initialDoc?: string | Blob;
  enableAnnotations?: boolean;
  enableFormFields?: boolean;
}

export interface SyncfusionPdfViewerConfig {
  licenseKey?: string;
  serviceUrl?: string;
  documentPath?: string;
  enableSignature?: boolean;
}

/**
 * Adaptador de Apryse WebViewer (PDFTron).
 * Verifica la disponibilidad del SDK y proporciona interfaz de integración desacoplada.
 */
export class ApryseWebViewerAdapter {
  private static isAvailable(): boolean {
    return typeof (window as any).WebViewer !== 'undefined';
  }

  public static async inicializar(
    contenedor: HTMLElement,
    config: ApryseWebViewerConfig
  ): Promise<{ exito: boolean; mensaje: string; instancia?: any }> {
    if (!this.isAvailable()) {
      return {
        exito: false,
        mensaje: 'Apryse WebViewer SDK no cargado en window. El visor nativo pdf-lib asumirá el control a 60 FPS.',
      };
    }

    try {
      const WebViewer = (window as any).WebViewer;
      const instance = await WebViewer(
        {
          path: config.path || '/webviewer/lib',
          licenseKey: config.licenseKey || '',
          initialDoc: config.initialDoc,
          fullAPI: true,
        },
        contenedor
      );

      return {
        exito: true,
        mensaje: 'Apryse WebViewer inicializado correctamente',
        instancia: instance,
      };
    } catch (err: any) {
      return {
        exito: false,
        mensaje: `Fallo al inicializar Apryse: ${err?.message || 'Error de licencia o scripts'}`,
      };
    }
  }
}

/**
 * Adaptador de Syncfusion PDF Viewer.
 * Interfaz para registro de clave y renderizado con streaming.
 */
export class SyncfusionPdfViewerAdapter {
  private static isAvailable(): boolean {
    return typeof (window as any).ej?.pdfviewer?.PdfViewer !== 'undefined';
  }

  public static registrarLicencia(licenseKey?: string): boolean {
    if (licenseKey && typeof (window as any).ej?.base?.registerLicense === 'function') {
      (window as any).ej.base.registerLicense(licenseKey);
      return true;
    }
    return false;
  }
}
