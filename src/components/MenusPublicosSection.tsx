import React, { useState } from 'react';
import {
  UtensilsCrossed, ChevronDown, ChevronUp,
  Image as ImageIcon, Sparkles, CheckCircle2
} from 'lucide-react';
import type { Menu } from '../types';
import { obtenerFotoMenu } from '../utils/menuUtils';

interface MenusPublicosSectionProps {
  visible: boolean;
  titulo: string;
  subtitulo: string;
  badgeTexto: string;
  menus: Menu[];
  waNumber?: string;
}

function formatCOP(v: number) {
  return '$' + (v || 0).toLocaleString('es-CO') + ' COP';
}

const CATEGORIA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Desayuno: { bg: 'rgba(245, 158, 11, 0.12)', text: '#b45309', border: '#f59e0b' },
  Almuerzo: { bg: 'rgba(16, 185, 129, 0.12)', text: '#047857', border: '#10b981' },
  Cena: { bg: 'rgba(99, 102, 241, 0.12)', text: '#4338ca', border: '#6366f1' },
  Parrilla: { bg: 'rgba(239, 68, 68, 0.12)', text: '#b91c1c', border: '#ef4444' },
  Refrigerio: { bg: 'rgba(14, 165, 233, 0.12)', text: '#0369a1', border: '#0ea5e9' },
  'Menú especial': { bg: 'rgba(139, 92, 246, 0.12)', text: '#6d28d9', border: '#8b5cf6' },
  Paquetes: { bg: 'rgba(249, 115, 22, 0.12)', text: '#c2410c', border: '#f97316' },
};

export const MenusPublicosSection: React.FC<MenusPublicosSectionProps> = ({
  visible,
  titulo,
  subtitulo,
  badgeTexto,
  menus,
}) => {
  const menusActivos = menus.filter(m => m.activo);

  // Estado general de la sección: desplegada por defecto
  const [seccionAbierta, setSeccionAbierta] = useState(true);

  // Menú actualmente expandido in-place (acordeón)
  const [menuExpandidoId, setMenuExpandidoId] = useState<string | null>(
    menusActivos[0]?.id || null
  );

  // Índice de foto activa por cada menú
  const [fotoActivaPorMenu, setFotoActivaPorMenu] = useState<Record<string, number>>({});

  if (!visible || menusActivos.length === 0) return null;

  const toggleMenu = (id: string) => {
    setMenuExpandidoId(prev => (prev === id ? null : id));
  };

  const setFotoIndex = (menuId: string, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFotoActivaPorMenu(prev => ({ ...prev, [menuId]: idx }));
  };

  return (
    <section className="menus-publicos-section" style={{ margin: '1.5rem 0', width: '100%', boxSizing: 'border-box' }}>
      {/* ─── Cabecera Desplegable de Gastronomía ─── */}
      <div
        onClick={() => setSeccionAbierta(v => !v)}
        style={{
          background: 'var(--surface)',
          border: `1.5px solid ${seccionAbierta ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 'var(--rad-sm, 10px)',
          padding: '0.85rem 1.1rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
          boxShadow: seccionAbierta ? '0 3px 12px rgba(0,0,0,0.05)' : 'none',
          transition: 'all 0.18s ease',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <UtensilsCrossed size={20} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              {titulo || 'Gastronomía y Menús Campestres'}
            </h2>
            <span className="status-badge s-avail" style={{ fontSize: '0.7rem' }}>
              {menusActivos.length} opción{menusActivos.length !== 1 ? 'es' : ''}
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {subtitulo || 'Platos típicos al fogón de leña, asados campestres y desayunos tradicionales'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {badgeTexto && (
            <span className="status-badge s-info" style={{ fontSize: '0.72rem' }}>
              {badgeTexto}
            </span>
          )}
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={e => {
              e.stopPropagation();
              setSeccionAbierta(v => !v);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.78rem',
              padding: '0.4rem 0.85rem',
            }}
          >
            {seccionAbierta ? (
              <>Ocultar gastronomía <ChevronUp size={14} /></>
            ) : (
              <>Ver menús y fotos <ChevronDown size={14} /></>
            )}
          </button>
        </div>
      </div>

      {/* ─── Ventana Estática con Scroll Interno para Menús ─── */}
      {seccionAbierta && (
        <div className="menus-scroll-window" style={{ marginTop: '0.85rem', animation: 'fadeIn 0.2s ease' }}>
          {/* Barra de estado interna */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.2rem 0.35rem 0.65rem 0.35rem',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '0.65rem',
              fontSize: '0.76rem',
              color: 'var(--text-muted)',
              flexWrap: 'wrap',
              gap: '0.4rem',
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
              {menusActivos.length} menús disponibles para complementar tu estadía
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
              ↕ Desliza para explorar · Toca un menú para ver fotos y detalles
            </span>
          </div>

          {/* Viewport estático con scroll interno */}
          <div className="menus-scroll-viewport">
            {menusActivos.map(m => {
              const isExpanded = menuExpandidoId === m.id;
              const catColor = CATEGORIA_COLORS[m.categoria] || {
                bg: 'rgba(26, 107, 94, 0.12)',
                text: 'var(--primary)',
                border: 'var(--primary)',
              };

              // Recopilar fotos del menú
              const fotosMenu: string[] = [];
              const fotoPrincipal = obtenerFotoMenu(m);
              if (fotoPrincipal) fotosMenu.push(fotoPrincipal);

              if (m.menu_imagenes && m.menu_imagenes.length > 0) {
                [...m.menu_imagenes]
                  .sort((a, b) => a.orden - b.orden)
                  .forEach(img => {
                    if (img.url && !fotosMenu.includes(img.url)) {
                      fotosMenu.push(img.url);
                    }
                  });
              }

              const fotoIdx = fotoActivaPorMenu[m.id] || 0;
              const fotoMostrada = fotosMenu[fotoIdx] || fotosMenu[0] || '';

              return (
                <div
                  key={m.id}
                  className="menu-accordion-item"
                  style={{
                    border: `1.5px solid ${isExpanded ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--rad-xs, 8px)',
                    background: isExpanded
                      ? 'color-mix(in srgb, var(--primary) 3%, var(--surface))'
                      : 'var(--surface)',
                    overflow: 'hidden',
                    transition: 'border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease',
                    boxShadow: isExpanded ? '0 3px 12px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {/* Cabecera del ítem de menú (Clic para expandir/contraer) */}
                  <div
                    onClick={() => toggleMenu(m.id)}
                    style={{
                      padding: '0.75rem 0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleMenu(m.id);
                      }
                    }}
                  >
                    {/* Miniatura cuadrada */}
                    <div
                      style={{
                        width: '68px',
                        height: '68px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: '#0f172a',
                        flexShrink: 0,
                        position: 'relative',
                      }}
                    >
                      {fotoMostrada ? (
                        <img
                          src={fotoMostrada}
                          alt={m.nombre}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)' }}>
                          <UtensilsCrossed size={24} />
                        </div>
                      )}

                      {fotosMenu.length > 1 && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            background: 'rgba(0,0,0,0.72)',
                            backdropFilter: 'blur(3px)',
                            color: '#fff',
                            fontSize: '0.58rem',
                            fontWeight: 700,
                            padding: '0.05rem 0.25rem',
                            borderRadius: '3px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          <ImageIcon size={8} /> {fotosMenu.length}
                        </span>
                      )}
                    </div>

                    {/* Información intermedia */}
                    <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            background: catColor.bg,
                            color: catColor.text,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {m.categoria}
                        </span>
                      </div>

                      <h3
                        style={{
                          fontSize: '0.94rem',
                          fontWeight: 800,
                          color: isExpanded ? 'var(--primary)' : 'var(--text-main)',
                          margin: 0,
                          lineHeight: 1.25,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {m.nombre}
                      </h3>

                      {!isExpanded && m.descripcion && (
                        <p
                          style={{
                            fontSize: '0.73rem',
                            color: 'var(--text-muted)',
                            margin: 0,
                            lineHeight: 1.35,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {m.descripcion}
                        </p>
                      )}
                    </div>

                    {/* Precio y flecha de despliegue */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Tarifa /pp
                        </div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 900, color: 'var(--primary)' }}>
                          {formatCOP(m.precio_pp)}
                        </div>
                      </div>

                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: isExpanded ? 'var(--primary)' : 'var(--surface-sunken)',
                          color: isExpanded ? '#fff' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </div>
                    </div>
                  </div>

                  {/* Cuerpo expandido in-place */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '0.85rem 1rem 1rem 1rem',
                        borderTop: '1px solid var(--border-subtle)',
                        background: 'var(--surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        animation: 'fadeIn 0.2s ease',
                      }}
                    >
                      {/* Galería de imágenes del menú */}
                      {fotoMostrada && (
                        <div>
                          <div
                            style={{
                              position: 'relative',
                              width: '100%',
                              height: '210px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              background: '#0f172a',
                            }}
                          >
                            <img
                              src={fotoMostrada}
                              alt={m.nombre}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />

                            <span
                              style={{
                                position: 'absolute',
                                top: '8px',
                                left: '8px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                background: 'rgba(0,0,0,0.7)',
                                backdropFilter: 'blur(4px)',
                                color: '#fff',
                              }}
                            >
                              {m.categoria}
                            </span>

                            {fotosMenu.length > 1 && (
                              <span
                                style={{
                                  position: 'absolute',
                                  bottom: '8px',
                                  right: '8px',
                                  background: 'rgba(0,0,0,0.7)',
                                  backdropFilter: 'blur(4px)',
                                  color: '#fff',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <ImageIcon size={10} /> {fotoIdx + 1} de {fotosMenu.length}
                              </span>
                            )}
                          </div>

                          {/* Tira interactiva de fotos si hay más de 1 */}
                          {fotosMenu.length > 1 && (
                            <div
                              style={{
                                display: 'flex',
                                gap: '0.4rem',
                                marginTop: '0.5rem',
                                overflowX: 'auto',
                                paddingBottom: '0.2rem',
                              }}
                            >
                              {fotosMenu.map((img, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={e => setFotoIndex(m.id, idx, e)}
                                  style={{
                                    width: '54px',
                                    height: '42px',
                                    borderRadius: '5px',
                                    overflow: 'hidden',
                                    padding: 0,
                                    cursor: 'pointer',
                                    border: `2px solid ${idx === fotoIdx ? 'var(--primary)' : 'var(--border)'}`,
                                    opacity: idx === fotoIdx ? 1 : 0.65,
                                    flexShrink: 0,
                                    transition: 'all 0.15s ease',
                                    background: '#000',
                                  }}
                                >
                                  <img
                                    src={img}
                                    alt=""
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Características y ficha técnica */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Tarifa por persona / servicio
                          </div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>
                            {formatCOP(m.precio_pp)}
                          </div>
                        </div>
                      </div>

                      {/* Descripción detallada */}
                      {m.descripcion && (
                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                            Descripción y contenido del menú:
                          </div>
                          <p
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--text-muted)',
                              lineHeight: 1.5,
                              margin: 0,
                              background: 'var(--surface-sunken)',
                              padding: '0.65rem 0.8rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            {m.descripcion}
                          </p>
                        </div>
                      )}

                      {/* Condiciones necesarias */}
                      {m.condiciones && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.45rem',
                            fontSize: '0.76rem',
                            color: 'var(--text-muted)',
                            background: 'var(--surface-sunken)',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
                          <div>
                            <strong>Condiciones:</strong> {m.condiciones}
                          </div>
                        </div>
                      )}

                      {/* Mensaje informativo claro: Puedes incluirlo en tu cotización (sin botón WhatsApp) */}
                      <div
                        style={{
                          background: 'color-mix(in srgb, var(--primary) 8%, var(--surface))',
                          border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
                          borderRadius: '8px',
                          padding: '0.75rem 0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          fontSize: '0.78rem',
                          color: 'var(--text-main)',
                          lineHeight: 1.45,
                          marginTop: '0.2rem',
                        }}
                      >
                        <Sparkles size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span>
                          <strong>Servicio de alimentación opcional:</strong> Podrás incluir este menú directamente en tu cotización al seleccionar tu finca y configurar la cantidad exacta de comensales.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
