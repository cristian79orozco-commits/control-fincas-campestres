/**
 * PdfSignatureMapper.tsx
 * Componente Visual (Capa 1 Dumb UI) para mapeo, calibración de escala,
 * alineación de firma digital y procesamiento transparente de trazos.
 * Sigue la guía de estilo fincas-ui-ux (Futuro Digital Pro).
 */

import React from 'react';
import {
  PenTool, Upload, Trash2, AlignCenter, AlignLeft, AlignRight,
  Maximize2, Sparkles, CheckCircle2, ShieldCheck, Sliders, Check
} from 'lucide-react';
import type { PlantillasPdfPersonalizadas } from '../../types';

interface PdfSignatureMapperProps {
  firmaUrl: string;
  plantillas: PlantillasPdfPersonalizadas;
  subiendoFirma: boolean;
  infoFirmaOptimizada: string | null;
  onSubirFirma: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEliminarFirma: () => void;
  onChangePlantilla: (campo: keyof PlantillasPdfPersonalizadas, valor: any) => void;
}

export const PdfSignatureMapper: React.FC<PdfSignatureMapperProps> = ({
  firmaUrl,
  plantillas,
  subiendoFirma,
  infoFirmaOptimizada,
  onSubirFirma,
  onEliminarFirma,
  onChangePlantilla,
}) => {
  const posicion = plantillas.firma_posicion || 'centro';
  const escala = plantillas.firma_escala ?? 1.0;
  const anchoMm = plantillas.firma_ancho_mm || 48;
  const altoMm = plantillas.firma_alto_mm || 16;
  const mostrarLinea = plantillas.firma_mostrar_linea ?? true;
  const mostrarCargo = plantillas.firma_mostrar_cargo ?? true;
  const mostrarLeyenda = plantillas.firma_mostrar_leyenda ?? true;
  const leyendaTexto = plantillas.firma_leyenda_personalizada || 'Firma Autorizada Paraíso Terrenal';

  return (
    <div className="
      relative overflow-hidden rounded-[var(--rad-md)]
      bg-[var(--surface)] border border-[var(--border)]
      p-5 shadow-[var(--sh-md)]
      transition-all duration-300 ease-out
      hover:border-[var(--accent)] hover:shadow-[0_8px_30px_rgba(212,146,74,0.08)]
      flex flex-col gap-4
    ">
      {/* Luz ambiental sutil en esquina */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[var(--accent)]/5 blur-3xl" />

      {/* Cabecera del bloque */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 flex items-center justify-center">
            <PenTool size={17} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--text)] m-0 flex items-center gap-2">
              Firma Digital & Mapeo de Posición
            </h4>
            <span className="text-xs text-[var(--text-muted)]">
              Calibración de escala, alineación horizontal y remoción de fondo blanco
            </span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20">
          <CheckCircle2 size={12} />
          Incrustación Automática en Todos los PDF
        </span>
      </div>

      {/* Canvas / Tablero de Previsualización de la Firma */}
      <div className="
        w-full min-h-[140px] rounded-lg border border-[var(--border)]
        flex flex-col items-center justify-center p-4 relative overflow-hidden
      " style={{
        backgroundImage: `
          linear-gradient(45deg, #f1f5f9 25%, transparent 25%), 
          linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), 
          linear-gradient(45deg, transparent 75%, #f1f5f9 75%), 
          linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)
        `,
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
        backgroundColor: '#ffffff',
      }}>
        {firmaUrl ? (
          <div
            className={`flex flex-col transition-all duration-200 ${
              posicion === 'izquierda' ? 'items-start text-left w-full pl-6' :
              posicion === 'derecha' ? 'items-end text-right w-full pr-6' :
              'items-center text-center'
            }`}
          >
            <div style={{ transform: `scale(${escala})`, transformOrigin: posicion === 'izquierda' ? 'left bottom' : posicion === 'derecha' ? 'right bottom' : 'center bottom' }}>
              <img
                src={firmaUrl}
                alt="Firma Manuscrita Transparente"
                style={{
                  maxHeight: `${altoMm * 3}px`,
                  maxWidth: `${anchoMm * 4}px`,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))'
                }}
              />
            </div>

            {mostrarLinea && (
              <div
                style={{
                  width: `${Math.max(160, anchoMm * 3.5 * escala)}px`,
                  borderBottom: '1.5px solid #1e1b13',
                  marginTop: '4px',
                  marginBottom: '3px'
                }}
              />
            )}

            {mostrarCargo && (
              <div className="text-xs font-bold text-[#1a6b5e] leading-tight">
                {plantillas.pie_firma_admin || 'Administración • Paraíso Terrenal'}
              </div>
            )}

            {mostrarLeyenda && (
              <div className="text-[10px] text-[#64748b] leading-tight mt-0.5">
                {leyendaTexto}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-[var(--text-muted)] p-3">
            <Upload size={28} className="mx-auto mb-1.5 opacity-40 text-[var(--primary)]" />
            <div className="text-xs font-semibold text-[#1e1b13]">Sin firma digital registrada</div>
            <div className="text-[11px] text-[#64748b] mt-0.5">
              Carga tu firma manuscrita para estamparla automáticamente en documentos
            </div>
          </div>
        )}
      </div>

      {/* Retroalimentación de optimización automática */}
      {infoFirmaOptimizada && (
        <div className="flex items-center gap-2 p-2.5 rounded-md bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 text-xs font-semibold">
          <Sparkles size={14} className="shrink-0" />
          <span>{infoFirmaOptimizada}</span>
        </div>
      )}

      {/* Botones de Carga / Eliminación */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="
          inline-flex items-center justify-center gap-2
          px-4 py-2 rounded-[var(--rad-sm)]
          bg-[var(--accent)] text-[#141210] font-semibold text-xs tracking-wide
          shadow-[0_2px_10px_rgba(212,146,74,0.25)]
          transition-all duration-200 ease-in-out
          hover:brightness-110 hover:shadow-[0_4px_20px_rgba(212,146,74,0.4)]
          active:scale-[0.98] cursor-pointer
        ">
          <Upload size={14} />
          {subiendoFirma ? 'Optimizando trazo y retirando fondo...' : (firmaUrl ? 'Reemplazar Imagen de Firma' : 'Cargar Firma (PNG / JPG)')}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onSubirFirma}
            className="hidden"
            disabled={subiendoFirma}
          />
        </label>

        {firmaUrl && (
          <button
            type="button"
            onClick={onEliminarFirma}
            className="
              inline-flex items-center justify-center gap-1.5
              px-3.5 py-2 rounded-[var(--rad-sm)]
              bg-transparent text-rose-400 font-medium text-xs
              border border-rose-500/30 hover:bg-rose-500/10
              transition-all duration-200
            "
          >
            <Trash2 size={13} /> Retirar Firma
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* CONTROLES DE CALIBRACIÓN DE FIRMA */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
        {/* Selector de Posición Horizontal */}
        <div className="field">
          <label className="text-xs font-semibold text-[var(--text)] mb-1 block">
            Alineación Horizontal de la Firma:
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
            <button
              type="button"
              onClick={() => onChangePlantilla('firma_posicion', 'izquierda')}
              className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-medium transition-all ${
                posicion === 'izquierda'
                  ? 'bg-[var(--accent)] text-[#141210] font-bold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <AlignLeft size={13} /> Izquierda
            </button>
            <button
              type="button"
              onClick={() => onChangePlantilla('firma_posicion', 'centro')}
              className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-medium transition-all ${
                posicion === 'centro'
                  ? 'bg-[var(--accent)] text-[#141210] font-bold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <AlignCenter size={13} /> Centrada
            </button>
            <button
              type="button"
              onClick={() => onChangePlantilla('firma_posicion', 'derecha')}
              className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-medium transition-all ${
                posicion === 'derecha'
                  ? 'bg-[var(--accent)] text-[#141210] font-bold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <AlignRight size={13} /> Derecha
            </button>
          </div>
        </div>

        {/* Control Deslizante de Escala Proporcional */}
        <div className="field">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-[var(--text)]">
              Escala de Proporción:
            </label>
            <span className="text-xs font-bold text-[var(--accent)]">
              {Math.round(escala * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={escala}
            onChange={(e) => onChangePlantilla('firma_escala', parseFloat(e.target.value) || 1.0)}
            className="w-full h-2 bg-[var(--surface-3)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
            <span>Compacta (50%)</span>
            <span>Normal (100%)</span>
            <span>Amplia (150%)</span>
          </div>
        </div>
      </div>

      {/* Opciones y Toggles de Visibilidad */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[var(--border)] text-xs">
        <label className="flex items-center gap-2 text-[var(--text)] cursor-pointer">
          <input
            type="checkbox"
            checked={mostrarLinea}
            onChange={(e) => onChangePlantilla('firma_mostrar_linea', e.target.checked)}
            className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span>Línea de Apoyo</span>
        </label>

        <label className="flex items-center gap-2 text-[var(--text)] cursor-pointer">
          <input
            type="checkbox"
            checked={mostrarCargo}
            onChange={(e) => onChangePlantilla('firma_mostrar_cargo', e.target.checked)}
            className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span>Nombre / Cargo</span>
        </label>

        <label className="flex items-center gap-2 text-[var(--text)] cursor-pointer">
          <input
            type="checkbox"
            checked={mostrarLeyenda}
            onChange={(e) => onChangePlantilla('firma_mostrar_leyenda', e.target.checked)}
            className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span>Leyenda Autorizada</span>
        </label>
      </div>

      {/* Input de Leyenda Personalizada */}
      <div className="field pt-1">
        <label className="text-xs font-semibold text-[var(--text)] mb-1 block">
          Leyenda Oficial bajo la Firma:
        </label>
        <input
          type="text"
          value={leyendaTexto}
          onChange={(e) => onChangePlantilla('firma_leyenda_personalizada', e.target.value)}
          placeholder="Ej: Firma Autorizada Paraíso Terrenal"
          className="
            w-full px-3.5 py-2.5 rounded-[var(--rad-xs)]
            bg-[var(--surface-2)] text-[var(--text)] text-xs
            border border-[var(--border)]
            placeholder:text-[var(--text-muted)]/60
            outline-none transition-all duration-200
            focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]
            focus:shadow-[0_0_12px_rgba(212,146,74,0.2)]
          "
        />
      </div>
    </div>
  );
};
