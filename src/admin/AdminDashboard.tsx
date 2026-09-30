import React, { useState } from 'react';
import { LayoutDashboard, LogOut, Lock, LogIn, ShieldCheck, Database } from 'lucide-react';
import { AdminFincaForm } from './AdminFincaForm';
import { AdminCalendar } from './AdminCalendar';
import { AdminReservasTable } from './AdminReservasTable';
import { AdminWaConfig } from './AdminWaConfig';
import type { Finca, BloqueoDisponibilidad } from '../types';

interface AdminDashboardProps {
  isAdminLoggedIn: boolean;
  userEmail?: string | null;
  fincas: Finca[];
  bloquesAdmin: BloqueoDisponibilidad[];
  currentWaNumber: string;
  onLogin: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  onLogout: () => void;
  onSaveFinca: (fincaData: Partial<Finca>, imagenesUrls: string[], planesStr: string) => Promise<{ success: boolean; id?: string; error?: string }>;
  onDeleteFinca: (id: string) => Promise<{ success: boolean; error?: string }>;
  onMarcarDiasAdmin: (fincaId: string, fechas: string[], estado: 'ocupado' | 'libre', nombreCliente?: string) => Promise<{ success: boolean; error?: string }>;
  onEliminarBloqueo: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  onSaveWaNumber: (num: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isAdminLoggedIn,
  userEmail,
  fincas,
  bloquesAdmin,
  currentWaNumber,
  onLogin,
  onLogout,
  onSaveFinca,
  onDeleteFinca,
  onMarcarDiasAdmin,
  onEliminarBloqueo,
  onSaveWaNumber,
  showToast,
  openConfirm,
}) => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPass) {
      showToast('Por favor ingresa correo y contraseña', 'error');
      return;
    }

    setLoginLoading(true);
    const res = await onLogin(loginEmail, loginPass);
    setLoginLoading(false);

    if (res.success) {
      showToast('Sesión iniciada correctamente · Bienvenido', 'success');
      setLoginPass('');
    } else {
      showToast(res.message || 'Error de autenticación', 'error');
    }
  };

  // Si no está autenticado, renderizar formulario de inicio de sesión
  if (!isAdminLoggedIn) {
    return (
      <div className="login-box">
        <div className="login-icon">
          <Lock size={26} />
        </div>
        <div>
          <div className="login-title">Panel de Administración</div>
          <div className="login-sub">Acceso seguro mediante Supabase Auth</div>
        </div>

        <form onSubmit={handleLoginSubmit} style={{ display: 'grid', gap: '0.85rem' }}>
          <div className="field">
            <label>Correo electrónico</label>
            <input
              type="email"
              placeholder="admin@fincas.com"
              value={loginEmail}
              autoComplete="username"
              onChange={e => setLoginEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={loginPass}
              autoComplete="current-password"
              onChange={e => setLoginPass(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loginLoading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
          >
            <LogIn size={16} /> {loginLoading ? 'Iniciando sesión…' : 'Ingresar al panel'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: '0.5rem' }}>
          Conectado a la base de datos de <strong>Supabase</strong>
        </p>
      </div>
    );
  }

  // Dashboard de administración activo
  const ocupadasCount = bloquesAdmin.filter(b => b.estado === 'ocupado').length;

  return (
    <div className="admin-shell">
      {/* Barra superior de administración */}
      <div className="panel">
        <div className="flex" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="flex gap-sm">
            <div className="login-icon" style={{ width: '38px', height: '38px', borderRadius: '12px', flexShrink: 0 }}>
              <LayoutDashboard size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Panel de Administración</div>
              <div className="text-xs text-muted">
                {userEmail || 'admin@fincas.com'} · Sesión activa
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <span className="status-badge s-avail">
              <Database size={12} style={{ display: 'inline' }} /> Supabase conectado
            </span>
            <button className="btn btn-sm btn-danger" onClick={onLogout}>
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="admin-stats-row">
        <div className="stat-card">
          <div className="stat-val">{fincas.length}</div>
          <div className="stat-lbl">Fincas activas</div>
        </div>
        <div className="stat-card">
          <div className="stat-val" style={{ color: 'var(--danger)' }}>{ocupadasCount}</div>
          <div className="stat-lbl">Fechas bloqueadas/ocupadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-val" style={{ color: 'var(--primary)' }}>+{currentWaNumber}</div>
          <div className="stat-lbl">WhatsApp global activo</div>
        </div>
      </div>

      {/* Contenido principal: Gestión de finca */}
      <AdminFincaForm
        fincas={fincas}
        onSave={onSaveFinca}
        onDelete={onDeleteFinca}
        showToast={showToast}
        openConfirm={openConfirm}
      />

      {/* Calendario de disponibilidad interactivo */}
      <AdminCalendar
        fincas={fincas}
        bloquesAdmin={bloquesAdmin}
        onMarcarDias={onMarcarDiasAdmin}
        showToast={showToast}
      />

      {/* Tabla de reservas registradas */}
      <AdminReservasTable
        bloques={bloquesAdmin}
        onEliminar={onEliminarBloqueo}
        showToast={showToast}
        openConfirm={openConfirm}
      />

      {/* Configuración de WhatsApp central */}
      <AdminWaConfig
        currentWaNumber={currentWaNumber}
        onSaveWaNumber={onSaveWaNumber}
        showToast={showToast}
      />
    </div>
  );
};
