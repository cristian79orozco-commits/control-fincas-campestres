import React, { useRef } from 'react';
import { Home, Map, Moon, Sun, ShieldCheck, FileCheck2, TrendingUp } from 'lucide-react';
import type { ViewType } from '../types';
import { useClientStore } from '../store/useClientStore';

interface NavbarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  isAdminLoggedIn: boolean;
  onOpenAdminLoginModal: () => void;
  hasSelectedFinca: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  theme,
  onThemeToggle,
  isAdminLoggedIn,
  onOpenAdminLoginModal,
  hasSelectedFinca,
}) => {
  const { setModalConsultaOpen } = useClientStore();
  const brandClicks = useRef(0);
  const brandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBrandClick = () => {
    brandClicks.current += 1;
    if (brandTimer.current) clearTimeout(brandTimer.current);

    brandTimer.current = setTimeout(() => {
      brandClicks.current = 0;
    }, 1200);

    if (brandClicks.current >= 3) {
      brandClicks.current = 0;
      if (isAdminLoggedIn) {
        onViewChange('admin');
      } else {
        onOpenAdminLoginModal();
      }
    }
  };
  return (
    <header
      className="topbar"
      style={{
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div
        className="brand"
        onClick={handleBrandClick}
        style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
        title="Paraíso Terrenal — Fincas de Alquiler"
      >
        <div
          className="brand-mark"
          style={{
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(212, 146, 74, 0.2)',
          }}
        >
          <img
            src="/logo.png"
            alt="Paraíso Terrenal - Fincas de Alquiler"
            className="brand-logo-img"
            width={44}
            height={44}
            loading="eager"
            style={{ display: 'block' }}
          />
        </div>
        <div className="brand-text-block">
          <div className="brand-name" style={{ letterSpacing: '-0.02em', fontWeight: 800 }}>
            Paraíso Terrenal
          </div>
          <div className="brand-sub" style={{ color: 'var(--text-muted)' }}>
            Fincas de Alquiler · Santa Elena
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <nav
          className="segmented"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--rad-xs, 10px)',
            padding: '3px',
            boxShadow: 'var(--sh-sm)',
          }}
        >
          <button
            className={`seg-btn ${currentView === 'cliente' ? 'active' : ''}`}
            onClick={() => onViewChange('cliente')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '7px',
              fontSize: '0.78rem',
              fontWeight: 700,
              gap: '6px',
              transition: 'all 0.2s ease',
              ...(currentView === 'cliente'
                ? {
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    border: '1px solid var(--border)',
                  }
                : {}),
            }}
          >
            <Home size={15} style={{ color: currentView === 'cliente' ? 'var(--primary)' : 'var(--text-muted)' }} />
            <span>Catálogo</span>
          </button>

          <button
            className="seg-btn"
            onClick={() => {
              if (currentView !== 'cliente') onViewChange('cliente');
              setTimeout(() => {
                const el = document.getElementById('graficos');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 120);
            }}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '7px',
              fontSize: '0.78rem',
              fontWeight: 600,
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <TrendingUp size={15} style={{ color: 'var(--accent)' }} />
            <span>Gráficos</span>
          </button>

          <button
            className="seg-btn"
            onClick={() => setModalConsultaOpen(true)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '7px',
              fontSize: '0.78rem',
              fontWeight: 700,
              gap: '6px',
              color: 'var(--text)',
              transition: 'all 0.2s ease',
            }}
            title="Consultar cotización o reserva con consecutivo"
          >
            <FileCheck2 size={15} style={{ color: 'var(--primary)' }} />
            <span>Mis Reservas</span>
          </button>

          {hasSelectedFinca && (
            <button
              className={`seg-btn ${currentView === 'detalle' ? 'active' : ''}`}
              onClick={() => onViewChange('detalle')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                gap: '6px',
                transition: 'all 0.2s ease',
                ...(currentView === 'detalle'
                  ? {
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      border: '1px solid var(--border)',
                    }
                  : {}),
              }}
            >
              <Map size={15} style={{ color: 'var(--primary)' }} />
              <span>Detalle</span>
            </button>
          )}

          {isAdminLoggedIn && (
            <button
              className={`seg-btn ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => onViewChange('admin')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                gap: '6px',
                transition: 'all 0.2s ease',
                ...(currentView === 'admin'
                  ? {
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      border: '1px solid var(--border)',
                    }
                  : {}),
              }}
            >
              <ShieldCheck size={15} style={{ color: 'var(--accent)' }} />
              <span>Admin</span>
            </button>
          )}
        </nav>

        {isAdminLoggedIn && currentView !== 'admin' && (
          <button
            className="icon-btn"
            onClick={() => onViewChange('admin')}
            title="Ir al panel de administración"
            style={{
              borderRadius: 'var(--rad-xs, 8px)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              minWidth: '40px',
              minHeight: '40px',
            }}
          >
            <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
          </button>
        )}

        {/* Acceso rápido a consulta de reserva para huéspedes */}
        <button
          className="icon-btn"
          onClick={() => setModalConsultaOpen(true)}
          title="Consultar estado de mi reserva o cotización"
          style={{
            borderRadius: 'var(--rad-xs, 8px)',
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            minWidth: '40px',
            minHeight: '40px',
            color: 'var(--primary)',
            transition: 'all 0.2s ease',
          }}
        >
          <FileCheck2 size={18} />
        </button>

        {/* Alternador de Modo Claro / Oscuro con animación de rotación */}
        <button
          className="icon-btn"
          onClick={onThemeToggle}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          style={{
            borderRadius: 'var(--rad-xs, 8px)',
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            minWidth: '40px',
            minHeight: '40px',
            color: theme === 'dark' ? 'var(--accent)' : 'var(--text)',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease',
          }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};

