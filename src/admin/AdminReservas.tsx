import React, { useState } from 'react';
import {
  ClipboardList, Plus, Edit3, Trash2, X, Save, CreditCard,
  Calendar, Users, DollarSign, ChevronDown, ChevronUp, FileCheck
} from 'lucide-react';
import type { Reserva, ReservaEstado, Cliente, Finca, Pago, PagoTipo, CotizacionDB } from '../types';
import { calcularSaldo } from '../types';
import { AdminDocumentos } from './AdminDocumentos';

interface AdminReservasProps {
  reservas: Reserva[];
  clientes: Cliente[];
  fincas: Finca[];
  cotizaciones: CotizacionDB[];
  onGuardar: (datos: Partial<Reserva>) => Promise<{ success: boolean; id?: string; error?: string }>;
  onCambiarEstado: (id: string, estado: ReservaEstado) => Promise<{ success: boolean; error?: string }>;
  onEliminar: (id: string) => Promise<{ success: boolean; error?: string }>;
  onRegistrarPago: (reservaId: string, pago: { tipo: PagoTipo; fecha: string; valor: number; observacion?: string }) => Promise<{ success: boolean; error?: string }>;
  onEliminarPago: (pagoId: string) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
  // Para recibir cotización pre-cargada al convertir
  cotizacionInicial?: CotizacionDB | null;
  onCotizacionInicialUsada?: () => void;
}

const ESTADOS_RESERVA: ReservaEstado[] = ['activa', 'completada', 'cancelada', 'no_show'];
const TIPOS_PAGO: { valor: PagoTipo; label: string }[] = [
  { valor: 'separacion', label: 'Separación' },
  { valor: 'abono', label: 'Abono' },
  { valor: 'pago_total', label: 'Pago total' },
  { valor: 'devolucion', label: 'Devolución' },
];

const ESTADO_COLORS: Record<ReservaEstado, string> = {
  activa: 's-avail',
  completada: 's-avail',
  cancelada: 's-busy',
  no_show: 's-busy',
};

function formatCOP(v: number) { return '$' + v.toLocaleString('es-CO') + ' COP'; }
function formatFecha(f?: string) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

const FORM_VACIO: Partial<Reserva> = {
  cliente_id: '',
  finca_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  personas: 1,
  valor_total: 0,
  separacion: 0,
  estado: 'activa',
  observaciones: '',
};

const PAGO_VACIO = { tipo: 'abono' as PagoTipo, fecha: new Date().toISOString().split('T')[0], valor: 0, observacion: '' };

export const AdminReservas: React.FC<AdminReservasProps> = ({
  reservas,
  clientes,
  fincas,
  cotizaciones,
  onGuardar,
  onCambiarEstado,
  onEliminar,
  onRegistrarPago,
  onEliminarPago,
  showToast,
  openConfirm,
  cotizacionInicial,
  onCotizacionInicialUsada,
}) => {
  const [form, setForm] = useState<Partial<Reserva>>(FORM_VACIO);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [reservaExpandida, setReservaExpandida] = useState<string | null>(null);
  const [pagoForm, setPagoForm] = useState<typeof PAGO_VACIO>(PAGO_VACIO);
  const [pagoReservaId, setPagoReservaId] = useState<string | null>(null);
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<ReservaEstado | 'todas'>('todas');

  // Si llega cotización pre-cargada, abrir formulario con sus datos
  React.useEffect(() => {
    if (cotizacionInicial) {
      setForm({
        cotizacion_id: cotizacionInicial.id,
        cliente_id: cotizacionInicial.cliente_id || '',
        finca_id: cotizacionInicial.finca_id,
        fecha_inicio: cotizacionInicial.fecha_inicio,
        fecha_fin: cotizacionInicial.fecha_fin,
        personas: cotizacionInicial.personas,
        valor_total: cotizacionInicial.total,
        separacion: 0,
        menu_id: cotizacionInicial.menu_id || null,
        alimentacion: cotizacionInicial.alimentacion || null,
        costo_alimentacion: cotizacionInicial.costo_alimentacion || 0,
        estado: 'activa',
        observaciones: cotizacionInicial.alimentacion && cotizacionInicial.alimentacion !== 'Sin alimentación'
          ? `Incluye menú: ${cotizacionInicial.alimentacion}`
          : '',
      });
      setEditando(true);
      onCotizacionInicialUsada?.();
    }
  }, [cotizacionInicial]);

  const abrirNuevo = () => { setForm(FORM_VACIO); setEditando(true); };
  const abrirEdicion = (r: Reserva) => { setForm({ ...r }); setEditando(true); };
  const cerrar = () => { setForm(FORM_VACIO); setEditando(false); };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente_id) { showToast('Selecciona un cliente', 'error'); return; }
    if (!form.finca_id) { showToast('Selecciona una finca', 'error'); return; }
    if (!form.fecha_inicio || !form.fecha_fin) { showToast('Las fechas son obligatorias', 'error'); return; }
    setGuardando(true);
    const res = await onGuardar(form);
    setGuardando(false);
    if (res.success) {
      showToast(form.id ? 'Reserva actualizada ✅' : 'Reserva creada ✅', 'success');
      cerrar();
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  };

  const handleEstado = async (id: string, estado: ReservaEstado) => {
    const res = await onCambiarEstado(id, estado);
    if (res.success) showToast(`Estado: ${estado}`, 'success');
    else showToast(`Error: ${res.error}`, 'error');
  };

  const handleEliminar = (r: Reserva) => {
    openConfirm(
      '¿Eliminar reserva?',
      'Se eliminarán también todos los pagos asociados. Esta acción es irreversible.',
      async () => {
        const res = await onEliminar(r.id);
        if (res.success) showToast('Reserva eliminada', 'info');
        else showToast(`Error: ${res.error}`, 'error');
      }
    );
  };

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pagoReservaId) return;
    if (!pagoForm.valor || pagoForm.valor <= 0) { showToast('El valor debe ser mayor a cero', 'error'); return; }
    setGuardandoPago(true);
    const res = await onRegistrarPago(pagoReservaId, pagoForm);
    setGuardandoPago(false);
    if (res.success) {
      showToast('Pago registrado ✅', 'success');
      setPagoForm(PAGO_VACIO);
      setPagoReservaId(null);
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  };

  const handleEliminarPago = (p: Pago) => {
    openConfirm(
      '¿Eliminar pago?',
      `Se eliminará el registro de ${formatCOP(p.valor)} (${p.tipo}).`,
      async () => {
        const res = await onEliminarPago(p.id);
        if (res.success) showToast('Pago eliminado', 'info');
        else showToast(`Error: ${res.error}`, 'error');
      }
    );
  };

  const filtradas = reservas.filter(r =>
    filtroEstado === 'todas' || r.estado === filtroEstado
  );

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <ClipboardList size={18} /> Reservas
          </div>
          <div className="text-xs text-muted mt-1">{reservas.length} reservas registradas</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={abrirNuevo}>
          <Plus size={14} /> Nueva reserva
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', paddingBottom: '1rem' }}>
        {(['todas', ...ESTADOS_RESERVA] as const).map(e => (
          <button
            key={e}
            className={`btn btn-sm${filtroEstado === e ? ' btn-primary' : ''}`}
            onClick={() => setFiltroEstado(e)}
            style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Modal formulario reserva */}
      {editando && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="panel-title">{form.id ? 'Editar reserva' : 'Nueva reserva'}</div>
              <button className="btn btn-sm" onClick={cerrar}><X size={14} /></button>
            </div>

            <form onSubmit={handleGuardar} style={{ display: 'grid', gap: '0.75rem', padding: '1.25rem' }}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field">
                  <label>Cliente *</label>
                  <select value={form.cliente_id || ''} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}>
                    <option value="">— Seleccionar —</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Finca *</label>
                  <select value={form.finca_id || ''} onChange={e => setForm(p => ({ ...p, finca_id: e.target.value }))}>
                    <option value="">— Seleccionar —</option>
                    {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label><Calendar size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Llegada *</label>
                  <input type="date" value={form.fecha_inicio || ''} onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} />
                </div>
                <div className="field">
                  <label><Calendar size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Salida *</label>
                  <input type="date" value={form.fecha_fin || ''} min={form.fecha_inicio || ''} onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))} />
                </div>

                <div className="field">
                  <label><Users size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Personas</label>
                  <input type="number" min={1} value={form.personas || 1} onChange={e => setForm(p => ({ ...p, personas: +e.target.value }))} />
                </div>
                <div className="field">
                  <label>Estado</label>
                  <select value={form.estado || 'activa'} onChange={e => setForm(p => ({ ...p, estado: e.target.value as ReservaEstado }))}>
                    {ESTADOS_RESERVA.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label><DollarSign size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Valor total</label>
                  <input type="number" min={0} value={form.valor_total || 0} onChange={e => setForm(p => ({ ...p, valor_total: +e.target.value }))} />
                </div>
                <div className="field">
                  <label>Separación / Anticipo</label>
                  <input type="number" min={0} max={form.valor_total || undefined} value={form.separacion || 0} onChange={e => setForm(p => ({ ...p, separacion: +e.target.value }))} />
                </div>

                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Observaciones</label>
                  <textarea rows={2} value={form.observaciones || ''} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} placeholder="Notas de la reserva…" />
                </div>

                {/* Cotización vinculada (opcional) */}
                {cotizaciones.length > 0 && (
                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label>Cotización vinculada (opcional)</label>
                    <select value={form.cotizacion_id || ''} onChange={e => setForm(p => ({ ...p, cotizacion_id: e.target.value || null }))}>
                      <option value="">— Sin cotización —</option>
                      {cotizaciones.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.fincas?.nombre} · {formatFecha(c.fecha_inicio)}→{formatFecha(c.fecha_fin)} · {formatCOP(c.total)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Resumen saldo */}
              <div className="quote-card" style={{ margin: 0 }}>
                <div className="quote-row"><span className="text-muted">Valor total:</span><span>{formatCOP(form.valor_total || 0)}</span></div>
                <div className="quote-row"><span className="text-muted">Separación:</span><span>{formatCOP(form.separacion || 0)}</span></div>
                <div className="quote-row quote-total">
                  <span>Saldo pendiente:</span>
                  <span style={{ color: ((form.valor_total || 0) - (form.separacion || 0)) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {formatCOP((form.valor_total || 0) - (form.separacion || 0))}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  <Save size={14} /> {guardando ? 'Guardando…' : 'Guardar reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal pago */}
      {pagoReservaId && (
        <div className="modal-overlay" onClick={() => setPagoReservaId(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div className="panel-title"><CreditCard size={16} /> Registrar pago</div>
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
                <label>Valor</label>
                <input type="number" min={1} value={pagoForm.valor} onChange={e => setPagoForm(p => ({ ...p, valor: +e.target.value }))} />
              </div>
              <div className="field">
                <label>Observación</label>
                <input value={pagoForm.observacion} onChange={e => setPagoForm(p => ({ ...p, observacion: e.target.value }))} placeholder="Referencia, banco, etc." />
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setPagoReservaId(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardandoPago}>
                  <Save size={14} /> {guardandoPago ? 'Registrando…' : 'Registrar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de reservas */}
      <div className="avail-table">
        {filtradas.length === 0 ? (
          <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '1.5rem' }}>
            No hay reservas{filtroEstado !== 'todas' ? ` en estado "${filtroEstado}"` : ''}.
          </p>
        ) : (
          filtradas.map(r => {
            const saldo = calcularSaldo(r);
            const totalPagado = (r.valor_total) - saldo;
            const clienteNombre = r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.trim() : '—';
            const fincaNombre = r.fincas?.nombre || '—';
            const expanded = reservaExpandida === r.id;

            return (
              <div key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                {/* Fila principal */}
                <div className="avail-row" style={{ borderBottom: 'none', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {fincaNombre}
                      <span className={`status-badge ${ESTADO_COLORS[r.estado]}`} style={{ fontSize: '0.68rem' }}>{r.estado}</span>
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
                      <Calendar size={10} style={{ display:'inline', verticalAlign:'-1px' }} /> {formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}
                      {' · '}<Users size={10} style={{ display:'inline', verticalAlign:'-1px' }} /> {r.personas} personas
                      {' · '}👤 {clienteNombre}
                    </div>
                    <div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                      <span>Total: <strong>{formatCOP(r.valor_total)}</strong></span>
                      <span>Pagado: <strong style={{ color: 'var(--success)' }}>{formatCOP(totalPagado)}</strong></span>
                      <span>Saldo: <strong style={{ color: saldo > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCOP(saldo)}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Estado rápido */}
                    <div style={{ position: 'relative' }}>
                      <select
                        value={r.estado}
                        onChange={e => handleEstado(r.id, e.target.value as ReservaEstado)}
                        className="btn btn-sm"
                        style={{ appearance: 'none', paddingRight: '1.4rem', cursor: 'pointer', fontSize: '0.72rem' }}
                      >
                        {ESTADOS_RESERVA.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                      <ChevronDown size={11} style={{ position: 'absolute', right: '0.35rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>

                    <button
                      className="btn btn-sm btn-primary"
                      title="Registrar pago"
                      onClick={() => { setPagoReservaId(r.id); setPagoForm(PAGO_VACIO); }}
                    >
                      <CreditCard size={13} />
                    </button>
                    <button className="btn btn-sm" onClick={() => abrirEdicion(r)} title="Editar"><Edit3 size={13} /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleEliminar(r)} title="Eliminar"><Trash2 size={13} /></button>
                    <button
                      className="btn btn-sm"
                      onClick={() => setReservaExpandida(expanded ? null : r.id)}
                      title={expanded ? 'Cerrar detalle' : 'Ver pagos'}
                    >
                      {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* Panel expandido: detalle de pagos */}
                {expanded && (
                  <div style={{ background: 'var(--surface-alt, var(--surface))', borderTop: '1px solid var(--border)', padding: '0.75rem 1rem 1rem', fontSize: '0.82rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FileCheck size={14} /> Historial de pagos
                    </div>

                    {(!r.pagos || r.pagos.length === 0) ? (
                      <p className="text-muted" style={{ fontSize: '0.78rem' }}>Sin pagos registrados.</p>
                    ) : (
                      <div style={{ display: 'grid', gap: '0.35rem' }}>
                        {r.pagos.map((p: Pago) => (
                          <div key={p.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className="status-badge" style={{ fontSize: '0.67rem', minWidth: '80px', justifyContent: 'center' }}>{p.tipo}</span>
                            <span className="text-muted">{formatFecha(p.fecha)}</span>
                            <span style={{ fontWeight: 600, color: p.tipo === 'devolucion' ? 'var(--danger)' : 'var(--success)' }}>
                              {p.tipo === 'devolucion' ? '−' : '+'}{formatCOP(p.valor)}
                            </span>
                            {p.observacion && <span className="text-muted" style={{ fontStyle: 'italic' }}>{p.observacion}</span>}
                            <button
                              className="btn btn-sm btn-danger"
                              style={{ padding: '0.1rem 0.3rem', marginLeft: 'auto' }}
                              onClick={() => handleEliminarPago(p)}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-muted">Saldo restante:</span>
                      <strong style={{ color: saldo > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCOP(saldo)}</strong>
                    </div>

                    {/* Documentos PDF */}
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                      <AdminDocumentos reserva={r} />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
