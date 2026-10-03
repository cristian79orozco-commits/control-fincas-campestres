import React, { useState, useMemo } from 'react';
import {
  Users, Plus, Edit3, Trash2, Phone, Mail, MessageCircle, X, Save,
  Search, Hash, History, Calendar, Check, Copy, Award, Home, Utensils,
  DollarSign, Sparkles
} from 'lucide-react';
import type { Cliente, Reserva, CotizacionDB, Finca } from '../types';

interface AdminClientesProps {
  clientes: Cliente[];
  reservas?: Reserva[];
  cotizaciones?: CotizacionDB[];
  fincas?: Finca[];
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

function calcularNoches(inicio?: string | null, fin?: string | null): number {
  if (!inicio || !fin) return 0;
  const d1 = new Date(inicio);
  const d2 = new Date(fin);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

export const AdminClientes: React.FC<AdminClientesProps> = ({
  clientes,
  reservas = [],
  cotizaciones = [],
  fincas = [],
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
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

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

  const copiarConsecutivo = async (consecutivo: string) => {
    try {
      await navigator.clipboard.writeText(consecutivo);
      setCopiadoId(consecutivo);
      showToast(`Consecutivo ${consecutivo} copiado al portapapeles`, 'success');
      setTimeout(() => setCopiadoId(null), 1800);
    } catch {
      showToast(`Código: ${consecutivo}`, 'info');
    }
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

  // Mapeo enriquecido de clientes con sus consecutivos, historial y detalles de cotización (Finca, Días, Menú)
  const clientesConHistorial = useMemo(() => {
    return clientes.map(c => {
      const reservasCliente = reservas.filter(r => r.cliente_id === c.id);
      const cotizacionesCliente = cotizaciones.filter(cot => cot.cliente_id === c.id);

      // Consecutivos únicos del cliente (limpios de letras)
      const consecutivosList: string[] = [];
      reservasCliente.forEach(r => {
        if (r.consecutivo) {
          const limp = r.consecutivo.match(/\d+/g)?.join('') || r.consecutivo.replace(/^[A-Za-z\-]+/, '');
          if (limp && !consecutivosList.includes(limp)) consecutivosList.push(limp);
        }
      });
      cotizacionesCliente.forEach(cot => {
        if (cot.consecutivo) {
          const limp = cot.consecutivo.match(/\d+/g)?.join('') || cot.consecutivo.replace(/^[A-Za-z\-]+/, '');
          if (limp && !consecutivosList.includes(limp)) consecutivosList.push(limp);
        }
      });

      // Última cotización o reserva para extraer Finca, Días y Menú
      const ultimaCot = cotizacionesCliente[0] || null;
      const ultimaRes = reservasCliente[0] || null;

      const fincaId = ultimaCot?.finca_id || ultimaRes?.finca_id;
      const fincaObj = fincas.find(f => f.id === fincaId);
      const fincaNombre = ultimaCot?.fincas?.nombre || ultimaRes?.fincas?.nombre || fincaObj?.nombre || (fincaId ? 'Finca Campestre' : null);

      const fechaInicio = ultimaCot?.fecha_inicio || ultimaRes?.fecha_inicio || null;
      const fechaFin = ultimaCot?.fecha_fin || ultimaRes?.fecha_fin || null;
      const menuNombre = ultimaCot?.alimentacion || ultimaRes?.alimentacion || null;
      const personas = ultimaCot?.personas || ultimaRes?.personas || null;
      const totalEstimado = ultimaCot?.total || ultimaRes?.valor_total || null;

      const totalGastado = reservasCliente.reduce((acc, r) => acc + (r.valor_total || 0), 0);
      const reservasActivas = reservasCliente.filter(r => r.estado === 'activa').length;
      const reservasCerradas = reservasCliente.filter(r => r.estado === 'completada').length;

      return {
        cliente: c,
        reservas: reservasCliente,
        cotizaciones: cotizacionesCliente,
        consecutivos: consecutivosList,
        fincaNombre,
        fechaInicio,
        fechaFin,
        menuNombre,
        personas,
        totalEstimado,
        totalGastado,
        reservasActivas,
        reservasCerradas,
        esRecurrente: reservasCliente.length > 1,
        esNuevoWeb: Boolean(c.observaciones?.includes('Cotizador Web')),
      };
    });
  }, [clientes, reservas, cotizaciones, fincas]);

  // Filtrado que soporta búsqueda por nombre, teléfono, correo, número consecutivo o finca
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return clientesConHistorial;

    return clientesConHistorial.filter(item => {
      const c = item.cliente;
      const nombreCompleto = `${c.nombre} ${c.apellido || ''}`.toLowerCase();
      const tel = (c.telefono || '').toLowerCase();
      const wa = (c.whatsapp || '').toLowerCase();
      const correo = (c.correo || '').toLowerCase();
      const finca = (item.fincaNombre || '').toLowerCase();
      const coincideConsecutivo = item.consecutivos.some(cons => cons.toLowerCase().includes(q));

      return (
        nombreCompleto.includes(q) ||
        tel.includes(q) ||
        wa.includes(q) ||
        correo.includes(q) ||
        finca.includes(q) ||
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
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrados · Historial, seguimiento por consecutivo y cotizaciones
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
            placeholder="Buscar por consecutivo (ej: 1001), nombre, celular o finca…"
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

      {/* TABLA PRINCIPAL DE 3 COLUMNAS SOLICITADAS + DETALLE DE COTIZACIÓN */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)', background: 'var(--bg-card)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '780px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-sunken)', borderBottom: '1px solid var(--border)', fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '0.75rem 1rem', width: '22%' }}>Cliente / Nombre</th>
              <th style={{ padding: '0.75rem 1rem', width: '18%' }}>Celular / WhatsApp</th>
              <th style={{ padding: '0.75rem 1rem', width: '15%' }}>Consecutivo</th>
              <th style={{ padding: '0.75rem 1rem', width: '30%' }}>Cotización (Finca, Días y Menú)</th>
              <th style={{ padding: '0.75rem 1rem', width: '15%', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {busqueda ? `Sin resultados para "${busqueda}".` : 'No hay clientes registrados aún en el sistema.'}
                </td>
              </tr>
            ) : (
              filtrados.map(item => {
                const c = item.cliente;
                const telWhatsApp = (c.whatsapp || c.telefono || '').replace(/\D/g, '');
                const noches = calcularNoches(item.fechaInicio, item.fechaFin);

                return (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.15s ease',
                      fontSize: '0.82rem',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-sunken)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* COLUMNA 1: NOMBRE DEL CLIENTE */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                          {c.nombre} {c.apellido || ''}
                        </strong>
                        {item.esRecurrente && (
                          <span className="status-badge s-avail" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
                            <Award size={9} /> Frecuente
                          </span>
                        )}
                        {item.esNuevoWeb && (
                          <span style={{
                            fontSize: '0.62rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            background: 'rgba(26, 107, 94, 0.10)',
                            color: 'var(--primary)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}>
                            <Sparkles size={9} /> Web
                          </span>
                        )}
                      </div>
                      {c.correo && (
                        <div className="text-xs text-muted" style={{ marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Mail size={10} /> {c.correo}
                        </div>
                      )}
                    </td>

                    {/* COLUMNA 2: CELULAR / WHATSAPP */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {(c.telefono || c.whatsapp) ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-main)' }}>
                              {c.telefono || c.whatsapp}
                            </span>
                            {telWhatsApp && (
                              <a
                                href={`https://wa.me/${telWhatsApp}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm"
                                title="Abrir chat de WhatsApp"
                                style={{
                                  padding: '0.15rem 0.45rem',
                                  fontSize: '0.68rem',
                                  color: '#25d366',
                                  borderColor: 'rgba(37, 211, 102, 0.35)',
                                  background: 'rgba(37, 211, 102, 0.08)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                <MessageCircle size={11} /> WhatsApp
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted" style={{ fontStyle: 'italic' }}>Sin teléfono</span>
                        )}
                      </div>
                    </td>

                    {/* COLUMNA 3: CONSECUTIVO */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>
                      {item.consecutivos.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {item.consecutivos.map(cons => (
                            <button
                              key={cons}
                              type="button"
                              onClick={() => copiarConsecutivo(cons)}
                              title="Clic para copiar este consecutivo de seguimiento"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontFamily: 'monospace',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.5rem',
                                background: copiadoId === cons ? 'rgba(34,197,94,0.12)' : 'rgba(26, 107, 94, 0.08)',
                                color: copiadoId === cons ? '#16a34a' : 'var(--primary)',
                                border: `1px solid ${copiadoId === cons ? 'rgba(34,197,94,0.4)' : 'rgba(26, 107, 94, 0.25)'}`,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                width: 'fit-content',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {copiadoId === cons ? <Check size={10} /> : <Hash size={10} />}
                              {cons}
                              <Copy size={9} style={{ opacity: 0.5 }} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted" style={{ fontStyle: 'italic' }}>Sin consecutivo</span>
                      )}
                    </td>

                    {/* COLUMNA 4: DETALLE DE COTIZACIÓN (FINCA, DÍAS Y MENÚ) */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>
                      {item.fincaNombre || item.fechaInicio || item.menuNombre ? (
                        <div style={{ display: 'grid', gap: '0.25rem', fontSize: '0.78rem' }}>
                          {/* Finca */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            <Home size={12} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                            <span>{item.fincaNombre || 'Finca por asignar'}</span>
                          </div>

                          {/* Días / Fechas */}
                          {item.fechaInicio && item.fechaFin ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                              <Calendar size={11} style={{ flexShrink: 0 }} />
                              <span>
                                {item.fechaInicio} al {item.fechaFin} ({noches} noche{noches !== 1 ? 's' : ''})
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-muted" style={{ fontStyle: 'italic' }}>Fechas sin definir</div>
                          )}

                          {/* Menú / Plan de alimentación */}
                          {item.menuNombre && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                              <Utensils size={11} style={{ flexShrink: 0, color: '#f59e0b' }} />
                              <span>{item.menuNombre}</span>
                            </div>
                          )}

                          {/* Personas y Total */}
                          {(item.personas || item.totalEstimado) && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                              {item.personas && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  👥 {item.personas} pers.
                                </span>
                              )}
                              {item.totalEstimado && (
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)' }}>
                                  {formatCOP(item.totalEstimado)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted" style={{ fontStyle: 'italic' }}>Sin cotización activa</span>
                      )}
                    </td>

                    {/* COLUMNA 5: ACCIONES */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => setClienteDetalleId(c.id)}
                          title="Ver expediente e historial completo"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', gap: '0.25rem' }}
                        >
                          <History size={11} /> Expediente
                        </button>
                        <button className="btn btn-sm" onClick={() => abrirEdicion(c)} title="Editar datos">
                          <Edit3 size={12} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleEliminar(c)} title="Desactivar">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FORMULARIO EDITAR / NUEVO CLIENTE (MODAL) */}
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
                  <textarea rows={3} value={form.observaciones || ''} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} placeholder="Preferencias, notas, etc…" />
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

      {/* MODAL EXPEDIENTE E HISTORIAL DEL CLIENTE */}
      {clienteSeleccionado && (
        <div className="modal-overlay" onClick={() => setClienteDetalleId(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto' }}>
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

                {clienteSeleccionado.consecutivos.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Consecutivos asociados:</span>
                    {clienteSeleccionado.consecutivos.map(cons => (
                      <span
                        key={cons}
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.45rem',
                          background: 'rgba(26, 107, 94, 0.1)',
                          color: 'var(--primary)',
                          borderRadius: '4px',
                          border: '1px solid rgba(26, 107, 94, 0.3)',
                        }}
                      >
                        #{cons}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumen económico */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                <div style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {clienteSeleccionado.reservas.length}
                  </div>
                  <div className="text-xs text-muted">Reservas totales</div>
                </div>
                <div style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#16a34a' }}>
                    {clienteSeleccionado.reservasActivas}
                  </div>
                  <div className="text-xs text-muted">Reservas activas</div>
                </div>
                <div style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.15rem' }}>
                    {formatCOP(clienteSeleccionado.totalGastado)}
                  </div>
                  <div className="text-xs text-muted">Total liquidado</div>
                </div>
              </div>

              {/* Listado de reservas */}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} /> Reservas Registradas
                </div>
                {clienteSeleccionado.reservas.length === 0 ? (
                  <p className="text-xs text-muted" style={{ fontStyle: 'italic' }}>Sin reservas registradas aún.</p>
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
                              #{r.consecutivo.match(/\d+/g)?.join('') || r.consecutivo}
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
                  <Hash size={14} /> Cotizaciones Asociadas
                </div>
                {clienteSeleccionado.cotizaciones.length === 0 ? (
                  <p className="text-xs text-muted" style={{ fontStyle: 'italic' }}>Sin cotizaciones previas.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '0.4rem' }}>
                    {clienteSeleccionado.cotizaciones.map(cot => (
                      <div
                        key={cot.id}
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
                          <strong>{cot.fincas?.nombre || 'Finca'}</strong>
                          <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '0.74rem' }}>
                            {cot.fecha_inicio} → {cot.fecha_fin} · {formatCOP(cot.total)}
                          </span>
                          {cot.alimentacion && (
                            <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>
                              🍽️ {cot.alimentacion}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {cot.consecutivo && (
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.72rem', color: 'var(--primary)' }}>
                              #{cot.consecutivo.match(/\d+/g)?.join('') || cot.consecutivo}
                            </span>
                          )}
                          <span className="status-badge" style={{ fontSize: '0.66rem' }}>{cot.estado}</span>
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
    </div>
  );
};
