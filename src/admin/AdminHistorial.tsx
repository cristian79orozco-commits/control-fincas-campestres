import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Search, Filter, Calendar, Home, Users, DollarSign,
  Download, FileText, CheckCircle, AlertTriangle, ShieldCheck,
  ChevronRight, RefreshCw, X, Award, ExternalLink, RotateCcw,
  BarChart3, Sparkles, Clock, CheckCircle2
} from 'lucide-react';
import type {
  Reserva, Finca, Cliente, ConfiguracionGeneral,
  CierreReserva, PagoTipo, ReservaEstado
} from '../types';
import {
  calcularSaldo,
  obtenerNombreClienteHistorico,
  obtenerNombreFincaHistorico,
  obtenerContactoClienteHistorico,
} from '../types';
import { HistorialCharts } from './historial/HistorialCharts';
import { AdminExpedienteModal } from './AdminExpedienteModal';
import { AdminCierreModal } from './AdminCierreModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
  useHistorialController,
  MESES_HISTORIAL as MESES,
  formatCOP,
  formatFecha,
  type UseHistorialControllerParams,
} from './useHistorialController';

export type AdminHistorialProps = UseHistorialControllerParams;

export const AdminHistorial: React.FC<AdminHistorialProps> = (props) => {
  const {
    reservas,
    fincas,
    clientes,
    filtros,
    setFiltros,
    limpiarFiltros,
    hayFiltrosActivos,
    reservasFiltradas,
    aniosDisponibles,
    metricas,
    busquedaInput,
    setBusquedaInput,
    chartTab,
    setChartTab,
    mostrarGraficos,
    toggleMostrarGraficos,
    serieTiempo,
    distribucionFincas,
    estadosCierre,
    sincronizando,
    globalLoading,
    handleSincronizarEnVivo,
    handleExportarCsv,
    handleDescargaDirectaExpediente,
    descargandoId,
    reservaParaExpediente,
    setReservaParaExpediente,
    reservaParaCerrar,
    setReservaParaCerrar,
    configuracion,
    userEmail,
    onCerrarReserva,
    onReabrirReserva,
    onRegistrarComunicacion,
    showToast,
  } = useHistorialController(props);

  return (
    <ErrorBoundary fallbackTitle="Error al cargar el Historial">
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        {/* ===== 1. ENCABEZADO EJECUTIVO & CONTROLES ===== */}
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
                Archivo Histórico & Auditoría
              </span>
              <div
                className="dashboard-glow-badge"
                style={{
                  background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                  color: 'var(--primary)',
                  border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
                }}
              >
                <ShieldCheck size={12} />
                <span>Registros Inmutables</span>
              </div>
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
              Control permanente de cierres, expedientes contractuales y balances económicos
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <motion.button
              type="button"
              className="btn btn-sm"
              onClick={handleSincronizarEnVivo}
              disabled={sincronizando || globalLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, fontSize: '0.78rem' }}
              title="Sincronizar historial con Supabase"
            >
              <RefreshCw size={13} className={sincronizando || globalLoading ? 'animate-spin' : ''} />
              <span>{sincronizando || globalLoading ? 'Sincronizando…' : 'Actualizar'}</span>
            </motion.button>

            <motion.button
              type="button"
              className="btn btn-sm"
              onClick={toggleMostrarGraficos}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 600,
                fontSize: '0.78rem',
                background: mostrarGraficos ? 'var(--surface-2)' : 'var(--surface)',
                color: mostrarGraficos ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              <BarChart3 size={13} />
              <span>{mostrarGraficos ? 'Ocultar Gráficos' : 'Ver Estadísticas'}</span>
            </motion.button>

            <motion.button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleExportarCsv}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, fontSize: '0.78rem' }}
              title="Descargar datos en formato CSV / Excel"
            >
              <Download size={13} /> Exportar CSV
            </motion.button>
          </div>
        </motion.div>

        {/* ===== 2. DECK DE MÉTRICAS KPI 3D INTERACTIVAS ===== */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, staggerChildren: 0.05 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.1rem',
          }}
        >
          {/* KPI 1: Operaciones */}
          <motion.div
            className="kpi-card-3d"
            style={{ '--card-accent': 'var(--primary)' } as React.CSSProperties}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Operaciones Filtradas
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
                <History size={18} />
              </div>
            </div>
            <div className="font-dashboard tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.45rem' }}>
              {metricas.total}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.5rem', fontSize: '0.74rem' }}>
              {reservas.length} operaciones registradas históricamente
            </div>
          </motion.div>

          {/* KPI 2: Recaudado */}
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
              {formatCOP(metricas.recaudado)}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.5rem', fontSize: '0.74rem' }}>
              Liquidado y confirmado en caja
            </div>
          </motion.div>

          {/* KPI 3: Completadas con éxito */}
          <motion.div
            className="kpi-card-3d"
            style={{ '--card-accent': '#2d7a4f' } as React.CSSProperties}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Finalizadas con Éxito
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'color-mix(in srgb, #2d7a4f 12%, transparent)',
                  color: '#2d7a4f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="font-dashboard tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2d7a4f', marginTop: '0.45rem' }}>
              {metricas.completadas}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.5rem', fontSize: '0.74rem' }}>
              Tasa de éxito: <strong style={{ color: '#16a34a' }}>{metricas.tasaExito}%</strong>
            </div>
          </motion.div>

          {/* KPI 4: Promedios */}
          <motion.div
            className="kpi-card-3d"
            style={{ '--card-accent': 'var(--accent)' } as React.CSSProperties}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Promedios de Estancia
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
                <div className="font-dashboard tabular-nums" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text)' }}>
                  {metricas.promedioNoches}
                </div>
                <div className="text-xs text-muted" style={{ fontSize: '0.7rem' }}>Noches prom.</div>
              </div>
              <div style={{ width: '1px', height: '28px', background: 'var(--border)' }} />
              <div>
                <div className="font-dashboard tabular-nums" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text)' }}>
                  {metricas.promedioPersonas}
                </div>
                <div className="text-xs text-muted" style={{ fontSize: '0.7rem' }}>Huéspedes prom.</div>
              </div>
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.5rem', fontSize: '0.74rem' }}>
              Métricas de comportamiento del huésped
            </div>
          </motion.div>

          {/* KPI 5: Saldo Pendiente */}
          {metricas.saldoPendiente > 0 && (
            <motion.div
              className="kpi-card-3d"
              style={{ '--card-accent': '#dc2626' } as React.CSSProperties}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Saldo por Liquidar
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
              <div className="font-dashboard tabular-nums" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: '0.45rem' }}>
                {formatCOP(metricas.saldoPendiente)}
              </div>
              <div className="text-xs text-muted" style={{ marginTop: '0.5rem', fontSize: '0.74rem' }}>
                En reservas activas dentro del filtro
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ===== 3. VISUALIZACIÓN ESTADÍSTICA (CHART.JS) ===== */}
        {mostrarGraficos && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <HistorialCharts
              serieTiempo={serieTiempo}
              distribucionFincas={distribucionFincas}
              estadosCierre={estadosCierre}
              tabActiva={chartTab}
              onCambiarTab={setChartTab}
            />
          </motion.div>
        )}

        {/* ===== 4. FILTROS DE AUDITORÍA HISTÓRICA ===== */}
        <div className="panel dashboard-glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.65rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text)' }}>
              <Filter size={16} style={{ color: 'var(--primary)' }} />
              Filtros Avanzados de Búsqueda y Auditoría
            </div>
            {hayFiltrosActivos && (
              <motion.button
                type="button"
                className="btn btn-sm"
                onClick={limpiarFiltros}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <RotateCcw size={12} /> Limpiar filtros
              </motion.button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem' }}>
            {/* Buscador */}
            <div className="field">
              <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>Búsqueda libre</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={busquedaInput}
                  onChange={(e) => setBusquedaInput(e.target.value)}
                  placeholder="Cliente, Finca, ID…"
                  style={{ fontSize: '0.8rem', paddingLeft: '1.9rem', borderRadius: '8px' }}
                />
                <Search size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Finca */}
            <div className="field">
              <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>Finca</label>
              <select
                value={filtros.fincaId}
                onChange={(e) => setFiltros((p) => ({ ...p, fincaId: e.target.value }))}
                style={{ fontSize: '0.8rem', borderRadius: '8px' }}
              >
                <option value="todas">Todas las fincas</option>
                {fincas.map((f) => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
                ))}
              </select>
            </div>

            {/* Cliente */}
            <div className="field">
              <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>Cliente</label>
              <select
                value={filtros.clienteId}
                onChange={(e) => setFiltros((p) => ({ ...p, clienteId: e.target.value }))}
                style={{ fontSize: '0.8rem', borderRadius: '8px' }}
              >
                <option value="todos">Todos los clientes</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.apellido || ''}</option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div className="field">
              <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>Estado de operación</label>
              <select
                value={filtros.estado}
                onChange={(e) => setFiltros((p) => ({ ...p, estado: e.target.value }))}
                style={{ fontSize: '0.8rem', borderRadius: '8px' }}
              >
                <option value="todas">Todos los estados</option>
                <option value="completada">Completadas</option>
                <option value="cancelada">Canceladas</option>
                <option value="no_show">No Show</option>
                <option value="activa">Activas (En curso)</option>
              </select>
            </div>

            {/* Mes */}
            <div className="field">
              <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>Mes</label>
              <select
                value={filtros.mes}
                onChange={(e) => setFiltros((p) => ({ ...p, mes: e.target.value }))}
                style={{ fontSize: '0.8rem', borderRadius: '8px' }}
              >
                {MESES.map((m) => (
                  <option key={m.val} value={m.val}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Año */}
            <div className="field">
              <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>Año</label>
              <select
                value={filtros.anio}
                onChange={(e) => setFiltros((p) => ({ ...p, anio: e.target.value }))}
                style={{ fontSize: '0.8rem', borderRadius: '8px' }}
              >
                <option value="todos">Todos los años</option>
                {aniosDisponibles.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Desde */}
            <div className="field">
              <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>Fecha Desde</label>
              <input
                type="date"
                value={filtros.fechaDesde}
                onChange={(e) => setFiltros((p) => ({ ...p, fechaDesde: e.target.value }))}
                style={{ fontSize: '0.8rem', borderRadius: '8px' }}
              />
            </div>

            {/* Hasta */}
            <div className="field">
              <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>Fecha Hasta</label>
              <input
                type="date"
                value={filtros.fechaHasta}
                onChange={(e) => setFiltros((p) => ({ ...p, fechaHasta: e.target.value }))}
                style={{ fontSize: '0.8rem', borderRadius: '8px' }}
              />
            </div>
          </div>
        </div>

        {/* ===== 5. LISTADO DE REGISTROS HISTÓRICOS ===== */}
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '1rem 1.4rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--surface-2)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
              Registros Históricos Encontrados ({reservasFiltradas.length})
            </div>
            <div className="text-xs text-muted">
              Mostrando archivo ordenado cronológicamente
            </div>
          </div>

          {reservasFiltradas.length === 0 ? (
            <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
              <History size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 0.85rem', opacity: 0.5 }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.35rem', color: 'var(--text)' }}>
                No se encontraron operaciones históricas con los filtros aplicados
              </div>
              <p className="text-xs text-muted" style={{ maxWidth: '440px', margin: '0 auto 1.25rem' }}>
                Prueba modificando el año, mes o la finca seleccionada, o restablece los filtros para ver el histórico completo.
              </p>
              <button type="button" className="btn btn-sm btn-primary" onClick={limpiarFiltros}>
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="avail-table">
              {reservasFiltradas.map((r) => {
                const saldo = calcularSaldo(r);
                const totalPagado = (r.valor_total || 0) - saldo;
                const cliNombre = obtenerNombreClienteHistorico(r);
                const finNombre = obtenerNombreFincaHistorico(r);
                const contacto = obtenerContactoClienteHistorico(r);
                const tel = contacto.whatsapp || contacto.telefono || '—';

                const esCerrada = r.estado === 'completada' || r.estado === 'cancelada' || r.estado === 'no_show';

                return (
                  <motion.div
                    key={r.id}
                    className="avail-row"
                    whileHover={{ backgroundColor: 'color-mix(in srgb, var(--primary) 3%, var(--surface))' }}
                    style={{ flexWrap: 'wrap', gap: '0.85rem', padding: '0.95rem 1.35rem', borderBottom: '1px solid var(--border)' }}
                  >
                    {/* Identificador y Finca */}
                    <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{finNombre}</span>
                        <span
                          className={`status-badge ${
                            r.estado === 'completada'
                              ? 's-avail'
                              : r.estado === 'activa'
                              ? 's-avail'
                              : 's-busy'
                          }`}
                          style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}
                        >
                          {r.estado}
                        </span>
                      </div>

                      <div className="text-xs text-muted" style={{ marginTop: '0.3rem' }}>
                        EXP-{r.id.slice(0, 8).toUpperCase()} · 👤 {cliNombre} ({tel})
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>📅 {formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}</span>
                        <span>👥 {r.personas || 1} personas</span>
                      </div>
                    </div>

                    {/* Balance Económico */}
                    <div style={{ flex: '1 1 180px', minWidth: '160px', fontSize: '0.82rem' }}>
                      <div>Total: <strong className="font-dashboard tabular-nums">{formatCOP(r.valor_total || 0)}</strong></div>
                      <div>Pagado: <strong className="font-dashboard tabular-nums" style={{ color: '#16a34a' }}>{formatCOP(totalPagado)}</strong></div>
                      <div style={{ color: saldo > 0 ? '#dc2626' : '#16a34a' }}>
                        Saldo: <strong className="font-dashboard tabular-nums">{formatCOP(saldo)}</strong>
                      </div>
                    </div>

                    {/* Auditoría de Cierre Inmutable */}
                    <div style={{ flex: '1 1 180px', minWidth: '160px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {r.fecha_cierre ? (
                        <>
                          <div>Cierre: <strong>{formatFecha(r.fecha_cierre)}</strong></div>
                          <div>Por: <strong>{r.cerrada_por || r.cierre?.responsable || 'Administrador'}</strong></div>
                          <div style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                            <ShieldCheck size={12} /> Registro inmutable
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ color: 'var(--warning, #f59e0b)', fontWeight: 700 }}>
                            ● En curso (Sin acta de cierre)
                          </div>
                          <div>Aún activa en operación</div>
                        </>
                      )}
                    </div>

                    {/* Botones de Acción */}
                    <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <motion.button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => setReservaParaExpediente(r)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        title="Ver expediente completo de la reserva"
                        style={{ fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <FileText size={12} /> Ver Expediente
                      </motion.button>

                      <motion.button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleDescargaDirectaExpediente(r)}
                        disabled={descargandoId === r.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        title="Descargar expediente en PDF"
                        style={{ fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Download size={12} /> {descargandoId === r.id ? 'Generando…' : 'PDF'}
                      </motion.button>

                      {!esCerrada && onCerrarReserva && (
                        <motion.button
                          type="button"
                          className="btn btn-sm"
                          style={{ color: '#16a34a', borderColor: '#16a34a', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          onClick={() => setReservaParaCerrar(r)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          title="Efectuar cierre formal y check-out"
                        >
                          <CheckCircle size={12} /> Cerrar
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Expediente Integral */}
        {reservaParaExpediente && (
          <AdminExpedienteModal
            isOpen={!!reservaParaExpediente}
            reserva={reservaParaExpediente}
            configuracion={configuracion}
            onClose={() => setReservaParaExpediente(null)}
            onReabrir={onReabrirReserva ? async (id) => {
              const res = await onReabrirReserva(id);
              if (res.success) {
                showToast('Reserva reabierta como activa ✅', 'success');
                setReservaParaExpediente(null);
              } else {
                showToast(`Error: ${res.error}`, 'error');
              }
            } : undefined}
            onRegistrarComunicacion={onRegistrarComunicacion}
            showToast={showToast}
          />
        )}

        {/* Modal: Cierre Formal */}
        {reservaParaCerrar && onCerrarReserva && (
          <AdminCierreModal
            isOpen={!!reservaParaCerrar}
            reserva={reservaParaCerrar}
            userEmail={userEmail}
            onClose={() => setReservaParaCerrar(null)}
            onConfirmarCierre={async (datosCierre, pagoLiq) => {
              const res = await onCerrarReserva(reservaParaCerrar.id, datosCierre, pagoLiq);
              if (!res.success) {
                throw new Error(res.error || 'Error al guardar cierre');
              }
            }}
            showToast={showToast}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};
