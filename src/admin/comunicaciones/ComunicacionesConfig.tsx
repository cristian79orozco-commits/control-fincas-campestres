import React, { useState, useEffect } from 'react';
import {
  Settings,
  CheckCircle,
  Phone,
  ShieldCheck,
  Scale,
  Hash,
  Laptop,
  Globe,
  Info,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useComunicacionesStore } from '../../store/useComunicacionesStore';

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
  const { metodoWhatsApp, setMetodoWhatsApp } = useComunicacionesStore();

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

      {/* Modo de Apertura Predeterminado: WhatsApp Desktop PC vs Web */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Laptop size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Canal Predeterminado de Envío de WhatsApp
            </h3>
            <span className="text-xs text-slate-400">
              Define si los mensajes se abren directamente en la app de escritorio de tu PC o en el navegador
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Opción Desktop PC */}
          <div
            onClick={() => {
              setMetodoWhatsApp('desktop');
              showToast('Canal configurado: WhatsApp Desktop (App de PC) 💻', 'success');
            }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${
              metodoWhatsApp === 'desktop'
                ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm ring-1 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                <Laptop size={16} className="text-emerald-600" />
                <span>App de PC (WhatsApp Web / PWA)</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                Recomendado
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Abre directamente el chat en la aplicación de WhatsApp instalada en tu PC (descargada del navegador / Chrome PWA). <strong>Sin páginas intermedias ni pantallas de confirmación</strong>, perfecto para trabajar con ambas ventanas en pantalla dividida.
            </p>
          </div>

          {/* Opción WhatsApp Web */}
          <div
            onClick={() => {
              setMetodoWhatsApp('web');
              showToast('Canal configurado: WhatsApp Web (Navegador) 🌐', 'info');
            }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${
              metodoWhatsApp === 'web'
                ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm ring-1 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                <Globe size={16} className="text-blue-600" />
                <span>WhatsApp Web (Nueva Pestaña)</span>
              </div>
              <span className="text-[10px] font-medium text-slate-400">
                Navegador
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Abre una pestaña nueva e independiente en el navegador dirigida a WhatsApp Web con el mensaje pre-cargado listo para enviar.
            </p>
          </div>
        </div>

        {/* Guía para nuevo computador */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <Info size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <strong className="text-slate-800 dark:text-slate-200 block">
              ¿Cómo funciona la conexión con la app de WhatsApp de tu PC?
            </strong>
            <p className="leading-relaxed">
              1. <strong>App instalada desde el navegador (PWA):</strong> Si instalaste WhatsApp desde Chrome o Edge (icono de instalar en la barra superior), el canal <strong>App de PC</strong> envía el enlace directo a tu ventana de WhatsApp con el número del cliente y el mensaje listo.
            </p>
            <p className="leading-relaxed">
              2. <strong>Multitarea fluida:</strong> Puedes tener la web de Paraíso Terrenal en la mitad izquierda de tu pantalla y WhatsApp en la mitad derecha. Cada envío actualizará el chat sin salir ni recargar el sistema.
            </p>
          </div>
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
