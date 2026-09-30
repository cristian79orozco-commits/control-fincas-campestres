import React, { useRef } from 'react';
import { Home, Map, Moon, Sun, ShieldCheck } from 'lucide-react';
import type { ViewType } from '../types';

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
    <header className="topbar">
      <div className="brand" onClick={handleBrandClick} style={{ cursor: 'pointer' }} title="Fincas Campestres">
        <div className="brand-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 20h18" /><path d="M5 20V10l7-5 7 5v10" /><path d="M9 20v-5h6v5" />
          </svg>
        </div>
        <div>
          <div className="brand-name">Fincas Campestres</div>
          <div className="brand-sub">Valle del Cauca · Santa Elena</div>
        </div>
      </div>

      <div className="topbar-right">
        <nav className="segmented">
          <button
            className={`seg-btn ${currentView === 'cliente' ? 'active' : ''}`}
            onClick={() => onViewChange('cliente')}
          >
            <Home size={15} /> Catálogo
          </button>
          {hasSelectedFinca && (
            <button
              className={`seg-btn ${currentView === 'detalle' ? 'active' : ''}`}
              onClick={() => onViewChange('detalle')}
            >
              <Map size={15} /> Detalle
            </button>
          )}
          {isAdminLoggedIn && (
            <button
              className={`seg-btn ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => onViewChange('admin')}
            >
              <ShieldCheck size={15} /> Admin
            </button>
          )}
        </nav>

        {isAdminLoggedIn && currentView !== 'admin' && (
          <button
            className="icon-btn"
            onClick={() => onViewChange('admin')}
            title="Ir al panel de administración"
          >
            <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
          </button>
        )}

        <button
          className="icon-btn"
          onClick={onThemeToggle}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};
