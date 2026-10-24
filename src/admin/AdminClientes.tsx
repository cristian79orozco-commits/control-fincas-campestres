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
    <div className="relative overflow-hidden rounded-[var(--rad-md)] bg-[var(--surface)] border border-[var(--border)] p-5 md:p-6 shadow-[var(--sh-md)] transition-all duration-300">
      {/* Luz ambiental sutil decorativa (High-End Fincas UI/UX) */}
      <div className="pointer-events-none absolute -top-28 -right-28 h-56 w-56 rounded-full bg-[var(--accent)]/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-28 h-56 w-56 rounded-full bg-[var(--primary)]/5 blur-3xl" />

      {/* CABECERA DEL PANEL */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2.5 text-lg font-bold text-[var(--text)] font-['var(--font-dashboard)']">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
              <Users size={18} />
            </div>
            <span>Directorio de Clientes y Consecutivos</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed flex items-center gap-2 flex-wrap">
            <span><strong>{clientesConHistorial.length}</strong> clientes consolidados por teléfono</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-[var(--primary)] font-medium">
              <ArrowUpDown size={12} /> Ordenados del consecutivo más reciente al más antiguo
            </span>
          </p>
        </div>

        <button
          onClick={abrirNuevo}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--rad-sm)] bg-[var(--accent)] text-[#141210] font-semibold text-xs tracking-wide shadow-[0_2px_10px_rgba(212,146,74,0.25)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_4px_18px_rgba(212,146,74,0.4)] active:scale-[0.98]"
        >
          <Plus size={15} /> Nuevo cliente
        </button>
      </div>

      {/* BARRA DE BÚSQUEDA Y CONTROLES */}
      <div className="relative z-10 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar por consecutivo (#1001), nombre, celular o correo…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-xs rounded-[var(--rad-xs)] bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] placeholder:text-[var(--text-muted)]/60 outline-none transition-all duration-200 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:shadow-[0_0_12px_rgba(212,146,74,0.2)]"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] p-0.5"
              title="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-[var(--text-muted)]">
          {busqueda ? (
            <span>
              Encontrados: <strong className="text-[var(--text)]">{filtrados.length}</strong>
            </span>
          ) : (
            <span>
              Mostrando <strong className="text-[var(--text)]">{filtrados.length > 0 ? `${inicioRango} - ${finRango}` : '0'}</strong> de <strong className="text-[var(--text)]">{filtrados.length}</strong>
            </span>
          )}

          <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--border)]">
            <span className="hidden md:inline">Filas:</span>
            <select
              value={itemsPorPagina}
              onChange={(e) => cambiarItemsPorPagina(Number(e.target.value))}
              className="bg-[var(--surface-2)] text-[var(--text)] text-xs border border-[var(--border)] rounded px-2 py-1 outline-none cursor-pointer focus:border-[var(--accent)]"
            >
              <option value={8}>8</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
            </select>
          </div>
        </div>
      </div>

      {/* CONTENEDOR DE LA TABLA (BLINDADO CONTRA DESBORDES LATERALES Y VERTICALES) */}
      <div className="relative z-10 w-full max-w-full overflow-hidden rounded-[var(--rad-sm)] border border-[var(--border)] bg-[var(--surface-2)]">
        <div className="w-full overflow-x-auto max-h-[540px] overflow-y-auto">
          <table className="w-full border-collapse text-left text-xs table-auto md:table-fixed">
            <thead className="sticky top-0 z-20 bg-[var(--surface-3)] border-b border-[var(--border)] text-[0.72rem] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4 w-[32%]">Cliente / Contacto</th>
                <th className="py-3 px-4 w-[26%]">Celular / WhatsApp</th>
                <th className="py-3 px-4 w-[27%]">Historial de Consecutivos</th>
                <th className="py-3 px-4 w-[15%] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 px-4 text-center text-[var(--text-muted)] text-sm">
                    {busqueda ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search size={22} className="opacity-40 text-[var(--accent)]" />
                        <p>No se encontraron clientes con el término <strong>"{busqueda}"</strong>.</p>
                        <button
                          onClick={() => setBusqueda('')}
                          className="text-xs text-[var(--primary)] hover:underline mt-1"
                        >
                          Limpiar filtro de búsqueda
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users size={24} className="opacity-40 text-[var(--text-muted)]" />
                        <p>No hay clientes registrados aún en el directorio.</p>
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
                      className="transition-colors duration-150 hover:bg-[var(--surface-3)]/60 text-xs"
                    >
                      {/* COLUMNA 1: CLIENTE / CONTACTO */}
                      <td className="py-3 px-4 align-middle">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <strong className="text-sm font-semibold text-[var(--text)]">
                              {c.nombre} {c.apellido || ''}
                            </strong>
                            {item.esRecurrente && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[0.62rem] font-semibold bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20">
                                <Award size={10} /> Frecuente
                              </span>
                            )}
                            {item.esNuevoWeb && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[0.62rem] font-semibold bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                                <Sparkles size={10} /> Web
                              </span>
                            )}
                          </div>

                          {c.correo && (
                            <div className="text-[0.72rem] text-[var(--text-muted)] flex items-center gap-1.5 truncate max-w-[260px]">
                              <Mail size={11} className="flex-shrink-0 opacity-70" />
                              <span className="truncate">{c.correo}</span>
                            </div>
                          )}

                          {c.observaciones && (
                            <div className="text-[0.68rem] text-[var(--text-muted)]/80 italic truncate max-w-[280px]">
                              {c.observaciones}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* COLUMNA 2: CELULAR / WHATSAPP (SIN BOTONES REDUNDANTES) */}
                      <td className="py-3 px-4 align-middle">
                        {c.telefono || c.whatsapp ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-[var(--text)]">
                              {c.telefono || c.whatsapp}
                            </span>
                            {telWhatsApp && (
                              <a
                                href={generarUrlWhatsApp(telWhatsApp, '')}
                                onClick={(e) => {
                                  e.preventDefault();
                                  abrirWhatsApp(telWhatsApp, '');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.68rem] font-medium text-[#25d366] bg-[#25d366]/10 border border-[#25d366]/30 hover:bg-[#25d366]/20 transition-all cursor-pointer"
                                title="Abrir chat directo de WhatsApp"
                              >
                                <MessageCircle size={11} /> WhatsApp
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[0.72rem] text-[var(--text-muted)] italic">
                            Sin celular registrado
                          </span>
                        )}
                      </td>

                      {/* COLUMNA 3: HISTORIAL DE CONSECUTIVOS VINCULADOS (ORDENADOS DEL MÁS RECIENTE AL MÁS ANTIGUO) */}
                      <td className="py-3 px-4 align-middle">
                        {tieneConsecutivos ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
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
                                    className={`inline-flex items-center gap-1 font-mono text-[0.72rem] font-bold px-2 py-0.5 rounded border transition-all cursor-pointer active:scale-95 ${
                                      copiado
                                        ? 'bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]'
                                        : esElMasReciente
                                        ? 'bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/40 hover:border-[var(--primary)] shadow-sm'
                                        : 'bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--text-muted)] hover:text-[var(--text)]'
                                    }`}
                                  >
                                    {copiado ? (
                                      <Check size={10} className="text-[var(--success)]" />
                                    ) : (
                                      <Hash size={10} className="opacity-60" />
                                    )}
                                    <span>{cons}</span>
                                    <Copy size={9} className="opacity-40 ml-0.5" />
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-[0.66rem] text-[var(--text-muted)]">
                              {item.consecutivos.length === 1
                                ? '1 estancia vinculada'
                                : `${item.consecutivos.length} estancias vinculadas`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[0.72rem] text-[var(--text-muted)] italic">
                            Sin reservas con consecutivo
                          </span>
                        )}
                      </td>

                      {/* COLUMNA 4: ACCIONES (LIMPIAS Y SIN REDUNDANCIAS) */}
                      <td className="py-3 px-4 align-middle text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                            onClick={() => setClienteDetalleId(c.id)}
                            title="Ver expediente e historial de consecutivos"
                          >
                            <History size={12} />
                            <span className="hidden lg:inline">Historial</span>
                          </button>

                          <button
                            type="button"
                            className="p-1.5 rounded bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all"
                            onClick={() => abrirEdicion(c)}
                            title="Editar datos del cliente"
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            type="button"
                            className="p-1.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                            onClick={() => handleEliminar(item)}
                            title="Eliminar cliente definitivamente"
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

        {/* BARRA DE PAGINACIÓN (EVITA LA EXPANSIÓN INFINITA HACIA ABAJO) */}
        {filtrados.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-3)] border-t border-[var(--border)] text-xs text-[var(--text-muted)] flex-wrap gap-2">
            <div>
              Página <strong className="text-[var(--text)]">{paginaActual}</strong> de <strong className="text-[var(--text)]">{totalPaginas}</strong>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={irAnterior}
                disabled={paginaActual <= 1}
                className="p-1.5 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Página anterior"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 1)
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-[var(--text-muted)]">…</span>}
                      <button
                        type="button"
                        onClick={() => irAPagina(p)}
                        className={`min-w-[28px] h-7 px-1 rounded text-xs font-semibold border transition-all ${
                          p === paginaActual
                            ? 'bg-[var(--accent)] text-[#141210] border-[var(--accent)] shadow-sm'
                            : 'bg-[var(--surface-2)] text-[var(--text)] border-[var(--border)] hover:border-[var(--accent)]'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                onClick={irSiguiente}
                disabled={paginaActual >= totalPaginas}
                className="p-1.5 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Página siguiente"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDITAR / NUEVO CLIENTE */}
      {editando && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={cerrar}>
          <div
            className="modal-box w-full max-w-lg rounded-[var(--rad-md)] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--sh-lg)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface-2)]">
              <div className="font-bold text-sm text-[var(--text)] flex items-center gap-2">
                <Users size={16} className="text-[var(--primary)]" />
                <span>{form.id ? 'Editar cliente' : 'Registrar nuevo cliente'}</span>
              </div>
              <button
                type="button"
                className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded"
                onClick={cerrar}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="field flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--text-muted)]">Nombre *</label>
                  <input
                    required
                    value={form.nombre || ''}
                    onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej. Juan"
                    className="w-full px-3 py-2 text-xs rounded bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="field flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--text-muted)]">Apellido</label>
                  <input
                    value={form.apellido || ''}
                    onChange={(e) => setForm((p) => ({ ...p, apellido: e.target.value }))}
                    placeholder="Ej. Pérez"
                    className="w-full px-3 py-2 text-xs rounded bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="field flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
                    <Phone size={11} /> Celular / Teléfono
                  </label>
                  <input
                    value={form.telefono || ''}
                    onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                    placeholder="Ej. 3001234567"
                    className="w-full px-3 py-2 text-xs rounded bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="field flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
                    <MessageCircle size={11} className="text-[#25d366]" /> WhatsApp
                  </label>
                  <input
                    value={form.whatsapp || ''}
                    onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
                    placeholder="Ej. 573001234567"
                    className="w-full px-3 py-2 text-xs rounded bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="field sm:col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
                    <Mail size={11} /> Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={form.correo || ''}
                    onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2 text-xs rounded bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="field sm:col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--text-muted)]">Observaciones / Notas</label>
                  <textarea
                    rows={3}
                    value={form.observaciones || ''}
                    onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
                    placeholder="Preferencias, fincas de interés o notas internas…"
                    className="w-full px-3 py-2 text-xs rounded bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] outline-none focus:border-[var(--accent)] resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={cerrar}
                  className="px-4 py-2 text-xs font-medium rounded text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] text-[#141210] hover:brightness-110 disabled:opacity-50 transition-all shadow-sm"
                >
                  <Save size={13} /> {guardando ? 'Guardando…' : 'Guardar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXPEDIENTE E HISTORIAL DEL CLIENTE (ENFOCADO EN CRM Y CONSECUTIVOS) */}
      {clienteSeleccionado && (
        <div
          className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setClienteDetalleId(null)}
        >
          <div
            className="modal-box w-full max-w-lg rounded-[var(--rad-md)] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--sh-lg)] overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface-2)] flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                  <History size={15} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text)]">
                    Historial de Consecutivos y Expediente
                  </h3>
                  <p className="text-[0.68rem] text-[var(--text-muted)]">
                    Cliente: {clienteSeleccionado.cliente.nombre} {clienteSeleccionado.cliente.apellido || ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded"
                onClick={() => setClienteDetalleId(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Contenido Modal Scrollable */}
            <div className="p-5 overflow-y-auto flex flex-col gap-4">
              {/* Tarjeta de Contacto */}
              <div className="p-3.5 rounded-[var(--rad-xs)] bg-[var(--surface-2)] border border-[var(--border)] flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h4 className="font-bold text-sm text-[var(--text)]">
                      {clienteSeleccionado.cliente.nombre} {clienteSeleccionado.cliente.apellido || ''}
                    </h4>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      📞 {clienteSeleccionado.cliente.telefono || 'Sin teléfono'}
                    </div>
                  </div>

                  {clienteSeleccionado.cliente.whatsapp && (
                    <a
                      href={generarUrlWhatsApp(clienteSeleccionado.cliente.whatsapp, '')}
                      onClick={(e) => {
                        e.preventDefault();
                        abrirWhatsApp(clienteSeleccionado.cliente.whatsapp!, '');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium text-[#25d366] bg-[#25d366]/10 border border-[#25d366]/30 hover:bg-[#25d366]/20 transition-all cursor-pointer"
                    >
                      <MessageCircle size={13} /> Chat WhatsApp
                    </a>
                  )}
                </div>

                {clienteSeleccionado.cliente.correo && (
                  <div className="text-xs text-[var(--text-muted)] flex items-center gap-1 pt-1 border-t border-[var(--border)]">
                    <Mail size={12} className="opacity-70" />
                    <span>{clienteSeleccionado.cliente.correo}</span>
                  </div>
                )}

                {clienteSeleccionado.cliente.observaciones && (
                  <div className="text-xs text-[var(--text-muted)] italic pt-1">
                    "{clienteSeleccionado.cliente.observaciones}"
                  </div>
                )}
              </div>

              {/* Consecutivos Asignados (Ordenados del más reciente al más antiguo) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
                    <Hash size={13} className="text-[var(--primary)]" />
                    Consecutivos Vinculados a este Número
                  </span>
                  <span className="text-[0.68rem] text-[var(--text-muted)]">
                    Del más reciente al más antiguo
                  </span>
                </div>

                {clienteSeleccionado.consecutivos.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic py-3 text-center bg-[var(--surface-2)] rounded border border-[var(--border)]">
                    No hay números de consecutivo vinculados a este cliente aún.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {clienteSeleccionado.consecutivos.map((cons, index) => {
                      const esElMasReciente = index === 0;
                      const copiado = copiadoId === cons;

                      return (
                        <div
                          key={cons}
                          onClick={() => copiarConsecutivo(cons)}
                          title="Clic para copiar consecutivo"
                          className={`p-2.5 rounded border flex flex-col justify-between transition-all cursor-pointer ${
                            copiado
                              ? 'bg-[var(--success)]/15 border-[var(--success)] text-[var(--success)]'
                              : esElMasReciente
                              ? 'bg-[var(--primary)]/10 border-[var(--primary)]/40 text-[var(--primary)]'
                              : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)] hover:border-[var(--text-muted)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[0.62rem] font-semibold uppercase tracking-wider opacity-70">
                              {esElMasReciente ? 'Más reciente' : `Estancia #${clienteSeleccionado.consecutivos.length - index}`}
                            </span>
                            {copiado ? <Check size={11} /> : <Copy size={10} className="opacity-50" />}
                          </div>
                          <span className="font-mono text-sm font-bold mt-1">
                            #{cons}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resumen de actividad */}
              <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-[var(--border)]">
                <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                  <div className="text-lg font-bold text-[var(--primary)] font-mono">
                    {clienteSeleccionado.consecutivos.length}
                  </div>
                  <div className="text-[0.68rem] text-[var(--text-muted)]">Consecutivos registrados</div>
                </div>
                <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                  <div className="text-lg font-bold text-[var(--accent)] font-mono">
                    {clienteSeleccionado.reservas.length}
                  </div>
                  <div className="text-[0.68rem] text-[var(--text-muted)]">Reservas en sistema</div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-2)] flex justify-end flex-shrink-0">
              <button
                type="button"
                className="px-4 py-1.5 text-xs font-medium rounded text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-3)] transition-all"
                onClick={() => setClienteDetalleId(null)}
              >
                Cerrar expediente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
