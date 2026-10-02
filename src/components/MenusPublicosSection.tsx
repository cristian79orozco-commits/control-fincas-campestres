import React from 'react';
import { UtensilsCrossed, CheckCircle2, MessageCircle } from 'lucide-react';
import type { Menu } from '../types';

interface MenusPublicosSectionProps {
  visible: boolean;
  titulo: string;
  subtitulo: string;
  badgeTexto: string;
  menus: Menu[];
  waNumber: string;
}

function formatCOP(v: number) {
  return '$' + v.toLocaleString('es-CO');
}

export const MenusPublicosSection: React.FC<MenusPublicosSectionProps> = ({
  visible,
  titulo,
  subtitulo,
  badgeTexto,
  menus,
  waNumber,
}) => {
  const menusActivos = menus.filter(m => m.activo);

  if (!visible || menusActivos.length === 0) return null;

  const handleConsultarMenu = (menu: Menu) => {
    const text = encodeURIComponent(
      `¡Hola! Estoy visitando la página de Fincas Campestres y me gustaría consultar información sobre el servicio de alimentación: *${menu.nombre}* (${menu.categoria} - ${formatCOP(menu.precio_pp)}/persona). ¿Qué opciones y disponibilidad tienen?`
    );
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
  };

  return (
    <section className="menus-publicos-section" style={{ margin: '2.5rem 0' }}>
      <div className="sec-header" style={{ marginBottom: '1.2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UtensilsCrossed size={20} style={{ color: 'var(--primary)' }} />
            <h2 className="sec-title" style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>
              {titulo}
            </h2>
          </div>
          {subtitulo && <p className="sec-sub" style={{ marginTop: '0.25rem' }}>{subtitulo}</p>}
        </div>
        {badgeTexto && (
          <span className="status-badge s-info">
            {badgeTexto}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.2rem',
        }}
      >
        {menusActivos.map(menu => {
          const imgPrincipal = menu.imagen_url || menu.menu_imagenes?.[0]?.url;
          return (
            <div
              key={menu.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--rad-md)',
                overflow: 'hidden',
                boxShadow: 'var(--sh-sm)',
              }}
            >
              {imgPrincipal ? (
                <div style={{ height: '170px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={imgPrincipal}
                    alt={menu.nombre}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span
                    className="status-badge s-avail"
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      fontSize: '0.7rem',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {menu.categoria}
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    height: '110px',
                    background: 'var(--surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <UtensilsCrossed size={32} opacity={0.4} />
                </div>
              )}

              <div style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.2rem',
                      fontWeight: 600,
                      margin: 0,
                    }}
                  >
                    {menu.nombre}
                  </h3>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {formatCOP(menu.precio_pp)}
                    </div>
                    <div className="text-xs text-muted">por persona</div>
                  </div>
                </div>

                {menu.descripcion && (
                  <p
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      lineHeight: 1.5,
                      margin: 0,
                      flex: 1,
                    }}
                  >
                    {menu.descripcion}
                  </p>
                )}

                {menu.condiciones && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.72rem',
                      color: 'var(--text-faint)',
                      marginTop: '0.2rem',
                    }}
                  >
                    <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                    <span>{menu.condiciones}</span>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => handleConsultarMenu(menu)}
                  style={{
                    marginTop: '0.5rem',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <MessageCircle size={14} /> Consultar por WhatsApp
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
