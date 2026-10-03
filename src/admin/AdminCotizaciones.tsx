import React, { useState } from 'react';
import {
  FileText, Plus, Edit3, Trash2, X, Save, ChevronDown, ArrowRight,
  Calendar, Users, Utensils, DollarSign, Tag, MessageCircle, Download, Hash, Copy, Check
} from 'lucide-react';
import type { CotizacionDB, CotizacionEstado, Cliente, Finca, Menu } from '../types';
import { generarPropuestaAlimentacion, generarDocCotizacion } from '../services/documentos';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { plantillaCotizacion, plantillaPropuestaAlimentacion } from '../services/whatsapp';
import { calcularCotizacion } from '../utils/calcularCotizacion';
import { CurrencyInput } from '../components/CurrencyInput';

interface AdminCotizacionesProps {
  cotizaciones: CotizacionDB[];
  clientes: Cliente[];
  fincas: Finca[];
  menus?: Menu[];
  onGuardar: (datos: Partial<CotizacionDB>) => Promise<{ success: boolean; id?: string; error?: string }>;
  onCambiarEstado: (id: string, estado: CotizacionEstado) => Promise<{ success: boolean; error?: string }>;
  onEliminar: (id: string) => Promise<{ success: boolean; error?: string }>;
  onConvertirReserva?: (cotizacion: CotizacionDB) => void;
  onRegistrarComunicacion?: (com: any) => void;
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
  menu_id: null,
  cantidad_alimentacion: 1,
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

// ─── Badge de consecutivo copiable ────────────────────────────────────────────
const ConsecutivoBadge: React.FC<{ consecutivo: string }> = ({ consecutivo }) => {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(consecutivo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch { /* silent */ }
  };
  return (
    <button
      type="button"
      title="Clic para copiar"
      onClick={copiar}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 700,
        color: copiado ? '#16a34a' : 'var(--primary)',
        background: copiado ? 'rgba(34,197,94,0.10)' : 'color-mix(in srgb, var(--primary) 10%, transparent)',
        border: `1px solid ${copiado ? 'rgba(34,197,94,0.3)' : 'color-mix(in srgb, var(--primary) 25%, transparent)'}`,
        borderRadius: '6px', padding: '0.1rem 0.45rem',
        cursor: 'pointer', transition: 'all 0.2s ease',
        letterSpacing: '0.03em',
      }}
    >
      {copiado ? <Check size={10} /> : <Hash size={10} />}
      {consecutivo}
      {!copiado && <Copy size={9} style={{ opacity: 0.5 }} />}
    </button>
  );
};

export const AdminCotizaciones: React.FC<AdminCotizacionesProps> = ({
  cotizaciones,
  clientes,
  fincas,
  menus = [],
  onGuardar,
  onCambiarEstado,
  onEliminar,
  onConvertirReserva,
  onRegistrarComunicacion,
  showToast,
  openConfirm,
}) => {
  const [form, setForm] = useState<Partial<CotizacionDB>>(VACIO);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<CotizacionEstado | 'todas'>('todas');
  const [modoAlimentacionPersonalizada, setModoAlimentacionPersonalizada] = useState(false);
  const [modalWaCotiz, setModalWaCotiz] = useState<{
    abierto: boolean;
    cotizacion?: CotizacionDB;
    titulo: string;
    nombreDoc?: string;
    mensaje: string;
    onGenerarPdf?: () => void;
    tipo: 'cotizacion' | 'menu';
  }>({
    abierto: false,
    titulo: '',
    mensaje: '',
    tipo: 'cotizacion',
  });

  const abrirNuevo = () => {
    setForm(VACIO);
    setModoAlimentacionPersonalizada(false);
    setEditando(true);
  };
  const abrirEdicion = (c: CotizacionDB) => {
    setForm({ ...c });
    setModoAlimentacionPersonalizada(!c.menu_id && !!c.alimentacion && c.alimentacion !== 'Sin alimentación');
    setEditando(true);
  };
  const cerrar = () => { setForm(VACIO); setEditando(false); };

  // Recalcular subtotal usando la función compartida calcularCotizacion (fuente única de verdad)
  const recalcular = (f: Partial<CotizacionDB>): Partial<CotizacionDB> => {
    const n = noches(f.fecha_inicio || '', f.fecha_fin || '');
    let menuPrecioPp = 0;
    if (f.menu_id && !modoAlimentacionPersonalizada) {
      const m = menus.find(x => x.id === f.menu_id);
      if (m) {
        menuPrecioPp = m.precio_pp || 0;
      }
    }

    const { subtotalAlojamiento, costoAlimentacion, total } = calcularCotizacion({
      noches: n,
      personas: f.personas || 1,
      precioPp: f.precio_base_pp || 0,
      menuPrecioPp,
      cantidadServicios: f.cantidad_alimentacion || n,
      descuento: f.descuento || 0,
      recargo: f.recargo || 0,
    });

    const costoFinalAlim = (f.menu_id && !modoAlimentacionPersonalizada)
      ? costoAlimentacion
      : (f.costo_alimentacion ?? 0);

    const totalFinal = (f.menu_id && !modoAlimentacionPersonalizada)
      ? total
      : Math.max(0, subtotalAlojamiento + costoFinalAlim - (f.descuento || 0) + (f.recargo || 0));

    return { ...f, subtotal_alojamiento: subtotalAlojamiento, costo_alimentacion: costoFinalAlim, total: totalFinal };
  };

  const updateField = (campo: keyof CotizacionDB, valor: any) => {
    setForm(prev => recalcular({ ...prev, [campo]: valor }));
  };

  // Al seleccionar menú
  const handleMenuSelect = (menuId: string) => {
    if (menuId === 'custom') {
      setModoAlimentacionPersonalizada(true);
      setForm(prev => ({ ...prev, menu_id: null, alimentacion: '' }));
      return;
    }
    setModoAlimentacionPersonalizada(false);
    if (!menuId) {
      setForm(prev => recalcular({
        ...prev,
        menu_id: null,
        alimentacion: 'Sin alimentación',
        costo_alimentacion: 0,
      }));
      return;
    }
    const m = menus.find(x => x.id === menuId);
    if (!m) return;
    const n = noches(form.fecha_inicio || '', form.fecha_fin || '');
    const cant = form.cantidad_alimentacion || n;
    const costo = (m.precio_pp || 0) * (form.personas || 1) * cant;
    setForm(prev => recalcular({
      ...prev,
      menu_id: m.id,
      alimentacion: `${m.categoria}: ${m.nombre}`,
      cantidad_alimentacion: cant,
      costo_alimentacion: costo,
    }));
  };

  // Al seleccionar finca, copiar precio_pp
  const handleFincaChange = (fincaId: string) => {
    const finca = fincas.find(f => f.id === fincaId);
    setForm(prev => recalcular({ ...prev, finca_id: fincaId, precio_base_pp: finca?.precio_pp || 0 }));
  };

  // Descargar PDF de alimentación
  const handleDescargarPdfAlimentacion = async (c: CotizacionDB) => {
    const m = menus.find(x => x.id === c.menu_id) || (c.alimentacion && c.alimentacion !== 'Sin alimentación' ? {
      id: c.menu_id || 'cotiz-menu',
      nombre: c.alimentacion,
      categoria: 'Almuerzo' as const,
      precio_pp: (c.costo_alimentacion || 0) / Math.max(1, (c.personas || 1) * (c.cantidad_alimentacion || c.noches || 1)),
      activo: true,
    } : null);

    if (!m) {
      showToast('Esta cotización no incluye servicio de alimentación', 'info');
      return;
    }

    try {
      await generarPropuestaAlimentacion({
        menu: m,
        cliente: c.clientes,
        finca: c.fincas,
        personas: c.personas,
        cantidadServicios: c.cantidad_alimentacion || c.noches || 1,
      });
      showToast('Propuesta de alimentación descargada en PDF ✅', 'success');
    } catch {
      showToast('Error generando PDF de propuesta de alimentación', 'error');
    }
  };

  const handleAbrirWaCotizacion = (c: CotizacionDB) => {
    setModalWaCotiz({
      abierto: true,
      cotizacion: c,
      titulo: `Cotización Oficial · ${c.fincas?.nombre || 'Finca'}`,
      mensaje: plantillaCotizacion(c, c.fincas, c.clientes),
      nombreDoc: 'Cotización Oficial (PDF)',
      onGenerarPdf: () => generarDocCotizacion(c),
      tipo: 'cotizacion',
    });
  };

  const handleAbrirWaMenu = (c: CotizacionDB) => {
    const m = menus.find(x => x.id === c.menu_id) || (c.alimentacion && c.alimentacion !== 'Sin alimentación' ? {
      id: c.menu_id || 'cotiz-menu',
      nombre: c.alimentacion,
      categoria: 'Almuerzo' as const,
      precio_pp: (c.costo_alimentacion || 0) / Math.max(1, (c.personas || 1) * (c.cantidad_alimentacion || c.noches || 1)),
      activo: true,
    } : null);

    if (!m) {
      showToast('Esta cotización no incluye servicio de alimentación', 'info');
      return;
    }

    setModalWaCotiz({
      abierto: true,
      cotizacion: c,
      titulo: `Propuesta de Menú · ${m.nombre}`,
      nombreDoc: 'Propuesta de Alimentación (PDF)',
      mensaje: plantillaPropuestaAlimentacion({
        menu: m,
        cliente: c.clientes,
        finca: c.fincas,
        personas: c.personas,
        cantidadServicios: c.cantidad_alimentacion || c.noches || 1,
      }),
      onGenerarPdf: () => handleDescargarPdfAlimentacion(c),
      tipo: 'menu',
    });
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

                {/* Personas */}
                <div className="field">
                  <label><Users size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Personas</label>
                  <input type="number" min={1} max={fincaSeleccionada?.capacidad || 100} value={form.personas || 1} onChange={e => updateField('personas', +e.target.value)} />
                </div>

                {/* Selección de Menú */}
                <div className="field">
                  <label><Utensils size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Menú de Alimentación</label>
                  <select
                    value={modoAlimentacionPersonalizada ? 'custom' : (form.menu_id || '')}
                    onChange={e => handleMenuSelect(e.target.value)}
                  >
                    <option value="">— Sin alimentación ($0) —</option>
                    {menus.filter(m => m.activo).map(m => (
                      <option key={m.id} value={m.id}>
                        [{m.categoria}] {m.nombre} — {formatCOP(m.precio_pp)}/pp
                      </option>
                    ))}
                    <option value="custom">✏️ Personalizado / Texto libre</option>
                  </select>
                </div>

                {/* Cantidad de servicios/días de alimentación */}
                {(form.menu_id || modoAlimentacionPersonalizada || (form.costo_alimentacion || 0) > 0) && (
                  <>
                    <div className="field">
                      <label>Servicios / Días de alimentación</label>
                      <input
                        type="number"
                        min={1}
                        value={form.cantidad_alimentacion || nochesCotiz || 1}
                        onChange={e => updateField('cantidad_alimentacion', Math.max(1, +e.target.value))}
                      />
                    </div>

                    <div className="field">
                      <label>Detalle / Nombre alimentación</label>
                      <input
                        value={form.alimentacion || ''}
                        onChange={e => updateField('alimentacion', e.target.value)}
                        placeholder="Ej. Sancocho en leña"
                      />
                    </div>
                  </>
                )}

                {/* Valores */}
                <div className="field">
                  <label><DollarSign size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Precio base /pp/noche</label>
                  <CurrencyInput
                    value={form.precio_base_pp}
                    onChange={val => updateField('precio_base_pp', val)}
                    placeholder="0"
                  />
                </div>
                <div className="field">
                  <label>Costo alimentación total</label>
                  <CurrencyInput
                    value={form.costo_alimentacion}
                    onChange={val => updateField('costo_alimentacion', val)}
                    placeholder="0"
                  />
                </div>
                <div className="field">
                  <label>Descuento</label>
                  <CurrencyInput
                    value={form.descuento}
                    onChange={val => updateField('descuento', val)}
                    placeholder="0"
                  />
                </div>
                <div className="field">
                  <label>Recargo</label>
                  <CurrencyInput
                    value={form.recargo}
                    onChange={val => updateField('recargo', val)}
                    placeholder="0"
                  />
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
                {(form.costo_alimentacion || 0) > 0 && (
                  <div className="quote-row">
                    <span className="text-muted">Alimentación ({form.alimentacion || 'Menú'}):</span>
                    <span>+{formatCOP(form.costo_alimentacion || 0)}</span>
                  </div>
                )}
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
            const tieneAlimentacion = (c.costo_alimentacion || 0) > 0 || (c.alimentacion && c.alimentacion !== 'Sin alimentación');

            return (
              <div key={c.id} className="avail-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Tag size={12} /> {fincaNombre}
                    <span className={`status-badge ${ESTADO_COLORS[c.estado]}`} style={{ fontSize: '0.68rem' }}>{c.estado}</span>
                    {/* Badge consecutivo copiable */}
                    {c.consecutivo && (
                      <ConsecutivoBadge consecutivo={c.consecutivo} />
                    )}
                    {tieneAlimentacion && (
                      <span className="status-badge s-avail" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Utensils size={10} /> {c.alimentacion || 'Con alimentación'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
                    <Calendar size={10} style={{ display:'inline', verticalAlign:'-1px' }} /> {formatFecha(c.fecha_inicio)} → {formatFecha(c.fecha_fin)}
                    {' · '}<Users size={10} style={{ display:'inline', verticalAlign:'-1px' }} /> {c.personas} personas
                    {clienteNombre !== '—' && (
                      <>
                        {' · '}👤 {clienteNombre}
                        {c.clientes?.whatsapp && (
                          <a
                            href={`https://wa.me/${c.clientes.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#25d366', marginLeft: '0.35rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                          >
                            <MessageCircle size={10} /> {c.clientes.whatsapp}
                          </a>
                        )}
                      </>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem', marginTop: '0.15rem' }}>
                    {formatCOP(c.total)}
                    {tieneAlimentacion && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.45rem' }}>
                        (incluye {formatCOP(c.costo_alimentacion)} en alimentación)
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Botón Descargar PDF Cotización */}
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: '0.72rem', gap: '0.3rem', padding: '0.25rem 0.55rem' }}
                    title="Descargar Cotización Formal en PDF"
                    onClick={() => {
                      generarDocCotizacion(c);
                      showToast('Cotización descargada en PDF ✅', 'success');
                    }}
                  >
                    <Download size={12} /> PDF Cotización
                  </button>

                  {/* Botón WhatsApp Cotización */}
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: '0.72rem', gap: '0.3rem', padding: '0.25rem 0.55rem', color: '#25d366', borderColor: '#25d366' }}
                    title="Enviar cotización por WhatsApp al cliente"
                    onClick={() => handleAbrirWaCotizacion(c)}
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </button>

                  {/* Botón generar propuesta PDF de alimentación */}
                  {tieneAlimentacion && (
                    <>
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ fontSize: '0.72rem', gap: '0.3rem', padding: '0.25rem 0.55rem' }}
                        title="Descargar Propuesta de Alimentación en PDF"
                        onClick={() => handleDescargarPdfAlimentacion(c)}
                      >
                        <Utensils size={12} /> PDF Menú
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: '0.72rem', gap: '0.3rem', padding: '0.25rem 0.55rem', color: '#25d366', borderColor: '#25d366' }}
                        title="Enviar Propuesta de Menú por WhatsApp"
                        onClick={() => handleAbrirWaMenu(c)}
                      >
                        <Utensils size={12} /> WA Menú
                      </button>
                    </>
                  )}

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

                  {onConvertirReserva && c.estado !== 'cancelada' && c.estado !== 'vencida' && (
                    <button
                      className="btn btn-sm btn-primary"
                      title="Convertir esta cotización en una Reserva formal"
                      style={{ fontSize: '0.72rem', gap: '0.3rem', padding: '0.25rem 0.6rem' }}
                      onClick={async () => {
                        if (c.estado !== 'confirmada') {
                          await onCambiarEstado(c.id, 'confirmada');
                        }
                        onConvertirReserva(c);
                      }}
                    >
                      <ArrowRight size={13} /> Pasar a Reserva
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

      {/* Modal de WhatsApp para Cotizaciones y Menús */}
      {modalWaCotiz.abierto && modalWaCotiz.cotizacion && (
        <WhatsAppModal
          isOpen={modalWaCotiz.abierto}
          onClose={() => setModalWaCotiz(p => ({ ...p, abierto: false }))}
          titulo={modalWaCotiz.titulo}
          destinatarioNombre={modalWaCotiz.cotizacion.clientes ? `${modalWaCotiz.cotizacion.clientes.nombre} ${modalWaCotiz.cotizacion.clientes.apellido || ''}`.trim() : 'Cliente'}
          telefonoInicial={modalWaCotiz.cotizacion.clientes?.whatsapp || ''}
          mensajeInicial={modalWaCotiz.mensaje}
          nombreDocumento={modalWaCotiz.nombreDoc}
          onGenerarPdf={modalWaCotiz.onGenerarPdf}
          onDespuesDeEnviar={(tel, msg) => {
            showToast('Cotización enviada por WhatsApp al cliente ✅', 'success');
            onRegistrarComunicacion?.({
              cliente_id: modalWaCotiz.cotizacion?.cliente_id || null,
              cotizacion_id: modalWaCotiz.cotizacion?.id || null,
              tipo: modalWaCotiz.tipo,
              destinatario: modalWaCotiz.cotizacion?.clientes ? `${modalWaCotiz.cotizacion.clientes.nombre} ${modalWaCotiz.cotizacion.clientes.apellido || ''}`.trim() : 'Cliente',
              telefono: tel,
              mensaje: msg,
              estado: 'enviado',
            });
          }}
        />
      )}
    </div>
  );
};
