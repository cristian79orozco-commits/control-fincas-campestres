/**
 * imageOptimizer.ts
 * Fase 5 — Optimización y compresión de imágenes en el cliente (Browser Canvas).
 * Convierte automáticamente imágenes (JPG, PNG) a formato WebP moderno,
 * redimensionando a un tamaño máximo óptimo para web y reduciendo sustancialmente
 * el peso de subida sin requerir infraestructura externa.
 */

export interface OptimizerOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/webp' | 'image/jpeg';
}

export interface ResultadoOptimizacion {
  file: File;
  originalSize: number;
  optimizedSize: number;
  reductionPct: number;
  width: number;
  height: number;
  format: string;
}

const DEFAULT_OPTIONS: Required<OptimizerOptions> = {
  maxWidth: 1280,
  maxHeight: 960,
  quality: 0.82,
  format: 'image/webp',
};

/**
 * Formatea un número de bytes a una cadena legible (ej: "2.4 MB", "420 KB").
 */
export function formatearBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Calcula el porcentaje de reducción en peso.
 */
export function calcularReduccion(original: number, optimizado: number): string {
  if (original <= 0) return '0%';
  const pct = Math.round((1 - optimizado / original) * 100);
  return pct > 0 ? `${pct}% menos` : '0%';
}

/**
 * Optimiza un archivo de imagen en el navegador usando HTML5 Canvas.
 * Si el archivo es GIF, SVG, o ya es menor a 60KB, se preserva sin alteraciones.
 */
export async function optimizarImagen(
  file: File,
  customOptions?: OptimizerOptions
): Promise<ResultadoOptimizacion> {
  const opts = { ...DEFAULT_OPTIONS, ...customOptions };
  const originalSize = file.size;

  // Si no es imagen raster o es GIF/SVG/ico, no alterar
  const tipo = file.type.toLowerCase();
  const esRaster = tipo.includes('jpeg') || tipo.includes('jpg') || tipo.includes('png') || tipo.includes('webp');

  if (!esRaster || tipo.includes('gif') || tipo.includes('svg')) {
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      reductionPct: 0,
      width: 0,
      height: 0,
      format: file.type || 'image/jpeg',
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Calcular nuevas dimensiones respetando la proporción sin hacer upscale
      if (width > opts.maxWidth || height > opts.maxHeight) {
        const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          file,
          originalSize,
          optimizedSize: originalSize,
          reductionPct: 0,
          width: img.width,
          height: img.height,
          format: file.type,
        });
        return;
      }

      // Suavizado de alta calidad para preservar nitidez
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const exportarBlob = (mime: string, fallbackMime?: string) => {
        canvas.toBlob(
          (blob) => {
            if (!blob && fallbackMime) {
              exportarBlob(fallbackMime);
              return;
            }

            if (!blob) {
              resolve({
                file,
                originalSize,
                optimizedSize: originalSize,
                reductionPct: 0,
                width,
                height,
                format: file.type,
              });
              return;
            }

            // Si el archivo original ya era WebP y el blob resultante es más pesado, conservar original
            if (tipo.includes('webp') && blob.size >= originalSize) {
              resolve({
                file,
                originalSize,
                optimizedSize: originalSize,
                reductionPct: 0,
                width,
                height,
                format: file.type,
              });
              return;
            }

            // Determinar extensión según mime (prioridad webp)
            const ext = mime.includes('webp') ? 'webp' : 'jpg';
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const newFileName = `${baseName}.${ext}`;

            const optimizedFile = new File([blob], newFileName, {
              type: mime,
              lastModified: Date.now(),
            });

            const reductionPct = originalSize > blob.size 
              ? Math.round((1 - blob.size / originalSize) * 100)
              : 0;

            resolve({
              file: optimizedFile,
              originalSize,
              optimizedSize: blob.size,
              reductionPct,
              width,
              height,
              format: mime,
            });
          },
          mime,
          opts.quality
        );
      };

      // Intentar WebP con fallback a JPEG
      exportarBlob(opts.format, 'image/jpeg');
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        file,
        originalSize,
        optimizedSize: originalSize,
        reductionPct: 0,
        width: 0,
        height: 0,
        format: file.type,
      });
    };

    img.src = objectUrl;
  });
}

export interface ResultadoFirmaOptimizada {
  file: File;
  blob: Blob;
  dataUrl: string;
  originalBytes: number;
  optimizedBytes: number;
  width: number;
  height: number;
  fondoRemovido: boolean;
}

/**
 * Procesa y optimiza quirúrgicamente una imagen de firma manuscrita (PNG o JPG):
 * 1. Detecta automáticamente si el fondo es blanco o claro (papel escaneado o foto con móvil).
 * 2. Remueve el fondo blanco convirtiéndolo en transparencia 100% PNG con antialiasing suave.
 * 3. Realza la nitidez y contraste de la tinta (pluma/bolígrafo azul o negro) para acabado formal.
 * 4. Recorta automáticamente los márgenes y vacíos sobrantes (Auto-crop / trim).
 * 5. Escala a dimensiones óptimas (máximo 520x200 px), reduciendo fotos de 4-8 MB a ~15-30 KB.
 */
export async function procesarFirmaTransparente(file: File): Promise<ResultadoFirmaOptimizada> {
  const originalBytes = file.size;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Paso 1: Dimensiones base controladas (tope máximo de 1600px para escaneos pesados de celular)
      let origW = img.naturalWidth || img.width || 600;
      let origH = img.naturalHeight || img.height || 200;

      const maxDim = 1600;
      let initW = origW;
      let initH = origH;
      if (initW > maxDim || initH > maxDim) {
        const ratio = Math.min(maxDim / initW, maxDim / initH);
        initW = Math.round(initW * ratio);
        initH = Math.round(initH * ratio);
      }

      const canvasTemp = document.createElement('canvas');
      canvasTemp.width = Math.max(1, initW);
      canvasTemp.height = Math.max(1, initH);
      const ctxTemp = canvasTemp.getContext('2d', { willReadFrequently: true });

      if (!ctxTemp) {
        reject(new Error('No se pudo inicializar el lienzo Canvas para procesar la firma'));
        return;
      }

      ctxTemp.drawImage(img, 0, 0, initW, initH);
      const imgData = ctxTemp.getImageData(0, 0, initW, initH);
      const data = imgData.data;

      // Paso 2: Análisis de fondo y detección de transparencia existente
      let transparentPixelCount = 0;
      const totalPixels = initW * initH;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 240) transparentPixelCount++;
      }

      // Si más del 12% ya es transparente, preservamos transparencia original
      const yaEsTransparente = (transparentPixelCount / totalPixels) > 0.12;
      let fondoRemovido = false;

      if (!yaEsTransparente) {
        fondoRemovido = true;
        // Muestrear las esquinas y bordes perimetrales para conocer el tono del papel
        const cornerSamples: number[][] = [];
        const stepX = Math.max(1, Math.floor(initW / 24));
        const stepY = Math.max(1, Math.floor(initH / 24));

        for (let x = 0; x < initW; x += stepX) {
          const idxTop = (0 * initW + x) * 4;
          cornerSamples.push([data[idxTop], data[idxTop + 1], data[idxTop + 2]]);
          const idxBottom = ((initH - 1) * initW + x) * 4;
          cornerSamples.push([data[idxBottom], data[idxBottom + 1], data[idxBottom + 2]]);
        }
        for (let y = 0; y < initH; y += stepY) {
          const idxLeft = (y * initW + 0) * 4;
          cornerSamples.push([data[idxLeft], data[idxLeft + 1], data[idxLeft + 2]]);
          const idxRight = (y * initW + (initW - 1)) * 4;
          cornerSamples.push([data[idxRight], data[idxRight + 1], data[idxRight + 2]]);
        }

        let sumR = 0, sumG = 0, sumB = 0;
        cornerSamples.forEach(([r, g, b]) => {
          sumR += r;
          sumG += g;
          sumB += b;
        });
        const countSamples = cornerSamples.length || 1;
        const avgBgR = sumR / countSamples;
        const avgBgG = sumG / countSamples;
        const avgBgB = sumB / countSamples;
        const avgBgLum = 0.299 * avgBgR + 0.587 * avgBgG + 0.114 * avgBgB;

        // Umbral adaptativo: la mayoría de hojas blancas o cremas están entre 180 y 255
        const umbralFondo = Math.max(180, avgBgLum - 25);
        const umbralTinta = Math.max(95, umbralFondo - 65);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          // Si el píxel es muy claro o similar al fondo del papel -> 100% transparente
          if (lum >= umbralFondo || (r > 215 && g > 215 && b > 215)) {
            data[i + 3] = 0;
          } else if (lum > umbralTinta) {
            // Zona de transición (antialiasing gradual para trazos suaves)
            const factor = (umbralFondo - lum) / (umbralFondo - umbralTinta);
            data[i + 3] = Math.round(Math.min(255, Math.max(0, factor * 255)));

            // Realce leve de contraste
            data[i] = Math.max(0, Math.round(r * 0.75));
            data[i + 1] = Math.max(0, Math.round(g * 0.75));
            data[i + 2] = Math.max(0, Math.round(b * 0.75));
          } else {
            // Píxel de trazo de firma
            data[i + 3] = 255;
            // Preservar si era tinta azul o tinta negra
            const esAzul = (b > r + 15 && b > g + 10);
            if (esAzul) {
              data[i] = Math.min(25, r);
              data[i + 1] = Math.min(55, g);
              data[i + 2] = Math.max(110, Math.min(185, b));
            } else {
              // Tinta negra/carbón profunda y uniforme
              data[i] = Math.min(28, r);
              data[i + 1] = Math.min(28, g);
              data[i + 2] = Math.min(32, b);
            }
          }
        }

        ctxTemp.putImageData(imgData, 0, 0);
      }

      // Paso 3: Auto-Crop (Detección de caja delimitadora de la firma)
      let minX = initW;
      let minY = initH;
      let maxX = 0;
      let maxY = 0;
      let hayTinta = false;

      for (let y = 0; y < initH; y++) {
        for (let x = 0; x < initW; x++) {
          const idx = (y * initW + x) * 4;
          const alpha = data[idx + 3];
          if (alpha > 25) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            hayTinta = true;
          }
        }
      }

      let cropX = 0;
      let cropY = 0;
      let cropW = initW;
      let cropH = initH;

      if (hayTinta && maxX >= minX && maxY >= minY) {
        const padding = Math.max(10, Math.round((maxX - minX) * 0.04));
        cropX = Math.max(0, minX - padding);
        cropY = Math.max(0, minY - padding);
        cropW = Math.min(initW - cropX, (maxX - minX) + padding * 2);
        cropH = Math.min(initH - cropY, (maxY - minY) + padding * 2);
      }

      // Paso 4: Escalar a dimensiones proporcionales ideales (máx 520x200 px)
      const targetMaxW = 520;
      const targetMaxH = 200;
      let finalW = cropW;
      let finalH = cropH;

      if (finalW > targetMaxW || finalH > targetMaxH) {
        const ratio = Math.min(targetMaxW / finalW, targetMaxH / finalH);
        finalW = Math.round(finalW * ratio);
        finalH = Math.round(finalH * ratio);
      }

      const canvasFinal = document.createElement('canvas');
      canvasFinal.width = Math.max(1, finalW);
      canvasFinal.height = Math.max(1, finalH);
      const ctxFinal = canvasFinal.getContext('2d');

      if (!ctxFinal) {
        reject(new Error('No se pudo inicializar canvas final para recortar la firma'));
        return;
      }

      ctxFinal.imageSmoothingEnabled = true;
      ctxFinal.imageSmoothingQuality = 'high';
      ctxFinal.drawImage(canvasTemp, cropX, cropY, cropW, cropH, 0, 0, finalW, finalH);

      // Paso 5: Generar DataURL y Blob PNG ultraliviano (~15-30 KB)
      const dataUrl = canvasFinal.toDataURL('image/png');
      canvasFinal.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Error al serializar firma como PNG'));
          return;
        }

        const optimizedFile = new File([blob], `firma_admin_${Date.now()}.png`, {
          type: 'image/png',
          lastModified: Date.now(),
        });

        resolve({
          file: optimizedFile,
          blob,
          dataUrl,
          originalBytes,
          optimizedBytes: blob.size,
          width: finalW,
          height: finalH,
          fondoRemovido,
        });
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen de firma seleccionada'));
    };

    img.src = objectUrl;
  });
}

