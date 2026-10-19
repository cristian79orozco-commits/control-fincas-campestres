import React from 'react';
import {
  Edit3,
  RotateCcw,
  Copy,
  Check,
  Download,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { useComunicacionesStore } from '../../store/useComunicacionesStore';
import {
  formatearConsecutivoConPrefijo,
  type TipoDocumentoPrefijo,
} from '../../utils/consecutivos';

interface ComunicacionesEditorProps {
  consecutivoBase: string;
  tieneDocumentoPdf: boolean;
  onEjecutarDescargaPdf: () => void;
  onRestablecerMensaje: () => void;
  onCopiarMensaje: () => void;
  onInsertarToken: (token: string) => void;
}

export const ComunicacionesEditor: React.FC<ComunicacionesEditorProps> = ({
  consecutivoBase,
  tieneDocumentoPdf,
  onEjecutarDescargaPdf,
  onRestablecerMensaje,
  onCopiarMensaje,
  onInsertarToken,
}) => {
  const {
    destinatarioNombre,
    setDestinatarioNombre,
    telefonoInput,
    setTelefonoInput,
    mensajeTexto,
    setMensajeTexto,
    descargarPdf,
    setDescargarPdf,
    copiado,
    tipoSeleccionado,
    subTipoAccion,
  } = useComunicacionesStore();

  const tokens = [
    'cliente',
    'finca',
    'consecutivo',
    'fechas',
    'noches',
    'personas',
    'saldo_finca',
    'saldo_alimentacion',
    'total',
    'cuenta_dueno',
    'cuenta_admin',
  ];

  const prefijoDoc = (subTipoAccion === 'cobrar_alimentacion' ? 'menu' : tipoSeleccionado) as TipoDocumentoPrefijo;

  return (
    <div className="flex flex-col gap-3.5">
      {/* Datos del Destinatario y Celular */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Destinatario / Huésped:
            </label>
            <input
              type="text"
              value={destinatarioNombre}
              onChange={(e) => setDestinatarioNombre(e.target.value)}
              placeholder="Nombre del cliente"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              WhatsApp (con indicativo país):
            </label>
            <input
              type="tel"
              value={telefonoInput}
              onChange={(e) => setTelefonoInput(e.target.value)}
              placeholder="573176827093"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Banner de PDF Oficial Adjunto */}
        {tieneDocumentoPdf && (
          <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
              <FileCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>
                Documento Oficial ({formatearConsecutivoConPrefijo(consecutivoBase, prefijoDoc)})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onEjecutarDescargaPdf}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Download size={12} className="text-emerald-600" />
                <span>Descargar ahora</span>
              </button>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={descargarPdf}
                  onChange={(e) => setDescargarPdf(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                <span>Descargar al enviar</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Editor del Mensaje */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Edit3 size={14} className="text-emerald-600" />
            <span>Contenido del mensaje (editable):</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRestablecerMensaje}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-all"
              title="Regenerar texto desde la plantilla oficial"
            >
              <RotateCcw size={11} />
              <span>Restablecer</span>
            </button>
            <button
              type="button"
              onClick={onCopiarMensaje}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-all ${
                copiado
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
              }`}
            >
              {copiado ? <Check size={11} /> : <Copy size={11} />}
              <span>{copiado ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        <textarea
          rows={12}
          value={mensajeTexto}
          onChange={(e) => setMensajeTexto(e.target.value)}
          placeholder="El mensaje redactado aparecerá aquí…"
          className="w-full p-3.5 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-sans leading-relaxed text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-y min-h-[220px]"
        />

        {/* Tokens / Variables Dinámicas de 1 Clic */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
            <Sparkles size={11} className="text-amber-500" />
            <span>Insertar variables dinámicas con 1 clic:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tokens.map((tk) => (
              <button
                key={tk}
                type="button"
                onClick={() => onInsertarToken(tk)}
                className="px-2 py-1 rounded-lg text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                + {`{{${tk}}}`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
