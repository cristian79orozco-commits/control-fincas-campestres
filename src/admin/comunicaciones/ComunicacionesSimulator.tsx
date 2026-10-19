import React from 'react';
import { Eye, Send, CheckCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useComunicacionesStore } from '../../store/useComunicacionesStore';

interface ComunicacionesSimulatorProps {
  onEnviarWhatsApp: () => void;
}

export const ComunicacionesSimulator: React.FC<ComunicacionesSimulatorProps> = ({
  onEnviarWhatsApp,
}) => {
  const {
    destinatarioNombre,
    telefonoInput,
    mensajeTexto,
    procesando,
  } = useComunicacionesStore();

  const iniciales = (destinatarioNombre || 'PT')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const horaActual = new Date().toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
        <Eye size={14} />
        <span>Simulador en Tiempo Real (Vista del Huésped en WhatsApp):</span>
      </div>

      {/* Frame de WhatsApp */}
      <div className="rounded-2xl border border-slate-300 dark:border-slate-800 overflow-hidden shadow-lg bg-[#efeae2] dark:bg-slate-950 flex flex-col min-h-[460px]">
        {/* Cabecera WhatsApp */}
        <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-[#128c7e] text-white flex items-center justify-center font-bold text-xs shadow-inner flex-shrink-0">
            {iniciales || 'PT'}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs truncate">
              {destinatarioNombre || 'Cliente Paraíso Terrenal'}
            </h4>
            <span className="text-[10px] text-white/80 block truncate">
              {telefonoInput ? `+${telefonoInput}` : 'En línea'}
            </span>
          </div>
        </div>

        {/* Área del Chat con Textura y Burbuja */}
        <div
          className="flex-1 p-4 flex flex-col justify-start overflow-y-auto"
          style={{
            backgroundImage:
              'radial-gradient(rgba(0,0,0,0.06) 1px, transparent 0)',
            backgroundSize: '16px 16px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="self-start max-w-[94%] bg-white dark:bg-slate-900 rounded-xl rounded-tl-none p-3.5 shadow-md border border-black/5 dark:border-white/5 text-slate-900 dark:text-slate-100 text-xs sm:text-sm leading-relaxed"
          >
            <div className="whitespace-pre-wrap font-sans break-words">
              {mensajeTexto || (
                <span className="text-slate-400 italic">
                  El mensaje redactado aparecerá aquí en tiempo real…
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
              <span>{horaActual}</span>
              <CheckCheck size={13} className="text-[#53bdeb]" />
            </div>
          </motion.div>
        </div>

        {/* Botón Principal de Envío */}
        <div className="p-3 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onEnviarWhatsApp}
            disabled={procesando || !telefonoInput.trim()}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md transition-all ${
              procesando || !telefonoInput.trim()
                ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-70'
                : 'bg-[#25d366] hover:bg-[#20ba5a] shadow-emerald-500/20 cursor-pointer'
            }`}
          >
            {procesando ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Procesando y abriendo WhatsApp…</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Abrir chat de WhatsApp Oficial</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};
