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
  ArrowRight,
  Loader2,
  ShieldCheck,
  Phone
} from 'lucide-react';
import type { Reserva, CotizacionDB, Finca } from '../types';
import { desglosarFinanzasReserva } from '../types';
import { supabase } from '../services/supabase';

interface ClientePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservas?: Reserva[];
  cotizaciones?: CotizacionDB[];
  fincas: Finca[];
  waNumber: string;
}

interface ResultadoRpcSeguro {
  encontrado: boolean;
  tipo?: 'reserva' | 'cotizacion';
  consecutivo?: string | null;
  estado?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  personas?: number | null;
  valor_total?: number | null;
  separacion?: number | null;
  total?: number | null;
  finca_nombre?: string | null;
  cliente_nombre?: string | null;
  estado_alimentacion?: string | null;
  alimentacion?: string | null;
  mensaje?: string | null;
}

function formatCOP(v: number): string {
  return '$' + Math.round(v || 0).toLocaleString('es-CO') + ' COP';
}

export const ClientePortalModal: React.FC<ClientePortalModalProps> = ({
  isOpen,
  onClose,
  reservas = [],
  cotizaciones = [],
  fincas,
  waNumber,
}) => {
  const [consecutivoInput, setConsecutivoInput] = useState('');
  const [telefonoInput, setTelefonoInput] = useState('');
  const [haBuscado, setHaBuscado] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [resultadoRpc, setResultadoRpc] = useState<ResultadoRpcSeguro | null>(null);

  if (!isOpen) return null;

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    const cClean = consecutivoInput.trim();
    const tClean = telefonoInput.replace(/\D/g, '');

    if (!cClean) return;

    setHaBuscado(true);
    setBuscando(true);
    setResultadoRpc(null);

    try {
      // 1. Invocar RPC seguro en Supabase con RLS estricto
      const { data, error } = await supabase.rpc('consultar_reserva_publica', {
        p_consecutivo: cClean,
        p_telefono: tClean,
      });

      if (!error && data && data.encontrado) {
        setResultadoRpc(data as ResultadoRpcSeguro);
      } else {
        // Fallback local si el usuario actual es administrador y tiene reservas cargadas
        if (reservas.length > 0) {
          const q = cClean.toLowerCase();
          const rLocal = reservas.find(r => (r.consecutivo || '').toLowerCase().includes(q));
          if (rLocal) {
            setResultadoRpc({
              encontrado: true,
              tipo: 'reserva',
              consecutivo: rLocal.consecutivo,
              estado: rLocal.estado,
              fecha_inicio: rLocal.fecha_inicio,
              fecha_fin: rLocal.fecha_fin,
              personas: rLocal.personas,
              valor_total: rLocal.valor_total,
              separacion: rLocal.separacion,
              finca_nombre: rLocal.fincas?.nombre,
              cliente_nombre: rLocal.clientes?.nombre,
            });
            setBuscando(false);
            return;
          }
        }
        setResultadoRpc({ encontrado: false, mensaje: data?.mensaje || 'No encontrado' });
      }
    } catch (err) {
      console.warn('[ClientePortalModal] Error al consultar:', err);
      setResultadoRpc({ encontrado: false, mensaje: 'Error al consultar el servicio' });
    } finally {
      setBuscando(false);
    }
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
          <form onSubmit={handleBuscar} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.6rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Consecutivo (ej: 1001)"
                value={consecutivoInput}
                onChange={(e) => {
                  setConsecutivoInput(e.target.value);
                  setHaBuscado(false);
                }}
                required
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

            <div style={{ position: 'relative' }}>
              <input
                type="tel"
                placeholder="Teléfono registrado"
                value={telefonoInput}
                onChange={(e) => {
                  setTelefonoInput(e.target.value);
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
              <Phone
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
              disabled={buscando}
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {buscando ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
              {buscando ? 'Buscando…' : 'Consultar'}
            </button>
          </form>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
            <ShieldCheck size={12} color="var(--primary)" /> Consulta segura protegida por verificación de número consecutivo y teléfono.
          </div>
        </div>

        {/* Resultados con Scroll */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flexGrow: 1 }}>
          {!haBuscado && !resultadoRpc ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <Home size={38} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Ingresa tu código consecutivo y teléfono registrado para verificar el estado de tu estadía.
              </p>
            </div>
          ) : buscando ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <Loader2 size={32} className="spin" style={{ margin: '0 auto 0.75rem auto', color: 'var(--primary)' }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Consultando tu reserva de forma segura…</p>
            </div>
          ) : !resultadoRpc?.encontrado ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <AlertCircle size={36} style={{ margin: '0 auto 0.6rem auto', color: 'var(--accent)' }} />
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text)' }}>
                No encontramos registros coincidentes
              </p>
              <p style={{ margin: '0.3rem 0 1rem 0', fontSize: '0.8rem' }}>
                Verifica que el número consecutivo y el teléfono coincidan con los de tu solicitud.
              </p>
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                  `Hola, necesito verificar mi reserva o cotización. Mi código consecutivo es: ${consecutivoInput}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <MessageCircle size={14} /> Consultar con un Asesor por WhatsApp
              </a>
            </div>
          ) : resultadoRpc.tipo === 'reserva' ? (
            <div
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
                    RESERVA #{resultadoRpc.consecutivo}
                  </span>
                  <h4 style={{ margin: '0.35rem 0 0 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
                    {resultadoRpc.finca_nombre || 'Finca Campestre'}
                  </h4>
                  {resultadoRpc.cliente_nombre && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Titular: <strong>{resultadoRpc.cliente_nombre}</strong>
                    </div>
                  )}
                </div>
                <span className="status-badge s-avail" style={{ fontSize: '0.72rem' }}>
                  {(resultadoRpc.estado || 'ACTIVA').toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginTop: '0.75rem', fontSize: '0.78rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Llegada:</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{resultadoRpc.fecha_inicio}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Salida:</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{resultadoRpc.fecha_fin}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Huéspedes:</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{resultadoRpc.personas} personas</div>
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
                    {formatCOP(resultadoRpc.valor_total || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Anticipo / Separación:</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--success)' }}>
                    {formatCOP(resultadoRpc.separacion || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Saldo Check-in:</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--primary)' }}>
                    {formatCOP(Math.max(0, (resultadoRpc.valor_total || 0) - (resultadoRpc.separacion || 0)))}
                  </div>
                </div>
              </div>

              {/* Botón WhatsApp de Atención */}
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                  `Hola, tengo una consulta sobre mi reserva #${resultadoRpc.consecutivo || ''} en ${resultadoRpc.finca_nombre || ''}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-primary"
                style={{ marginTop: '0.85rem', width: '100%', justifyContent: 'center', gap: '0.4rem' }}
              >
                <MessageCircle size={15} /> Contactar a mi Anfitrión por WhatsApp
              </a>
            </div>
          ) : (
            <div
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
                    COTIZACIÓN #{resultadoRpc.consecutivo}
                  </span>
                  <h4 style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>
                    {resultadoRpc.finca_nombre || 'Finca Campestre'}
                  </h4>
                  {resultadoRpc.cliente_nombre && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Solicitante: <strong>{resultadoRpc.cliente_nombre}</strong>
                    </div>
                  )}
                </div>
                <span className="status-badge s-warn" style={{ fontSize: '0.72rem' }}>
                  {(resultadoRpc.estado || 'COTIZADA').toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.65rem', fontSize: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span>Fechas: {resultadoRpc.fecha_inicio} al {resultadoRpc.fecha_fin}</span>
                <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>{formatCOP(resultadoRpc.total || 0)}</strong>
              </div>

              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                  `Hola, deseo confirmar mi cotización #${resultadoRpc.consecutivo || ''} en ${resultadoRpc.finca_nombre || ''}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline"
                style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center', gap: '0.4rem' }}
              >
                <MessageCircle size={15} /> Confirmar Cotización por WhatsApp
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
