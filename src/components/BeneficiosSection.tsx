import React from 'react';
import { motion } from 'framer-motion';
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
    <section className="beneficios-section" style={{ margin: '2.5rem 0' }}>
      <div
        className="sec-header"
        style={{
          marginBottom: '1.5rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <h2
          className="sec-title"
          style={{
            fontSize: 'clamp(1.25rem, 1.1rem + 0.8vw, 1.8rem)',
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
          }}
        >
          {titulo}
        </h2>
        {subtitulo && (
          <p
            className="sec-sub"
            style={{
              maxWidth: '680px',
              margin: '0.4rem auto 0 auto',
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            {subtitulo}
          </p>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: '1.25rem',
        }}
      >
        {items.map((item, idx) => (
          <motion.div
            key={item.id || idx}
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            style={{
              padding: '1.6rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--rad-md, 18px)',
              boxShadow: 'var(--sh-sm)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'var(--primary-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                boxShadow: '0 2px 8px rgba(26, 107, 94, 0.12)',
              }}
            >
              {item.icono || '✨'}
            </div>
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: 'var(--text)',
                margin: 0,
              }}
            >
              {item.titulo}
            </h3>
            <p
              style={{
                fontSize: '0.84rem',
                color: 'var(--text-muted)',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {item.descripcion}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
