import React from 'react';
import type { BeneficioItem } from '../types';

interface BeneficiosSectionProps {
  visible: boolean;
  titulo: string;
  subtitulo: string;
  items: BeneficioItem[];
}

export const BeneficiosSection: React.FC<BeneficiosSectionProps> = ({
  visible,
  titulo,
  subtitulo,
  items,
}) => {
  if (!visible || !items || items.length === 0) return null;

  return (
    <section className="beneficios-section" style={{ margin: '2rem 0' }}>
      <div className="sec-header" style={{ marginBottom: '1.2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 className="sec-title" style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
          {titulo}
        </h2>
        {subtitulo && (
          <p className="sec-sub" style={{ maxWidth: '680px', margin: '0.3rem auto 0 auto' }}>
            {subtitulo}
          </p>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.2rem',
        }}
      >
        {items.map(item => (
          <div
            key={item.id}
            className="card"
            style={{
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--rad-md)',
              boxShadow: 'var(--sh-sm)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'var(--primary-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
              }}
            >
              {item.icono || '✨'}
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.15rem',
                fontWeight: 600,
                color: 'var(--text)',
                margin: 0,
              }}
            >
              {item.titulo}
            </h3>
            <p
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {item.descripcion}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
