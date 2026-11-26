import { useState, useCallback, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { supabase } from '../services/supabase';
import { optimizarImagen, formatearBytes } from '../utils/imageOptimizer';
import type { ContenidoSitio } from '../types';

interface UseHeroImagenControllerParams {
  imagenActual?: string | null;
  onGuardarContenido?: (datos: Partial<ContenidoSitio>) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

/**
 * Controlador desacoplado (Capa 2) para gestionar la imagen protagonista del Hero
 * del panel del cliente: optimización WebP en navegador, carga a Supabase Storage
 * (bucket `finca-imagenes`) y persistencia reactiva en `contenido_sitio`.
 */
export function useHeroImagenController({
  imagenActual,
  onGuardarContenido,
  showToast,
}: UseHeroImagenControllerParams) {
  const [imagenUrl, setImagenUrl] = useState<string>(imagenActual || '');
  const [urlInput, setUrlInput] = useState<string>(imagenActual || '');
  const [subiendo, setSubiendo] = useState<boolean>(false);
  const [guardandoUrl, setGuardandoUrl] = useState<boolean>(false);
  const [infoOptimizacion, setInfoOptimizacion] = useState<string | null>(null);

  useEffect(() => {
    const normalizada = imagenActual || '';
    setImagenUrl(normalizada);
    setUrlInput(normalizada);
  }, [imagenActual]);

  const persistirUrl = useCallback(
    async (nuevaUrl: string, mensajeExito: string) => {
      if (!onGuardarContenido) {
        showToast('No hay conexión con el servicio de contenido del sitio.', 'error');
        return false;
      }

      const prevUrl = imagenUrl;
      setImagenUrl(nuevaUrl);
      setUrlInput(nuevaUrl);

      const res = await onGuardarContenido({ hero_imagen_url: nuevaUrl });
      if (!res.success) {
        setImagenUrl(prevUrl);
        setUrlInput(prevUrl);
        showToast(res.error || 'No se pudo guardar la imagen en la base de datos', 'error');
        return false;
      }

      showToast(mensajeExito, 'success');
      return true;
    },
    [imagenUrl, onGuardarContenido, showToast]
  );

  const handleSubirImagen = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('Por favor selecciona un archivo de imagen válido (JPG, PNG o WebP).', 'error');
        return;
      }

      setSubiendo(true);
      setInfoOptimizacion(null);

      try {
        const opt = await optimizarImagen(file, {
          format: 'image/webp',
          maxWidth: 1600,
          maxHeight: 1200,
          quality: 0.86,
        });

        const fileToUpload = opt.file;
        const mimeType = fileToUpload.type || 'image/webp';
        const ext = mimeType.includes('webp')
          ? 'webp'
          : fileToUpload.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `hero/hero_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('finca-imagenes')
          .upload(path, fileToUpload, { upsert: false, contentType: mimeType });

        if (uploadError) {
          console.error('[useHeroImagenController] Error subiendo imagen a Storage:', uploadError);
          showToast(`Error al subir la imagen: ${uploadError.message}`, 'error');
          return;
        }

        const { data: urlData } = supabase.storage.from('finca-imagenes').getPublicUrl(path);
        const publicUrl = urlData?.publicUrl;

        if (!publicUrl) {
          showToast('No se pudo obtener la URL pública de la imagen subida.', 'error');
          return;
        }

        const resumen = `${formatearBytes(opt.originalSize)} ➔ ${formatearBytes(opt.optimizedSize)}`;
        setInfoOptimizacion(`Optimizada a WebP (${resumen})`);

        await persistirUrl(publicUrl, 'Imagen del Hero subida y vinculada al panel cliente ✨');
      } catch (err: any) {
        console.error('[useHeroImagenController] Excepción procesando imagen:', err);
        showToast(err?.message || 'Error al procesar la imagen seleccionada', 'error');
      } finally {
        setSubiendo(false);
      }
    },
    [persistirUrl, showToast]
  );

  const handleGuardarUrlManual = useCallback(async () => {
    const limpia = urlInput.trim();
    if (!limpia) {
      showToast('Ingresa una URL válida o sube una imagen desde tu dispositivo.', 'info');
      return;
    }
    setGuardandoUrl(true);
    try {
      setInfoOptimizacion(null);
      await persistirUrl(limpia, 'URL de imagen del Hero guardada correctamente');
    } finally {
      setGuardandoUrl(false);
    }
  }, [persistirUrl, showToast, urlInput]);

  const handleEliminarImagen = useCallback(async () => {
    setGuardandoUrl(true);
    try {
      setInfoOptimizacion(null);
      await persistirUrl('', 'Imagen del Hero retirada del panel cliente');
    } finally {
      setGuardandoUrl(false);
    }
  }, [persistirUrl]);

  return {
    imagenUrl,
    urlInput,
    setUrlInput,
    subiendo,
    guardandoUrl,
    infoOptimizacion,
    handleSubirImagen,
    handleGuardarUrlManual,
    handleEliminarImagen,
  };
}
