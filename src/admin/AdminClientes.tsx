import React, { useState, useMemo } from 'react';
import {
  Users, Plus, Edit3, Trash2, Phone, Mail, MessageCircle, X, Save,
  Search, Hash, History, Calendar, Check, ExternalLink, Award
} from 'lucide-react';
import type { Cliente, Reserva, CotizacionDB } from '../types';
import { formatearConsecutivoSimple } from '../utils/consecutivos';

interface AdminClientesProps {
  clientes: Cliente[];
  reservas?: Reserva[];
  cotizaciones?: CotizacionDB[];
  onGuardar: (datos: Partial<Cliente>) => Promise<{ success: boolean; id?: string; error?: string }>;
  onDesactivar: (id: string) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const VACIO: Partial<Cliente> = {
  nombre: '',
  apellido: '',
  telefono: '',
  whatsapp: '',
  correo: '',
  observaciones: '',
};

function formatCOP(v: number) {
  return '$' + v.toLocaleString('es-CO') + ' COP';
}

export const AdminClientes: React.FC<AdminClientesProps> = ({
  clientes,
  reservas = [],
  cotizaciones = [],
  onGuardar,
  onDesactivar,
  showToast,
  openConfirm,
}) => {
  const [form, setForm] = useState<Partial<Cliente>>(VACIO);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [clienteDetalleId, setClienteDetalleId] = useState<string | null>(null);

  const abrirNuevo = () => {
    setForm(VACIO);
    setEditando(true);
  };

  const abrirEdicion = (c: Cliente) => {
    setForm({ ...c });
    setEditando(true);
  };

  const cerrar = () => {
    setForm(VACIO);
    setEditando(false);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre?.trim()) {
      showToast('El nombre es obligatorio', 'error');
      return;
    }
    setGuardando(true);
    const res = await onGuardar(form);
    setGuardando(false);
    if (res.success) {
      showToast(form.id ? 'Cliente actualizado ✅' : 'Cliente creado ✅', 'success');
      cerrar();
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  };

  const handleEliminar = (c: Cliente) => {
    openConfirm(
      '¿Desactivar cliente?',
      `El cliente "${c.nombre} ${c.apellido || ''}" quedará inactivo. Sus reservas e historial permanecerán íntegros en la base de datos.`,
      async () => {
        const res = await onDesactivar(c.id);
        if (res.success) showToast('Cliente desactivado', 'info');
        else showToast(`Error: ${res.error}`, 'error');
      }
    );
  };

  // Mapeo enriquecido de clientes con sus consecutivos e historial
  const clientesConHistorial = useMemo(() => {
    return clientes.map(c => {
      const reservasCliente = reservas.filter(r => r.cliente_id === c.id);
      const cotizacionesCliente = cotizaciones.filter(cot => cot.cliente_id === c.id);

      // Consecutivos únicos del cliente
      const consecutivosList: string[] = [];
      reservasCliente.forEach(r => {
        if (r.consecutivo && !consecutivosList.includes(r.consecutivo)) {
          consecutivosList.push(r.consecutivo);
        }
      });
      cotizacionesCliente.forEach(cot => {
        if (cot.consecutivo && !consecutivosList.includes(cot.consecutivo)) {
          consecutivosList.push(cot.consecutivo);
        }
      });

      const totalGastado = reservasCliente.reduce((acc, r) => acc + (r.valor_total || 0), 0);
      const reservasActivas = reservasCliente.filter(r => r.estado === 'activa').length;
      const reservasCerradas = reservasCliente.filter(r => r.estado === 'completada').length;

      return {
        cliente: c,
        reservas: reservasCliente,
        cotizaciones: cotizacionesCliente,
        consecutivos: consecutivosList,
        totalGastado,
        reservasActivas,
        reservasCerradas,
        esRecurrente: reservasCliente.length > 1,
      };
    });
  }, [clientes, reservas, cotizaciones]);

  // Filtrado que soporta búsqueda por nombre, teléfono, correo o número consecutivo
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return clientesConHistorial;

    return clientesConHistorial.filter(item => {
      const c = item.cliente;
      const nombreCompleto = `${c.nombre} ${c.apellido || ''}`.toLowerCase();
      const tel = (c.telefono || '').toLowerCase();
      const wa = (c.whatsapp || '').toLowerCase();
      const correo = (c.correo || '').toLowerCase();
      const coincideConsecutivo = item.consecutivos.some(cons => cons.toLowerCase().includes(q));

      return (
        nombreCompleto.includes(q) ||
        tel.includes(q) ||
        wa.includes(q) ||
        correo.includes(q) ||
        coincideConsecutivo
      );
    });
  }, [clientesConHistorial, busqueda]);

  const clienteSeleccionado = useMemo(() => {
    if (!clienteDetalleId) return null;
    return clientesConHistorial.find(item => item.cliente.id === clienteDetalleId) || null;
  }, [clientesConHistorial, clienteDetalleId]);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Users size={18} /> Directorio de Clientes y Consecutivos
          </div>
          <div className="text-xs text-muted mt-1">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrados · Historial y datos de contacto permanentes
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={abrirNuevo}>
          <Plus size={14} /> Nuevo cliente
        </button>
      </div>

      {/* Buscador inteligente */}
      <div style={{ padding: '0 0 1rem 0' }}>
        <div className="field" style={{ position: 'relative', margin: 0 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar por nombre, celular o número de consecutivo (ej: 1001, COT-1001)…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ paddingLeft: '2rem' }}
          />
        </div>
        {busqueda && (
          <div className="text-xs text-muted" style={{ marginTop: '0.35rem' }}>
            Resultados de búsqueda: <strong>{filtrados.length}</strong> cliente{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Formulario (modal inline) */}
      {editando && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div className="panel-title">{form.id ? 'Editar cliente' : 'Nuevo cliente'}</div>
              <button className="btn btn-sm" onClick={cerrar}><X size={14} /></button>
            </div>

            <form onSubmit={handleGuardar} style={{ display: 'grid', gap: '0.75rem', padding: '1.25rem' }}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field">
                  <label>Nombre *</label>
                  <input value={form.nombre || ''} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" />
                </div>
                <div className="field">
                  <label>Apellido</label>
                  <input value={form.apellido || ''} onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))} placeholder="Apellido" />
                </div>
                <div className="field">
                  <label><Phone size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Celular / Teléfono</label>
                  <input value={form.telefono || ''} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="Ej. 3001234567" />
                </div>
                <div className="field">
                  <label><MessageCircle size={11} style={{ display:'inline', verticalAlign:'-1px', color:'#25d366' }} /> WhatsApp</label>
                  <input value={form.whatsapp || ''} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="Ej. 573001234567" />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label><Mail size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Correo electrónico</label>
                  <input type="email" value={form.correo || ''} onChange={e => setForm(p => ({ ...p, correo: e.target.value }))} placeholder="correo@ejemplo.com" />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Observaciones</label>
                  <textarea rows={3} value={form.observaciones || ''} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} placeholder="Preferencias, alergias, notas…" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button type="button" className="btn" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  <Save size={14} /> {guardando ? 'Guardando…' : 'Guardar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle de Historial del Cliente */}
      {clienteSeleccionado && (
        <div className="modal-overlay" onClick={() => setClienteDetalleId(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Users size={16} /> Expediente: {clienteSeleccionado.cliente.nombre} {clienteSeleccionado.cliente.apellido || ''}
              </div>
              <button className="btn btn-sm" onClick={() => setClienteDetalleId(null)}><X size={14} /></button>
            </div>

            <div style={{ padding: '1.25rem', display: 'grid', gap: '1rem' }}>
              <div style={{ background: 'var(--surface-sunken)', padding: '0.85rem', borderRadius: 'var(--rad-xs)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {clienteSeleccionado.cliente.nombre} {clienteSeleccionado.cliente.apellido || ''}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
                      📞 {clienteSeleccionado.cliente.telefono || 'Sin celular'} · WhatsApp: {clienteSeleccionado.cliente.whatsapp || 'No registrado'}
                    </div>
                  </div>
                  {clienteSeleccionado.cliente.whatsapp && (
                    <a
                      href={`https://wa.me/${clienteSeleccionado.cliente.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm"
                      style={{ color: '#25d366', borderColor: '#25d366' }}
                    >
                      <MessageCircle size={13} /> Chat WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {/* Resumen económico del cliente */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                <div style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {clienteSeleccionado.reservas.length}
                  </div>
                  <div className="text-xs text-muted">Reservas totales</div>
                </div>
                <div style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>
                    {clienteSeleccionado.reservasCerradas}
                  </div>
                  <div className="text-xs text-muted">Completadas</div>
                </div>
                <div style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                    {formatCOP(clienteSeleccionado.totalGastado)}
                  </div>
                  <div className="text-xs text-muted">Total facturado</div>
                </div>
              </div>

              {/* Listado de reservas asociadas */}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} /> Reservas Registradas
                </div>
                {clienteSeleccionado.reservas.length === 0 ? (
                  <p className="text-xs text-muted" style={{ fontStyle: 'italic' }}>Este cliente aún no tiene reservas formalizadas.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '0.4rem' }}>
                    {clienteSeleccionado.reservas.map(r => (
                      <div
                        key={r.id}
                        style={{
                          padding: '0.6rem 0.75rem',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--rad-xs)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.8rem',
                        }}
                      >
                        <div>
                          <strong>{r.fincas?.nombre || 'Finca'}</strong>
                          <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '0.74rem' }}>
                            {r.fecha_inicio} → {r.fecha_fin}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {r.consecutivo && (
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.72rem', color: 'var(--primary)' }}>
                              {formatearConsecutivoSimple(r.consecutivo)}
                            </span>
                          )}
                          <span className="status-badge" style={{ fontSize: '0.66rem' }}>{r.estado}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Listado de cotizaciones asociadas */}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Hash size={14} /> Cotizaciones Previas
                </div>
                {clienteSeleccionado.cotizaciones.length === 0 ? (
                  <p className="text-xs text-muted" style={{ fontStyle: 'italic' }}>Sin cotizaciones previas.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '0.4rem' }}>
                    {clienteSeleccionado.cotizaciones.map(c => (
                      <div
                        key={c.id}
                        style={{
                          padding: '0.6rem 0.75rem',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--rad-xs)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.8rem',
                        }}
                      >
                        <div>
                          <span>{c.fincas?.nombre || 'Finca'}</span>
                          <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '0.74rem' }}>
                            {c.fecha_inicio} → {c.fecha_fin} · {formatCOP(c.total)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {c.consecutivo && (
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.72rem', color: 'var(--primary)' }}>
                              {formatearConsecutivoSimple(c.consecutivo)}
                            </span>
                          )}
                          <span className="status-badge" style={{ fontSize: '0.66rem' }}>{c.estado}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de clientes */}
      <div className="avail-table">
        {filtrados.length === 0 ? (
          <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '1.5rem' }}>
            {busqueda ? `Sin resultados para "${busqueda}".` : 'No hay clientes registrados aún.'}
          </p>
        ) : (
          filtrados.map(item => {
            const c = item.cliente;
            return (
              <div key={c.id} className="avail-row" style={{ alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap', padding: '0.85rem 1rem' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                      {c.nombre} {c.apellido || ''}
                    </span>
                    {item.esRecurrente && (
                      <span className="status-badge s-avail" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Award size={10} /> Cliente Frecuente
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    {c.telefono && (
                      <span><Phone size={10} style={{ display:'inline', verticalAlign:'-1px' }} /> {c.telefono}</span>
                    )}
                    {c.whatsapp && (
                      <a
                        href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#25d366', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 500 }}
                      >
                        <MessageCircle size={10} /> {c.whatsapp}
                      </a>
                    )}
                    {c.correo && (
                      <span><Mail size={10} style={{ display:'inline', verticalAlign:'-1px' }} /> {c.correo}</span>
                    )}
                  </div>

                  {/* Consecutivos asociados al cliente */}
                  {item.consecutivos.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Consecutivos:
                      </span>
                      {item.consecutivos.map(cons => (
                        <span
                          key={cons}
                          title="Número consecutivo asociado"
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.45rem',
                            background: 'rgba(26, 107, 94, 0.08)',
                            color: 'var(--primary)',
                            border: '1px solid rgba(26, 107, 94, 0.25)',
                            borderRadius: '4px',
                          }}
                        >
                          {cons}
                        </span>
                      ))}
                    </div>
                  )}

                  {c.observaciones && (
                    <div className="text-xs" style={{ color: 'var(--text-faint)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                      {c.observaciones}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, alignItems: 'center' }}>
                  <button
                    className="btn btn-sm"
                    onClick={() => setClienteDetalleId(c.id)}
                    title="Ver historial y reservas de este cliente"
                    style={{ fontSize: '0.75rem', gap: '0.3rem' }}
                  >
                    <History size={12} /> Historial ({item.reservas.length})
                  </button>
                  <button className="btn btn-sm" onClick={() => abrirEdicion(c)} title="Editar datos"><Edit3 size={13} /></button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleEliminar(c)} title="Desactivar"><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
