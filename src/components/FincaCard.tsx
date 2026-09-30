import React from 'react';
import { Eye, Users, MapPin, Sparkles } from 'lucide-react';
import type { Finca } from '../types';

interface FincaCardProps {
  finca: Finca;
  onSelect: (fincaId: string) => void;
}

const estadoMap: Record<string, { cls: string; lbl: string; dot: string }> = {
  disponible: { cls: 's-avail', lbl: 'Disponible', dot: 'var(--success)' },
  alta_demanda: { cls: 's-warn', lbl: 'Alta demanda', dot: 'var(--warning)' },
  no_disponible: { cls: 's-busy', lbl: 'No disponible', dot: 'var(--danger)' },
  fin_de_semana: { cls: 's-info', lbl: 'Fin de semana', dot: 'var(--primary)' },
};

export const FincaCard: React.FC<FincaCardProps> = ({ finca, onSelect }) => {
  const images = [...(finca.finca_imagenes || [])].sort((a, b) => a.orden - b.orden);
  const mainImage = images.find(i => i.es_principal)?.url || images[0]?.url ||
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80';

  const precioFormatted = finca.precio_pp ? Number(finca.precio_pp).toLocaleString('es-CO') : null;
  const estadoInfo = estadoMap[finca.estado] || { cls: 's-info', lbl: finca.estado, dot: 'var(--primary)' };
  const planesStr = (finca.finca_planes || []).map(p => p.nombre).join(' · ');

  return (
    <article
      className="prop-card-compact"
      onClick={() => onSelect(finca.id)}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center', minHeight: '88px' }}>
        <div className="prop-thumb">
          <img loading="lazy" src={mainImage} alt={finca.nombre} />
        </div>

        <div className="prop-compact-body">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
              <div className="prop-compact-name">{finca.nombre}</div>
              <span className={`status-badge ${estadoInfo.cls}`} style={{ fontSize: '0.64rem', padding: '0.18rem 0.5rem' }}>
                {estadoInfo.lbl}
              </span>
            </div>

            <div className="prop-compact-sub">
              <span><MapPin size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> {finca.zona || 'Santa Elena, Valle'}</span>
              <span><Users size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Hasta {finca.capacidad} personas</span>
              {precioFormatted && (
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  ${precioFormatted}
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> /pp noche</span>
                </span>
              )}
            </div>

            {planesStr && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
                <Sparkles size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                {planesStr}
              </div>
            )}
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(finca.id);
            }}
            style={{ flexShrink: 0 }}
          >
            <Eye size={14} /> Ver y cotizar
          </button>
        </div>
      </div>

      <div className="prop-status-bar">
        <span className="dot" style={{ background: estadoInfo.dot }} />
        <span>{estadoInfo.lbl} · Capacidad máxima: {finca.capacidad} personas</span>
        {finca.finca_amenidades && finca.finca_amenidades.length > 0 && (
          <span style={{ color: 'var(--text-faint)' }}>· {finca.finca_amenidades.length} amenidades</span>
        )}
      </div>
    </article>
  );
};
