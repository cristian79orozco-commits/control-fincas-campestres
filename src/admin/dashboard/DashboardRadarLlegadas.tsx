import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  Clock,
  UtensilsCrossed,
  MessageCircle,
  Home,
  ChevronRight,
  Filter,
  CheckCircle,
} from 'lucide-react';
import type { RadarLlegadaItem } from '../../hooks/useAdminOverviewController';
import { abrirWhatsApp } from '../../services/whatsapp';

interface DashboardRadarLlegadasProps {
  radarLlegadas: RadarLlegadaItem[];
  onVerTodasReservas: () => void;
  formatCOP: (v: number) => string;
}

export const DashboardRadarLlegadas: React.FC<DashboardRadarLlegadasProps> = ({
  radarLlegadas,
  onVerTodasReservas,
  formatCOP,
}) => {
  const [filtro, setFiltro] = useState<'todas' | 'urgentes' | 'con_menu'>('todas');

  const llegadasFiltradas = radarLlegadas.filter((item) => {
    if (filtro === 'urgentes') return item.esHoy || item.esManana || item.diasFaltantes <= 3;
    if (filtro === 'con_menu') return item.tieneAlimentacion;
    return true;
  });

  return (
    <motion.div
      className="panel dashboard-glass-panel"
      style={{
        padding: '1.15rem 1.35rem',
        borderLeft: '4px solid var(--primary)',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Cabecera del Radar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={17} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>
                Radar de Llegadas & Fechas Activas
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
                }}
              >
                {radarLlegadas.length} en cronograma
              </span>
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>
              Cuenta regresiva y logística de entradas a cada una de tus fincas
            </div>
          </div>
        </div>

        {/* Filtros rápidos & Botón ver todas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--surface-2)',
              padding: '0.2rem',
              borderRadius: '8px',
              gap: '0.2rem',
            }}
          >
            <button
              type="button"
              onClick={() => setFiltro('todas')}
              style={{
                background: filtro === 'todas' ? 'var(--surface)' : 'transparent',
                color: filtro === 'todas' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: filtro === 'todas' ? 700 : 500,
                fontSize: '0.74rem',
                padding: '0.3rem 0.6rem',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Todas ({radarLlegadas.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltro('urgentes')}
              style={{
                background: filtro === 'urgentes' ? 'var(--surface)' : 'transparent',
                color: filtro === 'urgentes' ? '#ea580c' : 'var(--text-muted)',
                fontWeight: filtro === 'urgentes' ? 700 : 500,
                fontSize: '0.74rem',
                padding: '0.3rem 0.6rem',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Próximas 72h
            </button>
            <button
              type="button"
              onClick={() => setFiltro('con_menu')}
              style={{
                background: filtro === 'con_menu' ? 'var(--surface)' : 'transparent',
                color: filtro === 'con_menu' ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: filtro === 'con_menu' ? 700 : 500,
                fontSize: '0.74rem',
                padding: '0.3rem 0.6rem',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Con Menú
            </button>
          </div>

          <button
            type="button"
            className="btn btn-sm"
            onClick={onVerTodasReservas}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              minHeight: '44px',
              padding: '0 0.75rem',
            }}
          >
            <span>Ver Reservas</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Lista interactiva compacta */}
      {llegadasFiltradas.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '1.5rem',
            background: 'var(--surface-2)',
            borderRadius: '10px',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}
        >
          No hay llegadas programadas con el filtro seleccionado.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.55rem' }}>
          {llegadasFiltradas.map((item) => {
            const badgeBg = item.esHoy
              ? 'rgba(239, 68, 68, 0.15)'
              : item.esManana
              ? 'rgba(234, 88, 12, 0.15)'
              : item.enCurso
              ? 'rgba(22, 163, 74, 0.15)'
              : 'rgba(59, 130, 246, 0.12)';

            const badgeColor = item.esHoy
              ? '#ef4444'
              : item.esManana
              ? '#ea580c'
              : item.enCurso
              ? '#16a34a'
              : '#3b82f6';

            const badgeBorder = item.esHoy
              ? 'rgba(239, 68, 68, 0.35)'
              : item.esManana
              ? 'rgba(234, 88, 12, 0.35)'
              : item.enCurso
              ? 'rgba(22, 163, 74, 0.35)'
              : 'rgba(59, 130, 246, 0.25)';

            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -1 }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '10px',
                  background: 'var(--surface-2)',
                  border: `1px solid ${item.esHoy ? 'rgba(239, 68, 68, 0.35)' : 'var(--border)'}`,
                  transition: 'border-color 0.2s ease, background 0.2s ease',
                }}
              >
                {/* Badge de Cuenta Regresiva & Finca */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 240px', minWidth: 0 }}>
                  <div
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '8px',
                      background: badgeBg,
                      color: badgeColor,
                      border: `1px solid ${badgeBorder}`,
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    {item.esHoy && <span className="dashboard-pulse-dot" style={{ background: '#ef4444' }} />}
                    <span>{item.etiquetaCuentaRegresiva}</span>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)' }}>
                        {item.fincaNombre}
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontFamily: 'monospace',
                          padding: '0.05rem 0.35rem',
                          borderRadius: '4px',
                          background: 'var(--surface)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {item.consecutivo}
                      </span>
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span>
                        Huésped: <strong style={{ color: 'var(--text)' }}>{item.clienteNombre}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        <Users size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> {item.personas} personas
                      </span>
                      <span>•</span>
                      <span>
                        {item.numNoches} noche{item.numNoches > 1 ? 's' : ''} ({item.diaMes})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logística de Menú & Botón WhatsApp al Huésped */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {item.tieneAlimentacion && (
                    <div
                      style={{
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        background: item.comprasAlimentacionListas
                          ? 'rgba(22, 163, 74, 0.12)'
                          : 'rgba(212, 146, 74, 0.15)',
                        color: item.comprasAlimentacionListas ? '#16a34a' : 'var(--accent)',
                        border: `1px solid ${item.comprasAlimentacionListas ? 'rgba(22, 163, 74, 0.25)' : 'rgba(212, 146, 74, 0.35)'}`,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                      title={`Menú contratado: ${item.menuNombre}`}
                    >
                      <UtensilsCrossed size={12} />
                      <span>{item.comprasAlimentacionListas ? 'Menú Listo' : 'Menú Pendiente'}</span>
                    </div>
                  )}

                  {item.clienteTelefono && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        const msj = `¡Hola ${item.clienteNombre}! 👋 Te saluda el administrador de fincas. Estamos preparando todo para tu estadía en ${item.fincaNombre}. ¿Tienes alguna inquietud previa a tu llegada?`;
                        abrirWhatsApp(item.clienteTelefono, msj);
                      }}
                      title="Enviar mensaje por WhatsApp al huésped"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        background: 'color-mix(in srgb, #25D366 14%, transparent)',
                        color: '#25D366',
                        border: '1px solid color-mix(in srgb, #25D366 30%, transparent)',
                        borderRadius: '8px',
                        padding: '0.45rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        minHeight: '44px',
                        minWidth: '44px',
                      }}
                    >
                      <MessageCircle size={14} />
                      <span>Chat Huésped</span>
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

