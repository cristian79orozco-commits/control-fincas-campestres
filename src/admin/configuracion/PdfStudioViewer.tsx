/**
 * PdfStudioViewer.tsx
 * Visor profesional interactivo de documentos PDF (Capa 1 Dumb UI).
 * Inspirado en las suites de Apryse WebViewer y Syncfusion PDF Viewer:
 * - Barra de herramientas con zoom fluido, cambio de modo (A4 interactivo vs PDF nativo en blob).
 * - Indicador de sincronización en tiempo real con Supabase.
 * - Mapeo visual dinámico de la firma digital con escala y posición.
 * - Sigue la guía de diseño fincas-ui-ux (Futuro Digital Pro).
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn, ZoomOut, RotateCcw, RefreshCw, Download, Eye, FileText,
  CheckCircle2, Sparkles, Layers, ShieldCheck, Check, Maximize2, ExternalLink
} from 'lucide-react';
import type { ConfiguracionGeneral, PlantillasPdfPersonalizadas } from '../../types';
import type { DocumentoSubTab } from '../../hooks/usePdfConfigController';

interface PdfStudioViewerProps {
  docSubTab: DocumentoSubTab;
  formData: ConfiguracionGeneral;
  viewerMode: 'interactivo' | 'real_pdf';
  zoomLevel: number;
  sincronizandoBD: boolean;
  generandoPreviewPdf: boolean;
  previewPdfBlobUrl: string | null;
  firmaUrl: string;
  descargandoPrueba: boolean;
  onSetViewerMode: (mode: 'interactivo' | 'real_pdf') => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onRefrescarBD: () => void;
  onEmitirPrueba: (tipo: DocumentoSubTab) => void;
}

export const PdfStudioViewer: React.FC<PdfStudioViewerProps> = ({
  docSubTab,
  formData,
  viewerMode,
  zoomLevel,
  sincronizandoBD,
  generandoPreviewPdf,
  previewPdfBlobUrl,
  firmaUrl,
  descargandoPrueba,
  onSetViewerMode,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onRefrescarBD,
  onEmitirPrueba,
}) => {
  const plantillas = formData.plantillas_pdf || {};

  const colorPrimario = plantillas.tema_color_primario || '#1a6b5e';
  const colorAcento = plantillas.tema_color_acento || '#d4ac3f';
  const posicion = plantillas.firma_posicion || 'centro';
  const escala = plantillas.firma_escala ?? 1.0;
  const anchoMm = plantillas.firma_ancho_mm || 48;
  const altoMm = plantillas.firma_alto_mm || 16;
  const mostrarLinea = plantillas.firma_mostrar_linea ?? true;
  const mostrarCargo = plantillas.firma_mostrar_cargo ?? true;
  const mostrarLeyenda = plantillas.firma_mostrar_leyenda ?? true;
  const leyendaTexto = plantillas.firma_leyenda_personalizada || 'Firma Autorizada Paraíso Terrenal';
  const mostrarMarcaAgua = plantillas.mostrar_marca_agua ?? false;
  const textoMarcaAgua = plantillas.texto_marca_agua || 'COPIA OFICIAL';

  // Título dinámico según plantilla seleccionada
  const tituloDocumento = (() => {
    switch (docSubTab) {
      case 'cotizacion':
        return plantillas.titulo_cotizacion || 'COTIZACIÓN FORMAL DE SERVICIOS';
      case 'separacion':
        return plantillas.titulo_separacion || 'DOCUMENTO DE SEPARACIÓN';
      case 'abono':
        return plantillas.titulo_abono || 'COMPROBANTE DE ABONO / PAGO';
      case 'estado_cuenta':
        return plantillas.titulo_estado_cuenta || 'ESTADO DE CUENTA CONSOLIDADO';
      case 'paz_salvo':
        return plantillas.titulo_paz_salvo || 'CERTIFICADO DE PAZ Y SALVO';
      case 'menu':
        return plantillas.titulo_propuesta_menu || 'PROPUESTA DE SERVICIO GASTRONÓMICO';
      case 'membrete':
      case 'diseno':
        return formData.doc_encabezado || 'MEMBRETE INSTITUCIONAL';
      default:
        return 'DOCUMENTO OFICIAL';
    }
  })();

  return (
    <div className="
      relative overflow-hidden rounded-[var(--rad-md)]
      bg-[var(--surface)] border border-[var(--border)]
      p-4 shadow-[var(--sh-md)] flex flex-col justify-between
      min-h-[580px] transition-all duration-300
    ">
      <div>
        {/* ============================================================== */}
        {/* BARRA DE HERRAMIENTAS PROFESIONAL (ESTILO APryse & Syncfusion) */}
        {/* ============================================================== */}
        <div className="
          flex items-center justify-between flex-wrap gap-2.5 pb-3 mb-3
          border-b border-[var(--border)]
        ">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center">
              <Eye size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                <span>Visor PDF Studio Pro</span>
                <span className="inline-flex items-center gap-1 text-[10px] text-[var(--success)] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                  BD en Vivo
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Renderizado a 60 FPS con mapeo de firma en tiempo real
              </div>
            </div>
          </div>

          {/* Selector de Modo de Visualización */}
          <div className="flex items-center gap-1.5 bg-[var(--surface-2)] p-1 rounded-lg border border-[var(--border)]">
            <button
              type="button"
              onClick={() => onSetViewerMode('interactivo')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewerMode === 'interactivo'
                  ? 'bg-[var(--primary)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Simulador A4
            </button>
            <button
              type="button"
              onClick={() => onSetViewerMode('real_pdf')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewerMode === 'real_pdf'
                  ? 'bg-[var(--accent)] text-[#141210] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Visor PDF Nativo
            </button>
          </div>

          {/* Controles de Zoom y Refresco de BD */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onZoomOut}
              className="btn btn-sm btn-secondary p-1.5"
              title="Reducir Zoom"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-[var(--text-muted)]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={onZoomIn}
              className="btn btn-sm btn-secondary p-1.5"
              title="Aumentar Zoom"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={onZoomReset}
              className="btn btn-sm btn-secondary p-1.5"
              title="Restablecer Zoom (100%)"
            >
              <RotateCcw size={12} />
            </button>

            {/* Botón Refrescar con Datos de BD */}
            <button
              type="button"
              onClick={onRefrescarBD}
              disabled={sincronizandoBD}
              className="btn btn-sm btn-secondary text-xs flex items-center gap-1 ml-1"
              title="Consultar Supabase para cargar la fila más reciente"
            >
              <RefreshCw size={12} className={sincronizandoBD ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Sincronizar BD</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* ÁREA DE VISUALIZACIÓN */}
        {/* ============================================================== */}
        <div className="w-full flex justify-center overflow-auto max-h-[640px] p-2 bg-[#0d0c0a] rounded-lg border border-[var(--border)]">
          {/* MODO 1: HOJA SIMULADA A4 INTERACTIVA */}
          {viewerMode === 'interactivo' && (
            <motion.div
              key={docSubTab + colorPrimario + colorAcento + posicion + escala}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: zoomLevel }}
              transition={{ duration: 0.2 }}
              style={{
                width: '100%',
                maxWidth: '620px',
                background: '#ffffff',
                color: '#1e1b13',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                border: '1px solid #dcd7cb',
                fontSize: '0.74rem',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                transformOrigin: 'top center',
              }}
            >
              {/* Marca de agua diagonal si está activa */}
              {mostrarMarcaAgua && textoMarcaAgua && (
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center z-10 select-none overflow-hidden"
                  style={{
                    color: colorPrimario,
                    opacity: 0.1,
                    fontSize: '3.2rem',
                    fontWeight: 900,
                    letterSpacing: '0.15em',
                    transform: 'rotate(-40deg)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {textoMarcaAgua.toUpperCase()}
                </div>
              )}

              {/* Encabezado Institucional adaptable con el color del tema */}
              <div
                style={{
                  background: colorPrimario,
                  color: '#ffffff',
                  padding: '1rem',
                  borderBottom: `2.5px solid ${colorAcento}`,
                  position: 'relative',
                }}
              >
                <div className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-lg bg-[#FAF7EE] border border-[var(--border)] overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                      <img
                        src={formData.doc_logo_url || formData.logo_url || '/logo.png'}
                        alt="Logo"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/logo.png';
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-bold leading-tight">
                        {formData.nombre_empresa || 'Paraíso Terrenal'}
                      </div>
                      <div className="text-[10px] italic opacity-85 leading-tight mt-0.5">
                        {formData.eslogan || 'Fincas de Alquiler · Experiencias exclusivas y descanso en la naturaleza'}
                      </div>
                      <div className="text-[11px] font-bold mt-1 text-white tracking-wide">
                        {tituloDocumento}
                      </div>
                      <div className="text-[9px] opacity-80 mt-0.5">
                        {formData.nit ? `NIT: ${formData.nit} • ` : ''}
                        {formData.telefono || '+57 317 682 7093'} • {formData.ciudad || 'Santa Elena, Valle'}
                      </div>
                    </div>
                  </div>

                  {/* Consecutivo */}
                  <div className="text-right shrink-0">
                    <div
                      className="px-2 py-0.5 rounded text-xs font-bold text-white shadow-sm border border-white/20"
                      style={{ background: 'rgba(0,0,0,0.25)' }}
                    >
                      # 1001
                    </div>
                    <div className="text-[9px] opacity-80 mt-1">
                      Emitido: {new Date().toLocaleDateString('es-CO')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Franja de Cliente y Finca */}
              <div className="bg-[#f4f1ea] px-4 py-2.5 flex justify-between border-b border-[#dbd4c3] text-xs">
                <div>
                  <strong>Cliente:</strong> Carlos Rodríguez <br />
                  <strong>Contacto:</strong> +57 317 682 7093
                </div>
                <div className="text-right">
                  <strong>Finca:</strong> Villa Paraíso Campestre <br />
                  <strong>Huéspedes:</strong> 12 personas
                </div>
              </div>

              {/* Cuerpo del Documento según tipo */}
              <div className="p-4 flex flex-col gap-2.5">
                {/* Paz y Salvo */}
                {docSubTab === 'paz_salvo' && (
                  <div className="bg-[#d1ead9] text-[#1a6b5e] font-bold text-center py-2.5 rounded text-sm">
                    ✓ PAGADO EN SU TOTALIDAD · OBLIGACIÓN CANCELADA 100%
                  </div>
                )}

                {/* Cotización */}
                {docSubTab === 'cotizacion' && (
                  <>
                    <div className="bg-[#fef9c3] border border-[#ca8a04] text-[#a16207] p-2 rounded font-bold flex justify-between text-xs">
                      <span>{plantillas.instruccion_abono_cotizacion || 'ABONO REQUERIDO (50% ALOJAMIENTO):'}</span>
                      <span>$900.000 COP</span>
                    </div>

                    <div className="bg-[#f8f9f8] border border-[#dbd4c3] p-2 rounded text-[10px]">
                      <div className="font-bold text-[#1a6b5e]">1. CUENTA DEL PROPIETARIO (50% ALOJAMIENTO):</div>
                      <div>Banco: Bancolombia • Ahorros N°: 315-998877-01 • Titular: Propietario Finca</div>
                    </div>

                    <div className="bg-[#f4f8f6] border border-[#1a6b5e] p-2 rounded text-[10px]">
                      <div className="font-bold text-[#1a6b5e]">2. CUENTA ADMINISTRACIÓN (ALIMENTACIÓN PARAÍSO TERRENAL):</div>
                      <div>
                        Banco: {formData.banco_nombre || 'Bancolombia'} • {formData.banco_tipo_cuenta || 'Ahorros'} N°: {formData.banco_cuenta || '315-000000-99'} • Titular: {formData.banco_titular || 'Paraíso Terrenal'}
                      </div>
                    </div>
                  </>
                )}

                {/* Separación */}
                {docSubTab === 'separacion' && (
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between border-b border-dashed border-gray-300 pb-1">
                      <span>1. Alojamiento Finca (Total: $1.800.000):</span>
                      <span><strong>Saldo Check-in: $900.000 COP</strong></span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-gray-300 pb-1">
                      <span>2. Alimentación Paraíso Terrenal ($480.000):</span>
                      <span><strong>Saldo Comida: $480.000 COP</strong></span>
                    </div>
                  </div>
                )}

                {/* Abono */}
                {docSubTab === 'abono' && (
                  <div className="bg-[#f8f9fa] border border-[#e2e8f0] p-2.5 rounded text-xs flex justify-between items-center">
                    <div>
                      <strong>Abono Recibido:</strong> $900.000 COP <br />
                      <span className="text-[10px] text-gray-500">Fecha: {new Date().toLocaleDateString('es-CO')} · Transferencia</span>
                    </div>
                    <span className="text-xs font-bold text-[#15803d]">✓ Aplicado a Reserva</span>
                  </div>
                )}

                {/* Términos y Cláusulas en miniatura */}
                <div className="text-[10px] text-gray-600 italic bg-[#faf9f6] p-2 rounded border border-[#eae6dc]">
                  {docSubTab === 'cotizacion' && (plantillas.vigencia_cotizacion ? plantillas.vigencia_cotizacion.slice(0, 160) + '...' : '• Vigencia de 5 días hábiles...')}
                  {docSubTab === 'separacion' && (plantillas.clausulas_separacion ? plantillas.clausulas_separacion.slice(0, 160) + '...' : '• La separación bloquea la disponibilidad...')}
                  {docSubTab === 'paz_salvo' && (plantillas.texto_paz_salvo || 'Se expide el presente paz y salvo...')}
                  {docSubTab === 'menu' && (plantillas.condiciones_gastronomicas ? plantillas.condiciones_gastronomicas.slice(0, 160) + '...' : '• Preparación con ingredientes seleccionados...')}
                  {docSubTab === 'abono' && (formData.textos_legales ? formData.textos_legales.slice(0, 160) + '...' : '• Válido como comprobante de pago...')}
                  {docSubTab === 'estado_cuenta' && (formData.textos_legales ? formData.textos_legales.slice(0, 160) + '...' : '• Documento expedido de conformidad...')}
                  {(docSubTab === 'membrete' || docSubTab === 'diseno') && 'Encabezado, paleta institucional y pie aplicables a todos los documentos del sistema.'}
                </div>

                {/* ============================================================== */}
                {/* BLOQUE DE FIRMA DIGITAL DINÁMICA CON MAPEO DE POSICIÓN & ESCALA */}
                {/* ============================================================== */}
                <div
                  className={`flex pt-2 mt-2 border-t border-gray-100 ${
                    posicion === 'izquierda' ? 'justify-start' :
                    posicion === 'derecha' ? 'justify-end' :
                    'justify-center'
                  }`}
                >
                  <div
                    className={`flex flex-col ${
                      posicion === 'izquierda' ? 'items-start text-left' :
                      posicion === 'derecha' ? 'items-end text-right' :
                      'items-center text-center'
                    }`}
                  >
                    {firmaUrl ? (
                      <div
                        style={{
                          transform: `scale(${escala})`,
                          transformOrigin: posicion === 'izquierda' ? 'left bottom' : posicion === 'derecha' ? 'right bottom' : 'center bottom',
                          marginBottom: '-2px',
                        }}
                      >
                        <img
                          src={firmaUrl}
                          alt="Firma Digital"
                          style={{
                            maxHeight: `${altoMm * 2.5}px`,
                            maxWidth: `${anchoMm * 3.5}px`,
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ height: '32px' }} />
                    )}

                    {mostrarLinea && (
                      <div
                        style={{
                          width: `${Math.max(140, anchoMm * 3.2 * escala)}px`,
                          borderBottom: '1.5px solid #1e1b13',
                          marginBottom: '3px',
                        }}
                      />
                    )}

                    {mostrarCargo && (
                      <span className="font-bold text-[10px]" style={{ color: colorPrimario }}>
                        {plantillas.pie_firma_admin || 'Administración • Paraíso Terrenal'}
                      </span>
                    )}

                    {mostrarLeyenda && (
                      <span className="text-[8px] text-[#64748b]">
                        {leyendaTexto}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pie de Página Institucional adaptable con el color del tema */}
              <div
                style={{
                  background: colorPrimario,
                  color: '#ffffff',
                  padding: '0.45rem 1rem',
                  textAlign: 'center',
                  fontSize: '0.62rem',
                  borderTop: `1.5px solid ${colorAcento}`,
                }}
              >
                <div>{formData.doc_pie_pagina || 'Paraíso Terrenal • Fincas de Alquiler • Documento oficial generado automáticamente'}</div>
                <div className="text-[8px] opacity-85 mt-0.5">
                  {formData.doc_contacto_info || 'WhatsApp: +57 317 682 7093 | reservas@fincascampestres.com'}
                </div>
              </div>
            </motion.div>
          )}

          {/* MODO 2: VISOR PDF REAL NATIVO (IFRAME CON BLOB REAL GENERADO POR PDF-LIB / JSPDF) */}
          {viewerMode === 'real_pdf' && (
            <div className="w-full h-[580px] flex items-center justify-center relative">
              {generandoPreviewPdf ? (
                <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                  <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                  <span className="text-xs font-semibold">Generando documento nativo con pdf-lib...</span>
                </div>
              ) : previewPdfBlobUrl ? (
                <iframe
                  src={previewPdfBlobUrl}
                  title="Visor PDF Real"
                  className="w-full h-full rounded border-0"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                />
              ) : (
                <div className="text-center text-[var(--text-muted)] text-xs">
                  No hay PDF generado disponible para visualización.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* BARRA INFERIOR: ACCIÓN DE DESCARGA DIRECTA */}
      {/* ============================================================== */}
      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-2 text-xs">
        <span className="text-[var(--text-muted)] flex items-center gap-1.5">
          <Sparkles size={14} className="text-[var(--accent)]" />
          Previsualización fiel al 100% de impresión y papelería digital.
        </span>

        <button
          type="button"
          onClick={() => onEmitirPrueba(docSubTab)}
          disabled={descargandoPrueba}
          className="
            inline-flex items-center justify-center gap-2
            px-4 py-2 rounded-[var(--rad-sm)]
            bg-[var(--accent)] text-[#141210] font-bold text-xs tracking-wide
            shadow-[0_2px_10px_rgba(212,146,74,0.25)]
            transition-all duration-200 ease-in-out
            hover:brightness-110 hover:shadow-[0_4px_20px_rgba(212,146,74,0.4)]
            active:scale-[0.98] disabled:opacity-50
          "
        >
          <Download size={14} />
          {descargandoPrueba ? 'Generando PDF...' : `Descargar Muestra (${docSubTab.toUpperCase()})`}
        </button>
      </div>
    </div>
  );
};
