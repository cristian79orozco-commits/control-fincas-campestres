import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { FaqItem } from '../types';

interface FaqSectionProps {
  visible: boolean;
  titulo: string;
  subtitulo: string;
  items: FaqItem[];
}

export const FaqSection: React.FC<FaqSectionProps> = ({
  visible,
  titulo,
  subtitulo,
  items,
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!visible || !items || items.length === 0) return null;

  const toggleItem = (idx: number) => {
    setOpenIndex(prev => (prev === idx ? null : idx));
  };

  return (
    <section className="faq-section" style={{ margin: '2.5rem 0' }}>
      <div className="sec-header" style={{ marginBottom: '1.2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <HelpCircle size={20} style={{ color: 'var(--primary)' }} />
          <h2 className="sec-title" style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>
            {titulo}
          </h2>
        </div>
        {subtitulo && (
          <p className="sec-sub" style={{ maxWidth: '640px', margin: '0.3rem auto 0 auto' }}>
            {subtitulo}
          </p>
        )}
      </div>

      <div
        style={{
          maxWidth: '840px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        {items.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={item.id || idx}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--rad-sm)',
                background: isOpen ? 'var(--surface)' : 'var(--surface-2)',
                overflow: 'hidden',
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              <button
                type="button"
                onClick={() => toggleItem(idx)}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text)',
                }}
              >
                <span>{item.pregunta}</span>
                <span style={{ color: 'var(--primary)', flexShrink: 0 }}>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: '0 1.25rem 1.1rem 1.25rem',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                    borderTop: '1px solid var(--border)',
                    background: 'var(--surface)',
                  }}
                >
                  <p style={{ margin: '0.6rem 0 0 0' }}>{item.respuesta}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
