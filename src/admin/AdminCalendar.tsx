import React from 'react';
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, User, Lock, Calendar,
  CreditCard, FileText, MessageCircle, FileCheck, Check,
  ChevronDown, ChevronUp, AlertTriangle, UtensilsCrossed, Sparkles, Building2,
  Clock, X, Save, Search, Percent, CheckSquare
} from 'lucide-react';
import type {
  Finca, BloqueoDisponibilidad, Reserva, Cliente, CotizacionDB,
  Menu as MenuType, ConfiguracionGeneral, PagoTipo, Pago, CierreReserva
} from '../types';
import { calcularSaldo } from '../types';
import { getFechaHoyLocal } from '../utils/dashboardMetrics';
import { ConsecutivoBadge } from './AdminReservas';
import { CurrencyInput } from '../components/CurrencyInput';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { AdminCierreModal } from './AdminCierreModal';
import { AdminExpedienteModal } from './AdminExpedienteModal';
import { AdminDocumentos } from './AdminDocumentos';
import {
  plantillaRecordatorioPago,
  plantillaBienvenida,
  plantillaSeparacion,
  plantillaPazYSalvo,
  plantillaEstadoCuenta,
  abrirWhatsApp,
  generarUrlWhatsApp,
} from '../services/whatsapp';
import { generarDocSeparacion, generarPazYSalvo, generarEstadoCuenta } from '../services/documentos';
import {
  useCalendarController,
  MESES,
  DIAS_SEMANA,
  TIPOS_PAGO,
  PAGO_VACIO,
  formatCOP,
  formatFecha,
} from './useCalendarController';

export interface AdminCalendarProps {
  fincas: Finca[];
  bloquesAdmin: BloqueoDisponibilidad[];
  reservas?: Reserva[];
  clientes?: Cliente[];
  cotizaciones?: CotizacionDB[];
  menus?: MenuType[];
  configuracion?: ConfiguracionGeneral;
  userEmail?: string | null;
  onMarcarDias: (fincaId: string, fechas: string[], estado: 'ocupado' | 'libre', nombreCliente?: string) => Promise<{ success: boolean; error?: string }>;
  onEliminarBloqueo?: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  onGuardarReserva?: (datos: Partial<Reserva>) => Promise<{ success: boolean; id?: string; error?: string }>;
  onCambiarEstadoReserva?: (id: string, estado: any) => Promise<{ success: boolean; error?: string }>;
  onRegistrarPago?: (reservaId: string, pago: { tipo: PagoTipo; fecha: string; valor: number; observacion?: string }) => Promise<{ success: boolean; error?: string }>;
  onEliminarPago?: (pagoId: string) => Promise<{ success: boolean; error?: string }>;
  onCerrarReserva?: (
    reservaId: string,
    datosCierre: Partial<CierreReserva>,
    pagoLiquidacion?: { valor: number; tipo: PagoTipo; observacion?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onReabrirReserva?: (reservaId: string) => Promise<{ success: boolean; error?: string }>;
  onEliminarReserva?: (id: string) => Promise<{ success: boolean; error?: string }>;
  onRegistrarComunicacion?: (com: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

/**
 * Capa Visual (Dumb UI) del Calendario de Disponibilidad
 * - Cuadrícula mensual idéntica optimizada a 60 FPS
 * - Consume el estado, navegación y cálculo de fechas desde useCalendarController
 * - Preserva contratos de Supabase: onMarcarDias, onEliminarBloqueo, pagos y reservas
 */
export const AdminCalendar: React.FC<AdminCalendarProps> = (props) => {
  const {
    // Fechas y matriz
    anio,
    mes,
    offset,
    handlePrevMonth,
    handleNextMonth,
    handleIrAHoy,
    diasDelMesGrid,

    // Fincas y filtros
    fincas,
    selectedFincaId,
    fincaActual,
    busquedaFinca,
    setBusquedaFinca,
    fincasFiltradasMenu,
    conteoPorFinca,
    handleSeleccionarFinca,

    // Selección e inspección
    fechasSeleccionadas,
    setFechasSeleccionadas,
    fechaInspeccionada,
    setFechaInspeccionada,
    nombreCliente,
    setNombreCliente,
    procesando,
    toggleDia,
    handleSeleccionarFinesDeSemana,
    handleLiberarBloqueoRapido,
    handleMarcar,

    // Métricas
    metricasMes,
    reservasPorFecha,
    bloqueosPorFecha,

    // Reservas activas y listado
    filtroFincaReservas,
    setFiltroFincaReservas,
    reservasActivas,
    reservas,
    reservaExpandida,
    setReservaExpandida,

    // Pagos
    pagoReservaId,
    setPagoReservaId,
    pagoForm,
    setPagoForm,
    guardandoPago,
    handleRegistrarPago,
    handleEliminarPagoClick,

    // Modales
    reservaParaCierre,
    setReservaParaCierre,
    reservaParaExpediente,
    setReservaParaExpediente,
    modalWaReserva,
    setModalWaReserva,

    // Callbacks y dependencias
    onCerrarReserva,
    onReabrirReserva,
    onEliminarPago,
    onRegistrarComunicacion,
    showToast,
    userEmail,
    configuracion,
  } = useCalendarController(props);

  return (
    <div className="admin-big-cal-wrapper">
      {/* ─── ENCABEZADO PRINCIPAL DEL MÓDULO ────────────────────────────────────────── */}
      <div className="panel" style={{ padding: '1.25rem 1.25rem 0.95rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
              <Calendar size={22} style={{ color: 'var(--primary)' }} /> Calendario de Disponibilidad
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
              Gestión centralizada de fechas libres, bloqueos manuales y reservas confirmadas en tiempo real.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="status-badge s-avail" style={{ gap: '0.35rem' }}>
              <Sparkles size={12} /> Sincronización en vivo
            </span>
            {fincaActual && (
              <span className="status-badge s-info" style={{ gap: '0.35rem' }}>
                <Building2 size={12} /> Finca: {fincaActual.nombre}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── VENTANA MENÚ ESTÁTICA DE FINCAS (SIN DESPLIEGUE HORIZONTAL) ────────────── */}
      <div className="admin-fincas-menu-window">
        <div className="admin-fincas-menu-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.98rem' }}>
              <Building2 size={16} style={{ color: 'var(--primary)' }} /> Propiedades y Fincas
              <span className="status-badge s-info" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                {fincas.length} en total
              </span>
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
              Haz clic en cualquier propiedad para inspeccionar y administrar su disponibilidad:
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', justifyContent: 'flex-end', minWidth: 'min(100%, 220px)' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '260px' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="admin-fincas-search-input"
                placeholder="Buscar finca por nombre o lugar..."
                value={busquedaFinca}
                onChange={e => setBusquedaFinca(e.target.value)}
                style={{ paddingLeft: '28px', width: '100%' }}
              />
              {busquedaFinca && (
                <button
                  type="button"
                  onClick={() => setBusquedaFinca('')}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  title="Limpiar búsqueda"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Viewport estático con scroll vertical acotado */}
        <div className="admin-fincas-menu-viewport">
          {fincasFiltradasMenu.length === 0 ? (
            <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No se encontraron fincas con "{busquedaFinca}".
            </div>
          ) : (
            fincasFiltradasMenu.map(f => {
              const esActiva = (selectedFincaId || fincas[0]?.id) === f.id;
              const activasCount = conteoPorFinca[f.id] || 0;
              const fotoUrl = f.finca_imagenes?.[0]?.url || '';

              return (
                <div
                  key={f.id}
                  className={`admin-finca-menu-item ${esActiva ? 'active' : ''}`}
                  onClick={() => handleSeleccionarFinca(f.id)}
                  role="button"
                  tabIndex={0}
                  title={`Seleccionar ${f.nombre}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                    {fotoUrl ? (
                      <img src={fotoUrl} alt={f.nombre} className="admin-finca-menu-thumb" />
                    ) : (
                      <div className="admin-finca-menu-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={20} style={{ opacity: 0.4 }} />
                      </div>
                    )}
                    <div className="admin-finca-menu-info">
                      <div className="admin-finca-menu-name">{f.nombre}</div>
                      <div className="admin-finca-menu-meta">
                        {f.capacidad ? <span>👥 {f.capacidad_minima && f.capacidad_minima > 1 ? `${f.capacidad_minima} a ${f.capacidad}` : `Hasta ${f.capacidad}`} personas</span> : null}
                        {f.zona ? <span>📍 {f.zona}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {activasCount > 0 ? (
                      <span className="status-badge s-busy" style={{ fontSize: '0.68rem', padding: '0.2rem 0.55rem' }}>
                        {activasCount} reserva{activasCount !== 1 ? 's' : ''} activa{activasCount !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="status-badge s-avail" style={{ fontSize: '0.68rem', padding: '0.2rem 0.55rem' }}>
                        100% Libre
                      </span>
                    )}
                    {esActiva && (
                      <span style={{ color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                        <Check size={16} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── CALENDARIO PRINCIPAL Y MÉTRICAS DE OCUPACIÓN ─────────────────────────── */}
      <div className="admin-big-cal-container">
        {/* Barra superior de métricas de ocupación del mes actual */}
        <div className="cal-occupancy-kpi-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Percent size={18} style={{ color: 'var(--primary)' }} />
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                Ocupación: {fincaActual?.nombre || 'Finca'} ({MESES[mes]} {anio})
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
                <div style={{ width: '120px', height: '7px', borderRadius: '4px', background: 'var(--surface-3)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${metricasMes.porcentaje}%`,
                      height: '100%',
                      background: metricasMes.porcentaje > 70 ? 'var(--danger)' : metricasMes.porcentaje > 30 ? 'var(--warning)' : 'var(--success)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                  {metricasMes.porcentaje}% ocupado
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="occ-stat-pill" style={{ color: 'var(--danger)' }}>
              ● {metricasMes.ocupados} días ocupados
            </span>
            <span className="occ-stat-pill" style={{ color: 'var(--success)' }}>
              ● {metricasMes.libres} días libres
            </span>
            <span className="occ-stat-pill" style={{ color: 'var(--text-muted)' }}>
              Mes: {metricasMes.diasMes} días
            </span>
          </div>
        </div>

        {/* Barra de navegación de mes y leyenda */}
        <div className="admin-big-cal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-sm" onClick={handlePrevMonth} title="Mes anterior">
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontFamily: 'var(--font-dashboard)', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.015em', minWidth: 'min(100%, 140px)', textAlign: 'center' }}>
              {MESES[mes]} {anio}
            </span>
            <button className="btn btn-sm" onClick={handleNextMonth} title="Mes siguiente">
              <ChevronRight size={16} />
            </button>

            <button
              className="btn btn-sm"
              onClick={handleIrAHoy}
              style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.3rem 0.65rem', marginLeft: '0.25rem' }}
              title="Volver al día y mes actual"
            >
              <Clock size={13} /> Hoy
            </button>
          </div>

          {/* Leyenda de colores adaptativa */}
          <div className="cal-legend" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
            <span className="legend-dot free">Libre</span>
            <span className="legend-dot busy">Reserva Huésped</span>
            <span className="legend-dot sel">Seleccionado ({fechasSeleccionadas.size})</span>
            <span className="legend-dot past">Pasado (Solo lectura)</span>
          </div>
        </div>

        {/* Cuadrícula grande y responsiva del calendario */}
        <div className="calendar-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
          <div className="admin-big-cal-grid">
            {/* Cabeceras de días de la semana */}
            {DIAS_SEMANA.map(d => (
              <div
                key={d}
                style={{
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  padding: '0.5rem 0',
                  color: 'var(--text-faint)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                {d}
              </div>
            ))}

            {/* Espacios vacíos de offset del mes */}
            {Array.from({ length: offset }).map((_, i) => (
              <div
                key={`offset-${i}`}
                className="admin-cal-day-large empty"
                style={{ opacity: 0.15, pointerEvents: 'none', background: 'var(--surface-2)', borderStyle: 'dashed' }}
              />
            ))}

            {/* Días del mes usando el modelo optimizado del controller */}
            {diasDelMesGrid.map(dia => (
              <div
                key={dia.fechaStr}
                className={dia.className}
                onClick={() => toggleDia(dia.fechaStr)}
                title={`${dia.fechaStr}: ${dia.esPasado ? 'Fecha pasada (solo lectura)' : dia.esOcupado ? `Ocupado (${dia.clienteEtiqueta || 'Bloqueado'})` : 'Disponible / Libre'}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: dia.esPasado ? 'var(--text-muted)' : 'var(--text)' }}>
                    {dia.diaNum}
                  </span>
                  {dia.esHoy && (
                    <span
                      className="cal-today-badge"
                      title={`Día actual en curso (${formatFecha(dia.fechaStr)}) · Configurado en ciclo 24 horas`}
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '0.12rem 0.42rem',
                        borderRadius: '4px',
                        background: 'var(--primary)',
                        color: '#ffffff',
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        boxShadow: '0 0 10px rgba(77, 168, 158, 0.45)',
                      }}
                    >
                      <Clock size={10} style={{ strokeWidth: 2.5 }} />
                      HOY
                    </span>
                  )}
                  {dia.esPasado && !dia.esHoy && (
                    <span
                      style={{
                        fontSize: '0.58rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        opacity: 0.75,
                      }}
                    >
                      Pasado
                    </span>
                  )}
                </div>

                {/* Micro-indicador de color para móviles */}
                <div className={`cal-mobile-indicator ${dia.esOcupado ? (dia.bloqueoVinculado ? 'busy-admin' : 'busy') : 'free'}`} />

                {/* Contenido enriquecido para PC */}
                <div className="desktop-cal-content" style={{ marginTop: '0.35rem', fontSize: '0.72rem', overflow: 'hidden' }}>
                  {dia.reservaVinculada ? (
                    <div
                      style={{
                        padding: '0.2rem 0.35rem',
                        borderRadius: '4px',
                        background: dia.esPasado ? 'rgba(168, 160, 151, 0.12)' : 'rgba(239, 68, 68, 0.15)',
                        color: dia.esPasado ? 'var(--text-muted)' : 'var(--danger)',
                        fontWeight: 600,
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={`${dia.consecutivoTexto} ${dia.clienteEtiqueta} ${dia.esPasado ? '(Estancia finalizada)' : ''}`}
                    >
                      {dia.consecutivoTexto && (
                        <span style={{ fontFamily: 'monospace', marginRight: '0.2rem', opacity: dia.esPasado ? 0.75 : 1 }}>
                          {dia.consecutivoTexto}
                        </span>
                      )}
                      {dia.clienteEtiqueta || 'Reserva'}
                    </div>
                  ) : dia.bloqueoVinculado ? (
                    <div
                      style={{
                        padding: '0.2rem 0.35rem',
                        borderRadius: '4px',
                        background: dia.esPasado ? 'rgba(168, 160, 151, 0.12)' : 'rgba(245, 158, 11, 0.18)',
                        color: dia.esPasado ? 'var(--text-muted)' : '#b45309',
                        fontWeight: 600,
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      🔒 {dia.bloqueoVinculado.notas || (dia.esPasado ? 'Bloqueo pasado' : 'Bloqueo')}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '0.15rem 0.35rem',
                        borderRadius: '4px',
                        color: dia.esPasado ? 'var(--text-muted)' : 'var(--success)',
                        fontWeight: 500,
                        fontSize: '0.68rem',
                        opacity: dia.esPasado ? 0.6 : 1,
                      }}
                    >
                      {dia.esPasado ? 'Finalizado' : 'Disponible'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── INSPECTOR CONTEXTUAL DE FECHA SELECCIONADA ─────────────────────── */}
        {fechaInspeccionada && (
          <div className="cal-date-inspector-card">
            {(() => {
              const resVin = reservasPorFecha.get(fechaInspeccionada);
              const bloqVin = bloqueosPorFecha.get(fechaInspeccionada);
              const esHoyIns = fechaInspeccionada === getFechaHoyLocal();
              const esPasadoIns = fechaInspeccionada < getFechaHoyLocal();
              const saldo = resVin ? calcularSaldo(resVin) : 0;
              const nomCliente = resVin?.clientes
                ? `${resVin.clientes.nombre} ${resVin.clientes.apellido || ''}`.trim()
                : 'Reserva activa';
              const tel = resVin?.clientes?.whatsapp || resVin?.clientes?.telefono;
              const tienePlanAlimentacion = Boolean(resVin?.menu_id || resVin?.alimentacion || (resVin?.costo_alimentacion && resVin.costo_alimentacion > 0));
              const nombrePlan = resVin?.menus?.nombre || resVin?.alimentacion || 'Plan especial';

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                  {/* Fila superior: fecha, badges informativos y botón cerrar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={16} style={{ color: 'var(--primary)' }} /> {formatFecha(fechaInspeccionada)}
                      </span>

                      {esHoyIns && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: 'var(--primary)',
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                          title="Día en curso · Configurado en formato 24 horas"
                        >
                          <Clock size={10} /> HOY (24h)
                        </span>
                      )}

                      {esPasadoIns && (
                        <span className="status-badge" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', opacity: 0.8 }}>
                          Pasado (Solo lectura)
                        </span>
                      )}

                      {bloqVin ? (
                        <span className="status-badge s-warn" style={{ gap: '0.3rem', fontSize: '0.74rem' }}>
                          <Lock size={12} /> Bloqueo manual: <strong>{bloqVin.notas || 'Sin notas'}</strong>
                        </span>
                      ) : resVin ? (
                        <span className="status-badge s-busy" style={{ gap: '0.35rem', fontSize: '0.74rem' }}>
                          👤 <strong>{nomCliente}</strong> {resVin.consecutivo ? `(#${resVin.consecutivo})` : ''}
                        </span>
                      ) : (
                        <span className="status-badge s-avail" style={{ gap: '0.35rem', fontSize: '0.74rem' }}>
                          <CheckCircle size={12} /> Fecha disponible
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {bloqVin && !esPasadoIns && (
                        <button
                          className="btn btn-sm btn-danger"
                          style={{ fontSize: '0.74rem', padding: '0.25rem 0.65rem' }}
                          disabled={procesando}
                          onClick={() => handleLiberarBloqueoRapido(bloqVin)}
                        >
                          <CheckCircle size={13} /> Liberar bloqueo ahora
                        </button>
                      )}
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }}
                        onClick={() => setFechaInspeccionada(null)}
                        title="Cerrar inspector"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Si hay una reserva activa en este día: información pura y clara (sin botones operativos) */}
                  {resVin && (
                    <div
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.75rem 0.95rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                        gap: '0.75rem',
                        fontSize: '0.82rem',
                      }}
                    >
                      <div>
                        <div className="text-xs text-muted">Huésped Titular</div>
                        <div style={{ fontWeight: 600, color: 'var(--text)', marginTop: '0.15rem' }}>{nomCliente}</div>
                        {tel && (
                          <div className="text-xs text-muted" style={{ marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <MessageCircle size={11} style={{ color: '#25d366' }} /> Contacto: {tel}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-muted">Estancia y Capacidad</div>
                        <div style={{ fontWeight: 600, color: 'var(--text)', marginTop: '0.15rem' }}>
                          {formatFecha(resVin.fecha_inicio)} → {formatFecha(resVin.fecha_fin)}
                        </div>
                        <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>
                          👥 {resVin.personas} huéspedes
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted">Plan de Alimentación</div>
                        <div style={{ marginTop: '0.2rem' }}>
                          {tienePlanAlimentacion ? (
                            <span className="food-plan-badge-pill" style={{ fontSize: '0.74rem' }}>
                              <UtensilsCrossed size={11} /> {nombrePlan}
                            </span>
                          ) : (
                            <span className="text-xs text-muted">🍃 Sin plan adicional</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted">Estado Financiero (Informativo)</div>
                        <div style={{ marginTop: '0.15rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span>Total: <strong>{formatCOP(resVin.valor_total)}</strong></span>
                          <span>Saldo: <strong style={{ color: saldo > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCOP(saldo)}</strong></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Si la fecha es pasada y no tiene reserva */}
                  {esPasadoIns && !resVin && !bloqVin && (
                    <div className="text-xs text-muted" style={{ fontStyle: 'italic' }}>
                      🕒 Esta fecha pertenece al pasado. Es de solo lectura y no está disponible para selección ni modificaciones de disponibilidad.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ─── HERRAMIENTA RÁPIDA DE BLOQUEO / DESBLOQUEO ─────────────────────── */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1.15rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
              {fechasSeleccionadas.size > 0
                ? `⚡ ${fechasSeleccionadas.size} día(s) seleccionado(s) en ${fincaActual?.nombre || 'la finca'}`
                : 'Selecciona días en el calendario para bloquearlos o liberarlos en lote:'}
            </span>

            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleSeleccionarFinesDeSemana}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                title="Seleccionar todos los Viernes, Sábados y Domingos de este mes"
              >
                <CheckSquare size={12} /> Fines de semana
              </button>
              {fechasSeleccionadas.size > 0 && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    setFechasSeleccionadas(new Set());
                    setFechaInspeccionada(null);
                  }}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                >
                  Limpiar selección
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '0.75rem', alignItems: 'end' }}>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                <User size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Nombre del huésped / Razón de bloqueo (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Mantenimiento piscina, Uso familiar, Reserva externa..."
                value={nombreCliente}
                onChange={e => setNombreCliente(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-danger btn-sm"
                style={{ flex: 1, minWidth: '150px' }}
                disabled={procesando || !fechasSeleccionadas.size}
                onClick={() => handleMarcar('ocupado')}
              >
                <XCircle size={15} /> Marcar como ocupado
              </button>
              <button
                className="btn btn-sm"
                style={{
                  flex: 1,
                  minWidth: '150px',
                  background: 'var(--success-bg)',
                  borderColor: 'var(--success)',
                  color: 'var(--success)'
                }}
                disabled={procesando || !fechasSeleccionadas.size}
                onClick={() => handleMarcar('libre')}
              >
                <CheckCircle size={15} /> Marcar como libre
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── LISTADO INFERIOR DE RESERVAS QUE YA ESTÁN ACTIVAS ─────────────────── */}
      <div className="panel" style={{ marginTop: '0.5rem' }}>
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCheck size={18} style={{ color: 'var(--success)' }} /> Reservas Activas e Información de Ocupación
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
              Consulta informativa de reservas confirmadas, huéspedes asignados, planes de estancia y saldos.
            </div>
          </div>

          {/* Selector de filtro: solo de esta finca o todas */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${filtroFincaReservas === 'esta_finca' ? 'btn-primary' : ''}`}
              onClick={() => {
                setFiltroFincaReservas('esta_finca');
                setFechaInspeccionada(null);
              }}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
            >
              Finca actual ({fincaActual?.nombre || 'Seleccionada'})
            </button>
            <button
              className={`btn btn-sm ${filtroFincaReservas === 'todas' ? 'btn-primary' : ''}`}
              onClick={() => {
                setFiltroFincaReservas('todas');
                setFechaInspeccionada(null);
              }}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
            >
              Todas las fincas ({reservas.filter(r => r.estado === 'activa').length})
            </button>
          </div>
        </div>

        {/* Notificación contextual si el administrador seleccionó una fecha específica */}
        {fechaInspeccionada && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              marginBottom: '0.85rem',
              padding: '0.55rem 0.85rem',
              background: 'var(--surface-2)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={15} style={{ color: 'var(--primary)' }} />
              Mostrando información para el día seleccionado: <strong>{formatFecha(fechaInspeccionada)}</strong>
              {reservasPorFecha.get(fechaInspeccionada) && (
                <span className="status-badge s-busy" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>
                  Reserva encontrada
                </span>
              )}
            </span>
            <button
              className="btn btn-sm"
              style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
              onClick={() => setFechaInspeccionada(null)}
            >
              Ver todas las reservas activas
            </button>
          </div>
        )}

        {/* Tabla o tarjetas de reservas activas */}
        <div className="avail-table">
          {(() => {
            const reservaDelDia = fechaInspeccionada ? reservasPorFecha.get(fechaInspeccionada) : null;
            const listaReservas = fechaInspeccionada
              ? (reservaDelDia ? [reservaDelDia] : [])
              : reservasActivas;

            if (fechaInspeccionada && !reservaDelDia) {
              return (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Calendar size={32} style={{ margin: '0 auto 0.65rem', opacity: 0.4 }} />
                  <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    No hay reservas activas registradas para el día {formatFecha(fechaInspeccionada)} en {fincaActual?.nombre || 'esta finca'}.
                  </p>
                  <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                    La fecha permanece libre para nuevas solicitudes o bloqueos administrativos.
                  </p>
                  <button
                    className="btn btn-sm"
                    style={{ marginTop: '0.85rem', fontSize: '0.75rem' }}
                    onClick={() => setFechaInspeccionada(null)}
                  >
                    Ver todas las reservas activas
                  </button>
                </div>
              );
            }

            if (listaReservas.length === 0) {
              return (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Calendar size={32} style={{ margin: '0 auto 0.65rem', opacity: 0.4 }} />
                  <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    No hay reservas activas registradas {filtroFincaReservas === 'esta_finca' ? `para ${fincaActual?.nombre || 'esta finca'}` : ''}.
                  </p>
                  <p className="text-xs text-muted">
                    Las fechas permanecen disponibles para nuevas cotizaciones y reservas.
                  </p>
                </div>
              );
            }

            return listaReservas.map(r => {
              const saldo = calcularSaldo(r);
              const totalPagado = r.valor_total - saldo;
              const clienteNombre = r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.trim() : '—';
              const clienteTel = r.clientes?.whatsapp || r.clientes?.telefono;
              const fincaNombre = r.fincas?.nombre || fincaActual?.nombre || '—';
              const expanded = reservaExpandida === r.id;

              const hoy = getFechaHoyLocal();
              const estanciaVencida = r.estado === 'activa' && r.fecha_fin < hoy;

              // Identificar plan de alimentación adjunto
              const tienePlanAlimentacion = Boolean(r.menu_id || r.alimentacion || (r.costo_alimentacion && r.costo_alimentacion > 0));
              const nombrePlan = r.menus?.nombre || r.alimentacion || 'Plan con menú especial';

              return (
                <div key={r.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', paddingTop: '0.75rem' }}>
                  {/* Alerta informativa de estancia finalizada si aplica */}
                  {estanciaVencida && (
                    <div
                      style={{
                        background: 'rgba(245, 158, 11, 0.12)',
                        borderLeft: '4px solid #f59e0b',
                        padding: '0.4rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.76rem',
                        color: '#b45309',
                        fontWeight: 600,
                        gap: '0.5rem',
                        marginBottom: '0.5rem',
                        borderRadius: '4px',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <AlertTriangle size={13} /> Estancia finalizada ({formatFecha(r.fecha_fin)}) · Pendiente de cierre y liquidación en módulo Reservas
                      </span>
                    </div>
                  )}

                  {/* Fila principal de datos de la reserva */}
                  <div className="avail-row" style={{ borderBottom: 'none', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: 'min(100%, 280px)' }}>
                      {/* Título: Finca, Consecutivo y Estado */}
                      <div style={{ fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.95rem' }}>{fincaNombre}</span>
                        <span className="status-badge s-avail" style={{ fontSize: '0.68rem' }}>activa</span>
                        {r.consecutivo && <ConsecutivoBadge consecutivo={r.consecutivo} />}
                      </div>

                      {/* Huésped y Contacto */}
                      <div className="text-xs text-muted" style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <span>👤 <strong>{clienteNombre}</strong></span>
                        {clienteTel && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontWeight: 600,
                              color: '#25d366',
                              background: 'rgba(37, 211, 102, 0.1)',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                            }}
                          >
                            <MessageCircle size={11} /> {clienteTel}
                          </span>
                        )}
                        <span>·</span>
                        <span>
                          <Calendar size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> {formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}
                        </span>
                        <span>·</span>
                        <span>👥 {r.personas} personas</span>
                      </div>

                      {/* Badge de Plan de Alimentación Adjunto */}
                      <div style={{ marginTop: '0.4rem' }}>
                        {tienePlanAlimentacion ? (
                          <span className="food-plan-badge-pill" title="Plan de alimentación contratado">
                            <UtensilsCrossed size={12} />
                            <strong>Plan Alimentación:</strong> {nombrePlan}
                            {r.costo_alimentacion ? ` (${formatCOP(r.costo_alimentacion)})` : ''}
                          </span>
                        ) : (
                          <span className="food-plan-badge-pill none">
                            🍃 Sin plan de alimentación adjunto
                          </span>
                        )}
                      </div>

                      {/* Resumen Financiero: Total, Pagado, Saldo */}
                      <div style={{ marginTop: '0.45rem', display: 'flex', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
                        <span>Total: <strong>{formatCOP(r.valor_total)}</strong></span>
                        <span>Abonado: <strong style={{ color: 'var(--success)' }}>{formatCOP(totalPagado)}</strong></span>
                        <span>
                          Saldo: <strong style={{ color: saldo > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCOP(saldo)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Información de estado y detalle de abonos (sin botones de acción operativa) */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span
                        className="status-badge"
                        style={{
                          fontSize: '0.74rem',
                          padding: '0.25rem 0.6rem',
                          background: saldo <= 0 ? 'rgba(77, 168, 158, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: saldo <= 0 ? 'var(--primary)' : 'var(--danger)',
                          borderColor: saldo <= 0 ? 'rgba(77, 168, 158, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                          fontWeight: 600,
                          gap: '0.35rem',
                        }}
                      >
                        {saldo <= 0 ? '🏆 Al día / Paz y salvo' : `Saldo: ${formatCOP(saldo)}`}
                      </span>

                      <button
                        className="btn btn-sm"
                        onClick={() => setReservaExpandida(expanded ? null : r.id)}
                        title={expanded ? 'Ocultar desglose de pagos' : 'Ver historial de pagos'}
                        style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', gap: '0.35rem' }}
                      >
                        <CreditCard size={12} /> {r.pagos?.length || 0} abono(s) {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Panel expandido: historial informativo de pagos y abonos */}
                  {expanded && (
                    <div style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)', marginTop: '0.5rem', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FileCheck size={14} style={{ color: 'var(--primary)' }} /> Historial informativo de abonos registrados
                      </div>

                      {(!r.pagos || r.pagos.length === 0) ? (
                        <p className="text-muted" style={{ fontSize: '0.78rem' }}>Sin pagos o abonos registrados aún.</p>
                      ) : (
                        <div style={{ display: 'grid', gap: '0.35rem' }}>
                          {r.pagos.map((p: Pago) => (
                            <div key={p.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span className="status-badge" style={{ fontSize: '0.67rem', minWidth: '75px', justifyContent: 'center' }}>
                                {p.tipo}
                              </span>
                              <span className="text-muted">{formatFecha(p.fecha)}</span>
                              <span style={{ fontWeight: 600, color: p.tipo === 'devolucion' ? 'var(--danger)' : 'var(--success)' }}>
                                {p.tipo === 'devolucion' ? '−' : '+'}{formatCOP(p.valor)}
                              </span>
                              {p.observacion && <span className="text-muted" style={{ fontStyle: 'italic' }}>({p.observacion})</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span className="text-muted">Saldo restante por amortizar:</span>
                        <strong style={{ color: saldo > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCOP(saldo)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>

        <div className="text-xs text-muted" style={{ padding: '0.75rem 1rem 0.25rem', borderTop: '1px solid var(--border)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          ℹ️ <strong>Módulo de Disponibilidad:</strong> Vista de inspección y ocupación en vivo. Para registrar abonos, emitir PDFs de contratos o liquidar reservas, accede al módulo principal de <strong>Reservas</strong>.
        </div>
      </div>

      {/* ─── MODAL PARA REGISTRAR PAGO / ABONO ───────────────────────────────── */}
      {pagoReservaId && (
        <div className="modal-overlay" onClick={() => setPagoReservaId(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div className="panel-title"><CreditCard size={16} /> Registrar abono / pago</div>
              <button className="btn btn-sm" onClick={() => setPagoReservaId(null)}><X size={14} /></button>
            </div>
            <form onSubmit={handleRegistrarPago} style={{ display: 'grid', gap: '0.75rem', padding: '1.25rem' }}>
              <div className="field">
                <label>Tipo de pago</label>
                <select value={pagoForm.tipo} onChange={e => setPagoForm(p => ({ ...p, tipo: e.target.value as PagoTipo }))}>
                  {TIPOS_PAGO.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Fecha</label>
                <input type="date" value={pagoForm.fecha} onChange={e => setPagoForm(p => ({ ...p, fecha: e.target.value }))} />
              </div>
              <div className="field">
                <label>Valor (COP)</label>
                <CurrencyInput
                  value={pagoForm.valor}
                  onChange={val => setPagoForm(p => ({ ...p, valor: val }))}
                  placeholder="0"
                />
              </div>
              <div className="field">
                <label>Observación (Referencia, banco, etc.)</label>
                <input
                  value={pagoForm.observacion}
                  onChange={e => setPagoForm(p => ({ ...p, observacion: e.target.value }))}
                  placeholder="Ej: Transferencia Bancolombia #12345"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn" onClick={() => setPagoReservaId(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardandoPago}>
                  <Save size={14} /> {guardandoPago ? 'Registrando…' : 'Registrar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODALES DE EXPEDIENTE, CIERRE Y WHATSAPP ──────────────────────── */}
      {modalWaReserva.abierto && modalWaReserva.reserva && (
        <WhatsAppModal
          isOpen={modalWaReserva.abierto}
          onClose={() => setModalWaReserva(p => ({ ...p, abierto: false }))}
          titulo={modalWaReserva.titulo}
          destinatarioNombre={modalWaReserva.reserva.clientes ? `${modalWaReserva.reserva.clientes.nombre} ${modalWaReserva.reserva.clientes.apellido || ''}`.trim() : 'Cliente'}
          telefonoInicial={modalWaReserva.reserva.clientes?.whatsapp || modalWaReserva.reserva.clientes?.telefono || ''}
          mensajeInicial={modalWaReserva.mensaje}
          nombreDocumento={modalWaReserva.nombreDoc}
          onGenerarPdf={modalWaReserva.onGenerarPdf}
          onDespuesDeEnviar={(tel: string, msg: string) => {
            showToast('Mensaje de WhatsApp enviado al cliente ✅', 'success');
            onRegistrarComunicacion?.({
              cliente_id: modalWaReserva.reserva?.cliente_id || null,
              reserva_id: modalWaReserva.reserva?.id || null,
              tipo: modalWaReserva.tipo,
              destinatario: modalWaReserva.reserva?.clientes ? `${modalWaReserva.reserva.clientes.nombre} ${modalWaReserva.reserva.clientes.apellido || ''}`.trim() : 'Cliente',
              telefono: tel,
              mensaje: msg,
              estado: 'enviado',
            });
          }}
        />
      )}

      {reservaParaCierre && onCerrarReserva && (
        <AdminCierreModal
          isOpen={!!reservaParaCierre}
          reserva={reservaParaCierre}
          userEmail={userEmail}
          onClose={() => setReservaParaCierre(null)}
          onConfirmarCierre={async (datosCierre, pagoLiq) => {
            const res = await onCerrarReserva(reservaParaCierre.id, datosCierre, pagoLiq);
            if (!res.success) {
              throw new Error(res.error || 'Error al cerrar reserva');
            }
          }}
          showToast={showToast}
        />
      )}

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
    </div>
  );
};

export default AdminCalendar;
