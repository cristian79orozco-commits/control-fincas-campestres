import React, { useRef, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  MapPin,
  Bed,
  Bath,
  Dog,
  Image as ImageIcon,
  ArrowRight,
  Heart,
  Scale,
  Sparkles,
  Check
} from 'lucide-react';
import type { Finca } from '../types';
import { useClientStore } from '../store/useClientStore';
import { getAmenidadInfo } from '../utils/amenidades';

interface FincaCard3DProps {
  finca: Finca;
  onSelect: (fincaId: string) => void;
  mostrarPrecioTotal?: boolean;
  mostrarBadges?: boolean;
}

function formatCOP(v: number): string {
  return '$' + Math.round(v || 0).toLocaleString('es-CO') + ' COP';
}

export const FincaCard3D = React.memo<FincaCard3DProps>(({
  finca,
  onSelect,
  mostrarPrecioTotal = true,
  mostrarBadges = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Selectores atómicos de grano fino para eliminar re-renders masivos
  const isEnComparacion = useClientStore(useCallback((s) => s.fincasComparar.includes(finca.id), [finca.id]));
  const isFavorito = useClientStore(useCallback((s) => s.favoritos.includes(finca.id), [finca.id]));
  const toggleCompararFinca = useClientStore((s) => s.toggleCompararFinca);
  const toggleFavorito = useClientStore((s) => s.toggleFavorito);

  const images = useMemo(() => {
    return [...(finca.finca_imagenes || [])].sort((a, b) => a.orden - b.orden);
  }, [finca.finca_imagenes]);

  const mainImage = useMemo(() => {
    return (
      images.find((i) => i.es_principal)?.url ||
      images[0]?.url ||
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'
    );
  }, [images]);

  const totalFotos = images.length;
  const precioPp = Number(finca.precio_pp) || 0;
  const precioFincaCompleta = Number(finca.precio_finca_completa) || 0;

  // Manejo de inclinación 3D sutil
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -6; // Inclinación suave max 6deg
    const rY = ((x - centerX) / centerX) * 6;

    setRotateX(rX);
    setRotateY(rY);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  }, []);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX,
        rotateY,
        scale: isHovered ? 1.015 : 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        perspective: 1000,
        transformStyle: 'preserve-3d',
      }}
      className="finca-card-3d-wrapper"
    >
      <div
        className="card-pro"
        style={{
          border: `1.5px solid ${isEnComparacion ? 'var(--primary)' : isHovered ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--rad-md, 20px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isHovered
            ? '0 12px 32px rgba(212, 146, 74, 0.12), var(--sh-md)'
            : 'var(--sh-sm)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          height: '100%',
        }}
      >
        {/* Luz ambiental sutil en esquina superior */}
        <div className="card-pro-ambient" />

        {/* Cabecera / Fotografía Principal */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '224px',
            overflow: 'hidden',
            background: 'var(--surface-2)',
            cursor: 'pointer',
          }}
          onClick={() => onSelect(finca.id)}
        >
          <img
            src={mainImage}
            alt={finca.nombre}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: isHovered ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />

          {/* Gradiente cinematográfico superior e inferior */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(20, 18, 16, 0.55) 0%, transparent 45%, rgba(20, 18, 16, 0.75) 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Badges superiores: Estado y Favorito */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              right: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 2,
            }}
          >
            {mostrarBadges && (
              <span
                className={finca.estado === 'alta_demanda' ? 'badge-pro-accent' : 'badge-pro-avail'}
                style={{
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                }}
              >
                <span className="pulse-dot" />
                {finca.estado === 'alta_demanda' ? 'Alta Demanda' : 'Disponible'}
              </span>
            )}

            {/* Botón Favorito con feedback visual */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorito(finca.id);
              }}
              title={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: isFavorito ? 'rgba(239, 68, 68, 0.18)' : 'rgba(20, 18, 16, 0.65)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${isFavorito ? 'rgba(239, 68, 68, 0.45)' : 'rgba(255, 255, 255, 0.15)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isFavorito ? '#ef4444' : 'var(--text)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              }}
            >
              <Heart size={15} fill={isFavorito ? '#ef4444' : 'none'} />
            </button>
          </div>

          {/* Insignia inferior: Contador de fotos */}
          {totalFotos > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.2rem 0.55rem',
                borderRadius: '6px',
                background: 'rgba(20, 18, 16, 0.72)',
                color: 'var(--text)',
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                zIndex: 2,
              }}
            >
              <ImageIcon size={11} /> {totalFotos} fotos
            </div>
          )}
        </div>

        {/* Cuerpo de la Tarjeta */}
        <div
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            gap: '0.85rem',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Nombre y Ubicación */}
          <div>
            <h3
              onClick={() => onSelect(finca.id)}
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                margin: 0,
                color: 'var(--text)',
                cursor: 'pointer',
                lineHeight: 1.3,
                letterSpacing: '-0.02em',
                transition: 'color 0.2s ease',
              }}
            >
              {finca.nombre}
            </h3>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                marginTop: '0.3rem',
              }}
            >
              <MapPin size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span>{finca.zona || 'Santa Elena, El Cerrito, Valle'}</span>
            </div>
          </div>

          {/* Ficha de Especificaciones Rápidas */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.45rem',
              fontSize: '0.74rem',
              color: 'var(--text-muted)',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                padding: '0.22rem 0.55rem',
                borderRadius: 'var(--rad-xs, 8px)',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              <Users size={12} style={{ color: 'var(--primary)' }} />
              {finca.capacidad_minima && finca.capacidad_minima > 1
                ? `${finca.capacidad_minima} - ${finca.capacidad}`
                : `Hasta ${finca.capacidad}`}{' '}
              pers.
            </span>

            {finca.habitaciones && finca.habitaciones > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  padding: '0.22rem 0.55rem',
                  borderRadius: 'var(--rad-xs, 8px)',
                  color: 'var(--text-muted)',
                }}
              >
                <Bed size={12} style={{ color: 'var(--primary)' }} /> {finca.habitaciones} habs
              </span>
            )}

            {finca.banos && finca.banos > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  padding: '0.22rem 0.55rem',
                  borderRadius: 'var(--rad-xs, 8px)',
                  color: 'var(--text-muted)',
                }}
              >
                <Bath size={12} style={{ color: 'var(--primary)' }} /> {finca.banos} baños
              </span>
            )}

            {finca.politica_mascotas === 'permitido' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'color-mix(in srgb, var(--success) 12%, transparent)',
                  color: 'var(--success)',
                  border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
                  padding: '0.22rem 0.55rem',
                  borderRadius: 'var(--rad-xs, 8px)',
                  fontWeight: 600,
                }}
              >
                <Dog size={12} /> Pet Friendly
              </span>
            )}
          </div>

          {/* Amenidades Destacadas (Primeras 3) */}
          {finca.finca_amenidades && finca.finca_amenidades.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.35rem',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
              }}
            >
              {finca.finca_amenidades.slice(0, 3).map((a, i) => {
                const info = getAmenidadInfo(a.nombre, a.icono);
                return (
                  <span
                    key={i}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '6px',
                      color: 'var(--text)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem' }}>{info.emoji}</span>
                    <span>{info.cleanNombre}</span>
                  </span>
                );
              })}
              {finca.finca_amenidades.length > 3 && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center', fontStyle: 'italic' }}>
                  +{finca.finca_amenidades.length - 3} más
                </span>
              )}
            </div>
          )}

          {/* Divisor Delicado */}
          <div style={{ height: '1px', background: 'var(--border)', margin: '0.35rem 0' }} />

          {/* Tarifas y Botones de Acción */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '0.5rem',
              marginTop: 'auto',
            }}
          >
            {/* Tarifas con Jerarquía High-End */}
            <div>
              <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>
                Tarifa /pp noche
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1.15, marginTop: '2px' }}>
                {formatCOP(precioPp)}
              </div>
              {mostrarPrecioTotal && precioFincaCompleta > 0 && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  O completa: <strong style={{ color: 'var(--text)' }}>{formatCOP(precioFincaCompleta)}</strong>
                </div>
              )}
            </div>

            {/* Botones: Comparar y Cotizar Pro */}
            <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => toggleCompararFinca(finca.id)}
                title={isEnComparacion ? 'Quitar del comparador' : 'Comparar con otras fincas'}
                style={{
                  padding: '0.5rem',
                  borderRadius: 'var(--rad-xs, 8px)',
                  border: `1.5px solid ${isEnComparacion ? 'var(--primary)' : 'var(--border)'}`,
                  background: isEnComparacion ? 'var(--primary-bg)' : 'var(--surface-2)',
                  color: isEnComparacion ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: isEnComparacion ? '0 0 10px rgba(77, 168, 158, 0.25)' : 'none',
                }}
              >
                {isEnComparacion ? <Check size={16} /> : <Scale size={16} />}
              </button>

              <button
                type="button"
                className="btn-pro-primary"
                onClick={() => onSelect(finca.id)}
                style={{
                  padding: '0.5rem 0.95rem',
                  fontSize: '0.8rem',
                }}
              >
                <span>Cotizar</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

FincaCard3D.displayName = 'FincaCard3D';
