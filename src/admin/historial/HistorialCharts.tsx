import React from 'react';
import {
  Chart as ChartJS,
  registerables,
  ChartOptions
} from 'chart.js';
import { Chart, Bar, Doughnut } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Building2, CheckCircle2, Layers } from 'lucide-react';
import type {
  SerieHistorialTiempo,
  FincaHistorialItem,
  EstadosCierreData
} from '../../utils/historialMetrics';
import type { HistorialChartTab } from '../../store/useAdminHistorialStore';

// Registro global seguro de Chart.js
ChartJS.register(...registerables);

interface HistorialChartsProps {
  serieTiempo: SerieHistorialTiempo;
  distribucionFincas: FincaHistorialItem[];
  estadosCierre: EstadosCierreData;
  tabActiva: HistorialChartTab;
  onCambiarTab: (tab: HistorialChartTab) => void;
}

function formatCOP(v: number): string {
  const num = typeof v === 'number' && !isNaN(v) ? v : 0;
  return '$' + Math.round(num).toLocaleString('es-CO');
}

export const HistorialCharts: React.FC<HistorialChartsProps> = ({
  serieTiempo,
  distribucionFincas,
  estadosCierre,
  tabActiva,
  onCambiarTab,
}) => {
  // 1. Gráfico de Evolución Temporal (Ingresos + Operaciones)
  const dataEvolucion = {
    labels: serieTiempo?.labels || [],
    datasets: [
      {
        type: 'bar' as const,
        label: 'Recaudado ($ COP)',
        data: serieTiempo?.ingresos || [],
        backgroundColor: 'rgba(26, 107, 94, 0.85)',
        hoverBackgroundColor: '#1a6b5e',
        borderRadius: 6,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: 'Reservas Atendidas',
        data: serieTiempo?.operaciones || [],
        borderColor: '#c47a28',
        backgroundColor: 'rgba(196, 122, 40, 0.1)',
        borderWidth: 2.5,
        pointBackgroundColor: '#c47a28',
        pointRadius: 4,
        tension: 0.35,
        yAxisID: 'y1',
      },
    ],
  };

  const optionsEvolucion: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 14,
          font: { family: 'Plus Jakarta Sans, Inter, sans-serif', size: 11 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(24, 23, 20, 0.94)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            if (ctx.datasetIndex === 0) {
              return ` ${ctx.dataset.label}: ${formatCOP(ctx.parsed.y ?? 0)}`;
            }
            return ` ${ctx.dataset.label}: ${ctx.parsed.y} reservas`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans, sans-serif', size: 11 } },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        ticks: {
          callback: (value) => `$${(Number(value) / 1000000).toFixed(1)}M`,
          font: { family: 'Plus Jakarta Sans, sans-serif', size: 10 },
        },
        grid: { color: 'rgba(200, 190, 175, 0.25)' },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: {
          stepSize: 1,
          font: { family: 'Plus Jakarta Sans, sans-serif', size: 10 },
        },
      },
    },
  };

  // 2. Gráfico de Fincas (Horizontal Bar)
  const dataFincas = {
    labels: (distribucionFincas || []).map((f) => f.nombre),
    datasets: [
      {
        label: 'Recaudado Total',
        data: (distribucionFincas || []).map((f) => f.ingresos),
        backgroundColor: 'rgba(45, 122, 79, 0.85)',
        hoverBackgroundColor: '#2d7a4f',
        borderRadius: 6,
      },
    ],
  };

  const optionsFincas: ChartOptions<'bar'> = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const item = distribucionFincas[ctx.dataIndex];
            return ` Recaudado: ${formatCOP(ctx.parsed.x ?? 0)} · ${item?.operaciones || 0} reservas`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(200, 190, 175, 0.25)' },
        ticks: {
          callback: (v) => `$${(Number(v) / 1000000).toFixed(1)}M`,
          font: { family: 'Plus Jakarta Sans, sans-serif', size: 10 },
        },
      },
      y: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans, sans-serif', size: 11, weight: 'bold' } },
      },
    },
  };

  // 3. Gráfico de Estados de Cierre (Doughnut)
  const dataEstados = {
    labels: estadosCierre?.labels || [],
    datasets: [
      {
        data: estadosCierre?.data || [],
        backgroundColor: ['#16a34a', '#ef4444', '#f59e0b', '#3b82f6'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const optionsEstados: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          padding: 12,
          font: { family: 'Plus Jakarta Sans, Inter, sans-serif', size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = Number(ctx.raw) || 0;
            const pct = (estadosCierre?.porcentajes && estadosCierre.porcentajes[ctx.dataIndex]) || 0;
            return ` ${ctx.label}: ${val} (${pct}%)`;
          },
        },
      },
    },
    cutout: '64%',
  };

  const TABS: { id: HistorialChartTab; label: string; icon: React.ReactNode }[] = [
    { id: 'evolucion', label: 'Evolución de Ingresos', icon: <TrendingUp size={14} /> },
    { id: 'fincas', label: 'Rendimiento por Finca', icon: <Building2 size={14} /> },
    { id: 'estados', label: 'Índice de Cierres', icon: <CheckCircle2 size={14} /> },
  ];

  return (
    <div className="panel dashboard-glass-panel" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.15rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text)' }}>
            <Layers size={17} style={{ color: 'var(--primary)' }} />
            Análisis Estadístico del Archivo Histórico
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>
            Visualización gráfica de operaciones cerradas y acumuladas
          </div>
        </div>

        {/* Pestañas con micro-animaciones */}
        <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: '0.2rem', borderRadius: '12px', gap: '0.2rem' }}>
          {TABS.map((tab) => {
            const isActive = tabActiva === tab.id;
            return (
              <motion.button
                key={tab.id}
                type="button"
                className="btn btn-sm"
                onClick={() => onCambiarTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: isActive ? 'var(--surface)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: isActive ? 700 : 500,
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  border: 'none',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.78rem',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tabActiva === 'evolucion' && (
          <motion.div
            key="hist-tab-evolucion"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ height: '260px', position: 'relative' }}
          >
            <Chart type="bar" data={dataEvolucion as any} options={optionsEvolucion} />
          </motion.div>
        )}

        {tabActiva === 'fincas' && (
          <motion.div
            key="hist-tab-fincas"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {(distribucionFincas || []).length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay operaciones históricas suficientes para graficar el ranking.
              </div>
            ) : (
              <div style={{ height: '260px' }}>
                <Bar data={dataFincas} options={optionsFincas} />
              </div>
            )}
          </motion.div>
        )}

        {tabActiva === 'estados' && (
          <motion.div
            key="hist-tab-estados"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', alignItems: 'center' }}
          >
            <div style={{ height: '250px' }}>
              <Doughnut data={dataEstados} options={optionsEstados} />
            </div>

            <div style={{ background: 'var(--surface-2)', padding: '1.15rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text)' }}>
                Balance de Cumplimiento
              </div>
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-xs text-muted">Completadas con Éxito:</span>
                  <span className="font-dashboard tabular-nums" style={{ fontWeight: 700, color: '#16a34a' }}>
                    {(estadosCierre?.data && estadosCierre.data[0]) || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-xs text-muted">Tasa de Efectividad:</span>
                  <span className="dashboard-glow-badge font-dashboard tabular-nums" style={{ background: 'color-mix(in srgb, #16a34a 15%, transparent)', color: '#16a34a' }}>
                    {(estadosCierre?.porcentajes && estadosCierre.porcentajes[0]) || 0}% de éxito
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-xs text-muted">Canceladas o No-Show:</span>
                  <span className="font-dashboard tabular-nums" style={{ fontWeight: 700, color: '#dc2626' }}>
                    {((estadosCierre?.data && estadosCierre.data[1]) || 0) + ((estadosCierre?.data && estadosCierre.data[2]) || 0)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
