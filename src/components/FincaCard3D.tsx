import React, { useRef, useState } from 'react';
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

interface FincaCard3DProps {
  finca: Finca;
  onSelect: (fincaId: string) => void;
  mostrarPrecioTotal?: boolean;
  mostrarBadges?: boolean;
}

function formatCOP(v: number): string {
  return '$' + Math.round(v || 0).toLocaleString('es-CO') + ' COP';
}

export const FincaCard3D: React.FC<FincaCard3DProps> = ({
  finca,
  onSelect,
  mostrarPrecioTotal = true,
  mostrarBadges = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const { fincasComparar, toggleCompararFinca, favoritos, toggleFavorito } = useClientStore();

  const isEnComparacion = fincasComparar.includes(finca.id);
  const isFavorito = favoritos.includes(finca.id);

  const images = [...(finca.finca_imagenes || [])].sort((a, b) => a.orden - b.orden);
  const mainImage =
    images.find((i) => i.es_principal)?.url ||
    images[0]?.url ||
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';

  const totalFotos = images.length;
  const precioPp = Number(finca.precio_pp) || 0;
  const precioFincaCompleta = Number(finca.precio_finca_completa) || 0;

  // Manejo de inclinación 3D sutil
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

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
        style={{
          background: 'var(--surface)',
          border: `1.5px solid ${isEnComparacion ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 'var(--rad-md, 18px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isHovered ? 'var(--sh-lg)' : 'var(--sh-sm)',
          transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
          height: '100%',
        }}
      >
        {/* Cabecera / Fotografía Principal */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '220px',
            overflow: 'hidden',
            background: '#0f172a',
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
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.4s ease',
            }}
          />

          {/* Gradiente superior e inferior para legibilidad */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 40%, rgba(0,0,0,0.65) 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Badges superiores: Estado y Favorito */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              right: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {mostrarBadges && (
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(26, 107, 94, 0.92)',
                  color: '#ffffff',
                  backdropFilter: 'blur(4px)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Sparkles size={11} /> {finca.estado === 'alta_demanda' ? 'Alta Demanda' : 'Disponible'}
              </span>
            )}

            {/* Botón Favorito */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorito(finca.id);
              }}
              title={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(4px)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isFavorito ? '#ef4444' : '#ffffff',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
            >
              <Heart size={16} fill={isFavorito ? '#ef4444' : 'none'} />
            </button>
          </div>

          {/* Insignia inferior: Contador de fotos */}
          {totalFotos > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.65)',
                color: '#ffffff',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ImageIcon size={11} /> {totalFotos} fotos
            </div>
          )}
        </div>

        {/* Cuerpo de la Tarjeta */}
        <div
          style={{
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            gap: '0.75rem',
          }}
        >
          {/* Nombre y Ubicación */}
          <div>
            <h3
              onClick={() => onSelect(finca.id)}
              style={{
                fontSize: '1.12rem',
                fontWeight: 800,
                margin: 0,
                color: 'var(--text)',
                cursor: 'pointer',
                lineHeight: 1.25,
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
                marginTop: '0.25rem',
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
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                background: 'var(--surface-2)',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                fontWeight: 600,
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: 'var(--surface-2)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                }}
              >
                <Bed size={12} style={{ color: 'var(--primary)' }} /> {finca.habitaciones} habs
              </span>
            )}

            {finca.banos && finca.banos > 0 && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: 'var(--surface-2)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                }}
              >
                <Bath size={12} style={{ color: 'var(--primary)' }} /> {finca.banos} baños
              </span>
            )}

            {finca.politica_mascotas === 'permitido' && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#059669',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
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
              {finca.finca_amenidades.slice(0, 3).map((a, i) => (
                <span
                  key={i}
                  style={{
                    background: 'var(--surface-3)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                  }}
                >
                  ✓ {a.nombre}
                </span>
              ))}
              {finca.finca_amenidades.length > 3 && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                  +{finca.finca_amenidades.length - 3} más
                </span>
              )}
            </div>
          )}

          {/* Divisor */}
          <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0' }} />

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
            {/* Tarifas */}
            <div>
              <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Tarifa /pp noche
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1.1 }}>
                {formatCOP(precioPp)}
              </div>
              {mostrarPrecioTotal && precioFincaCompleta > 0 && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  O completa: <strong>{formatCOP(precioFincaCompleta)}</strong>
                </div>
              )}
            </div>

            {/* Botones: Comparar y Cotizar */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => toggleCompararFinca(finca.id)}
                title={isEnComparacion ? 'Quitar del comparador' : 'Comparar con otras fincas'}
                style={{
                  padding: '0.45rem',
                  borderRadius: '8px',
                  border: `1.5px solid ${isEnComparacion ? 'var(--primary)' : 'var(--border)'}`,
                  background: isEnComparacion ? 'var(--primary-bg)' : 'var(--surface)',
                  color: isEnComparacion ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                {isEnComparacion ? <Check size={16} /> : <Scale size={16} />}
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onSelect(finca.id)}
                style={{
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 2px 8px rgba(26, 107, 94, 0.25)',
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
};
