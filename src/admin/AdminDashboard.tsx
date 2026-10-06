import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, LogOut, Lock, LogIn, ShieldCheck, Database,
  Home, Users, FileText, ClipboardList, Calendar, MessageCircle,
  Menu, X, TrendingUp, CheckCircle, AlertTriangle, Clock, UtensilsCrossed, Settings,
  Palette, History, Globe
} from 'lucide-react';
import { AdminFincaForm } from './AdminFincaForm';
import { AdminCalendar } from './AdminCalendar';
import { AdminWaConfig } from './AdminWaConfig';
import { AdminComunicaciones } from './AdminComunicaciones';
import { AdminClientes } from './AdminClientes';
import { AdminCotizaciones } from './AdminCotizaciones';
import { AdminReservas } from './AdminReservas';
import { AdminMenus } from './AdminMenus';
import { AdminHistorial } from './AdminHistorial';
import { AdminConfiguracion } from './AdminConfiguracion';
import { AdminPersonalizacion } from './AdminPersonalizacion';
import { useApp } from '../context/AppContext';
import type {
  Finca, BloqueoDisponibilidad, Cliente, CotizacionDB, CotizacionEstado,
  Reserva, ReservaEstado, PagoTipo, AdminSection, Menu as MenuType, Comunicacion,
  ConfiguracionGeneral, ContenidoSitio, CierreReserva
} from '../types';

interface AdminDashboardProps {
  isAdminLoggedIn: boolean;
  userEmail?: string | null;
  fincas: Finca[];
  bloquesAdmin: BloqueoDisponibilidad[];
  currentWaNumber: string;
  clientes: Cliente[];
  cotizaciones: CotizacionDB[];
  reservas: Reserva[];
  metricasReservas: { total: number; activas: number; llegasHoy: number; salenHoy: number };
  onLogin: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  onLogout: () => void;
  onSaveFinca: (
    fincaData: Partial<Finca>,
    imagenesUrls: string[],
    planesStr: string,
    amenidadesArr?: { nombre: string; icono?: string }[]
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  onDeleteFinca: (id: string) => Promise<{ success: boolean; error?: string }>;
  onMarcarDiasAdmin: (fincaId: string, fechas: string[], estado: 'ocupado' | 'libre', nombreCliente?: string) => Promise<{ success: boolean; error?: string }>;
  onEliminarBloqueo: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  onSaveWaNumber: (num: string) => void;
  // Clientes
  onGuardarCliente: (datos: Partial<Cliente>) => Promise<{ success: boolean; id?: string; error?: string }>;
  onDesactivarCliente: (id: string) => Promise<{ success: boolean; error?: string }>;
  onEliminarCliente?: (id: string) => Promise<{ success: boolean; error?: string }>;
  // Cotizaciones
  onGuardarCotizacion: (datos: Partial<CotizacionDB>) => Promise<{ success: boolean; id?: string; error?: string }>;
  onCambiarEstadoCotizacion: (id: string, estado: CotizacionEstado) => Promise<{ success: boolean; error?: string }>;
  onEliminarCotizacion: (id: string) => Promise<{ success: boolean; error?: string }>;
  // Reservas
  onGuardarReserva: (datos: Partial<Reserva>) => Promise<{ success: boolean; id?: string; error?: string }>;
  onCambiarEstadoReserva: (id: string, estado: ReservaEstado) => Promise<{ success: boolean; error?: string }>;
  onEliminarReserva: (id: string) => Promise<{ success: boolean; error?: string }>;
  onRegistrarPago: (reservaId: string, pago: { tipo: PagoTipo; fecha: string; valor: number; observacion?: string }) => Promise<{ success: boolean; error?: string }>;
  onEliminarPago: (pagoId: string) => Promise<{ success: boolean; error?: string }>;
  // Fase 6: Cierre y Reabrir Reservas
  onCerrarReserva?: (
    reservaId: string,
    datosCierre: Partial<CierreReserva>,
    pagoLiquidacion?: { valor: number; tipo: PagoTipo; observacion?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onReabrirReserva?: (reservaId: string) => Promise<{ success: boolean; error?: string }>;
  // Menús (Fase 2)
  menus: MenuType[];
  onGuardarMenu: (menuData: Partial<MenuType>, imagenesUrls?: string[]) => Promise<{ success: boolean; id?: string; error?: string }>;
  onCambiarEstadoMenu: (id: string, activo: boolean) => Promise<{ success: boolean; error?: string }>;
  onEliminarMenu: (id: string) => Promise<{ success: boolean; error?: string }>;
  // Comunicaciones (Fase 3)
  comunicaciones?: Comunicacion[];
  onRegistrarComunicacion?: (com: any) => Promise<any>;
  onLimpiarHistorialComunicaciones?: () => void;
  // Configuración General (Fase 4)
  configuracion?: ConfiguracionGeneral;
  guardandoConfig?: boolean;
  onGuardarConfiguracion?: (datos: Partial<ConfiguracionGeneral>) => Promise<{ success: boolean; error?: string }>;
  onRestablecerConfiguracion?: () => Promise<{ success: boolean; error?: string }>;
  // Personalización del Sitio (Fase 5)
  contenidoSitio?: ContenidoSitio;
  guardandoContenido?: boolean;
  onGuardarContenido?: (datos: Partial<ContenidoSitio>) => Promise<{ success: boolean; error?: string }>;
  onRestablecerContenido?: () => Promise<{ success: boolean; error?: string }>;
  onVerSitioPublico?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const NAV_ITEMS: { section: AdminSection; label: string; icon: React.ReactNode }[] = [
  { section: 'dashboard',    label: 'Dashboard',      icon: <LayoutDashboard size={16} /> },
  { section: 'fincas',       label: 'Fincas',         icon: <Home size={16} /> },
  { section: 'disponibilidad', label: 'Disponibilidad', icon: <Calendar size={16} /> },
  { section: 'clientes',     label: 'Clientes',       icon: <Users size={16} /> },
  { section: 'cotizaciones', label: 'Cotizaciones',   icon: <FileText size={16} /> },
  { section: 'reservas',     label: 'Reservas',       icon: <ClipboardList size={16} /> },
  { section: 'menus',        label: 'Menús',          icon: <UtensilsCrossed size={16} /> },
  { section: 'historial',    label: 'Historial',      icon: <History size={16} /> },
  { section: 'whatsapp',     label: 'Comunicaciones', icon: <MessageCircle size={16} /> },
  { section: 'configuracion', label: 'Configuración',  icon: <Settings size={16} /> },
  { section: 'personalizacion', label: 'Personalización del sitio', icon: <Palette size={16} /> },
];

function formatCOP(v: number) { return '$' + v.toLocaleString('es-CO'); }

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isAdminLoggedIn,
  userEmail,
  fincas,
  bloquesAdmin,
  currentWaNumber,
  clientes,
  cotizaciones,
  reservas,
  metricasReservas,
  menus,
  onLogin,
  onLogout,
  onSaveFinca,
  onDeleteFinca,
  onMarcarDiasAdmin,
  onEliminarBloqueo,
  onSaveWaNumber,
  onGuardarCliente,
  onDesactivarCliente,
  onEliminarCliente,
  onGuardarCotizacion,
  onCambiarEstadoCotizacion,
  onEliminarCotizacion,
  onGuardarReserva,
  onCambiarEstadoReserva,
  onEliminarReserva,
  onRegistrarPago,
  onEliminarPago,
  onCerrarReserva,
  onReabrirReserva,
  onGuardarMenu,
  onCambiarEstadoMenu,
  onEliminarMenu,
  comunicaciones = [],
  onRegistrarComunicacion,
  onLimpiarHistorialComunicaciones,
  configuracion,
  guardandoConfig = false,
  onGuardarConfiguracion,
  onRestablecerConfiguracion,
  contenidoSitio,
  guardandoContenido = false,
  onGuardarContenido,
  onRestablecerContenido,
  onVerSitioPublico,
  showToast,
  openConfirm,
}) => {
  const { adminActiveSection, setAdminActiveSection, navegarACliente } = useApp();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>(adminActiveSection || 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Para "convertir cotización en reserva"
  const [cotizacionParaReserva, setCotizacionParaReserva] = useState<CotizacionDB | null>(null);

  // Sincronizar sección si cambia externamente desde la barra flotante u otra vista
  useEffect(() => {
    if (adminActiveSection) {
      setActiveSection(adminActiveSection);
    }
  }, [adminActiveSection]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPass) { showToast('Ingresa correo y contraseña', 'error'); return; }
    setLoginLoading(true);
    const res = await onLogin(loginEmail, loginPass);
    setLoginLoading(false);
    if (res.success) {
      showToast('Sesión iniciada · Bienvenido', 'success');
      setLoginPass('');
    } else {
      showToast(res.message || 'Error de autenticación', 'error');
    }
  };

  // ---- Pantalla de login ----
  if (!isAdminLoggedIn) {
    return (
      <div className="login-box">
        <div className="login-icon"><Lock size={26} /></div>
        <div>
          <div className="login-title">Panel de Administración</div>
          <div className="login-sub">Acceso seguro mediante Supabase Auth</div>
        </div>
        <form onSubmit={handleLoginSubmit} style={{ display: 'grid', gap: '0.85rem' }}>
          <div className="field">
            <label>Correo electrónico</label>
            <input type="email" placeholder="admin@fincas.com" value={loginEmail} autoComplete="username" onChange={e => setLoginEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input type="password" placeholder="••••••••" value={loginPass} autoComplete="current-password" onChange={e => setLoginPass(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loginLoading} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
            <LogIn size={16} /> {loginLoading ? 'Iniciando sesión…' : 'Ingresar al panel'}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: '0.5rem' }}>
          Conectado a <strong>Supabase</strong>
        </p>
      </div>
    );
  }

  // ---- Dashboard de métricas ----
  const hoy = new Date().toISOString().split('T')[0];
  const cotizacionesPendientes = cotizaciones.filter(c => ['borrador', 'cotizada', 'pendiente'].includes(c.estado)).length;
  const reservasActivas = reservas.filter(r => r.estado === 'activa');
  const totalSaldoPendiente = reservasActivas.reduce((acc, r) => {
    const pagado = (r.pagos || []).reduce((s, p) => s + (p.tipo === 'devolucion' ? -p.valor : p.valor), 0);
    return acc + Math.max(0, r.valor_total - pagado);
  }, 0);

  const navigateTo = (section: AdminSection) => {
    setActiveSection(section);
    setAdminActiveSection(section);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConvertirReserva = (cotizacion: CotizacionDB) => {
    setCotizacionParaReserva(cotizacion);
    navigateTo('reservas');
  };

  return (
    <div className="admin-shell">
      {/* ===== TOPBAR ===== */}
      <div className="panel" style={{ marginBottom: '1rem' }}>
        <div className="flex" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
            {/* Hamburguesa móvil */}
            <button
              className="btn btn-sm"
              style={{ display: 'none' }}
              id="admin-sidebar-toggle"
              onClick={() => setSidebarOpen(o => !o)}
            >
              <Menu size={16} />
            </button>
            <div className="login-icon" style={{ width: '38px', height: '38px', borderRadius: '12px', flexShrink: 0 }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Panel de Administración</div>
              <div className="text-xs text-muted">{userEmail || 'admin@fincas.com'} · Sesión activa</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'var(--primary-bg)',
                color: 'var(--primary)',
                borderColor: 'var(--primary)',
                fontWeight: 600,
              }}
              onClick={onVerSitioPublico || (() => navegarACliente())}
              title="Ver cómo lo ve el cliente en vivo"
            >
              <Globe size={14} /> Explorar como cliente
            </button>
            <span className="status-badge s-avail">
              <Database size={12} style={{ display: 'inline' }} /> Supabase conectado
            </span>
            <button className="btn btn-sm btn-danger" onClick={onLogout}>
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
      </div>

      {/* ===== LAYOUT: SIDEBAR + CONTENIDO ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1rem', alignItems: 'start' }}>

        {/* SIDEBAR */}
        <nav
          className={`panel admin-sidebar${sidebarOpen ? ' open' : ''}`}
          style={{ padding: '0.5rem 0', position: 'sticky', top: '80px' }}
        >
          {/* Botón cerrar en móvil */}
          {sidebarOpen && (
            <button
              className="btn btn-sm"
              style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}
              onClick={() => setSidebarOpen(false)}
            >
              <X size={14} />
            </button>
          )}

          {NAV_ITEMS.map(item => (
            <button
              key={item.section}
              onClick={() => navigateTo(item.section)}
              className={`admin-nav-btn${activeSection === item.section ? ' active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {/* Badges */}
              {item.section === 'cotizaciones' && cotizacionesPendientes > 0 && (
                <span className="admin-nav-badge">{cotizacionesPendientes}</span>
              )}
              {item.section === 'reservas' && metricasReservas.activas > 0 && (
                <span className="admin-nav-badge">{metricasReservas.activas}</span>
              )}
            </button>
          ))}
        </nav>

        {/* CONTENIDO PRINCIPAL */}
        <div style={{ minWidth: 0 }}>

          {/* ===== SECCIÓN: DASHBOARD ===== */}
          {activeSection === 'dashboard' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Tarjetas de métricas */}
              <div className="admin-stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigateTo('fincas')}>
                  <div className="stat-val">{fincas.length}</div>
                  <div className="stat-lbl">Fincas activas</div>
                </div>
                <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigateTo('reservas')}>
                  <div className="stat-val" style={{ color: 'var(--primary)' }}>{metricasReservas.activas}</div>
                  <div className="stat-lbl">Reservas activas</div>
                </div>
                <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigateTo('reservas')}>
                  <div className="stat-val" style={{ color: 'var(--success)' }}>{metricasReservas.llegasHoy}</div>
                  <div className="stat-lbl">Llegadas hoy</div>
                </div>
                <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigateTo('reservas')}>
                  <div className="stat-val" style={{ color: 'var(--danger)' }}>{metricasReservas.salenHoy}</div>
                  <div className="stat-lbl">Salidas hoy</div>
                </div>
                <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigateTo('cotizaciones')}>
                  <div className="stat-val" style={{ color: 'var(--warning, #f59e0b)' }}>{cotizacionesPendientes}</div>
                  <div className="stat-lbl">Cotizaciones pendientes</div>
                </div>
                <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigateTo('clientes')}>
                  <div className="stat-val">{clientes.length}</div>
                  <div className="stat-lbl">Clientes</div>
                </div>
                <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigateTo('menus')}>
                  <div className="stat-val" style={{ color: 'var(--primary)' }}>{menus.filter(m => m.activo).length}</div>
                  <div className="stat-lbl">Menús activos</div>
                </div>
                <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigateTo('historial')}>
                  <div className="stat-val" style={{ color: 'var(--primary)' }}>
                    {reservas.filter(r => r.estado === 'completada').length}
                  </div>
                  <div className="stat-lbl">Cerradas / Historial</div>
                </div>
                <div className="stat-card">
                  <div className="stat-val" style={{ color: 'var(--danger)', fontSize: '1.1rem' }}>{formatCOP(totalSaldoPendiente)}</div>
                  <div className="stat-lbl">Saldo por cobrar</div>
                </div>
              </div>

              {/* Accesos rápidos */}
              <div className="panel">
                <div className="panel-header" style={{ marginBottom: '1rem' }}>
                  <div className="panel-title"><TrendingUp size={16} /> Accesos rápidos</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem' }}>
                  {NAV_ITEMS.slice(1).map(item => (
                    <button
                      key={item.section}
                      className="btn"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start', padding: '0.65rem 1rem' }}
                      onClick={() => navigateTo(item.section)}
                    >
                      {item.icon} {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Próximas reservas */}
              {reservasActivas.length > 0 && (
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title"><Clock size={16} /> Próximas llegadas</div>
                  </div>
                  <div className="avail-table">
                    {reservasActivas
                      .filter(r => r.fecha_inicio >= hoy)
                      .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
                      .slice(0, 5)
                      .map(r => {
                        const clienteNombre = r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.trim() : '—';
                        const [y, m, d] = r.fecha_inicio.split('-');
                        return (
                          <div key={r.id} className="avail-row">
                            <div>
                              <div style={{ fontWeight: 600 }}>{r.fincas?.nombre || '—'}</div>
                              <div className="text-xs text-muted">{d}/{m}/{y} · {r.personas} personas · {clienteNombre}</div>
                            </div>
                            <span className="status-badge s-avail">activa</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Alertas */}
              {totalSaldoPendiente > 0 && (
                <div className="panel" style={{ borderLeft: '3px solid var(--danger)' }}>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', color: 'var(--danger)', fontWeight: 600 }}>
                    <AlertTriangle size={16} /> Saldo pendiente por cobrar: {formatCOP(totalSaldoPendiente)} COP
                  </div>
                  <p className="text-xs text-muted" style={{ marginTop: '0.3rem' }}>
                    Hay {reservasActivas.length} reserva{reservasActivas.length !== 1 ? 's' : ''} activa{reservasActivas.length !== 1 ? 's' : ''} con saldo pendiente.
                  </p>
                </div>
              )}

              {cotizacionesPendientes > 0 && (
                <div className="panel" style={{ borderLeft: '3px solid var(--primary)', cursor: 'pointer' }} onClick={() => navigateTo('cotizaciones')}>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', color: 'var(--primary)', fontWeight: 600 }}>
                    <CheckCircle size={16} /> {cotizacionesPendientes} cotización{cotizacionesPendientes !== 1 ? 'es' : ''} pendiente{cotizacionesPendientes !== 1 ? 's' : ''} de atención
                  </div>
                  <p className="text-xs text-muted" style={{ marginTop: '0.3rem' }}>Haz clic para verlas →</p>
                </div>
              )}
            </div>
          )}

          {/* ===== SECCIÓN: FINCAS ===== */}
          {activeSection === 'fincas' && (
            <AdminFincaForm
              fincas={fincas}
              onSave={onSaveFinca}
              onDelete={onDeleteFinca}
              showToast={showToast}
              openConfirm={openConfirm}
            />
          )}

          {/* ===== SECCIÓN: DISPONIBILIDAD ===== */}
          {activeSection === 'disponibilidad' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <AdminCalendar
                fincas={fincas}
                bloquesAdmin={bloquesAdmin}
                reservas={reservas}
                clientes={clientes}
                cotizaciones={cotizaciones}
                menus={menus}
                configuracion={configuracion}
                userEmail={userEmail}
                onMarcarDias={onMarcarDiasAdmin}
                onEliminarBloqueo={onEliminarBloqueo}
                onGuardarReserva={onGuardarReserva}
                onCambiarEstadoReserva={onCambiarEstadoReserva}
                onRegistrarPago={onRegistrarPago}
                onEliminarPago={onEliminarPago}
                onCerrarReserva={onCerrarReserva}
                onReabrirReserva={onReabrirReserva}
                onEliminarReserva={onEliminarReserva}
                onRegistrarComunicacion={onRegistrarComunicacion}
                showToast={showToast}
                openConfirm={openConfirm}
              />
            </div>
          )}

          {/* ===== SECCIÓN: CLIENTES ===== */}
          {activeSection === 'clientes' && (
            <AdminClientes
              clientes={clientes}
              reservas={reservas}
              cotizaciones={cotizaciones}
              fincas={fincas}
              onGuardar={onGuardarCliente}
              onDesactivar={onDesactivarCliente}
              onEliminar={onEliminarCliente}
              showToast={showToast}
              openConfirm={openConfirm}
            />
          )}

          {/* ===== SECCIÓN: COTIZACIONES ===== */}
          {activeSection === 'cotizaciones' && (
            <AdminCotizaciones
              cotizaciones={cotizaciones}
              clientes={clientes}
              fincas={fincas}
              menus={menus}
              onGuardar={onGuardarCotizacion}
              onCambiarEstado={onCambiarEstadoCotizacion}
              onEliminar={onEliminarCotizacion}
              onConvertirReserva={handleConvertirReserva}
              onRegistrarComunicacion={onRegistrarComunicacion}
              showToast={showToast}
              openConfirm={openConfirm}
            />
          )}

          {/* ===== SECCIÓN: RESERVAS ===== */}
          {activeSection === 'reservas' && (
            <AdminReservas
              reservas={reservas}
              clientes={clientes}
              fincas={fincas}
              cotizaciones={cotizaciones}
              configuracion={configuracion}
              userEmail={userEmail}
              onGuardar={onGuardarReserva}
              onCambiarEstado={onCambiarEstadoReserva}
              onCerrarReserva={onCerrarReserva}
              onReabrirReserva={onReabrirReserva}
              onEliminar={onEliminarReserva}
              onRegistrarPago={onRegistrarPago}
              onEliminarPago={onEliminarPago}
              onRegistrarComunicacion={onRegistrarComunicacion}
              showToast={showToast}
              openConfirm={openConfirm}
              cotizacionInicial={cotizacionParaReserva}
              onCotizacionInicialUsada={() => setCotizacionParaReserva(null)}
            />
          )}

          {/* ===== SECCIÓN: MENÚS (FASE 2) ===== */}
          {activeSection === 'menus' && (
            <AdminMenus
              menus={menus}
              clientes={clientes}
              fincas={fincas}
              configuracion={configuracion}
              onGuardarConfiguracion={onGuardarConfiguracion}
              onGuardar={onGuardarMenu}
              onCambiarEstado={onCambiarEstadoMenu}
              onEliminar={onEliminarMenu}
              showToast={showToast}
              openConfirm={openConfirm}
            />
          )}

          {/* ===== SECCIÓN: HISTORIAL Y CIERRES (FASE 6) ===== */}
          {activeSection === 'historial' && (
            <AdminHistorial
              reservas={reservas}
              fincas={fincas}
              clientes={clientes}
              configuracion={configuracion}
              userEmail={userEmail}
              onCerrarReserva={onCerrarReserva}
              onReabrirReserva={onReabrirReserva}
              onRegistrarComunicacion={onRegistrarComunicacion}
              showToast={showToast}
              openConfirm={openConfirm}
            />
          )}

          {/* ===== SECCIÓN: COMUNICACIONES Y WHATSAPP (FASE 3) ===== */}
          {activeSection === 'whatsapp' && (
            <AdminComunicaciones
              currentWaNumber={currentWaNumber}
              onSaveWaNumber={onSaveWaNumber}
              clientes={clientes}
              fincas={fincas}
              reservas={reservas}
              cotizaciones={cotizaciones}
              menus={menus}
              comunicaciones={comunicaciones}
              onRegistrarComunicacion={onRegistrarComunicacion || (async () => {})}
              onLimpiarHistorial={onLimpiarHistorialComunicaciones}
              configuracion={configuracion}
              onGuardarConfiguracion={onGuardarConfiguracion}
              showToast={showToast}
            />
          )}

          {/* ===== SECCIÓN: CONFIGURACIÓN GENERAL (FASE 4) ===== */}
          {activeSection === 'configuracion' && configuracion && (
            <AdminConfiguracion
              config={configuracion}
              guardando={guardandoConfig}
              onGuardar={onGuardarConfiguracion || (async () => ({ success: false, error: 'No configurado' }))}
              onRestablecer={onRestablecerConfiguracion || (async () => ({ success: false, error: 'No configurado' }))}
              onSaveWaNumber={onSaveWaNumber}
              showToast={showToast}
              openConfirm={openConfirm}
            />
          )}

          {/* Fallback si la configuración aún está cargando */}
          {activeSection === 'configuracion' && !configuracion && (
            <div className="panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <div className="text-muted">Cargando configuración general...</div>
            </div>
          )}

          {/* ===== SECCIÓN: PERSONALIZACIÓN DEL SITIO PÚBLICO (FASE 5) ===== */}
          {activeSection === 'personalizacion' && contenidoSitio && (
            <AdminPersonalizacion
              contenido={contenidoSitio}
              guardando={guardandoContenido}
              onGuardar={onGuardarContenido || (async () => ({ success: false, error: 'No configurado' }))}
              onRestablecer={onRestablecerContenido || (async () => ({ success: false, error: 'No configurado' }))}
              onVerSitioPublico={onVerSitioPublico || (() => {})}
              showToast={showToast}
              openConfirm={openConfirm}
            />
          )}

          {activeSection === 'personalizacion' && !contenidoSitio && (
            <div className="panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <div className="text-muted">Cargando datos de personalización...</div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay móvil sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }}
        />
      )}
    </div>
  );
};
