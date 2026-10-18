import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, LogOut, Lock, LogIn, ShieldCheck, Database,
  Home, Users, FileText, ClipboardList, Calendar, MessageCircle,
  Menu, X, TrendingUp, CheckCircle, AlertTriangle, Clock, UtensilsCrossed, Settings,
  Palette, History, Globe, Bell, BellRing, BellOff, Volume2, VolumeX, Laptop
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
import { AdminDashboardOverview } from './dashboard/AdminDashboardOverview';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useApp } from '../context/AppContext';
import {
  obtenerEstadoPermisoNotificaciones,
  solicitarPermisoNotificaciones,
  isSoundEnabled,
  setSoundEnabled,
  probarNotificacionAdmin,
} from '../services/notificaciones';
import type {
  Finca, BloqueoDisponibilidad, Cliente, CotizacionDB, CotizacionEstado,
  Reserva, ReservaEstado, PagoTipo, AdminSection, Menu as MenuType, Comunicacion,
  ConfiguracionGeneral, ContenidoSitio, CierreReserva
} from '../types';
import { desglosarFinanzasReserva } from '../types';

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
  const { adminActiveSection, setAdminActiveSection, navegarACliente, expedienteComunicaciones, setExpedienteComunicaciones } = useApp();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>(adminActiveSection || 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Para "convertir cotización en reserva"
  const [cotizacionParaReserva, setCotizacionParaReserva] = useState<CotizacionDB | null>(null);

  // Estado de Notificaciones y PWA para Administrador
  const [notifPermiso, setNotifPermiso] = useState<NotificationPermission | 'unsupported'>(() => obtenerEstadoPermisoNotificaciones());
  const [sonidoActivo, setSonidoActivo] = useState<boolean>(() => isSoundEnabled());
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleSolicitarPermiso = async () => {
    const res = await solicitarPermisoNotificaciones();
    setNotifPermiso(res);
    if (res === 'granted') {
      showToast('✓ Notificaciones de escritorio activadas en tu computador', 'success');
    } else if (res === 'denied') {
      showToast('Las notificaciones fueron bloqueadas en los ajustes del navegador.', 'error');
    }
  };

  const handleToggleSonido = () => {
    const nuevo = !sonidoActivo;
    setSonidoActivo(nuevo);
    setSoundEnabled(nuevo);
    showToast(nuevo ? '🔊 Sonido de alerta de cotizaciones activado' : '🔇 Sonido de alerta silenciado', 'info');
  };

  const handleProbarAlerta = () => {
    probarNotificacionAdmin(showToast, () => navigateTo('cotizaciones'));
  };

  const handleInstalarApp = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('✓ Aplicación instalada con éxito en tu computador', 'success');
      setDeferredInstallPrompt(null);
    }
  };

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

  let saldoPendienteFincasDueños = 0;
  let saldoPendienteAdminAlimentacion = 0;

  reservasActivas.forEach(r => {
    const fin = desglosarFinanzasReserva(r);
    saldoPendienteFincasDueños += fin.saldoFincaCheckIn;
    saldoPendienteAdminAlimentacion += fin.saldoAlimentacionAdmin;
  });

  const totalSaldoPendiente = saldoPendienteFincasDueños + saldoPendienteAdminAlimentacion;

  // Métricas del servicio de alimentación (suministrado directamente por el Administrador)
  const reservasConMenu = reservas.filter(
    r => (r.costo_alimentacion || 0) > 0 || (r.alimentacion && r.alimentacion !== 'Sin alimentación')
  );
  // 1. Alimentación cobrada y recaudada a la cuenta del admin (totales y abonos parciales)
  const ingresosAlimentacionLiquidados = reservas.reduce((acc, r) => {
    const fin = desglosarFinanzasReserva(r);
    return acc + fin.pagadoAlimentacion;
  }, 0);
  // 2. Alimentación pendiente de cobro en reservas activas
  const ingresosAlimentacionPorCobrar = saldoPendienteAdminAlimentacion;
  // 3. Proyección en cotizaciones aún no confirmadas
  const ingresosAlimentacionEnCotizaciones = cotizaciones
    .filter(c => ['borrador', 'cotizada', 'pendiente'].includes(c.estado))
    .reduce((acc, c) => acc + (c.costo_alimentacion || 0), 0);
  const totalPersonasAlimentadas = reservas
    .filter(r => ['activa', 'completada'].includes(r.estado) && (r.costo_alimentacion || 0) > 0)
    .reduce((acc, r) => acc + (r.personas || 1), 0);

  const navigateTo = (section: AdminSection) => {
    setActiveSection(section);
    setAdminActiveSection(section);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConvertirReserva = () => {
    // La cotización ya fue convertida e insertada como Reserva activa en AppContext.
    // Limpiamos cotizacionParaReserva para evitar abrir formularios duplicados y navegamos a la vista
    setCotizacionParaReserva(null);
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
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FAF7EE',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/logo.png"
                alt="Paraíso Terrenal"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Paraíso Terrenal · Administración</div>
              <div className="text-xs text-muted">{userEmail || 'admin@fincas.com'} · Sesión activa</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Botón de Instalación PWA (Solo si el navegador tiene disponible el prompt) */}
            {deferredInstallPrompt && (
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                  color: 'var(--primary)',
                  borderColor: 'var(--primary)',
                  fontWeight: 600,
                }}
                onClick={handleInstalarApp}
                title="Descargar e instalar el panel de control como aplicación en tu computador"
              >
                <Laptop size={14} /> Instalar en PC
              </button>
            )}

            {/* Widget de Notificaciones de Escritorio / Windows */}
            {notifPermiso === 'granted' ? (
              <span
                className="status-badge s-avail"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'default' }}
                title="Las notificaciones nativas de Windows/PC están activas y listas"
              >
                <Bell size={12} /> Alertas PC Activas
              </span>
            ) : notifPermiso === 'default' ? (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                onClick={handleSolicitarPermiso}
                title="Haz clic para recibir alertas en Windows cuando entre una nueva cotización"
              >
                <BellRing size={13} /> Activar Notif. en PC
              </button>
            ) : (
              <span
                className="status-badge s-busy"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                title="Permiso bloqueado en el navegador. Actívalo haciendo clic en el candado de la barra de direcciones."
              >
                <BellOff size={12} /> Notif. Bloqueadas
              </span>
            )}

            {/* Interruptor de sonido de alerta */}
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleToggleSonido}
              title={sonidoActivo ? 'Silenciar alertas sonoras de cotizaciones' : 'Activar sonido de campana de cotizaciones'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                color: sonidoActivo ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              {sonidoActivo ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span className="text-xs">{sonidoActivo ? 'Sonido ON' : 'Mudo'}</span>
            </button>

            {/* Botón de prueba rápida de alertas */}
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleProbarAlerta}
              title="Probar sonido y notificación de escritorio en tu computador"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Bell size={13} /> Probar
            </button>

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

          {/* ===== SECCIÓN: DASHBOARD REESTRUCTURADO UI/UX ===== */}
          {activeSection === 'dashboard' && (
            <ErrorBoundary fallbackTitle="Panel de Dashboard">
              <AdminDashboardOverview
                fincas={fincas || []}
                reservas={reservas || []}
                cotizaciones={cotizaciones || []}
                clientes={clientes || []}
                menus={menus || []}
                metricasReservas={metricasReservas || { total: 0, activas: 0, llegasHoy: 0, salenHoy: 0 }}
                navigateTo={navigateTo}
                userEmail={userEmail}
              />
            </ErrorBoundary>
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
              configuracion={configuracion}
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
              expedienteInicial={expedienteComunicaciones}
              onExpedienteInicialCargado={() => setExpedienteComunicaciones(null)}
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
