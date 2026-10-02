import React, { useState } from 'react';
import {
  History, Search, Filter, Calendar, Home, Users, DollarSign,
  Download, FileText, CheckCircle, AlertTriangle, ShieldCheck,
  ChevronRight, RefreshCw, X, Award, ExternalLink
} from 'lucide-react';
import type {
  Reserva, Finca, Cliente, ConfiguracionGeneral,
  CierreReserva, PagoTipo, ReservaEstado
} from '../types';
import {
  calcularSaldo,
  obtenerNombreClienteHistorico,
  obtenerNombreFincaHistorico,
  obtenerContactoClienteHistorico,
} from '../types';
import { useHistorial } from '../hooks/useHistorial';
import { AdminExpedienteModal } from './AdminExpedienteModal';
import { AdminCierreModal } from './AdminCierreModal';
import { generarExpedienteCompleto } from '../services/documentos';

interface AdminHistorialProps {
  reservas: Reserva[];
  fincas: Finca[];
  clientes: Cliente[];
  configuracion?: ConfiguracionGeneral;
  userEmail?: string | null;
  onCerrarReserva?: (
    reservaId: string,
    datosCierre: Partial<CierreReserva>,
    pagoLiquidacion?: { valor: number; tipo: PagoTipo; observacion?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onReabrirReserva?: (reservaId: string) => Promise<{ success: boolean; error?: string }>;
  onRegistrarComunicacion?: (com: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const MESES = [
  { val: 'todos', label: 'Todos los meses' },
  { val: '01', label: 'Enero' },
  { val: '02', label: 'Febrero' },
  { val: '03', label: 'Marzo' },
  { val: '04', label: 'Abril' },
  { val: '05', label: 'Mayo' },
  { val: '06', label: 'Junio' },
  { val: '07', label: 'Julio' },
  { val: '08', label: 'Agosto' },
  { val: '09', label: 'Septiembre' },
  { val: '10', label: 'Octubre' },
  { val: '11', label: 'Noviembre' },
  { val: '12', label: 'Diciembre' },
];

function formatCOP(v: number) {
  return '$' + v.toLocaleString('es-CO');
}

function formatFecha(f?: string) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

export const AdminHistorial: React.FC<AdminHistorialProps> = ({
  reservas,
  fincas,
  clientes,
  configuracion,
  userEmail,
  onCerrarReserva,
  onReabrirReserva,
  onRegistrarComunicacion,
  showToast,
  openConfirm,
}) => {
  const {
    filtros,
    setFiltros,
    limpiarFiltros,
    reservasFiltradas,
    aniosDisponibles,
    metricas,
  } = useHistorial(reservas, fincas, clientes);

  // Estados para modales
  const [reservaParaExpediente, setReservaParaExpediente] = useState<Reserva | null>(null);
  const [reservaParaCerrar, setReservaParaCerrar] = useState<Reserva | null>(null);
  const [descargandoId, setDescargandoId] = useState<string | null>(null);

  // Exportar reporte resumido a CSV
  const handleExportarCsv = () => {
    if (reservasFiltradas.length === 0) {
      showToast('No hay registros para exportar', 'info');
      return;
    }

    const encabezados = [
      'Expediente',
      'Finca',
      'Cliente',
      'Telefono',
      'Fecha Llegada',
      'Fecha Salida',
      'Personas',
      'Valor Total',
      'Total Pagado',
      'Saldo',
      'Estado',
      'Fecha Cierre',
      'Responsable Cierre'
    ];

    const filas = reservasFiltradas.map(r => {
      const saldo = calcularSaldo(r);
      const pagado = r.valor_total - saldo;
      const cliNom = obtenerNombreClienteHistorico(r).replace(/"/g, '""');
      const finNom = obtenerNombreFincaHistorico(r).replace(/"/g, '""');
      const tel = (obtenerContactoClienteHistorico(r).whatsapp || obtenerContactoClienteHistorico(r).telefono || '').replace(/"/g, '""');
      const responsable = (r.cerrada_por || r.cierre?.responsable || '').replace(/"/g, '""');

      return [
        `"EXP-${r.id.slice(0, 8).toUpperCase()}"`,
        `"${finNom}"`,
        `"${cliNom}"`,
        `"${tel}"`,
        `"${r.fecha_inicio || ''}"`,
        `"${r.fecha_fin || ''}"`,
        r.personas || 1,
        r.valor_total || 0,
        pagado,
        saldo,
        `"${r.estado || 'activa'}"`,
        `"${r.fecha_cierre || ''}"`,
        `"${responsable}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [encabezados.join(','), ...filas].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Historial_Operaciones_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Reporte CSV de operaciones descargado ✅', 'success');
  };

  const handleDescargaDirectaExpediente = (r: Reserva) => {
    setDescargandoId(r.id);
    setTimeout(() => {
      try {
        generarExpedienteCompleto(r, r.cierre, configuracion);
        showToast('Expediente histórico PDF generado ✅', 'success');
      } catch (err: any) {
        showToast(`Error generando PDF: ${err.message || err}`, 'error');
      } finally {
        setDescargandoId(null);
      }
    }, 100);
  };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* Encabezado del Módulo */}
      <div className="panel" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={20} style={{ color: 'var(--primary)' }} />
              Historial y Cierre de Reservas
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
              Archivo completo de operaciones finalizadas, expedientes y auditoría inmutable
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-sm" onClick={handleExportarCsv} title="Descargar datos en formato CSV / Excel">
              <Download size={13} /> Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas Históricas */}
      <div className="admin-stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-val">{metricas.total}</div>
          <div className="stat-lbl">Operaciones en consulta</div>
        </div>
        <div className="stat-card">
          <div className="stat-val" style={{ color: 'var(--success)' }}>
            {formatCOP(metricas.recaudado)}
          </div>
          <div className="stat-lbl">Ingresos recaudados</div>
        </div>
        <div className="stat-card">
          <div className="stat-val" style={{ color: 'var(--primary)' }}>
            {metricas.completadas}
          </div>
          <div className="stat-lbl">Finalizadas con éxito</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">
            {metricas.promedioNoches} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>noches</span>
          </div>
          <div className="stat-lbl">Promedio de estancia</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">
            {metricas.promedioPersonas} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>pers.</span>
          </div>
          <div className="stat-lbl">Promedio grupo</div>
        </div>
        {metricas.saldoPendiente > 0 && (
          <div className="stat-card" style={{ borderLeft: '3px solid var(--danger)' }}>
            <div className="stat-val" style={{ color: 'var(--danger)', fontSize: '1.05rem' }}>
              {formatCOP(metricas.saldoPendiente)}
            </div>
            <div className="stat-lbl">Saldo por liquidar</div>
          </div>
        )}
      </div>

      {/* Barra de Filtros Completa (Fase 6: Fecha · Finca · Cliente · Estado · Mes · Año) */}
      <div className="panel" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={15} /> Filtros de Auditoría Histórica
          </div>
          {(filtros.busqueda || filtros.fechaDesde || filtros.fechaHasta || filtros.mes !== 'todos' || filtros.anio !== 'todos' || filtros.fincaId !== 'todas' || filtros.clienteId !== 'todos' || filtros.estado !== 'todas') && (
            <button
              className="btn btn-sm"
              onClick={limpiarFiltros}
              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: 'var(--danger)' }}
            >
              <X size={12} /> Limpiar filtros
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem' }}>
          {/* 1. Buscador global */}
          <div className="field">
            <label style={{ fontSize: '0.72rem' }}>Búsqueda libre</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={filtros.busqueda}
                onChange={e => setFiltros(p => ({ ...p, busqueda: e.target.value }))}
                placeholder="Cliente, Finca, ID…"
                style={{ fontSize: '0.8rem', paddingLeft: '1.8rem' }}
              />
              <Search size={12} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* 2. Filtro por Finca */}
          <div className="field">
            <label style={{ fontSize: '0.72rem' }}>Finca</label>
            <select
              value={filtros.fincaId}
              onChange={e => setFiltros(p => ({ ...p, fincaId: e.target.value }))}
              style={{ fontSize: '0.8rem' }}
            >
              <option value="todas">Todas las fincas</option>
              {fincas.map(f => (
                <option key={f.id} value={f.id}>{f.nombre}</option>
              ))}
            </select>
          </div>

          {/* 3. Filtro por Cliente */}
          <div className="field">
            <label style={{ fontSize: '0.72rem' }}>Cliente</label>
            <select
              value={filtros.clienteId}
              onChange={e => setFiltros(p => ({ ...p, clienteId: e.target.value }))}
              style={{ fontSize: '0.8rem' }}
            >
              <option value="todos">Todos los clientes</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} {c.apellido || ''}</option>
              ))}
            </select>
          </div>

          {/* 4. Filtro por Estado */}
          <div className="field">
            <label style={{ fontSize: '0.72rem' }}>Estado de operación</label>
            <select
              value={filtros.estado}
              onChange={e => setFiltros(p => ({ ...p, estado: e.target.value }))}
              style={{ fontSize: '0.8rem' }}
            >
              <option value="todas">Todos los estados</option>
              <option value="completada">Completadas</option>
              <option value="cancelada">Canceladas</option>
              <option value="no_show">No Show</option>
              <option value="activa">Activas (En curso)</option>
            </select>
          </div>

          {/* 5. Filtro por Mes */}
          <div className="field">
            <label style={{ fontSize: '0.72rem' }}>Mes</label>
            <select
              value={filtros.mes}
              onChange={e => setFiltros(p => ({ ...p, mes: e.target.value }))}
              style={{ fontSize: '0.8rem' }}
            >
              {MESES.map(m => (
                <option key={m.val} value={m.val}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* 6. Filtro por Año */}
          <div className="field">
            <label style={{ fontSize: '0.72rem' }}>Año</label>
            <select
              value={filtros.anio}
              onChange={e => setFiltros(p => ({ ...p, anio: e.target.value }))}
              style={{ fontSize: '0.8rem' }}
            >
              <option value="todos">Todos los años</option>
              {aniosDisponibles.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* 7. Filtro Fecha Desde */}
          <div className="field">
            <label style={{ fontSize: '0.72rem' }}>Fecha Desde</label>
            <input
              type="date"
              value={filtros.fechaDesde}
              onChange={e => setFiltros(p => ({ ...p, fechaDesde: e.target.value }))}
              style={{ fontSize: '0.8rem' }}
            />
          </div>

          {/* 8. Filtro Fecha Hasta */}
          <div className="field">
            <label style={{ fontSize: '0.72rem' }}>Fecha Hasta</label>
            <input
              type="date"
              value={filtros.fechaHasta}
              onChange={e => setFiltros(p => ({ ...p, fechaHasta: e.target.value }))}
              style={{ fontSize: '0.8rem' }}
            />
          </div>
        </div>
      </div>

      {/* Lista de Registros Históricos */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-alt, #fafafa)' }}>
          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
            Registros de Operaciones ({reservasFiltradas.length})
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Mostrando resultados ordenados cronológicamente
          </div>
        </div>

        {reservasFiltradas.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <History size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem', opacity: 0.6 }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
              No se encontraron registros históricos con los filtros aplicados
            </div>
            <p className="text-xs text-muted" style={{ maxWidth: '420px', margin: '0 auto 1rem' }}>
              Prueba modificando las fechas, finca, cliente o pulsa en limpiar filtros para ver todas las operaciones.
            </p>
            <button className="btn btn-sm btn-primary" onClick={limpiarFiltros}>
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="avail-table">
            {reservasFiltradas.map(r => {
              const saldo = calcularSaldo(r);
              const totalPagado = r.valor_total - saldo;
              const cliNombre = obtenerNombreClienteHistorico(r);
              const finNombre = obtenerNombreFincaHistorico(r);
              const contacto = obtenerContactoClienteHistorico(r);
              const tel = contacto.whatsapp || contacto.telefono || '—';

              const esCerrada = r.estado === 'completada' || r.estado === 'cancelada' || r.estado === 'no_show';

              return (
                <div key={r.id} className="avail-row" style={{ flexWrap: 'wrap', gap: '0.75rem', padding: '0.85rem 1.25rem' }}>
                  {/* Identificador y Finca */}
                  <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{finNombre}</span>
                      <span
                        className={`status-badge ${
                          r.estado === 'completada'
                            ? 's-avail'
                            : r.estado === 'activa'
                            ? 's-avail'
                            : 's-busy'
                        }`}
                        style={{ fontSize: '0.67rem', textTransform: 'uppercase' }}
                      >
                        {r.estado}
                      </span>
                    </div>

                    <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                      EXP-{r.id.slice(0, 8).toUpperCase()} · 👤 {cliNombre} ({tel})
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>📅 {formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}</span>
                      <span>👥 {r.personas} personas</span>
                    </div>
                  </div>

                  {/* Balance Económico */}
                  <div style={{ flex: '1 1 180px', minWidth: '160px', fontSize: '0.8rem' }}>
                    <div>Total contratado: <strong>{formatCOP(r.valor_total)}</strong></div>
                    <div>Pagado: <strong style={{ color: 'var(--success)' }}>{formatCOP(totalPagado)}</strong></div>
                    <div style={{ color: saldo > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      Saldo: <strong>{formatCOP(saldo)}</strong>
                    </div>
                  </div>

                  {/* Auditoría de Cierre */}
                  <div style={{ flex: '1 1 180px', minWidth: '160px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {r.fecha_cierre ? (
                      <>
                        <div>Cierre: <strong>{formatFecha(r.fecha_cierre.split('T')[0])}</strong></div>
                        <div>Por: {r.cerrada_por || r.cierre?.responsable || 'Administrador'}</div>
                        <div style={{ color: 'var(--primary)', fontWeight: 500 }}>
                          ✓ Registro inmutable guardado
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ color: 'var(--warning, #f59e0b)', fontWeight: 600 }}>
                          ● En curso (Sin acta de cierre)
                        </div>
                        <div>Aún activa en operación</div>
                      </>
                    )}
                  </div>

                  {/* Botones de Acción */}
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Botón Ver Expediente Completo */}
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setReservaParaExpediente(r)}
                      title="Ver expediente completo de la reserva"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <FileText size={12} /> Ver Expediente
                    </button>

                    {/* Descarga directa de PDF */}
                    <button
                      className="btn btn-sm"
                      onClick={() => handleDescargaDirectaExpediente(r)}
                      disabled={descargandoId === r.id}
                      title="Descargar expediente en PDF"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <Download size={12} /> PDF
                    </button>

                    {/* Botón Cerrar Reserva si aún está activa */}
                    {!esCerrada && onCerrarReserva && (
                      <button
                        className="btn btn-sm"
                        style={{ color: 'var(--success)', borderColor: 'var(--success)', fontSize: '0.75rem' }}
                        onClick={() => setReservaParaCerrar(r)}
                        title="Efectuar cierre formal y check-out"
                      >
                        <CheckCircle size={12} /> Cerrar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Expediente Integral de la Reserva Histórica */}
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

      {/* Modal: Cierre Formal de Reserva */}
      {reservaParaCerrar && onCerrarReserva && (
        <AdminCierreModal
          isOpen={!!reservaParaCerrar}
          reserva={reservaParaCerrar}
          userEmail={userEmail}
          onClose={() => setReservaParaCerrar(null)}
          onConfirmarCierre={async (datosCierre, pagoLiq) => {
            const res = await onCerrarReserva(reservaParaCerrar.id, datosCierre, pagoLiq);
            if (!res.success) {
              throw new Error(res.error || 'Error al guardar cierre');
            }
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};
