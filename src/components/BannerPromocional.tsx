import React, { useState } from 'react';
import { Sparkles, X, ChevronRight, AlertCircle, Info } from 'lucide-react';

interface BannerPromocionalProps {
  visible: boolean;
  texto: string;
  linkTexto?: string;
  linkUrl?: string;
  tipo?: 'promo' | 'info' | 'aviso';
}

export const BannerPromocional: React.FC<BannerPromocionalProps> = ({
  visible,
  texto,
  linkTexto,
  linkUrl,
  tipo = 'promo',
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (!visible || dismissed || !texto) return null;

  const bgStyle =
    tipo === 'promo'
      ? {
          background: 'linear-gradient(90deg, #1a6b5e 0%, #13524a 50%, #204b44 100%)',
          color: '#ffffff',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
        }
      : tipo === 'aviso'
      ? {
          background: 'linear-gradient(90deg, #a36a00 0%, #c47a28 100%)',
          color: '#ffffff',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
        }
      : {
          background: 'var(--surface-2)',
          color: 'var(--text)',
          borderBottom: '1px solid var(--border)',
        };

  return (
    <aside
      aria-label="Anuncio promocional"
      style={{
        ...bgStyle,
        padding: '0.55rem 1rem',
        fontSize: 'var(--text-xs)',
        position: 'relative',
        zIndex: 50,
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.8rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', flex: 1 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.9 }}>
            {tipo === 'promo' ? (
              <Sparkles size={15} style={{ color: '#ffd166' }} />
            ) : tipo === 'aviso' ? (
              <AlertCircle size={15} />
            ) : (
              <Info size={15} />
            )}
          </span>
          <span style={{ fontWeight: 500, lineHeight: 1.4 }}>{texto}</span>
          {linkTexto && linkUrl && (
            <a
              href={linkUrl}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                fontWeight: 700,
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                color: 'inherit',
                marginLeft: '0.4rem',
              }}
            >
              {linkTexto} <ChevronRight size={13} />
            </a>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '0.2rem',
            borderRadius: '4px',
            opacity: 0.75,
            display: 'flex',
            alignItems: 'center',
            transition: 'opacity 0.2s',
          }}
          title="Ocultar aviso"
          aria-label="Cerrar aviso"
        >
          <X size={15} />
        </button>
      </div>
    </aside>
  );
};
