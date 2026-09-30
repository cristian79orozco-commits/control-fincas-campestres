import React from 'react';
import { Search, MapPinned } from 'lucide-react';

interface HeroProps {
  totalFincas: number;
  disponibles: number;
  ocupadas: number;
  porcentajeOcupacion: number;
  onExploreClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  totalFincas,
  disponibles,
  ocupadas,
  porcentajeOcupacion,
  onExploreClick,
}) => {
  return (
    <section className="hero">
      <div className="hero-card">
        <div>
          <span className="hero-eyebrow">
            <MapPinned size={14} /> Reserva directa sin comisiones
          </span>
          <h1 className="hero-title" style={{ marginTop: '0.75rem' }}>
            Tu escapada <em>campestre</em><br />empieza aquí
          </h1>
          <p className="hero-desc" style={{ marginTop: '0.75rem' }}>
            Elige la finca ideal en Santa Elena, consulta la disponibilidad en tiempo real en nuestro calendario y cotiza tu reserva instantáneamente por WhatsApp.
          </p>
          <div className="hero-ctas">
            <button className="btn btn-primary" onClick={onExploreClick}>
              <Search size={16} /> Explorar fincas disponibles
            </button>
          </div>
        </div>

        <div className="hero-status-panel">
          <div className="flex" style={{ justifyContent: 'space-between' }}>
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

          <div className="steps-row">
            <span className="step-pill"><span className="step-num">1</span> Elige tus fechas</span>
            <span className="step-pill"><span className="step-num">2</span> Consulta el calendario</span>
            <span className="step-pill"><span className="step-num">3</span> Cotiza por WhatsApp</span>
          </div>

          <p className="text-muted text-xs" style={{ marginTop: '0.25rem' }}>
            Sincronizado en tiempo real con Supabase · Valle del Cauca, Colombia.
          </p>
        </div>
      </div>
    </section>
  );
};
