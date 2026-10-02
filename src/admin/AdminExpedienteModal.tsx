import React, { useState } from 'react';
import {
  FileText, X, Download, ShieldCheck, Calendar, Users, Home,
  CreditCard, DollarSign, Star, CheckCircle, AlertTriangle,
  RotateCcw, MessageCircle, Printer, ExternalLink, Award
} from 'lucide-react';
import type { Reserva, ConfiguracionGeneral, Pago } from '../types';
import {
  calcularSaldo,
  obtenerNombreClienteHistorico,
  obtenerNombreFincaHistorico,
  obtenerContactoClienteHistorico,
} from '../types';
import {
  generarDocSeparacion,
  generarComprobantePago,
  generarEstadoCuenta,
  generarPazYSalvo,
  generarExpedienteCompleto,
} from '../services/documentos';
import {
  plantillaSeparacion,
  plantillaEstadoCuenta,
  plantillaPazYSalvo,
} from '../services/whatsapp';
import { WhatsAppModal } from '../components/WhatsAppModal';

interface AdminExpedienteModalProps {
  isOpen: boolean;
  reserva: Reserva;
  configuracion?: ConfiguracionGeneral;
  onClose: () => void;
  onReabrir?: (id: string) => Promise<void>;
  onRegistrarComunicacion?: (com: any) => void;
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

export const AdminExpedienteModal: React.FC<AdminExpedienteModalProps> = ({
  isOpen,
  reserva,
  configuracion,
  onClose,
  onReabrir,
  onRegistrarComunicacion,
  showToast,
}) => {
  if (!isOpen) return null;

  const [descargando, setDescargando] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState<'general' | 'pagos' | 'documentos' | 'cierre'>('general');
  const [modalWa, setModalWa] = useState<{
    abierto: boolean;
    titulo: string;
    nombreDoc: string;
    mensaje: string;
    onGenerarPdf: () => void;
    tipo: any;
  }>({
    abierto: false,
    titulo: '',
    nombreDoc: '',
    mensaje: '',
    onGenerarPdf: () => {},
    tipo: 'estado_cuenta',
  });

  const saldo = calcularSaldo(reserva);
  const totalPagado = reserva.valor_total - saldo;
  const clienteNombre = obtenerNombreClienteHistorico(reserva);
  const clienteContacto = obtenerContactoClienteHistorico(reserva);
  const fincaNombre = obtenerNombreFincaHistorico(reserva);
  const pagos: Pago[] = reserva.pagos || [];
  const cierre = reserva.cierre;

  const numExpediente = `EXP-${reserva.id.slice(0, 8).toUpperCase()}`;

  const ejecutarDescarga = (tipo: string, fn: () => void) => {
    setDescargando(tipo);
    setTimeout(() => {
      try {
        fn();
        showToast('Documento PDF generado y descargado ✅', 'success');
      } catch (err: any) {
        showToast(`Error al generar PDF: ${err.message || err}`, 'error');
      } finally {
        setDescargando(null);
      }
    }, 100);
  };

  const dt1 = new Date(reserva.fecha_inicio);
  const dt2 = new Date(reserva.fecha_fin);
  const nochesCalc = Math.max(1, Math.round((dt2.getTime() - dt1.getTime()) / (1000 * 3600 * 24)));

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1060 }}>
      <div
        className="modal-box"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '820px', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Cabecera del expediente */}
        <div className="modal-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.6rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)' }}>
                {numExpediente}
              </span>
              <span
                className={`status-badge ${
                  reserva.estado === 'completada'
                    ? 's-avail'
                    : reserva.estado === 'activa'
                    ? 's-avail'
                    : 's-busy'
                }`}
                style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}
              >
                {reserva.estado}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: 'var(--primary)',
                  background: 'var(--primary-light, rgba(26, 107, 94, 0.08))',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '12px',
                  fontWeight: 500,
                }}
              >
                <ShieldCheck size={12} /> Registro Histórico Inmutable
              </span>
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
              Expediente Integral de Operación · {fincaNombre} · {clienteNombre}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => ejecutarDescarga('expediente', () => generarExpedienteCompleto(reserva, cierre, configuracion))}
              disabled={descargando === 'expediente'}
              title="Descargar expediente completo en PDF"
            >
              <Download size={13} />
              {descargando === 'expediente' ? 'Generando…' : 'Descargar Expediente PDF'}
            </button>
            <button className="btn btn-sm" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        {/* Barra de pestañas internas */}
        <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid var(--border)', padding: '0 1.25rem', background: 'var(--surface-alt, #fafafa)' }}>
          <button
            className={`btn btn-sm${tabActiva === 'general' ? ' btn-primary' : ''}`}
            onClick={() => setTabActiva('general')}
            style={{ borderRadius: 'var(--rad-xs) var(--rad-xs) 0 0', borderBottom: 'none', fontSize: '0.78rem' }}
          >
            Ficha y Operación
          </button>
          <button
            className={`btn btn-sm${tabActiva === 'pagos' ? ' btn-primary' : ''}`}
            onClick={() => setTabActiva('pagos')}
            style={{ borderRadius: 'var(--rad-xs) var(--rad-xs) 0 0', borderBottom: 'none', fontSize: '0.78rem' }}
          >
            Pagos ({pagos.length})
          </button>
          <button
            className={`btn btn-sm${tabActiva === 'documentos' ? ' btn-primary' : ''}`}
            onClick={() => setTabActiva('documentos')}
            style={{ borderRadius: 'var(--rad-xs) var(--rad-xs) 0 0', borderBottom: 'none', fontSize: '0.78rem' }}
          >
            Documentos PDF
          </button>
          <button
            className={`btn btn-sm${tabActiva === 'cierre' ? ' btn-primary' : ''}`}
            onClick={() => setTabActiva('cierre')}
            style={{ borderRadius: 'var(--rad-xs) var(--rad-xs) 0 0', borderBottom: 'none', fontSize: '0.78rem' }}
          >
            Acta de Cierre y Auditoría
          </button>
        </div>

        {/* Contenido de la pestaña */}
        <div style={{ padding: '1.25rem', display: 'grid', gap: '1rem' }}>

          {/* ===== TAB 1: FICHA Y OPERACIÓN ===== */}
          {tabActiva === 'general' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Grid 2 columnas: Cliente y Finca */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.85rem' }}>
                {/* Datos del Cliente */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)', padding: '0.85rem 1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.6rem', color: 'var(--primary)' }}>
                    <Users size={15} /> Cliente / Huésped Titular
                  </div>
                  <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.8rem' }}>
                    <div><strong>Nombre:</strong> {clienteNombre}</div>
                    <div><strong>WhatsApp:</strong> {clienteContacto.whatsapp || 'No registrado'}</div>
                    <div><strong>Teléfono:</strong> {clienteContacto.telefono || 'No registrado'}</div>
                    <div><strong>Correo:</strong> {clienteContacto.correo || 'No registrado'}</div>
                    {reserva.cliente_snapshot && (
                      <div className="text-xs text-muted" style={{ fontStyle: 'italic', marginTop: '0.2rem' }}>
                        ✓ Datos protegidos en snapshot inmutable
                      </div>
                    )}
                  </div>
                </div>

                {/* Datos de la Finca */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)', padding: '0.85rem 1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.6rem', color: 'var(--primary)' }}>
                    <Home size={15} /> Finca Campestre
                  </div>
                  <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.8rem' }}>
                    <div><strong>Propiedad:</strong> {fincaNombre}</div>
                    <div><strong>Zona:</strong> {reserva.finca_snapshot?.zona || (reserva.fincas as any)?.zona || 'Santa Elena, El Cerrito'}</div>
                    <div><strong>Capacidad:</strong> {reserva.finca_snapshot?.capacidad || 25} personas</div>
                    {reserva.finca_snapshot && (
                      <div className="text-xs text-muted" style={{ fontStyle: 'italic', marginTop: '0.2rem' }}>
                        ✓ Registro histórico vinculado permanentemente
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Datos de la Estancia */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)', padding: '0.85rem 1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.6rem', color: 'var(--primary)' }}>
                  <Calendar size={15} /> Detalle de la Estancia y Alojamiento
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem', fontSize: '0.8rem' }}>
                  <div><span className="text-muted">Llegada:</span> <br /><strong>{formatFecha(reserva.fecha_inicio)}</strong></div>
                  <div><span className="text-muted">Salida:</span> <br /><strong>{formatFecha(reserva.fecha_fin)}</strong></div>
                  <div><span className="text-muted">Duración:</span> <br /><strong>{nochesCalc} noche(s)</strong></div>
                  <div><span className="text-muted">Huéspedes:</span> <br /><strong>{reserva.personas} personas</strong></div>
                  <div><span className="text-muted">Alimentación:</span> <br /><strong>{reserva.alimentacion || 'Sin alimentación'}</strong></div>
                </div>
              </div>

              {/* Balance Económico Resumido */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)', padding: '0.85rem 1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.6rem', color: 'var(--primary)' }}>
                  <DollarSign size={15} /> Resumen de Liquidación Económica
                </div>
                <div className="quote-card" style={{ margin: 0 }}>
                  <div className="quote-row"><span className="text-muted">Valor total pactado:</span><strong>{formatCOP(reserva.valor_total)}</strong></div>
                  {reserva.costo_alimentacion ? (
                    <div className="quote-row"><span className="text-muted">Incluye alimentación:</span><span>{formatCOP(reserva.costo_alimentacion)}</span></div>
                  ) : null}
                  <div className="quote-row"><span className="text-muted">Total efectivamente recaudado:</span><strong style={{ color: 'var(--success)' }}>{formatCOP(totalPagado)}</strong></div>
                  <div className="quote-row quote-total">
                    <span>Saldo final liquidado:</span>
                    <span style={{ color: saldo > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {formatCOP(saldo)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observaciones registradas */}
              {reserva.observaciones && (
                <div style={{ background: 'var(--surface-alt, #fafafa)', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)', padding: '0.75rem 1rem', fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Observaciones de la reserva:</div>
                  <div className="text-muted">{reserva.observaciones}</div>
                </div>
              )}
            </div>
          )}

          {/* ===== TAB 2: HISTORIAL DE PAGOS ===== */}
          {tabActiva === 'pagos' && (
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Movimientos financieros y comprobantes</div>
                <div className="text-xs text-muted">Total: {pagos.length} movimiento(s)</div>
              </div>

              {pagos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--surface-alt, #fafafa)', border: '1px dashed var(--border)', borderRadius: 'var(--rad-xs)' }}>
                  <div className="text-muted text-sm">No hay registros individuales de pagos guardados para esta reserva.</div>
                </div>
              ) : (
                <div className="avail-table">
                  {pagos.map((p, idx) => (
                    <div key={p.id || idx} className="avail-row" style={{ flexWrap: 'wrap', gap: '0.6rem' }}>
                      <div style={{ flex: 1, minWidth: '160px' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span className="status-badge" style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}>{p.tipo}</span>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: p.tipo === 'devolucion' ? 'var(--danger)' : 'var(--success)' }}>
                            {p.tipo === 'devolucion' ? '-' : '+'}{formatCOP(p.valor)}
                          </span>
                        </div>
                        <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
                          Fecha: {formatFecha(p.fecha)} · {p.observacion || 'Sin observaciones'}
                        </div>
                      </div>

                      <button
                        className="btn btn-sm"
                        onClick={() => ejecutarDescarga(`pago-${p.id}`, () => generarComprobantePago(reserva, p, configuracion))}
                        disabled={descargando === `pago-${p.id}`}
                        title="Descargar comprobante individual PDF"
                        style={{ fontSize: '0.72rem' }}
                      >
                        <Download size={11} /> Comprobante PDF
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Totalizador de pagos */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'var(--surface-alt, #fafafa)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--rad-xs)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <span>Total recaudado verificado:</span>
                <span style={{ color: 'var(--success)' }}>{formatCOP(totalPagado)}</span>
              </div>
            </div>
          )}

          {/* ===== TAB 3: DOCUMENTOS OFICIALES ===== */}
          {tabActiva === 'documentos' && (
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <div className="text-xs text-muted">
                Documentos vinculados a esta operación. Puedes descargarlos en PDF o reenviarlos por WhatsApp al cliente.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {/* 1. Expediente Completo Consolidado */}
                <div style={{ border: '2px solid var(--primary)', borderRadius: 'var(--rad-xs)', padding: '0.85rem 1rem', background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--primary)' }}>
                      Expediente Completo Consolidado
                    </div>
                    <Award size={16} style={{ color: 'var(--primary)' }} />
                  </div>
                  <p className="text-xs text-muted" style={{ marginBottom: '0.75rem' }}>
                    Documento integral con ficha técnica, cliente, cotización, auditoría de pagos y acta de cierre formal.
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => ejecutarDescarga('expediente-tab', () => generarExpedienteCompleto(reserva, cierre, configuracion))}
                    disabled={descargando === 'expediente-tab'}
                  >
                    <Download size={12} /> Descargar Expediente PDF
                  </button>
                </div>

                {/* 2. Paz y Salvo Oficial */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)', padding: '0.85rem 1rem', background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      Paz y Salvo Oficial
                    </div>
                    {saldo <= 0 ? <CheckCircle size={15} style={{ color: 'var(--success)' }} /> : <AlertTriangle size={15} style={{ color: 'var(--danger)' }} />}
                  </div>
                  <p className="text-xs text-muted" style={{ marginBottom: '0.75rem' }}>
                    {saldo <= 0 ? 'Certificado oficial de pago total de la reserva sin deudas pendientes.' : 'Disponible únicamente cuando el saldo esté en $0 COP.'}
                  </p>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => ejecutarDescarga('paz-salvo', () => generarPazYSalvo(reserva, configuracion))}
                      disabled={saldo > 0 || descargando === 'paz-salvo'}
                    >
                      <Download size={12} /> PDF
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ color: '#25d366', borderColor: '#25d366' }}
                      disabled={saldo > 0}
                      onClick={() => setModalWa({
                        abierto: true,
                        titulo: 'Enviar Paz y Salvo por WhatsApp',
                        nombreDoc: 'Certificado de Paz y Salvo Oficial',
                        mensaje: plantillaPazYSalvo(reserva),
                        onGenerarPdf: () => generarPazYSalvo(reserva, configuracion),
                        tipo: 'paz_salvo',
                      })}
                      title="Enviar por WhatsApp"
                    >
                      <MessageCircle size={12} />
                    </button>
                  </div>
                </div>

                {/* 3. Documento de Separación */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)', padding: '0.85rem 1rem', background: 'var(--surface)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                    Documento de Separación
                  </div>
                  <p className="text-xs text-muted" style={{ marginBottom: '0.75rem' }}>
                    Comprobante inicial de anticipo con confirmación de bloqueo de fechas.
                  </p>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => ejecutarDescarga('separacion', () => generarDocSeparacion(reserva, configuracion))}
                      disabled={descargando === 'separacion'}
                    >
                      <Download size={12} /> PDF
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ color: '#25d366', borderColor: '#25d366' }}
                      onClick={() => setModalWa({
                        abierto: true,
                        titulo: 'Enviar Separación por WhatsApp',
                        nombreDoc: 'Documento Oficial de Separación',
                        mensaje: plantillaSeparacion(reserva),
                        onGenerarPdf: () => generarDocSeparacion(reserva, configuracion),
                        tipo: 'separacion',
                      })}
                      title="Enviar por WhatsApp"
                    >
                      <MessageCircle size={12} />
                    </button>
                  </div>
                </div>

                {/* 4. Estado de Cuenta Consolidado */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)', padding: '0.85rem 1rem', background: 'var(--surface)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                    Estado de Cuenta
                  </div>
                  <p className="text-xs text-muted" style={{ marginBottom: '0.75rem' }}>
                    Extracto detallado con todos los abonos aplicados y balance final.
                  </p>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => ejecutarDescarga('estado-cuenta', () => generarEstadoCuenta(reserva, configuracion))}
                      disabled={descargando === 'estado-cuenta'}
                    >
                      <Download size={12} /> PDF
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ color: '#25d366', borderColor: '#25d366' }}
                      onClick={() => setModalWa({
                        abierto: true,
                        titulo: 'Enviar Estado de Cuenta por WhatsApp',
                        nombreDoc: 'Estado de Cuenta Consolidado',
                        mensaje: plantillaEstadoCuenta(reserva),
                        onGenerarPdf: () => generarEstadoCuenta(reserva, configuracion),
                        tipo: 'estado_cuenta',
                      })}
                      title="Enviar por WhatsApp"
                    >
                      <MessageCircle size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB 4: ACTA DE CIERRE Y AUDITORÍA ===== */}
          {tabActiva === 'cierre' && (
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)', padding: '0.85rem 1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--primary)' }}>
                  <Award size={16} /> Acta de Cierre Operativo
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <div>
                    <span className="text-muted">Fecha y hora de Cierre:</span>
                    <br />
                    <strong>
                      {reserva.fecha_cierre || cierre?.fecha_cierre
                        ? new Date(reserva.fecha_cierre || cierre?.fecha_cierre || '').toLocaleString('es-CO')
                        : 'No registrada formalmente'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-muted">Responsable de Check-out:</span>
                    <br />
                    <strong>{reserva.cerrada_por || cierre?.responsable || 'Administración de Fincas'}</strong>
                  </div>

                  <div>
                    <span className="text-muted">Calificación de la Estadía:</span>
                    <br />
                    <strong style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Star size={13} fill="#f59e0b" />
                      {cierre?.calificacion ? `${cierre.calificacion} / 5 Estrellas` : '5 / 5 Estrellas'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-muted">Estado de Entrega del Inmueble:</span>
                    <br />
                    <strong>
                      {cierre?.estado_entrega_finca
                        ? cierre.estado_entrega_finca.replace('_', ' ').toUpperCase()
                        : 'ENTREGA CONFORME EN BUEN ESTADO'}
                    </strong>
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem' }}>
                  <span className="text-muted">Notas y observaciones de Cierre:</span>
                  <div style={{ marginTop: '0.25rem', padding: '0.5rem 0.75rem', background: 'var(--surface-alt, #fafafa)', borderRadius: 'var(--rad-xs)' }}>
                    {reserva.notas_cierre || cierre?.notas_cierre || 'Check-out efectuado a entera satisfacción. Inventario y áreas verificadas sin novedades.'}
                  </div>
                </div>
              </div>

              {/* Opción de reabrir reserva si es necesario */}
              {onReabrir && reserva.estado !== 'activa' && (
                <div style={{ padding: '0.75rem 1rem', border: '1px dashed var(--border)', borderRadius: 'var(--rad-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>¿Necesitas reabrir esta reserva?</div>
                    <div className="text-xs text-muted">Devolverá el estado a "activa" si se cerró por error.</div>
                  </div>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => {
                      if (confirm('¿Deseas reabrir esta reserva y reactivar su seguimiento operativo?')) {
                        onReabrir(reserva.id);
                        onClose();
                      }
                    }}
                    style={{ fontSize: '0.75rem' }}
                  >
                    <RotateCcw size={12} /> Reabrir Operación
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal de reenvío por WhatsApp */}
        {modalWa.abierto && (
          <WhatsAppModal
            isOpen={modalWa.abierto}
            onClose={() => setModalWa(p => ({ ...p, abierto: false }))}
            titulo={modalWa.titulo}
            destinatarioNombre={clienteNombre}
            telefonoInicial={clienteContacto.whatsapp || clienteContacto.telefono || ''}
            mensajeInicial={modalWa.mensaje}
            nombreDocumento={modalWa.nombreDoc}
            onGenerarPdf={modalWa.onGenerarPdf}
            onDespuesDeEnviar={(tel, msg) => {
              showToast('Documento y mensaje de WhatsApp enviados ✅', 'success');
              onRegistrarComunicacion?.({
                cliente_id: reserva.cliente_id || null,
                reserva_id: reserva.id,
                tipo: modalWa.tipo,
                destinatario: clienteNombre,
                telefono: tel,
                mensaje: msg,
                estado: 'enviado',
              });
            }}
          />
        )}
      </div>
    </div>
  );
};
