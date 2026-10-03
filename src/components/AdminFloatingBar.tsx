import React, { useState } from 'react';
import {
  ShieldCheck, LayoutDashboard, Edit3, ArrowRight, ChevronDown, ChevronUp,
  FileText, Calendar
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AdminFloatingBarProps {
  isAdminLoggedIn: boolean;
  onVolverAdmin?: () => void;
  onEditarFinca?: (fincaId: string) => void;
}

export const AdminFloatingBar: React.FC<AdminFloatingBarProps> = ({
  isAdminLoggedIn,
  onVolverAdmin,
  onEditarFinca,
}) => {
  const {
    view,
    selectedFincaId,
    fincas,
    cotizaciones,
    metricasReservas,
    navegarAAdmin,
  } = useApp();

  const [minimizada, setMinimizada] = useState(false);

  // Solo mostrar si el administrador está logueado y está viendo el portal público
  if (!isAdminLoggedIn || view === 'admin') {
    return null;
  }

  const cotizacionesPendientes = cotizaciones.filter(c =>
    ['borrador', 'cotizada', 'pendiente'].includes(c.estado)
  ).length;

  const fincaActual = fincas.find(f => f.id === selectedFincaId);

  const handleVolver = () => {
    if (onVolverAdmin) {
      onVolverAdmin();
    } else {
      navegarAAdmin();
    }
  };

  const handleEditarFinca = () => {
    if (!selectedFincaId) return;
    if (onEditarFinca) {
      onEditarFinca(selectedFincaId);
    } else {
      navegarAAdmin('fincas', selectedFincaId);
    }
  };

  const handleIrACotizaciones = () => {
    navegarAAdmin('cotizaciones');
  };

  const handleIrAReservas = () => {
    navegarAAdmin('reservas');
  };

  // Versión minimizada (Pastilla discreta)
  if (minimizada) {
    return (
      <aside
        aria-label="Panel de control flotante del administrador"
        style={{
          position: 'fixed',
          bottom: '1.25rem',
          right: '1.25rem',
          zIndex: 9999,
          background: 'rgba(26, 107, 94, 0.95)',
          color: '#ffffff',
          padding: '0.5rem 0.85rem',
          borderRadius: '999px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          animation: 'fadeInUp 0.25s ease-out',
        }}
        onClick={() => setMinimizada(false)}
        title="Clic para expandir barra de control de Administrador"
      >
        <ShieldCheck size={16} />
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Modo Admin</span>
        {cotizacionesPendientes > 0 && (
          <span style={{
            background: '#ef4444',
            color: '#fff',
            borderRadius: '999px',
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '0.1rem 0.45rem',
          }}>
            {cotizacionesPendientes}
          </span>
        )}
        <ChevronUp size={14} style={{ opacity: 0.8 }} />
      </aside>
    );
  }

  // Versión completa (Dock flotante moderno)
  return (
    <aside
      aria-label="Barra de herramientas flotante del administrador"
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'rgba(20, 24, 28, 0.92)',
        color: '#f3f4f6',
        padding: '0.65rem 1.1rem',
        borderRadius: '16px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.9rem',
        maxWidth: '92vw',
        flexWrap: 'wrap',
        animation: 'fadeInUp 0.3s ease-out',
      }}
    >
      {/* Indicador de modo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: 'var(--primary, #1a6b5e)',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}>
          <ShieldCheck size={16} style={{ color: '#ffffff' }} />
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.1, color: '#ffffff' }}>
            Panel Admin Activo
          </div>
          <div style={{ fontSize: '0.68rem', color: '#9ca3af', lineHeight: 1 }}>
            Previsualizando portal de clientes
          </div>
        </div>
      </div>

      <div style={{ height: '24px', width: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

      {/* Badges y accesos rápidos a módulos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {/* Cotizaciones pendientes */}
        <button
          type="button"
          onClick={handleIrACotizaciones}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: cotizacionesPendientes > 0 ? 'rgba(234, 179, 8, 0.18)' : 'rgba(255, 255, 255, 0.08)',
            border: `1px solid ${cotizacionesPendientes > 0 ? 'rgba(234, 179, 8, 0.45)' : 'rgba(255, 255, 255, 0.12)'}`,
            color: cotizacionesPendientes > 0 ? '#fde047' : '#d1d5db',
            borderRadius: '8px',
            padding: '0.3rem 0.6rem',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.15s ease',
          }}
          title="Ver cotizaciones pendientes en el panel admin"
        >
          <FileText size={12} />
          <span>{cotizacionesPendientes} cotiz. pendientes</span>
        </button>

        {/* Reservas activas */}
        <button
          type="button"
          onClick={handleIrAReservas}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#d1d5db',
            borderRadius: '8px',
            padding: '0.3rem 0.6rem',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.15s ease',
          }}
          title="Ver reservas activas en el panel admin"
        >
          <Calendar size={12} />
          <span>{metricasReservas.activas} reservas activas</span>
        </button>

        {/* Si está viendo el detalle de una finca: Botón para editarla directo */}
        {view === 'detalle' && fincaActual && (
          <button
            type="button"
            onClick={handleEditarFinca}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.45)',
              color: '#93c5fd',
              borderRadius: '8px',
              padding: '0.3rem 0.65rem',
              fontSize: '0.72rem',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
            title={`Editar ${fincaActual.nombre} en el panel de administración`}
          >
            <Edit3 size={12} />
            <span>Editar finca</span>
          </button>
        )}
      </div>

      <div style={{ height: '24px', width: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

      {/* Botón principal: Volver al Panel Admin */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <button
          type="button"
          onClick={handleVolver}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'var(--primary, #1a6b5e)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.42rem 0.9rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(26, 107, 94, 0.35)',
            transition: 'background 0.15s ease, transform 0.1s ease',
          }}
        >
          <LayoutDashboard size={14} />
          <span>Volver al Panel</span>
          <ArrowRight size={13} />
        </button>

        {/* Botón minimizar */}
        <button
          type="button"
          onClick={() => setMinimizada(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            padding: '0.3rem',
            display: 'grid',
            placeItems: 'center',
            borderRadius: '6px',
          }}
          title="Minimizar barra flotante"
        >
          <ChevronDown size={15} />
        </button>
      </div>
    </aside>
  );
};
