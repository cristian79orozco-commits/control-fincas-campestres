import React from 'react';
import { motion } from 'framer-motion';
import { UtensilsCrossed, AlertCircle, Check, ShoppingBag, Clock } from 'lucide-react';
import type { AlertaCompraAlimentacion } from '../../hooks/useAdminOverviewController';

interface DashboardAlertaComprasProps {
  alertas: AlertaCompraAlimentacion[];
  onMarcarCompras: (reservaId: string, listas: boolean) => void;
}

export const DashboardAlertaCompras: React.FC<DashboardAlertaComprasProps> = ({
  alertas,
  onMarcarCompras,
}) => {
  const pendientes = alertas.filter((a) => !a.comprasListas);
  if (pendientes.length === 0) return null;

  return (
    <motion.div
      className="panel dashboard-glass-panel"
      style={{
        borderLeft: '4px solid var(--accent, #d4924a)',
        padding: '1.1rem 1.35rem',
        background: 'color-mix(in srgb, var(--surface) 96%, var(--accent) 4%)',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'color-mix(in srgb, var(--accent) 18%, transparent)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShoppingBag size={18} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text)' }}>
              Alerta de Compras & Mercado para Alimentación ({pendientes.length})
            </span>
            <span
              className="dashboard-glow-badge"
              style={{
                background: 'color-mix(in srgb, var(--accent) 20%, transparent)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}
            >
              Llegadas en 72h
            </span>
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>
            Prepara insumos y mercado de los menús contratados antes del ingreso de los huéspedes
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '0.6rem' }}>
        {pendientes.map((item) => {
          const tiempoStr = item.diasFaltantes === 0 ? '¡Llega HOY!' : item.diasFaltantes === 1 ? 'Llega MAÑANA' : `Llega en ${item.diasFaltantes} días`;
          return (
            <div
              key={item.reservaId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0.7rem 0.9rem',
                borderRadius: '10px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ flex: '1 1 250px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text)' }}>
                    {item.fincaNombre}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--accent)',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                    }}
                  >
                    <Clock size={11} /> {tiempoStr}
                  </span>
                </div>
                <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
                  Huésped: <strong style={{ color: 'var(--text)' }}>{item.clienteNombre}</strong> · Menú:{' '}
                  <strong style={{ color: 'var(--accent)' }}>{item.menuNombre}</strong> ({item.comensales} personas)
                </div>
              </div>

              <motion.button
                type="button"
                className="btn btn-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onMarcarCompras(item.reservaId, true)}
                title="Marcar que las compras e insumos ya están listos"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  background: 'color-mix(in srgb, var(--accent) 18%, transparent)',
                  color: 'var(--accent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  padding: '0.5rem 0.85rem',
                  minHeight: '44px',
                  minWidth: '44px',
                  borderRadius: '8px',
                }}
              >
                <Check size={14} />
                <span>Marcar Compras Listas</span>
              </motion.button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

