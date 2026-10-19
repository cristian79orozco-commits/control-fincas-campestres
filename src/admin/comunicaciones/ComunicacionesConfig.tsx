import React, { useState, useEffect } from 'react';
import {
  Settings,
  CheckCircle,
  Phone,
  ShieldCheck,
  Scale,
  Hash,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ComunicacionesConfigProps {
  currentWaNumber: string;
  onSaveWaNumber: (num: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ComunicacionesConfig: React.FC<ComunicacionesConfigProps> = ({
  currentWaNumber,
  onSaveWaNumber,
  showToast,
}) => {
  const [waInput, setWaInput] = useState(currentWaNumber);

  useEffect(() => {
    setWaInput(currentWaNumber);
  }, [currentWaNumber]);

  const handleGuardar = () => {
    const cleanNum = waInput.replace(/[^0-9]/g, '');
    if (cleanNum.length < 10) {
      showToast('Número inválido. Usa formato internacional (ej: 573176827093)', 'error');
      return;
    }
    onSaveWaNumber(cleanNum);
    showToast('Número de WhatsApp corporativo actualizado con éxito ✅', 'success');
  };

  return (
    <div className="max-w-3xl flex flex-col gap-5">
      {/* Formulario Número Corporativo */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Phone size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Línea Oficial de WhatsApp Corporativo
            </h3>
            <span className="text-xs text-slate-400">
              Número predeterminado de la empresa para atención al cliente y botón flotante
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-2">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Número con indicativo país (sin signos ni espacios):
            </label>
            <input
              type="tel"
              placeholder="573176827093"
              value={waInput}
              onChange={(e) => setWaInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleGuardar}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
          >
            Guardar número
          </motion.button>
        </div>

        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
          <CheckCircle size={14} />
          <span>Línea corporativa activa: +{currentWaNumber}</span>
        </div>
      </div>

      {/* Reglas de Negocio del Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Regla 1: Doble Balance */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
            <Scale size={16} />
            <span>Reglas del Doble Balance Financiero</span>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 mt-1 leading-relaxed">
            <li>
              <strong>Finca / Alojamiento:</strong> El abono de separación (50%) y el saldo en el check-in se transfieren o pagan directamente a la cuenta del <em>Propietario de la finca</em>.
            </li>
            <li>
              <strong>Alimentación / Menús:</strong> El valor de los menús se liquida en la cuenta de la <em>Administración de Paraíso Terrenal</em> para compras de insumos, chefs y logística culinaria.
            </li>
          </ul>
        </div>

        {/* Regla 2: Consecutivos y Seguridad */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-xs">
            <Hash size={16} />
            <span>Consecutivo Único & Trazabilidad</span>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 mt-1 leading-relaxed">
            <li>
              Se conserva el mismo número de expediente (ej: <code>#1001</code>) adaptando el prefijo del documento emitido: <code>COT-1001</code>, <code>SEP-1001</code>, <code>ABO-1001</code>, <code>SAL-1001</code>, <code>PAZ-1001</code>.
            </li>
            <li>
              Cada mensaje enviado abre la API oficial de WhatsApp y deja una copia inmutable registrada en el historial de auditoría de Supabase.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
