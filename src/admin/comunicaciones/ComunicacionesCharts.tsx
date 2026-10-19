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
          '#16a34a',
          '#0d9488',
          '#0284c7',
          '#f59e0b',
          '#8b5cf6',
          '#ea580c',
          '#ef4444',
          '#10b981',
          '#64748b',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Tarjetas KPI Superiores con Diseño Nativo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
        {[
          {
            label: 'Total Envíos WhatsApp',
            val: stats.total,
            sub: 'Auditoría en tiempo real',
            icon: <MessageCircle size={22} style={{ color: '#16a34a' }} />,
            color: 'rgba(22, 163, 74, 0.12)',
          },
          {
            label: 'Cotizaciones Formales',
            val: tiposDataMap.cotizacion,
            sub: 'Fase 1: Prospección',
            icon: <FileText size={22} style={{ color: '#0284c7' }} />,
            color: 'rgba(2, 132, 199, 0.12)',
          },
          {
            label: 'Separaciones & Abonos',
            val: tiposDataMap.separacion + tiposDataMap.abono,
            sub: 'Fase 2: Bloqueo fechas',
            icon: <ShieldCheck size={22} style={{ color: '#0d9488' }} />,
            color: 'rgba(13, 148, 136, 0.12)',
          },
          {
            label: 'Saldos & Paz y Salvo',
            val: tiposDataMap.estado_cuenta + tiposDataMap.paz_salvo,
            sub: 'Fase 3: Liquidación',
            icon: <TrendingUp size={22} style={{ color: '#ea580c' }} />,
            color: 'rgba(234, 88, 12, 0.12)',
          },
        ].map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.04 }}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {kpi.label}
              </span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', lineHeight: '1.2', marginTop: '0.2rem' }}>
                {kpi.val}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {kpi.sub}
              </span>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {kpi.icon}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Grid de Gráficas de Análisis con Aspecto Nativo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
        {/* Gráfico 1: Proporción por Tipo de Comunicación */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '1.1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.86rem', color: 'var(--text)' }}>
              <PieIcon size={17} style={{ color: '#16a34a' }} />
              <span>Distribución de Mensajes por Etapa Comercial</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Historial Total</span>
          </div>

          <div style={{ height: '240px', position: 'relative' }}>
            {stats.total > 0 ? (
              <Doughnut data={dataDistribucion} options={optionsDoughnut} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                No hay comunicaciones registradas aún para graficar.
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Doble Balance Financiero Visual en Vivo */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '1.1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.86rem', color: 'var(--text)' }}>
              <TrendingUp size={17} style={{ color: '#ea580c' }} />
              <span>Radiografía del Doble Balance: #{expedienteConsecutivo}</span>
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c' }}>
              En Vivo
            </span>
          </div>

          <div style={{ height: '200px', position: 'relative' }}>
            {finanzasDoble ? (
              <Bar data={dataDobleBalance} options={optionsBarraBalance} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Selecciona un expediente para comparar saldos en tiempo real.
              </div>
            )}
          </div>

          {finanzasDoble && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)', fontSize: '0.76rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                <span>Total Dueño: <strong>{formatCOP(finanzasDoble.subtotalFinca)}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ea580c', flexShrink: 0 }} />
                <span>Total Menú: <strong>{formatCOP(finanzasDoble.costoAlimentacion)}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Huéspedes con Mayor Interacción en WhatsApp con Lodash */}
      {stats.destinatariosFrecuentes.length > 0 && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '1.1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Huéspedes con Mayor Interacción en WhatsApp
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
            {stats.destinatariosFrecuentes.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.65rem 0.8rem',
                  borderRadius: '10px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.4rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.destinatario || 'Huésped'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a', fontFamily: 'monospace', fontWeight: 600 }}>
                    +{item.telefono}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.35rem' }}>
                  <span>Contactos:</span>
                  <strong style={{ color: 'var(--primary)' }}>{item.total} envíos</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
