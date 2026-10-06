import React, { useState } from 'react';
import {
  UtensilsCrossed, CheckCircle2, MessageCircle, ChevronDown, ChevronUp,
  Image as ImageIcon, Sparkles, Check
} from 'lucide-react';
import type { Menu } from '../types';
import { obtenerFotoMenu } from '../utils/menuUtils';

interface MenusPublicosSectionProps {
  visible: boolean;
  titulo: string;
  subtitulo: string;
  badgeTexto: string;
  menus: Menu[];
  waNumber: string;
}

function formatCOP(v: number) {
  return '$' + (v || 0).toLocaleString('es-CO') + ' COP';
}

const CATEGORIA_COLORS: Record<string, { bg: string; text: string }> = {
  Desayuno: { bg: 'rgba(245, 158, 11, 0.15)', text: '#b45309' },
  Almuerzo: { bg: 'rgba(16, 185, 129, 0.15)', text: '#047857' },
  Cena: { bg: 'rgba(99, 102, 241, 0.15)', text: '#4338ca' },
  Parrilla: { bg: 'rgba(239, 68, 68, 0.15)', text: '#b91c1c' },
  Refrigerio: { bg: 'rgba(14, 165, 233, 0.15)', text: '#0369a1' },
  'Menú especial': { bg: 'rgba(139, 92, 246, 0.15)', text: '#6d28d9' },
  Paquetes: { bg: 'rgba(249, 115, 22, 0.15)', text: '#c2410c' },
};

export const MenusPublicosSection: React.FC<MenusPublicosSectionProps> = ({
  visible,
  titulo,
  subtitulo,
  badgeTexto,
  menus,
  waNumber,
}) => {
  const menusActivos = menus.filter(m => m.activo);

  // Estado contraído por defecto según requerimiento
  const [desplegado, setDesplegado] = useState(false);

  // Menú actualmente seleccionado para la vista maximizada
  const [menuSeleccionadoId, setMenuSeleccionadoId] = useState<string>(
    menusActivos[0]?.id || ''
  );

  // Índice de foto activa dentro del menú seleccionado
  const [fotoActivaIndex, setFotoActivaIndex] = useState(0);

  if (!visible || menusActivos.length === 0) return null;

  // Encontrar el menú seleccionado o usar el primero
  const menuActivo = menusActivos.find(m => m.id === menuSeleccionadoId) || menusActivos[0];

  // Recopilar fotos del menú seleccionado
  const fotosMenu: string[] = [];
  const fotoPrincipal = obtenerFotoMenu(menuActivo);
  if (fotoPrincipal) fotosMenu.push(fotoPrincipal);

  if (menuActivo?.menu_imagenes && menuActivo.menu_imagenes.length > 0) {
    menuActivo.menu_imagenes
      .sort((a, b) => a.orden - b.orden)
      .forEach(img => {
        if (!fotosMenu.includes(img.url)) {
          fotosMenu.push(img.url);
        }
      });
  }

  const fotoMostrada = fotosMenu[fotoActivaIndex] || fotosMenu[0] || '';
  const colorCat = CATEGORIA_COLORS[menuActivo?.categoria] || {
    bg: 'rgba(26, 107, 94, 0.15)',
    text: 'var(--primary)',
  };

  const handleConsultarMenu = (menu: Menu) => {
    const text = encodeURIComponent(
      `¡Hola! 👋 Me gustaría consultar información sobre el servicio de alimentación campestre: *${menu.nombre}* (${menu.categoria} - ${formatCOP(menu.precio_pp)}/persona). ¿Qué opciones y disponibilidad tienen para nuestro grupo?`
    );
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
  };

  return (
    <section className="menus-publicos-section" style={{ margin: '2rem 0' }}>
      {/* ─── Cabecera Contraída Predeterminada ─── */}
      <div
        onClick={() => setDesplegado(v => !v)}
        style={{
          background: 'var(--surface)',
          border: `1.5px solid ${desplegado ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 'var(--rad-sm, 10px)',
          padding: '0.9rem 1.15rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.85rem',
          flexWrap: 'wrap',
          boxShadow: desplegado ? '0 3px 12px rgba(0,0,0,0.06)' : 'none',
          transition: 'all 0.18s ease',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UtensilsCrossed size={20} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
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
              setDesplegado(v => !v);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.78rem',
              padding: '0.4rem 0.85rem',
            }}
          >
            {desplegado ? (
              <>Ocultar gastronomía <ChevronUp size={14} /></>
            ) : (
              <>Ver menús y fotos <ChevronDown size={14} /></>
            )}
          </button>
        </div>
      </div>

      {/* ─── Vista Desplegada Maestro-Detalle ─── */}
      {desplegado && (
        <div
          style={{
            marginTop: '0.85rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--rad-sm, 10px)',
            overflow: 'hidden',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem',
              alignItems: 'start',
            }}
          >
            {/* ─── PANEL IZQUIERDO: Lista en Miniatura ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                Selecciona un plan para ver fotos y detalles:
              </div>

              <div
                style={{
                  maxHeight: '480px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  paddingRight: '0.35rem',
                }}
              >
                {menusActivos.map(m => {
                  const isSelected = m.id === menuActivo?.id;
                  const thumb = obtenerFotoMenu(m);
                  const catStyle = CATEGORIA_COLORS[m.categoria] || {
                    bg: 'rgba(0,0,0,0.06)',
                    text: 'var(--text-main)',
                  };

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setMenuSeleccionadoId(m.id);
                        setFotoActivaIndex(0);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--rad-xs, 6px)',
                        cursor: 'pointer',
                        border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                        background: isSelected
                          ? 'color-mix(in srgb, var(--primary) 8%, var(--surface))'
                          : 'var(--surface)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Miniatura cuadrada */}
                      <div
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          background: 'var(--surface-sunken)',
                          flexShrink: 0,
                        }}
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={m.nombre}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <UtensilsCrossed size={20} opacity={0.5} />
                          </div>
                        )}
                      </div>

                      {/* Texto del menú */}
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.15rem' }}>
                          <span
                            style={{
                              fontSize: '0.63rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: catStyle.bg,
                              color: catStyle.text,
                            }}
                          >
                            {m.categoria}
                          </span>
                        </div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {m.nombre}
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {formatCOP(m.precio_pp)}{' '}
                          <span style={{ fontSize: '0.68rem', fontWeight: 400 }}>/pp</span>
                        </div>
                      </div>

                      {isSelected && (
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── PANEL DERECHO: Vista Maximizada del Menú Seleccionado ─── */}
            {menuActivo && (
              <div
                style={{
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--rad-sm, 8px)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Imagen principal maximizada */}
                <div style={{ position: 'relative', height: '220px', background: '#000' }}>
                  {fotoMostrada ? (
                    <img
                      src={fotoMostrada}
                      alt={menuActivo.nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, var(--surface-2), var(--surface-sunken))',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <UtensilsCrossed size={48} opacity={0.4} />
                    </div>
                  )}

                  {/* Badge de categoría */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      background: 'rgba(0,0,0,0.7)',
                      backdropFilter: 'blur(4px)',
                      color: '#fff',
                    }}
                  >
                    {menuActivo.categoria}
                  </span>
                </div>

                {/* Tira de fotos si hay más de una */}
                {fotosMenu.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.4rem',
                      padding: '0.5rem 0.85rem',
                      background: 'var(--surface)',
                      borderBottom: '1px solid var(--border-subtle)',
                      overflowX: 'auto',
                    }}
                  >
                    {fotosMenu.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setFotoActivaIndex(idx)}
                        style={{
                          width: '50px',
                          height: '40px',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: `2px solid ${idx === fotoActivaIndex ? 'var(--primary)' : 'transparent'}`,
                          flexShrink: 0,
                          opacity: idx === fotoActivaIndex ? 1 : 0.65,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <img
                          src={img}
                          alt={`${menuActivo.nombre} foto ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Detalle descriptivo del menú */}
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {menuActivo.nombre}
                    </h3>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {formatCOP(menuActivo.precio_pp)}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        por persona / servicio
                      </div>
                    </div>
                  </div>

                  {menuActivo.descripcion && (
                    <p
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.55,
                        margin: 0,
                      }}
                    >
                      {menuActivo.descripcion}
                    </p>
                  )}

                  {menuActivo.condiciones && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.74rem',
                        color: 'var(--text-muted)',
                        background: 'var(--surface)',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <CheckCircle2 size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />
                      <span>{menuActivo.condiciones}</span>
                    </div>
                  )}

                  {/* Botón para consultar por WhatsApp */}
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn wa-btn"
                      onClick={() => handleConsultarMenu(menuActivo)}
                      style={{
                        width: '100%',
                        fontSize: '0.84rem',
                        padding: '0.65rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <MessageCircle size={16} />
                      Consultar este menú por WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
