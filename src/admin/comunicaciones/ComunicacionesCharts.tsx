import React from 'react';
import {
  Chart as ChartJS,
  registerables,
  ChartOptions,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import {
  PieChart as PieIcon,
  TrendingUp,
  MessageCircle,
  ShieldCheck,
  Home,
  Utensils,
  CheckCircle,
  FileText,
} from 'lucide-react';
import type { Comunicacion } from '../../types';
import { useComunicacionesStore } from '../../store/useComunicacionesStore';

// Registro global seguro de Chart.js
ChartJS.register(...registerables);

interface ComunicacionesChartsProps {
  comunicaciones: Comunicacion[];
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
  expedienteConsecutivo: string;
}

function formatCOP(v: number): string {
  const num = typeof v === 'number' && !isNaN(v) ? v : 0;
  return '$' + Math.round(num).toLocaleString('es-CO');
}

export const ComunicacionesCharts: React.FC<ComunicacionesChartsProps> = ({
  comunicaciones,
  finanzasDoble,
  expedienteConsecutivo,
}) => {
  const { obtenerEstadisticasHistorial } = useComunicacionesStore();
  const stats = obtenerEstadisticasHistorial(comunicaciones);

  // 1. Datos para la Gráfica de Distribución de Tipos de Comunicaciones (Doughnut)
  const tiposLabels = [
    'Cotización',
    'Separación',
    'Abono',
    'Estado de Cuenta',
    'Paz y Salvo',
    'Menú / Propuesta',
    'Recordatorio',
    'Bienvenida',
    'Otros'
  ];

  const tiposDataMap: Record<string, number> = {
    cotizacion: stats.porTipo['cotizacion'] || 0,
    separacion: stats.porTipo['separacion'] || 0,
    abono: stats.porTipo['abono'] || 0,
    estado_cuenta: stats.porTipo['estado_cuenta'] || 0,
    paz_salvo: stats.porTipo['paz_salvo'] || 0,
    menu: stats.porTipo['menu'] || 0,
    recordatorio_pago: stats.porTipo['recordatorio_pago'] || 0,
    bienvenida: stats.porTipo['bienvenida'] || 0,
    personalizado: (stats.porTipo['personalizado'] || 0) + (stats.porTipo['general'] || 0),
  };

  const dataDistribucion = {
    labels: tiposLabels,
    datasets: [
      {
        data: [
          tiposDataMap.cotizacion,
          tiposDataMap.separacion,
          tiposDataMap.abono,
          tiposDataMap.estado_cuenta,
          tiposDataMap.paz_salvo,
          tiposDataMap.menu,
          tiposDataMap.recordatorio_pago,
          tiposDataMap.bienvenida,
          tiposDataMap.personalizado,
        ],
        backgroundColor: [
          '#16a34a', // Verde Esmeralda (Cotización)
          '#0d9488', // Teal (Separación)
          '#0284c7', // Azul Cielo (Abono)
          '#f59e0b', // Ámbar (Estado de Cuenta)
          '#8b5cf6', // Púrpura (Paz y Salvo)
          '#ea580c', // Naranja Quemado (Menús)
          '#ef4444', // Rojo Coral (Recordatorio)
          '#10b981', // Menta (Bienvenida)
          '#64748b', // Pizarra (Otros)
        ],
        borderWidth: 2,
        borderColor: 'var(--surface)',
      },
    ],
  };

  const optionsDoughnut: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'var(--text)',
          boxWidth: 12,
          font: {
            family: "'Plus Jakarta Sans', 'Inter', sans-serif",
            size: 11,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
        bodyFont: { family: "'Inter', sans-serif", size: 11 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    cutout: '70%',
  };

  // 2. Gráfico de Comparación del Doble Balance Financiero Activo (Barra Horizontal)
  const dataDobleBalance = {
    labels: ['Finca (Dueño)', 'Alimentación (Paraíso)'],
    datasets: [
      {
        label: 'Abonado / Pagado ($)',
        data: [
          finanzasDoble ? finanzasDoble.pagadoFinca : 0,
          finanzasDoble ? finanzasDoble.pagadoAlimentacion : 0,
        ],
        backgroundColor: '#16a34a',
        borderRadius: 6,
      },
      {
        label: 'Saldo Pendiente ($)',
        data: [
          finanzasDoble ? finanzasDoble.saldoFincaCheckIn : 0,
          finanzasDoble ? finanzasDoble.saldoAlimentacionAdmin : 0,
        ],
        backgroundColor: '#ea580c',
        borderRadius: 6,
      },
    ],
  };

  const optionsBarraBalance: ChartOptions<'bar'> = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'var(--text)',
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
          boxWidth: 12,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const raw = context.raw as number;
            return ` ${context.dataset.label}: ${formatCOP(raw)}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: {
          color: 'var(--text-muted)',
          font: { family: "'Inter', sans-serif", size: 10 },
          callback: (value) => '$' + Number(value).toLocaleString('es-CO'),
        },
        grid: { color: 'rgba(200, 200, 200, 0.12)' },
      },
      y: {
        stacked: true,
        ticks: {
          color: 'var(--text)',
          font: { family: "'Plus Jakarta Sans', sans-serif", weight: 600, size: 11 },
        },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Envíos WhatsApp
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
              {stats.total}
            </span>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
              <CheckCircle size={12} /> Registro en auditoría activo
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg">
            <MessageCircle size={24} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Cotizaciones Emitidas
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
              {tiposDataMap.cotizacion}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Fase 1: Prospección oficial
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-lg">
            <FileText size={24} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Abonos y Separaciones
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
              {tiposDataMap.separacion + tiposDataMap.abono}
            </span>
            <span className="text-xs text-teal-600 font-medium">
              Fase 2: Bloqueo de fechas
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-lg">
            <ShieldCheck size={24} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Saldos & Paz y Salvo
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
              {tiposDataMap.estado_cuenta + tiposDataMap.paz_salvo}
            </span>
            <span className="text-xs text-amber-600 font-medium">
              Fase 3: Doble balance
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-lg">
            <TrendingUp size={24} />
          </div>
        </motion.div>
      </div>

      {/* Grid de Gráficas de Análisis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Gráfico 1: Proporción por Tipo de Comunicación */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieIcon size={18} className="text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Distribución de Mensajes por Etapa Comercial
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Historial Total
            </span>
          </div>

          <div style={{ height: '240px' }} className="relative">
            {stats.total > 0 ? (
              <Doughnut data={dataDistribucion} options={optionsDoughnut} />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No hay comunicaciones registradas aún para graficar.
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Doble Balance Financiero Visual en Vivo */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-amber-600" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Radiografía del Doble Balance: Expediente #{expedienteConsecutivo}
              </h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold">
              En Vivo
            </span>
          </div>

          <div style={{ height: '200px' }} className="relative">
            {finanzasDoble ? (
              <Bar data={dataDobleBalance} options={optionsBarraBalance} />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Selecciona un expediente para comparar saldos en tiempo real.
              </div>
            )}
          </div>

          {finanzasDoble && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 flex-shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">
                  Total Dueño: <strong>{formatCOP(finanzasDoble.subtotalFinca)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 flex-shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">
                  Total Menú: <strong>{formatCOP(finanzasDoble.costoAlimentacion)}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabla Resumen de Huéspedes Frecuentes con Lodash */}
      {stats.destinatariosFrecuentes.length > 0 && (
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
            Huéspedes con Mayor Interacción en WhatsApp
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {stats.destinatariosFrecuentes.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex flex-col justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                    {item.destinatario || 'Huésped'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    +{item.telefono}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Contactos:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {item.total} envíos
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
