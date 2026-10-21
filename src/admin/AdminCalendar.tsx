import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, User, Lock, Calendar,
  CreditCard, FileText, MessageCircle, FileCheck, Check, Copy, Hash,
  ChevronDown, ChevronUp, AlertTriangle, UtensilsCrossed, Sparkles, Building2,
  Clock, X, Save, Search, Percent, ShieldCheck, CheckSquare, Info, ExternalLink
} from 'lucide-react';
import type {
  Finca, BloqueoDisponibilidad, Reserva, Cliente, CotizacionDB,
  Menu as MenuType, ConfiguracionGeneral, PagoTipo, Pago, CierreReserva
} from '../types';
import { calcularSaldo } from '../types';
import { ConsecutivoBadge } from './AdminReservas';
import { CurrencyInput } from '../components/CurrencyInput';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { AdminCierreModal } from './AdminCierreModal';
import { AdminExpedienteModal } from './AdminExpedienteModal';
import { AdminDocumentos } from './AdminDocumentos';
import {
  plantillaRecordatorioPago,
  plantillaBienvenida,
  plantillaSeparacion,
  plantillaPazYSalvo,
  plantillaEstadoCuenta,
  abrirWhatsApp,
  generarUrlWhatsApp,
} from '../services/whatsapp';
import { generarDocSeparacion, generarPazYSalvo, generarEstadoCuenta } from '../services/documentos';

interface AdminCalendarProps {
  fincas: Finca[];
  bloquesAdmin: BloqueoDisponibilidad[];
  reservas?: Reserva[];
  clientes?: Cliente[];
  cotizaciones?: CotizacionDB[];
  menus?: MenuType[];
  configuracion?: ConfiguracionGeneral;
  userEmail?: string | null;
  onMarcarDias: (fincaId: string, fechas: string[], estado: 'ocupado' | 'libre', nombreCliente?: string) => Promise<{ success: boolean; error?: string }>;
  onEliminarBloqueo?: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  onGuardarReserva?: (datos: Partial<Reserva>) => Promise<{ success: boolean; id?: string; error?: string }>;
  onCambiarEstadoReserva?: (id: string, estado: any) => Promise<{ success: boolean; error?: string }>;
  onRegistrarPago?: (reservaId: string, pago: { tipo: PagoTipo; fecha: string; valor: number; observacion?: string }) => Promise<{ success: boolean; error?: string }>;
  onEliminarPago?: (pagoId: string) => Promise<{ success: boolean; error?: string }>;
  onCerrarReserva?: (
    reservaId: string,
    datosCierre: Partial<CierreReserva>,
    pagoLiquidacion?: { valor: number; tipo: PagoTipo; observacion?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onReabrirReserva?: (reservaId: string) => Promise<{ success: boolean; error?: string }>;
  onEliminarReserva?: (id: string) => Promise<{ success: boolean; error?: string }>;
  onRegistrarComunicacion?: (com: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const TIPOS_PAGO: { valor: PagoTipo; label: string }[] = [
  { valor: 'separacion', label: 'Separación' },
  { valor: 'abono', label: 'Abono' },
  { valor: 'pago_total', label: 'Pago total' },
  { valor: 'devolucion', label: 'Devolución' },
];

const PAGO_VACIO = {
  tipo: 'abono' as PagoTipo,
  fecha: new Date().toISOString().split('T')[0],
  valor: 0,
  observacion: ''
};

function formatCOP(v: number) {
  return '$' + (v || 0).toLocaleString('es-CO') + ' COP';
}

function formatFecha(f?: string) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

export const AdminCalendar: React.FC<AdminCalendarProps> = ({
  fincas,
  bloquesAdmin,
  reservas = [],
  clientes = [],
  cotizaciones = [],
  menus = [],
  configuracion,
  userEmail,
  onMarcarDias,
  onEliminarBloqueo,
  onGuardarReserva,
  onCambiarEstadoReserva,
  onRegistrarPago,
  onEliminarPago,
  onCerrarReserva,
  onReabrirReserva,
  onEliminarReserva,
  onRegistrarComunicacion,
  showToast,
  openConfirm,
}) => {
  // Preseleccionar la primera finca por defecto para que el calendario grande SIEMPRE se muestre de inmediato
  const [selectedFincaId, setSelectedFincaId] = useState<string>(() => {
    return fincas[0]?.id || '';
  });

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState<Set<string>>(new Set());
  const [nombreCliente, setNombreCliente] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [busquedaFinca, setBusquedaFinca] = useState('');
  const [fechaInspeccionada, setFechaInspeccionada] = useState<string | null>(null);

  // Estados de interfaz de reservas inferiores
  const [filtroFincaReservas, setFiltroFincaReservas] = useState<'esta_finca' | 'todas'>('esta_finca');
  const [reservaExpandida, setReservaExpandida] = useState<string | null>(null);
  const [pagoReservaId, setPagoReservaId] = useState<string | null>(null);
  const [pagoForm, setPagoForm] = useState<typeof PAGO_VACIO>(PAGO_VACIO);
  const [guardandoPago, setGuardandoPago] = useState(false);
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
    tipo: 'general',
  });

  // Asegurar que si fincas cargan de forma asíncrona, se preseleccione la primera automáticamente
  useEffect(() => {
    if (!selectedFincaId && fincas.length > 0) {
      setSelectedFincaId(fincas[0].id);
    }
  }, [fincas, selectedFincaId]);

  const anio = currentDate.getFullYear();
  const mes = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(anio, mes - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(anio, mes + 1, 1));
  const handleIrAHoy = () => setCurrentDate(new Date());

  const diasMes = new Date(anio, mes + 1, 0).getDate();
  const primerDiaSemana = new Date(anio, mes, 1).getDay();
  const offset = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

  const hoyStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Finca seleccionada actual
  const fincaActual = useMemo(() => {
    return fincas.find(f => f.id === selectedFincaId) || fincas[0] || null;
  }, [fincas, selectedFincaId]);

  // Mapa de fechas ocupadas y detalle de reservas para la finca actualmente seleccionada
  const { ocupadosSet, reservasPorFecha, bloqueosPorFecha } = useMemo(() => {
    const set = new Set<string>();
    const resMap = new Map<string, Reserva>();
    const bloqMap = new Map<string, BloqueoDisponibilidad>();

    if (!selectedFincaId) return { ocupadosSet: set, reservasPorFecha: resMap, bloqueosPorFecha: bloqMap };

    // 1. Bloqueos administrativos en Supabase
    bloquesAdmin
      .filter(b => b.finca_id === selectedFincaId && b.estado === 'ocupado')
      .forEach(b => {
        const d = new Date(b.fecha_inicio + 'T00:00:00');
        const fin = new Date(b.fecha_fin + 'T00:00:00');
        while (d <= fin) {
          const iso = d.toISOString().split('T')[0];
          set.add(iso);
          bloqMap.set(iso, b);
          d.setDate(d.getDate() + 1);
        }
      });

    // 2. Reservas activas asociadas a la finca
    reservas
      .filter(r => r.finca_id === selectedFincaId && r.estado === 'activa')
      .forEach(r => {
        const d = new Date(r.fecha_inicio + 'T00:00:00');
        const fin = new Date(r.fecha_fin + 'T00:00:00');
        while (d <= fin) {
          const iso = d.toISOString().split('T')[0];
          set.add(iso);
          resMap.set(iso, r);
          d.setDate(d.getDate() + 1);
        }
      });

    return { ocupadosSet: set, reservasPorFecha: resMap, bloqueosPorFecha: bloqMap };
  }, [bloquesAdmin, reservas, selectedFincaId]);

  // Reservas activas para mostrar en el listado inferior
  const reservasActivas = useMemo(() => {
    return reservas.filter(r => {
      if (r.estado !== 'activa') return false;
      if (filtroFincaReservas === 'esta_finca' && selectedFincaId) {
        return r.finca_id === selectedFincaId;
      }
      return true;
    });
  }, [reservas, filtroFincaReservas, selectedFincaId]);

  // Conteo de reservas activas por finca para mostrar en los chips
  const conteoPorFinca = useMemo(() => {
    const map: Record<string, number> = {};
    fincas.forEach(f => {
      map[f.id] = reservas.filter(r => r.finca_id === f.id && r.estado === 'activa').length;
    });
    return map;
  }, [fincas, reservas]);

  // Fincas filtradas para la ventana menú estática
  const fincasFiltradasMenu = useMemo(() => {
    if (!busquedaFinca.trim()) return fincas;
    const q = busquedaFinca.toLowerCase();
    return fincas.filter(f =>
      f.nombre.toLowerCase().includes(q) ||
      (f.zona && f.zona.toLowerCase().includes(q))
    );
  }, [fincas, busquedaFinca]);

  // Métricas objetivas de ocupación para el mes visible
  const metricasMes = useMemo(() => {
    let ocupados = 0;
    for (let dia = 1; dia <= diasMes; dia++) {
      const fStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      if (ocupadosSet.has(fStr)) ocupados++;
    }
    const libres = diasMes - ocupados;
    const porcentaje = diasMes > 0 ? Math.round((ocupados / diasMes) * 100) : 0;
    return { diasMes, ocupados, libres, porcentaje };
  }, [anio, mes, diasMes, ocupadosSet]);

  const toggleDia = (fechaStr: string) => {
    setFechasSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(fechaStr)) next.delete(fechaStr);
      else next.add(fechaStr);
      return next;
    });
    setFechaInspeccionada(fechaStr);
  };

  // Atajo: Seleccionar fines de semana (Viernes, Sábado y Domingo)
  const handleSeleccionarFinesDeSemana = () => {
    const nuevos = new Set(fechasSeleccionadas);
    for (let dia = 1; dia <= diasMes; dia++) {
      const dateObj = new Date(anio, mes, dia);
      const dayOfWeek = dateObj.getDay(); // 0 = Dom, 5 = Vie, 6 = Sáb
      if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
        const fStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        nuevos.add(fStr);
      }
    }
    setFechasSeleccionadas(nuevos);
    showToast('Fines de semana (Vie-Sáb-Dom) seleccionados', 'info');
  };

  // Liberar fecha individual directamente desde el inspector de fecha
  const handleLiberarBloqueoRapido = async (bloqueo: BloqueoDisponibilidad) => {
    setProcesando(true);
    let res: { success: boolean; error?: string };
    if (onEliminarBloqueo) {
      res = await onEliminarBloqueo(bloqueo.id);
    } else {
      res = await onMarcarDias(selectedFincaId, [bloqueo.fecha_inicio], 'libre');
    }
    setProcesando(false);

    if (res.success) {
      showToast('Bloqueo eliminado y fecha liberada ✅', 'success');
      setFechaInspeccionada(null);
      setFechasSeleccionadas(prev => {
        const next = new Set(prev);
        next.delete(bloqueo.fecha_inicio);
        return next;
      });
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  };

  const handleMarcar = async (estado: 'ocupado' | 'libre') => {
    if (!selectedFincaId) {
      showToast('Selecciona una finca primero', 'error');
      return;
    }
    if (!fechasSeleccionadas.size) {
      showToast('Selecciona al menos un día en el calendario', 'error');
      return;
    }

    setProcesando(true);
    const res = await onMarcarDias(
      selectedFincaId,
      Array.from(fechasSeleccionadas),
      estado,
      nombreCliente.trim() || undefined
    );
    setProcesando(false);

    if (res.success) {
      showToast(`Días marcados como "${estado}" correctamente ✅`, 'success');
      setFechasSeleccionadas(new Set());
      setNombreCliente('');
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  };

  // Registrar abono desde el listado inferior
  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pagoReservaId || !onRegistrarPago) return;
    if (!pagoForm.valor || pagoForm.valor <= 0) {
      showToast('El valor debe ser mayor a cero', 'error');
      return;
    }
    setGuardandoPago(true);
    const res = await onRegistrarPago(pagoReservaId, pagoForm);
    setGuardandoPago(false);
    if (res.success) {
      showToast('Pago registrado correctamente ✅', 'success');
      setPagoForm(PAGO_VACIO);
      setPagoReservaId(null);
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  };

  const handleEliminarPagoClick = (p: Pago) => {
    if (!onEliminarPago) return;
    if (openConfirm) {
      openConfirm(
        '¿Eliminar pago?',
        `Se eliminará el registro de ${formatCOP(p.valor)} (${p.tipo}).`,
        async () => {
          const res = await onEliminarPago(p.id);
          if (res.success) showToast('Pago eliminado', 'info');
          else showToast(`Error: ${res.error}`, 'error');
        }
      );
    } else {
      onEliminarPago(p.id).then(() => showToast('Pago eliminado', 'info'));
    }
  };

  return (
    <div className="admin-big-cal-wrapper">
      {/* ─── ENCABEZADO PRINCIPAL DEL MÓDULO ────────────────────────────────────────── */}
      <div className="panel" style={{ padding: '1.25rem 1.25rem 0.95rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
              <Calendar size={22} style={{ color: 'var(--primary)' }} /> Calendario de Disponibilidad
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
              Gestión centralizada de fechas libres, bloqueos manuales y reservas confirmadas en tiempo real.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="status-badge s-avail" style={{ gap: '0.35rem' }}>
              <Sparkles size={12} /> Sincronización en vivo
            </span>
            {fincaActual && (
              <span className="status-badge s-info" style={{ gap: '0.35rem' }}>
                <Building2 size={12} /> Finca: {fincaActual.nombre}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── VENTANA MENÚ ESTÁTICA DE FINCAS (SIN DESPLIEGUE HORIZONTAL) ────────────── */}
      <div className="admin-fincas-menu-window">
        <div className="admin-fincas-menu-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.98rem' }}>
              <Building2 size={16} style={{ color: 'var(--primary)' }} /> Propiedades y Fincas
              <span className="status-badge s-info" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                {fincas.length} en total
              </span>
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
              Haz clic en cualquier propiedad para inspeccionar y administrar su disponibilidad:
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', justifyContent: 'flex-end', minWidth: '220px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '260px' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="admin-fincas-search-input"
                placeholder="Buscar finca por nombre o lugar..."
                value={busquedaFinca}
                onChange={e => setBusquedaFinca(e.target.value)}
                style={{ paddingLeft: '28px', width: '100%' }}
              />
              {busquedaFinca && (
                <button
                  type="button"
                  onClick={() => setBusquedaFinca('')}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  title="Limpiar búsqueda"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Viewport estático con scroll vertical acotado */}
        <div className="admin-fincas-menu-viewport">
          {fincasFiltradasMenu.length === 0 ? (
            <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No se encontraron fincas con "{busquedaFinca}".
            </div>
          ) : (
            fincasFiltradasMenu.map(f => {
              const esActiva = (selectedFincaId || fincas[0]?.id) === f.id;
              const activasCount = conteoPorFinca[f.id] || 0;
              const fotoUrl = f.finca_imagenes?.[0]?.url || '';

              return (
                <div
                  key={f.id}
                  className={`admin-finca-menu-item ${esActiva ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedFincaId(f.id);
                    setFechasSeleccionadas(new Set());
                    setFechaInspeccionada(null);
                  }}
                  role="button"
                  tabIndex={0}
                  title={`Seleccionar ${f.nombre}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                    {fotoUrl ? (
                      <img src={fotoUrl} alt={f.nombre} className="admin-finca-menu-thumb" />
                    ) : (
                      <div className="admin-finca-menu-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={20} style={{ opacity: 0.4 }} />
                      </div>
                    )}
                    <div className="admin-finca-menu-info">
                      <div className="admin-finca-menu-name">{f.nombre}</div>
                      <div className="admin-finca-menu-meta">
                        {f.capacidad ? <span>👥 {f.capacidad_minima && f.capacidad_minima > 1 ? `${f.capacidad_minima} a ${f.capacidad}` : `Hasta ${f.capacidad}`} personas</span> : null}
                        {f.zona ? <span>📍 {f.zona}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {activasCount > 0 ? (
                      <span className="status-badge s-busy" style={{ fontSize: '0.68rem', padding: '0.2rem 0.55rem' }}>
                        {activasCount} reserva{activasCount !== 1 ? 's' : ''} activa{activasCount !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="status-badge s-avail" style={{ fontSize: '0.68rem', padding: '0.2rem 0.55rem' }}>
                        100% Libre
                      </span>
                    )}
                    {esActiva && (
                      <span style={{ color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                        <Check size={16} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── CALENDARIO PRINCIPAL Y MÉTRICAS DE OCUPACIÓN ─────────────────────────── */}
      <div className="admin-big-cal-container">
        {/* Barra superior de métricas de ocupación del mes actual */}
        <div className="cal-occupancy-kpi-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Percent size={18} style={{ color: 'var(--primary)' }} />
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                Ocupación: {fincaActual?.nombre || 'Finca'} ({MESES[mes]} {anio})
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
                <div style={{ width: '120px', height: '7px', borderRadius: '4px', background: 'var(--surface-3)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${metricasMes.porcentaje}%`,
                      height: '100%',
                      background: metricasMes.porcentaje > 70 ? 'var(--danger)' : metricasMes.porcentaje > 30 ? 'var(--warning)' : 'var(--success)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                  {metricasMes.porcentaje}% ocupado
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="occ-stat-pill" style={{ color: 'var(--danger)' }}>
              ● {metricasMes.ocupados} días ocupados
            </span>
            <span className="occ-stat-pill" style={{ color: 'var(--success)' }}>
              ● {metricasMes.libres} días libres
            </span>
            <span className="occ-stat-pill" style={{ color: 'var(--text-muted)' }}>
              Mes: {metricasMes.diasMes} días
            </span>
          </div>
        </div>

        {/* Barra de navegación de mes y leyenda */}
        <div className="admin-big-cal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-sm" onClick={handlePrevMonth} title="Mes anterior">
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', minWidth: '160px', textAlign: 'center' }}>
              {MESES[mes]} {anio}
            </span>
            <button className="btn btn-sm" onClick={handleNextMonth} title="Mes siguiente">
              <ChevronRight size={16} />
            </button>

            <button
              className="btn btn-sm"
              onClick={handleIrAHoy}
              style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.3rem 0.65rem', marginLeft: '0.25rem' }}
              title="Volver al día y mes actual"
            >
              <Clock size={13} /> Hoy
            </button>
          </div>

          {/* Leyenda de colores adaptativa */}
          <div className="cal-legend" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
            <span className="legend-dot free">Libre</span>
            <span className="legend-dot busy">Reserva Huésped</span>
            <span className="legend-dot sel">Seleccionado ({fechasSeleccionadas.size})</span>
          </div>
        </div>

        {/* Cuadrícula grande y responsiva del calendario */}
        <div className="calendar-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
          <div className="admin-big-cal-grid">
            {/* Cabeceras de días de la semana */}
            {DIAS_SEMANA.map(d => (
              <div
                key={d}
                style={{
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  padding: '0.5rem 0',
                  color: 'var(--text-faint)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                {d}
              </div>
            ))}

            {/* Espacios vacíos de offset del mes */}
            {Array.from({ length: offset }).map((_, i) => (
              <div
                key={`offset-${i}`}
                className="admin-cal-day-large empty"
                style={{ opacity: 0.15, pointerEvents: 'none', background: 'var(--surface-2)', borderStyle: 'dashed' }}
              />
            ))}

            {/* Días del mes */}
            {Array.from({ length: diasMes }).map((_, i) => {
              const diaNum = i + 1;
              const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
              const esOcupado = ocupadosSet.has(fechaStr);
              const esSeleccionado = fechasSeleccionadas.has(fechaStr);
              const esHoy = fechaStr === hoyStr;

              // Obtener reserva o bloqueo vinculado para mostrar detalles
              const reservaVinculada = reservasPorFecha.get(fechaStr);
              const bloqueoVinculado = bloqueosPorFecha.get(fechaStr);

              let clienteEtiqueta = '';
              let consecutivoTexto = '';

              if (reservaVinculada) {
                const nom = reservaVinculada.clientes
                  ? `${reservaVinculada.clientes.nombre} ${reservaVinculada.clientes.apellido || ''}`.trim()
                  : 'Reserva activa';
                clienteEtiqueta = nom;
                consecutivoTexto = reservaVinculada.consecutivo ? `#${reservaVinculada.consecutivo}` : '';
              } else if (bloqueoVinculado?.notas) {
                clienteEtiqueta = bloqueoVinculado.notas;
              }

              let cls = 'admin-cal-day-large';
              if (esSeleccionado) cls += ' selected';
              else if (bloqueoVinculado) cls += ' busy-admin';
              else if (esOcupado) cls += ' busy';
              else cls += ' free';
              if (esHoy) cls += ' today';

              return (
                <div
                  key={fechaStr}
                  className={cls}
                  onClick={() => toggleDia(fechaStr)}
                  title={`${fechaStr}: ${esOcupado ? `Ocupado (${clienteEtiqueta || 'Bloqueado'})` : 'Disponible / Libre'}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {diaNum}
                    </span>
                    {esHoy && (
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          background: 'var(--primary)',
                          color: '#fff',
                          letterSpacing: '0.02em',
                        }}
                      >
                        HOY
                      </span>
                    )}
                  </div>

                  {/* Micro-indicador de color para móviles */}
                  <div className={`cal-mobile-indicator ${esOcupado ? (bloqueoVinculado ? 'busy-admin' : 'busy') : 'free'}`} />

                  {/* Contenido enriquecido para PC */}
                  <div className="desktop-cal-content" style={{ marginTop: '0.35rem', fontSize: '0.72rem', overflow: 'hidden' }}>
                    {reservaVinculada ? (
                      <div
                        style={{
                          padding: '0.2rem 0.35rem',
                          borderRadius: '4px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: 'var(--danger)',
                          fontWeight: 600,
                          lineHeight: 1.2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {consecutivoTexto && (
                          <span style={{ fontFamily: 'monospace', marginRight: '0.2rem' }}>
                            {consecutivoTexto}
                          </span>
                        )}
                        {clienteEtiqueta || 'Reserva'}
                      </div>
                    ) : bloqueoVinculado ? (
                      <div
                        style={{
                          padding: '0.2rem 0.35rem',
                          borderRadius: '4px',
                          background: 'rgba(245, 158, 11, 0.18)',
                          color: '#b45309',
                          fontWeight: 600,
                          lineHeight: 1.2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        🔒 {bloqueoVinculado.notas || 'Bloqueo'}
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '0.15rem 0.35rem',
                          borderRadius: '4px',
                          color: 'var(--success)',
                          fontWeight: 500,
                          fontSize: '0.68rem',
                        }}
                      >
                        Disponible
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── INSPECTOR CONTEXTUAL DE FECHA SELECCIONADA ─────────────────────── */}
        {fechaInspeccionada && (
          <div className="cal-date-inspector-card">
            {(() => {
              const resVin = reservasPorFecha.get(fechaInspeccionada);
              const bloqVin = bloqueosPorFecha.get(fechaInspeccionada);
              const nomCliente = resVin?.clientes
                ? `${resVin.clientes.nombre} ${resVin.clientes.apellido || ''}`.trim()
                : 'Reserva activa';
              const tel = resVin?.clientes?.whatsapp || resVin?.clientes?.telefono;

              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                      📅 {formatFecha(fechaInspeccionada)}
                    </span>

                    {bloqVin ? (
                      <span className="status-badge s-warn" style={{ gap: '0.3rem', fontSize: '0.74rem' }}>
                        <Lock size={12} /> Bloqueo manual: <strong>{bloqVin.notas || 'Sin notas'}</strong>
                      </span>
                    ) : resVin ? (
                      <span className="status-badge s-busy" style={{ gap: '0.35rem', fontSize: '0.74rem' }}>
                        👤 <strong>{nomCliente}</strong> {resVin.consecutivo ? `(#${resVin.consecutivo})` : ''}
                      </span>
                    ) : (
                      <span className="status-badge s-avail" style={{ gap: '0.35rem', fontSize: '0.74rem' }}>
                        <CheckCircle size={12} /> Fecha disponible
                      </span>
                    )}

                    {resVin && tel && (
                      <a
                        href={generarUrlWhatsApp(tel, '')}
                        onClick={(e) => {
                          e.preventDefault();
                          abrirWhatsApp(tel, '');
                        }}
                        className="btn btn-sm"
                        style={{ color: '#25d366', fontSize: '0.72rem', padding: '0.2rem 0.5rem', gap: '0.3rem', cursor: 'pointer' }}
                        title="Abrir chat en WhatsApp (Desktop PC / Web)"
                      >
                        <MessageCircle size={12} /> Contactar WhatsApp
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {bloqVin && (
                      <button
                        className="btn btn-sm btn-danger"
                        style={{ fontSize: '0.74rem', padding: '0.25rem 0.65rem' }}
                        disabled={procesando}
                        onClick={() => handleLiberarBloqueoRapido(bloqVin)}
                      >
                        <CheckCircle size={13} /> Liberar este día ahora
                      </button>
                    )}
                    {resVin && (
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ fontSize: '0.74rem', padding: '0.25rem 0.65rem' }}
                        onClick={() => {
                          setFiltroFincaReservas('esta_finca');
                          setReservaExpandida(resVin.id);
                        }}
                      >
                        <FileText size={13} /> Ver reserva en lista
                      </button>
                    )}
                    <button
                      className="btn btn-sm"
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                      onClick={() => setFechaInspeccionada(null)}
                      title="Cerrar inspector"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ─── HERRAMIENTA RÁPIDA DE BLOQUEO / DESBLOQUEO ─────────────────────── */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1.15rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
              {fechasSeleccionadas.size > 0
                ? `⚡ ${fechasSeleccionadas.size} día(s) seleccionado(s) en ${fincaActual?.nombre || 'la finca'}`
                : 'Selecciona días en el calendario para bloquearlos o liberarlos en lote:'}
            </span>

            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleSeleccionarFinesDeSemana}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                title="Seleccionar todos los Viernes, Sábados y Domingos de este mes"
              >
                <CheckSquare size={12} /> Fines de semana
              </button>
              {fechasSeleccionadas.size > 0 && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    setFechasSeleccionadas(new Set());
                    setFechaInspeccionada(null);
                  }}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                >
                  Limpiar selección
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                <User size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Nombre del huésped / Razón de bloqueo (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Mantenimiento piscina, Uso familiar, Reserva externa..."
                value={nombreCliente}
                onChange={e => setNombreCliente(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-danger btn-sm"
                style={{ flex: 1, minWidth: '150px' }}
                disabled={procesando || !fechasSeleccionadas.size}
                onClick={() => handleMarcar('ocupado')}
              >
                <XCircle size={15} /> Marcar como ocupado
              </button>
              <button
                className="btn btn-sm"
                style={{
                  flex: 1,
                  minWidth: '150px',
                  background: 'var(--success-bg)',
                  borderColor: 'var(--success)',
                  color: 'var(--success)'
                }}
                disabled={procesando || !fechasSeleccionadas.size}
                onClick={() => handleMarcar('libre')}
              >
                <CheckCircle size={15} /> Marcar como libre
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── LISTADO INFERIOR DE RESERVAS QUE YA ESTÁN ACTIVAS ─────────────────── */}
      <div className="panel" style={{ marginTop: '0.5rem' }}>
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCheck size={18} style={{ color: 'var(--success)' }} /> Reservas Activas
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
              Listado detallado de reservas confirmadas con cliente, consecutivo, plan de alimentación y saldo.
            </div>
          </div>

          {/* Selector de filtro: solo de esta finca o todas */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button
              className={`btn btn-sm ${filtroFincaReservas === 'esta_finca' ? 'btn-primary' : ''}`}
              onClick={() => setFiltroFincaReservas('esta_finca')}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
            >
              Finca actual ({fincaActual?.nombre || 'Seleccionada'})
            </button>
            <button
              className={`btn btn-sm ${filtroFincaReservas === 'todas' ? 'btn-primary' : ''}`}
              onClick={() => setFiltroFincaReservas('todas')}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
            >
              Todas las fincas ({reservas.filter(r => r.estado === 'activa').length})
            </button>
          </div>
        </div>

        {/* Tabla o tarjetas de reservas activas */}
        <div className="avail-table">
          {reservasActivas.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Calendar size={32} style={{ margin: '0 auto 0.65rem', opacity: 0.4 }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                No hay reservas activas registradas {filtroFincaReservas === 'esta_finca' ? `para ${fincaActual?.nombre || 'esta finca'}` : ''}.
              </p>
              <p className="text-xs text-muted">
                Las fechas permanecen disponibles para nuevas cotizaciones y reservas.
              </p>
            </div>
          ) : (
            reservasActivas.map(r => {
              const saldo = calcularSaldo(r);
              const totalPagado = r.valor_total - saldo;
              const clienteNombre = r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.trim() : '—';
              const clienteTel = r.clientes?.whatsapp || r.clientes?.telefono;
              const fincaNombre = r.fincas?.nombre || fincaActual?.nombre || '—';
              const expanded = reservaExpandida === r.id;

              const hoy = new Date().toISOString().split('T')[0];
              const estanciaVencida = r.estado === 'activa' && r.fecha_fin < hoy;
              const pazYSalvoHabilitado = saldo <= 0 && (r.pagos?.length || 0) > 0;

              // Identificar plan de alimentación adjunto
              const tienePlanAlimentacion = Boolean(r.menu_id || r.alimentacion || (r.costo_alimentacion && r.costo_alimentacion > 0));
              const nombrePlan = r.menus?.nombre || r.alimentacion || 'Plan con menú especial';

              return (
                <div key={r.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.65rem', paddingTop: '0.65rem' }}>
                  {/* Alerta de estancia finalizada si aplica */}
                  {estanciaVencida && (
                    <div
                      style={{
                        background: 'rgba(245, 158, 11, 0.12)',
                        borderLeft: '4px solid #f59e0b',
                        padding: '0.35rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.76rem',
                        color: '#b45309',
                        fontWeight: 600,
                        gap: '0.5rem',
                        marginBottom: '0.5rem',
                        borderRadius: '4px',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <AlertTriangle size={13} /> Estancia finalizada ({formatFecha(r.fecha_fin)}) · Lista para cerrar
                      </span>
                      {onCerrarReserva && (
                        <button
                          className="btn btn-sm btn-primary"
                          style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }}
                          onClick={() => setReservaParaCierre(r)}
                        >
                          <CheckCircle size={11} /> Cerrar Reserva
                        </button>
                      )}
                    </div>
                  )}

                  {/* Fila principal de datos */}
                  <div className="avail-row" style={{ borderBottom: 'none', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      {/* Título: Finca, Consecutivo y Estado */}
                      <div style={{ fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.95rem' }}>{fincaNombre}</span>
                        <span className="status-badge s-avail" style={{ fontSize: '0.68rem' }}>activa</span>
                        {r.consecutivo && <ConsecutivoBadge consecutivo={r.consecutivo} />}
                      </div>

                      {/* Huésped y Contacto */}
                      <div className="text-xs text-muted" style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <span>👤 <strong>{clienteNombre}</strong></span>
                        {clienteTel && (
                          <a
                            href={generarUrlWhatsApp(clienteTel, '')}
                            onClick={(e) => {
                              e.preventDefault();
                              abrirWhatsApp(clienteTel, '');
                            }}
                            style={{
                              color: '#25d366',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontWeight: 600,
                              background: 'rgba(37, 211, 102, 0.1)',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                            title="Abrir chat en WhatsApp (Desktop PC / Web)"
                          >
                            <MessageCircle size={11} /> {clienteTel}
                          </a>
                        )}
                        <span>·</span>
                        <span>
                          <Calendar size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> {formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}
                        </span>
                        <span>·</span>
                        <span>{r.personas} personas</span>
                      </div>

                      {/* Badge de Plan de Alimentación Adjunto */}
                      <div style={{ marginTop: '0.4rem' }}>
                        {tienePlanAlimentacion ? (
                          <span className="food-plan-badge-pill" title="Plan de alimentación contratado">
                            <UtensilsCrossed size={12} />
                            <strong>Plan Alimentación:</strong> {nombrePlan}
                            {r.costo_alimentacion ? ` (${formatCOP(r.costo_alimentacion)})` : ''}
                          </span>
                        ) : (
                          <span className="food-plan-badge-pill none">
                            🍃 Sin plan de alimentación adjunto
                          </span>
                        )}
                      </div>

                      {/* Resumen Financiero: Total, Pagado, Saldo */}
                      <div style={{ marginTop: '0.45rem', display: 'flex', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
                        <span>Total: <strong>{formatCOP(r.valor_total)}</strong></span>
                        <span>Abonado: <strong style={{ color: 'var(--success)' }}>{formatCOP(totalPagado)}</strong></span>
                        <span>
                          Saldo: <strong style={{ color: saldo > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCOP(saldo)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Botones de acción unificados (misma lógica que ya funciona) */}
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* 1. Registrar Abono */}
                      <button
                        className="btn btn-sm btn-primary"
                        title="Registrar un abono de pago"
                        style={{ fontSize: '0.74rem', fontWeight: 600, gap: '0.35rem', padding: '0.3rem 0.65rem' }}
                        onClick={() => {
                          setPagoReservaId(r.id);
                          setPagoForm(PAGO_VACIO);
                        }}
                      >
                        <CreditCard size={13} /> Registrar Abono
                      </button>

                      {/* 2. Documentos Oficiales en PDF */}
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
                            } else if (val === 'cierre' && onCerrarReserva) {
                              setReservaParaCierre(r);
                            }
                          }}
                          className="btn btn-sm"
                          style={{ appearance: 'none', paddingRight: '1.4rem', cursor: 'pointer', fontSize: '0.72rem' }}
                        >
                          <option value="" disabled>📑 Documentos ▾</option>
                          <option value="separacion">📄 Separación</option>
                          <option value="estado_cuenta">📊 Estado de Cuenta</option>
                          <option value="paz_salvo" disabled={!pazYSalvoHabilitado}>
                            🏆 Paz y Salvo {pazYSalvoHabilitado ? '✓' : `(Saldo: ${formatCOP(saldo)})`}
                          </option>
                          {onCerrarReserva && <option value="cierre">🔒 Cerrar Reserva</option>}
                        </select>
                        <ChevronDown size={11} style={{ position: 'absolute', right: '0.35rem', pointerEvents: 'none', opacity: 0.6 }} />
                      </div>

                      {/* 3. WhatsApp Rápido */}
                      <button
                        className="btn btn-sm"
                        title="Enviar mensaje por WhatsApp"
                        style={{ color: '#25d366' }}
                        onClick={() => {
                          const tel = r.clientes?.whatsapp || r.clientes?.telefono;
                          if (!tel) {
                            showToast('El cliente no tiene teléfono registrado', 'info');
                            return;
                          }
                          setModalWaReserva({
                            abierto: true,
                            reserva: r,
                            titulo: `Notificación WhatsApp · ${clienteNombre}`,
                            mensaje: saldo > 0 ? plantillaRecordatorioPago(r) : plantillaBienvenida(r),
                            tipo: 'general',
                          });
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

                      {/* 5. Desplegar historial de pagos */}
                      <button
                        className="btn btn-sm"
                        onClick={() => setReservaExpandida(expanded ? null : r.id)}
                        title={expanded ? 'Cerrar detalle' : 'Ver historial de pagos'}
                      >
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Panel expandido: historial de pagos */}
                  {expanded && (
                    <div style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)', marginTop: '0.5rem', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FileCheck size={14} /> Historial de pagos y abonos
                      </div>

                      {(!r.pagos || r.pagos.length === 0) ? (
                        <p className="text-muted" style={{ fontSize: '0.78rem' }}>Sin pagos o abonos registrados aún.</p>
                      ) : (
                        <div style={{ display: 'grid', gap: '0.35rem' }}>
                          {r.pagos.map((p: Pago) => (
                            <div key={p.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span className="status-badge" style={{ fontSize: '0.67rem', minWidth: '75px', justifyContent: 'center' }}>
                                {p.tipo}
                              </span>
                              <span className="text-muted">{formatFecha(p.fecha)}</span>
                              <span style={{ fontWeight: 600, color: p.tipo === 'devolucion' ? 'var(--danger)' : 'var(--success)' }}>
                                {p.tipo === 'devolucion' ? '−' : '+'}{formatCOP(p.valor)}
                              </span>
                              {p.observacion && <span className="text-muted" style={{ fontStyle: 'italic' }}>({p.observacion})</span>}
                              {onEliminarPago && (
                                <button
                                  className="btn btn-sm btn-danger"
                                  style={{ padding: '0.1rem 0.3rem', marginLeft: 'auto' }}
                                  onClick={() => handleEliminarPagoClick(p)}
                                  title="Eliminar este pago"
                                >
                                  <X size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-muted">Saldo restante por amortizar:</span>
                        <strong style={{ color: saldo > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCOP(saldo)}</strong>
                      </div>

                      {/* Generador de Documentos Oficiales en PDF */}
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
      </div>

      {/* ─── MODAL PARA REGISTRAR PAGO / ABONO ───────────────────────────────── */}
      {pagoReservaId && (
        <div className="modal-overlay" onClick={() => setPagoReservaId(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div className="panel-title"><CreditCard size={16} /> Registrar abono / pago</div>
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
                <label>Observación (Referencia, banco, etc.)</label>
                <input
                  value={pagoForm.observacion}
                  onChange={e => setPagoForm(p => ({ ...p, observacion: e.target.value }))}
                  placeholder="Ej: Transferencia Bancolombia #12345"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn" onClick={() => setPagoReservaId(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardandoPago}>
                  <Save size={14} /> {guardandoPago ? 'Registrando…' : 'Registrar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODALES DE EXPEDIENTE, CIERRE Y WHATSAPP ──────────────────────── */}
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
          onDespuesDeEnviar={(tel: string, msg: string) => {
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
          }}
          showToast={showToast}
        />
      )}

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
    </div>
  );
};
