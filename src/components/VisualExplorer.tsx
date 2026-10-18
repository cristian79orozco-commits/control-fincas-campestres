import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  PieChart,
  Users,
  Calendar,
  Utensils,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Info
} from 'lucide-react';
import type { Finca } from '../types';
import { useClientStore } from '../store/useClientStore';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface VisualExplorerProps {
  fincas: Finca[];
  onSelectFinca: (fincaId: string) => void;
  titulo?: string;
  subtitulo?: string;
  tipo?: 'ambos' | 'comparativa' | 'presupuesto';
}

function formatCOP(v: number): string {
  return '$' + Math.round(v || 0).toLocaleString('es-CO') + ' COP';
}

export const VisualExplorer: React.FC<VisualExplorerProps> = ({
  fincas,
  onSelectFinca,
  titulo = 'Análisis Visual & Calculadora de Presupuesto',
  subtitulo = 'Compara capacidades, tarifas y simula tu inversión con ahorro directo en tiempo real',
  tipo = 'ambos',
}) => {
  const fincasActivas = useMemo(() => fincas.filter((f) => f.activo), [fincas]);
  const [tabActiva, setTabActiva] = useState<'comparativa' | 'presupuesto'>(
    tipo === 'presupuesto' ? 'presupuesto' : 'comparativa'
  );

  // Store para la calculadora de presupuesto
  const {
    presupuestoHuespedes,
    setPresupuestoHuespedes,
    presupuestoNoches,
    setPresupuestoNoches,
    presupuestoPlanAlim,
    setPresupuestoPlanAlim,
  } = useClientStore();

  // ─────────────────────────────────────────────────────────────
  // 1. DATOS DEL GRÁFICO COMPARATIVO (BAR CHART)
  // ─────────────────────────────────────────────────────────────
  const datosComparativa = useMemo(() => {
    const ordenadas = [...fincasActivas].sort((a, b) => (b.capacidad || 0) - (a.capacidad || 0));
    const labels = ordenadas.map((f) => f.nombre);
    const capacidades = ordenadas.map((f) => f.capacidad || 0);
    const preciosPp = ordenadas.map((f) => Number(f.precio_pp) || 0);

    return {
      labels,
      datasets: [
        {
          label: 'Capacidad Máxima (personas)',
          data: capacidades,
          backgroundColor: 'rgba(26, 107, 94, 0.85)', // Esmeralda de la página
          borderColor: '#1a6b5e',
          borderWidth: 1.5,
          borderRadius: 6,
          yAxisID: 'yCapacidad',
        },
        {
          label: 'Tarifa por persona / noche (COP)',
          data: preciosPp,
          backgroundColor: 'rgba(196, 122, 40, 0.85)', // Dorado / Ámbar de la página
          borderColor: '#c47a28',
          borderWidth: 1.5,
          borderRadius: 6,
          yAxisID: 'yPrecio',
        },
      ],
      fincasRef: ordenadas,
    };
  }, [fincasActivas]);

  const opcionesComparativa: any = {
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
          color: 'var(--text)',
          font: {
            family: "'DM Sans', sans-serif",
            size: 12,
            weight: '600',
          },
          usePointStyle: true,
          boxWidth: 10,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(26, 24, 20, 0.95)',
        titleColor: '#d4924a',
        bodyColor: '#f0eae0',
        borderColor: 'rgba(219, 212, 195, 0.3)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          afterTitle: (items: any) => {
            const idx = items[0]?.dataIndex;
            const finca = datosComparativa.fincasRef[idx];
            return finca ? `Zona: ${finca.zona || 'Santa Elena'}` : '';
          },
          label: (ctx: any) => {
            if (ctx.datasetIndex === 0) {
              return `👥 Capacidad: ${ctx.parsed.y} personas`;
            }
            return `💰 Tarifa /pp: ${formatCOP(ctx.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(128, 128, 128, 0.1)',
        },
        ticks: {
          color: 'var(--text-muted)',
          font: {
            family: "'DM Sans', sans-serif",
            size: 11,
          },
        },
      },
      yCapacidad: {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: 'Capacidad (Pers.)',
          color: 'var(--primary)',
          font: { weight: 'bold', size: 11 },
        },
        grid: {
          color: 'rgba(128, 128, 128, 0.1)',
        },
        ticks: {
          color: 'var(--text-muted)',
        },
      },
      yPrecio: {
        type: 'linear',
        position: 'right',
        title: {
          display: true,
          text: 'Tarifa /pp (COP)',
          color: 'var(--accent)',
          font: { weight: 'bold', size: 11 },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: 'var(--text-muted)',
          callback: (val: any) => `$${(val / 1000).toFixed(0)}k`,
        },
      },
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 2. DATOS DE LA CALCULADORA DE PRESUPUESTO (DOUGHNUT CHART)
  // ─────────────────────────────────────────────────────────────
  const calculosPresupuesto = useMemo(() => {
    // Tarifa promedio /pp entre fincas compatibles con la capacidad
    const compatibles = fincasActivas.filter((f) => (f.capacidad || 10) >= presupuestoHuespedes);
    const pool = compatibles.length > 0 ? compatibles : fincasActivas;
    const precioPpPromedio =
      pool.reduce((acc, f) => acc + (Number(f.precio_pp) || 55000), 0) / (pool.length || 1);

    const subtotalAlojamiento = precioPpPromedio * presupuestoHuespedes * presupuestoNoches;

    // Costo de alimentación según plan seleccionado
    let costoAlimPp = 0;
    if (presupuestoPlanAlim === 'desayuno') costoAlimPp = 16000;
    if (presupuestoPlanAlim === 'asado') costoAlimPp = 38000;
    if (presupuestoPlanAlim === 'dia_completo') costoAlimPp = 52000;

    const subtotalAlimentacion = costoAlimPp * presupuestoHuespedes * presupuestoNoches;
    const inversionTotalDirecta = subtotalAlojamiento + subtotalAlimentacion;

    // Ahorro estimado de reserva directa (plataformas intermediarias cobran ~18-20%)
    const ahorroDirecto = Math.round(inversionTotalDirecta * 0.18);
    const costoEnPlataformas = inversionTotalDirecta + ahorroDirecto;

    return {
      subtotalAlojamiento,
      subtotalAlimentacion,
      inversionTotalDirecta,
      ahorroDirecto,
      costoEnPlataformas,
      fincasCompatibles: pool,
    };
  }, [fincasActivas, presupuestoHuespedes, presupuestoNoches, presupuestoPlanAlim]);

  const datosDoughnut = useMemo(() => {
    const labels = ['Alojamiento Campestre'];
    const data = [calculosPresupuesto.subtotalAlojamiento];
    const colors = ['#1a6b5e']; // Esmeralda

    if (calculosPresupuesto.subtotalAlimentacion > 0) {
      labels.push('Gastronomía Opcional');
      data.push(calculosPresupuesto.subtotalAlimentacion);
      colors.push('#c47a28'); // Dorado
    }

    labels.push('Ahorro Reserva Directa (18%)');
    data.push(calculosPresupuesto.ahorroDirecto);
    colors.push('#2d7a4f'); // Verde éxito

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: 'var(--surface)',
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [calculosPresupuesto]);

  const opcionesDoughnut: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'var(--text)',
          font: { family: "'DM Sans', sans-serif", size: 11, weight: '600' },
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.label}: ${formatCOP(ctx.parsed)}`,
        },
      },
    },
    cutout: '68%',
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="visual-explorer-section"
      style={{
        marginTop: '2rem',
        marginBottom: '2rem',
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--rad-md, 18px)',
        padding: '1.5rem',
        boxShadow: 'var(--sh-md)',
      }}
    >
      {/* Encabezado de la Sección */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--primary-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <TrendingUp size={20} />
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              {titulo}
            </h2>
          </div>
          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {subtitulo}
          </p>
        </div>

        {/* Selector de Pestaña (solo si tipo === 'ambos') */}
        {tipo === 'ambos' && (
          <div
            style={{
              display: 'inline-flex',
              padding: '0.25rem',
              borderRadius: '999px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              gap: '0.25rem',
            }}
          >
            <button
              type="button"
              onClick={() => setTabActiva('comparativa')}
              style={{
                padding: '0.4rem 0.95rem',
                borderRadius: '999px',
                border: 'none',
                background: tabActiva === 'comparativa' ? 'var(--primary)' : 'transparent',
                color: tabActiva === 'comparativa' ? '#ffffff' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s ease',
              }}
            >
              <BarChart3 size={15} /> Comparativa de Fincas
            </button>
            <button
              type="button"
              onClick={() => setTabActiva('presupuesto')}
              style={{
                padding: '0.4rem 0.95rem',
                borderRadius: '999px',
                border: 'none',
                background: tabActiva === 'presupuesto' ? 'var(--primary)' : 'transparent',
                color: tabActiva === 'presupuesto' ? '#ffffff' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s ease',
              }}
            >
              <PieChart size={15} /> Simulador de Presupuesto
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* ─── VISTA 1: COMPARATIVA DE CAPACIDAD Y TARIFA ─── */}
        {tabActiva === 'comparativa' && (
          <motion.div
            key="comparativa"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div
              style={{
                height: '320px',
                position: 'relative',
                background: 'var(--surface-2)',
                borderRadius: 'var(--rad-sm, 12px)',
                padding: '1rem',
              }}
            >
              <Bar data={datosComparativa} options={opcionesComparativa} />
            </div>

            {/* Fila de accesos rápidos a fincas desde el gráfico */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.6rem',
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                background: 'var(--surface-2)',
                borderRadius: 'var(--rad-xs, 8px)',
                fontSize: '0.8rem',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                <Info size={15} style={{ color: 'var(--primary)' }} />
                Haz clic en una finca para ver fotos, calendario en vivo y cotizar directamente:
              </span>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {fincasActivas.slice(0, 5).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onSelectFinca(f.id)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {f.nombre} <ArrowRight size={12} />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── VISTA 2: SIMULADOR DE INVERSIÓN Y AHORRO DIRECTO ─── */}
        {tabActiva === 'presupuesto' && (
          <motion.div
            key="presupuesto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              alignItems: 'center',
            }}
          >
            {/* Controles del Simulador */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.15rem',
                background: 'var(--surface-2)',
                padding: '1.25rem',
                borderRadius: 'var(--rad-sm, 12px)',
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)' }}>
                Configura los parámetros de tu viaje
              </div>

              {/* Slider Huéspedes */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text)' }}>
                    <Users size={14} style={{ color: 'var(--primary)' }} /> Tamaño del Grupo:
                  </span>
                  <span style={{ color: 'var(--primary)', fontWeight: 800 }}>
                    {presupuestoHuespedes} personas
                  </span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={45}
                  value={presupuestoHuespedes}
                  onChange={(e) => setPresupuestoHuespedes(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span>4 pers.</span>
                  <span>20 pers.</span>
                  <span>45 pers.</span>
                </div>
              </div>

              {/* Slider Noches */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text)' }}>
                    <Calendar size={14} style={{ color: 'var(--primary)' }} /> Duración de la Estadía:
                  </span>
                  <span style={{ color: 'var(--primary)', fontWeight: 800 }}>
                    {presupuestoNoches} noche{presupuestoNoches !== 1 ? 's' : ''}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={presupuestoNoches}
                  onChange={(e) => setPresupuestoNoches(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span>1 noche (pasadía)</span>
                  <span>Fin de semana (2)</span>
                  <span>Semana (7)</span>
                </div>
              </div>

              {/* Selector Plan de Alimentación */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text)' }}>
                  <Utensils size={14} style={{ color: 'var(--accent)' }} /> Gastronomía Tradicional Opcional:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem' }}>
                  {[
                    { id: 'ninguno', lbl: 'Solo Alojamiento', extra: '$0' },
                    { id: 'desayuno', lbl: 'Con Desayuno', extra: '+$16k/pp' },
                    { id: 'asado', lbl: 'Asado Campestre', extra: '+$38k/pp' },
                    { id: 'dia_completo', lbl: 'Día Completo (3 comidas)', extra: '+$52k/pp' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPresupuestoPlanAlim(p.id as any)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: `1.5px solid ${presupuestoPlanAlim === p.id ? 'var(--primary)' : 'var(--border)'}`,
                        background: presupuestoPlanAlim === p.id ? 'var(--primary-bg)' : 'var(--surface)',
                        color: presupuestoPlanAlim === p.id ? 'var(--primary-h)' : 'var(--text)',
                        fontSize: '0.74rem',
                        fontWeight: presupuestoPlanAlim === p.id ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>{p.lbl}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{p.extra}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Visualización Doughnut y Resumen Financiero */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                background: 'var(--surface-2)',
                padding: '1.25rem',
                borderRadius: 'var(--rad-sm, 12px)',
              }}
            >
              <div style={{ width: '100%', height: '220px', position: 'relative' }}>
                <Doughnut data={datosDoughnut} options={opcionesDoughnut} />
                <div
                  style={{
                    position: 'absolute',
                    top: '44%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Estimado</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary)' }}>
                    {formatCOP(calculosPresupuesto.inversionTotalDirecta)}
                  </div>
                </div>
              </div>

              {/* Caja de Ahorro Directo Garantizado */}
              <div
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: 'color-mix(in srgb, var(--success) 12%, var(--surface))',
                  border: '1.5px solid var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)', fontWeight: 800, fontSize: '0.82rem' }}>
                    <ShieldCheck size={16} /> Ahorro Directo sin comisiones
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Precio directo sin los sobrecostos de plataformas externas
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--success)' }}>
                    {formatCOP(calculosPresupuesto.ahorroDirecto)}
                  </div>
                </div>
              </div>

              {/* Botón CTA hacia fincas disponibles */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const el = document.getElementById('catalogo');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '0.65rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  gap: '0.5rem',
                }}
              >
                <span>Ver fincas para {presupuestoHuespedes} personas</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};
