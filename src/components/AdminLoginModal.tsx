import React, { useState } from 'react';
import { X, Lock, LogIn } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  showToast,
}) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pass) {
      showToast('Ingresa correo y contraseña', 'error');
      return;
    }

    setLoading(true);
    const res = await onLogin(email, pass);
    setLoading(false);

    if (res.success) {
      showToast('Acceso administrativo concedido ✅', 'success');
      onClose();
    } else {
      showToast(res.message || 'Credenciales incorrectas', 'error');
    }
  };

  return (
    <div className="admin-modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal-box" role="dialog" aria-modal="true">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '13px',
                background: 'linear-gradient(145deg, #FFFDF9 0%, #FAF6EC 100%)',
                border: '1.5px solid color-mix(in srgb, var(--accent) 45%, var(--border))',
                overflow: 'hidden',
                padding: '2.5px',
                boxShadow: '0 3px 12px rgba(212, 146, 74, 0.16)',
                flexShrink: 0,
              }}
            >
              <img
                src="./logo.png?v=2"
                alt="Paraíso Terrenal"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-dashboard)', fontSize: '1.18rem', fontWeight: 700, letterSpacing: '-0.015em' }}>
                Acceso Administrador
              </div>
              <p className="text-muted text-xs" style={{ margin: 0, marginTop: '2px' }}>Paraíso Terrenal · Supabase Auth</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.85rem' }}>
          <div className="field">
            <label>Correo electrónico</label>
            <input
              type="email"
              placeholder="admin@fincas.com"
              value={email}
              autoComplete="username"
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={pass}
              autoComplete="current-password"
              onChange={e => setPass(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.4rem' }}
          >
            <LogIn size={15} /> {loading ? 'Validando…' : 'Ingresar'}
          </button>
        </form>

        <p style={{ marginTop: '0.85rem', textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
          <Lock size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Conectado a Supabase
        </p>
      </div>
    </div>
  );
};
