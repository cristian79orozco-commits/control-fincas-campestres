import React, { useState } from 'react';
import {
  ClipboardList, Plus, Edit3, Trash2, X, Save, CreditCard,
  Calendar, Users, DollarSign, ChevronDown, ChevronUp, FileCheck, MessageCircle,
  FileText, CheckCircle, Hash, Copy, Check, Award, AlertTriangle, ArrowRight, Utensils
} from 'lucide-react';
import type { Reserva, ReservaEstado, Cliente, Finca, Pago, PagoTipo, CotizacionDB, CierreReserva, ConfiguracionGeneral } from '../types';
import { calcularSaldo } from '../types';
import { AdminDocumentos } from './AdminDocumentos';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { AdminCierreModal } from './AdminCierreModal';
import { AdminExpedienteModal } from './AdminExpedienteModal';
import {
  plantillaRecordatorioPago,
  plantillaBienvenida,
  plantillaSeparacion,
  plantillaPazYSalvo,
  plantillaEstadoCuenta,
  plantillaCobroAlimentacion,
} from '../services/whatsapp';
import { generarDocSeparacion, generarPazYSalvo, generarEstadoCuenta } from '../services/documentos';
import { CurrencyInput } from '../components/CurrencyInput';
import { useApp } from '../context/AppContext';

interface AdminReservasProps {
  reservas: Reserva[];
  clientes: Cliente[];
  fincas: Finca[];
  cotizaciones: CotizacionDB[];
  configuracion?: ConfiguracionGeneral;
  userEmail?: string | null;
  onGuardar: (datos: Partial<Reserva>) => Promise<{ success: boolean; id?: string; error?: string }>;
  onCambiarEstado: (id: string, estado: ReservaEstado) => Promise<{ success: boolean; error?: string }>;
  onCerrarReserva?: (
    reservaId: string,
    datosCierre: Partial<CierreReserva>,
    pagoLiquidacion?: { valor: number; tipo: PagoTipo; observacion?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onReabrirReserva?: (reservaId: string) => Promise<{ success: boolean; error?: string }>;
  onEliminar: (id: string) => Promise<{ success: boolean; error?: string }>;
  onRegistrarPago: (reservaId: string, pago: { tipo: PagoTipo; fecha: string; valor: number; observacion?: string }) => Promise<{ success: boolean; error?: string }>;
  onEliminarPago: (pagoId: string) => Promise<{ success: boolean; error?: string }>;
  onRegistrarComunicacion?: (com: any) => void;
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

// ─── Badge de consecutivo copiable ────────────────────────────────────────────
export const ConsecutivoBadge: React.FC<{ consecutivo: string }> = ({ consecutivo }) => {
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
  onRegistrarComunicacion,
  showToast,
  openConfirm,
  cotizacionInicial,
  onCotizacionInicialUsada,
  configuracion,
  userEmail,
  onCerrarReserva,
  onReabrirReserva,
}) => {
  const [form, setForm] = useState<Partial<Reserva>>(FORM_VACIO);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [reservaExpandida, setReservaExpandida] = useState<string | null>(null);
  const [pagoForm, setPagoForm] = useState<typeof PAGO_VACIO>(PAGO_VACIO);
  const [pagoReservaId, setPagoReservaId] = useState<string | null>(null);
  const [guardandoPago, setGuardandoPago] = useState(false);
  type FiltroReservaTab = 'activas' | 'completadas' | 'canceladas' | 'todas';
  const [tabReservaActiva, setTabReservaActiva] = useState<FiltroReservaTab>('activas');
  const [reservaParaCierre, setReservaParaCierre] = useState<Reserva | null>(null);
  const [reservaParaExpediente, setReservaParaExpediente] = useState<Reserva | null>(null);
  const [modalWaReserva, setModalWaReserva] = useState<{
    abierto: boolean;
    reserva?: Reserva;
    titulo: string;
    nombreDoc?: string;
    mensaje: string;
    onGenerarPdf?: () => void;
    tipo: any;
  }>({
    abierto: false,
    titulo: '',
    mensaje: '',
    tipo: 'recordatorio_pago',
  });

  const { cambiarEstadoAlimentacionReserva } = useApp();

  // Modal para liquidar y cerrar servicio de alimentación (Admin)
  const [modalCerrarAlimentacion, setModalCerrarAlimentacion] = useState<{
    abierto: boolean;
    reserva: Reserva | null;
    metodo: string;
    notas: string;
    guardando: boolean;
  }>({
    abierto: false,
    reserva: null,
    metodo: 'Transferencia Bancolombia / Nequi',
    notas: '',
    guardando: false,
  });

  // Abrir WhatsApp para cobrar alimentación
  const handleAbrirCobroAlimentacion = (r: Reserva) => {
    const bancosAdmin = configuracion?.banco_cuenta ? {
      banco: configuracion.banco_nombre || undefined,
      tipoCuenta: configuracion.banco_tipo_cuenta || undefined,
      cuenta: configuracion.banco_cuenta || undefined,
      titular: configuracion.banco_titular || undefined,
      nit: configuracion.nit || undefined,
    } : null;

    setModalWaReserva({
      abierto: true,
      reserva: r,
      titulo: `Solicitud de Pago · Alimentación · ${r.fincas?.nombre || 'Finca'}`,
      mensaje: plantillaCobroAlimentacion(r, r.fincas, r.clientes, bancosAdmin),
      tipo: 'cobro_alimentacion',
    });
  };

  // Confirmar recepción de pago y cierre del servicio de alimentación
  const handleConfirmarCierreAlimentacion = async () => {
    if (!modalCerrarAlimentacion.reserva) return;
    setModalCerrarAlimentacion(p => ({ ...p, guardando: true }));
    const r = modalCerrarAlimentacion.reserva;
    const res = await cambiarEstadoAlimentacionReserva(r.id, 'pagada', {
      metodo: modalCerrarAlimentacion.metodo,
      notas: modalCerrarAlimentacion.notas,
    });
    setModalCerrarAlimentacion(p => ({ ...p, guardando: false, abierto: false, reserva: null }));
    if (res.success) {
      showToast('Servicio de alimentación liquidado y cerrado con éxito ✅', 'success');
    } else {
      showToast(`Error al cerrar alimentación: ${res.error}`, 'error');
    }
  };

  // Si llega cotización pre-cargada, abrir formulario con sus datos y preservar consecutivo
  React.useEffect(() => {
    if (cotizacionInicial) {
      setForm({
        cotizacion_id: cotizacionInicial.id,
        consecutivo: cotizacionInicial.consecutivo
          ? (cotizacionInicial.consecutivo.match(/\d+/g)?.join('') || cotizacionInicial.consecutivo.replace(/^[A-Za-z\-]+/, ''))
          : undefined,
        cliente_id: cotizacionInicial.cliente_id || '',
        finca_id: cotizacionInicial.finca_id,
        fecha_inicio: cotizacionInicial.fecha_inicio,
        fecha_fin: cotizacionInicial.fecha_fin,
        personas: cotizacionInicial.personas,
        valor_total: cotizacionInicial.total,
        separacion: Math.round((cotizacionInicial.total || 0) * 0.5),
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

  const conteoActivas = reservas.filter(r => r.estado === 'activa').length;
  const conteoCompletadas = reservas.filter(r => r.estado === 'completada').length;
  const conteoCanceladas = reservas.filter(r => ['cancelada', 'no_show'].includes(r.estado)).length;

  const filtradas = reservas.filter(r => {
    if (tabReservaActiva === 'activas') return r.estado === 'activa';
    if (tabReservaActiva === 'completadas') return r.estado === 'completada';
    if (tabReservaActiva === 'canceladas') return ['cancelada', 'no_show'].includes(r.estado);
    return true; // todas
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <ClipboardList size={18} /> Reservas
          </div>
          <div className="text-xs text-muted mt-1">
            {conteoActivas} activa{conteoActivas !== 1 ? 's' : ''} en curso · {reservas.length} en total
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={abrirNuevo}>
          <Plus size={14} /> Nueva reserva
        </button>
      </div>

      {/* Pestañas de Navegación Inteligente de Reservas */}
      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
        <button
          className={`btn btn-sm${tabReservaActiva === 'activas' ? ' btn-primary' : ''}`}
          onClick={() => setTabReservaActiva('activas')}
          style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
        >
          🟢 Reservas Activas
          {conteoActivas > 0 && (
            <span style={{
              background: tabReservaActiva === 'activas' ? 'rgba(255,255,255,0.25)' : 'var(--success, #16a34a)',
              color: '#fff',
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: 700,
            }}>
              {conteoActivas}
            </span>
          )}
        </button>

        <button
          className={`btn btn-sm${tabReservaActiva === 'completadas' ? ' btn-primary' : ''}`}
          onClick={() => setTabReservaActiva('completadas')}
          style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          🏁 Completadas / Historial ({conteoCompletadas})
        </button>

        <button
          className={`btn btn-sm${tabReservaActiva === 'canceladas' ? ' btn-primary' : ''}`}
          onClick={() => setTabReservaActiva('canceladas')}
          style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          ❌ Canceladas ({conteoCanceladas})
        </button>

        <button
          className={`btn btn-sm${tabReservaActiva === 'todas' ? ' btn-primary' : ''}`}
          onClick={() => setTabReservaActiva('todas')}
          style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          📋 Todas ({reservas.length})
        </button>
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
                  <CurrencyInput
                    value={form.valor_total}
                    onChange={val => setForm(p => ({ ...p, valor_total: val }))}
                    placeholder="0"
                  />
                </div>
                <div className="field">
                  <label>Separación / Anticipo</label>
                  <CurrencyInput
                    value={form.separacion}
                    onChange={val => setForm(p => ({ ...p, separacion: val }))}
                    placeholder="0"
                  />
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
                <label>Valor (COP)</label>
                <CurrencyInput
                  value={pagoForm.valor}
                  onChange={val => setPagoForm(p => ({ ...p, valor: val }))}
                  placeholder="0"
                />
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
            No hay reservas{tabReservaActiva !== 'todas' ? ` en la categoría "${tabReservaActiva}"` : ''}.
          </p>
        ) : (
          filtradas.map(r => {
            const saldo = calcularSaldo(r);
            const totalPagado = (r.valor_total) - saldo;
            const clienteNombre = r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.trim() : '—';
            const clienteTel = r.clientes?.whatsapp || r.clientes?.telefono;
            const fincaNombre = r.fincas?.nombre || '—';
            const expanded = reservaExpandida === r.id;

            const hoy = new Date().toISOString().split('T')[0];
            const estanciaVencida = r.estado === 'activa' && r.fecha_fin < hoy;
            const pazYSalvoHabilitado = saldo <= 0 && (r.pagos?.length || 0) > 0;

            return (
              <div key={r.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                {/* Alerta de Fecha Cumplida / Estancia Finalizada */}
                {estanciaVencida && (
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      borderLeft: '4px solid #f59e0b',
                      padding: '0.4rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      color: '#b45309',
                      fontWeight: 600,
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertTriangle size={14} /> Estancia finalizada ({formatFecha(r.fecha_fin)}) · Lista para cerrar e ir a Historial
                    </span>
                    {onCerrarReserva && (
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }}
                        onClick={() => setReservaParaCierre(r)}
                      >
                        <CheckCircle size={12} /> Cerrar y Pasar a Historial
                      </button>
                    )}
                  </div>
                )}

                {/* Fila principal */}
                <div className="avail-row" style={{ borderBottom: 'none', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {fincaNombre}
                      {r.estado === 'activa' ? (
                        <span className="status-badge s-avail" style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                          🟢 Activa
                        </span>
                      ) : r.estado === 'completada' ? (
                        <span className="status-badge" style={{ fontSize: '0.7rem', fontWeight: 600, background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', borderColor: '#2563eb' }}>
                          🏁 Completada
                        </span>
                      ) : r.estado === 'cancelada' ? (
                        <span className="status-badge s-busy" style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                          ❌ Cancelada
                        </span>
                      ) : (
                        <span className="status-badge s-busy" style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                          🚫 No Show
                        </span>
                      )}
                      {r.consecutivo && <ConsecutivoBadge consecutivo={r.consecutivo} />}
                      {((r.costo_alimentacion || 0) > 0 || (r.alimentacion && r.alimentacion !== 'Sin alimentación')) && (
                        r.estado_alimentacion === 'pagada' ? (
                          <span
                            className="status-badge s-avail"
                            style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#16a34a', borderColor: 'rgba(22, 163, 74, 0.35)', fontWeight: 600 }}
                            title={`Alimentación liquidada y pagada a la administración ${r.fecha_pago_alimentacion ? '(' + formatFecha(r.fecha_pago_alimentacion.split('T')[0]) + ')' : ''}`}
                          >
                            <Utensils size={10} /> Menú Admin: {formatCOP(r.costo_alimentacion || 0)} (Pagado ✅)
                          </span>
                        ) : (
                          <span
                            className="status-badge"
                            style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#c2410c', background: 'rgba(234, 88, 12, 0.12)', borderColor: 'rgba(234, 88, 12, 0.35)', fontWeight: 600 }}
                            title="Servicio de alimentación pendiente de pago para la administración"
                          >
                            <Utensils size={10} /> Menú Admin: {formatCOP(r.costo_alimentacion || 0)} (Pendiente Cobro ⚠️)
                          </span>
                        )
                      )}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
                      <Calendar size={10} style={{ display:'inline', verticalAlign:'-1px' }} /> {formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}
                      {' · '}<Users size={10} style={{ display:'inline', verticalAlign:'-1px' }} /> {r.personas} personas
                      {' · '}👤 {clienteNombre}
                      {clienteTel && (
                        <a
                          href={`https://wa.me/${clienteTel.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#25d366', textDecoration: 'none', marginLeft: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          <MessageCircle size={10} /> {clienteTel}
                        </a>
                      )}
                    </div>
                    <div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                      <span>Total: <strong>{formatCOP(r.valor_total)}</strong></span>
                      <span>Pagado: <strong style={{ color: 'var(--success)' }}>{formatCOP(totalPagado)}</strong></span>
                      <span>Saldo: <strong style={{ color: saldo > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCOP(saldo)}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* ACCIONES INTELIGENTES DE LA RESERVA */}
                    {/* Botones de Alimentación Independiente (Cuenta Admin) */}
                    {((r.costo_alimentacion || 0) > 0 || (r.alimentacion && r.alimentacion !== 'Sin alimentación')) && r.estado !== 'cancelada' && (
                      r.estado_alimentacion === 'pagada' ? (
                        <span
                          className="status-badge s-avail"
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.55rem',
                          }}
                          title={`Servicio gastronómico liquidado ${r.metodo_pago_alimentacion ? 'vía ' + r.metodo_pago_alimentacion : ''}`}
                        >
                          <Utensils size={11} /> Menú Liquidado ✓
                        </span>
                      ) : (
                        <>
                          <button
                            className="btn btn-sm"
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              gap: '0.35rem',
                              padding: '0.28rem 0.65rem',
                              color: '#c2410c',
                              background: 'rgba(234, 88, 12, 0.12)',
                              borderColor: 'rgba(234, 88, 12, 0.35)',
                            }}
                            title="Solicitar por WhatsApp el pago de la alimentación para la cuenta de la administración"
                            onClick={() => handleAbrirCobroAlimentacion(r)}
                          >
                            <Utensils size={13} /> Cobrar Alimentación
                          </button>

                          <button
                            className="btn btn-sm"
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              gap: '0.35rem',
                              padding: '0.28rem 0.65rem',
                              color: '#15803d',
                              background: 'rgba(34, 197, 94, 0.12)',
                              borderColor: 'rgba(34, 197, 94, 0.35)',
                            }}
                            title="Registrar pago recibido y cerrar el servicio de alimentación para la administración"
                            onClick={() => setModalCerrarAlimentacion({
                              abierto: true,
                              reserva: r,
                              metodo: 'Transferencia Bancolombia / Nequi',
                              notas: '',
                              guardando: false,
                            })}
                          >
                            <Check size={13} /> Cerrar Alimentación
                          </button>
                        </>
                      )
                    )}

                    {/* 1. Registrar Abono / Pago (Acción Primaria para reservas activas) */}
                    {r.estado === 'activa' && (
                      <button
                        className="btn btn-sm btn-primary"
                        title="Registrar un abono o amortización de pago del alojamiento"
                        style={{ fontSize: '0.74rem', fontWeight: 600, gap: '0.35rem', padding: '0.28rem 0.65rem' }}
                        onClick={() => { setPagoReservaId(r.id); setPagoForm(PAGO_VACIO); }}
                      >
                        <CreditCard size={13} /> Registrar Abono
                      </button>
                    )}

                    {/* 2. Botón Destacado: Cerrar Reserva (Check-out guiado + Paz y Salvo) */}
                    {r.estado === 'activa' && onCerrarReserva && (
                      <button
                        className="btn btn-sm"
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          gap: '0.35rem',
                          padding: '0.28rem 0.75rem',
                          background: 'rgba(234, 88, 12, 0.12)',
                          borderColor: 'rgba(234, 88, 12, 0.35)',
                          color: '#c2410c',
                        }}
                        title="Verificar saldo en $0, efectuar check-out y generar Paz y Salvo"
                        onClick={() => setReservaParaCierre(r)}
                      >
                        <CheckCircle size={13} /> Cerrar Reserva
                      </button>
                    )}

                    {/* 3. Botón directo de Paz y Salvo (Habilitado si saldo es $0) */}
                    {pazYSalvoHabilitado && (
                      <button
                        className="btn btn-sm"
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          gap: '0.3rem',
                          padding: '0.28rem 0.65rem',
                          background: 'rgba(34, 197, 94, 0.12)',
                          borderColor: 'rgba(34, 197, 94, 0.35)',
                          color: '#15803d',
                        }}
                        title="Descargar o enviar por WhatsApp el Certificado Oficial de Paz y Salvo"
                        onClick={() => {
                          setModalWaReserva({
                            abierto: true,
                            reserva: r,
                            titulo: `Certificado de Paz y Salvo · ${r.fincas?.nombre || 'Finca'}`,
                            nombreDoc: 'Certificado de Paz y Salvo (PDF)',
                            mensaje: plantillaPazYSalvo(r),
                            onGenerarPdf: () => generarPazYSalvo(r),
                            tipo: 'paz_salvo',
                          });
                        }}
                      >
                        <Award size={13} /> Paz y Salvo
                      </button>
                    )}

                    {/* 2. Menú de Documentos Oficiales Unificado */}
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const val = e.target.value;
                          e.target.value = '';
                          if (val === 'separacion') {
                            setModalWaReserva({
                              abierto: true,
                              reserva: r,
                              titulo: `Documento de Separación · ${r.fincas?.nombre || 'Finca'}`,
                              nombreDoc: 'Documento Oficial de Separación (PDF)',
                              mensaje: plantillaSeparacion(r),
                              onGenerarPdf: () => generarDocSeparacion(r),
                              tipo: 'separacion',
                            });
                          } else if (val === 'estado_cuenta') {
                            setModalWaReserva({
                              abierto: true,
                              reserva: r,
                              titulo: `Estado de Cuenta · ${r.fincas?.nombre || 'Finca'}`,
                              nombreDoc: 'Estado de Cuenta (PDF)',
                              mensaje: plantillaEstadoCuenta(r),
                              onGenerarPdf: () => generarEstadoCuenta(r),
                              tipo: 'estado_cuenta',
                            });
                          } else if (val === 'paz_salvo') {
                            if (!pazYSalvoHabilitado) {
                              showToast(`Requiere saldo en $0 para emitir Paz y Salvo (saldo actual: ${formatCOP(saldo)})`, 'info');
                              return;
                            }
                            setModalWaReserva({
                              abierto: true,
                              reserva: r,
                              titulo: `Certificado de Paz y Salvo · ${r.fincas?.nombre || 'Finca'}`,
                              nombreDoc: 'Certificado de Paz y Salvo (PDF)',
                              mensaje: plantillaPazYSalvo(r),
                              onGenerarPdf: () => generarPazYSalvo(r),
                              tipo: 'paz_salvo',
                            });
                          } else if (val === 'cierre') {
                            setReservaParaCierre(r);
                          }
                        }}
                        className="btn btn-sm"
                        style={{ appearance: 'none', paddingRight: '1.4rem', cursor: 'pointer', fontSize: '0.72rem' }}
                      >
                        <option value="" disabled>📑 Documentos ▾</option>
                        <option value="separacion">📄 Documento de Separación</option>
                        <option value="estado_cuenta">📊 Estado de Cuenta</option>
                        <option value="paz_salvo" disabled={!pazYSalvoHabilitado}>
                          🏆 Paz y Salvo {pazYSalvoHabilitado ? '✓' : `(Saldo: ${formatCOP(saldo)})`}
                        </option>
                        {r.estado === 'activa' && onCerrarReserva && (
                          <option value="cierre">🏁 Check-out y Cierre</option>
                        )}
                      </select>
                      <ChevronDown size={11} style={{ position: 'absolute', right: '0.35rem', pointerEvents: 'none' }} />
                    </div>

                    {/* 3. Mensaje WhatsApp Directo */}
                    <button
                      className="btn btn-sm"
                      style={{ color: '#25d366', borderColor: '#25d366' }}
                      title="Enviar mensaje de WhatsApp al cliente"
                      onClick={() => {
                        if (saldo > 0) {
                          setModalWaReserva({
                            abierto: true,
                            reserva: r,
                            titulo: `Recordatorio de Saldo · ${r.fincas?.nombre || 'Finca'}`,
                            mensaje: plantillaRecordatorioPago(r),
                            tipo: 'recordatorio_pago',
                          });
                        } else {
                          setModalWaReserva({
                            abierto: true,
                            reserva: r,
                            titulo: `Bienvenida e Instrucciones · ${r.fincas?.nombre || 'Finca'}`,
                            mensaje: plantillaBienvenida(r),
                            tipo: 'bienvenida',
                          });
                        }
                      }}
                    >
                      <MessageCircle size={13} />
                    </button>

                    {/* 4. Expediente Histórico */}
                    <button
                      className="btn btn-sm"
                      title="Ver Expediente Histórico Completo"
                      onClick={() => setReservaParaExpediente(r)}
                    >
                      <FileText size={13} />
                    </button>

                    {/* 5. Editar */}
                    <button className="btn btn-sm" onClick={() => abrirEdicion(r)} title="Editar"><Edit3 size={13} /></button>

                    {/* 6. Eliminar (libera calendario automáticamente) */}
                    <button className="btn btn-sm btn-danger" onClick={() => handleEliminar(r)} title="Eliminar reserva y liberar calendario"><Trash2 size={13} /></button>

                    {/* 7. Desplegar pagos */}
                    <button
                      className="btn btn-sm"
                      onClick={() => setReservaExpandida(expanded ? null : r.id)}
                      title={expanded ? 'Cerrar detalle' : 'Ver historial de pagos'}
                    >
                      {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* Panel expandido: detalle de pagos y documentos */}
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

                    {/* Documentos PDF y Envíos por WhatsApp */}
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                      <AdminDocumentos reserva={r} onRegistrarEnvio={onRegistrarComunicacion} showToast={showToast} />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal WhatsApp para acciones rápidas de la reserva */}
      {modalWaReserva.abierto && modalWaReserva.reserva && (
        <WhatsAppModal
          isOpen={modalWaReserva.abierto}
          onClose={() => setModalWaReserva(p => ({ ...p, abierto: false }))}
          titulo={modalWaReserva.titulo}
          destinatarioNombre={modalWaReserva.reserva.clientes ? `${modalWaReserva.reserva.clientes.nombre} ${modalWaReserva.reserva.clientes.apellido || ''}`.trim() : 'Cliente'}
          telefonoInicial={modalWaReserva.reserva.clientes?.whatsapp || modalWaReserva.reserva.clientes?.telefono || ''}
          mensajeInicial={modalWaReserva.mensaje}
          nombreDocumento={modalWaReserva.nombreDoc}
          onGenerarPdf={modalWaReserva.onGenerarPdf}
          onDespuesDeEnviar={(tel, msg) => {
            showToast('Mensaje de WhatsApp enviado al cliente ✅', 'success');
            onRegistrarComunicacion?.({
              cliente_id: modalWaReserva.reserva?.cliente_id || null,
              reserva_id: modalWaReserva.reserva?.id || null,
              tipo: modalWaReserva.tipo,
              destinatario: modalWaReserva.reserva?.clientes ? `${modalWaReserva.reserva.clientes.nombre} ${modalWaReserva.reserva.clientes.apellido || ''}`.trim() : 'Cliente',
              telefono: tel,
              mensaje: msg,
              estado: 'enviado',
            });
          }}
        />
      )}

      {/* Modal Cierre de Reserva */}
      {reservaParaCierre && onCerrarReserva && (
        <AdminCierreModal
          isOpen={!!reservaParaCierre}
          reserva={reservaParaCierre}
          userEmail={userEmail}
          onClose={() => setReservaParaCierre(null)}
          onConfirmarCierre={async (datosCierre, pagoLiq) => {
            const res = await onCerrarReserva(reservaParaCierre.id, datosCierre, pagoLiq);
            if (!res.success) {
              throw new Error(res.error || 'Error al cerrar reserva');
            }
            const reservaCerrada: Reserva = {
              ...reservaParaCierre,
              estado: (datosCierre.estado_cierre || 'completada') as ReservaEstado,
            };
            setReservaParaCierre(null);
            // Inmediatamente abrir y sugerir enviar el Paz y Salvo al cliente
            setModalWaReserva({
              abierto: true,
              reserva: reservaCerrada,
              titulo: `🏆 Certificado de Paz y Salvo · ${reservaCerrada.fincas?.nombre || 'Finca'}`,
              nombreDoc: 'Certificado de Paz y Salvo (PDF)',
              mensaje: plantillaPazYSalvo(reservaCerrada),
              onGenerarPdf: () => generarPazYSalvo(reservaCerrada),
              tipo: 'paz_salvo',
            });
          }}
          showToast={showToast}
        />
      )}

      {/* Modal Expediente Histórico */}
      {reservaParaExpediente && (
        <AdminExpedienteModal
          isOpen={!!reservaParaExpediente}
          reserva={reservaParaExpediente}
          configuracion={configuracion}
          onClose={() => setReservaParaExpediente(null)}
          onReabrir={onReabrirReserva ? async (id) => {
            const res = await onReabrirReserva(id);
            if (res.success) {
              showToast('Reserva reabierta como activa ✅', 'success');
              setReservaParaExpediente(null);
            } else {
              showToast(`Error: ${res.error}`, 'error');
            }
          } : undefined}
          onRegistrarComunicacion={onRegistrarComunicacion}
          showToast={showToast}
        />
      )}

      {/* Modal para Cerrar y Liquidar Servicio de Alimentación */}
      {modalCerrarAlimentacion.abierto && modalCerrarAlimentacion.reserva && (
        <div className="modal-overlay" onClick={() => setModalCerrarAlimentacion(p => ({ ...p, abierto: false }))}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#c2410c' }}>
                <Utensils size={18} /> Liquidar y Cerrar Alimentación (Admin)
              </div>
              <button className="btn btn-sm" onClick={() => setModalCerrarAlimentacion(p => ({ ...p, abierto: false }))}>
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', display: 'grid', gap: '0.85rem' }}>
              <div style={{ background: 'var(--surface-sunken)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem', display: 'grid', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Reserva:</span>
                  <strong>{modalCerrarAlimentacion.reserva.fincas?.nombre || 'Finca'} #{modalCerrarAlimentacion.reserva.consecutivo || ''}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Cliente:</span>
                  <strong>
                    {modalCerrarAlimentacion.reserva.clientes?.nombre
                      ? `${modalCerrarAlimentacion.reserva.clientes.nombre} ${modalCerrarAlimentacion.reserva.clientes.apellido || ''}`.trim()
                      : 'Cliente'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Menú solicitado:</span>
                  <span>{modalCerrarAlimentacion.reserva.alimentacion || 'Plan de alimentación'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.35rem', fontWeight: 700, color: 'var(--primary)' }}>
                  <span>Total Alimentación a liquidar:</span>
                  <span style={{ fontSize: '1rem', color: '#16a34a' }}>
                    {formatCOP(modalCerrarAlimentacion.reserva.costo_alimentacion || 0)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted" style={{ lineHeight: 1.4 }}>
                ℹ️ Esta acción confirma que el cliente canceló el valor de la alimentación en la cuenta de la administración. La reserva del alojamiento permanece intacta en sus fechas y condiciones acordadas con el propietario.
              </div>

              <div className="field">
                <label>Método / Cuenta de recepción</label>
                <select
                  value={modalCerrarAlimentacion.metodo}
                  onChange={e => setModalCerrarAlimentacion(p => ({ ...p, metodo: e.target.value }))}
                >
                  <option value="Transferencia Bancolombia / Nequi">Transferencia Bancolombia / Nequi (Admin)</option>
                  <option value="Daviplata">Daviplata (Admin)</option>
                  <option value="Efectivo en Finca">Efectivo recibido en finca</option>
                  <option value="Consignación Bancaria">Consignación Bancaria</option>
                  <option value="Otro medio de pago">Otro medio de pago</option>
                </select>
              </div>

              <div className="field">
                <label>Observaciones / Referencia de comprobante (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Aprobación Nequi #849204"
                  value={modalCerrarAlimentacion.notas}
                  onChange={e => setModalCerrarAlimentacion(p => ({ ...p, notas: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn"
                  disabled={modalCerrarAlimentacion.guardando}
                  onClick={() => setModalCerrarAlimentacion(p => ({ ...p, abierto: false }))}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  disabled={modalCerrarAlimentacion.guardando}
                  onClick={handleConfirmarCierreAlimentacion}
                >
                  <Check size={15} />
                  {modalCerrarAlimentacion.guardando ? 'Guardando…' : 'Confirmar Pago y Cerrar Servicio 🍽️'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
