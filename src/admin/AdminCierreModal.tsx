import React, { useState } from 'react';
import {
  CheckCircle2, X, AlertTriangle, Star, Home, DollarSign,
  CreditCard, ShieldCheck, FileCheck, Check
} from 'lucide-react';
import type { Reserva, ReservaEstado, CierreReserva, EstadoEntregaFinca, PagoTipo } from '../types';
import {
  calcularSaldo,
  obtenerNombreClienteHistorico,
  obtenerNombreFincaHistorico,
} from '../types';
import { CurrencyInput } from '../components/CurrencyInput';

interface AdminCierreModalProps {
  isOpen: boolean;
  reserva: Reserva;
  userEmail?: string | null;
  onClose: () => void;
  onConfirmarCierre: (
    datosCierre: Partial<CierreReserva>,
    pagoLiquidacion?: { valor: number; tipo: PagoTipo; observacion?: string }
  ) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function formatCOP(v: number) {
  return '$' + v.toLocaleString('es-CO') + ' COP';
}

function formatFecha(f?: string) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

export const AdminCierreModal: React.FC<AdminCierreModalProps> = ({
  isOpen,
  reserva,
  userEmail,
  onClose,
  onConfirmarCierre,
  showToast,
}) => {
  if (!isOpen) return null;

  const saldo = calcularSaldo(reserva);
  const clienteNombre = obtenerNombreClienteHistorico(reserva);
  const fincaNombre = obtenerNombreFincaHistorico(reserva);

  // Formulario de cierre
  const [estadoFinal, setEstadoFinal] = useState<ReservaEstado>('completada');
  const [responsable, setResponsable] = useState(userEmail || 'Administrador');
  const [calificacion, setCalificacion] = useState<number>(5);
  const [estadoEntrega, setEstadoEntrega] = useState<EstadoEntregaFinca>('excelente');
  const [depositoDevuelto, setDepositoDevuelto] = useState(true);
  const [valorDeposito, setValorDeposito] = useState<number>(0);
  const [notasCierre, setNotasCierre] = useState(
    'Check-out efectuado con entrega conforme del inmueble. Todas las áreas verificadas a entera satisfacción.'
  );
  const [observacionesEntrega, setObservacionesEntrega] = useState('');

  // Opciones para saldar saldo pendiente si existe
  const [liquidarSaldo, setLiquidarSaldo] = useState(saldo > 0);
  const [tipoPagoLiquidacion, setTipoPagoLiquidacion] = useState<PagoTipo>('pago_total');
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const datosCierre: Partial<CierreReserva> = {
        reserva_id: reserva.id,
        estado_cierre: estadoFinal,
        fecha_cierre: new Date().toISOString(),
        responsable,
        calificacion,
        estado_entrega_finca: estadoEntrega,
        deposito_garantia_devuelto: depositoDevuelto,
        valor_deposito_devuelto: valorDeposito,
        notas_cierre: notasCierre,
        observaciones_entrega: observacionesEntrega || undefined,
      };

      const pagoLiq = liquidarSaldo && saldo > 0 ? {
        valor: saldo,
        tipo: tipoPagoLiquidacion,
        observacion: `Pago final de liquidación al cierre de estancia (${responsable})`,
      } : undefined;

      await onConfirmarCierre(datosCierre, pagoLiq);
      showToast('Reserva cerrada y archivada en el historial oficial ✅', 'success');
      onClose();
    } catch (err: any) {
      showToast(`Error al cerrar reserva: ${err.message || err}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="modal-box"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto' }}
      >
        <div className="modal-header">
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
              Cierre Formal de Reserva y Check-out
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
              Finalizar operación y archivar en el Expediente Histórico Oficial
            </div>
          </div>
          <button className="btn btn-sm" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Tarjeta resumen de la reserva a cerrar */}
        <div style={{ padding: '1rem 1.25rem 0', display: 'grid', gap: '0.75rem' }}>
          <div
            style={{
              background: 'var(--surface-alt, #f7f9f8)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--rad-xs)',
              padding: '0.75rem 1rem',
              display: 'grid',
              gap: '0.4rem',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{fincaNombre}</span>
              <span className="status-badge s-avail" style={{ fontSize: '0.7rem' }}>Reserva {reserva.id.slice(0, 8)}</span>
            </div>
            <div className="text-muted">
              Huésped titular: <strong>{clienteNombre}</strong> · {reserva.personas} personas
            </div>
            <div className="text-muted">
              Estancia: {formatFecha(reserva.fecha_inicio)} → {formatFecha(reserva.fecha_fin)}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border)' }}>
              <span>Total contratado: <strong>{formatCOP(reserva.valor_total)}</strong></span>
              <span style={{ color: saldo > 0 ? 'var(--danger)' : 'var(--success)' }}>
                Saldo actual: <strong>{formatCOP(saldo)}</strong>
              </span>
            </div>
          </div>

          {/* Alerta si hay saldo pendiente */}
          {saldo > 0 && (
            <div
              style={{
                border: '1px solid var(--warning, #f59e0b)',
                background: 'rgba(245, 158, 11, 0.08)',
                padding: '0.75rem 0.9rem',
                borderRadius: 'var(--rad-xs)',
                display: 'grid',
                gap: '0.5rem',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#b45309', fontWeight: 600 }}>
                <AlertTriangle size={15} /> Saldo pendiente por cobrar: {formatCOP(saldo)}
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                Para expedir el Paz y Salvo oficial y culminar con balance cero, puedes registrar el recaudo final en este mismo paso.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.25rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={liquidarSaldo}
                  onChange={e => setLiquidarSaldo(e.target.checked)}
                />
                Registrar pago total de liquidación ahora ({formatCOP(saldo)})
              </label>
              {liquidarSaldo && (
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tipo de pago:</span>
                  <select
                    value={tipoPagoLiquidacion}
                    onChange={e => setTipoPagoLiquidacion(e.target.value as PagoTipo)}
                    className="btn btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <option value="pago_total">Pago total (liquidación)</option>
                    <option value="abono">Abono final</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '1rem 1.25rem 1.25rem', display: 'grid', gap: '0.85rem' }}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field">
              <label>Estado final de cierre *</label>
              <select
                value={estadoFinal}
                onChange={e => setEstadoFinal(e.target.value as ReservaEstado)}
              >
                <option value="completada">Completada (Estadía culminada con éxito)</option>
                <option value="cancelada">Cancelada</option>
                <option value="no_show">No Show (Cliente no se presentó)</option>
              </select>
            </div>

            <div className="field">
              <label>Responsable de Cierre / Check-out</label>
              <input
                type="text"
                value={responsable}
                onChange={e => setResponsable(e.target.value)}
                placeholder="Nombre del administrador"
              />
            </div>

            {/* Calificación por estrellas */}
            <div className="field">
              <label>Calificación de la estancia ({calificacion}/5)</label>
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', height: '36px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setCalificacion(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: star <= calificacion ? '#f59e0b' : '#d1d5db',
                      transition: 'transform 0.1s',
                    }}
                    title={`${star} estrella${star > 1 ? 's' : ''}`}
                  >
                    <Star size={20} fill={star <= calificacion ? '#f59e0b' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            {/* Estado de entrega finca */}
            <div className="field">
              <label>Estado de entrega del inmueble</label>
              <select
                value={estadoEntrega}
                onChange={e => setEstadoEntrega(e.target.value as EstadoEntregaFinca)}
              >
                <option value="excelente">Excelente (Sin novedades)</option>
                <option value="bueno">Bueno (Normal)</option>
                <option value="con_observaciones">Con observaciones leves</option>
                <option value="danos_reportados">Daños reportados / Retención</option>
              </select>
            </div>

            {/* Depósito de garantía */}
            <div className="field">
              <label>Depósito de garantía</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', height: '36px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={depositoDevuelto}
                    onChange={e => setDepositoDevuelto(e.target.checked)}
                  />
                  Depósito devuelto a conformidad
                </label>
              </div>
            </div>

            <div className="field">
              <label>Monto depósito devuelto (COP)</label>
              <CurrencyInput
                value={valorDeposito}
                onChange={val => setValorDeposito(val)}
                placeholder="0"
              />
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Acta de entrega y notas de check-out</label>
              <textarea
                rows={2}
                value={notasCierre}
                onChange={e => setNotasCierre(e.target.value)}
                placeholder="Detalles sobre entrega de llaves, revisión de inventario, etc."
              />
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Observaciones privadas de administración (opcional)</label>
              <input
                type="text"
                value={observacionesEntrega}
                onChange={e => setObservacionesEntrega(e.target.value)}
                placeholder="Notas internas para el expediente histórico…"
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '0.5rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <ShieldCheck size={14} style={{ color: 'var(--primary)' }} />
              Snapshot inmutable blindado en Supabase
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn" onClick={onClose} disabled={guardando}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={guardando}>
                <Check size={14} />
                {guardando ? 'Procesando cierre…' : 'Confirmar y Cerrar Operación'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
