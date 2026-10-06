import React, { useState } from 'react';
import {
  Eye, Users, MapPin, Sparkles, ChevronDown, ChevronUp,
  Bed, Bath, Clock, Check, Dog, Volume2, Image as ImageIcon, ArrowRight
} from 'lucide-react';
import type { Finca } from '../types';

interface FincaCardProps {
  finca: Finca;
  onSelect: (fincaId: string) => void;
  defaultExpanded?: boolean;
}

const estadoMap: Record<string, { cls: string; lbl: string; dot: string }> = {
  disponible: { cls: 's-avail', lbl: 'Disponible', dot: 'var(--success)' },
  alta_demanda: { cls: 's-warn', lbl: 'Alta demanda', dot: 'var(--warning)' },
  no_disponible: { cls: 's-busy', lbl: 'No disponible', dot: 'var(--danger)' },
  fin_de_semana: { cls: 's-info', lbl: 'Fin de semana', dot: 'var(--primary)' },
};

export const FincaCard: React.FC<FincaCardProps> = ({ finca, onSelect, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const images = [...(finca.finca_imagenes || [])].sort((a, b) => a.orden - b.orden);
  const mainImage = images.find(i => i.es_principal)?.url || images[0]?.url ||
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80';

  const previewImages = images.slice(0, 4);

  const precioFormatted = finca.precio_pp ? Number(finca.precio_pp).toLocaleString('es-CO') : null;
  const estadoInfo = estadoMap[finca.estado] || { cls: 's-info', lbl: finca.estado, dot: 'var(--primary)' };
  const planesStr = (finca.finca_planes || []).map(p => p.nombre).join(' · ');

  return (
    <article
      className="finca-collapsible-card"
      style={{
        background: 'var(--surface)',
        border: `1.5px solid ${expanded ? 'var(--primary)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--rad-sm, 10px)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        boxShadow: expanded
          ? '0 4px 18px rgba(0,0,0,0.08)'
          : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* ─── FILA CONTRAÍDA (Siempre visible) ─── */}
      <div
        onClick={() => setExpanded(prev => !prev)}
        style={{
          display: 'grid',
          gridTemplateColumns: '100px 1fr auto',
          alignItems: 'center',
          gap: '0.85rem',
          padding: '0.75rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Miniatura fotográfica */}
        <div
          style={{
            width: '100px',
            height: '75px',
            borderRadius: 'var(--rad-xs, 6px)',
            overflow: 'hidden',
            position: 'relative',
            background: 'var(--surface-sunken)',
            flexShrink: 0,
          }}
        >
          <img
            loading="lazy"
            src={mainImage}
            alt={finca.nombre}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {images.length > 1 && (
            <span
              style={{
                position: 'absolute',
                bottom: '4px',
                right: '4px',
                background: 'rgba(0,0,0,0.65)',
                color: '#fff',
                fontSize: '0.62rem',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <ImageIcon size={9} /> {images.length}
            </span>
          )}
        </div>

        {/* Información central compacta */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
            <h3
              style={{
                fontSize: '0.96rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                margin: 0,
                lineHeight: 1.25,
              }}
            >
              {finca.nombre}
            </h3>
            <span
              className={`status-badge ${estadoInfo.cls}`}
              style={{ fontSize: '0.65rem', padding: '0.12rem 0.5rem' }}
            >
              {estadoInfo.lbl}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              <MapPin size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> {finca.zona || 'Santa Elena, Valle'}
            </span>
            <span>
              <Users size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Hasta {finca.capacidad} pers.
            </span>
            {precioFormatted && (
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                ${precioFormatted} <span style={{ fontWeight: 400, fontSize: '0.72rem', color: 'var(--text-muted)' }}>/pp noche</span>
              </span>
            )}
          </div>
        </div>

        {/* Botón de despliegue y acción rápida */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={e => {
              e.stopPropagation();
              setExpanded(prev => !prev);
            }}
            style={{
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: expanded ? 'var(--surface-sunken)' : 'transparent',
            }}
          >
            {expanded ? (
              <>Contraer <ChevronUp size={14} /></>
            ) : (
              <>Ver fotos y detalles <ChevronDown size={14} /></>
            )}
          </button>
        </div>
      </div>

      {/* ─── CONTENIDO DESPLEGADO (Se muestra al presionar) ─── */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--surface-sunken)',
            padding: '1rem',
            display: 'grid',
            gap: '0.85rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* Mosaico de fotos previo */}
          {images.length > 0 && (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '0.5rem',
                }}
              >
                {previewImages.map((img, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: '80px',
                      borderRadius: 'var(--rad-xs, 6px)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <img
                      src={img.url}
                      alt={`${finca.nombre} foto ${idx + 1}`}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breve descripción */}
          {finca.descripcion && (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {finca.descripcion.slice(0, 160)}...
            </p>
          )}

          {/* Atributos y amenidades destacadas */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            {finca.habitaciones ? (
              <span className="amenity-chip" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'var(--surface)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <Bed size={12} style={{ display: 'inline', verticalAlign: '-1px', color: 'var(--primary)' }} /> {finca.habitaciones} habitaciones
              </span>
            ) : null}

            {finca.camas ? (
              <span className="amenity-chip" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'var(--surface)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <Bed size={12} style={{ display: 'inline', verticalAlign: '-1px', color: 'var(--primary)' }} /> {finca.camas} camas
              </span>
            ) : null}

            {finca.banos ? (
              <span className="amenity-chip" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'var(--surface)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <Bath size={12} style={{ display: 'inline', verticalAlign: '-1px', color: 'var(--primary)' }} /> {finca.banos} baños
              </span>
            ) : null}

            {finca.checkin_hora && (
              <span className="amenity-chip" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'var(--surface)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <Clock size={12} style={{ display: 'inline', verticalAlign: '-1px', color: 'var(--primary)' }} /> Check-in: {finca.checkin_hora}
              </span>
            )}

            {finca.politica_mascotas && finca.politica_mascotas !== 'no_permitido' && (
              <span className="amenity-chip" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'var(--surface)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <Dog size={12} style={{ display: 'inline', verticalAlign: '-1px', color: 'var(--success)' }} /> Pet Friendly
              </span>
            )}

            {(finca.finca_amenidades || []).slice(0, 5).map((a, i) => (
              <span
                key={i}
                className="amenity-chip"
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.55rem',
                  background: 'var(--surface)',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <Check size={11} style={{ display: 'inline', verticalAlign: '-1px', color: 'var(--primary)' }} /> {a.nombre}
              </span>
            ))}
          </div>

          {/* Barra inferior de acción para cotizar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '0.6rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tarifa estimada: </span>
              <strong style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>
                ${precioFormatted || '0'} COP
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}> / persona noche</span>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={e => {
                e.stopPropagation();
                onSelect(finca.id);
              }}
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Eye size={14} /> Ver disponibilidad y cotizar <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </article>
  );
};
