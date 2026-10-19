import React from 'react';
import { Home, Utensils, Copy, Check, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCOP } from '../../services/whatsapp';
import type { Finca, ConfiguracionGeneral } from '../../types';

interface ComunicacionesBalanceDobleProps {
  finanzasDoble: {
    esReserva: boolean;
    subtotalFinca: number;
    pagadoFinca: number;
    saldoFincaCheckIn: number;
    anticipoFinca50?: number;
    costoAlimentacion: number;
    pagadoAlimentacion: number;
    saldoAlimentacionAdmin: number;
    totalConsolidado: number;
    totalRecaudado: number;
    saldoConsolidado: number;
  } | null;
  fincaActual: Finca | any | null;
  configuracion?: ConfiguracionGeneral;
  copiadoBancoDueno: boolean;
  copiadoBancoAdmin: boolean;
  onCopiarCuentaDueno: () => void;
  onCopiarCuentaAdmin: () => void;
}

export const ComunicacionesBalanceDoble: React.FC<ComunicacionesBalanceDobleProps> = ({
  finanzasDoble,
  fincaActual,
  configuracion,
  copiadoBancoDueno,
  copiadoBancoAdmin,
  onCopiarCuentaDueno,
  onCopiarCuentaAdmin,
}) => {
  if (!finanzasDoble) {
    return (
      <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <Info size={14} className="text-emerald-500" />
        <span>
          💡 Selecciona una Cotización o Reserva arriba para ver el desglose financiero transparente y cuentas bancarias.
        </span>
      </div>
    );
  }

  const fObj: any = fincaActual;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* TARJETA 1: ALOJAMIENTO · PROPIETARIO DE LA FINCA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl border border-emerald-500/25 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50/60 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm flex flex-col justify-between gap-3"
      >
        <div className="flex flex-col gap-2">
          {/* Header Tarjeta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs tracking-wide">
              <div className="w-6 h-6 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
                <Home size={14} />
              </div>
              <span>1. ALOJAMIENTO · PROPIETARIO</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border border-emerald-600/20">
              Paga al Dueño
            </span>
          </div>

          {/* Cifras */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <span className="text-slate-500 dark:text-slate-400">Valor Finca:</span>
            <strong className="text-slate-800 dark:text-slate-100 font-bold">
              {formatCOP(finanzasDoble.subtotalFinca)}
            </strong>
          </div>

          {finanzasDoble.esReserva ? (
            <>
              <div className="flex items-center justify-between text-xs py-0.5">
                <span className="text-slate-500 dark:text-slate-400">Abonado al Propietario:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {formatCOP(finanzasDoble.pagadoFinca)}
                </span>
              </div>
              <div
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold border ${
                  finanzasDoble.saldoFincaCheckIn > 0
                    ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/40'
                    : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
                }`}
              >
                <span>Saldo Check-in (al Dueño):</span>
                <span>{formatCOP(finanzasDoble.saldoFincaCheckIn)}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold">
              <span>Anticipo Requerido (50% Finca):</span>
              <span>{formatCOP(finanzasDoble.anticipoFinca50 || 0)}</span>
            </div>
          )}
        </div>

        {/* Datos Bancarios del Dueño */}
        <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
          <div className="truncate text-slate-600 dark:text-slate-400 text-[11px]">
            <span className="text-slate-400">Cuenta Dueño: </span>
            <strong className="text-slate-800 dark:text-slate-200">
              {fObj?.banco_cuenta
                ? `${fObj?.banco_nombre || 'Bancolombia'} (${fObj.banco_cuenta})`
                : 'Sin cuenta registrada'}
            </strong>
          </div>
          <button
            type="button"
            onClick={onCopiarCuentaDueno}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-all flex-shrink-0 ${
              copiadoBancoDueno
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
            }`}
          >
            {copiadoBancoDueno ? <Check size={11} /> : <Copy size={11} />}
            <span>{copiadoBancoDueno ? 'Copiada' : 'Copiar'}</span>
          </button>
        </div>
      </motion.div>

      {/* TARJETA 2: ALIMENTACIÓN · ADMINISTRACIÓN PARAÍSO TERRENAL */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="p-4 rounded-2xl border border-orange-500/25 dark:border-orange-500/20 bg-gradient-to-br from-orange-50/60 via-white to-white dark:from-orange-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm flex flex-col justify-between gap-3"
      >
        <div className="flex flex-col gap-2">
          {/* Header Tarjeta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-300 font-bold text-xs tracking-wide">
              <div className="w-6 h-6 rounded-lg bg-orange-600/10 text-orange-600 flex items-center justify-center">
                <Utensils size={14} />
              </div>
              <span>2. ALIMENTACIÓN · PARAÍSO TERRENAL</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-600/10 text-orange-700 dark:text-orange-300 border border-orange-600/20">
              Paga a Paraíso
            </span>
          </div>

          {/* Cifras */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <span className="text-slate-500 dark:text-slate-400">Valor Total Menú:</span>
            <strong className="text-slate-800 dark:text-slate-100 font-bold">
              {formatCOP(finanzasDoble.costoAlimentacion)}
            </strong>
          </div>

          {finanzasDoble.esReserva ? (
            <>
              <div className="flex items-center justify-between text-xs py-0.5">
                <span className="text-slate-500 dark:text-slate-400">Abonado a Paraíso:</span>
                <span className="text-orange-600 dark:text-orange-400 font-semibold">
                  {formatCOP(finanzasDoble.pagadoAlimentacion)}
                </span>
              </div>
              <div
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold border ${
                  finanzasDoble.saldoAlimentacionAdmin > 0
                    ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
                    : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
                }`}
              >
                <span>Saldo Menú (a Paraíso Terrenal):</span>
                <span>{formatCOP(finanzasDoble.saldoAlimentacionAdmin)}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-500/10 text-orange-800 dark:text-orange-300 border border-orange-500/20 text-xs font-bold">
              <span>Cobro de Menú (Paraíso):</span>
              <span>{formatCOP(finanzasDoble.costoAlimentacion)}</span>
            </div>
          )}
        </div>

        {/* Datos Bancarios de Paraíso Terrenal */}
        <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
          <div className="truncate text-slate-600 dark:text-slate-400 text-[11px]">
            <span className="text-slate-400">Cuenta Paraíso: </span>
            <strong className="text-slate-800 dark:text-slate-200">
              {configuracion?.banco_cuenta
                ? `${configuracion.banco_nombre || 'Bancolombia'} (${configuracion.banco_cuenta})`
                : 'Por definir'}
            </strong>
          </div>
          <button
            type="button"
            onClick={onCopiarCuentaAdmin}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-all flex-shrink-0 ${
              copiadoBancoAdmin
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-400'
            }`}
          >
            {copiadoBancoAdmin ? <Check size={11} /> : <Copy size={11} />}
            <span>{copiadoBancoAdmin ? 'Copiada' : 'Copiar'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
