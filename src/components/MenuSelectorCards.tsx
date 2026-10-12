/**
 * MenuSelectorCards.tsx
 * Selector visual, persuasivo y profesional de planes de alimentación complementaria.
 * Diseñado para aparecer contraído/colapsado por defecto con un banner invitador y claro,
 * permitiendo al cliente saber de inmediato que puede agregar menús o permanecer en 'Solo alojamiento',
 * con control independiente de servicios y comensales por cada menú seleccionado.
 */

import React, { useState, useMemo } from 'react';
import { Check, ChevronDown, ChevronUp, Utensils, Plus, Minus, Info, Sparkles } from 'lucide-react';
import type { Menu } from '../types';
import { obtenerFotoMenu } from '../utils/menuUtils';

export interface PlanAlimentacionSeleccionado {
  menuId: string;
  nombre: string;
  categoria: string;
  precioPp: number;
  cantidadServicios: number;
  personasAlimentacion?: number;
}

export interface ReglaAlimentacionInfo {
  activa: boolean;
  maxPersonas: number;
  minServicios: number;
  mensaje?: string | null;
  aplica: boolean;
  cumple: boolean;
  totalServicios: number;
}

interface MenuSelectorCardsProps {
  menus: Menu[];
  planesSeleccionados: PlanAlimentacionSeleccionado[];
  soloAlojamiento: boolean;
  onToggleSoloAlojamiento: () => void;
  onToggleMenu: (menu: Menu) => void;
  onCambiarServicios: (menuId: string, cantidad: number) => void;
  onCambiarPersonasMenu?: (menuId: string, cantidad: number) => void;
  loading?: boolean;
  personas?: number;
  reglaAlimentacion?: ReglaAlimentacionInfo;
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
  onCambiarPersonasMenu,
  loading = false,
  personas = 1,
  reglaAlimentacion,
}) => {
  // Por requerimiento expreso del cliente: contraído/colapsado por defecto
  const [expandido, setExpandido] = useState(false);
  const [descripcionesAbiertas, setDescripcionesAbiertas] = useState<Record<string, boolean>>({});

  const menusActivos = menus.filter(m => m.activo);

  const toggleDesc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDescripcionesAbiertas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalPlanesElegidos = planesSeleccionados.length;

  const costoTotalAlimentacion = useMemo(() => {
    if (soloAlojamiento) return 0;
    return planesSeleccionados.reduce((acc, p) => {
      const pers = p.personasAlimentacion ?? personas;
      return acc + (p.precioPp * p.cantidadServicios * pers);
    }, 0);
  }, [soloAlojamiento, planesSeleccionados, personas]);

  const totalPlatosCalculados = useMemo(() => {
    if (soloAlojamiento) return 0;
    return planesSeleccionados.reduce((acc, p) => {
      const pers = p.personasAlimentacion ?? personas;
      return acc + (p.cantidadServicios * pers);
    }, 0);
  }, [soloAlojamiento, planesSeleccionados, personas]);

  return (
    <div style={{ display: 'grid', gap: '0.65rem' }}>
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 1. ESTADO CONTRAÍDO / COLAPSADO (Banner Persuasivo y Cristalino)        */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {!expandido && (
        <div
          onClick={() => setExpandido(true)}
          style={{
            background: 'var(--surface)',
            border: `1.5px solid ${totalPlanesElegidos > 0 ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 'var(--rad-sm, 10px)',
            padding: '0.9rem 1.1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
          }}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpandido(true);
            }
          }}
        >
          {/* Título explicativo con Icono amigable */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: totalPlanesElegidos > 0
                    ? 'color-mix(in srgb, var(--primary) 15%, transparent)'
                    : 'var(--surface-sunken)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'var(--primary)',
                }}
              >
                <Utensils size={18} />
              </div>

              <div>
                <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-main)', lineHeight: 1.3 }}>
                  ¿Deseas incluir servicio de alimentación en tu estadía?
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: 1.4 }}>
                  Opcional: Menús caseros, desayunos típicos, almuerzos campestres o asados preparados en la finca.
                </div>
              </div>
            </div>

            <ChevronDown size={18} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />
          </div>

          {/* Advertencia si aplica regla operativa y no se cumple */}
          {reglaAlimentacion?.aplica && !reglaAlimentacion.cumple && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '6px',
                padding: '0.45rem 0.65rem',
                fontSize: '0.74rem',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>⚠️</span>
              <span>
                Grupos de hasta {reglaAlimentacion.maxPersonas} pers. requieren al menos {reglaAlimentacion.minServicios} servicios de alimentación. Haz clic abajo para agregarlos.
              </span>
            </div>
          )}

          {/* Barra inferior: Estado actual del plan + Botón de acción directo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Selección actual:
              </span>

              {soloAlojamiento || totalPlanesElegidos === 0 ? (
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    background: 'var(--surface-sunken)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>🏠 Solo alojamiento (cocinan en la finca)</span>
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    background: 'color-mix(in srgb, var(--primary) 14%, transparent)',
                    color: 'var(--primary)',
                    border: '1px solid var(--primary)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>
                    🍽️ {totalPlanesElegidos} menú{totalPlanesElegidos !== 1 ? 's' : ''} incluido{totalPlanesElegidos !== 1 ? 's' : ''} ({totalPlatosCalculados} platos) · +{formatCOP(costoTotalAlimentacion)}
                  </span>
                </span>
              )}
            </div>

            {/* Botón visual para desplegar */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setExpandido(true);
              }}
              style={{
                background: totalPlanesElegidos > 0 ? 'var(--primary)' : 'color-mix(in srgb, var(--primary) 12%, var(--surface))',
                color: totalPlanesElegidos > 0 ? '#fff' : 'var(--primary)',
                border: totalPlanesElegidos > 0 ? 'none' : '1.5px solid var(--primary)',
                borderRadius: '6px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: totalPlanesElegidos > 0 ? '0 2px 6px rgba(26, 107, 94, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {soloAlojamiento || totalPlanesElegidos === 0 ? (
                <>
                  <span>+ Ver menús y agregar alimentación</span>
                  <ChevronDown size={14} />
                </>
              ) : (
                <>
                  <span>Modificar menús y comensales</span>
                  <ChevronDown size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 2. ESTADO EXPANDIDO (Catálogo de Menús, Selección y Configuración)       */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {expandido && (
        <div
          style={{
            background: 'var(--surface)',
            border: '2px solid var(--primary)',
            borderRadius: 'var(--rad-sm, 10px)',
            padding: '1rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            display: 'grid',
            gap: '0.85rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* Cabecera cuando está expandido con botón de contraer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
              paddingBottom: '0.65rem',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Utensils size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-main)' }}>
                  Planes de alimentación complementaria
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Puedes agregar uno o varios menús y ajustar cuántos platos deseas para cada uno.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setExpandido(false)}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontWeight: 600,
              }}
            >
              <span>Contraer lista</span>
              <ChevronUp size={14} />
            </button>
          </div>

          {/* Banner de Regla de Alimentación para Grupos Pequeños */}
          {reglaAlimentacion?.aplica && (
            <div
              style={{
                padding: '0.75rem 0.9rem',
                borderRadius: 'var(--rad-xs, 8px)',
                background: reglaAlimentacion.cumple
                  ? 'rgba(16, 185, 129, 0.08)'
                  : 'rgba(245, 158, 11, 0.09)',
                border: `1px solid ${
                  reglaAlimentacion.cumple
                    ? 'rgba(16, 185, 129, 0.35)'
                    : 'rgba(245, 158, 11, 0.4)'
                }`,
                display: 'grid',
                gap: '0.35rem',
                fontSize: '0.8rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}>
                  <span style={{ fontSize: '1rem' }}>⚖️</span>
                  <span style={{ color: reglaAlimentacion.cumple ? '#059669' : '#d97706' }}>
                    {reglaAlimentacion.cumple
                      ? 'Requisito de alimentación completado'
                      : `Política para grupos de hasta ${reglaAlimentacion.maxPersonas} personas`}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '12px',
                    background: reglaAlimentacion.cumple ? '#10b981' : '#f59e0b',
                    color: '#fff',
                  }}
                >
                  {reglaAlimentacion.totalServicios} / {reglaAlimentacion.minServicios} servicios elegidos
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {reglaAlimentacion.mensaje ||
                  `Para garantizar la atención y rentabilidad operativa en grupos de ${personas} personas, se requiere elegir como mínimo ${reglaAlimentacion.minServicios} servicios de alimentación (ej. Desayuno y Almuerzo).`}
              </div>
            </div>
          )}

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
                  Solo alojamiento (Sin servicio de alimentación)
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Traes tus propios alimentos o cocinas con tu grupo en la cocina equipada de la finca.
                </div>
                {reglaAlimentacion?.aplica && !reglaAlimentacion.cumple && (
                  <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600, marginTop: '0.2rem' }}>
                    ⚠️ Tu grupo ({personas} pers.) requiere contratar al menos {reglaAlimentacion.minServicios} servicios de alimentación.
                  </div>
                )}
              </div>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              +$0 COP
            </span>
          </div>

          {/* Separador e instrucción */}
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginTop: '0.2rem',
            }}
          >
            <Sparkles size={14} style={{ color: 'var(--primary)' }} />
            <span>O selecciona los menús que deseas agregar a tu estadía:</span>
          </div>

          {/* Grid de Menús Disponibles */}
          {loading ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
              Cargando menús disponibles...
            </div>
          ) : menusActivos.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
              No hay menús disponibles en este momento.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
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
                const personasActuales = itemSeleccionado?.personasAlimentacion ?? personas;

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
                    <div style={{ position: 'relative', height: '110px', background: 'var(--surface-sunken)' }}>
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

                      {/* Checkbox superior */}
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

                      {/* Botón de Agregar / Quitar explícito para máxima claridad */}
                      <div style={{ marginTop: '0.1rem' }}>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onToggleMenu(m);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.35rem 0.5rem',
                            borderRadius: '5px',
                            border: `1px solid ${isSelected ? 'var(--danger)' : 'var(--primary)'}`,
                            background: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'color-mix(in srgb, var(--primary) 10%, transparent)',
                            color: isSelected ? 'var(--danger)' : 'var(--primary)',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isSelected ? (
                            <span>✓ Quitar este menú de la reserva</span>
                          ) : (
                            <span>+ Agregar este menú</span>
                          )}
                        </button>
                      </div>

                      {/* Descripción truncada / expandible */}
                      {m.descripcion && (
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.4, marginTop: '0.2rem' }}>
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

                      {/* Si está seleccionado: Configuración de servicios y comensales */}
                      {isSelected && (
                        <div
                          onClick={e => e.stopPropagation()}
                          style={{
                            marginTop: 'auto',
                            paddingTop: '0.65rem',
                            borderTop: '1px solid var(--border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.55rem',
                          }}
                        >
                          {/* 1. Selector de cantidad de servicios */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.5rem',
                            }}
                          >
                            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              Servicios (comidas):
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
                                title="Disminuir servicios"
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
                                title="Aumentar servicios"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>

                          {/* 2. Selector de cantidad de comensales / platos */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.5rem',
                              background: 'var(--surface-sunken)',
                              padding: '0.35rem 0.5rem',
                              borderRadius: '5px',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                Comensales / Platos:
                              </div>
                              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                                {personasActuales === personas
                                  ? `Para los ${personas} huéspedes`
                                  : `${personasActuales} de ${personas} huéspedes`}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() => onCambiarPersonasMenu && onCambiarPersonasMenu(m.id, Math.max(1, personasActuales - 1))}
                                disabled={personasActuales <= 1}
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border)',
                                  background: 'var(--surface)',
                                  cursor: personasActuales <= 1 ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--text-main)',
                                }}
                                title="Disminuir comensales"
                              >
                                <Minus size={12} />
                              </button>

                              <span
                                style={{
                                  minWidth: '24px',
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.82rem',
                                  color: personasActuales < personas ? 'var(--primary)' : 'var(--text-main)',
                                }}
                              >
                                {personasActuales}
                              </span>

                              <button
                                type="button"
                                onClick={() => onCambiarPersonasMenu && onCambiarPersonasMenu(m.id, Math.min(100, personasActuales + 1))}
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
                                title="Aumentar comensales"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>

                          {/* 3. Subtotal transparente para este plan */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.72rem',
                              color: 'var(--primary)',
                              fontWeight: 700,
                              paddingTop: '0.2rem',
                              borderTop: '1px dashed var(--border-subtle)',
                            }}
                          >
                            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                              {serviciosActuales} serv. × {personasActuales} pers.:
                            </span>
                            <span>
                              {formatCOP(m.precio_pp * serviciosActuales * personasActuales)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────── */}
          {/* Botón de Confirmación / Retorno al Cotizador                             */}
          {/* ──────────────────────────────────────────────────────────────────────── */}
          <div
            style={{
              marginTop: '0.4rem',
              paddingTop: '0.85rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              {soloAlojamiento || totalPlanesElegidos === 0 ? (
                <span>Has elegido: <strong>Solo alojamiento</strong></span>
              ) : (
                <span>
                  Has elegido: <strong>{totalPlanesElegidos} menú{totalPlanesElegidos !== 1 ? 's' : ''}</strong> (+{formatCOP(costoTotalAlimentacion)})
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setExpandido(false)}
              className="btn btn-primary"
              style={{
                padding: '0.55rem 1.15rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 8px rgba(26, 107, 94, 0.2)',
              }}
            >
              <Check size={14} />
              <span>Listo, continuar con la cotización</span>
              <ChevronUp size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
