/**
 * MenuSelectorCards.tsx
 * Fase 2 — Galería visual de planes de alimentación.
 * Reemplaza el <select> simple del cotizador por tarjetas interactivas.
 */

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Utensils, X } from 'lucide-react';
import type { Menu } from '../types';
import { obtenerFotoMenu } from '../utils/menuUtils';

interface MenuSelectorCardsProps {
  menus: Menu[];
  planSeleccionado: string; // nombre del plan o 'Sin alimentación'
  onSelect: (nombrePlan: string) => void;
  loading?: boolean;
}

// ─── Skeleton Card para menús ─────────────────────────────────────────────────
const SkeletonMenuCard: React.FC = () => (
  <div style={{
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--rad-sm, 10px)',
    overflow: 'hidden',
    background: 'var(--surface)',
  }}>
    <div className="skeleton-box" style={{ width: '100%', height: '110px', borderRadius: 0 }} />
    <div style={{ padding: '0.75rem', display: 'grid', gap: '0.45rem' }}>
      <div className="skeleton-box" style={{ height: '14px', width: '40%' }} />
      <div className="skeleton-box" style={{ height: '16px', width: '70%' }} />
      <div className="skeleton-box" style={{ height: '18px', width: '50%' }} />
    </div>
  </div>
);

function formatCOP(v: number) {
  return '$' + (v || 0).toLocaleString('es-CO');
}

const CATEGORIA_COLORS: Record<string, string> = {
  Desayuno: '#f59e0b',
  Almuerzo: '#10b981',
  Cena: '#6366f1',
  Parrilla: '#ef4444',
  Refrigerio: '#0ea5e9',
  'Menú especial': '#8b5cf6',
  Paquetes: '#f97316',
};

// -------------------------------------------------------------------
// Tarjeta individual de menú
// -------------------------------------------------------------------
interface MenuCardProps {
  menu: Menu;
  isSelected: boolean;
  onSelect: () => void;
}

const MenuCard: React.FC<MenuCardProps> = ({ menu, isSelected, onSelect }) => {
  const [expandDesc, setExpandDesc] = useState(false);
  const colorCategoria = CATEGORIA_COLORS[menu.categoria] || 'var(--primary)';
  const foto = obtenerFotoMenu(menu);

  return (
    <div
      onClick={onSelect}
      style={{
        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--rad-sm, 10px)',
        overflow: 'hidden',
        cursor: 'pointer',
        background: isSelected ? 'var(--surface-raised, #fff)' : 'var(--surface, #fff)',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease',
        boxShadow: isSelected
          ? '0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent), 0 4px 16px rgba(0,0,0,0.10)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        transform: isSelected ? 'translateY(-1px)' : 'none',
        position: 'relative',
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect()}
    >
      {/* Check de selección */}
      {isSelected && (
        <div style={{
          position: 'absolute', top: '8px', right: '8px', zIndex: 2,
          background: 'var(--primary)',
          borderRadius: '50%',
          width: '22px', height: '22px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
        }}>
          <Check size={13} color="#fff" strokeWidth={3} />
        </div>
      )}

      {/* Imagen */}
      {foto ? (
        <img
          src={foto}
          alt={menu.nombre}
          loading="lazy"
          style={{
            width: '100%',
            height: '110px',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <div style={{
          width: '100%', height: '110px',
          background: `linear-gradient(135deg, ${colorCategoria}22, ${colorCategoria}44)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Utensils size={36} style={{ color: colorCategoria, opacity: 0.7 }} />
        </div>
      )}

      {/* Cuerpo de la tarjeta */}
      <div style={{ padding: '0.75rem', display: 'grid', gap: '0.35rem' }}>
        {/* Badge de categoría */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.67rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: colorCategoria,
          background: `${colorCategoria}18`,
          borderRadius: '20px',
          padding: '0.15rem 0.55rem',
          width: 'fit-content',
        }}>
          {menu.categoria}
        </span>

        {/* Nombre */}
        <div style={{
          fontWeight: 700,
          fontSize: '0.88rem',
          color: 'var(--text-main)',
          lineHeight: 1.25,
        }}>
          {menu.nombre}
        </div>

        {/* Descripción (truncada / expandible) */}
        {menu.descripcion && (
          <div style={{ position: 'relative' }}>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                lineHeight: 1.45,
                overflow: expandDesc ? 'visible' : 'hidden',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: expandDesc ? 'unset' : 2,
              } as React.CSSProperties}
            >
              {menu.descripcion}
            </div>
            {menu.descripcion.length > 80 && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setExpandDesc(v => !v); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.7rem', color: 'var(--primary)', padding: '0',
                  display: 'flex', alignItems: 'center', gap: '2px',
                  marginTop: '2px',
                }}
              >
                {expandDesc ? <><ChevronUp size={11} /> Ver menos</> : <><ChevronDown size={11} /> Ver más</>}
              </button>
            )}
          </div>
        )}

        {/* Precio por persona */}
        <div style={{
          fontWeight: 800,
          fontSize: '1rem',
          color: 'var(--primary)',
          marginTop: '0.15rem',
        }}>
          {formatCOP(menu.precio_pp)} <span style={{ fontWeight: 400, fontSize: '0.72rem', color: 'var(--text-muted)' }}>/pp</span>
        </div>

        {/* Condiciones */}
        {menu.condiciones && (
          <div style={{
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            lineHeight: 1.35,
          }}>
            ℹ️ {menu.condiciones}
          </div>
        )}

        {/* Botón de selección */}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onSelect(); }}
          style={{
            marginTop: '0.4rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
            background: isSelected ? 'var(--primary)' : 'transparent',
            color: isSelected ? '#fff' : 'var(--primary)',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.3rem',
            transition: 'all 0.15s ease',
          }}
        >
          {isSelected ? <><Check size={12} /> Seleccionado</> : 'Seleccionar'}
        </button>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------
// Tarjeta especial "Sin alimentación"
// -------------------------------------------------------------------
interface SinAlimentacionCardProps {
  isSelected: boolean;
  onSelect: () => void;
}

const SinAlimentacionCard: React.FC<SinAlimentacionCardProps> = ({ isSelected, onSelect }) => (
  <div
    onClick={onSelect}
    style={{
      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
      borderRadius: 'var(--rad-sm, 10px)',
      overflow: 'hidden',
      cursor: 'pointer',
      background: isSelected ? 'var(--surface-raised, #fff)' : 'var(--surface, #fff)',
      transition: 'border-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease',
      boxShadow: isSelected
        ? '0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent), 0 4px 16px rgba(0,0,0,0.10)'
        : '0 1px 4px rgba(0,0,0,0.06)',
      transform: isSelected ? 'translateY(-1px)' : 'none',
      position: 'relative',
    }}
    role="button"
    tabIndex={0}
    aria-pressed={isSelected}
    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect()}
  >
    {isSelected && (
      <div style={{
        position: 'absolute', top: '8px', right: '8px', zIndex: 2,
        background: 'var(--primary)',
        borderRadius: '50%',
        width: '22px', height: '22px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
      }}>
        <Check size={13} color="#fff" strokeWidth={3} />
      </div>
    )}

    {/* Imagen / placeholder de Sin alimentación */}
    <div style={{
      width: '100%', height: '110px',
      background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      <Utensils size={36} style={{ color: '#94a3b8', opacity: 0.5 }} />
      {/* Línea tachada */}
      <div style={{
        position: 'absolute',
        width: '48px', height: '2px',
        background: '#94a3b8',
        transform: 'rotate(-35deg)',
        borderRadius: '2px',
        opacity: 0.6,
      }} />
    </div>

    <div style={{ padding: '0.75rem', display: 'grid', gap: '0.35rem' }}>
      <span style={{
        fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.04em',
        textTransform: 'uppercase', color: '#64748b',
        background: '#f1f5f9', borderRadius: '20px',
        padding: '0.15rem 0.55rem', width: 'fit-content',
      }}>
        Solo alojamiento
      </span>

      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
        Sin alimentación
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
        Solo alojamiento incluido. Puedes traer tus propios alimentos.
      </div>

      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#64748b', marginTop: '0.15rem' }}>
        +$0 <span style={{ fontWeight: 400, fontSize: '0.72rem', color: 'var(--text-muted)' }}>incluido</span>
      </div>

      <button
        type="button"
        onClick={e => { e.stopPropagation(); onSelect(); }}
        style={{
          marginTop: '0.4rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '6px',
          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
          background: isSelected ? 'var(--primary)' : 'transparent',
          color: isSelected ? '#fff' : 'var(--primary)',
          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
          transition: 'all 0.15s ease',
        }}
      >
        {isSelected ? <><Check size={12} /> Seleccionado</> : 'Seleccionar'}
      </button>
    </div>
  </div>
);

// -------------------------------------------------------------------
// Componente principal: MenuSelectorCards
// -------------------------------------------------------------------
export const MenuSelectorCards: React.FC<MenuSelectorCardsProps> = ({
  menus,
  planSeleccionado,
  onSelect,
  loading = false,
}) => {
  const [expandido, setExpandido] = useState(true);

  const menusActivos = menus.filter(m => m.activo);
  const sinAlimentacionSeleccionado = !planSeleccionado || planSeleccionado === 'Sin alimentación';

  // Nombre del plan seleccionado para mostrar en el header cuando está colapsado
  const labelSeleccionado = sinAlimentacionSeleccionado
    ? 'Sin alimentación'
    : planSeleccionado;

  const totalPlanes = menusActivos.length + 1; // +1 por "Sin alimentación"

  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      {/* Header colapsable */}
      <button
        type="button"
        onClick={() => setExpandido(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-sunken)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--rad-xs)',
          padding: '0.65rem 0.9rem',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          transition: 'background 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Utensils size={14} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-main)' }}>
            Planes de alimentación
          </span>
          <span style={{
            fontSize: '0.68rem', fontWeight: 600,
            color: 'var(--primary)',
            background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
            borderRadius: '20px',
            padding: '0.1rem 0.5rem',
          }}>
            {totalPlanes} disponibles
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Muestra selección actual cuando está colapsado */}
          {!expandido && (
            <span style={{
              fontSize: '0.72rem', fontWeight: 600,
              color: sinAlimentacionSeleccionado ? 'var(--text-muted)' : 'var(--primary)',
              background: sinAlimentacionSeleccionado
                ? 'var(--border-subtle)'
                : 'color-mix(in srgb, var(--primary) 12%, transparent)',
              borderRadius: '20px',
              padding: '0.15rem 0.6rem',
              display: 'flex', alignItems: 'center', gap: '0.25rem',
            }}>
              {!sinAlimentacionSeleccionado && <Check size={10} />}
              {labelSeleccionado}
            </span>
          )}
          {expandido
            ? <ChevronUp size={15} style={{ color: 'var(--text-muted)', transition: 'transform 0.2s' }} />
            : <ChevronDown size={15} style={{ color: 'var(--text-muted)', transition: 'transform 0.2s' }} />
          }
        </div>
      </button>

      {/* Grid de tarjetas (colapsable) */}
      {expandido && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
          gap: '0.75rem',
          animation: 'fadeInDown 0.18s ease',
        }}>
          {loading ? (
            <>
              {[1, 2, 3].map(n => (
                <SkeletonMenuCard key={n} />
              ))}
            </>
          ) : (
            <>
              {/* Tarjeta: Sin alimentación */}
              <SinAlimentacionCard
                isSelected={sinAlimentacionSeleccionado}
                onSelect={() => onSelect('Sin alimentación')}
              />

              {/* Tarjetas de menús activos */}
              {menusActivos.map(menu => (
                <MenuCard
                  key={menu.id}
                  menu={menu}
                  isSelected={planSeleccionado === menu.nombre}
                  onSelect={() => onSelect(menu.nombre)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Chip "borrar selección" cuando hay un menú seleccionado y el panel está colapsado */}
      {!expandido && !sinAlimentacionSeleccionado && (
        <button
          type="button"
          onClick={() => onSelect('Sin alimentación')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.72rem', color: 'var(--text-muted)',
            padding: '0', width: 'fit-content',
          }}
        >
          <X size={12} /> Quitar alimentación
        </button>
      )}
    </div>
  );
};
