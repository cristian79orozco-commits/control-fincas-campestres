import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  AlertTriangle,
  TrendingUp,
  MessageCircle,
  CheckCircle,
  Clock,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Check,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import type { BrokerAlertaComision, ResumenComisionesBroker } from '../../hooks/useAdminOverviewController';

interface DashboardBrokerComisionesProps {
  resumen: ResumenComisionesBroker;
  alertas: BrokerAlertaComision[];
  onCobrarWhatsApp: (alerta: BrokerAlertaComision) => void;
  onMarcarCobrada: (reservaId: string, cobrada: boolean) => void;
  formatCOP: (v: number) => string;
}

export const DashboardBrokerComisiones: React.FC<DashboardBrokerComisionesProps> = ({
  resumen,
  alertas,
  onCobrarWhatsApp,
  onMarcarCobrada,
  formatCOP,
}) => {
  const [expandido, setExpandido] = useState(true);

  return (
    <div style={{ display: 'grid', gap: '0.9rem', width: '100%', maxWidth: '100%' }}>
      {/* ===== 1. TARJETAS KPI DE COMISIONES DEL BROKER (COMPACTAS) ===== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '0.85rem',
        }}
      >
        {/* KPI: Comisiones Cobradas / En Mano */}
        <motion.div
          className="kpi-card-3d"
          style={{ '--card-accent': '#16a34a', padding: '1rem' } as React.CSSProperties}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, fontSize: '0.72rem' }}>
              Mis Comisiones Cobradas
            </span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'color-mix(in srgb, #16a34a 15%, transparent)',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="font-dashboard tabular-nums" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#16a34a', marginTop: '0.35rem' }}>
            {formatCOP(resumen.comisionesCobradas)}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.3rem', fontSize: '0.72rem' }}>
            Efectivo recaudado de propietarios
          </div>
        </motion.div>

        {/* KPI: Comisiones por Cobrar a Dueños (Alertas Vencidas) */}
        <motion.div
          className="kpi-card-3d"
          style={{
            '--card-accent': resumen.comisionesPendientes > 0 ? '#ea580c' : 'var(--primary)',
            padding: '1rem',
            border: resumen.comisionesPendientes > 0 ? '1px solid color-mix(in srgb, #ea580c 40%, transparent)' : undefined,
          } as React.CSSProperties}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, fontSize: '0.72rem', color: resumen.comisionesPendientes > 0 ? '#ea580c' : 'var(--text-muted)' }}>
              Por Cobrar a Dueños
            </span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: resumen.comisionesPendientes > 0 ? 'color-mix(in srgb, #ea580c 18%, transparent)' : 'color-mix(in srgb, var(--primary) 15%, transparent)',
                color: resumen.comisionesPendientes > 0 ? '#ea580c' : 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={16} className={resumen.comisionesPendientes > 0 ? 'animate-pulse' : ''} />
            </div>
          </div>
          <div className="font-dashboard tabular-nums" style={{ fontSize: '1.45rem', fontWeight: 800, color: resumen.comisionesPendientes > 0 ? '#ea580c' : 'var(--text)', marginTop: '0.35rem' }}>
            {formatCOP(resumen.comisionesPendientes)}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.3rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            {resumen.totalAlertasPendientes > 0 ? (
              <span style={{ color: '#ea580c', fontWeight: 700 }}>
                ⚠️ {resumen.totalAlertasPendientes} estadía{resumen.totalAlertasPendientes > 1 ? 's' : ''} ya finalizada{resumen.totalAlertasPendientes > 1 ? 's' : ''}
              </span>
            ) : (
              <span>✓ Al día con todos los propietarios</span>
            )}
          </div>
        </motion.div>

        {/* KPI: Comisiones Proyectadas (Futuras) */}
        <motion.div
          className="kpi-card-3d"
          style={{ '--card-accent': 'var(--primary)', padding: '1rem' } as React.CSSProperties}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-lbl" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, fontSize: '0.72rem' }}>
              Comisiones Proyectadas
            </span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="font-dashboard tabular-nums" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.35rem' }}>
            {formatCOP(resumen.comisionesProyectadas)}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.3rem', fontSize: '0.72rem' }}>
            En reservas futuras activas
          </div>
        </motion.div>
      </div>

      {/* ===== 2. CENTRO DE COBRO AMIGABLE A PROPIETARIOS (ALERTAS ACTIVAS) ===== */}
      {alertas.length > 0 && (
        <motion.div
          className="panel dashboard-glass-panel"
          style={{
            borderLeft: '4px solid #ea580c',
            padding: '1.1rem 1.25rem',
            background: 'color-mix(in srgb, var(--surface) 95%, #ea580c 5%)',
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.6rem',
              cursor: 'pointer',
            }}
            onClick={() => setExpandido(!expandido)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'color-mix(in srgb, #ea580c 18%, transparent)',
                  color: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DollarSign size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text)' }}>
                    Comisiones Listas para Cobrar ({alertas.length})
                  </span>
                  <span
                    className="dashboard-glow-badge"
                    style={{
                      background: 'color-mix(in srgb, #ea580c 18%, transparent)',
                      color: '#ea580c',
                      border: '1px solid color-mix(in srgb, #ea580c 35%, transparent)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    Estadías Finalizadas
                  </span>
                </div>
                <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>
                  Los huéspedes ya salieron conforme. Escribe al dueño para cuadrar tu comisión en un tono amigable.
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            >
              {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>{expandido ? 'Plegar' : 'Ver Todas'}</span>
            </button>
          </div>

          <AnimatePresence>
            {expandido && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden', marginTop: '0.9rem' }}
              >
                <div style={{ display: 'grid', gap: '0.65rem' }}>
                  {alertas.map((alerta) => (
                    <div
                      key={alerta.reservaId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        padding: '0.75rem 0.9rem',
                        borderRadius: '10px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        transition: 'border-color 0.2s ease',
                      }}
                    >
                      {/* Información de la finca, propietario y huésped */}
                      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text)' }}>
                            {alerta.fincaNombre}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontFamily: 'monospace',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '5px',
                              background: 'var(--surface-2)',
                              color: 'var(--text-muted)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            {alerta.consecutivo}
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              color: '#ea580c',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                          >
                            <Clock size={11} /> Salieron el {alerta.fechaFinLegible}
                          </span>
                        </div>

                        <div className="text-xs text-muted" style={{ marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                          <span>
                            Dueño: <strong style={{ color: 'var(--text)' }}>{alerta.propietarioNombre}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Huésped: <strong style={{ color: 'var(--text)' }}>{alerta.clienteNombre}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Alojamiento: <strong>{formatCOP(alerta.subtotalAlojamiento)}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Monto de la comisión & Botones de Acción */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'right', minWidth: '105px' }}>
                          <div className="font-dashboard tabular-nums" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16a34a' }}>
                            {alerta.montoComisionFormateado}
                          </div>
                          <div className="text-xs text-muted" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
                            Comisión ({alerta.porcentajeComision}%)
                          </div>
                        </div>

                        {/* Botón WhatsApp amigable */}
                        <motion.button
                          type="button"
                          className="btn btn-sm"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onCobrarWhatsApp(alerta)}
                          title="Abrir chat de WhatsApp con el propietario con mensaje amigable listo"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            background: '#25D366',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            padding: '0.5rem 0.85rem',
                            minHeight: '44px',
                            minWidth: '44px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)',
                          }}
                        >
                          <MessageCircle size={15} />
                          <span>Cobrar por WhatsApp</span>
                        </motion.button>

                        {/* Botón Marcar Cobrada */}
                        <motion.button
                          type="button"
                          className="btn btn-sm"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onMarcarCobrada(alerta.reservaId, true)}
                          title="Marcar comisión como recibida en cuenta"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem',
                            background: 'var(--surface-2)',
                            color: 'var(--text)',
                            border: '1px solid var(--border)',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            padding: '0.5rem 0.75rem',
                            minHeight: '44px',
                            minWidth: '44px',
                            borderRadius: '8px',
                          }}
                        >
                          <Check size={14} style={{ color: '#16a34a' }} />
                          <span>Cobrada</span>
                        </motion.button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};
