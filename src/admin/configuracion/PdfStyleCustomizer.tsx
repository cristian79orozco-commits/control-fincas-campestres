/**
 * PdfStyleCustomizer.tsx
 * Componente Visual (Capa 1 Dumb UI) para rediseño dinámico de documentos PDF:
 * Paletas de color, franjas institucionales, marcas de agua y membretes.
 * Sigue la guía de estilo fincas-ui-ux (Futuro Digital Pro).
 */

import React from 'react';
import { Palette, Sparkles, Droplets, Stamp, Check, Sliders } from 'lucide-react';
import type { PlantillasPdfPersonalizadas, ConfiguracionGeneral } from '../../types';

interface PdfStyleCustomizerProps {
  formData: ConfiguracionGeneral;
  plantillas: PlantillasPdfPersonalizadas;
  onChangeCampo: (campo: keyof ConfiguracionGeneral, valor: any) => void;
  onChangePlantilla: (campo: keyof PlantillasPdfPersonalizadas, valor: any) => void;
}

const PALETAS_PREDEFINIDAS = [
  { id: 'esmeralda', nombre: 'Esmeralda Paraíso (Oficial)', primario: '#1a6b5e', acento: '#d4ac3f' },
  { id: 'ambar', nombre: 'Ámbar Cálido & Campestre', primario: '#a16207', acento: '#d4924a' },
  { id: 'azul', nombre: 'Azul Ejecutivo Real', primario: '#1e3a8a', acento: '#38bdf8' },
  { id: 'carbon', nombre: 'Carbón Minimalista Pro', primario: '#18181b', acento: '#a1a1aa' },
  { id: 'bosque', nombre: 'Verde Bosque Natural', primario: '#14532d', acento: '#86efac' },
];

export const PdfStyleCustomizer: React.FC<PdfStyleCustomizerProps> = ({
  formData,
  plantillas,
  onChangeCampo,
  onChangePlantilla,
}) => {
  const colorPrimario = plantillas.tema_color_primario || '#1a6b5e';
  const colorAcento = plantillas.tema_color_acento || '#d4ac3f';
  const mostrarMarcaAgua = plantillas.mostrar_marca_agua ?? false;
  const textoMarcaAgua = plantillas.texto_marca_agua || 'COPIA OFICIAL';

  return (
    <div className="
      relative overflow-hidden rounded-[var(--rad-md)]
      bg-[var(--surface)] border border-[var(--border)]
      p-5 shadow-[var(--sh-md)]
      transition-all duration-300 ease-out
      hover:border-[var(--accent)] hover:shadow-[0_8px_30px_rgba(212,146,74,0.08)]
      flex flex-col gap-4
    ">
      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center">
            <Palette size={17} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--text)] m-0 flex items-center gap-2">
              Rediseño Visual & Paleta Cromática del PDF
            </h4>
            <span className="text-xs text-[var(--text-muted)]">
              Personaliza el color de franjas, filetes dorados y marcas de agua oficiales
            </span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
          <Sparkles size={12} /> Alta Definición
        </span>
      </div>

      {/* Selector de Paletas Predefinidas */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--text)]">
          Temas Cromáticos Institucionales Recomendados:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PALETAS_PREDEFINIDAS.map((paleta) => {
            const esActiva = colorPrimario.toLowerCase() === paleta.primario.toLowerCase();
            return (
              <button
                key={paleta.id}
                type="button"
                onClick={() => {
                  onChangePlantilla('tema_color_primario', paleta.primario);
                  onChangePlantilla('tema_color_acento', paleta.acento);
                }}
                className={`
                  flex items-center justify-between p-2.5 rounded-lg border text-left transition-all
                  ${esActiva
                    ? 'border-[var(--accent)] bg-[var(--surface-2)] shadow-[0_0_12px_rgba(212,146,74,0.15)] ring-1 ring-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center -space-x-1">
                    <span
                      className="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                      style={{ backgroundColor: paleta.primario }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-sm"
                      style={{ backgroundColor: paleta.acento }}
                    />
                  </div>
                  <span className="text-xs font-medium text-[var(--text)] truncate">
                    {paleta.nombre}
                  </span>
                </div>
                {esActiva && <Check size={14} className="text-[var(--accent)] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selectores de Color Manual (Hexadecimal) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
        <div className="field">
          <label className="text-xs font-semibold text-[var(--text)] mb-1 block">
            Color Primario de Franja & Títulos:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={colorPrimario}
              onChange={(e) => onChangePlantilla('tema_color_primario', e.target.value)}
              className="w-9 h-9 rounded cursor-pointer border border-[var(--border)] bg-transparent p-0.5"
            />
            <input
              type="text"
              value={colorPrimario}
              onChange={(e) => onChangePlantilla('tema_color_primario', e.target.value)}
              placeholder="#1a6b5e"
              className="
                flex-1 px-3 py-2 rounded-[var(--rad-xs)]
                bg-[var(--surface-2)] text-[var(--text)] text-xs font-mono
                border border-[var(--border)] outline-none
                focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]
              "
            />
          </div>
        </div>

        <div className="field">
          <label className="text-xs font-semibold text-[var(--text)] mb-1 block">
            Color de Acento & Filete Dorado:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={colorAcento}
              onChange={(e) => onChangePlantilla('tema_color_acento', e.target.value)}
              className="w-9 h-9 rounded cursor-pointer border border-[var(--border)] bg-transparent p-0.5"
            />
            <input
              type="text"
              value={colorAcento}
              onChange={(e) => onChangePlantilla('tema_color_acento', e.target.value)}
              placeholder="#d4ac3f"
              className="
                flex-1 px-3 py-2 rounded-[var(--rad-xs)]
                bg-[var(--surface-2)] text-[var(--text)] text-xs font-mono
                border border-[var(--border)] outline-none
                focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]
              "
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MARCA DE AGUA VECTORIAL */}
      {/* ============================================================== */}
      <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--border)]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text)] cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarMarcaAgua}
              onChange={(e) => onChangePlantilla('mostrar_marca_agua', e.target.checked)}
              className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <Stamp size={15} className="text-[var(--accent)]" />
            <span>Imprimir Marca de Agua Diagonal en el Fondo</span>
          </label>

          <span className="text-[11px] text-[var(--text-muted)]">
            Opacidad suave del 12% para no obstruir la lectura
          </span>
        </div>

        {mostrarMarcaAgua && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
            <div className="field">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">
                Texto de la Marca de Agua:
              </label>
              <input
                type="text"
                value={textoMarcaAgua}
                onChange={(e) => onChangePlantilla('texto_marca_agua', e.target.value)}
                placeholder="Ej: CONFIRMADA, COTIZACIÓN, ORIGINAL"
                className="
                  w-full px-3 py-2 rounded-[var(--rad-xs)]
                  bg-[var(--surface-2)] text-[var(--text)] text-xs
                  border border-[var(--border)] outline-none
                  focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]
                "
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap pt-4">
              {['COPIA OFICIAL', 'CONFIRMADA', 'COTIZACIÓN', 'RESERVADO', 'PAGADO'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChangePlantilla('texto_marca_agua', t)}
                  className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                    textoMarcaAgua === t
                      ? 'bg-[var(--accent)] text-[#141210]'
                      : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
