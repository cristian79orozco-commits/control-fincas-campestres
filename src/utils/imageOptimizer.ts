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

  if (!esRaster || tipo.includes('gif') || tipo.includes('svg') || originalSize < 60 * 1024) {
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

            // Si por alguna razón la imagen procesada es más pesada que la original, conservar original
            if (blob.size >= originalSize) {
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

            // Determinar extensión según mime
            const ext = mime.includes('webp') ? 'webp' : 'jpg';
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const newFileName = `${baseName}.${ext}`;

            const optimizedFile = new File([blob], newFileName, {
              type: mime,
              lastModified: Date.now(),
            });

            const reductionPct = Math.round((1 - blob.size / originalSize) * 100);

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
