import React, { useState } from 'react';
import {
  FileText, Plus, Edit3, Trash2, X, Save, ChevronDown, ArrowRight,
  Calendar, Users, Utensils, DollarSign, Tag
} from 'lucide-react';
import type { CotizacionDB, CotizacionEstado, Cliente, Finca } from '../types';

interface AdminCotizacionesProps {
  cotizaciones: CotizacionDB[];
  clientes: Cliente[];
  fincas: Finca[];
  onGuardar: (datos: Partial<CotizacionDB>) => Promise<{ success: boolean; id?: string; error?: string }>;
  onCambiarEstado: (id: string, estado: CotizacionEstado) => Promise<{ success: boolean; error?: string }>;
  onEliminar: (id: string) => Promise<{ success: boolean; error?: string }>;
  onConvertirReserva?: (cotizacion: CotizacionDB) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const ESTADOS: CotizacionEstado[] = ['borrador', 'cotizada', 'enviada', 'pendiente', 'confirmada', 'cancelada', 'vencida'];

const ESTADO_COLORS: Record<CotizacionEstado, string> = {
  borrador: 's-pending',
  cotizada: 's-avail',
  enviada: 's-avail',
  pendiente: 's-demand',
  confirmada: 's-avail',
  cancelada: 's-busy',
  vencida: 's-busy',
};

const VACIO: Partial<CotizacionDB> = {
  cliente_id: '',
  finca_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  personas: 1,
  alimentacion: 'Sin alimentación',
  precio_base_pp: 0,
  subtotal_alojamiento: 0,
  costo_alimentacion: 0,
  descuento: 0,
  recargo: 0,
  total: 0,
  estado: 'borrador',
  notas: '',
};

function calcTotal(f: Partial<CotizacionDB>): number {
  return (f.subtotal_alojamiento || 0) + (f.costo_alimentacion || 0)
    - (f.descuento || 0) + (f.recargo || 0);
}

function noches(fi: string, ff: string): number {
  if (!fi || !ff) return 1;
  const d = new Date(ff + 'T00:00:00').getTime() - new Date(fi + 'T00:00:00').getTime();
  return Math.max(1, Math.round(d / 86400000));
}

function formatCOP(v: number) {
  return '$' + v.toLocaleString('es-CO') + ' COP';
}
function formatFecha(f?: string) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

export const AdminCotizaciones: React.FC<AdminCotizacionesProps> = ({
  cotizaciones,
  clientes,
  fincas,
  onGuardar,
  onCambiarEstado,
  onEliminar,
  onConvertirReserva,
  showToast,
  openConfirm,
}) => {
  const [form, setForm] = useState<Partial<CotizacionDB>>(VACIO);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<CotizacionEstado | 'todas'>('todas');

  const abrirNuevo = () => { setForm(VACIO); setEditando(true); };
  const abrirEdicion = (c: CotizacionDB) => { setForm({ ...c }); setEditando(true); };
  const cerrar = () => { setForm(VACIO); setEditando(false); };

  // Recalcular subtotal cuando cambian fechas, personas, precio
  const recalcular = (f: Partial<CotizacionDB>): Partial<CotizacionDB> => {
    const n = noches(f.fecha_inicio || '', f.fecha_fin || '');
    const subtotal = n * (f.personas || 1) * (f.precio_base_pp || 0);
    const total = subtotal + (f.costo_alimentacion || 0) - (f.descuento || 0) + (f.recargo || 0);
    return { ...f, subtotal_alojamiento: subtotal, total };
  };

  const updateField = (campo: keyof CotizacionDB, valor: any) => {
    setForm(prev => recalcular({ ...prev, [campo]: valor }));
  };

  // Al seleccionar finca, copiar precio_pp
  const handleFincaChange = (fincaId: string) => {
    const finca = fincas.find(f => f.id === fincaId);
    setForm(prev => recalcular({ ...prev, finca_id: fincaId, precio_base_pp: finca?.precio_pp || 0 }));
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.finca_id) { showToast('Selecciona una finca', 'error'); return; }
    if (!form.fecha_inicio || !form.fecha_fin) { showToast('Las fechas son obligatorias', 'error'); return; }
    setGuardando(true);
    const res = await onGuardar(form);
    setGuardando(false);
    if (res.success) {
      showToast(form.id ? 'Cotización actualizada ✅' : 'Cotización creada ✅', 'success');
      cerrar();
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  };

  const handleEstado = async (id: string, estado: CotizacionEstado) => {
    const res = await onCambiarEstado(id, estado);
    if (res.success) showToast(`Estado actualizado: ${estado}`, 'success');
    else showToast(`Error: ${res.error}`, 'error');
  };

  const handleEliminar = (c: CotizacionDB) => {
    openConfirm(
      '¿Eliminar cotización?',
      'Esta acción es irreversible.',
      async () => {
        const res = await onEliminar(c.id);
        if (res.success) showToast('Cotización eliminada', 'info');
        else showToast(`Error: ${res.error}`, 'error');
      }
    );
  };

  const filtradas = cotizaciones.filter(c =>
    filtroEstado === 'todas' || c.estado === filtroEstado
  );

  const fincaSeleccionada = fincas.find(f => f.id === form.finca_id);
  const nochesCotiz = noches(form.fecha_inicio || '', form.fecha_fin || '');

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <FileText size={18} /> Cotizaciones
          </div>
          <div className="text-xs text-muted mt-1">{cotizaciones.length} en total</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={abrirNuevo}>
          <Plus size={14} /> Nueva cotización
        </button>
      </div>

      {/* Filtro por estado */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', paddingBottom: '1rem' }}>
        {(['todas', ...ESTADOS] as const).map(e => (
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

      {/* Modal formulario */}
      {editando && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="panel-title">{form.id ? 'Editar cotización' : 'Nueva cotización'}</div>
              <button className="btn btn-sm" onClick={cerrar}><X size={14} /></button>
            </div>

            <form onSubmit={handleGuardar} style={{ display: 'grid', gap: '0.85rem', padding: '1.25rem' }}>
              {/* Cliente y finca */}
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field">
                  <label>Cliente (opcional)</label>
                  <select value={form.cliente_id || ''} onChange={e => updateField('cliente_id', e.target.value || null)}>
                    <option value="">— Sin cliente —</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Finca *</label>
                  <select value={form.finca_id || ''} onChange={e => handleFincaChange(e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {fincas.map(f => (
                      <option key={f.id} value={f.id}>{f.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Fechas */}
                <div className="field">
                  <label><Calendar size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Llegada *</label>
                  <input type="date" value={form.fecha_inicio || ''} onChange={e => updateField('fecha_inicio', e.target.value)} />
                </div>
                <div className="field">
                  <label><Calendar size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Salida *</label>
                  <input type="date" value={form.fecha_fin || ''} min={form.fecha_inicio || ''} onChange={e => updateField('fecha_fin', e.target.value)} />
                </div>

                {/* Personas y alimentación */}
                <div className="field">
                  <label><Users size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Personas</label>
                  <input type="number" min={1} max={fincaSeleccionada?.capacidad || 100} value={form.personas || 1} onChange={e => updateField('personas', +e.target.value)} />
                </div>
                <div className="field">
                  <label><Utensils size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Alimentación</label>
                  <input value={form.alimentacion || ''} onChange={e => updateField('alimentacion', e.target.value)} placeholder="Ej. Sin alimentación" />
                </div>

                {/* Valores */}
                <div className="field">
                  <label><DollarSign size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Precio base /pp/noche</label>
                  <input type="number" min={0} value={form.precio_base_pp || 0} onChange={e => updateField('precio_base_pp', +e.target.value)} />
                </div>
                <div className="field">
                  <label>Costo alimentación total</label>
                  <input type="number" min={0} value={form.costo_alimentacion || 0} onChange={e => updateField('costo_alimentacion', +e.target.value)} />
                </div>
                <div className="field">
                  <label>Descuento</label>
                  <input type="number" min={0} value={form.descuento || 0} onChange={e => updateField('descuento', +e.target.value)} />
                </div>
                <div className="field">
                  <label>Recargo</label>
                  <input type="number" min={0} value={form.recargo || 0} onChange={e => updateField('recargo', +e.target.value)} />
                </div>

                <div className="field">
                  <label>Estado</label>
                  <select value={form.estado || 'borrador'} onChange={e => updateField('estado', e.target.value as CotizacionEstado)}>
                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              {/* Resumen */}
              <div className="quote-card" style={{ margin: '0' }}>
                <div className="quote-row"><span className="text-muted">Noches:</span><span>{nochesCotiz}</span></div>
                <div className="quote-row"><span className="text-muted">Alojamiento ({nochesCotiz}n × {form.personas}pp):</span><span>{formatCOP(form.subtotal_alojamiento || 0)}</span></div>
                {(form.costo_alimentacion || 0) > 0 && <div className="quote-row"><span className="text-muted">Alimentación:</span><span>+{formatCOP(form.costo_alimentacion || 0)}</span></div>}
                {(form.descuento || 0) > 0 && <div className="quote-row"><span className="text-muted">Descuento:</span><span style={{ color: 'var(--success)' }}>−{formatCOP(form.descuento || 0)}</span></div>}
                {(form.recargo || 0) > 0 && <div className="quote-row"><span className="text-muted">Recargo:</span><span style={{ color: 'var(--danger)' }}>+{formatCOP(form.recargo || 0)}</span></div>}
                <div className="quote-row quote-total"><span>Total:</span><span>{formatCOP(calcTotal(form))}</span></div>
              </div>

              <div className="field">
                <label>Notas internas</label>
                <textarea rows={2} value={form.notas || ''} onChange={e => updateField('notas', e.target.value)} placeholder="Observaciones de la cotización…" />
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  <Save size={14} /> {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista cotizaciones */}
      <div className="avail-table">
        {filtradas.length === 0 ? (
          <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '1.5rem' }}>No hay cotizaciones{filtroEstado !== 'todas' ? ` en estado "${filtroEstado}"` : ''}.</p>
        ) : (
          filtradas.map(c => {
            const clienteNombre = c.clientes ? `${c.clientes.nombre} ${c.clientes.apellido || ''}`.trim() : '—';
            const fincaNombre = c.fincas?.nombre || '—';
            return (
              <div key={c.id} className="avail-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Tag size={12} /> {fincaNombre}
                    <span className={`status-badge ${ESTADO_COLORS[c.estado]}`} style={{ fontSize: '0.68rem' }}>{c.estado}</span>
                  </div>
                  <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
                    <Calendar size={10} style={{ display:'inline', verticalAlign:'-1px' }} /> {formatFecha(c.fecha_inicio)} → {formatFecha(c.fecha_fin)}
                    {' · '}<Users size={10} style={{ display:'inline', verticalAlign:'-1px' }} /> {c.personas} personas
                    {clienteNombre !== '—' && <> · 👤 {clienteNombre}</>}
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem', marginTop: '0.15rem' }}>
                    {formatCOP(c.total)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Cambio rápido de estado */}
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                    <select
                      value={c.estado}
                      onChange={e => handleEstado(c.id, e.target.value as CotizacionEstado)}
                      className="btn btn-sm"
                      style={{ appearance: 'none', paddingRight: '1.4rem', cursor: 'pointer', fontSize: '0.72rem' }}
                    >
                      {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <ChevronDown size={11} style={{ position: 'absolute', right: '0.35rem', pointerEvents: 'none' }} />
                  </div>

                  {c.estado === 'confirmada' && onConvertirReserva && (
                    <button
                      className="btn btn-sm btn-primary"
                      title="Convertir en reserva"
                      onClick={() => onConvertirReserva(c)}
                    >
                      <ArrowRight size={13} /> Reservar
                    </button>
                  )}
                  <button className="btn btn-sm" onClick={() => abrirEdicion(c)} title="Editar"><Edit3 size={13} /></button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleEliminar(c)} title="Eliminar"><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
