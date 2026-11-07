import React, { useEffect, useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';

interface GalleryLightboxProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  title?: string;
  subtitle?: string;
}

export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({
  isOpen,
  images,
  currentIndex,
  onClose,
  onIndexChange,
  title,
  subtitle,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setIsZoomed(false);
  }, [currentIndex, isOpen]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    onIndexChange((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images.length, onIndexChange]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    onIndexChange((currentIndex + 1) % images.length);
  }, [currentIndex, images.length, onIndexChange]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !images.length) return null;

  const currentImg = images[currentIndex] || images[0];

  return (
    <div
      className="lightbox-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Visor de imágenes'}
    >
      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        {/* Barra superior de acciones y título */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '0.75rem',
            color: '#fff',
          }}
        >
          <div style={{ minWidth: 0 }}>
            {title && (
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.98rem',
                  color: '#fff',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </div>
            )}
            {subtitle && (
              <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.75)' }}>
                {subtitle}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={() => setIsZoomed(z => !z)}
              title={isZoomed ? 'Reducir zoom' : 'Ampliar zoom'}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                color: '#fff',
                borderRadius: '999px',
                padding: '0.38rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
              }}
            >
              {isZoomed ? <ZoomOut size={15} /> : <ZoomIn size={15} />}
              <span>{isZoomed ? 'Ajustar' : 'Zoom'}</span>
            </button>

            <button
              type="button"
              className="lightbox-close"
              onClick={onClose}
              title="Cerrar (Esc)"
              style={{ position: 'static', width: '38px', height: '38px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenedor principal de la imagen con soporte de contraste para WebP/PNG transparentes */}
        <div
          className="lightbox-img-wrap"
          onClick={() => setIsZoomed(z => !z)}
          style={{
            position: 'relative',
            cursor: isZoomed ? 'zoom-out' : 'zoom-in',
            overflow: isZoomed ? 'auto' : 'hidden',
            borderRadius: 'var(--rad-sm, 14px)',
            background: 'linear-gradient(145deg, #FFFDF9 0%, #F4EFE4 100%)',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.65)',
            padding: '0.5rem',
            maxWidth: '960px',
            width: '100%',
            minHeight: '260px',
            maxHeight: '76vh',
          }}
        >
          <img
            src={currentImg}
            alt={title ? `${title} - Foto ${currentIndex + 1}` : `Foto ${currentIndex + 1}`}
            decoding="async"
            style={{
              maxWidth: isZoomed ? '165%' : '100%',
              maxHeight: isZoomed ? 'none' : '72vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: 'none',
              transition: 'transform 0.2s ease',
              margin: '0 auto',
            }}
          />
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              className="lightbox-btn lightbox-prev"
              onClick={handlePrev}
              title="Anterior"
            >
              <ChevronLeft size={26} />
            </button>
            <button
              type="button"
              className="lightbox-btn lightbox-next"
              onClick={handleNext}
              title="Siguiente"
            >
              <ChevronRight size={26} />
            </button>
          </>
        )}

        {/* Contador e indicador inferior + tira de miniaturas */}
        <div
          style={{
            marginTop: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.55rem',
            width: '100%',
          }}
        >
          <div className="lightbox-counter" style={{ marginTop: 0 }}>
            {currentIndex + 1} / {images.length} · Toca la imagen para {isZoomed ? 'ajustar' : 'hacer zoom'}
          </div>

          {images.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: '0.45rem',
                overflowX: 'auto',
                maxWidth: '100%',
                padding: '0.2rem',
              }}
            >
              {images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onIndexChange(idx)}
                  style={{
                    width: '54px',
                    height: '42px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    padding: '2px',
                    cursor: 'pointer',
                    border: idx === currentIndex ? '2px solid var(--accent, #d4924a)' : '1px solid rgba(255,255,255,0.3)',
                    opacity: idx === currentIndex ? 1 : 0.65,
                    background: 'linear-gradient(145deg, #FFFDF9 0%, #F4EFE4 100%)',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                  title={`Ver imagen ${idx + 1}`}
                >
                  <img
                    src={imgUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

