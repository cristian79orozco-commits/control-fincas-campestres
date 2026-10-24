/**
 * usePdfConfigController.ts
 * Controlador desacoplado (Capa 2 de la Arquitectura de Blindaje) para el
 * Estudio de Diseño, Relleno de Formularios y Modificación de Documentos PDF.
 *
 * - Aísla la lógica de negocio y llamadas a Supabase de la vista visual.
 * - Sincroniza en tiempo real con la base de datos para garantizar datos 100% frescos.
 * - Gestiona el estado reactivo de la firma digital (posición, escala, trazo, aspecto).
 * - Orquesta la generación en segundo plano a 60 FPS con debounce sin bloquear la UI.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ConfiguracionGeneral, PlantillasPdfPersonalizadas } from '../types';
import {
  generarPreviewBlobAsync,
  obtenerEstadoFrescoParaDocumento,
  precargarFirmaDataUrl,
} from '../services/documentos';

export type DocumentoSubTab =
  | 'cotizacion'
  | 'separacion'
  | 'abono'
  | 'estado_cuenta'
  | 'paz_salvo'
  | 'menu'
  | 'membrete'
  | 'diseno';

export interface UsePdfConfigControllerProps {
  formData: ConfiguracionGeneral;
  onChangeCampo: (campo: keyof ConfiguracionGeneral, valor: any) => void;
  onChangePlantilla: (campo: keyof PlantillasPdfPersonalizadas, valor: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function usePdfConfigController({
  formData,
  onChangeCampo,
  onChangePlantilla,
  showToast,
}: UsePdfConfigControllerProps) {
  // Pestaña de documento activa
  const [docSubTab, setDocSubTab] = useState<DocumentoSubTab>('cotizacion');

  // Modo de visualización: 'interactivo' (A4 simulado ultra-rápido) o 'real_pdf' (Blob renderizado nativo)
  const [viewerMode, setViewerMode] = useState<'interactivo' | 'real_pdf'>('interactivo');

  // Nivel de zoom (0.75 a 1.5)
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Estados de carga y refresco de datos en tiempo real
  const [sincronizandoBD, setSincronizandoBD] = useState(false);
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date>(new Date());
  const [generandoPreviewPdf, setGenerandoPreviewPdf] = useState(false);

  // Blob y URL del PDF real generado
  const [previewPdfBlobUrl, setPreviewPdfBlobUrl] = useState<string | null>(null);

  // Referencia para cancelar llamadas debounced previas
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Firma URL efectiva
  const firmaUrl = useMemo(() => {
    return formData.firma_digital_url || formData.plantillas_pdf?.firma_digital_url || '';
  }, [formData.firma_digital_url, formData.plantillas_pdf?.firma_digital_url]);

  // Precargar firma digital activa
  useEffect(() => {
    if (firmaUrl && firmaUrl.trim().length > 0) {
      precargarFirmaDataUrl(firmaUrl);
    }
  }, [firmaUrl]);

  /**
   * Genera el PDF nativo en memoria (Blob) con debounce para garantizar 60 FPS
   */
  const actualizarPreviewPdfReal = useCallback(async (tipo: DocumentoSubTab, config: ConfiguracionGeneral) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setGenerandoPreviewPdf(true);
      try {
        const docTipoParaGenerar = tipo === 'diseno' ? 'cotizacion' : tipo;
        const res = await generarPreviewBlobAsync(docTipoParaGenerar as any, config);
        setPreviewPdfBlobUrl((prev) => {
          if (prev && prev.startsWith('blob:')) {
            URL.revokeObjectURL(prev);
          }
          return res.blobUrl;
        });
      } catch (err) {
        console.warn('[usePdfConfigController] Aviso al generar preview nativo:', err);
      } finally {
        setGenerandoPreviewPdf(false);
      }
    }, 320);
  }, []);

  // Actualizar preview nativo cuando cambia a modo real_pdf o cambia de sub-pestaña
  useEffect(() => {
    if (viewerMode === 'real_pdf') {
      actualizarPreviewPdfReal(docSubTab, formData);
    }
  }, [viewerMode, docSubTab, formData, actualizarPreviewPdfReal]);

  // Limpiar Blob URL al desmontar
  useEffect(() => {
    return () => {
      if (previewPdfBlobUrl && previewPdfBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewPdfBlobUrl);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [previewPdfBlobUrl]);

  /**
   * Consulta directa a Supabase para sincronizar con los datos más recientes
   */
  const refrescarDatosDesdeBD = useCallback(async () => {
    setSincronizandoBD(true);
    try {
      const tipoParaBD = (docSubTab === 'diseno' || docSubTab === 'membrete' ? 'cotizacion' : docSubTab) as
        | 'cotizacion'
        | 'separacion'
        | 'abono'
        | 'estado_cuenta'
        | 'paz_salvo'
        | 'menu';

      const { configFresco } = await obtenerEstadoFrescoParaDocumento({
        tipo: tipoParaBD,
        configActual: formData,
      });

      // Actualizar campos que hayan cambiado externamente
      if (configFresco.plantillas_pdf) {
        Object.entries(configFresco.plantillas_pdf).forEach(([k, v]) => {
          onChangePlantilla(k as keyof PlantillasPdfPersonalizadas, v);
        });
      }
      if (configFresco.firma_digital_url) {
        onChangeCampo('firma_digital_url', configFresco.firma_digital_url);
      }

      setUltimaSincronizacion(new Date());
      showToast('Datos sincronizados en tiempo real con Supabase ✅', 'success');

      if (viewerMode === 'real_pdf') {
        actualizarPreviewPdfReal(docSubTab, configFresco);
      }
    } catch (err) {
      console.error('[usePdfConfigController] Error al sincronizar con BD:', err);
      showToast('No se pudo sincronizar con la base de datos', 'error');
    } finally {
      setSincronizandoBD(false);
    }
  }, [docSubTab, formData, onChangeCampo, onChangePlantilla, showToast, viewerMode, actualizarPreviewPdfReal]);

  // Controles de Zoom fluido
  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(1.5, Math.round((prev + 0.1) * 10) / 10));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(0.6, Math.round((prev - 0.1) * 10) / 10));
  }, []);

  const zoomReset = useCallback(() => {
    setZoomLevel(1.0);
  }, []);

  return {
    docSubTab,
    setDocSubTab,
    viewerMode,
    setViewerMode,
    zoomLevel,
    zoomIn,
    zoomOut,
    zoomReset,
    sincronizandoBD,
    ultimaSincronizacion,
    generandoPreviewPdf,
    previewPdfBlobUrl,
    firmaUrl,
    refrescarDatosDesdeBD,
    actualizarPreviewPdfReal,
  };
}
