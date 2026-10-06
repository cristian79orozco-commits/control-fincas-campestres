/**
 * MenuSelectorCards.tsx
 * Selector visual y profesional de planes de alimentación complementaria.
 * Permite seleccionar 'Solo alojamiento' o marcar UNO O MÁS menús simultáneamente,
 * con control de servicios para cada menú y cálculo cristalino.
 */

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Utensils, Plus, Minus, Info } from 'lucide-react';
import type { Menu } from '../types';
import { obtenerFotoMenu } from '../utils/menuUtils';

export interface PlanAlimentacionSeleccionado {
  menuId: string;
  nombre: string;
  categoria: string;
  precioPp: number;
  cantidadServicios: number;
}

interface MenuSelectorCardsProps {
  menus: Menu[];
  planesSeleccionados: PlanAlimentacionSeleccionado[];
  soloAlojamiento: boolean;
  onToggleSoloAlojamiento: () => void;
  onToggleMenu: (menu: Menu) => void;
  onCambiarServicios: (menuId: string, cantidad: number) => void;
  loading?: boolean;
}

function formatCOP(v: number) {
  return '$' + (v || 0).toLocaleString('es-CO') + ' COP';
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

export const MenuSelectorCards: React.FC<MenuSelectorCardsProps> = ({
  menus,
  planesSeleccionados,
  soloAlojamiento,
  onToggleSoloAlojamiento,
  onToggleMenu,
  onCambiarServicios,
  loading = false,
}) => {
  const [expandido, setExpandido] = useState(true);
  const [descripcionesAbiertas, setDescripcionesAbiertas] = useState<Record<string, boolean>>({});

  const menusActivos = menus.filter(m => m.activo);

  const toggleDesc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDescripcionesAbiertas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalPlanesElegidos = planesSeleccionados.length;

  return (
    <div style={{ display: 'grid', gap: '0.65rem' }}>
      {/* Encabezado colapsable */}
      <button
        type="button"
        onClick={() => setExpandido(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-sunken)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--rad-xs, 6px)',
          padding: '0.65rem 0.9rem',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Utensils size={15} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
            Planes de alimentación complementaria
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: 'var(--primary)',
              background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
              borderRadius: '20px',
              padding: '0.1rem 0.5rem',
            }}
          >
            {soloAlojamiento
              ? 'Solo alojamiento'
              : totalPlanesElegidos === 1
              ? '1 plan añadido'
              : `${totalPlanesElegidos} planes añadidos`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {expandido ? (
            <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} />
          ) : (
            <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
          )}
        </div>
      </button>

      {/* Contenido expandible */}
      {expandido && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {/* Opción 1: Solo Alojamiento */}
          <div
            onClick={onToggleSoloAlojamiento}
            style={{
              border: `2px solid ${soloAlojamiento ? 'var(--primary)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--rad-xs, 8px)',
              padding: '0.75rem 0.9rem',
              background: soloAlojamiento
                ? 'color-mix(in srgb, var(--primary) 6%, var(--surface))'
                : 'var(--surface)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              transition: 'all 0.15s ease',
            }}
            role="button"
            tabIndex={0}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${soloAlojamiento ? 'var(--primary)' : 'var(--border)'}`,
                  background: soloAlojamiento ? 'var(--primary)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {soloAlojamiento && <Check size={12} color="#fff" strokeWidth={3} />}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                  Solo alojamiento (Sin alimentación adicional)
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Traes tus propios alimentos o cocinas en la finca con cocina equipada.
                </div>
              </div>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              +$0 COP
            </span>
          </div>

          <div
            style={{
              fontSize: '0.74rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginTop: '0.1rem',
            }}
          >
            <Info size={13} style={{ color: 'var(--primary)' }} />
            O selecciona uno o varios planes complementarios para tu grupo:
          </div>

          {/* Grid de Menús Disponibles con Selección Múltiple */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {menusActivos.map(m => {
              const itemSeleccionado = planesSeleccionados.find(p => p.menuId === m.id);
              const isSelected = !!itemSeleccionado;
              const colorCat = CATEGORIA_COLORS[m.categoria] || 'var(--primary)';
              const foto = obtenerFotoMenu(m);
              const isDescOpen = !!descripcionesAbiertas[m.id];
              const serviciosActuales = itemSeleccionado?.cantidadServicios || 1;

              return (
                <div
                  key={m.id}
                  onClick={() => onToggleMenu(m)}
                  style={{
                    border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--rad-xs, 8px)',
                    overflow: 'hidden',
                    background: isSelected
                      ? 'color-mix(in srgb, var(--primary) 4%, var(--surface))'
                      : 'var(--surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    boxShadow: isSelected
                      ? '0 2px 10px rgba(0,0,0,0.08)'
                      : '0 1px 3px rgba(0,0,0,0.04)',
                    position: 'relative',
                  }}
                >
                  {/* Imagen y header de tarjeta */}
                  <div style={{ position: 'relative', height: '100px', background: 'var(--surface-sunken)' }}>
                    {foto ? (
                      <img
                        src={foto}
                        alt={m.nombre}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: `linear-gradient(135deg, ${colorCat}22, ${colorCat}44)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Utensils size={32} style={{ color: colorCat, opacity: 0.7 }} />
                      </div>
                    )}

                    {/* Checkbox circular superior */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.92)',
                        border: `1.5px solid ${isSelected ? 'var(--primary)' : 'rgba(0,0,0,0.2)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                    </div>

                    {/* Badge de categoría */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: '#fff',
                        background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(4px)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                      }}
                    >
                      {m.categoria}
                    </div>
                  </div>

                  {/* Cuerpo informativo */}
                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flexGrow: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.25 }}>
                      {m.nombre}
                    </div>

                    {/* Precio unitario */}
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)' }}>
                      {formatCOP(m.precio_pp)}{' '}
                      <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                        /pp por servicio
                      </span>
                    </div>

                    {/* Descripción truncada / expandible */}
                    {m.descripcion && (
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        <div
                          style={{
                            overflow: isDescOpen ? 'visible' : 'hidden',
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: isDescOpen ? 'unset' : 2,
                          } as React.CSSProperties}
                        >
                          {m.descripcion}
                        </div>
                        {m.descripcion.length > 70 && (
                          <button
                            type="button"
                            onClick={e => toggleDesc(m.id, e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '2px 0 0 0',
                              fontSize: '0.68rem',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            {isDescOpen ? <>Ver menos <ChevronUp size={10} /></> : <>Ver menú completo <ChevronDown size={10} /></>}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Si está seleccionado: Selector de cantidad de servicios */}
                    {isSelected && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          marginTop: 'auto',
                          paddingTop: '0.5rem',
                          borderTop: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          Servicios a contratar:
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => onCambiarServicios(m.id, Math.max(1, serviciosActuales - 1))}
                            disabled={serviciosActuales <= 1}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '4px',
                              border: '1px solid var(--border)',
                              background: 'var(--surface)',
                              cursor: serviciosActuales <= 1 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-main)',
                            }}
                          >
                            <Minus size={12} />
                          </button>

                          <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: 700, fontSize: '0.82rem' }}>
                            {serviciosActuales}
                          </span>

                          <button
                            type="button"
                            onClick={() => onCambiarServicios(m.id, Math.min(30, serviciosActuales + 1))}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '4px',
                              border: '1px solid var(--border)',
                              background: 'var(--surface)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-main)',
                            }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
