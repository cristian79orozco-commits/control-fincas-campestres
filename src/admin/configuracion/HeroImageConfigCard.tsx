import React, { useRef } from 'react';
import { ImagePlus, Trash2, Link2, Sparkles, Check, Loader2 } from 'lucide-react';

interface HeroImageConfigCardProps {
  imagenUrl: string;
  urlInput: string;
  onUrlInputChange: (val: string) => void;
  subiendo: boolean;
  guardandoUrl: boolean;
  infoOptimizacion: string | null;
  onSubirImagen: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGuardarUrlManual: () => void;
  onEliminarImagen: () => void;
}

/**
 * Componente presentacional (Capa 1) para configurar la imagen protagonista
 * del bloque Hero del panel del cliente, con vista previa en vivo de la fusión
 * degradada y controles táctiles PC + Mobile.
 */
export const HeroImageConfigCard: React.FC<HeroImageConfigCardProps> = ({
  imagenUrl,
  urlInput,
  onUrlInputChange,
  subiendo,
  guardandoUrl,
  infoOptimizacion,
  onSubirImagen,
  onGuardarUrlManual,
  onEliminarImagen,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ocupado = subiendo || guardandoUrl;

  return (
    <div
      className="panel"
      style={{
        gridColumn: '1 / -1',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ImagePlus size={17} style={{ color: 'var(--primary)' }} /> Imagen Protagonista del Panel Cliente (Hero)
        </div>
        <span className="text-xs text-muted">
          Se fusiona con degradado hacia los textos del bloque principal
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: '1.25rem',
          alignItems: 'center',
        }}
      >
        {/* Vista previa en vivo del efecto de fusión */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: '190px',
            borderRadius: 'var(--rad-md, 18px)',
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            padding: '1.25rem',
          }}
        >
          {imagenUrl ? (
            <>
              <img
                src={imagenUrl}
                alt="Vista previa Hero"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: '66%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 30%, black 68%)',
                  maskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 30%, black 68%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(90deg, var(--surface-2) 0%, color-mix(in srgb, var(--surface-2) 92%, transparent) 38%, color-mix(in srgb, var(--surface-2) 30%, transparent) 68%, transparent 100%)',
                  pointerEvents: 'none',
                }}
              />
            </>
          ) : (
            <div
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '40%',
                height: '75%',
                borderRadius: '12px',
                border: '1.5px dashed var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                textAlign: 'center',
                padding: '0.5rem',
              }}
            >
              <ImagePlus size={20} style={{ opacity: 0.6 }} />
              <span>Sin imagen asignada</span>
            </div>
          )}

          {/* Mini mockup de texto izquierdo para validar contraste */}
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '58%' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                background: 'var(--primary-bg)',
                color: 'var(--primary)',
                fontSize: '0.65rem',
                fontWeight: 700,
              }}
            >
              <Sparkles size={10} /> RESERVA DIRECTA
            </span>
            <div
              style={{
                marginTop: '0.45rem',
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                fontWeight: 700,
                lineHeight: 1.15,
                color: 'var(--text)',
              }}
            >
              Encuentra tu finca ideal aquí
            </div>
            <div
              style={{
                marginTop: '0.3rem',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                lineHeight: 1.35,
              }}
            >
              Vista previa de cómo se degrada la foto hacia la izquierda.
            </div>
          </div>
        </div>

        {/* Controles de subida y enlace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            onChange={onSubirImagen}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={ocupado}
              className="btn btn-primary min-h-[44px] active:scale-[0.98]"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.15rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                flex: '1 1 auto',
                justifyContent: 'center',
              }}
            >
              {subiendo ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              {subiendo ? 'Optimizando y subiendo...' : imagenUrl ? 'Cambiar imagen' : 'Subir imagen desde equipo'}
            </button>

            {imagenUrl && (
              <button
                type="button"
                onClick={onEliminarImagen}
                disabled={ocupado}
                className="btn btn-outline min-h-[44px] min-w-[44px] active:scale-[0.98]"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 0.95rem',
                  fontSize: '0.82rem',
                  borderColor: 'var(--danger)',
                  color: 'var(--danger)',
                }}
              >
                <Trash2 size={15} /> Quitar
              </button>
            )}
          </div>

          {infoOptimizacion && (
            <div
              className="text-xs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'var(--success)',
                fontWeight: 600,
              }}
            >
              <Check size={14} /> {infoOptimizacion}
            </div>
          )}

          {/* Campo URL manual opcional (text-base md:text-sm evita zoom en iOS) */}
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              O pegar URL directa de imagen
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => onUrlInputChange(e.target.value)}
                placeholder="https://..."
                className="text-base md:text-sm min-h-[44px]"
                style={{ flex: '1 1 200px' }}
              />
              <button
                type="button"
                onClick={onGuardarUrlManual}
                disabled={ocupado || !urlInput.trim() || urlInput.trim() === imagenUrl}
                className="btn btn-secondary min-h-[44px] active:scale-[0.98]"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.55rem 0.9rem',
                  fontSize: '0.8rem',
                }}
              >
                <Link2 size={14} /> Aplicar URL
              </button>
            </div>
          </div>

          <p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.45 }}>
            Se optimiza automáticamente a formato WebP, se guarda en Supabase Storage (<code>finca-imagenes/hero/</code>) y se refleja al instante en el panel del cliente.
          </p>
        </div>
      </div>
    </div>
  );
};
