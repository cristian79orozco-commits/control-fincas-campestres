import React from 'react';
import {
  Users, Plus, Edit3, Trash2, Phone, Mail, MessageCircle, X, Save,
  Search, Hash, History, Check, Copy, Award, Sparkles, ChevronLeft,
  ChevronRight, ArrowUpDown
} from 'lucide-react';
import { abrirWhatsApp, generarUrlWhatsApp } from '../services/whatsapp';
import {
  useClientesController,
  type UseClientesControllerParams,
} from './useClientesController';

export type AdminClientesProps = UseClientesControllerParams;

export const AdminClientes: React.FC<AdminClientesProps> = (props) => {
  const {
    clientes,
    clientesConHistorial,
    filtrados,
    clienteSeleccionado,
    busqueda,
    setBusqueda,
    paginaActual,
    itemsPorPagina,
    totalPaginas,
    clientesPaginados,
    irAPagina,
    irAnterior,
    irSiguiente,
    cambiarItemsPorPagina,
    form,
    setForm,
    editando,
    guardando,
    abrirNuevo,
    abrirEdicion,
    cerrar,
    handleGuardar,
    setClienteDetalleId,
    copiadoId,
    copiarConsecutivo,
    handleEliminar,
  } = useClientesController(props);

  const inicioRango = (paginaActual - 1) * itemsPorPagina + 1;
  const finRango = Math.min(paginaActual * itemsPorPagina, filtrados.length);

  return (
    <div
      className="panel"
      style={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Luz ambiental sutil contenida sin desbordamiento */}
      <div
        style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'var(--accent)',
          opacity: 0.04,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* CABECERA DEL PANEL */}
      <div className="panel-header" style={{ marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
        <div>
          <div
            className="panel-title"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: 'var(--font-dashboard)',
              fontSize: '1.18rem',
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: 'var(--text)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(26, 107, 94, 0.12)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(26, 107, 94, 0.25)',
                flexShrink: 0,
              }}
            >
              <Users size={17} />
            </div>
            <span>Directorio de Clientes y Consecutivos</span>
          </div>
          <div
            className="text-xs text-muted"
            style={{
              marginTop: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              flexWrap: 'wrap',
              fontFamily: 'var(--font-body)',
              lineHeight: 1.6,
            }}
          >
            <span><strong>{clientesConHistorial.length}</strong> clientes consolidados</span>
            <span>·</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <ArrowUpDown size={12} /> Ordenados del consecutivo más reciente al más antiguo
            </span>
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={abrirNuevo}
          style={{
            fontFamily: 'var(--font-dashboard)',
            fontWeight: 600,
            letterSpacing: '0.01em',
            gap: '0.35rem',
          }}
        >
          <Plus size={14} /> Nuevo cliente
        </button>
      </div>

      {/* BARRA DE BÚSQUEDA Y CONTROLES */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '520px' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Buscar por consecutivo (#1001), nombre, celular o correo…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 2.2rem 0.55rem 2.3rem',
              fontSize: '0.82rem',
              borderRadius: 'var(--rad-xs)',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              outline: 'none',
              fontFamily: 'var(--font-body)',
              boxSizing: 'border-box',
            }}
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              style={{
                position: 'absolute',
                right: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.2rem',
              }}
              title="Limpiar búsqueda"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {busqueda ? (
            <span>
              Encontrados: <strong style={{ color: 'var(--text)' }}>{filtrados.length}</strong>
            </span>
          ) : (
            <span>
              Mostrando <strong style={{ color: 'var(--text)' }}>{filtrados.length > 0 ? `${inicioRango} - ${finRango}` : '0'}</strong> de <strong style={{ color: 'var(--text)' }}>{filtrados.length}</strong>
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderLeft: '1px solid var(--border)', paddingLeft: '0.65rem' }}>
            <span>Filas:</span>
            <select
              value={itemsPorPagina}
              onChange={(e) => cambiarItemsPorPagina(Number(e.target.value))}
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text)',
                fontSize: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '0.2rem 0.4rem',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              <option value={8}>8</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
            </select>
          </div>
        </div>
      </div>

      {/* CONTENEDOR DE LA TABLA (100% AISLADO CONTRA DESBORDAMIENTOS) */}
      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
          borderRadius: 'var(--rad-xs)',
          border: '1px solid var(--border)',
          background: 'var(--surface-2)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '100%',
            overflowX: 'auto',
            maxHeight: '520px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <table
            style={{
              width: '100%',
              minWidth: '680px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontFamily: 'var(--font-body)',
              fontSize: '0.82rem',
            }}
          >
            <thead>
              <tr
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  background: 'var(--surface-3)',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                  fontFamily: 'var(--font-dashboard)',
                }}
              >
                <th style={{ padding: '0.75rem 1rem', width: '32%' }}>Cliente / Contacto</th>
                <th style={{ padding: '0.75rem 1rem', width: '22%', whiteSpace: 'nowrap' }}>Celular / WhatsApp</th>
                <th style={{ padding: '0.75rem 1rem', width: '28%' }}>Historial de Consecutivos</th>
                <th style={{ padding: '0.75rem 1rem', width: '18%', minWidth: '135px', textAlign: 'right', whiteSpace: 'nowrap' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: '3rem 1rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {busqueda ? (
                      <div>
                        <Search size={22} style={{ margin: '0 auto 0.5rem', opacity: 0.4, color: 'var(--accent)' }} />
                        <p style={{ margin: 0 }}>No se encontraron clientes con el término <strong>"{busqueda}"</strong>.</p>
                        <button
                          type="button"
                          onClick={() => setBusqueda('')}
                          style={{
                            marginTop: '0.5rem',
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Limpiar filtro de búsqueda
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Users size={26} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                        <p style={{ margin: 0 }}>No hay clientes registrados aún en el directorio.</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                clientesPaginados.map((item) => {
                  const c = item.cliente;
                  const telWhatsApp = (c.whatsapp || c.telefono || '').replace(/\D/g, '');
                  const tieneConsecutivos = item.consecutivos.length > 0;

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* COLUMNA 1: CLIENTE / CONTACTO */}
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <strong
                              style={{
                                fontSize: '0.88rem',
                                color: 'var(--text)',
                                fontFamily: 'var(--font-dashboard)',
                                fontWeight: 600,
                              }}
                            >
                              {c.nombre} {c.apellido || ''}
                            </strong>
                            {item.esRecurrente && (
                              <span
                                className="status-badge s-avail"
                                style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', gap: '0.2rem' }}
                              >
                                <Award size={9} /> Frecuente
                              </span>
                            )}
                            {item.esNuevoWeb && (
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  background: 'rgba(26, 107, 94, 0.10)',
                                  color: 'var(--primary)',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                }}
                              >
                                <Sparkles size={9} /> Web
                              </span>
                            )}
                          </div>

                          {c.correo && (
                            <div
                              className="text-xs text-muted"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontFamily: 'var(--font-body)',
                              }}
                            >
                              <Mail size={11} style={{ opacity: 0.7, flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                                {c.correo}
                              </span>
                            </div>
                          )}

                          {c.observaciones && (
                            <div
                              className="text-xs text-muted"
                              style={{
                                fontStyle: 'italic',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '260px',
                                opacity: 0.8,
                              }}
                            >
                              {c.observaciones}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* COLUMNA 2: CELULAR / WHATSAPP (SIN REDUNDANCIAS) */}
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {c.telefono || c.whatsapp ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)' }}>
                              {c.telefono || c.whatsapp}
                            </span>
                            {telWhatsApp && (
                              <a
                                href={generarUrlWhatsApp(telWhatsApp, '')}
                                onClick={(e) => {
                                  e.preventDefault();
                                  abrirWhatsApp(telWhatsApp, '');
                                }}
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
                                  cursor: 'pointer',
                                  textDecoration: 'none',
                                  fontWeight: 500,
                                }}
                              >
                                <MessageCircle size={11} /> WhatsApp
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted" style={{ fontStyle: 'italic' }}>
                            Sin celular registrado
                          </span>
                        )}
                      </td>

                      {/* COLUMNA 3: HISTORIAL DE CONSECUTIVOS (ORDENADOS DEL MÁS RECIENTE AL MÁS ANTIGUO) */}
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                        {tieneConsecutivos ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {item.consecutivos.map((cons, index) => {
                                const esElMasReciente = index === 0;
                                const copiado = copiadoId === cons;

                                return (
                                  <button
                                    key={cons}
                                    type="button"
                                    onClick={() => copiarConsecutivo(cons)}
                                    title={
                                      esElMasReciente
                                        ? `Consecutivo más reciente #${cons} (Clic para copiar)`
                                        : `Consecutivo previo #${cons} (Clic para copiar)`
                                    }
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      fontFamily: 'monospace',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                      background: copiado
                                        ? 'rgba(34, 197, 94, 0.15)'
                                        : esElMasReciente
                                        ? 'rgba(26, 107, 94, 0.12)'
                                        : 'var(--surface-3)',
                                      color: copiado
                                        ? '#16a34a'
                                        : esElMasReciente
                                        ? 'var(--primary)'
                                        : 'var(--text-muted)',
                                      border: `1px solid ${
                                        copiado
                                          ? 'rgba(34, 197, 94, 0.45)'
                                          : esElMasReciente
                                          ? 'rgba(26, 107, 94, 0.35)'
                                          : 'var(--border)'
                                      }`,
                                    }}
                                  >
                                    {copiado ? <Check size={10} /> : <Hash size={10} style={{ opacity: 0.6 }} />}
                                    <span>{cons}</span>
                                    <Copy size={9} style={{ opacity: 0.45, marginLeft: '2px' }} />
                                  </button>
                                );
                              })}
                            </div>
                            <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                              {item.consecutivos.length === 1
                                ? '1 estancia vinculada'
                                : `${item.consecutivos.length} estancias vinculadas`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted" style={{ fontStyle: 'italic' }}>
                            Sin reservas con consecutivo
                          </span>
                        )}
                      </td>

                      {/* COLUMNA 4: ACCIONES (LIMPIAS Y SIN REDUNDANCIAS) */}
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setClienteDetalleId(c.id)}
                            title="Ver expediente e historial de consecutivos"
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.28rem 0.55rem',
                              gap: '0.25rem',
                              fontWeight: 500,
                              fontFamily: 'var(--font-body)',
                            }}
                          >
                            <History size={12} /> Expediente
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => abrirEdicion(c)}
                            title="Editar cliente"
                            style={{ padding: '0.28rem 0.5rem' }}
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleEliminar(item)}
                            title="Eliminar cliente definitivamente"
                            style={{ padding: '0.28rem 0.5rem' }}
                          >
                            <Trash2 size={13} />
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

        {/* BARRA DE PAGINACIÓN INTEGRADA (ACABADOS LIMPIOS Y CONTENIDOS) */}
        {filtrados.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              background: 'var(--surface-3)',
              borderTop: '1px solid var(--border)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <div>
              Página <strong style={{ color: 'var(--text)' }}>{paginaActual}</strong> de <strong style={{ color: 'var(--text)' }}>{totalPaginas}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={irAnterior}
                disabled={paginaActual <= 1}
                style={{ padding: '0.2rem 0.5rem', opacity: paginaActual <= 1 ? 0.4 : 1 }}
                title="Página anterior"
              >
                <ChevronLeft size={13} />
              </button>

              {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 1)
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span style={{ padding: '0 0.2rem' }}>…</span>}
                      <button
                        type="button"
                        onClick={() => irAPagina(p)}
                        className={`btn btn-sm${p === paginaActual ? ' btn-primary' : ''}`}
                        style={{
                          minWidth: '26px',
                          height: '26px',
                          padding: '0 0.4rem',
                          fontSize: '0.72rem',
                          fontWeight: p === paginaActual ? 700 : 500,
                        }}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                className="btn btn-sm"
                onClick={irSiguiente}
                disabled={paginaActual >= totalPaginas}
                style={{ padding: '0.2rem 0.5rem', opacity: paginaActual >= totalPaginas ? 0.4 : 1 }}
                title="Página siguiente"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDITAR / NUEVO CLIENTE */}
      {editando && (
        <div className="modal-overlay" onClick={cerrar}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', fontFamily: 'var(--font-body)' }}
          >
            <div className="modal-header">
              <div
                className="panel-title"
                style={{ fontFamily: 'var(--font-dashboard)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <Users size={16} /> {form.id ? 'Editar cliente' : 'Nuevo cliente'}
              </div>
              <button type="button" className="btn btn-sm" onClick={cerrar}><X size={14} /></button>
            </div>

            <form onSubmit={handleGuardar} style={{ display: 'grid', gap: '0.75rem', padding: '1.25rem' }}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Nombre *</label>
                  <input
                    required
                    value={form.nombre || ''}
                    onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                    placeholder="Nombre"
                    style={{ fontSize: '0.82rem', borderRadius: 'var(--rad-xs)' }}
                  />
                </div>
                <div className="field">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Apellido</label>
                  <input
                    value={form.apellido || ''}
                    onChange={(e) => setForm((p) => ({ ...p, apellido: e.target.value }))}
                    placeholder="Apellido"
                    style={{ fontSize: '0.82rem', borderRadius: 'var(--rad-xs)' }}
                  />
                </div>
                <div className="field">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    <Phone size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> Celular / Teléfono
                  </label>
                  <input
                    value={form.telefono || ''}
                    onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                    placeholder="Ej. 3001234567"
                    style={{ fontSize: '0.82rem', borderRadius: 'var(--rad-xs)' }}
                  />
                </div>
                <div className="field">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    <MessageCircle size={11} style={{ display: 'inline', verticalAlign: '-1px', color: '#25d366' }} /> WhatsApp
                  </label>
                  <input
                    value={form.whatsapp || ''}
                    onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
                    placeholder="Ej. 573001234567"
                    style={{ fontSize: '0.82rem', borderRadius: 'var(--rad-xs)' }}
                  />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    <Mail size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={form.correo || ''}
                    onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))}
                    placeholder="correo@ejemplo.com"
                    style={{ fontSize: '0.82rem', borderRadius: 'var(--rad-xs)' }}
                  />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Observaciones / Notas</label>
                  <textarea
                    rows={3}
                    value={form.observaciones || ''}
                    onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
                    placeholder="Preferencias, fincas de interés o notas internas…"
                    style={{ fontSize: '0.82rem', borderRadius: 'var(--rad-xs)', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '0.35rem' }}>
                <button type="button" className="btn" onClick={cerrar} style={{ fontSize: '0.8rem' }}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={guardando}
                  style={{ fontSize: '0.8rem', fontFamily: 'var(--font-dashboard)' }}
                >
                  <Save size={14} /> {guardando ? 'Guardando…' : 'Guardar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXPEDIENTE E HISTORIAL DEL CLIENTE (CRM Y CONSECUTIVOS) */}
      {clienteSeleccionado && (
        <div className="modal-overlay" onClick={() => setClienteDetalleId(null)}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', maxHeight: '85vh', overflowY: 'auto', fontFamily: 'var(--font-body)' }}
          >
            <div className="modal-header">
              <div
                className="panel-title"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontFamily: 'var(--font-dashboard)',
                  fontSize: '1.05rem',
                }}
              >
                <History size={16} /> Expediente: {clienteSeleccionado.cliente.nombre} {clienteSeleccionado.cliente.apellido || ''}
              </div>
              <button type="button" className="btn btn-sm" onClick={() => setClienteDetalleId(null)}><X size={14} /></button>
            </div>

            <div style={{ padding: '1.25rem', display: 'grid', gap: '1rem' }}>
              {/* Tarjeta de Contacto */}
              <div style={{ background: 'var(--surface-sunken)', padding: '0.85rem', borderRadius: 'var(--rad-xs)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-dashboard)', color: 'var(--text)' }}>
                      {clienteSeleccionado.cliente.nombre} {clienteSeleccionado.cliente.apellido || ''}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
                      📞 {clienteSeleccionado.cliente.telefono || 'Sin celular'} · WhatsApp: {clienteSeleccionado.cliente.whatsapp || 'No registrado'}
                    </div>
                  </div>
                  {clienteSeleccionado.cliente.whatsapp && (
                    <a
                      href={generarUrlWhatsApp(clienteSeleccionado.cliente.whatsapp, '')}
                      onClick={(e) => {
                        e.preventDefault();
                        abrirWhatsApp(clienteSeleccionado.cliente.whatsapp!, '');
                      }}
                      className="btn btn-sm"
                      style={{ color: '#25d366', borderColor: '#25d366', cursor: 'pointer', fontSize: '0.75rem', gap: '0.3rem' }}
                      title="Abrir chat en WhatsApp"
                    >
                      <MessageCircle size={13} /> Chat WhatsApp
                    </a>
                  )}
                </div>

                {clienteSeleccionado.cliente.correo && (
                  <div className="text-xs text-muted" style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Mail size={11} /> {clienteSeleccionado.cliente.correo}
                  </div>
                )}

                {clienteSeleccionado.cliente.observaciones && (
                  <div className="text-xs text-muted" style={{ marginTop: '0.35rem', fontStyle: 'italic' }}>
                    "{clienteSeleccionado.cliente.observaciones}"
                  </div>
                )}
              </div>

              {/* Consecutivos Vinculados Ordenados */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-dashboard)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Hash size={14} style={{ color: 'var(--primary)' }} /> Consecutivos Vinculados a este Cliente
                  </span>
                  <span className="text-xs text-muted" style={{ fontWeight: 400 }}>
                    Del más reciente al más antiguo
                  </span>
                </div>

                {clienteSeleccionado.consecutivos.length === 0 ? (
                  <p className="text-xs text-muted" style={{ fontStyle: 'italic', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: '4px' }}>
                    Sin consecutivos asignados aún.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.45rem' }}>
                    {clienteSeleccionado.consecutivos.map((cons, index) => {
                      const esElMasReciente = index === 0;
                      const copiado = copiadoId === cons;

                      return (
                        <div
                          key={cons}
                          onClick={() => copiarConsecutivo(cons)}
                          title="Clic para copiar consecutivo"
                          style={{
                            padding: '0.55rem 0.75rem',
                            borderRadius: '6px',
                            border: `1px solid ${
                              copiado
                                ? 'rgba(34, 197, 94, 0.45)'
                                : esElMasReciente
                                ? 'rgba(26, 107, 94, 0.35)'
                                : 'var(--border)'
                            }`,
                            background: copiado
                              ? 'rgba(34, 197, 94, 0.12)'
                              : esElMasReciente
                              ? 'rgba(26, 107, 94, 0.10)'
                              : 'var(--surface-2)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.2rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span
                              style={{
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: esElMasReciente ? 'var(--primary)' : 'var(--text-muted)',
                              }}
                            >
                              {esElMasReciente ? 'Más reciente' : `Estancia #${clienteSeleccionado.consecutivos.length - index}`}
                            </span>
                            {copiado ? <Check size={10} color="#16a34a" /> : <Copy size={9} style={{ opacity: 0.4 }} />}
                          </div>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              color: copiado ? '#16a34a' : esElMasReciente ? 'var(--primary)' : 'var(--text)',
                            }}
                          >
                            #{cons}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resumen numérico */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                <div style={{ padding: '0.65rem', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                    {clienteSeleccionado.consecutivos.length}
                  </div>
                  <div className="text-xs text-muted">Consecutivos registrados</div>
                </div>
                <div style={{ padding: '0.65rem', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>
                    {clienteSeleccionado.reservas.length}
                  </div>
                  <div className="text-xs text-muted">Reservas asociadas</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
