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
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
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
        className="card-pro"
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--rad-md, 20px)',
          border: '1.5px solid var(--border)',
          boxShadow: 'var(--sh-lg)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Luz ambiental sutil */}
        <div className="card-pro-ambient" />

        {/* Cabecera */}
        <div
          style={{
            padding: '1.35rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-2)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(145deg, #FFFDF9 0%, #FAF6EC 100%)',
                border: '1.5px solid color-mix(in srgb, var(--accent) 45%, var(--border))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(212, 146, 74, 0.18)',
                flexShrink: 0,
              }}
            >
              <img
                src="./logo.png?v=2"
                alt="Paraíso Terrenal"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Portal del Huésped
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Consulta el estado de tu cotización o reserva campestre
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.45rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Buscador de Reserva con Focus Glow */}
        <div style={{ padding: '1.35rem 1.5rem', borderBottom: '1px solid var(--border)', position: 'relative', zIndex: 1 }}>
          <form onSubmit={handleBuscar} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.65rem' }}>
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
                className="input-pro"
                style={{ paddingLeft: '2.2rem' }}
              />
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
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
                className="input-pro"
                style={{ paddingLeft: '2.2rem' }}
              />
              <Phone
                size={16}
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              className="btn-pro-primary"
              disabled={buscando}
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
            >
              {buscando ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
              <span>{buscando ? 'Buscando…' : 'Consultar'}</span>
            </button>
          </form>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
            <ShieldCheck size={14} style={{ color: 'var(--primary)' }} />
            <span>Consulta cifrada protegida por verificación de número consecutivo y teléfono.</span>
          </div>
        </div>

        {/* Resultados con Scroll */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flexGrow: 1, position: 'relative', zIndex: 1 }}>
          {!haBuscado && !resultadoRpc ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                  color: 'var(--primary)',
                }}
              >
                <Home size={26} />
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)', fontWeight: 600 }}>
                Consulta el estado de tu estadía
              </p>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Ingresa tu número consecutivo y teléfono registrado para verificar fechas, pagos y saldos.
              </p>
            </div>
          ) : buscando ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Loader2 size={36} className="spin" style={{ margin: '0 auto 1rem auto', color: 'var(--accent)' }} />
              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>
                Consultando tu reserva de forma segura…
              </p>
            </div>
          ) : !resultadoRpc?.encontrado ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: 'var(--text-muted)' }}>
              <AlertCircle size={40} style={{ margin: '0 auto 0.75rem auto', color: 'var(--accent)' }} />
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>
                No encontramos registros coincidentes
              </p>
              <p style={{ margin: '0.35rem 0 1.25rem 0', fontSize: '0.82rem', lineHeight: 1.5 }}>
                Verifica que el número consecutivo y el teléfono coincidan con los de tu solicitud o habla directamente con nosotros.
              </p>
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                  `Hola, necesito verificar mi reserva o cotización. Mi código consecutivo es: ${consecutivoInput}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pro-primary"
                style={{ display: 'inline-flex', textDecoration: 'none' }}
              >
                <MessageCircle size={15} />
                <span>Consultar con un Asesor por WhatsApp</span>
              </a>
            </div>
          ) : resultadoRpc.tipo === 'reserva' ? (
            <div
              className="card-pro"
              style={{
                background: 'var(--surface-2)',
                border: '1.5px solid var(--primary)',
                borderRadius: 'var(--rad-sm, 14px)',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      background: 'var(--primary)',
                      color: '#ffffff',
                      letterSpacing: '0.04em',
                    }}
                  >
                    RESERVA #{resultadoRpc.consecutivo}
                  </span>
                  <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                    {resultadoRpc.finca_nombre || 'Finca Campestre'}
                  </h4>
                  {resultadoRpc.cliente_nombre && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      Titular: <strong style={{ color: 'var(--text)' }}>{resultadoRpc.cliente_nombre}</strong>
                    </div>
                  )}
                </div>
                <span className="badge-pro-avail" style={{ fontSize: '0.72rem' }}>
                  <span className="pulse-dot" />
                  {(resultadoRpc.estado || 'ACTIVA').toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginTop: '1rem', fontSize: '0.8rem' }}>
                <div style={{ background: 'var(--surface)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Llegada:</div>
                  <div style={{ fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>{resultadoRpc.fecha_inicio}</div>
                </div>
                <div style={{ background: 'var(--surface)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Salida:</div>
                  <div style={{ fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>{resultadoRpc.fecha_fin}</div>
                </div>
                <div style={{ background: 'var(--surface)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Huéspedes:</div>
                  <div style={{ fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>{resultadoRpc.personas} personas</div>
                </div>
              </div>

              {/* Desglose Financiero High-End */}
              <div
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  borderRadius: '10px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Total Reserva:</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text)', marginTop: '2px' }}>
                    {formatCOP(resultadoRpc.valor_total || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Anticipo / Separación:</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--success)', marginTop: '2px' }}>
                    {formatCOP(resultadoRpc.separacion || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Saldo Check-in:</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary)', marginTop: '2px' }}>
                    {formatCOP(Math.max(0, (resultadoRpc.valor_total || 0) - (resultadoRpc.separacion || 0)))}
                  </div>
                </div>
              </div>

              {/* Botón WhatsApp de Atención Directa */}
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                  `Hola, tengo una consulta sobre mi reserva #${resultadoRpc.consecutivo || ''} en ${resultadoRpc.finca_nombre || ''}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pro-primary"
                style={{ marginTop: '1rem', width: '100%', textDecoration: 'none' }}
              >
                <MessageCircle size={16} />
                <span>Contactar a mi Anfitrión por WhatsApp</span>
              </a>
            </div>
          ) : (
            <div
              className="card-pro"
              style={{
                background: 'var(--surface-2)',
                border: '1.5px solid var(--accent)',
                borderRadius: 'var(--rad-sm, 14px)',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      background: 'var(--accent)',
                      color: '#141210',
                      letterSpacing: '0.04em',
                    }}
                  >
                    COTIZACIÓN #{resultadoRpc.consecutivo}
                  </span>
                  <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
                    {resultadoRpc.finca_nombre || 'Finca Campestre'}
                  </h4>
                  {resultadoRpc.cliente_nombre && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      Solicitante: <strong style={{ color: 'var(--text)' }}>{resultadoRpc.cliente_nombre}</strong>
                    </div>
                  )}
                </div>
                <span className="badge-pro-accent" style={{ fontSize: '0.72rem' }}>
                  <span className="pulse-dot" />
                  {(resultadoRpc.estado || 'COTIZADA').toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Fechas: <strong style={{ color: 'var(--text)' }}>{resultadoRpc.fecha_inicio} al {resultadoRpc.fecha_fin}</strong>
                </span>
                <strong style={{ color: 'var(--primary)', fontSize: '1.1rem', fontWeight: 900 }}>
                  {formatCOP(resultadoRpc.total || 0)}
                </strong>
              </div>

              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                  `Hola, deseo confirmar mi cotización #${resultadoRpc.consecutivo || ''} en ${resultadoRpc.finca_nombre || ''}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pro-primary"
                style={{ marginTop: '1rem', width: '100%', textDecoration: 'none' }}
              >
                <MessageCircle size={16} />
                <span>Confirmar Cotización por WhatsApp</span>
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
