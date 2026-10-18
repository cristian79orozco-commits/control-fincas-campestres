import React from 'react';
import { motion } from 'framer-motion';
import { Search, MapPinned, UtensilsCrossed, TrendingUp, FileCheck2, Sparkles, CheckCircle2 } from 'lucide-react';
import type { ContenidoSitio } from '../types';

interface HeroProps {
  totalFincas: number;
  disponibles: number;
  ocupadas: number;
  porcentajeOcupacion: number;
  onExploreClick: () => void;
  onMenusClick?: () => void;
  onVisualClick?: () => void;
  onPortalClick?: () => void;
  contenido?: ContenidoSitio;
}

export const Hero: React.FC<HeroProps> = ({
  totalFincas,
  disponibles,
  ocupadas,
  porcentajeOcupacion,
  onExploreClick,
  onMenusClick,
  onVisualClick,
  onPortalClick,
  contenido,
}) => {
  if (contenido && contenido.hero_visible === false) {
    return null;
  }

  const eyebrow = contenido?.hero_eyebrow || 'Reserva directa sin comisiones';
  const titulo = contenido?.hero_titulo || 'Tu escapada campestre empieza aquí';
  const subtitulo = contenido?.hero_subtitulo || 'Elige la finca ideal en Santa Elena, consulta la disponibilidad en tiempo real en nuestro calendario y cotiza tu reserva instantáneamente por WhatsApp.';
  const ctaTexto = contenido?.hero_cta_texto || 'Explorar fincas disponibles';
  const ctaSecTexto = contenido?.hero_cta_secundario_texto;
  const mostrarMetricas = contenido?.hero_mostrar_metricas ?? true;
  const mostrarPasos = contenido?.hero_mostrar_pasos ?? true;
  const paso1 = contenido?.hero_paso_1 || 'Elige tus fechas';
  const paso2 = contenido?.hero_paso_2 || 'Consulta el calendario';
  const paso3 = contenido?.hero_paso_3 || 'Cotiza por WhatsApp';
  const badgeUbicacion = contenido?.hero_badge_ubicacion || 'Santa Elena, Valle del Cauca';

  return (
    <motion.section
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="hero"
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        className="hero-card"
        style={{
          background: 'color-mix(in srgb, var(--surface) 92%, var(--primary-bg))',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--rad-lg, 24px)',
          boxShadow: 'var(--sh-lg)',
          backdropFilter: 'blur(10px)',
          padding: '2rem',
        }}
      >
        <div style={{ zIndex: 2 }}>
          {/* Eyebrow con micro-animación */}
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2.5 }}
            style={{ display: 'inline-flex' }}
          >
            <span
              className="hero-eyebrow"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '999px',
                background: 'var(--primary-bg)',
                color: 'var(--primary)',
                fontWeight: 800,
                fontSize: '0.8rem',
                letterSpacing: '0.02em',
                boxShadow: '0 2px 8px rgba(26, 107, 94, 0.15)',
              }}
            >
              <Sparkles size={14} /> {eyebrow}
            </span>
          </motion.div>

          {/* Título Principal */}
          <h1
            className="hero-title"
            style={{
              marginTop: '0.85rem',
              fontSize: 'clamp(2rem, 1.8rem + 1.8vw, 3.2rem)',
              lineHeight: 1.15,
              fontWeight: 900,
              color: 'var(--text)',
            }}
          >
            {titulo}
          </h1>

          {/* Subtítulo */}
          <p
            className="hero-desc"
            style={{
              marginTop: '0.85rem',
              fontSize: '1rem',
              lineHeight: 1.6,
              color: 'var(--text-muted)',
              maxWidth: '620px',
            }}
          >
            {subtitulo}
          </p>

          {/* Botones de Acción Rápida (CTAs de Alto Impacto) */}
          <div
            className="hero-ctas"
            style={{
              display: 'flex',
              gap: '0.65rem',
              flexWrap: 'wrap',
              marginTop: '1.5rem',
              alignItems: 'center',
            }}
          >
            <button
              className="btn btn-primary"
              onClick={onExploreClick}
              style={{
                padding: '0.75rem 1.4rem',
                fontSize: '0.9rem',
                fontWeight: 800,
                borderRadius: 'var(--rad-sm, 12px)',
                boxShadow: '0 4px 14px rgba(26, 107, 94, 0.35)',
              }}
            >
              <Search size={17} /> {ctaTexto}
            </button>

            {onVisualClick && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={onVisualClick}
                style={{
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  borderRadius: 'var(--rad-sm, 12px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)',
                }}
              >
                <TrendingUp size={16} /> Ver Análisis & Presupuesto
              </button>
            )}

            {onPortalClick && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={onPortalClick}
                style={{
                  padding: '0.75rem 1.15rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  borderRadius: 'var(--rad-sm, 12px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <FileCheck2 size={16} /> Consultar mi Reserva
              </button>
            )}

            {ctaSecTexto && onMenusClick && (
              <button
                className="btn btn-outline"
                onClick={onMenusClick}
                style={{
                  padding: '0.75rem 1.15rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  borderRadius: 'var(--rad-sm, 12px)',
                }}
              >
                <UtensilsCrossed size={16} /> {ctaSecTexto}
              </button>
            )}
          </div>
        </div>

        {/* Panel Lateral de Métricas en Vivo */}
        {mostrarMetricas && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="hero-status-panel"
            style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--rad-md, 18px)',
              padding: '1.4rem',
              boxShadow: 'var(--sh-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--success)' }} /> Disponibilidad en Vivo
              </span>
              <span className="status-badge s-avail" style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
                Sistema Operativo
              </span>
            </div>

            <div className="hero-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
              <div className="metric-card" style={{ background: 'var(--surface-2)', padding: '0.75rem', borderRadius: '10px', textAlign: 'center' }}>
                <div className="metric-val" style={{ fontSize: '1.6rem', fontWeight: 900 }}>{totalFincas}</div>
                <div className="metric-lbl" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fincas activas</div>
              </div>
              <div className="metric-card" style={{ background: 'var(--surface-2)', padding: '0.75rem', borderRadius: '10px', textAlign: 'center' }}>
                <div className="metric-val" style={{ color: 'var(--success)', fontSize: '1.6rem', fontWeight: 900 }}>{disponibles}</div>
                <div className="metric-lbl" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Disponibles hoy</div>
              </div>
              <div className="metric-card" style={{ background: 'var(--surface-2)', padding: '0.75rem', borderRadius: '10px', textAlign: 'center' }}>
                <div className="metric-val" style={{ color: 'var(--danger)', fontSize: '1.6rem', fontWeight: 900 }}>{ocupadas}</div>
                <div className="metric-lbl" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ocupadas ahora</div>
              </div>
            </div>

            <div className="occ-bar-wrap" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                <span className="text-muted">Demanda actual:</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{porcentajeOcupacion}% ocupación</span>
              </div>
              <div className="occ-bar-bg" style={{ height: '8px', borderRadius: '4px', background: 'var(--surface-3)', overflow: 'hidden' }}>
                <div
                  className="occ-bar-fill"
                  style={{
                    width: `${porcentajeOcupacion}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
                    borderRadius: '4px',
                    transition: 'width 0.8s ease',
                  }}
                />
              </div>
            </div>

            {mostrarPasos && (
              <div className="steps-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem', marginTop: '1rem' }}>
                <div style={{ background: 'var(--surface-2)', padding: '0.45rem', borderRadius: '6px', fontSize: '0.72rem', textAlign: 'center', fontWeight: 600 }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 800 }}>1.</span> {paso1}
                </div>
                <div style={{ background: 'var(--surface-2)', padding: '0.45rem', borderRadius: '6px', fontSize: '0.72rem', textAlign: 'center', fontWeight: 600 }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 800 }}>2.</span> {paso2}
                </div>
                <div style={{ background: 'var(--surface-2)', padding: '0.45rem', borderRadius: '6px', fontSize: '0.72rem', textAlign: 'center', fontWeight: 600 }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 800 }}>3.</span> {paso3}
                </div>
              </div>
            )}

            <p style={{ margin: '0.85rem 0 0 0', fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
              <MapPinned size={13} style={{ color: 'var(--primary)' }} />
              Verificado en tiempo real · {badgeUbicacion}
            </p>
          </motion.div>
        )}
      </div>
    </motion.section>
  );
};
