import React, { useEffect, useMemo } from 'react';
import {
  BookOpen,
  Save,
  RotateCcw,
  Sparkles,
  Eye,
  Info,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  PLANTILLAS_PREDETERMINADAS,
  renderizarPlantillaPersonalizada,
  obtenerTokensParaMensaje,
} from '../../services/whatsapp';
import type {
  ConfiguracionGeneral,
  CotizacionDB,
  Reserva,
  Cliente,
  Finca,
  TipoComunicacion,
} from '../../types';
import { useComunicacionesStore } from '../../store/useComunicacionesStore';

interface ComunicacionesPlantillasAdminProps {
  configuracion?: ConfiguracionGeneral;
  onGuardarConfiguracion?: (
    datos: Partial<ConfiguracionGeneral>
  ) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  cotizacionEfectiva: CotizacionDB | null;
  reservaEfectiva: Reserva | null;
  clienteActual: Cliente | any | null;
  fincaActual: Finca | any | null;
  consecutivoBase: string;
}

export const ComunicacionesPlantillasAdmin: React.FC<ComunicacionesPlantillasAdminProps> = ({
  configuracion,
  onGuardarConfiguracion,
  showToast,
  cotizacionEfectiva,
  reservaEfectiva,
  clienteActual,
  fincaActual,
  consecutivoBase,
}) => {
  const {
    plantillaSeleccionada,
    setPlantillaSeleccionada,
    textoEditorPlantilla,
    setTextoEditorPlantilla,
    guardandoPlantilla,
    setGuardandoPlantilla,
  } = useComunicacionesStore();

  useEffect(() => {
    const custom = configuracion?.plantillas_comunicacion?.[plantillaSeleccionada];
    setTextoEditorPlantilla(
      custom || PLANTILLAS_PREDETERMINADAS[plantillaSeleccionada] || ''
    );
  }, [plantillaSeleccionada, configuracion]);

  // Renderizado en vivo de la plantilla con tokens del expediente activo
  const previewPlantilla = useMemo(() => {
    try {
      const tokens = obtenerTokensParaMensaje({
        tipo: plantillaSeleccionada as TipoComunicacion,
        cotizacion: cotizacionEfectiva || undefined,
        reserva: reservaEfectiva || undefined,
        cliente: clienteActual,
        finca: fincaActual,
        consecutivoBase,
        configuracion,
      });
      return renderizarPlantillaPersonalizada(textoEditorPlantilla, tokens);
    } catch {
      return textoEditorPlantilla;
    }
  }, [
    textoEditorPlantilla,
    plantillaSeleccionada,
    cotizacionEfectiva,
    reservaEfectiva,
    clienteActual,
    fincaActual,
    consecutivoBase,
    configuracion,
  ]);

  const handleGuardarPlantilla = async () => {
    if (!onGuardarConfiguracion) {
      showToast('No se dispone de permisos para guardar la configuración', 'error');
      return;
    }
    setGuardandoPlantilla(true);
    const plantillasActuales = {
      ...(configuracion?.plantillas_comunicacion || {}),
    };
    plantillasActuales[plantillaSeleccionada] = textoEditorPlantilla;

    const res = await onGuardarConfiguracion({
      plantillas_comunicacion: plantillasActuales,
    });
    setGuardandoPlantilla(false);

    if (res.success) {
      showToast(
        `Plantilla de ${plantillaSeleccionada} guardada en Supabase con éxito ✅`,
        'success'
      );
    } else {
      showToast(`Error al guardar plantilla: ${res.error}`, 'error');
    }
  };

  const handleRestablecerPlantilla = async () => {
    if (!onGuardarConfiguracion) return;
    const def = PLANTILLAS_PREDETERMINADAS[plantillaSeleccionada] || '';
    setTextoEditorPlantilla(def);

    const plantillasActuales = {
      ...(configuracion?.plantillas_comunicacion || {}),
    };
    delete plantillasActuales[plantillaSeleccionada];

    setGuardandoPlantilla(true);
    const res = await onGuardarConfiguracion({
      plantillas_comunicacion: plantillasActuales,
    });
    setGuardandoPlantilla(false);

    if (res.success) {
      showToast(
        `Plantilla de ${plantillaSeleccionada} restablecida a la predeterminada 🔄`,
        'info'
      );
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  };

  const listaPlantillas = [
    { id: 'cotizacion', label: '📄 Cotización Oficial' },
    { id: 'separacion', label: '🎉 Documento de Separación' },
    { id: 'abono', label: '💳 Comprobante de Abono / Pago' },
    { id: 'estado_cuenta', label: '📊 Estado de Cuenta (Doble Balance)' },
    { id: 'paz_salvo', label: '🏅 Certificado de Paz y Salvo' },
    { id: 'menu', label: '🍽️ Propuesta de Menú / Alimentación' },
    { id: 'recordatorio_pago', label: '⏰ Recordatorio Amistoso de Saldo' },
    { id: 'bienvenida', label: '👋 Bienvenida e Instrucciones de Llegada' },
  ];

  const variablesDisponibles = [
    'cliente',
    'finca',
    'consecutivo',
    'fechas',
    'noches',
    'personas',
    'subtotal_alojamiento',
    'costo_alimentacion',
    'total',
    'saldo_finca',
    'saldo_alimentacion',
    'saldo_total',
    'banco_dueno',
    'banco_admin',
    'contacto_anfitrion',
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera del Editor */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <BookOpen size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Personalizar Plantilla Oficial en Supabase
            </h3>
            <span className="text-xs text-slate-400">
              Las modificaciones se almacenarán en la nube para todo el equipo administrativo
            </span>
          </div>
        </div>

        <select
          value={plantillaSeleccionada}
          onChange={(e) => setPlantillaSeleccionada(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        >
          {listaPlantillas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Editor y Vista Previa en 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Columna Izquierda: Editor de Código / Texto */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Estructura de la Plantilla:
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              Sintaxis: <code>{'{{variable}}'}</code>
            </span>
          </div>

          <textarea
            rows={14}
            value={textoEditorPlantilla}
            onChange={(e) => setTextoEditorPlantilla(e.target.value)}
            className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[300px]"
          />

          {/* Variables / Tokens para Inserción Rápida */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles size={11} className="text-amber-500" />
              <span>Variables soportadas:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {variablesDisponibles.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() =>
                    setTextoEditorPlantilla((prev: string) => `${prev} {{${v}}}`)
                  }
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-600 dark:text-slate-400 transition-colors"
                >
                  + {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleRestablecerPlantilla}
              disabled={guardandoPlantilla}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-1.5 transition-all"
            >
              <RotateCcw size={12} />
              <span>Restablecer predeterminado</span>
            </button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleGuardarPlantilla}
              disabled={guardandoPlantilla}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-sm transition-all"
            >
              {guardandoPlantilla ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Guardando en Supabase…</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Guardar en Supabase</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Columna Derecha: Vista Previa Renderizada en Tiempo Real */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Eye size={14} />
              <span>Resultado Renderizado (con datos activos):</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Expediente #{consecutivoBase}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans min-h-[300px]">
            {previewPlantilla}
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-[11px] text-slate-500 flex items-center gap-2">
            <Info size={14} className="text-slate-400 flex-shrink-0" />
            <span>
              Cualquier etiqueta que no encuentre datos en el expediente se omitirá de forma limpia y segura.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
