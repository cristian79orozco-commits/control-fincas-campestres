import React from 'react';
import { Search, MapPinned, UtensilsCrossed } from 'lucide-react';
import type { ContenidoSitio } from '../types';

interface HeroProps {
  totalFincas: number;
  disponibles: number;
  ocupadas: number;
  porcentajeOcupacion: number;
  onExploreClick: () => void;
  onMenusClick?: () => void;
  contenido?: ContenidoSitio;
}

export const Hero: React.FC<HeroProps> = ({
  totalFincas,
  disponibles,
  ocupadas,
  porcentajeOcupacion,
  onExploreClick,
  onMenusClick,
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
  const badgeUbicacion = contenido?.hero_badge_ubicacion || 'Valle del Cauca, Colombia';

  return (
    <section className="hero">
      <div className="hero-card">
        <div>
          <span className="hero-eyebrow">
            <MapPinned size={14} /> {eyebrow}
          </span>
          <h1 className="hero-title" style={{ marginTop: '0.75rem' }}>
            {titulo}
          </h1>
          <p className="hero-desc" style={{ marginTop: '0.75rem' }}>
            {subtitulo}
          </p>
          <div className="hero-ctas" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.2rem' }}>
            <button className="btn btn-primary" onClick={onExploreClick}>
              <Search size={16} /> {ctaTexto}
            </button>
            {ctaSecTexto && onMenusClick && (
              <button className="btn btn-outline" onClick={onMenusClick}>
                <UtensilsCrossed size={16} /> {ctaSecTexto}
              </button>
            )}
          </div>
        </div>

        {mostrarMetricas && (
          <div className="hero-status-panel">
            <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600 }}>
                Disponibilidad en tiempo real
              </span>
              <span className="status-badge s-avail">Operativo</span>
            </div>

            <div className="hero-metrics">
              <div className="metric-card">
                <div className="metric-val">{totalFincas}</div>
                <div className="metric-lbl">Fincas activas</div>
              </div>
              <div className="metric-card">
                <div className="metric-val" style={{ color: 'var(--success)' }}>{disponibles}</div>
                <div className="metric-lbl">Disponibles hoy</div>
              </div>
              <div className="metric-card">
                <div className="metric-val" style={{ color: 'var(--danger)' }}>{ocupadas}</div>
                <div className="metric-lbl">Ocupadas ahora</div>
              </div>
            </div>

            <div className="occ-bar-wrap">
              <span className="text-xs text-muted">Ocupación:</span>
              <div className="occ-bar-bg">
                <div className="occ-bar-fill" style={{ width: `${porcentajeOcupacion}%` }} />
              </div>
              <span className="text-xs text-muted" style={{ fontWeight: 600 }}>{porcentajeOcupacion}%</span>
            </div>

            {mostrarPasos && (
              <div className="steps-row">
                <span className="step-pill"><span className="step-num">1</span> {paso1}</span>
                <span className="step-pill"><span className="step-num">2</span> {paso2}</span>
                <span className="step-pill"><span className="step-num">3</span> {paso3}</span>
              </div>
            )}

            <p className="text-muted text-xs" style={{ marginTop: '0.25rem' }}>
              Disponibilidad verificada en tiempo real · {badgeUbicacion}.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
