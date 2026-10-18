import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  UtensilsCrossed,
  Users,
  CheckCircle,
  FileText,
  ClipboardList,
  RotateCcw,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import type { Finca, Cliente, CotizacionDB, Reserva, AdminSection, Menu as MenuType } from '../../types';
import { useAdminDashboardStore, DashboardPeriodo } from '../../store/useAdminDashboardStore';
import { useApp } from '../../context/AppContext';
import {
  filtrarDatosPorPeriodoYFinca,
  calcularMetricasDashboard,
  generarSerieMensualFinanzas,
  calcularRendimientoFincas,
  calcularEmbudoCotizaciones,
  getFechaHoyLocal,
} from '../../utils/dashboardMetrics';
import { DashboardCharts } from './DashboardCharts';

interface AdminDashboardOverviewProps {
  fincas: Finca[];
  reservas: Reserva[];
  cotizaciones: CotizacionDB[];
  clientes: Cliente[];
  menus: MenuType[];
  metricasReservas: { total: number; activas: number; llegasHoy: number; salenHoy: number };
  navigateTo: (section: AdminSection) => void;
  userEmail?: string | null;
}

function formatCOP(v: number): string {
  return '$' + Math.round(v || 0).toLocaleString('es-CO');
}

export const AdminDashboardOverview: React.FC<AdminDashboardOverviewProps> = ({
  fincas,
  reservas,
  cotizaciones,
  clientes,
  menus,
  metricasReservas,
  navigateTo,
  userEmail,
}) => {
  const { periodo, setPeriodo, fincaId, setFincaId, tabActiva, setTabActiva, resetFiltros } =
    useAdminDashboardStore();

  const { recargarTodo, loading: globalLoading, showToast } = useApp();
  const [sincronizando, setSincronizando] = useState(false);

  const hoyStr = getFechaHoyLocal();

  // 1. Filtrado dinámico 100% centralizado con Lodash y Zustand
  const { reservas: reservasFiltradas, cotizaciones: cotizacionesFiltradas } = useMemo(() => {
    return filtrarDatosPorPeriodoYFinca(reservas, cotizaciones, periodo, fincaId);
  }, [reservas, cotizaciones, periodo, fincaId]);

  // 2. Cálculo de métricas consolidadas en tiempo real
  const metricas = useMemo(() => {
    return calcularMetricasDashboard(reservasFiltradas, cotizacionesFiltradas, metricasReservas);
  }, [reservasFiltradas, cotizacionesFiltradas, metricasReservas]);

  // 3. Gráficos estadísticos
  const serieFinanzas = useMemo(() => {
    return generarSerieMensualFinanzas(reservas);
  }, [reservas]);

  const rendimientoFincas = useMemo(() => {
    return calcularRendimientoFincas(fincas, reservas);
  }, [fincas, reservas]);

  const embudoCotizaciones = useMemo(() => {
    return calcularEmbudoCotizaciones(cotizaciones);
  }, [cotizaciones]);

  // Reservas activas para la agenda operativa
  const proximasLlegadas = useMemo(() => {
    return reservas
      .filter((r) => r.estado === 'activa' && r.fecha_inicio >= hoyStr)
      .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
      .slice(0, 5);
  }, [reservas, hoyStr]);

  // Fecha legible en español
  const fechaHoyLegible = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const handleSincronizarEnVivo = async () => {
    setSincronizando(true);
    try {
      await recargarTodo();
      showToast('✓ Base de datos sincronizada con éxito en tiempo real', 'success');
    } catch (e) {
      showToast('Error sincronizando datos con Supabase', 'error');
    } finally {
      setSincronizando(false);
    }
  };

  const PERIODOS_OPCIONES: { id: DashboardPeriodo; label: string }[] = [
    { id: 'mes_actual', label: 'Este Mes' },
    { id: '30dias', label: 'Últimos 30d' },
    { id: '7dias', label: 'Últimos 7d' },
    { id: 'ano_actual', label: 'Este Año' },
    { id: 'todos', label: 'Histórico Completo' },
  ];

  return (
    <div style={{ display: 'grid', gap: '1.35rem' }}>
      {/* ===== 1. BARRA DE CONTROL EJECUTIVO & FILTROS DINÁMICOS ===== */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="panel dashboard-glass-panel"
        style={{
          padding: '1.15rem 1.4rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderLeft: '4px solid var(--primary)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>
              Consola Ejecutiva
            </span>
            <div
              className="dashboard-glow-badge"
              style={{
                background: 'color-mix(in srgb, #16a34a 12%, transparent)',
                color: '#16a34a',
                border: '1px solid color-mix(in srgb, #16a34a 25%, transparent)',
              }}
            >
              <span className="dashboard-pulse-dot" />
              <span>En vivo · Supabase</span>
            </div>
          </div>
          <div className="text-xs text-muted" style={{ textTransform: 'capitalize', marginTop: '0.25rem' }}>
            {fechaHoyLegible} · Panel Centralizado de Control
          </div>
        </div>

        {/* Controles de Sincronización y Filtros Temporales */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Botón de Sincronización Real con Supabase */}
          <motion.button
            type="button"
            className="btn btn-sm"
            onClick={handleSincronizarEnVivo}
            disabled={sincronizando || globalLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 600,
              fontSize: '0.78rem',
              padding: '0.4rem 0.75rem',
            }}
            title="Recargar datos directamente desde Supabase en tiempo real"
          >
            <RefreshCw size={13} className={sincronizando || globalLoading ? 'animate-spin' : ''} />
            <span>{sincronizando || globalLoading ? 'Sincronizando…' : 'Actualizar'}</span>
          </motion.button>

          {/* Selector de periodo */}
          <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: '0.2rem', borderRadius: '10px', gap: '0.15rem' }}>
            {PERIODOS_OPCIONES.map((p) => {
              const isActive = periodo === p.id;
              return (
                <motion.button
                  key={p.id}
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setPeriodo(p.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    background: isActive ? 'var(--surface)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.78rem',
                    padding: '0.35rem 0.65rem',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                    transition: 'background 0.2s ease, color 0.2s ease',
                  }}
                >
                  {p.label}
                </motion.button>
              );
            })}
          </div>

          {/* Selector de finca */}
          <select
            value={fincaId}
            onChange={(e) => setFincaId(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="todas">Todas las Fincas ({fincas.length})</option>
            {fincas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>

          {(periodo !== 'mes_actual' || fincaId !== 'todas') && (
            <motion.button
              type="button"
              className="btn btn-sm"
              onClick={resetFiltros}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              title="Restablecer filtros a este mes y todas las fincas"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem' }}
            >
              <RotateCcw size={12} /> Limpiar
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* ===== 2. DECK DE MÉTRICAS KPI 3D INTERACTIVAS ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, staggerChildren: 0.05 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))',
          gap: '1.1rem',
        }}
      >
        {/* KPI 1: Ingresos Totales Recaudados */}
        <motion.div
          className="kpi-card-3d"
          style={{ '--card-accent': '#16a34a' } as React.CSSProperties}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Ingresos Recaudados
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'color-mix(in srgb, #16a34a 12%, transparent)',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={18} />
            </div>
          </div>
          <div className="font-dashboard tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '0.45rem' }}>
            {formatCOP(metricas.ingresosTotalesRecaudados)}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.5rem', fontSize: '0.74rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span>Fincas: <strong>{formatCOP(metricas.ingresosHospedaje)}</strong></span>
            <span>Menús Admin: <strong>{formatCOP(metricas.ingresosAlimentacionAdmin)}</strong></span>
          </div>
        </motion.div>

        {/* KPI 2: Saldo Pendiente por Cobrar */}
        <motion.div
          className="kpi-card-3d"
          style={{
            '--card-accent': metricas.totalSaldoPendiente > 0 ? '#dc2626' : 'var(--primary)',
            cursor: 'pointer',
          } as React.CSSProperties}
          onClick={() => navigateTo('reservas')}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          title="Ver reservas con saldo pendiente"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Saldo por Cobrar
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'color-mix(in srgb, #dc2626 12%, transparent)',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="font-dashboard tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', marginTop: '0.45rem' }}>
            {formatCOP(metricas.totalSaldoPendiente)}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.5rem', fontSize: '0.74rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span>Dueños fincas: <strong>{formatCOP(metricas.saldoPendienteFincasDueños)}</strong></span>
            <span>Admin Menús: <strong>{formatCOP(metricas.saldoPendienteAdminAlimentacion)}</strong></span>
          </div>
        </motion.div>

        {/* KPI 3: Reservas Activas */}
        <motion.div
          className="kpi-card-3d"
          style={{ '--card-accent': 'var(--primary)', cursor: 'pointer' } as React.CSSProperties}
          onClick={() => navigateTo('reservas')}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          title="Ver listado de reservas"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Reservas Activas
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ClipboardList size={18} />
            </div>
          </div>
          <div className="font-dashboard tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.45rem' }}>
            {metricas.reservasActivas}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.5rem', fontSize: '0.74rem' }}>
            {metricas.reservasTotal} reservas registradas en total
          </div>
        </motion.div>

        {/* KPI 4: Flujo Operativo Hoy */}
        <motion.div
          className="kpi-card-3d"
          style={{ '--card-accent': 'var(--accent)', cursor: 'pointer' } as React.CSSProperties}
          onClick={() => navigateTo('disponibilidad')}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          title="Ver calendario operativo"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Movimiento de Hoy
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.45rem' }}>
            <div>
              <div className="font-dashboard tabular-nums" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a' }}>
                {metricas.llegadasHoy}
              </div>
              <div className="text-xs text-muted" style={{ fontSize: '0.7rem' }}>Llegadas hoy</div>
            </div>
            <div style={{ width: '1px', height: '28px', background: 'var(--border)' }} />
            <div>
              <div className="font-dashboard tabular-nums" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ef4444' }}>
                {metricas.salidasHoy}
              </div>
              <div className="text-xs text-muted" style={{ fontSize: '0.7rem' }}>Salidas hoy</div>
            </div>
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.5rem', fontSize: '0.74rem' }}>
            Check-ins y check-outs programados
          </div>
        </motion.div>

        {/* KPI 5: Cotizaciones en Negociación */}
        <motion.div
          className="kpi-card-3d"
          style={{ '--card-accent': '#f59e0b', cursor: 'pointer' } as React.CSSProperties}
          onClick={() => navigateTo('cotizaciones')}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          title="Ver cotizaciones pendientes"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Cotizaciones Pendientes
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'color-mix(in srgb, #f59e0b 15%, transparent)',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={18} />
            </div>
          </div>
          <div className="font-dashboard tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', marginTop: '0.45rem' }}>
            {metricas.cotizacionesPendientes}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.5rem', fontSize: '0.74rem' }}>
            Conversión: <strong style={{ color: '#16a34a' }}>{metricas.tasaConversionCotizaciones}%</strong> a reserva
          </div>
        </motion.div>

        {/* KPI 6: Ticket Promedio y Huéspedes */}
        <motion.div
          className="kpi-card-3d"
          style={{ '--card-accent': '#6366f1' } as React.CSSProperties}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Ticket Promedio
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'color-mix(in srgb, #6366f1 12%, transparent)',
                color: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={18} />
            </div>
          </div>
          <div className="font-dashboard tabular-nums" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4f46e5', marginTop: '0.45rem' }}>
            {formatCOP(metricas.ticketPromedio)}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.5rem', fontSize: '0.74rem' }}>
            {metricas.totalHuespedes} personas hospedadas en total
          </div>
        </motion.div>
      </motion.div>

      {/* ===== 3. SECCIÓN DE VISUALIZACIÓN INTERACTIVA (CHART.JS) ===== */}
      <DashboardCharts
        serieFinanzas={serieFinanzas}
        rendimientoFincas={rendimientoFincas}
        embudoCotizaciones={embudoCotizaciones}
        ingresosHospedaje={metricas.ingresosHospedaje}
        ingresosAlimentacion={metricas.ingresosAlimentacionAdmin}
        saldoPendiente={metricas.totalSaldoPendiente}
        tabActiva={tabActiva}
        onCambiarTab={setTabActiva}
      />

      {/* ===== 4. SECCIÓN ESPECIALIZADA: RENDIMIENTO GASTRONÓMICO & MENÚS (ADMIN) ===== */}
      <motion.div
        className="panel dashboard-glass-panel"
        style={{ borderLeft: '4px solid var(--accent, #ea580c)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="panel-header" style={{ marginBottom: '1rem' }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--accent, #ea580c)' }}>
              <UtensilsCrossed size={18} /> Rendimiento de Planes de Alimentación (Gestión Directa Admin)
            </div>
            <div className="text-xs text-muted mt-1">
              Servicio gastronómico directo del administrador (pagos 100% independientes del hospedaje a dueños)
            </div>
          </div>
          <motion.button
            type="button"
            className="btn btn-sm"
            onClick={() => navigateTo('menus')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
          >
            Administrar Menús <ArrowRight size={14} />
          </motion.button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))', gap: '0.9rem' }}>
          <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div className="text-xs text-muted">Menús Cobrados & Recaudados</div>
            <div className="font-dashboard tabular-nums" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16a34a', marginTop: '0.3rem' }}>
              {formatCOP(metricas.alimentacionCobrada)}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
              Fondos en cuenta del administrador
            </div>
          </div>

          <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div className="text-xs text-muted">Pendiente de Cobro en Reservas</div>
            <div className="font-dashboard tabular-nums" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#c2410c', marginTop: '0.3rem' }}>
              {formatCOP(metricas.alimentacionPorCobrar)}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
              Por liquidar previo o durante check-in
            </div>
          </div>

          <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div className="text-xs text-muted">Proyección en Cotizaciones</div>
            <div className="font-dashboard tabular-nums" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#d97706', marginTop: '0.3rem' }}>
              {formatCOP(metricas.alimentacionProyeccionCotiz)}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
              En propuestas enviadas a clientes
            </div>
          </div>

          <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div className="text-xs text-muted">Comensales Atendidos</div>
            <div className="font-dashboard tabular-nums" style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.3rem' }}>
              {metricas.totalComensales} comensales
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
              En estancias activas y completadas
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== 5. AGENDA OPERATIVA & PRÓXIMAS LLEGADAS ===== */}
      {proximasLlegadas.length > 0 && (
        <motion.div
          className="panel dashboard-glass-panel"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="panel-header" style={{ marginBottom: '0.85rem' }}>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Clock size={17} /> Próximas Llegadas a Fincas
            </div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => navigateTo('reservas')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
            >
              Ver todas ({reservas.filter((r) => r.estado === 'activa').length}) →
            </button>
          </div>

          <div style={{ display: 'grid', gap: '0.55rem' }}>
            {proximasLlegadas.map((r) => {
              const clienteNombre = r.clientes
                ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.trim()
                : 'Cliente no registrado';
              const [y, m, d] = r.fecha_inicio.split('-');
              const esHoy = r.fecha_inicio === hoyStr;
              const numNoches = r.fecha_inicio && r.fecha_fin
                ? Math.max(1, Math.round((new Date(r.fecha_fin + 'T00:00:00').getTime() - new Date(r.fecha_inicio + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)))
                : 1;

              return (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.8rem 1.1rem',
                    background: esHoy ? 'color-mix(in srgb, var(--primary) 7%, var(--surface))' : 'var(--surface-2)',
                    border: esHoy ? '1px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: '10px',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                    <div
                      style={{
                        padding: '0.35rem 0.65rem',
                        background: esHoy ? 'var(--primary)' : 'var(--surface)',
                        color: esHoy ? '#ffffff' : 'var(--text)',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}
                    >
                      {d}/{m}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text)' }}>
                        {r.fincas?.nombre || 'Finca'}
                      </div>
                      <div className="text-xs text-muted">
                        {clienteNombre} · {r.personas} personas · {numNoches} noche(s)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="font-dashboard tabular-nums" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {formatCOP(r.valor_total)}
                    </span>
                    {esHoy && (
                      <span className="dashboard-glow-badge" style={{ background: '#16a34a', color: '#ffffff' }}>
                        ¡LLEGA HOY!
                      </span>
                    )}
                    <motion.button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => navigateTo('reservas')}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      title="Gestionar reserva"
                    >
                      Gestionar
                    </motion.button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ===== 6. ALERTAS Y ACCIONES PRIORITARIAS ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {metricas.totalSaldoPendiente > 0 && (
          <motion.div
            className="panel dashboard-glass-panel"
            style={{
              borderLeft: '4px solid var(--danger)',
              cursor: 'pointer',
              background: 'color-mix(in srgb, var(--danger) 4%, var(--surface))',
            }}
            onClick={() => navigateTo('reservas')}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--danger)', fontWeight: 700 }}>
              <AlertTriangle size={18} /> Saldo Pendiente por Cobrar: {formatCOP(metricas.totalSaldoPendiente)}
            </div>
            <p className="text-xs text-muted" style={{ marginTop: '0.4rem' }}>
              Hay reservas con liquidación pendiente. Haz clic para revisar abonos y recibos en el módulo de Reservas.
            </p>
          </motion.div>
        )}

        {metricas.cotizacionesPendientes > 0 && (
          <motion.div
            className="panel dashboard-glass-panel"
            style={{
              borderLeft: '4px solid var(--primary)',
              cursor: 'pointer',
              background: 'color-mix(in srgb, var(--primary) 4%, var(--surface))',
            }}
            onClick={() => navigateTo('cotizaciones')}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--primary)', fontWeight: 700 }}>
              <CheckCircle size={18} /> {metricas.cotizacionesPendientes} cotización{metricas.cotizacionesPendientes !== 1 ? 'es' : ''} pendiente{metricas.cotizacionesPendientes !== 1 ? 's' : ''}
            </div>
            <p className="text-xs text-muted" style={{ marginTop: '0.4rem' }}>
              Atiende a los clientes interesados para convertirlos en reservas confirmadas.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
