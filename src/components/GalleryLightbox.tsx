import React, { useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface GalleryLightboxProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({
  isOpen,
  images,
  currentIndex,
  onClose,
  onIndexChange,
}) => {
  const handlePrev = useCallback(() => {
    onIndexChange((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images.length, onIndexChange]);

  const handleNext = useCallback(() => {
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

  return (
    <div className="lightbox-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lightbox-content">
        <button className="lightbox-close" onClick={onClose} title="Cerrar (Esc)">
          <X size={20} />
        </button>

        <div className="lightbox-img-wrap">
          <img
            src={images[currentIndex]}
            alt={`Foto ${currentIndex + 1}`}
          />
        </div>

        {images.length > 1 && (
          <>
            <button className="lightbox-btn lightbox-prev" onClick={handlePrev} title="Anterior">
              <ChevronLeft size={28} />
            </button>
            <button className="lightbox-btn lightbox-next" onClick={handleNext} title="Siguiente">
              <ChevronRight size={28} />
            </button>
          </>
        )}

        <div className="lightbox-counter">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  );
};
