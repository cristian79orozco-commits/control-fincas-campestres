import React, { useState } from 'react';
import {
  FileText, Plus, Edit3, Trash2, X, Save, ArrowRight,
  Calendar, Users, Utensils, Tag, MessageCircle, Download, Hash, Copy, Check, Eye, XCircle, AlertCircle
} from 'lucide-react';
import type { CotizacionDB, CotizacionEstado, Cliente, Finca, Menu, ConfiguracionGeneral } from '../types';
import { generarDocCotizacion } from '../services/documentos';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { abrirWhatsApp, generarUrlWhatsApp } from '../services/whatsapp';
import { CurrencyInput } from '../components/CurrencyInput';
import {
  useCotizacionesController,
  noches,
  formatCOP,
  formatFecha,
  type UseCotizacionesControllerParams,
} from './useCotizacionesController';

export type AdminCotizacionesProps = UseCotizacionesControllerParams;

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

export const AdminCotizaciones: React.FC<AdminCotizacionesProps> = (props) => {
  const {
    cotizaciones,
    cotizacionesFiltradas: filtradas,
    clientes,
    fincas,
    menus,
    configuracion,
    conteoPendientes,
    conteoConfirmadas,
    conteoCanceladas,
    form,
    editando,
    guardando,
    modoAlimentacionPersonalizada,
    abrirNuevo,
    abrirEdicion,
    cerrar,
    updateField,
    handleMenuSelect,
    handleFincaChange,
    handleGuardar,
    modalConfirmarReserva,
    setModalConfirmarReserva,
    modalWaCotiz,
    setModalWaCotiz,
    handleCambiarEstado,
    handleCancelarCotizacion,
    handleEliminarDefinitivo,
    handleIniciarPasoAReserva,
    handleConfirmarPasoAReserva,
    handleAbrirPedirAbono,
    handleAbrirCobroAlimentacion,
    handleDescargarPdfAlimentacion,
    tabActiva,
    setTabActiva,
    onRegistrarComunicacion,
    showToast,
    openConfirm,
    previsualizarFinca,
    abrirComunicacionesConExpediente,
  } = useCotizacionesController(props);

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
                  <input
                    type="number"
                    min={fincaSeleccionada?.capacidad_minima || 1}
                    max={fincaSeleccionada?.capacidad || 100}
                    value={form.personas || 1}
                    onChange={e => updateField('personas', +e.target.value)}
                  />
                  {fincaSeleccionada && (
                    <span className="text-xs text-muted" style={{ display: 'block', marginTop: '0.2rem', fontSize: '0.68rem' }}>
                      Capacidad: {fincaSeleccionada.capacidad_minima && fincaSeleccionada.capacidad_minima > 1 ? `${fincaSeleccionada.capacidad_minima} a ${fincaSeleccionada.capacidad}` : `Hasta ${fincaSeleccionada.capacidad}`} personas
                    </span>
                  )}
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
                            href={generarUrlWhatsApp(c.clientes.whatsapp, '')}
                            onClick={(e) => {
                              e.preventDefault();
                              abrirWhatsApp(c.clientes!.whatsapp!, '');
                            }}
                            style={{ color: '#25d366', marginLeft: '0.35rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600, cursor: 'pointer' }}
                            title="Abrir chat en WhatsApp (Desktop PC / Web)"
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

                  {/* Botón: Abrir en Comunicaciones */}
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      fontSize: '0.72rem',
                      gap: '0.25rem',
                      padding: '0.3rem 0.55rem',
                      color: '#15803d',
                      background: 'rgba(34, 197, 94, 0.08)',
                      borderColor: 'rgba(34, 197, 94, 0.3)',
                    }}
                    title="Abrir esta cotización en el Centro Inteligente de Comunicaciones"
                    onClick={() => abrirComunicacionesConExpediente('cotizacion', c.id)}
                  >
                    <MessageCircle size={12} /> Chat
                  </button>

                  {/* Botón 4: Descargar PDF */}
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: '0.72rem', gap: '0.25rem', padding: '0.3rem 0.55rem' }}
                    title="Descargar Cotización Formal en PDF"
                    onClick={() => {
                      const f = fincas.find(x => x.id === c.finca_id) || (c.fincas as any);
                      generarDocCotizacion(c, configuracion, f);
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
      {modalConfirmarReserva.abierto && modalConfirmarReserva.cotizacion && (() => {
        const cModal = modalConfirmarReserva.cotizacion;
        const valorAlojamientoModal = (cModal.subtotal_alojamiento && cModal.subtotal_alojamiento > 0)
          ? cModal.subtotal_alojamiento
          : Math.max(0, (cModal.total || 0) - (cModal.costo_alimentacion || 0));
        const costoAlimModal = cModal.costo_alimentacion || 0;
        const tieneAlimModal = costoAlimModal > 0 || (cModal.alimentacion && cModal.alimentacion !== 'Sin alimentación');

        // Saldos en tiempo real
        const saldoFincaCheckIn = Math.max(0, valorAlojamientoModal - modalConfirmarReserva.anticipoFinca);
        const abonoAlimIngresado = Math.max(0, Math.min(costoAlimModal, modalConfirmarReserva.abonoAlimentacion));
        const saldoAlimAdmin = Math.max(0, costoAlimModal - abonoAlimIngresado);

        const totalCotizacionModal = cModal.total || (valorAlojamientoModal + costoAlimModal);
        const totalRecibidoHoy = modalConfirmarReserva.anticipoFinca + abonoAlimIngresado;
        const saldoTotalPendiente = saldoFincaCheckIn + saldoAlimAdmin;
        const anticipoSugerido = Math.round(valorAlojamientoModal * 0.5);

        return (
          <div className="modal-overlay" onClick={() => setModalConfirmarReserva(p => ({ ...p, abierto: false, cotizacion: null, guardando: false }))}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto' }}>
              <div className="modal-header">
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--primary)' }}>
                  <Check size={18} /> Confirmar Pago y Pasar a Reserva
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => setModalConfirmarReserva(p => ({ ...p, abierto: false, cotizacion: null, guardando: false }))}
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
                    Este es el requisito para bloquear el calendario y crear formalmente la <strong>Reserva Activa</strong> a nombre del cliente. Los valores se centralizan de forma transparente respetando la separación entre la cuenta del propietario y la de la administración.
                  </div>
                </div>

                {/* Resumen de la Cotización */}
                <div style={{ display: 'grid', gap: '0.45rem', fontSize: '0.85rem', background: 'var(--surface-sunken)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted">Finca:</span>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {cModal.fincas?.nombre || 'Finca Campestre'}
                      {cModal.consecutivo && <ConsecutivoBadge consecutivo={cModal.consecutivo} />}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Cliente:</span>
                    <strong>
                      {cModal.clientes?.nombre
                        ? `${cModal.clientes.nombre} ${cModal.clientes.apellido || ''}`.trim()
                        : 'Cliente Particular'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Fechas:</span>
                    <span>{formatFecha(cModal.fecha_inicio)} → {formatFecha(cModal.fecha_fin)} ({cModal.personas} personas)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Valor Finca (Alojamiento):</span>
                    <strong>{formatCOP(valorAlojamientoModal)}</strong>
                  </div>
                  {tieneAlimModal && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent, #ea580c)' }}>
                      <span>Planes de Alimentación (Admin):</span>
                      <strong>{formatCOP(costoAlimModal)}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.35rem', fontWeight: 700 }}>
                    <span>Total Cotización:</span>
                    <span style={{ color: 'var(--primary)' }}>{formatCOP(totalCotizacionModal)}</span>
                  </div>
                </div>

                {/* BLOQUE 1: ALOJAMIENTO / FINCA (CUENTA PROPIETARIO) */}
                <div style={{ padding: '0.9rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', display: 'grid', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text)' }}>
                      🏡 1. Alojamiento (Cuenta del Propietario)
                    </span>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                      Sugerido 50%: {formatCOP(anticipoSugerido)}
                    </span>
                  </div>

                  <div className="field">
                    <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                      Monto recibido para separación de la finca *
                    </label>
                    <CurrencyInput
                      value={modalConfirmarReserva.anticipoFinca}
                      onChange={(val) => setModalConfirmarReserva(prev => ({ ...prev, anticipoFinca: val }))}
                    />
                  </div>

                  <div style={{ fontSize: '0.78rem', background: 'var(--surface-sunken)', padding: '0.5rem 0.75rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted">Saldo Finca pendiente al check-in (para el dueño):</span>
                    <strong style={{ color: saldoFincaCheckIn > 0 ? '#b45309' : '#16a34a' }}>
                      {formatCOP(saldoFincaCheckIn)}
                    </strong>
                  </div>
                </div>

                {/* BLOQUE 2: SERVICIO DE ALIMENTACIÓN (CUENTA ADMINISTRACIÓN) */}
                {tieneAlimModal && (
                  <div style={{ padding: '0.9rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', display: 'grid', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--accent, #ea580c)' }}>
                        🍽️ 2. Servicio de Alimentación (Cuenta Administración)
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Total Menú: {formatCOP(costoAlimModal)}
                      </span>
                    </div>

                    {/* Casilla de verificación para pago total directo */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.84rem' }}>
                      <input
                        type="checkbox"
                        checked={modalConfirmarReserva.alimentacionPagadaTotal}
                        onChange={e => {
                          const pagado = e.target.checked;
                          setModalConfirmarReserva(prev => ({
                            ...prev,
                            alimentacionPagadaTotal: pagado,
                            abonoAlimentacion: pagado ? costoAlimModal : 0,
                          }));
                        }}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span>¿El cliente canceló la totalidad de la alimentación ({formatCOP(costoAlimModal)})?</span>
                    </label>

                    {/* Casilla numérica para permitir abonos parciales */}
                    <div className="field">
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Monto recibido / abonado para alimentación ($):</span>
                        <span className="text-xs text-muted">
                          {modalConfirmarReserva.abonoAlimentacion >= costoAlimModal
                            ? 'Pago 100% Completo'
                            : modalConfirmarReserva.abonoAlimentacion > 0
                            ? 'Abono Parcial'
                            : 'Pendiente de cobro'}
                        </span>
                      </label>
                      <CurrencyInput
                        value={modalConfirmarReserva.abonoAlimentacion}
                        onChange={(val) => {
                          const nuevoValor = Math.max(0, val);
                          setModalConfirmarReserva(prev => ({
                            ...prev,
                            abonoAlimentacion: nuevoValor,
                            alimentacionPagadaTotal: nuevoValor >= costoAlimModal && costoAlimModal > 0,
                          }));
                        }}
                      />
                    </div>

                    {/* Indicador en vivo del estado de la alimentación */}
                    <div style={{ fontSize: '0.78rem', background: 'var(--surface-sunken)', padding: '0.55rem 0.75rem', borderRadius: '6px', lineHeight: 1.45 }}>
                      {abonoAlimIngresado >= costoAlimModal ? (
                        <span style={{ color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          ✓ Alimentación cancelada en su totalidad ({formatCOP(costoAlimModal)}). Servicio liquidado para la administración.
                        </span>
                      ) : abonoAlimIngresado > 0 ? (
                        <div>
                          <span style={{ color: '#c2410c', fontWeight: 600 }}>
                            🟡 Abono parcial registrado: {formatCOP(abonoAlimIngresado)}.
                          </span>
                          <span className="text-muted" style={{ marginLeft: '0.35rem' }}>
                            Saldo pendiente de alimentación para la administración: <strong>{formatCOP(saldoAlimAdmin)}</strong>. Se podrá cobrar después desde Reservas.
                          </span>
                        </div>
                      ) : (
                        <div className="text-muted">
                          ℹ️ <em>Alimentación pendiente de cobro ({formatCOP(costoAlimModal)}):</em> Podrás cobrarla después por WhatsApp o registrar su pago directo a la administración desde el módulo de Reservas.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* BLOQUE 3: RESUMEN CONSOLIDADO CENTRALIZADO */}
                <div style={{ background: 'color-mix(in srgb, var(--primary) 5%, var(--surface))', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)', padding: '0.9rem', borderRadius: '8px', display: 'grid', gap: '0.45rem', fontSize: '0.84rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.35rem' }}>
                    📊 Resumen Consolidado de la Operación
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Total General Contratado:</span>
                    <strong>{formatCOP(totalCotizacionModal)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>Total Recaudado Hoy (Abonos Recibidos):</span>
                    <strong>+{formatCOP(totalRecibidoHoy)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '0.35rem', fontWeight: 700 }}>
                    <span style={{ color: saldoTotalPendiente > 0 ? 'var(--danger)' : '#16a34a' }}>
                      Saldo Pendiente Total:
                    </span>
                    <strong style={{ color: saldoTotalPendiente > 0 ? 'var(--danger)' : '#16a34a', fontSize: '0.95rem' }}>
                      {formatCOP(saldoTotalPendiente)}
                    </strong>
                  </div>
                  {saldoTotalPendiente > 0 && (
                    <div className="text-xs text-muted" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                      <span>• Al propietario al check-in: <strong>{formatCOP(saldoFincaCheckIn)}</strong></span>
                      {tieneAlimModal && (
                        <span>• A la administración (menú): <strong>{formatCOP(saldoAlimAdmin)}</strong></span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn"
                    disabled={modalConfirmarReserva.guardando}
                    onClick={() => setModalConfirmarReserva(p => ({ ...p, abierto: false, cotizacion: null, guardando: false }))}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={modalConfirmarReserva.guardando || modalConfirmarReserva.anticipoFinca <= 0}
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
        );
      })()}

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
