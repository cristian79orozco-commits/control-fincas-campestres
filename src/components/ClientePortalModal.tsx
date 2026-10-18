import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  FileCheck2,
  Calendar,
  Users,
  MessageCircle,
  Clock,
  AlertCircle,
  Home,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import type { Reserva, CotizacionDB, Finca } from '../types';
import { desglosarFinanzasReserva } from '../types';

interface ClientePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservas: Reserva[];
  cotizaciones: CotizacionDB[];
  fincas: Finca[];
  waNumber: string;
}

function formatCOP(v: number): string {
  return '$' + Math.round(v || 0).toLocaleString('es-CO') + ' COP';
}

export const ClientePortalModal: React.FC<ClientePortalModalProps> = ({
  isOpen,
  onClose,
  reservas,
  cotizaciones,
  fincas,
  waNumber,
}) => {
  const [criterio, setCriterio] = useState('');
  const [haBuscado, setHaBuscado] = useState(false);

  if (!isOpen) return null;

  const q = criterio.trim().toLowerCase();

  // Buscar en reservas
  const reservasEncontradas = reservas.filter((r) => {
    if (!q) return false;
    const consecutivo = (r.consecutivo || '').toLowerCase();
    const clienteNombre = (r.clientes?.nombre || '').toLowerCase();
    const clienteTel = (r.clientes?.whatsapp || r.clientes?.telefono || '').toLowerCase();
    return consecutivo.includes(q) || clienteTel.includes(q) || clienteNombre.includes(q);
  });

  // Buscar en cotizaciones
  const cotizacionesEncontradas = cotizaciones.filter((c) => {
    if (!q) return false;
    const consecutivo = (c.consecutivo || '').toLowerCase();
    const clienteNombre = (c.clientes?.nombre || '').toLowerCase();
    const clienteTel = (c.clientes?.whatsapp || '').toLowerCase();
    return consecutivo.includes(q) || clienteTel.includes(q) || clienteNombre.includes(q);
  });

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setHaBuscado(true);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--rad-md, 18px)',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--sh-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '1.25rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-2)',
          }}
        >
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
              <FileCheck2 size={20} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
                Portal del Huésped
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Consulta el estado de tu cotización o reserva campestre
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '50%',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Buscador */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
          <form onSubmit={handleBuscar} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flexGrow: 1 }}>
              <input
                type="text"
                placeholder="Ingresa tu número consecutivo (ej: 1001) o teléfono..."
                value={criterio}
                onChange={(e) => {
                  setCriterio(e.target.value);
                  setHaBuscado(false);
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.2rem',
                  borderRadius: 'var(--rad-xs, 8px)',
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                }}
              />
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem', fontWeight: 700 }}
            >
              Consultar
            </button>
          </form>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
            Tip: Puedes buscar por el consecutivo de tu documento oficial o tu número de WhatsApp.
          </div>
        </div>

        {/* Resultados con Scroll */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flexGrow: 1 }}>
          {!haBuscado && !q ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <Home size={38} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Ingresa tu código consecutivo o teléfono para verificar tu fecha y saldo.
              </p>
            </div>
          ) : reservasEncontradas.length === 0 && cotizacionesEncontradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <AlertCircle size={36} style={{ margin: '0 auto 0.6rem auto', color: 'var(--accent)' }} />
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text)' }}>
                No encontramos registros para "{criterio}"
              </p>
              <p style={{ margin: '0.3rem 0 1rem 0', fontSize: '0.8rem' }}>
                Verifica que el número coincida exactamente o escríbenos directamente a WhatsApp.
              </p>
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                  `Hola, necesito verificar mi reserva o cotización. Mi número o código es: ${criterio}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <MessageCircle size={14} /> Consultar por WhatsApp
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Reservas Encontradas */}
              {reservasEncontradas.map((r) => {
                const fin = fincas.find((f) => f.id === r.finca_id);
                const finanzas = desglosarFinanzasReserva(r);
                return (
                  <div
                    key={r.id}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1.5px solid var(--primary)',
                      borderRadius: 'var(--rad-sm, 12px)',
                      padding: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            background: 'var(--primary)',
                            color: '#ffffff',
                          }}
                        >
                          RESERVA #{r.consecutivo || r.id.slice(0, 6)}
                        </span>
                        <h4 style={{ margin: '0.35rem 0 0 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
                          {fin?.nombre || r.fincas?.nombre || 'Finca Campestre'}
                        </h4>
                      </div>
                      <span className="status-badge s-avail" style={{ fontSize: '0.72rem' }}>
                        {r.estado.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginTop: '0.75rem', fontSize: '0.78rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Llegada:</div>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{r.fecha_inicio}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Salida:</div>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{r.fecha_fin}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Huéspedes:</div>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{r.personas} personas</div>
                      </div>
                    </div>

                    {/* Desglose Financiero */}
                    <div
                      style={{
                        marginTop: '0.85rem',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Reserva:</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)' }}>
                          {formatCOP(r.valor_total)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Abonado:</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--success)' }}>
                          {formatCOP(finanzas.totalRecaudado)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Saldo Check-in:</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--primary)' }}>
                          {formatCOP(finanzas.saldoConsolidado)}
                        </div>
                      </div>
                    </div>

                    {/* Botón WhatsApp de Atención */}
                    <a
                      href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                        `Hola, tengo una consulta sobre mi reserva #${r.consecutivo || ''} en ${fin?.nombre || ''} (${r.fecha_inicio} a ${r.fecha_fin}).`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-primary"
                      style={{ marginTop: '0.85rem', width: '100%', justifyContent: 'center', gap: '0.4rem' }}
                    >
                      <MessageCircle size={15} /> Contactar a mi Anfitrión por WhatsApp
                    </a>
                  </div>
                );
              })}

              {/* Cotizaciones Encontradas */}
              {cotizacionesEncontradas.map((c) => {
                const fin = fincas.find((f) => f.id === c.finca_id);
                return (
                  <div
                    key={c.id}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--rad-sm, 12px)',
                      padding: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            background: 'var(--accent)',
                            color: '#ffffff',
                          }}
                        >
                          COTIZACIÓN #{c.consecutivo || c.id.slice(0, 6)}
                        </span>
                        <h4 style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>
                          {fin?.nombre || c.fincas?.nombre || 'Finca Campestre'}
                        </h4>
                      </div>
                      <span className="status-badge s-warn" style={{ fontSize: '0.72rem' }}>
                        {c.estado.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.65rem', fontSize: '0.8rem' }}>
                      <span>Fechas: {c.fecha_inicio} al {c.fecha_fin}</span>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>{formatCOP(c.total)}</strong>
                    </div>

                    <a
                      href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                        `Hola, deseo confirmar mi cotización #${c.consecutivo || ''} en ${fin?.nombre || ''}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline"
                      style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center', gap: '0.4rem' }}
                    >
                      <MessageCircle size={15} /> Confirmar Cotización por WhatsApp
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
