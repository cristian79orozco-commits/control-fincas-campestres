import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
  ChartOptions
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, PieChart as PieIcon, Building2, Target, Layers } from 'lucide-react';
import type { SerieMensualFinanzas, RendimientoFincaItem, EmbudoCotizacionesData } from '../../utils/dashboardMetrics';

// Registro completo de módulos de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface DashboardChartsProps {
  serieFinanzas: SerieMensualFinanzas;
  rendimientoFincas: RendimientoFincaItem[];
  embudoCotizaciones: EmbudoCotizacionesData;
  ingresosHospedaje: number;
  ingresosAlimentacion: number;
  saldoPendiente: number;
  tabActiva: 'finanzas' | 'ocupacion' | 'embudo';
  onCambiarTab: (tab: 'finanzas' | 'ocupacion' | 'embudo') => void;
}

function formatCOP(v: number): string {
  return '$' + Math.round(v || 0).toLocaleString('es-CO');
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  serieFinanzas,
  rendimientoFincas,
  embudoCotizaciones,
  ingresosHospedaje,
  ingresosAlimentacion,
  saldoPendiente,
  tabActiva,
  onCambiarTab,
}) => {
  // ---- 1. CONFIGURACIÓN DEL GRÁFICO FINANCIERO (BAR/LINE COMBO) ----
  const dataFinanzas = {
    labels: serieFinanzas.labels,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Alojamiento (Fincas)',
        data: serieFinanzas.alojamiento,
        backgroundColor: 'rgba(26, 107, 94, 0.78)',
        hoverBackgroundColor: 'rgba(26, 107, 94, 0.95)',
        borderRadius: 6,
        borderSkipped: false,
        yAxisID: 'y',
      },
      {
        type: 'bar' as const,
        label: 'Alimentación (Admin)',
        data: serieFinanzas.alimentacion,
        backgroundColor: 'rgba(196, 122, 40, 0.82)',
        hoverBackgroundColor: 'rgba(196, 122, 40, 1)',
        borderRadius: 6,
        borderSkipped: false,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: 'Saldo Pendiente por Cobrar',
        data: serieFinanzas.saldosPendientes,
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.08)',
        borderWidth: 2.5,
        pointBackgroundColor: '#dc2626',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true,
        yAxisID: 'y',
      },
    ],
  };

  const optionsFinanzas: ChartOptions<'bar' | 'line'> = {
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
          boxWidth: 14,
          padding: 16,
          font: { family: 'Plus Jakarta Sans, Inter, sans-serif', size: 12 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(24, 23, 20, 0.94)',
        titleFont: { family: 'Plus Jakarta Sans, sans-serif', size: 13, weight: 'bold' },
        bodyFont: { family: 'Plus Jakarta Sans, sans-serif', size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const val = context.parsed.y ?? 0;
            return ` ${context.dataset.label}: ${formatCOP(val)}`;
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
        beginAtZero: true,
        grid: { color: 'rgba(200, 190, 175, 0.25)' },
        ticks: {
          callback: (value) => {
            const num = Number(value);
            if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
            if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
            return `$${num}`;
          },
          font: { family: 'Plus Jakarta Sans, sans-serif', size: 11 },
        },
      },
    },
  };

  // ---- 2. DONUT DE DISTRIBUCIÓN DE NEGOCIO ----
  const dataDistribucion = {
    labels: ['Alojamiento (Propietarios)', 'Menús & Gastronomía (Admin)', 'Saldos Pendientes'],
    datasets: [
      {
        data: [ingresosHospedaje, ingresosAlimentacion, saldoPendiente],
        backgroundColor: [
          '#1a6b5e',
          '#c47a28',
          '#dc2626',
        ],
        hoverBackgroundColor: [
          '#13524a',
          '#a3621d',
          '#b91c1c',
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const optionsDistribucion: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 14,
          font: { family: 'Plus Jakarta Sans, Inter, sans-serif', size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val = Number(context.raw) || 0;
            const total = ingresosHospedaje + ingresosAlimentacion + saldoPendiente;
            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
            return ` ${context.label}: ${formatCOP(val)} (${pct}%)`;
          },
        },
      },
    },
    cutout: '68%',
  };

  // ---- 3. RANKING DE FINCAS (HORIZONTAL BAR) ----
  const topFincas = rendimientoFincas.slice(0, 6);
  const dataFincas = {
    labels: topFincas.map((f) => f.nombre),
    datasets: [
      {
        label: 'Ingresos Totales',
        data: topFincas.map((f) => f.totalIngresos),
        backgroundColor: 'rgba(26, 107, 94, 0.85)',
        hoverBackgroundColor: '#1a6b5e',
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
          label: (context) => {
            const val = Number(context.raw) || 0;
            const finca = topFincas[context.dataIndex];
            return ` Ingresos: ${formatCOP(val)} | ${finca?.reservasCount || 0} reservas (${finca?.nochesTotal || 0} noches)`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(200, 190, 175, 0.25)' },
        ticks: {
          callback: (value) => `$${(Number(value) / 1000000).toFixed(1)}M`,
          font: { family: 'Plus Jakarta Sans, sans-serif', size: 11 },
        },
      },
      y: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans, sans-serif', size: 11, weight: 'bold' } },
      },
    },
  };

  // ---- 4. EMBUDO DE COTIZACIONES ----
  const dataEmbudo = {
    labels: embudoCotizaciones.labels,
    datasets: [
      {
        data: embudoCotizaciones.data,
        backgroundColor: [
          '#94a3b8', // Borrador (gris azulado)
          '#38bdf8', // Cotizada (azul claro)
          '#f59e0b', // Pendiente (ámbar)
          '#16a34a', // Confirmada (verde victoria)
          '#ef4444', // Rechazada (rojo)
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const optionsEmbudo: ChartOptions<'doughnut'> = {
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
          label: (context) => {
            const val = Number(context.raw) || 0;
            const pct = embudoCotizaciones.porcentajes[context.dataIndex] || 0;
            return ` ${context.label}: ${val} cotizaciones (${pct}%)`;
          },
        },
      },
    },
    cutout: '62%',
  };

  const TABS: { id: 'finanzas' | 'ocupacion' | 'embudo'; label: string; icon: React.ReactNode }[] = [
    { id: 'finanzas', label: 'Finanzas & Flujo', icon: <TrendingUp size={14} /> },
    { id: 'ocupacion', label: 'Demanda por Finca', icon: <Building2 size={14} /> },
    { id: 'embudo', label: 'Embudo Cotizaciones', icon: <Target size={14} /> },
  ];

  return (
    <div className="panel dashboard-glass-panel" style={{ padding: '1.35rem' }}>
      {/* Selector de pestañas con transición suave */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}>
            <Layers size={18} style={{ color: 'var(--primary)' }} />
            Análisis Estadístico & Visualización del Negocio
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>
            Gráficos interactivos en tiempo real con datos consolidados de Supabase
          </div>
        </div>

        {/* Pestañas con pills animadas */}
        <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: '0.25rem', borderRadius: '12px', gap: '0.25rem', position: 'relative' }}>
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
                  position: 'relative',
                  background: isActive ? 'var(--surface)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: isActive ? 700 : 500,
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  border: 'none',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.8rem',
                  transition: 'background 0.2s ease, color 0.2s ease',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* CONTENIDO ANIMADO CON TRANSICIÓN SUAVE (FRAMER MOTION) */}
      <AnimatePresence mode="wait">
        {tabActiva === 'finanzas' && (
          <motion.div
            key="tab-finanzas"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.35rem', alignItems: 'center' }}
          >
            {/* Gráfico 1: Evolución Mensual */}
            <div style={{ height: '280px', position: 'relative' }}>
              <div className="text-xs text-muted" style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Evolución Histórica (Últimos 6 Meses)</span>
                <span className="text-xs" style={{ color: 'var(--primary)', fontWeight: 600 }}>Alojamiento + Menús</span>
              </div>
              <div style={{ height: '250px' }}>
                {/* @ts-ignore - Chart.js combo typing */}
                <Bar data={dataFinanzas as any} options={optionsFinanzas} />
              </div>
            </div>

            {/* Gráfico 2: Composición del Negocio */}
            <div style={{ height: '280px', position: 'relative', borderLeft: '1px solid var(--border)', paddingLeft: '1.25rem' }}>
              <div className="text-xs text-muted" style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <PieIcon size={14} /> Composición de Cartera y Cobros
              </div>
              <div style={{ height: '230px', position: 'relative' }}>
                <Doughnut data={dataDistribucion} options={optionsDistribucion} />
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Total Cartera: <strong className="tabular-nums font-dashboard">{formatCOP(ingresosHospedaje + ingresosAlimentacion + saldoPendiente)}</strong>
              </div>
            </div>
          </motion.div>
        )}

        {tabActiva === 'ocupacion' && (
          <motion.div
            key="tab-ocupacion"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="text-xs text-muted" style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
              Ranking de Fincas por Ingresos Generados y Volumen de Reservas
            </div>
            {rendimientoFincas.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay suficientes datos de reservas para calcular el ranking de fincas.
              </div>
            ) : (
              <div style={{ height: '280px' }}>
                <Bar data={dataFincas} options={optionsFincas} />
              </div>
            )}
          </motion.div>
        )}

        {tabActiva === 'embudo' && (
          <motion.div
            key="tab-embudo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.35rem', alignItems: 'center' }}
          >
            <div style={{ height: '260px' }}>
              <div className="text-xs text-muted" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                Distribución de Estados en el Embudo de Ventas
              </div>
              <div style={{ height: '230px' }}>
                <Doughnut data={dataEmbudo} options={optionsEmbudo} />
              </div>
            </div>

            <div style={{ background: 'var(--surface-2)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.85rem', color: 'var(--text)' }}>
                Efectividad Comercial
              </div>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-xs text-muted">Total Solicitudes Registradas:</span>
                  <span className="tabular-nums font-dashboard" style={{ fontWeight: 700 }}>{embudoCotizaciones.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-xs text-muted">Cotizaciones Ganadas / Confirmadas:</span>
                  <span className="tabular-nums font-dashboard" style={{ fontWeight: 700, color: '#16a34a' }}>
                    {embudoCotizaciones.data[3] || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-xs text-muted">Tasa de Conversión a Reserva:</span>
                  <span className="dashboard-glow-badge tabular-nums font-dashboard" style={{ background: 'color-mix(in srgb, #16a34a 15%, transparent)', color: '#16a34a' }}>
                    {embudoCotizaciones.tasaConversion}% de éxito
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-xs text-muted">En Negociación / Pendientes:</span>
                  <span className="tabular-nums font-dashboard" style={{ fontWeight: 700, color: '#f59e0b' }}>
                    {(embudoCotizaciones.data[1] || 0) + (embudoCotizaciones.data[2] || 0)}
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
