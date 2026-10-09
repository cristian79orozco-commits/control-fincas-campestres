import React, { useState, useMemo } from 'react';
import {
  FileText, Plus, Edit3, Trash2, X, Save, ArrowRight,
  Calendar, Users, Utensils, Tag, MessageCircle, Download, Hash, Copy, Check, Eye, XCircle, AlertCircle
} from 'lucide-react';
import type { CotizacionDB, CotizacionEstado, Cliente, Finca, Menu } from '../types';
import { generarPropuestaAlimentacion, generarDocCotizacion } from '../services/documentos';
import { WhatsAppModal } from '../components/WhatsAppModal';
import {
  plantillaCotizacion,
  plantillaPedirAbonoCotizacion,
  plantillaPropuestaAlimentacion,
  plantillaCobroAlimentacion,
} from '../services/whatsapp';
import { calcularCotizacion } from '../utils/calcularCotizacion';
import { CurrencyInput } from '../components/CurrencyInput';
import { useApp } from '../context/AppContext';

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

type FiltroTab = 'pendientes' | 'confirmadas' | 'canceladas' | 'todas';

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
  estado: 'cotizada',
  notas: '',
};

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
  const consecutivoNum = consecutivo.match(/\d+/g)?.join('') || consecutivo.replace(/^[A-Za-z\-]+/, '');
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(consecutivoNum);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch { /* silent */ }
  };
  return (
    <button
      type="button"
      title="Clic para copiar código de seguimiento"
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
      {consecutivoNum}
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
  const { previsualizarFinca, configuracion, convertirCotizacionAReserva, navegarAAdmin } = useApp();
  const [form, setForm] = useState<Partial<CotizacionDB>>(VACIO);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [tabActiva, setTabActiva] = useState<FiltroTab>('pendientes');
  const [modoAlimentacionPersonalizada, setModoAlimentacionPersonalizada] = useState(false);

  // Modal para confirmar el pago del 50% y pasar a reserva
  const [modalConfirmarReserva, setModalConfirmarReserva] = useState<{
    abierto: boolean;
    cotizacion: CotizacionDB | null;
    anticipo: number;
    alimentacionPagada?: boolean;
    guardando: boolean;
  }>({
    abierto: false,
    cotizacion: null,
    anticipo: 0,
    alimentacionPagada: false,
    guardando: false,
  });

  // Modal para WhatsApp
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

  // Recalcular subtotal usando la función compartida calcularCotizacion
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

    return {
      ...f,
      noches: n,
      subtotal_alojamiento: subtotalAlojamiento,
      costo_alimentacion: costoAlimentacion,
      total,
    };
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

  // 1. Pedir Abono Finca (50%) -> Cuenta del propietario
  const handleAbrirPedirAbono = (c: CotizacionDB) => {
    const bancosInfo = {
      banco: configuracion?.banco_nombre || 'Bancolombia',
      tipoCuenta: configuracion?.banco_tipo_cuenta || 'Ahorros',
      cuenta: configuracion?.banco_cuenta || '',
      titular: configuracion?.banco_titular || configuracion?.nombre_empresa,
      nit: configuracion?.nit || undefined,
    };
    setModalWaCotiz({
      abierto: true,
      cotizacion: c,
      titulo: `Solicitud de Separación (50% Finca) · ${c.fincas?.nombre || 'Finca'}`,
      mensaje: plantillaPedirAbonoCotizacion(c, c.fincas, c.clientes, bancosInfo, 50),
      nombreDoc: 'Cotización Oficial y Separación (PDF)',
      onGenerarPdf: () => generarDocCotizacion(c, configuracion),
      tipo: 'cotizacion',
    });
  };

  // 2. Cobrar Planes de Alimentación -> Cuenta de la Administración
  const handleAbrirCobroAlimentacion = (c: CotizacionDB) => {
    const bancosAdmin = {
      banco: configuracion?.banco_nombre || 'Bancolombia',
      tipoCuenta: configuracion?.banco_tipo_cuenta || 'Ahorros',
      cuenta: configuracion?.banco_cuenta || '',
      titular: configuracion?.banco_titular || 'Administración de Fincas',
      nit: configuracion?.nit || undefined,
    };
    setModalWaCotiz({
      abierto: true,
      cotizacion: c,
      titulo: `Cobro de Alimentación y Menú · ${c.fincas?.nombre || 'Finca'}`,
      mensaje: plantillaCobroAlimentacion(c, c.fincas, c.clientes, bancosAdmin),
      nombreDoc: 'Propuesta de Alimentación (PDF)',
      onGenerarPdf: () => handleDescargarPdfAlimentacion(c),
      tipo: 'menu',
    });
  };

  // 3. Flujo guiado: Iniciar paso a reserva
  const handleIniciarPasoAReserva = (c: CotizacionDB) => {
    const valorAlojamiento = (c.subtotal_alojamiento && c.subtotal_alojamiento > 0)
      ? c.subtotal_alojamiento
      : Math.max(0, (c.total || 0) - (c.costo_alimentacion || 0));
    const anticipoSugerido = Math.round(valorAlojamiento * 0.5);

    setModalConfirmarReserva({
      abierto: true,
      cotizacion: c,
      anticipo: anticipoSugerido,
      alimentacionPagada: false,
      guardando: false,
    });
  };

  // Confirmar el paso a reserva
  const handleConfirmarPasoAReserva = async () => {
    if (!modalConfirmarReserva.cotizacion) return;
    setModalConfirmarReserva(prev => ({ ...prev, guardando: true }));
    const c = modalConfirmarReserva.cotizacion;
    const anticipo = modalConfirmarReserva.anticipo;
    const alimentacionPagada = modalConfirmarReserva.alimentacionPagada;

    try {
      const res = await convertirCotizacionAReserva(c, anticipo, alimentacionPagada);
      setModalConfirmarReserva({ abierto: false, cotizacion: null, anticipo: 0, alimentacionPagada: false, guardando: false });
      if (res.success) {
        showToast(`✓ ¡Cotización convertida en Reserva Activa con éxito!`, 'success');
        if (onConvertirReserva) {
          onConvertirReserva(c);
        }
      } else {
        showToast(`Error al convertir: ${res.error}`, 'error');
      }
    } catch (err: any) {
      setModalConfirmarReserva(prev => ({ ...prev, guardando: false }));
      showToast(`Error: ${err.message || 'No se pudo crear la reserva'}`, 'error');
    }
  };

  // 4. Cancelar cotización (si el cliente no consigna el dinero)
  const handleCancelarCotizacion = (c: CotizacionDB) => {
    openConfirm(
      '¿Cancelar cotización?',
      `¿Deseas marcar la cotización #${c.consecutivo || ''} como cancelada por falta de pago? Se conservará en el historial de canceladas.`,
      async () => {
        const res = await onCambiarEstado(c.id, 'cancelada');
        if (res.success) {
          showToast(`Cotización #${c.consecutivo || ''} marcada como cancelada`, 'info');
        } else {
          showToast(`Error: ${res.error}`, 'error');
        }
      }
    );
  };

  const handleEliminarDefinitivo = (c: CotizacionDB) => {
    openConfirm(
      '¿Eliminar definitivamente?',
      'Esta acción eliminará de forma permanente el registro del historial.',
      async () => {
        const res = await onEliminar(c.id);
        if (res.success) showToast('Cotización eliminada del historial', 'info');
        else showToast(`Error: ${res.error}`, 'error');
      }
    );
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

  // Filtrado lógico por pestañas
  const conteoPendientes = useMemo(() =>
    cotizaciones.filter(c => ['borrador', 'cotizada', 'pendiente'].includes(c.estado)).length,
    [cotizaciones]
  );
  const conteoConfirmadas = useMemo(() =>
    cotizaciones.filter(c => c.estado === 'confirmada').length,
    [cotizaciones]
  );
  const conteoCanceladas = useMemo(() =>
    cotizaciones.filter(c => ['cancelada', 'vencida'].includes(c.estado)).length,
    [cotizaciones]
  );

  const filtradas = useMemo(() => {
    return cotizaciones.filter(c => {
      if (tabActiva === 'pendientes') {
        return ['borrador', 'cotizada', 'pendiente'].includes(c.estado);
      }
      if (tabActiva === 'confirmadas') {
        return c.estado === 'confirmada';
      }
      if (tabActiva === 'canceladas') {
        return ['cancelada', 'vencida'].includes(c.estado);
      }
      return true; // todas
    });
  }, [cotizaciones, tabActiva]);

  const fincaSeleccionada = fincas.find(f => f.id === form.finca_id);

  return (
    <div className="panel">
      {/* Header del módulo */}
      <div className="panel-header" style={{ marginBottom: '1rem' }}>
        <div>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <FileText size={18} /> Cotizaciones
          </div>
          <div className="text-xs text-muted mt-1">
            {conteoPendientes} pendiente{conteoPendientes !== 1 ? 's' : ''} de aprobación · {cotizaciones.length} en total
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={abrirNuevo}>
          <Plus size={14} /> Nueva cotización
        </button>
      </div>

      {/* Pestañas de Navegación Inteligente */}
      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
        <button
          className={`btn btn-sm${tabActiva === 'pendientes' ? ' btn-primary' : ''}`}
          onClick={() => setTabActiva('pendientes')}
          style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
        >
          🟡 Pendientes de Aprobación
          {conteoPendientes > 0 && (
            <span style={{
              background: tabActiva === 'pendientes' ? 'rgba(255,255,255,0.25)' : 'var(--warning, #f59e0b)',
              color: tabActiva === 'pendientes' ? '#fff' : '#000',
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: 700,
            }}>
              {conteoPendientes}
            </span>
          )}
        </button>

        <button
          className={`btn btn-sm${tabActiva === 'confirmadas' ? ' btn-primary' : ''}`}
          onClick={() => setTabActiva('confirmadas')}
          style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          ✅ Confirmadas / En Reserva ({conteoConfirmadas})
        </button>

        <button
          className={`btn btn-sm${tabActiva === 'canceladas' ? ' btn-primary' : ''}`}
          onClick={() => setTabActiva('canceladas')}
          style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          ❌ Canceladas ({conteoCanceladas})
        </button>

        <button
          className={`btn btn-sm${tabActiva === 'todas' ? ' btn-primary' : ''}`}
          onClick={() => setTabActiva('todas')}
          style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          📋 Todas / Historial ({cotizaciones.length})
        </button>
      </div>

      {/* Modal formulario para Crear / Editar */}
      {editando && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="panel-title">{form.id ? 'Editar cotización' : 'Nueva cotización'}</div>
              <button className="btn btn-sm" onClick={cerrar}><X size={14} /></button>
            </div>

            <form onSubmit={handleGuardar} style={{ display: 'grid', gap: '0.85rem', padding: '1.25rem' }}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field">
                  <label>Cliente (opcional)</label>
                  <select value={form.cliente_id || ''} onChange={e => updateField('cliente_id', e.target.value || null)}>
                    <option value="">— Sin cliente —</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} {c.apellido || ''}</option>
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

                <div className="field">
                  <label><Calendar size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Llegada *</label>
                  <input type="date" value={form.fecha_inicio || ''} onChange={e => updateField('fecha_inicio', e.target.value)} />
                </div>
                <div className="field">
                  <label><Calendar size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Salida *</label>
                  <input type="date" value={form.fecha_fin || ''} min={form.fecha_inicio || ''} onChange={e => updateField('fecha_fin', e.target.value)} />
                </div>

                <div className="field">
                  <label><Users size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Personas</label>
                  <input type="number" min={1} max={fincaSeleccionada?.capacidad || 100} value={form.personas || 1} onChange={e => updateField('personas', +e.target.value)} />
                </div>

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
                    <option value="custom">✏️ Personalizado…</option>
                  </select>
                </div>
              </div>

              {modoAlimentacionPersonalizada && (
                <div className="field" style={{ background: 'var(--surface-sunken)', padding: '0.65rem', borderRadius: '6px' }}>
                  <label>Descripción de alimentación personalizada</label>
                  <input
                    type="text"
                    value={form.alimentacion || ''}
                    placeholder="Ej: Desayuno típico + Almuerzo campestre especial"
                    onChange={e => updateField('alimentacion', e.target.value)}
                  />
                  <div style={{ marginTop: '0.4rem' }}>
                    <label>Costo total de alimentación</label>
                    <CurrencyInput
                      value={form.costo_alimentacion || 0}
                      onChange={v => updateField('costo_alimentacion', v)}
                    />
                  </div>
                </div>
              )}

              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field">
                  <label>Descuento especial ($)</label>
                  <CurrencyInput value={form.descuento || 0} onChange={v => updateField('descuento', v)} />
                </div>
                <div className="field">
                  <label>Recargo adicional ($)</label>
                  <CurrencyInput value={form.recargo || 0} onChange={v => updateField('recargo', v)} />
                </div>
              </div>

              {/* Resumen de totales */}
              <div style={{ background: 'var(--surface-sunken)', padding: '0.75rem', borderRadius: '8px', display: 'grid', gap: '0.35rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Alojamiento ({form.personas || 1} pers × {noches(form.fecha_inicio || '', form.fecha_fin || '')} noches):</span>
                  <span>{formatCOP(form.subtotal_alojamiento || 0)}</span>
                </div>
                {(form.costo_alimentacion || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent, #ea580c)' }}>
                    <span>Servicio de Alimentación (Admin):</span>
                    <span>{formatCOP(form.costo_alimentacion || 0)}</span>
                  </div>
                )}
                {(form.descuento || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>Descuento:</span>
                    <span>-{formatCOP(form.descuento || 0)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.35rem', marginTop: '0.2rem' }}>
                  <span>TOTAL COTIZACIÓN:</span>
                  <span style={{ color: 'var(--primary)' }}>{formatCOP(form.total || 0)}</span>
                </div>
              </div>

              <div className="field">
                <label>Notas / Observaciones</label>
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

      {/* Lista de Cotizaciones */}
      <div className="avail-table">
        {filtradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
            <FileText size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
              No hay cotizaciones {tabActiva === 'pendientes' ? 'pendientes de aprobación' : tabActiva === 'confirmadas' ? 'confirmadas' : tabActiva === 'canceladas' ? 'canceladas' : ''}.
            </p>
            <p className="text-xs" style={{ marginTop: '0.25rem' }}>
              {tabActiva === 'pendientes' ? '¡Todo al día! Las nuevas solicitudes de clientes aparecerán aquí.' : 'Usa los filtros de arriba para explorar el historial.'}
            </p>
          </div>
        ) : (
          filtradas.map(c => {
            const clienteNombre = c.clientes ? `${c.clientes.nombre} ${c.clientes.apellido || ''}`.trim() : '—';
            const fincaNombre = c.fincas?.nombre || '—';
            const tieneAlimentacion = (c.costo_alimentacion || 0) > 0 || (c.alimentacion && c.alimentacion !== 'Sin alimentación');
            const valorAlojamiento = (c.subtotal_alojamiento && c.subtotal_alojamiento > 0)
              ? c.subtotal_alojamiento
              : Math.max(0, (c.total || 0) - (c.costo_alimentacion || 0));

            // La etiqueta "¡Nueva!" solo aplica si la cotización está pendiente y tiene menos de 20 minutos
            const esPendiente = ['borrador', 'cotizada', 'pendiente'].includes(c.estado);
            const esReciente = esPendiente && !!(c.created_at && (Date.now() - new Date(c.created_at).getTime()) < 20 * 60 * 1000);

            return (
              <div
                key={c.id}
                className="avail-row"
                style={{
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  borderLeft: esReciente ? '3px solid var(--accent, #ea580c)' : undefined,
                  background: esReciente ? 'color-mix(in srgb, var(--accent, #ea580c) 3%, var(--surface))' : undefined,
                  padding: '1rem',
                  borderRadius: '10px',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Tag size={13} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{fincaNombre}</span>

                    {/* Badge de estado inteligible */}
                    {esPendiente ? (
                      <span className="status-badge s-demand" style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                        🟡 Pendiente de aprobación
                      </span>
                    ) : c.estado === 'confirmada' ? (
                      <span className="status-badge s-avail" style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                        ✅ En Reserva Activa
                      </span>
                    ) : c.estado === 'cancelada' ? (
                      <span className="status-badge s-busy" style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                        ❌ Cancelada
                      </span>
                    ) : (
                      <span className="status-badge s-pending" style={{ fontSize: '0.7rem' }}>
                        {c.estado}
                      </span>
                    )}

                    {/* Etiqueta ¡Nueva! temporal */}
                    {esReciente && (
                      <span
                        className="status-badge"
                        style={{
                          fontSize: '0.68rem',
                          background: 'rgba(234, 88, 12, 0.14)',
                          color: '#ea580c',
                          borderColor: '#ea580c',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                        }}
                      >
                        🔔 ¡Nueva!
                      </span>
                    )}

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

                  <div className="text-xs text-muted" style={{ marginTop: '0.35rem', lineHeight: 1.5 }}>
                    <Calendar size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> {formatFecha(c.fecha_inicio)} → {formatFecha(c.fecha_fin)} ({noches(c.fecha_inicio, c.fecha_fin)} noches)
                    {' · '}<Users size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> {c.personas} personas
                    {clienteNombre !== '—' && (
                      <>
                        {' · '}👤 <strong>{clienteNombre}</strong>
                        {c.clientes?.whatsapp && (
                          <a
                            href={`https://wa.me/${c.clientes.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#25d366', marginLeft: '0.35rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}
                          >
                            <MessageCircle size={11} /> {c.clientes.whatsapp}
                          </a>
                        )}
                      </>
                    )}
                  </div>

                  {/* Detalle económico con desglose Finca vs Alimentación */}
                  <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.75rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.98rem' }}>
                      {formatCOP(c.total)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      • Finca (Alojamiento): <strong>{formatCOP(valorAlojamiento)}</strong> (50%: {formatCOP(Math.round(valorAlojamiento * 0.5))})
                    </div>
                    {tieneAlimentacion && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent, #ea580c)' }}>
                        • Menú (Admin): <strong>{formatCOP(c.costo_alimentacion || 0)}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* ACCIONES INTELIGENTES Y AUTOMATIZADAS */}
                <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap', alignSelf: 'center' }}>
                  {/* Botón 1: Pedir Abono Finca (50% a cuenta de propietario) */}
                  {c.estado !== 'cancelada' && (
                    <button
                      className="btn btn-sm"
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        gap: '0.35rem',
                        padding: '0.32rem 0.75rem',
                        color: '#15803d',
                        background: 'rgba(34, 197, 94, 0.12)',
                        borderColor: 'rgba(34, 197, 94, 0.35)',
                      }}
                      title="Solicitar por WhatsApp el 50% de la separación del alojamiento para la cuenta del propietario"
                      onClick={() => handleAbrirPedirAbono(c)}
                    >
                      <MessageCircle size={13} /> Pedir Abono (50%)
                    </button>
                  )}

                  {/* Botón 2: Cobrar Alimentación (solo si incluye menú -> cuenta del admin) */}
                  {tieneAlimentacion && c.estado !== 'cancelada' && (
                    <button
                      className="btn btn-sm"
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        gap: '0.35rem',
                        padding: '0.32rem 0.75rem',
                        color: '#c2410c',
                        background: 'rgba(234, 88, 12, 0.12)',
                        borderColor: 'rgba(234, 88, 12, 0.35)',
                      }}
                      title="Solicitar por WhatsApp el pago de la alimentación para la cuenta de la administración"
                      onClick={() => handleAbrirCobroAlimentacion(c)}
                    >
                      <Utensils size={13} /> Cobrar Alimentación
                    </button>
                  )}

                  {/* Botón 3: Pasar a Reserva con confirmación de pago del 50% */}
                  {esPendiente && (
                    <button
                      className="btn btn-sm btn-primary"
                      title="Confirmar recepción del abono del 50% y crear la Reserva Activa (bloquea calendario)"
                      style={{ fontSize: '0.74rem', fontWeight: 600, gap: '0.35rem', padding: '0.32rem 0.8rem' }}
                      onClick={() => handleIniciarPasoAReserva(c)}
                    >
                      <ArrowRight size={13} /> Pasar a Reserva
                    </button>
                  )}

                  {/* Botón 4: Descargar PDF */}
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: '0.72rem', gap: '0.25rem', padding: '0.3rem 0.55rem' }}
                    title="Descargar Cotización Formal en PDF"
                    onClick={() => {
                      generarDocCotizacion(c, configuracion);
                      showToast('Cotización descargada en PDF ✅', 'success');
                    }}
                  >
                    <Download size={12} /> PDF
                  </button>

                  {/* Vista de Finca en portal cliente */}
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ fontSize: '0.72rem', gap: '0.25rem', padding: '0.3rem 0.55rem' }}
                    title="Ver finca en portal público"
                    onClick={() => previsualizarFinca(c.finca_id)}
                  >
                    <Eye size={12} /> Finca
                  </button>

                  {/* Editar */}
                  <button className="btn btn-sm" onClick={() => abrirEdicion(c)} title="Editar cotización">
                    <Edit3 size={13} />
                  </button>

                  {/* Botón 5: Cancelar si no consignó (Mantiene historial) */}
                  {c.estado !== 'cancelada' ? (
                    <button
                      className="btn btn-sm"
                      style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                      onClick={() => handleCancelarCotizacion(c)}
                      title="Cancelar cotización si el cliente no consignó el dinero (se archiva en historial)"
                    >
                      <XCircle size={14} />
                    </button>
                  ) : (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleEliminarDefinitivo(c)}
                      title="Eliminar definitivamente del historial"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DE CONFIRMACIÓN: PASAR A RESERVA */}
      {modalConfirmarReserva.abierto && modalConfirmarReserva.cotizacion && (
        <div className="modal-overlay" onClick={() => setModalConfirmarReserva({ abierto: false, cotizacion: null, anticipo: 0, guardando: false })}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--primary)' }}>
                <Check size={18} /> Confirmar Pago y Pasar a Reserva
              </div>
              <button
                className="btn btn-sm"
                onClick={() => setModalConfirmarReserva({ abierto: false, cotizacion: null, anticipo: 0, guardando: false })}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', display: 'grid', gap: '1rem' }}>
              <div style={{ background: 'color-mix(in srgb, var(--primary) 8%, transparent)', padding: '0.85rem', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  ¿El cliente ya realizó el pago del abono para separar la finca?
                </div>
                <div className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
                  Este es el requisito para bloquear el calendario y crear formalmente la <strong>Reserva Activa</strong> a nombre del cliente.
                </div>
              </div>

              {/* Resumen económico */}
              <div style={{ display: 'grid', gap: '0.45rem', fontSize: '0.85rem', background: 'var(--surface-sunken)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Finca:</span>
                  <strong>{modalConfirmarReserva.cotizacion.fincas?.nombre || 'Finca Campestre'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Cliente:</span>
                  <strong>
                    {modalConfirmarReserva.cotizacion.clientes?.nombre
                      ? `${modalConfirmarReserva.cotizacion.clientes.nombre} ${modalConfirmarReserva.cotizacion.clientes.apellido || ''}`.trim()
                      : 'Cliente Web'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Fechas:</span>
                  <span>{formatFecha(modalConfirmarReserva.cotizacion.fecha_inicio)} → {formatFecha(modalConfirmarReserva.cotizacion.fecha_fin)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Valor Finca (Alojamiento):</span>
                  <span>{formatCOP(modalConfirmarReserva.cotizacion.subtotal_alojamiento || 0)}</span>
                </div>
                {(modalConfirmarReserva.cotizacion.costo_alimentacion || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent, #ea580c)' }}>
                    <span>Planes de Alimentación (Admin):</span>
                    <span>{formatCOP(modalConfirmarReserva.cotizacion.costo_alimentacion || 0)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.35rem', fontWeight: 700 }}>
                  <span>Total Cotización:</span>
                  <span style={{ color: 'var(--primary)' }}>{formatCOP(modalConfirmarReserva.cotizacion.total || 0)}</span>
                </div>
              </div>

              {/* Monto de separación recibido */}
              <div className="field">
                <label style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Monto recibido para separación (Abono 50% finca) *</span>
                  <span className="text-xs text-muted">Sugerido 50%</span>
                </label>
                <CurrencyInput
                  value={modalConfirmarReserva.anticipo}
                  onChange={(val) => setModalConfirmarReserva(prev => ({ ...prev, anticipo: val }))}
                />
                <div className="text-xs text-muted mt-1">
                  Saldo pendiente por pagar al check-in:{' '}
                  <strong style={{ color: 'var(--danger)' }}>
                    {formatCOP(Math.max(0, (modalConfirmarReserva.cotizacion.total || 0) - modalConfirmarReserva.anticipo))}
                  </strong>
                </div>
              </div>

              {/* Opciones de Alimentación Independiente */}
              {(modalConfirmarReserva.cotizacion.costo_alimentacion || 0) > 0 && (
                <div style={{ padding: '0.75rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={modalConfirmarReserva.alimentacionPagada}
                      onChange={e => setModalConfirmarReserva(prev => ({ ...prev, alimentacionPagada: e.target.checked }))}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span>¿El cliente ya pagó también la alimentación ({formatCOP(modalConfirmarReserva.cotizacion.costo_alimentacion || 0)})?</span>
                  </label>
                  <div className="text-xs text-muted" style={{ marginTop: '0.35rem', paddingLeft: '1.5rem', lineHeight: 1.4 }}>
                    ℹ️ <em>Nota importante:</em> El abono del 50% de alojamiento asegura la reserva de la finca con el propietario. Si el cliente aún no ha cancelado la alimentación, puedes dejarlo desmarcado y saldrá el botón de <strong>"Cobrar Alimentación"</strong> en el módulo de Reservas para cobrarlo después a la cuenta del administrador.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn"
                  disabled={modalConfirmarReserva.guardando}
                  onClick={() => setModalConfirmarReserva({ abierto: false, cotizacion: null, anticipo: 0, guardando: false })}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={modalConfirmarReserva.guardando || modalConfirmarReserva.anticipo <= 0}
                  onClick={handleConfirmarPasoAReserva}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                >
                  <Check size={15} />
                  {modalConfirmarReserva.guardando ? 'Creando reserva…' : 'Sí, Pago Confirmado · Crear Reserva'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de WhatsApp para Cotizaciones y Menús */}
      {modalWaCotiz.abierto && modalWaCotiz.cotizacion && (
        <WhatsAppModal
          isOpen={modalWaCotiz.abierto}
          onClose={() => setModalWaCotiz(prev => ({ ...prev, abierto: false }))}
          telefonoInicial={modalWaCotiz.cotizacion.clientes?.whatsapp || ''}
          destinatarioNombre={modalWaCotiz.cotizacion.clientes ? `${modalWaCotiz.cotizacion.clientes.nombre} ${modalWaCotiz.cotizacion.clientes.apellido || ''}`.trim() : 'Cliente'}
          mensajeInicial={modalWaCotiz.mensaje}
          titulo={modalWaCotiz.titulo}
          nombreDocumento={modalWaCotiz.nombreDoc}
          onGenerarPdf={modalWaCotiz.onGenerarPdf}
          onDespuesDeEnviar={(tel, msg) => {
            showToast('Mensaje de WhatsApp enviado ✅', 'success');
            if (onRegistrarComunicacion && modalWaCotiz.cotizacion) {
              onRegistrarComunicacion({
                cliente_id: modalWaCotiz.cotizacion.cliente_id || null,
                cotizacion_id: modalWaCotiz.cotizacion.id,
                tipo: modalWaCotiz.tipo,
                canal: 'whatsapp',
                mensaje: msg,
                destinatario: tel,
              });
            }
          }}
        />
      )}
    </div>
  );
};
