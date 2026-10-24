import React from 'react';
import { Calendar, MessageCircle, Settings, Sparkles } from 'lucide-react';

export interface AdminSectionSkeletonProps {
  variant: 'calendar' | 'comunicaciones' | 'configuracion' | 'default';
  mensaje?: string;
}

export const AdminSectionSkeleton: React.FC<AdminSectionSkeletonProps> = ({
  variant,
  mensaje,
}) => {
  const getVariantMeta = () => {
    switch (variant) {
      case 'calendar':
        return {
          title: 'Calendario y Disponibilidad',
          icon: <Calendar size={20} className="text-brand-primary" style={{ color: 'var(--primary)' }} />,
          desc: 'Cargando matriz de disponibilidad y ocupación...',
        };
      case 'comunicaciones':
        return {
          title: 'Centro de Comunicaciones & WhatsApp',
          icon: <MessageCircle size={20} className="text-brand-primary" style={{ color: 'var(--primary)' }} />,
          desc: 'Cargando plantillas, remitentes e historial de envíos...',
        };
      case 'configuracion':
        return {
          title: 'Configuración General del Sistema',
          icon: <Settings size={20} className="text-brand-primary" style={{ color: 'var(--primary)' }} />,
          desc: 'Cargando parámetros de empresa, cuentas y plantillas...',
        };
      default:
        return {
          title: 'Cargando Módulo',
          icon: <Sparkles size={20} className="text-brand-primary" style={{ color: 'var(--primary)' }} />,
          desc: 'Sincronizando datos en tiempo real...',
        };
    }
  };

  const meta = getVariantMeta();

  return (
    <div
      role="status"
      aria-label={mensaje || meta.desc}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        width: '100%',
        minHeight: '400px',
        animation: 'adminSkeletonFadeIn 0.3s ease-out forwards',
      }}
    >
      <style>{`
        @keyframes adminSkeletonPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.25; }
        }
        @keyframes adminSkeletonFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .admin-skel-pulse {
          animation: adminSkeletonPulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          background: var(--surface-3, #e5e7eb);
          border-radius: var(--rad-xs, 8px);
        }
      `}</style>

      {/* Top Banner / Indicator */}
      <div
        className="panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--rad-sm, 14px)',
          boxShadow: 'var(--sh-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: 'var(--rad-xs, 10px)',
              background: 'var(--primary-bg, rgba(26, 107, 94, 0.12))',
            }}
          >
            {meta.icon}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text)' }}>
              {meta.title}
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              {mensaje || meta.desc}
            </div>
          </div>
        </div>

        {/* Micro Loader Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'var(--surface-2)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--primary)',
              display: 'inline-block',
              animation: 'adminSkeletonPulse 1.2s ease-in-out infinite',
            }}
          />
          Cargando módulo...
        </div>
      </div>

      {/* SKELETON: VARIANT CALENDAR */}
      {variant === 'calendar' && (
        <div
          className="panel"
          style={{
            padding: '1.25rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--rad-sm, 14px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Calendar Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div className="admin-skel-pulse" style={{ width: '180px', height: '38px' }} />
              <div className="admin-skel-pulse" style={{ width: '100px', height: '38px' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div className="admin-skel-pulse" style={{ width: '38px', height: '38px' }} />
              <div className="admin-skel-pulse" style={{ width: '140px', height: '28px' }} />
              <div className="admin-skel-pulse" style={{ width: '38px', height: '38px' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="admin-skel-pulse" style={{ width: '110px', height: '38px' }} />
              <div className="admin-skel-pulse" style={{ width: '130px', height: '38px' }} />
            </div>
          </div>

          {/* Availability Status Pills */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="admin-skel-pulse" style={{ width: '90px', height: '24px', borderRadius: '999px' }} />
            <div className="admin-skel-pulse" style={{ width: '110px', height: '24px', borderRadius: '999px' }} />
            <div className="admin-skel-pulse" style={{ width: '120px', height: '24px', borderRadius: '999px' }} />
          </div>

          {/* Calendar Month Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px',
            }}
          >
            {/* Day Header Placeholders */}
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div
                key={d}
                style={{
                  textAlign: 'center',
                  padding: '0.5rem 0',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                }}
              >
                {d}
              </div>
            ))}

            {/* 35 Day Cells */}
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                style={{
                  minHeight: '85px',
                  padding: '8px',
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--rad-xs, 8px)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div
                  className="admin-skel-pulse"
                  style={{ width: '22px', height: '18px', alignSelf: 'flex-end' }}
                />
                {i % 3 === 0 && (
                  <div
                    className="admin-skel-pulse"
                    style={{
                      width: '90%',
                      height: '16px',
                      borderRadius: '4px',
                      background: 'var(--primary-bg)',
                      opacity: 0.7,
                    }}
                  />
                )}
                {i % 5 === 0 && (
                  <div
                    className="admin-skel-pulse"
                    style={{
                      width: '75%',
                      height: '16px',
                      borderRadius: '4px',
                      background: 'var(--accent-bg)',
                      opacity: 0.7,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SKELETON: VARIANT COMUNICACIONES */}
      {variant === 'comunicaciones' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Top Tabs */}
          <div
            className="panel"
            style={{
              display: 'flex',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--rad-sm, 14px)',
            }}
          >
            <div className="admin-skel-pulse" style={{ width: '130px', height: '36px' }} />
            <div className="admin-skel-pulse" style={{ width: '140px', height: '36px' }} />
            <div className="admin-skel-pulse" style={{ width: '150px', height: '36px' }} />
            <div className="admin-skel-pulse" style={{ width: '120px', height: '36px' }} />
          </div>

          {/* Split layout: List + Preview */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1rem',
            }}
          >
            {/* Left Column: Messages List */}
            <div
              className="panel"
              style={{
                padding: '1.25rem',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--rad-sm, 14px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div className="admin-skel-pulse" style={{ width: '160px', height: '22px' }} />
              <div className="admin-skel-pulse" style={{ width: '100%', height: '38px' }} />
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--rad-xs, 8px)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="admin-skel-pulse" style={{ width: '110px', height: '16px' }} />
                    <div className="admin-skel-pulse" style={{ width: '50px', height: '16px' }} />
                  </div>
                  <div className="admin-skel-pulse" style={{ width: '85%', height: '14px' }} />
                </div>
              ))}
            </div>

            {/* Right Column: Template Composer / Chat Preview */}
            <div
              className="panel"
              style={{
                padding: '1.25rem',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--rad-sm, 14px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div className="admin-skel-pulse" style={{ width: '200px', height: '24px' }} />
              <div className="admin-skel-pulse" style={{ width: '100%', height: '42px' }} />
              <div className="admin-skel-pulse" style={{ width: '100%', height: '140px' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <div className="admin-skel-pulse" style={{ width: '120px', height: '40px' }} />
                <div className="admin-skel-pulse" style={{ width: '140px', height: '40px' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SKELETON: VARIANT CONFIGURACION */}
      {variant === 'configuracion' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Main Tabs */}
          <div
            className="panel"
            style={{
              display: 'flex',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--rad-sm, 14px)',
            }}
          >
            <div className="admin-skel-pulse" style={{ width: '150px', height: '38px' }} />
            <div className="admin-skel-pulse" style={{ width: '170px', height: '38px' }} />
            <div className="admin-skel-pulse" style={{ width: '150px', height: '38px' }} />
          </div>

          {/* Form Card */}
          <div
            className="panel"
            style={{
              padding: '1.5rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--rad-sm, 14px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div className="admin-skel-pulse" style={{ width: '220px', height: '24px' }} />
            <div className="admin-skel-pulse" style={{ width: '340px', height: '16px' }} />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.25rem',
                marginTop: '0.5rem',
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="admin-skel-pulse" style={{ width: '120px', height: '14px' }} />
                  <div className="admin-skel-pulse" style={{ width: '100%', height: '40px' }} />
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border)',
              }}
            >
              <div className="admin-skel-pulse" style={{ width: '130px', height: '42px' }} />
              <div className="admin-skel-pulse" style={{ width: '150px', height: '42px' }} />
            </div>
          </div>
        </div>
      )}

      {/* SKELETON: VARIANT DEFAULT */}
      {variant === 'default' && (
        <div
          className="panel"
          style={{
            padding: '2rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--rad-sm, 14px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          <div className="admin-skel-pulse" style={{ width: '240px', height: '28px' }} />
          <div className="admin-skel-pulse" style={{ width: '380px', height: '16px' }} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
            }}
          >
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="admin-skel-pulse"
                style={{ height: '90px', borderRadius: 'var(--rad-xs, 8px)' }}
              />
            ))}
          </div>
          <div className="admin-skel-pulse" style={{ width: '100%', height: '200px' }} />
        </div>
      )}
    </div>
  );
};
