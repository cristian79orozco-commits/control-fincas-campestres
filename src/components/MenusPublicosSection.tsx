import React from 'react';
import {
  UtensilsCrossed, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Image as ImageIcon, Sparkles, CheckCircle2, ZoomIn,
  Coffee, Flame, Sunset, Apple, Package, ArrowRight
} from 'lucide-react';
import type { Menu, MenuCategoria } from '../types';
import { useMenusPublicosController } from '../hooks/useMenusPublicosController';
import { GalleryLightbox } from './GalleryLightbox';

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
  Desayuno: { bg: 'rgba(245, 158, 11, 0.14)', text: '#b45309', border: '#f59e0b' },
  Almuerzo: { bg: 'rgba(16, 185, 129, 0.14)', text: '#047857', border: '#10b981' },
  Cena: { bg: 'rgba(99, 102, 241, 0.14)', text: '#4338ca', border: '#6366f1' },
  Parrilla: { bg: 'rgba(239, 68, 68, 0.14)', text: '#b91c1c', border: '#ef4444' },
  Refrigerio: { bg: 'rgba(14, 165, 233, 0.14)', text: '#0369a1', border: '#0ea5e9' },
  'Menú especial': { bg: 'rgba(139, 92, 246, 0.14)', text: '#6d28d9', border: '#8b5cf6' },
  Paquetes: { bg: 'rgba(249, 115, 22, 0.14)', text: '#c2410c', border: '#f97316' },
};

const CATEGORIA_ICONS: Record<MenuCategoria, React.ReactNode> = {
  Desayuno: <Coffee size={13} />,
  Almuerzo: <UtensilsCrossed size={13} />,
  Cena: <Sunset size={13} />,
  Parrilla: <Flame size={13} />,
  Refrigerio: <Apple size={13} />,
  'Menú especial': <Sparkles size={13} />,
  Paquetes: <Package size={13} />,
};

export const MenusPublicosSection: React.FC<MenusPublicosSectionProps> = React.memo(({
  visible,
  titulo,
  subtitulo,
  badgeTexto,
  menus,
}) => {
  const {
    menusActivos,
    menusFiltrados,
    categoriasConConteo,
    categoriaActiva,
    seleccionarCategoria,
    seccionAbierta,
    toggleSeccion,
    menuExpandidoId,
    toggleMenu,
    fotoActivaPorMenu,
    setFotoIndex,
    cambiarFotoRelativa,
    galeriasPorMenu,
    marcarImagenRota,
    lightbox,
    abrirLightboxMenu,
    cerrarLightbox,
    setLightboxIndex,
    irACatalogoFincas,
  } = useMenusPublicosController(menus);

  if (!visible || menusActivos.length === 0) return null;

  return (
    <section className="menus-publicos-section" style={{ margin: '1.5rem 0', width: '100%', boxSizing: 'border-box' }}>
      {/* ─── Cabecera Desplegable High-End de Gastronomía ─── */}
      <div
        onClick={() => toggleSeccion()}
        style={{
          background: 'var(--surface)',
          border: `1.5px solid ${seccionAbierta ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 'var(--rad-sm, 14px)',
          padding: '0.95rem 1.2rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.85rem',
          flexWrap: 'wrap',
          boxShadow: seccionAbierta ? 'var(--sh-sm)' : 'none',
          transition: 'all 0.2s ease',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
            <UtensilsCrossed size={20} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              {titulo || 'Gastronomía y Menús Campestres'}
            </h2>
            <span className="status-badge s-avail" style={{ fontSize: '0.72rem' }}>
              {menusActivos.length} opción{menusActivos.length !== 1 ? 'es' : ''}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>
            {subtitulo || 'Platos típicos al fogón de leña, asados campestres y desayunos tradicionales'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          {badgeTexto && (
            <span className="status-badge s-info" style={{ fontSize: '0.72rem' }}>
              {badgeTexto}
            </span>
          )}
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={toggleSeccion}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.78rem',
              padding: '0.42rem 0.9rem',
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

      {/* ─── Ventana Estática con Filtros y Scroll Interno para Menús ─── */}
      {seccionAbierta && (
        <div className="menus-scroll-window" style={{ marginTop: '0.85rem', animation: 'fadeIn 0.2s ease' }}>
          {/* Barra superior de estado e instrucciones */}
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
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>
              {menusFiltrados.length} {menusFiltrados.length === 1 ? 'menú disponible' : 'menús disponibles'}
              {categoriaActiva !== 'todas' ? ` en ${categoriaActiva}` : ' para complementar tu estadía'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.73rem', color: 'var(--primary)', fontWeight: 600 }}>
              🔍 Toca cualquier menú para desplegar o clic en la imagen para pantalla completa
            </span>
          </div>

          {/* Barra de Filtros Rápidos por Categoría (Solo si hay más de 1 categoría activa) */}
          {categoriasConConteo.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                overflowX: 'auto',
                padding: '0.1rem 0.2rem 0.65rem 0.2rem',
                marginBottom: '0.35rem',
                scrollbarWidth: 'thin',
              }}
            >
              <button
                type="button"
                onClick={() => seleccionarCategoria('todas')}
                style={{
                  minHeight: '34px',
                  padding: '0.3rem 0.8rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  border: categoriaActiva === 'todas' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                  background: categoriaActiva === 'todas' ? 'var(--primary)' : 'var(--surface-2)',
                  color: categoriaActiva === 'todas' ? '#fff' : 'var(--text)',
                  transition: 'all 0.18s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>Todos ({menusActivos.length})</span>
              </button>

              {categoriasConConteo.map(({ categoria, count }) => {
                const isAct = categoriaActiva === categoria;
                return (
                  <button
                    key={categoria}
                    type="button"
                    onClick={() => seleccionarCategoria(categoria)}
                    style={{
                      minHeight: '34px',
                      padding: '0.3rem 0.8rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: isAct ? 700 : 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      border: isAct ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                      background: isAct ? 'var(--primary)' : 'var(--surface-2)',
                      color: isAct ? '#fff' : 'var(--text)',
                      transition: 'all 0.18s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    {CATEGORIA_ICONS[categoria]}
                    <span>{categoria} ({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Viewport estático con scroll interno */}
          <div className="menus-scroll-viewport">
            {menusFiltrados.map(m => {
              const isExpanded = menuExpandidoId === m.id;
              const catColor = CATEGORIA_COLORS[m.categoria] || {
                bg: 'rgba(26, 107, 94, 0.12)',
                text: 'var(--primary)',
                border: 'var(--primary)',
              };

              const fotosMenu = galeriasPorMenu[m.id] || [];
              const rawIdx = fotoActivaPorMenu[m.id] || 0;
              const fotoIdx = fotosMenu.length > 0 ? Math.min(rawIdx, fotosMenu.length - 1) : 0;
              const fotoMostrada = fotosMenu[fotoIdx] || fotosMenu[0] || '';

              return (
                <div
                  key={m.id}
                  className="menu-accordion-item"
                  style={{
                    border: `1.5px solid ${isExpanded ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--rad-xs, 10px)',
                    background: isExpanded
                      ? 'color-mix(in srgb, var(--primary) 3%, var(--surface))'
                      : 'var(--surface)',
                    overflow: 'hidden',
                    transition: 'border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease',
                    boxShadow: isExpanded ? 'var(--sh-sm)' : 'none',
                  }}
                >
                  {/* Cabecera del ítem de menú (Clic para expandir/contraer) */}
                  <div
                    onClick={() => toggleMenu(m.id)}
                    style={{
                      padding: '0.75rem 0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.8rem',
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
                    {/* Miniatura con contraste cálido para PNG/WebP transparentes y clic directo a Lightbox */}
                    <div
                      onClick={e => {
                        if (fotoMostrada) {
                          abrirLightboxMenu(fotosMenu, fotoIdx, m.nombre, m.categoria, e);
                        }
                      }}
                      title={fotoMostrada ? 'Clic para ampliar imagen' : m.nombre}
                      style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: 'linear-gradient(145deg, #FFFDF9 0%, #F4EFE4 100%)',
                        border: '1px solid var(--border)',
                        flexShrink: 0,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: fotoMostrada ? 'zoom-in' : 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                      }}
                    >
                      {fotoMostrada ? (
                        <img
                          src={fotoMostrada}
                          alt={m.nombre}
                          loading="lazy"
                          decoding="async"
                          onError={() => marcarImagenRota(fotoMostrada)}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            padding: '3px',
                          }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                          <UtensilsCrossed size={24} />
                        </div>
                      )}

                      {fotoMostrada && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '3px',
                            right: '3px',
                            background: 'rgba(20, 18, 16, 0.76)',
                            backdropFilter: 'blur(3px)',
                            color: '#fff',
                            fontSize: '0.58rem',
                            fontWeight: 700,
                            padding: '0.08rem 0.28rem',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          {fotosMenu.length > 1 ? (
                            <><ImageIcon size={8} /> {fotosMenu.length}</>
                          ) : (
                            <ZoomIn size={9} />
                          )}
                        </span>
                      )}
                    </div>

                    {/* Información intermedia */}
                    <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '0.12rem 0.48rem',
                            borderRadius: '4px',
                            background: catColor.bg,
                            color: catColor.text,
                            letterSpacing: '0.02em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          {CATEGORIA_ICONS[m.categoria]}
                          {m.categoria}
                        </span>
                      </div>

                      <h3
                        style={{
                          fontSize: '0.96rem',
                          fontWeight: 800,
                          color: isExpanded ? 'var(--primary)' : 'var(--text)',
                          margin: 0,
                          lineHeight: 1.3,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          wordBreak: 'break-word',
                        }}
                      >
                        {m.nombre}
                      </h3>

                      {!isExpanded && m.descripcion && (
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            margin: 0,
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {m.descripcion}
                        </p>
                      )}
                    </div>

                    {/* Precio y flecha de despliegue */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0, marginLeft: 'auto' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Tarifa /pp
                        </div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 900, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                          {formatCOP(m.precio_pp)}
                        </div>
                      </div>

                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: isExpanded ? 'var(--primary)' : 'var(--surface-sunken)',
                          color: isExpanded ? '#fff' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                          flexShrink: 0,
                        }}
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </div>
                    </div>
                  </div>

                  {/* Cuerpo expandido in-place */}
                  {isExpanded && (
                    <div className="menu-expanded-container">
                      <div
                        className="menu-expanded-grid"
                        style={{ gridTemplateColumns: fotoMostrada ? undefined : '1fr' }}
                      >
                        {/* Columna Izquierda: Visor de Imagen Completo sin recortes + Clic para Lightbox */}
                        {fotoMostrada && (
                          <div style={{ width: '100%', minWidth: 0 }}>
                            <div
                              onClick={e => abrirLightboxMenu(fotosMenu, fotoIdx, m.nombre, m.categoria, e)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  abrirLightboxMenu(fotosMenu, fotoIdx, m.nombre, m.categoria);
                                }
                              }}
                              title="Haz clic para ver la imagen en tamaño completo"
                              style={{
                                position: 'relative',
                                width: '100%',
                                minHeight: '220px',
                                maxHeight: '270px',
                                aspectRatio: '16 / 10',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                background: 'linear-gradient(145deg, #FFFDF9 0%, #F2ECE0 100%)',
                                border: '1px solid var(--border)',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.07)',
                                cursor: 'zoom-in',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {/* Halo ambiental desenfocado para llenar bordes sin recortar la foto real */}
                              <img
                                src={fotoMostrada}
                                alt=""
                                aria-hidden="true"
                                loading="lazy"
                                decoding="async"
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  filter: 'blur(20px) saturate(1.15)',
                                  opacity: 0.16,
                                  transform: 'scale(1.1)',
                                  pointerEvents: 'none',
                                }}
                              />

                              {/* Imagen principal en proporción real (sin mutilar bordes ni oscurecer PNGs) */}
                              <img
                                src={fotoMostrada}
                                alt={m.nombre}
                                loading="lazy"
                                decoding="async"
                                onError={() => marcarImagenRota(fotoMostrada)}
                                style={{
                                  position: 'relative',
                                  zIndex: 1,
                                  width: '100%',
                                  height: '100%',
                                  maxHeight: '260px',
                                  objectFit: 'contain',
                                  padding: '0.45rem',
                                  transition: 'transform 0.22s ease',
                                }}
                              />

                              {/* Badge de categoría superior izquierdo */}
                              <span
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  left: '8px',
                                  zIndex: 2,
                                  fontSize: '0.64rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  padding: '0.18rem 0.52rem',
                                  borderRadius: '5px',
                                  background: 'rgba(20, 18, 16, 0.76)',
                                  backdropFilter: 'blur(4px)',
                                  color: '#fff',
                                  letterSpacing: '0.02em',
                                }}
                              >
                                {m.categoria}
                              </span>

                              {/* Botón visual de ampliación */}
                              <span
                                style={{
                                  position: 'absolute',
                                  bottom: '8px',
                                  left: '8px',
                                  zIndex: 2,
                                  background: 'rgba(20, 18, 16, 0.78)',
                                  backdropFilter: 'blur(4px)',
                                  color: '#fff',
                                  fontSize: '0.66rem',
                                  fontWeight: 600,
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                }}
                              >
                                <ZoomIn size={11} /> Clic para ampliar
                              </span>

                              {/* Flechas prev/next si el menú tiene múltiples fotos */}
                              {fotosMenu.length > 1 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={e => cambiarFotoRelativa(m.id, fotosMenu.length, -1, e)}
                                    title="Foto anterior"
                                    style={{
                                      position: 'absolute',
                                      left: '8px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      zIndex: 3,
                                      width: '30px',
                                      height: '30px',
                                      borderRadius: '50%',
                                      background: 'rgba(20, 18, 16, 0.72)',
                                      color: '#fff',
                                      border: '1px solid rgba(255,255,255,0.25)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <ChevronLeft size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={e => cambiarFotoRelativa(m.id, fotosMenu.length, 1, e)}
                                    title="Siguiente foto"
                                    style={{
                                      position: 'absolute',
                                      right: '8px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      zIndex: 3,
                                      width: '30px',
                                      height: '30px',
                                      borderRadius: '50%',
                                      background: 'rgba(20, 18, 16, 0.72)',
                                      color: '#fff',
                                      border: '1px solid rgba(255,255,255,0.25)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <ChevronRight size={16} />
                                  </button>
                                  <span
                                    style={{
                                      position: 'absolute',
                                      bottom: '8px',
                                      right: '8px',
                                      zIndex: 2,
                                      background: 'rgba(20, 18, 16, 0.78)',
                                      backdropFilter: 'blur(4px)',
                                      color: '#fff',
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                      padding: '0.18rem 0.5rem',
                                      borderRadius: '5px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    <ImageIcon size={10} /> {fotoIdx + 1} de {fotosMenu.length}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Tira interactiva de miniaturas si hay más de 1 foto */}
                            {fotosMenu.length > 1 && (
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '0.45rem',
                                  marginTop: '0.55rem',
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
                                      width: '58px',
                                      height: '44px',
                                      borderRadius: '6px',
                                      overflow: 'hidden',
                                      padding: '2px',
                                      cursor: 'pointer',
                                      border: `2px solid ${idx === fotoIdx ? 'var(--primary)' : 'var(--border)'}`,
                                      opacity: idx === fotoIdx ? 1 : 0.7,
                                      flexShrink: 0,
                                      transition: 'all 0.15s ease',
                                      background: 'linear-gradient(145deg, #FFFDF9 0%, #F4EFE4 100%)',
                                    }}
                                    title={`Ver foto ${idx + 1}`}
                                  >
                                    <img
                                      src={img}
                                      alt=""
                                      loading="lazy"
                                      decoding="async"
                                      onError={() => marcarImagenRota(img)}
                                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Columna Derecha: Información detallada, condiciones y CTA */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
                          {/* Cabecera del detalle */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div>
                              <span
                                style={{
                                  fontSize: '0.64rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  padding: '0.14rem 0.5rem',
                                  borderRadius: '4px',
                                  background: catColor.bg,
                                  color: catColor.text,
                                  letterSpacing: '0.02em',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                {CATEGORIA_ICONS[m.categoria]}
                                {m.categoria}
                              </span>
                              <h4 style={{ fontSize: '1.08rem', fontWeight: 800, margin: '0.35rem 0 0 0', color: 'var(--text)', lineHeight: 1.3 }}>
                                {m.nombre}
                              </h4>
                            </div>

                            <div
                              style={{
                                textAlign: 'right',
                                background: 'var(--surface-sunken)',
                                padding: '0.45rem 0.8rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-subtle)',
                                flexShrink: 0,
                              }}
                            >
                              <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                                Tarifa por persona
                              </div>
                              <div style={{ fontSize: '1.12rem', fontWeight: 900, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                                {formatCOP(m.precio_pp)}
                              </div>
                            </div>
                          </div>

                          {/* Descripción detallada con interlineado relajado */}
                          {m.descripcion && (
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.25rem' }}>
                                Descripción y contenido del menú:
                              </div>
                              <p
                                style={{
                                  fontSize: '0.82rem',
                                  color: 'var(--text-muted)',
                                  lineHeight: 1.6,
                                  margin: 0,
                                  background: 'var(--surface-sunken)',
                                  padding: '0.7rem 0.85rem',
                                  borderRadius: '8px',
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
                                fontSize: '0.78rem',
                                color: 'var(--text-muted)',
                                background: 'var(--surface-sunken)',
                                padding: '0.6rem 0.8rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-subtle)',
                                lineHeight: 1.5,
                              }}
                            >
                              <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
                              <div>
                                <strong style={{ color: 'var(--text)' }}>Condiciones:</strong> {m.condiciones}
                              </div>
                            </div>
                          )}

                          {/* Mensaje informativo + CTA directo al catálogo de fincas */}
                          <div
                            style={{
                              background: 'color-mix(in srgb, var(--primary) 8%, var(--surface))',
                              border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
                              borderRadius: '8px',
                              padding: '0.75rem 0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.65rem',
                              fontSize: '0.78rem',
                              color: 'var(--text)',
                              lineHeight: 1.5,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flex: '1 1 240px' }}>
                              <Sparkles size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                              <span>
                                <strong>Servicio de alimentación opcional:</strong> Podrás incluir este menú directamente en tu cotización al seleccionar tu finca y configurar la cantidad exacta de comensales.
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={irACatalogoFincas}
                              className="btn btn-sm btn-outline"
                              style={{
                                fontSize: '0.74rem',
                                padding: '0.35rem 0.75rem',
                                minHeight: '34px',
                                borderColor: 'var(--primary)',
                                color: 'var(--primary)',
                                flexShrink: 0,
                              }}
                            >
                              <span>Elegir finca y cotizar</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visor de Imágenes a Pantalla Completa (Lightbox) */}
      <GalleryLightbox
        isOpen={lightbox.isOpen}
        images={lightbox.images}
        currentIndex={lightbox.currentIndex}
        onClose={cerrarLightbox}
        onIndexChange={setLightboxIndex}
        title={lightbox.title}
        subtitle={lightbox.subtitle}
      />
    </section>
  );
});

MenusPublicosSection.displayName = 'MenusPublicosSection';
