import React, { useState, useEffect } from 'react';
import {
  Palette, Save, RotateCcw, Eye, ArrowUp, ArrowDown, Check,
  AlertCircle, Plus, Trash2, HelpCircle, Sparkles, Layout,
  Layers, MessageSquare, Utensils, HelpCircle as FaqIcon, Globe,
  CheckCircle2, X
} from 'lucide-react';
import type { ContenidoSitio, SeccionClave, BeneficioItem, FaqItem } from '../types';

interface AdminPersonalizacionProps {
  contenido: ContenidoSitio;
  guardando: boolean;
  onGuardar: (datos: Partial<ContenidoSitio>) => Promise<{ success: boolean; error?: string }>;
  onRestablecer: () => Promise<{ success: boolean; error?: string }>;
  onVerSitioPublico: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const SECCIONES_INFO: Record<
  SeccionClave,
  { label: string; desc: string; icon: React.ReactNode }
> = {
  banner: {
    label: 'Banner Superior de Aviso',
    desc: 'Franja superior de anuncios, avisos importantes o temporadas.',
    icon: <Sparkles size={16} />,
  },
  hero: {
    label: 'Encabezado Hero Principal',
    desc: 'Título grande, descripción persuasiva, llamadas a la acción y métricas.',
    icon: <Layout size={16} />,
  },
  destacados: {
    label: 'Información Destacada / Beneficios',
    desc: 'Tarjetas destacando ventajas competitivas, tranquilidad y servicios.',
    icon: <Sparkles size={16} />,
  },
  estado: {
    label: 'Resumen de Estado Actual',
    desc: 'Chips de disponibilidad en vivo con acceso directo a cada finca.',
    icon: <Layers size={16} />,
  },
  filtros: {
    label: 'Filtros de Búsqueda',
    desc: 'Selector de fechas, capacidad requerida y badge de ubicación.',
    icon: <Layers size={16} />,
  },
  catalogo: {
    label: 'Catálogo de Fincas Campestres',
    desc: 'Tarjetas completas de fincas con fotos, amenidades y botón cotizar.',
    icon: <Globe size={16} />,
  },
  menus: {
    label: 'Gastronomía y Menús Campestres',
    desc: 'Presentación comercial de opciones de alimentación típica y asados.',
    icon: <Utensils size={16} />,
  },
  faq: {
    label: 'Preguntas Frecuentes (FAQ)',
    desc: 'Acordeones respondiendo dudas clave sobre reservas y condiciones.',
    icon: <FaqIcon size={16} />,
  },
};

export const AdminPersonalizacion: React.FC<AdminPersonalizacionProps> = ({
  contenido,
  guardando,
  onGuardar,
  onRestablecer,
  onVerSitioPublico,
  showToast,
  openConfirm,
}) => {
  // Estado local para edición antes de guardar
  const [form, setForm] = useState<ContenidoSitio>(contenido);
  const [tabActiva, setTabActiva] = useState<
    'orden' | 'hero' | 'destacados' | 'busqueda' | 'menus' | 'faq' | 'footer'
  >('orden');
  const [hayCambios, setHayCambios] = useState(false);

  // Sincronizar cuando cambien los datos externos (si no hay cambios locales en curso)
  useEffect(() => {
    if (!hayCambios) {
      setForm(contenido);
    }
  }, [contenido, hayCambios]);

  const handleChange = <K extends keyof ContenidoSitio>(campo: K, valor: ContenidoSitio[K]) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
    setHayCambios(true);
  };

  const handleGuardar = async () => {
    const res = await onGuardar(form);
    if (res.success) {
      showToast('Personalización del sitio público guardada correctamente', 'success');
      setHayCambios(false);
    } else {
      showToast(res.error || 'Error al guardar los cambios', 'error');
    }
  };

  const handleRestablecer = () => {
    openConfirm(
      '¿Restablecer contenido de fábrica?',
      'Se restaurarán todos los textos, títulos, beneficios y preguntas frecuentes a los valores iniciales predeterminados.',
      async () => {
        const res = await onRestablecer();
        if (res.success) {
          showToast('Contenido restablecido a valores por defecto', 'info');
          setHayCambios(false);
        } else {
          showToast(res.error || 'Error al restablecer', 'error');
        }
      }
    );
  };

  // ---- Manejo del orden de secciones ----
  const moverSeccion = (seccion: SeccionClave, direccion: 'arriba' | 'abajo') => {
    const orden = [...form.orden_secciones];
    const idx = orden.indexOf(seccion);
    if (idx === -1) return;

    if (direccion === 'arriba' && idx > 0) {
      const temp = orden[idx - 1];
      orden[idx - 1] = orden[idx];
      orden[idx] = temp;
    } else if (direccion === 'abajo' && idx < orden.length - 1) {
      const temp = orden[idx + 1];
      orden[idx + 1] = orden[idx];
      orden[idx] = temp;
    }

    setForm(prev => ({ ...prev, orden_secciones: orden }));
    setHayCambios(true);
  };

  const toggleVisibilidad = (seccion: SeccionClave) => {
    let campo: keyof ContenidoSitio;
    switch (seccion) {
      case 'banner': campo = 'banner_visible'; break;
      case 'hero': campo = 'hero_visible'; break;
      case 'destacados': campo = 'destacados_visible'; break;
      case 'estado': campo = 'estado_visible'; break;
      case 'filtros': campo = 'filtros_visible'; break;
      case 'catalogo': campo = 'catalogo_visible'; break;
      case 'menus': campo = 'menus_visible'; break;
      case 'faq': campo = 'faq_visible'; break;
      default: return;
    }
    const nuevoValor = !form[campo];
    handleChange(campo, nuevoValor as any);
  };

  const esVisible = (seccion: SeccionClave): boolean => {
    switch (seccion) {
      case 'banner': return form.banner_visible;
      case 'hero': return form.hero_visible;
      case 'destacados': return form.destacados_visible;
      case 'estado': return form.estado_visible;
      case 'filtros': return form.filtros_visible;
      case 'catalogo': return form.catalogo_visible;
      case 'menus': return form.menus_visible;
      case 'faq': return form.faq_visible;
    }
  };

  // ---- Manejo de Beneficios Destacados ----
  const handleAddBeneficio = () => {
    const nuevo: BeneficioItem = {
      id: `ben-${Date.now()}`,
      icono: '✨',
      titulo: 'Nueva Ventaja Exclusiva',
      descripcion: 'Describe el beneficio para tus clientes o huéspedes.',
    };
    handleChange('destacados_items', [...form.destacados_items, nuevo]);
  };

  const handleUpdateBeneficio = (index: number, campo: keyof BeneficioItem, valor: string) => {
    const updated = [...form.destacados_items];
    updated[index] = { ...updated[index], [campo]: valor };
    handleChange('destacados_items', updated);
  };

  const handleRemoveBeneficio = (index: number) => {
    const updated = form.destacados_items.filter((_, i) => i !== index);
    handleChange('destacados_items', updated);
  };

  // ---- Manejo de Preguntas Frecuentes (FAQ) ----
  const handleAddFaq = () => {
    const nuevo: FaqItem = {
      id: `faq-${Date.now()}`,
      pregunta: '¿Nueva pregunta frecuente?',
      respuesta: 'Escribe aquí la respuesta clara y detallada para tus clientes.',
    };
    handleChange('faq_items', [...form.faq_items, nuevo]);
  };

  const handleUpdateFaq = (index: number, campo: keyof FaqItem, valor: string) => {
    const updated = [...form.faq_items];
    updated[index] = { ...updated[index], [campo]: valor };
    handleChange('faq_items', updated);
  };

  const handleRemoveFaq = (index: number) => {
    const updated = form.faq_items.filter((_, i) => i !== index);
    handleChange('faq_items', updated);
  };

  return (
    <div className="admin-personalizacion" style={{ display: 'grid', gap: '1.25rem' }}>
      {/* Barra de cabecera con acciones */}
      <div
        className="panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'var(--surface)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Palette size={22} style={{ color: 'var(--primary)' }} />
            <h2 className="panel-title" style={{ margin: 0 }}>
              Personalización del Sitio Público
            </h2>
            {hayCambios && (
              <span className="status-badge s-warn" style={{ fontSize: '0.72rem' }}>
                Cambios pendientes
              </span>
            )}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
            Controla qué secciones, textos, llamados a la acción y preguntas aparecen en la página para los clientes.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={onVerSitioPublico}
            title="Abrir la página de inicio como cliente"
          >
            <Eye size={15} /> Ver Sitio Público
          </button>

          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={handleRestablecer}
            disabled={guardando}
            title="Restaurar textos y orden predeterminados"
          >
            <RotateCcw size={15} /> Restablecer
          </button>

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleGuardar}
            disabled={guardando}
            style={{ minWidth: '130px', justifyContent: 'center' }}
          >
            {guardando ? (
              'Guardando…'
            ) : (
              <>
                <Save size={15} /> Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-navegación por pestañas */}
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.4rem',
        }}
      >
        <button
          type="button"
          className={`btn btn-sm ${tabActiva === 'orden' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTabActiva('orden')}
        >
          <Layers size={14} /> Orden & Secciones ({form.orden_secciones.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tabActiva === 'hero' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTabActiva('hero')}
        >
          <Layout size={14} /> Banner & Hero
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tabActiva === 'destacados' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTabActiva('destacados')}
        >
          <Sparkles size={14} /> Destacados ({form.destacados_items.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tabActiva === 'busqueda' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTabActiva('busqueda')}
        >
          <Globe size={14} /> Búsqueda & Catálogo
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tabActiva === 'menus' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTabActiva('menus')}
        >
          <Utensils size={14} /> Gastronomía Pública
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tabActiva === 'faq' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTabActiva('faq')}
        >
          <HelpCircle size={14} /> Preguntas Frecuentes ({form.faq_items.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tabActiva === 'footer' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTabActiva('footer')}
        >
          <MessageSquare size={14} /> Pie de Página
        </button>
      </div>

      {/* PESTAÑA 1: ORDEN Y VISIBILIDAD DE SECCIONES */}
      {tabActiva === 'orden' && (
        <div className="panel" style={{ background: 'var(--surface)' }}>
          <div className="panel-header" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="panel-title">Estructura y Orden del Sitio Público</div>
              <div className="text-xs text-muted mt-1">
                Puedes encender/apagar cualquier sección o cambiar el orden en que los clientes la visualizan.
              </div>
            </div>
            <span className="status-badge s-info">
              {form.orden_secciones.filter(esVisible).length} de {form.orden_secciones.length} secciones activas
            </span>
          </div>

          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {form.orden_secciones.map((secClave, idx) => {
              const info = SECCIONES_INFO[secClave];
              const visible = esVisible(secClave);
              return (
                <div
                  key={secClave}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.1rem',
                    background: visible ? 'var(--surface-2)' : 'color-mix(in srgb, var(--surface-2) 40%, transparent)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--rad-sm)',
                    opacity: visible ? 1 : 0.65,
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1 }}>
                    <span
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'var(--surface-3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ color: 'var(--primary)', display: 'flex' }}>
                      {info?.icon}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text)' }}>
                        {info?.label || secClave}
                      </div>
                      <div className="text-xs text-muted">{info?.desc}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Botones de orden */}
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => moverSeccion(secClave, 'arriba')}
                      disabled={idx === 0}
                      title="Subir posición"
                      style={{ padding: '0.35rem 0.5rem' }}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => moverSeccion(secClave, 'abajo')}
                      disabled={idx === form.orden_secciones.length - 1}
                      title="Bajar posición"
                      style={{ padding: '0.35rem 0.5rem' }}
                    >
                      <ArrowDown size={14} />
                    </button>

                    {/* Toggle visible / oculto */}
                    <button
                      type="button"
                      className={`btn btn-sm ${visible ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => toggleVisibilidad(secClave)}
                      style={{ minWidth: '95px', justifyContent: 'center' }}
                    >
                      {visible ? (
                        <>
                          <Check size={14} /> Visible
                        </>
                      ) : (
                        <>
                          <X size={14} /> Oculta
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: BANNER Y HERO */}
      {tabActiva === 'hero' && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {/* Banner de Aviso */}
          <div className="panel" style={{ background: 'var(--surface)' }}>
            <div className="panel-header" style={{ marginBottom: '1rem' }}>
              <div>
                <div className="panel-title">1. Banner Superior de Aviso</div>
                <div className="text-xs text-muted">Aviso destacado sobre el menú de navegación para ofertas o alertas.</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>
                <input
                  type="checkbox"
                  checked={form.banner_visible}
                  onChange={e => handleChange('banner_visible', e.target.checked)}
                />
                <strong>Mostrar Banner</strong>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.9rem' }}>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Texto del Banner</label>
                <input
                  type="text"
                  value={form.banner_texto}
                  placeholder="Ej: 🌿 ¡Reserva directa sin comisiones! Consulta fechas libres..."
                  onChange={e => handleChange('banner_texto', e.target.value)}
                />
              </div>

              <div className="field">
                <label>Texto del Enlace / Botón</label>
                <input
                  type="text"
                  value={form.banner_link_texto}
                  placeholder="Ver promociones"
                  onChange={e => handleChange('banner_link_texto', e.target.value)}
                />
              </div>

              <div className="field">
                <label>Destino del Enlace (URL o ancla)</label>
                <input
                  type="text"
                  value={form.banner_link_url}
                  placeholder="#catalogo o enlace completo"
                  onChange={e => handleChange('banner_link_url', e.target.value)}
                />
              </div>

              <div className="field">
                <label>Estilo visual del banner</label>
                <select
                  value={form.banner_tipo}
                  onChange={e => handleChange('banner_tipo', e.target.value as any)}
                >
                  <option value="promo">Promocional (Verde bosque degradado con estrella)</option>
                  <option value="aviso">Aviso Especial (Dorado / Terracota)</option>
                  <option value="info">Informativo Suave (Gris cálido del tema)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección Hero Principal */}
          <div className="panel" style={{ background: 'var(--surface)' }}>
            <div className="panel-header" style={{ marginBottom: '1rem' }}>
              <div>
                <div className="panel-title">2. Encabezado Hero Principal</div>
                <div className="text-xs text-muted">Contenido de la primera pantalla que ve el cliente al ingresar.</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>
                <input
                  type="checkbox"
                  checked={form.hero_visible}
                  onChange={e => handleChange('hero_visible', e.target.checked)}
                />
                <strong>Mostrar Hero</strong>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.9rem' }}>
              <div className="field">
                <label>Etiqueta superior (Eyebrow)</label>
                <input
                  type="text"
                  value={form.hero_eyebrow}
                  placeholder="Reserva directa sin comisiones"
                  onChange={e => handleChange('hero_eyebrow', e.target.value)}
                />
              </div>

              <div className="field">
                <label>Ubicación destacada en pie de Hero</label>
                <input
                  type="text"
                  value={form.hero_badge_ubicacion || ''}
                  placeholder="Santa Elena, El Cerrito, Valle"
                  onChange={e => handleChange('hero_badge_ubicacion', e.target.value)}
                />
              </div>

              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Título Principal (H1)</label>
                <input
                  type="text"
                  value={form.hero_titulo}
                  placeholder="Tu escapada campestre empieza aquí"
                  onChange={e => handleChange('hero_titulo', e.target.value)}
                />
              </div>

              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Subtítulo / Descripción persuasiva</label>
                <textarea
                  rows={3}
                  value={form.hero_subtitulo}
                  placeholder="Elige la finca ideal en Santa Elena, consulta la disponibilidad..."
                  onChange={e => handleChange('hero_subtitulo', e.target.value)}
                />
              </div>

              <div className="field">
                <label>Texto del Botón CTA Principal</label>
                <input
                  type="text"
                  value={form.hero_cta_texto}
                  placeholder="Explorar fincas disponibles"
                  onChange={e => handleChange('hero_cta_texto', e.target.value)}
                />
              </div>

              <div className="field">
                <label>Texto del Botón CTA Secundario (Opcional)</label>
                <input
                  type="text"
                  value={form.hero_cta_secundario_texto || ''}
                  placeholder="Conocer gastronomía"
                  onChange={e => handleChange('hero_cta_secundario_texto', e.target.value)}
                />
              </div>
            </div>

            {/* Ajustes de métricas y pasos */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'grid', gap: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>
                  <input
                    type="checkbox"
                    checked={form.hero_mostrar_metricas}
                    onChange={e => handleChange('hero_mostrar_metricas', e.target.checked)}
                  />
                  <span>Mostrar panel de disponibilidad en vivo (fincas activas, ocupación)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>
                  <input
                    type="checkbox"
                    checked={form.hero_mostrar_pasos}
                    onChange={e => handleChange('hero_mostrar_pasos', e.target.checked)}
                  />
                  <span>Mostrar los 3 pasos guiados</span>
                </label>
              </div>

              {form.hero_mostrar_pasos && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div className="field">
                    <label>Paso 1</label>
                    <input
                      type="text"
                      value={form.hero_paso_1}
                      onChange={e => handleChange('hero_paso_1', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Paso 2</label>
                    <input
                      type="text"
                      value={form.hero_paso_2}
                      onChange={e => handleChange('hero_paso_2', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Paso 3</label>
                    <input
                      type="text"
                      value={form.hero_paso_3}
                      onChange={e => handleChange('hero_paso_3', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: BENEFICIOS DESTACADOS */}
      {tabActiva === 'destacados' && (
        <div className="panel" style={{ background: 'var(--surface)' }}>
          <div className="panel-header" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="panel-title">Información Destacada y Beneficios</div>
              <div className="text-xs text-muted">
                Tarjetas que resaltan las ventajas de reservar con tu negocio campestre.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>
                <input
                  type="checkbox"
                  checked={form.destacados_visible}
                  onChange={e => handleChange('destacados_visible', e.target.checked)}
                />
                <strong>Mostrar sección</strong>
              </label>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleAddBeneficio}
              >
                <Plus size={14} /> Agregar Tarjeta
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.9rem', marginBottom: '1.25rem' }}>
            <div className="field">
              <label>Título de la Sección</label>
              <input
                type="text"
                value={form.destacados_titulo}
                placeholder="¿Por qué reservar con nosotros?"
                onChange={e => handleChange('destacados_titulo', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Subtítulo de la Sección</label>
              <input
                type="text"
                value={form.destacados_subtitulo}
                placeholder="Garantizamos tranquilidad, transparencia y el mejor descanso..."
                onChange={e => handleChange('destacados_subtitulo', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {form.destacados_items.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--rad-sm)',
                  background: 'var(--surface-2)',
                }}
              >
                <div style={{ width: '65px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                    Emoji / Ícono
                  </label>
                  <input
                    type="text"
                    value={item.icono}
                    style={{ textAlign: 'center', fontSize: '1.3rem', height: '38px', padding: '0.2rem' }}
                    onChange={e => handleUpdateBeneficio(idx, 'icono', e.target.value)}
                  />
                </div>

                <div style={{ flex: 1, display: 'grid', gap: '0.5rem' }}>
                  <div className="field">
                    <label>Título del Beneficio</label>
                    <input
                      type="text"
                      value={item.titulo}
                      onChange={e => handleUpdateBeneficio(idx, 'titulo', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Descripción</label>
                    <textarea
                      rows={2}
                      value={item.descripcion}
                      onChange={e => handleUpdateBeneficio(idx, 'descripcion', e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => handleRemoveBeneficio(idx)}
                  title="Eliminar tarjeta"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)', marginTop: '1.4rem' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 4: BÚSQUEDA Y CATÁLOGO */}
      {tabActiva === 'busqueda' && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {/* Panel Estado Actual */}
          <div className="panel" style={{ background: 'var(--surface)' }}>
            <div className="panel-header" style={{ marginBottom: '1rem' }}>
              <div>
                <div className="panel-title">Resumen de Estado Actual</div>
                <div className="text-xs text-muted">Chips que muestran cada finca y su estado de disponibilidad en tiempo real.</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>
                <input
                  type="checkbox"
                  checked={form.estado_visible}
                  onChange={e => handleChange('estado_visible', e.target.checked)}
                />
                <strong>Mostrar panel</strong>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.9rem' }}>
              <div className="field">
                <label>Título del Panel</label>
                <input
                  type="text"
                  value={form.estado_titulo}
                  onChange={e => handleChange('estado_titulo', e.target.value)}
                />
              </div>

              <div className="field">
                <label>Subtítulo</label>
                <input
                  type="text"
                  value={form.estado_subtitulo}
                  onChange={e => handleChange('estado_subtitulo', e.target.value)}
                />
              </div>

              <div className="field">
                <label>Texto del Badge</label>
                <input
                  type="text"
                  value={form.estado_badge_texto}
                  onChange={e => handleChange('estado_badge_texto', e.target.value)}
                />
              </div>

              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Texto de ayuda o instrucción al usuario</label>
                <input
                  type="text"
                  value={form.estado_ayuda_texto}
                  onChange={e => handleChange('estado_ayuda_texto', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Filtros de Búsqueda */}
          <div className="panel" style={{ background: 'var(--surface)' }}>
            <div className="panel-header" style={{ marginBottom: '1rem' }}>
              <div>
                <div className="panel-title">Filtros de Búsqueda</div>
                <div className="text-xs text-muted">Controles para filtrar por fechas y cantidad de personas.</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>
                <input
                  type="checkbox"
                  checked={form.filtros_visible}
                  onChange={e => handleChange('filtros_visible', e.target.checked)}
                />
                <strong>Mostrar filtros</strong>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.9rem' }}>
              <div className="field">
                <label>Título de la sección de filtros</label>
                <input
                  type="text"
                  value={form.filtros_titulo}
                  onChange={e => handleChange('filtros_titulo', e.target.value)}
                />
              </div>

              <div className="field">
                <label>Subtítulo de filtros</label>
                <input
                  type="text"
                  value={form.filtros_subtitulo}
                  onChange={e => handleChange('filtros_subtitulo', e.target.value)}
                />
              </div>

              <div className="field">
                <label>Título de la tarjeta de ubicación</label>
                <input
                  type="text"
                  value={form.filtros_badge_titulo}
                  onChange={e => handleChange('filtros_badge_titulo', e.target.value)}
                />
              </div>

              <div className="field">
                <label>Texto descriptivo de ubicación</label>
                <input
                  type="text"
                  value={form.filtros_badge_texto}
                  onChange={e => handleChange('filtros_badge_texto', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Catálogo de Fincas */}
          <div className="panel" style={{ background: 'var(--surface)' }}>
            <div className="panel-header" style={{ marginBottom: '1rem' }}>
              <div>
                <div className="panel-title">Catálogo y Listado de Fincas</div>
                <div className="text-xs text-muted">Textos que encabezan la cuadrícula de fincas.</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>
                <input
                  type="checkbox"
                  checked={form.catalogo_visible}
                  onChange={e => handleChange('catalogo_visible', e.target.checked)}
                />
                <strong>Mostrar catálogo</strong>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.9rem' }}>
              <div className="field">
                <label>Título del Catálogo</label>
                <input
                  type="text"
                  value={form.catalogo_titulo}
                  onChange={e => handleChange('catalogo_titulo', e.target.value)}
                />
              </div>

              <div className="field">
                <label>Subtítulo</label>
                <input
                  type="text"
                  value={form.catalogo_subtitulo}
                  onChange={e => handleChange('catalogo_subtitulo', e.target.value)}
                />
              </div>

              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Mensaje cuando no hay resultados para los filtros</label>
                <input
                  type="text"
                  value={form.catalogo_vacio_texto}
                  onChange={e => handleChange('catalogo_vacio_texto', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 5: MENÚS Y GASTRONOMÍA PÚBLICA */}
      {tabActiva === 'menus' && (
        <div className="panel" style={{ background: 'var(--surface)' }}>
          <div className="panel-header" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="panel-title">Gastronomía y Menús en el Portal Público</div>
              <div className="text-xs text-muted">
                Muestra las opciones de alimentación activas para que los clientes las conozcan directamente.
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>
              <input
                type="checkbox"
                checked={form.menus_visible}
                onChange={e => handleChange('menus_visible', e.target.checked)}
              />
              <strong>Mostrar sección de menús en el portal</strong>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.9rem' }}>
            <div className="field">
              <label>Título de la Sección</label>
              <input
                type="text"
                value={form.menus_titulo}
                placeholder="Gastronomía y Menús Campestres"
                onChange={e => handleChange('menus_titulo', e.target.value)}
              />
            </div>

            <div className="field">
              <label>Etiqueta / Badge Superior</label>
              <input
                type="text"
                value={form.menus_badge_texto}
                placeholder="Servicio Adicional Opcional"
                onChange={e => handleChange('menus_badge_texto', e.target.value)}
              />
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Subtítulo Descriptivo</label>
              <textarea
                rows={2}
                value={form.menus_subtitulo}
                placeholder="Complementa tu descanso con deliciosas opciones de alimentación tradicional..."
                onChange={e => handleChange('menus_subtitulo', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 6: PREGUNTAS FRECUENTES (FAQ) */}
      {tabActiva === 'faq' && (
        <div className="panel" style={{ background: 'var(--surface)' }}>
          <div className="panel-header" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="panel-title">Preguntas Frecuentes (FAQ)</div>
              <div className="text-xs text-muted">
                Resuelve dudas habituales sobre pagos, horarios, mascotas y condiciones antes de cotizar.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>
                <input
                  type="checkbox"
                  checked={form.faq_visible}
                  onChange={e => handleChange('faq_visible', e.target.checked)}
                />
                <strong>Mostrar FAQ</strong>
              </label>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleAddFaq}
              >
                <Plus size={14} /> Nueva Pregunta
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.9rem', marginBottom: '1.25rem' }}>
            <div className="field">
              <label>Título de la Sección FAQ</label>
              <input
                type="text"
                value={form.faq_titulo}
                onChange={e => handleChange('faq_titulo', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Subtítulo</label>
              <input
                type="text"
                value={form.faq_subtitulo}
                onChange={e => handleChange('faq_subtitulo', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {form.faq_items.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--rad-sm)',
                  background: 'var(--surface-2)',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'var(--surface-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginTop: '1.4rem',
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </div>

                <div style={{ flex: 1, display: 'grid', gap: '0.5rem' }}>
                  <div className="field">
                    <label>Pregunta</label>
                    <input
                      type="text"
                      value={item.pregunta}
                      placeholder="¿Cuál es tu pregunta?"
                      onChange={e => handleUpdateFaq(idx, 'pregunta', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Respuesta</label>
                    <textarea
                      rows={3}
                      value={item.respuesta}
                      placeholder="Respuesta explicativa y clara para el cliente..."
                      onChange={e => handleUpdateFaq(idx, 'respuesta', e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => handleRemoveFaq(idx)}
                  title="Eliminar pregunta"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)', marginTop: '1.4rem' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 7: PIE DE PÁGINA (FOOTER) */}
      {tabActiva === 'footer' && (
        <div className="panel" style={{ background: 'var(--surface)' }}>
          <div className="panel-header" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="panel-title">Pie de Página (Footer)</div>
              <div className="text-xs text-muted">
                Textos de cierre, llamado a WhatsApp e información de confianza.
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>
              <input
                type="checkbox"
                checked={form.footer_visible}
                onChange={e => handleChange('footer_visible', e.target.checked)}
              />
              <strong>Mostrar Footer</strong>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.9rem' }}>
            <div className="field">
              <label>Título del Negocio en Footer</label>
              <input
                type="text"
                value={form.footer_titulo}
                placeholder="Control de Fincas Campestres"
                onChange={e => handleChange('footer_titulo', e.target.value)}
              />
            </div>

            <div className="field">
              <label>Llamado a la acción WhatsApp</label>
              <input
                type="text"
                value={form.footer_whatsapp_cta}
                placeholder="¿Tienes alguna duda especial? Escríbenos directamente a WhatsApp"
                onChange={e => handleChange('footer_whatsapp_cta', e.target.value)}
              />
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Descripción / Frase de cierre</label>
              <textarea
                rows={2}
                value={form.footer_subtitulo}
                placeholder="Alquiler exclusivo de fincas de recreo y descanso en Santa Elena, El Cerrito, Valle del Cauca."
                onChange={e => handleChange('footer_subtitulo', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
