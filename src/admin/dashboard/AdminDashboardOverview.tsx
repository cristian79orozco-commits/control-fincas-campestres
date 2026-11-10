import React from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  AlertTriangle,
  Clock,
  UtensilsCrossed,
  Users,
  CheckCircle,
  FileText,
  ClipboardList,
  RotateCcw,
  RefreshCw,
  ArrowRight,
  Bell,
  BellRing,
} from 'lucide-react';
import type { Finca, Cliente, CotizacionDB, Reserva, AdminSection, Menu as MenuType } from '../../types';
import { DashboardCharts } from './DashboardCharts';
import { DashboardBrokerComisiones } from './DashboardBrokerComisiones';
import { DashboardRadarLlegadas } from './DashboardRadarLlegadas';
import { DashboardAlertaCompras } from './DashboardAlertaCompras';
import { useAdminOverviewController } from './useAdminOverviewController';

export interface AdminDashboardOverviewProps {
  fincas?: Finca[];
  reservas?: Reserva[];
  cotizaciones?: CotizacionDB[];
  clientes?: Cliente[];
  menus?: MenuType[];
  metricasReservas?: { total: number; activas: number; llegasHoy: number; salenHoy: number };
  navigateTo: (section: AdminSection) => void;
  userEmail?: string | null;
  onGuardarReserva?: (datos: Partial<Reserva>) => Promise<{ success: boolean; id?: string; error?: string }>;
}

/**
 * Capa Visual (Dumb UI) del Dashboard Ejecutivo del Administrador / Broker
 * Sigue estrictamente la arquitectura de 4 capas y pautas de fincas-ui-ux:
 * - Cero lógica de negocio o queries directas en JSX
 * - Toda la lógica, memoización de métricas y cálculos residen en useAdminOverviewController
 * - Renderizado óptimo a 60 FPS con componentes compactos de alto impacto
 * - Paridad dual estricta para PC (escritorio) y Dispositivos Móviles
 */
export const AdminDashboardOverview: React.FC<AdminDashboardOverviewProps> = (props) => {
  const {
    periodo,
    fincaId,
    tabActiva,
    filtrosModificados,
    periodosOpciones,
    fincas,
    fechaHoyLegible,
    sincronizando,
    metricas,
    totalReservasActivas,
    serieFinanzas,
    rendimientoFincas,
    embudoCotizaciones,

    // Flujo especializado del Broker
    resumenComisiones,
    alertasComisionesPendientes,
    radarLlegadas,
    alertasComprasAlimentacion,
    notifPermiso,
    sonidoActivo,

    // Handlers
    handleSincronizarEnVivo,
    handleCambiarPeriodo,
    handleCambiarFinca,
    handleCambiarTab,
    handleResetFiltros,
    handleMarcarComisionCobrada,
    handleMarcarComprasAlimentacion,
    handleCobrarComisionWhatsApp,
    handleActivarNotificacionesMaster,
    navigateTo,
    formatCOP,
  } = useAdminOverviewController(props);

  return (
    <div style={{ display: 'grid', gap: '1.15rem', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* ===== 1. BARRA DE CONTROL EJECUTIVO & BOTÓN MAESTRO DE ALERTAS ===== */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="panel dashboard-glass-panel"
        style={{
          padding: '1.05rem 1.35rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.85rem',
          borderLeft: '4px solid var(--primary)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.22rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>
              Consola del Administrador
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
          <div className="text-xs text-muted" style={{ textTransform: 'capitalize', marginTop: '0.2rem' }}>
            {fechaHoyLegible} · Control Comercial & Flujo de Comisiones
          </div>
        </div>

        {/* Botón Maestro Unificado de Alertas PC + Filtros */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          {/* BOTÓN MAESTRO UNIFICADO DE ALERTAS & SONIDO NATIVO EN PC */}
          <motion.button
            type="button"
            className="btn btn-sm"
            onClick={handleActivarNotificacionesMaster}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title={
              notifPermiso === 'granted' && sonidoActivo
                ? 'Alertas en Windows y sonido profesional activas. Clic para probar timbre.'
                : 'Activar notificaciones nativas en Windows y sonido profesional incluso minimizado.'
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              fontWeight: 700,
              fontSize: '0.78rem',
              padding: '0.45rem 0.85rem',
              minHeight: '44px',
              borderRadius: '8px',
              cursor: 'pointer',
              background:
                notifPermiso === 'granted' && sonidoActivo
                  ? 'color-mix(in srgb, #16a34a 16%, transparent)'
                  : 'color-mix(in srgb, var(--primary) 18%, transparent)',
              color:
                notifPermiso === 'granted' && sonidoActivo
                  ? '#16a34a'
                  : 'var(--primary)',
              border: `1px solid ${
                notifPermiso === 'granted' && sonidoActivo
                  ? 'color-mix(in srgb, #16a34a 35%, transparent)'
                  : 'color-mix(in srgb, var(--primary) 40%, transparent)'
              }`,
            }}
          >
            {notifPermiso === 'granted' && sonidoActivo ? (
              <>
                <BellRing size={15} className="animate-pulse" />
                <span>Alertas PC: Activas 🔊</span>
              </>
            ) : (
              <>
                <Bell size={15} />
                <span>Activar Alertas PC & Sonido</span>
              </>
            )}
          </motion.button>

          {/* Botón Actualizar */}
          <motion.button
            type="button"
            className="btn btn-sm"
            onClick={handleSincronizarEnVivo}
            disabled={sincronizando}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 600,
              fontSize: '0.78rem',
              padding: '0.45rem 0.75rem',
              minHeight: '44px',
            }}
            title="Recargar datos directamente desde Supabase en tiempo real"
          >
            <RefreshCw size={13} className={sincronizando ? 'animate-spin' : ''} />
            <span>{sincronizando ? 'Sincronizando…' : 'Actualizar'}</span>
          </motion.button>

          {/* Selector de periodo */}
          <div style={{ display: 'inline-flex', flexWrap: 'wrap', maxWidth: '100%', background: 'var(--surface-2)', padding: '0.2rem', borderRadius: '8px', gap: '0.15rem' }}>
            {periodosOpciones.map((p) => {
              const isActive = periodo === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleCambiarPeriodo(p.id)}
                  style={{
                    background: isActive ? 'var(--surface)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.76rem',
                    padding: '0.35rem 0.6rem',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Selector de finca */}
          <select
            value={fincaId}
            onChange={(e) => handleCambiarFinca(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
              maxWidth: '100%',
              minHeight: '44px',
            }}
          >
            <option value="todas">Todas las Fincas ({fincas.length})</option>
            {fincas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>

          {filtrosModificados && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleResetFiltros}
              title="Restablecer filtros"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', minHeight: '44px' }}
            >
              <RotateCcw size={12} /> Limpiar
            </button>
          )}
        </div>
      </motion.div>

      {/* ===== 2. MÓDULO EXCLUSIVO DEL BROKER: COMISIONES & COBRO A PROPIETARIOS ===== */}
      <DashboardBrokerComisiones
        resumen={resumenComisiones}
        alertas={alertasComisionesPendientes}
        onCobrarWhatsApp={handleCobrarComisionWhatsApp}
        onMarcarCobrada={handleMarcarComisionCobrada}
        formatCOP={formatCOP}
      />

      {/* ===== 3. ALERTA DE LOGÍSTICA DE COMPRAS (ALIMENTACIÓN EN PRÓXIMAS 72H) ===== */}
      <DashboardAlertaCompras
        alertas={alertasComprasAlimentacion}
        onMarcarCompras={handleMarcarComprasAlimentacion}
      />

      {/* ===== 4. RADAR INTERACTIVO DE LLEGADAS & FECHAS ACTIVAS ===== */}
      <DashboardRadarLlegadas
        radarLlegadas={radarLlegadas}
        onVerTodasReservas={() => navigateTo('reservas')}
        formatCOP={formatCOP}
      />

      {/* ===== 5. DECK DE MÉTRICAS KPI 3D INTERACTIVAS (COMPLEMENTARIAS) ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* KPI 1: Ingresos Totales Recaudados */}
        <motion.div
          className="kpi-card-3d"
          style={{ '--card-accent': '#16a34a' } as React.CSSProperties}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Ingresos Totales (Fincas + Menús)
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'color-mix(in srgb, #16a34a 12%, transparent)',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={17} />
            </div>
          </div>
          <div className="font-dashboard tabular-nums" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#16a34a', marginTop: '0.4rem' }}>
            {formatCOP(metricas.ingresosTotalesRecaudados)}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.45rem', fontSize: '0.73rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span>Hospedaje dueños: <strong>{formatCOP(metricas.ingresosHospedaje)}</strong></span>
            <span>Alimentación admin: <strong>{formatCOP(metricas.ingresosAlimentacionAdmin)}</strong></span>
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
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          title="Ver reservas con saldo pendiente"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Saldos Huéspedes por Cobrar
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'color-mix(in srgb, #dc2626 12%, transparent)',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={17} />
            </div>
          </div>
          <div className="font-dashboard tabular-nums" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#dc2626', marginTop: '0.4rem' }}>
            {formatCOP(metricas.totalSaldoPendiente)}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.45rem', fontSize: '0.73rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span>Abonos en finca: <strong>{formatCOP(metricas.saldoPendienteFincasDueños)}</strong></span>
            <span>Menús admin: <strong>{formatCOP(metricas.saldoPendienteAdminAlimentacion)}</strong></span>
          </div>
        </motion.div>

        {/* KPI 3: Reservas Activas */}
        <motion.div
          className="kpi-card-3d"
          style={{ '--card-accent': 'var(--primary)', cursor: 'pointer' } as React.CSSProperties}
          onClick={() => navigateTo('reservas')}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          title="Ver listado de reservas"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Reservas Activas
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ClipboardList size={17} />
            </div>
          </div>
          <div className="font-dashboard tabular-nums" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.4rem' }}>
            {metricas.reservasActivas}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.45rem', fontSize: '0.73rem' }}>
            {metricas.reservasTotal} reservas registradas en total
          </div>
        </motion.div>

        {/* KPI 4: Cotizaciones Pendientes */}
        <motion.div
          className="kpi-card-3d"
          style={{ '--card-accent': '#f59e0b', cursor: 'pointer' } as React.CSSProperties}
          onClick={() => navigateTo('cotizaciones')}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          title="Ver cotizaciones pendientes"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Cotizaciones en Negociación
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'color-mix(in srgb, #f59e0b 15%, transparent)',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={17} />
            </div>
          </div>
          <div className="font-dashboard tabular-nums" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#d97706', marginTop: '0.4rem' }}>
            {metricas.cotizacionesPendientes}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.45rem', fontSize: '0.73rem' }}>
            Conversión: <strong style={{ color: '#16a34a' }}>{metricas.tasaConversionCotizaciones}%</strong> a reserva
          </div>
        </motion.div>
      </motion.div>

      {/* ===== 6. SECCIÓN DE VISUALIZACIÓN INTERACTIVA (GRÁFICOS) ===== */}
      <DashboardCharts
        serieFinanzas={serieFinanzas}
        rendimientoFincas={rendimientoFincas}
        embudoCotizaciones={embudoCotizaciones}
        ingresosHospedaje={metricas.ingresosHospedaje}
        ingresosAlimentacion={metricas.ingresosAlimentacionAdmin}
        saldoPendiente={metricas.totalSaldoPendiente}
        tabActiva={tabActiva}
        onCambiarTab={handleCambiarTab}
      />

      {/* ===== 7. SECCIÓN ESPECIALIZADA: RENDIMIENTO GASTRONÓMICO & MENÚS (ADMIN) ===== */}
      <motion.div
        className="panel dashboard-glass-panel"
        style={{ borderLeft: '4px solid var(--accent, #ea580c)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="panel-header" style={{ marginBottom: '0.9rem' }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--accent, #ea580c)' }}>
              <UtensilsCrossed size={17} /> Rendimiento de Planes de Alimentación (Gestión Directa Admin)
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
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, minHeight: '44px' }}
          >
            Administrar Menús <ArrowRight size={14} />
          </motion.button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))', gap: '0.85rem' }}>
          <div style={{ background: 'var(--surface-2)', padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div className="text-xs text-muted">Menús Cobrados & Recaudados</div>
            <div className="font-dashboard tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
              {formatCOP(metricas.alimentacionCobrada)}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
              Fondos en cuenta del administrador
            </div>
          </div>

          <div style={{ background: 'var(--surface-2)', padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div className="text-xs text-muted">Pendiente de Cobro en Reservas</div>
            <div className="font-dashboard tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c2410c', marginTop: '0.25rem' }}>
              {formatCOP(metricas.alimentacionPorCobrar)}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
              Por liquidar previo o durante check-in
            </div>
          </div>

          <div style={{ background: 'var(--surface-2)', padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div className="text-xs text-muted">Comensales Atendidos</div>
            <div className="font-dashboard tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
              {metricas.totalComensales} comensales
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
              En estancias activas y completadas
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
