import React from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Send,
  BarChart3,
  BookOpen,
  Clock,
  Settings,
  Phone,
} from 'lucide-react';
import {
  TabComunicaciones,
  useComunicacionesStore,
} from '../../store/useComunicacionesStore';

interface ComunicacionesHeaderProps {
  currentWaNumber: string;
  totalComunicaciones: number;
}

export const ComunicacionesHeader: React.FC<ComunicacionesHeaderProps> = ({
  currentWaNumber,
  totalComunicaciones,
}) => {
  const { tabActiva, setTabActiva } = useComunicacionesStore();

  const tabs: Array<{ id: TabComunicaciones; label: string; icon: React.ReactNode }> = [
    { id: 'envio', label: 'Centro de Envíos', icon: <Send size={14} /> },
    { id: 'analytics', label: 'Analítica Visual', icon: <BarChart3 size={14} /> },
    { id: 'plantillas', label: 'Editor de Plantillas', icon: <BookOpen size={14} /> },
    { id: 'historial', label: `Historial (${totalComunicaciones})`, icon: <Clock size={14} /> },
    { id: 'config', label: 'Configuración', icon: <Settings size={14} /> },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
      {/* Título y Descripción con Tipografía Profesional */}
      <div>
        <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center font-bold shadow-inner">
            <MessageCircle size={20} />
          </div>
          <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Centro Inteligente de Comunicaciones & WhatsApp
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Gestión centralizada con Cotizaciones y Reservas · Doble balance financiero transparente: Finca (Propietario) vs Menús (Paraíso Terrenal).
        </p>
      </div>

      {/* Navegación por pestañas con Framer Motion */}
      <div className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl backdrop-blur-sm self-start md:self-auto overflow-x-auto max-w-full">
        {tabs.map((tab) => {
          const esActiva = tabActiva === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 z-10 whitespace-nowrap ${
                esActiva
                  ? 'text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {esActiva && (
                <motion.div
                  layoutId="activeTabIndicatorComunicaciones"
                  className="absolute inset-0 bg-emerald-600 dark:bg-emerald-500 rounded-lg shadow-sm -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
