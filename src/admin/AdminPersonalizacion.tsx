import React, { useState, useEffect } from 'react';
import {
  Palette, Save, RotateCcw, Eye, ArrowUp, ArrowDown, Check,
  AlertCircle, Plus, Trash2, HelpCircle, Sparkles, Layout,
  Layers, MessageSquare, Utensils, HelpCircle as FaqIcon, Globe,
  CheckCircle2, X, TrendingUp, Scale, FileCheck2, Smartphone, Monitor,
  Sliders, LayoutGrid, List
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
  graficos: {
    label: 'Visualización & Gráficos Interactivos (Chart.js)',
    desc: 'Comparativa de fincas y simulador dinámico de inversión con ahorro directo.',
    icon: <TrendingUp size={16} />,
  },
  estado: {
    label: 'Resumen de Estado Actual',
    desc: 'Chips de disponibilidad en vivo con acceso directo a cada finca.',
    icon: <Layers size={16} />,
  },
  filtros: {
    label: 'Filtros de Búsqueda',
    desc: 'Selector de fechas, capacidad requerida y amenidades.',
    icon: <Layers size={16} />,
  },
  catalogo: {
    label: 'Catálogo de Fincas Campestres',
    desc: 'Fichas de propiedades con fotografías en alta calidad y botón cotizar.',
    icon: <Globe size={16} />,
  },
  comparador: {
    label: 'Comparador de Fincas Cara a Cara',
    desc: 'Matriz comparativa lado a lado entre fincas seleccionadas por el cliente.',
    icon: <Scale size={16} />,
  },
  portal_cliente: {
    label: 'Portal del Huésped (Consulta de Reserva)',
    desc: 'Módulo de autogestión para verificar estado, saldo y comprobantes.',
    icon: <FileCheck2 size={16} />,
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
  // Asegurar que form tenga todas las secciones en orden_secciones
  const asegurarOrdenCompleto = (c: ContenidoSitio): ContenidoSitio => {
    const todas: SeccionClave[] = [
      'banner', 'hero', 'destacados', 'graficos', 'estado',
      'filtros', 'catalogo', 'comparador', 'menus', 'faq'
    ];
    const existentes = c.orden_secciones || [];
    const faltantes = todas.filter(s => !existentes.includes(s));
    return {
      ...c,
      orden_secciones: [...existentes, ...faltantes],
      graficos_visible: c.graficos_visible ?? true,
      graficos_titulo: c.graficos_titulo || 'Análisis Visual & Calculadora de Presupuesto',
      graficos_subtitulo: c.graficos_subtitulo || 'Compara capacidades, tarifas y simula tu inversión con ahorro directo en tiempo real',
      graficos_tipo: c.graficos_tipo || 'ambos',
      comparador_visible: c.comparador_visible ?? true,
      comparador_titulo: c.comparador_titulo || 'Comparador de Fincas',
      comparador_subtitulo: c.comparador_subtitulo || 'Compara especificaciones, comodidades y tarifas lado a lado',
      catalogo_vista_predeterminada: c.catalogo_vista_predeterminada || 'grid',
      catalogo_mostrar_badges: c.catalogo_mostrar_badges ?? true,
      catalogo_mostrar_precio_total: c.catalogo_mostrar_precio_total ?? true,
    };
  };

  const [form, setForm] = useState<ContenidoSitio>(() => asegurarOrdenCompleto(contenido));
  const [tabActiva, setTabActiva] = useState<
    'orden' | 'hero' | 'destacados' | 'graficos' | 'busqueda' | 'menus' | 'faq' | 'footer'
  >('orden');
  const [hayCambios, setHayCambios] = useState(false);
  const [modalPreviewOpen, setModalPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    if (!hayCambios) {
      setForm(asegurarOrdenCompleto(contenido));
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
      case 'graficos': campo = 'graficos_visible'; break;
      case 'estado': campo = 'estado_visible'; break;
      case 'filtros': campo = 'filtros_visible'; break;
      case 'catalogo': campo = 'catalogo_visible'; break;
      case 'comparador': campo = 'comparador_visible'; break;
      case 'portal_cliente': campo = 'portal_cliente_visible'; break;
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
      case 'graficos': return form.graficos_visible ?? true;
      case 'estado': return form.estado_visible;
      case 'filtros': return form.filtros_visible;
      case 'catalogo': return form.catalogo_visible;
      case 'comparador': return form.comparador_visible ?? true;
      case 'portal_cliente': return form.portal_cliente_visible ?? true;
      case 'menus': return form.menus_visible;
      case 'faq': return form.faq_visible;
      default: return true;
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
              Personalización del Sitio Público & Panel del Cliente
            </h2>
            {hayCambios && (
              <span className="status-badge s-warn" style={{ fontSize: '0.72rem' }}>
                Cambios pendientes
              </span>
            )}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
            Controla integralmente qué secciones, gráficos interactivos, textos y vistas pueden visualizar tus clientes.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => setModalPreviewOpen(true)}
            title="Previsualizar cambios en simulador de pantalla"
            style={{ gap: '5px' }}
          >
            <Monitor size={15} /> Simulador en Vivo
          </button>

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
          className={`btn btn-sm ${tabActiva === 'graficos' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTabActiva('graficos')}
        >
          <TrendingUp size={14} /> Gráficos & Visualización
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tabActiva === 'busqueda' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTabActiva('busqueda')}
        >
          <Globe size={14} /> Catálogo & Comparador
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
                Enciende, apaga o reordena cualquier sección pública para controlar con total precisión la experiencia de tus clientes.
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
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {info?.desc || ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      disabled={idx === 0}
                      onClick={() => moverSeccion(secClave, 'arriba')}
                      title="Mover hacia arriba"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      disabled={idx === form.orden_secciones.length - 1}
                      onClick={() => moverSeccion(secClave, 'abajo')}
                      title="Mover hacia abajo"
                    >
                      <ArrowDown size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleVisibilidad(secClave)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--rad-full)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        background: visible ? 'var(--primary)' : 'var(--surface-3)',
                        color: visible ? '#ffffff' : 'var(--text-muted)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {visible ? 'Visible' : 'Oculto'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: HERO & BANNER */}
      {tabActiva === 'hero' && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {/* Banner Superior */}
          <div className="panel" style={{ background: 'var(--surface)' }}>
            <div className="panel-header" style={{ marginBottom: '1rem' }}>
              <div>
                <div className="panel-title">Banner Superior Promocional</div>
                <div className="text-xs text-muted mt-1">Franja delgada superior para promociones directas.</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={form.banner_visible}
                  onChange={e => handleChange('banner_visible', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <div className="field">
                <label>Texto del anuncio</label>
                <input
                  type="text"
                  value={form.banner_texto}
                  onChange={e => handleChange('banner_texto', e.target.value)}
                  placeholder="Ej: ¡Reserva directa sin comisiones!"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px', gap: '0.75rem' }}>
                <div className="field">
                  <label>Texto del enlace</label>
                  <input
                    type="text"
                    value={form.banner_link_texto}
                    onChange={e => handleChange('banner_link_texto', e.target.value)}
                    placeholder="Ver disponibilidad"
                  />
                </div>
                <div className="field">
                  <label>Destino (#id o URL)</label>
                  <input
                    type="text"
                    value={form.banner_link_url}
                    onChange={e => handleChange('banner_link_url', e.target.value)}
                    placeholder="#catalogo"
                  />
                </div>
                <div className="field">
                  <label>Estilo / Tipo</label>
                  <select
                    value={form.banner_tipo}
                    onChange={e => handleChange('banner_tipo', e.target.value as any)}
                  >
                    <option value="promo">Promoción (Verde)</option>
                    <option value="info">Informativo (Azul)</option>
                    <option value="aviso">Aviso Especial (Dorado)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Encabezado Hero */}
          <div className="panel" style={{ background: 'var(--surface)' }}>
            <div className="panel-header" style={{ marginBottom: '1rem' }}>
              <div>
                <div className="panel-title">Encabezado Hero Principal</div>
                <div className="text-xs text-muted mt-1">Impacto visual inicial, títulos y llamadas a la acción.</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={form.hero_visible}
                  onChange={e => handleChange('hero_visible', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <div className="field">
                <label>Eyebrow / Sub-etiqueta superior</label>
                <input
                  type="text"
                  value={form.hero_eyebrow}
                  onChange={e => handleChange('hero_eyebrow', e.target.value)}
                  placeholder="Reserva directa sin comisiones"
                />
              </div>

              <div className="field">
                <label>Título Principal</label>
                <input
                  type="text"
                  value={form.hero_titulo}
                  onChange={e => handleChange('hero_titulo', e.target.value)}
                  placeholder="Tu escapada campestre empieza aquí"
                />
              </div>

              <div className="field">
                <label>Subtítulo o descripción persuasiva</label>
                <textarea
                  rows={2}
                  value={form.hero_subtitulo}
                  onChange={e => handleChange('hero_subtitulo', e.target.value)}
                  placeholder="Describe la experiencia campestre para tus clientes..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Texto Botón Primario</label>
                  <input
                    type="text"
                    value={form.hero_cta_texto}
                    onChange={e => handleChange('hero_cta_texto', e.target.value)}
                    placeholder="Explorar fincas disponibles"
                  />
                </div>
                <div className="field">
                  <label>Texto Botón Secundario</label>
                  <input
                    type="text"
                    value={form.hero_cta_secundario_texto}
                    onChange={e => handleChange('hero_cta_secundario_texto', e.target.value)}
                    placeholder="Conocer gastronomía"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.hero_mostrar_metricas}
                    onChange={e => handleChange('hero_mostrar_metricas', e.target.checked)}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Mostrar métricas en vivo (fincas disponibles / ocupación)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.hero_mostrar_pasos}
                    onChange={e => handleChange('hero_mostrar_pasos', e.target.checked)}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Mostrar los 3 pasos de reserva fácil</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: GRÁFICOS & VISUALIZACIÓN INTERACTIVA (CHART.JS / 3D) */}
      {tabActiva === 'graficos' && (
        <div className="panel" style={{ background: 'var(--surface)' }}>
          <div className="panel-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
                Visualización & Gráficos Interactivos (Chart.js)
              </div>
              <div className="text-xs text-muted mt-1">
                Permite al cliente comparar gráficamente fincas y calcular presupuestos con desglose de ahorro directo.
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={form.graficos_visible ?? true}
                onChange={e => handleChange('graficos_visible', e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="field">
              <label>Título de la sección de gráficos</label>
              <input
                type="text"
                value={form.graficos_titulo || ''}
                onChange={e => handleChange('graficos_titulo', e.target.value)}
                placeholder="Análisis Visual & Calculadora de Presupuesto"
              />
            </div>

            <div className="field">
              <label>Subtítulo descriptivo</label>
              <input
                type="text"
                value={form.graficos_subtitulo || ''}
                onChange={e => handleChange('graficos_subtitulo', e.target.value)}
                placeholder="Compara capacidades, tarifas y simula tu inversión con ahorro directo en tiempo real"
              />
            </div>

            <div className="field">
              <label>Modalidad de Gráficos a mostrar al cliente</label>
              <select
                value={form.graficos_tipo || 'ambos'}
                onChange={e => handleChange('graficos_tipo', e.target.value as any)}
              >
                <option value="ambos">Ambos (Pestañas con Comparativa de Barras + Simulador Doughnut)</option>
                <option value="comparativa">Solo Comparativa de Fincas (Barras: Capacidad vs Tarifa)</option>
                <option value="presupuesto">Solo Simulador de Presupuesto (Dona: Inversión + Ahorro Directo)</option>
              </select>
            </div>

            <div
              style={{
                background: 'var(--surface-2)',
                padding: '1rem',
                borderRadius: 'var(--rad-sm, 12px)',
                border: '1px solid var(--border)',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
              }}
            >
              <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '0.25rem' }}>
                💡 Impacto en el cliente:
              </strong>
              Los gráficos utilizan automáticamente los colores institucionales (esmeralda y dorado). El simulador resalta a los clientes el <strong>18% de ahorro directo</strong> al reservar contigo en lugar de usar plataformas externas con altas comisiones.
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: CATÁLOGO, COMPARADOR & PORTAL */}
      {tabActiva === 'busqueda' && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {/* Configuración de Catálogo */}
          <div className="panel" style={{ background: 'var(--surface)' }}>
            <div className="panel-header" style={{ marginBottom: '1rem' }}>
              <div>
                <div className="panel-title">Catálogo de Fincas Campestres</div>
                <div className="text-xs text-muted mt-1">Controla cómo se presentan las tarjetas y tarifas.</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={form.catalogo_visible}
                  onChange={e => handleChange('catalogo_visible', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Título del Catálogo</label>
                  <input
                    type="text"
                    value={form.catalogo_titulo}
                    onChange={e => handleChange('catalogo_titulo', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Vista predeterminada para el cliente</label>
                  <select
                    value={form.catalogo_vista_predeterminada || 'grid'}
                    onChange={e => handleChange('catalogo_vista_predeterminada', e.target.value as any)}
                  >
                    <option value="grid">Cuadrícula 3D de lujo (Tarjetas interactivas con tilt)</option>
                    <option value="lista">Lista compacta ejecutiva</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Subtítulo del Catálogo</label>
                <input
                  type="text"
                  value={form.catalogo_subtitulo}
                  onChange={e => handleChange('catalogo_subtitulo', e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.35rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.catalogo_mostrar_badges ?? true}
                    onChange={e => handleChange('catalogo_mostrar_badges', e.target.checked)}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Mostrar insignias de estado ("Disponible", "Alta demanda")</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.catalogo_mostrar_precio_total ?? true}
                    onChange={e => handleChange('catalogo_mostrar_precio_total', e.target.checked)}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Mostrar también precio de finca completa</span>
                </label>
              </div>
            </div>
          </div>

          {/* Comparador de Fincas */}
          <div className="panel" style={{ background: 'var(--surface)' }}>
            <div className="panel-header" style={{ marginBottom: '1rem' }}>
              <div>
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Scale size={18} style={{ color: 'var(--primary)' }} />
                  Comparador de Fincas Cara a Cara
                </div>
                <div className="text-xs text-muted mt-1">Permite a los huéspedes comparar 2 o 3 fincas simultáneamente.</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={form.comparador_visible ?? true}
                  onChange={e => handleChange('comparador_visible', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="field">
                <label>Título del Comparador</label>
                <input
                  type="text"
                  value={form.comparador_titulo || ''}
                  onChange={e => handleChange('comparador_titulo', e.target.value)}
                  placeholder="Comparador de Fincas"
                />
              </div>
              <div className="field">
                <label>Subtítulo</label>
                <input
                  type="text"
                  value={form.comparador_subtitulo || ''}
                  onChange={e => handleChange('comparador_subtitulo', e.target.value)}
                  placeholder="Analiza lado a lado las especificaciones y tarifas"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 5: DESTACADOS / BENEFICIOS */}
      {tabActiva === 'destacados' && (
        <div className="panel" style={{ background: 'var(--surface)' }}>
          <div className="panel-header" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="panel-title">Información Destacada y Beneficios</div>
              <div className="text-xs text-muted mt-1">Tarjetas de propuesta de valor y tranquilidad.</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button type="button" className="btn btn-sm btn-outline" onClick={handleAddBeneficio}>
                <Plus size={14} /> Añadir Beneficio
              </button>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={form.destacados_visible}
                  onChange={e => handleChange('destacados_visible', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="field">
                <label>Título de la sección</label>
                <input
                  type="text"
                  value={form.destacados_titulo}
                  onChange={e => handleChange('destacados_titulo', e.target.value)}
                />
              </div>
              <div className="field">
                <label>Subtítulo</label>
                <input
                  type="text"
                  value={form.destacados_subtitulo}
                  onChange={e => handleChange('destacados_subtitulo', e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.5rem' }}>
              {form.destacados_items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 1.5fr auto',
                    gap: '0.65rem',
                    alignItems: 'center',
                    background: 'var(--surface-2)',
                    padding: '0.65rem',
                    borderRadius: 'var(--rad-xs, 8px)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <input
                    type="text"
                    value={item.icono}
                    onChange={e => handleUpdateBeneficio(idx, 'icono', e.target.value)}
                    style={{ textAlign: 'center', fontSize: '1.25rem' }}
                    title="Icono o emoji"
                  />
                  <input
                    type="text"
                    value={item.titulo}
                    onChange={e => handleUpdateBeneficio(idx, 'titulo', e.target.value)}
                    placeholder="Título del beneficio"
                  />
                  <input
                    type="text"
                    value={item.descripcion}
                    onChange={e => handleUpdateBeneficio(idx, 'descripcion', e.target.value)}
                    placeholder="Descripción"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveBeneficio(idx)}
                    className="btn btn-sm"
                    style={{ color: 'var(--danger)', padding: '0.4rem' }}
                    title="Eliminar beneficio"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 6: GASTRONOMÍA */}
      {tabActiva === 'menus' && (
        <div className="panel" style={{ background: 'var(--surface)' }}>
          <div className="panel-header" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="panel-title">Gastronomía y Menús Campestres</div>
              <div className="text-xs text-muted mt-1">Presentación comercial de la alimentación en el sitio público.</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={form.menus_visible}
                onChange={e => handleChange('menus_visible', e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="field">
                <label>Título de la sección</label>
                <input
                  type="text"
                  value={form.menus_titulo}
                  onChange={e => handleChange('menus_titulo', e.target.value)}
                />
              </div>
              <div className="field">
                <label>Insignia superior (Badge)</label>
                <input
                  type="text"
                  value={form.menus_badge_texto}
                  onChange={e => handleChange('menus_badge_texto', e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>Subtítulo o descripción comercial</label>
              <textarea
                rows={2}
                value={form.menus_subtitulo}
                onChange={e => handleChange('menus_subtitulo', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 7: PREGUNTAS FRECUENTES (FAQ) */}
      {tabActiva === 'faq' && (
        <div className="panel" style={{ background: 'var(--surface)' }}>
          <div className="panel-header" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="panel-title">Preguntas Frecuentes (FAQ)</div>
              <div className="text-xs text-muted mt-1">Resuelve dudas sobre separación, check-in y formas de pago.</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button type="button" className="btn btn-sm btn-outline" onClick={handleAddFaq}>
                <Plus size={14} /> Añadir Pregunta
              </button>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={form.faq_visible}
                  onChange={e => handleChange('faq_visible', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="field">
                <label>Título de la sección</label>
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

            <div style={{ display: 'grid', gap: '0.85rem', marginTop: '0.5rem' }}>
              {form.faq_items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    background: 'var(--surface-2)',
                    padding: '0.85rem',
                    borderRadius: 'var(--rad-xs, 8px)',
                    border: '1px solid var(--border)',
                    display: 'grid',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                      Pregunta #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFaq(idx)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                      title="Eliminar pregunta"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.pregunta}
                    onChange={e => handleUpdateFaq(idx, 'pregunta', e.target.value)}
                    placeholder="Escribe la pregunta..."
                    style={{ fontWeight: 600 }}
                  />
                  <textarea
                    rows={2}
                    value={item.respuesta}
                    onChange={e => handleUpdateFaq(idx, 'respuesta', e.target.value)}
                    placeholder="Escribe la respuesta clara..."
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 8: PIE DE PÁGINA */}
      {tabActiva === 'footer' && (
        <div className="panel" style={{ background: 'var(--surface)' }}>
          <div className="panel-header" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="panel-title">Pie de Página (Footer)</div>
              <div className="text-xs text-muted mt-1">Cierre de página, WhatsApp institucional y redes sociales.</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={form.footer_visible}
                onChange={e => handleChange('footer_visible', e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <div className="field">
              <label>Título / Nombre Institucional</label>
              <input
                type="text"
                value={form.footer_titulo}
                onChange={e => handleChange('footer_titulo', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Subtítulo o descripción de pie de página</label>
              <textarea
                rows={2}
                value={form.footer_subtitulo}
                onChange={e => handleChange('footer_subtitulo', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Llamada a la acción (WhatsApp)</label>
              <input
                type="text"
                value={form.footer_whatsapp_cta}
                onChange={e => handleChange('footer_whatsapp_cta', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL SIMULADOR DE VISTA PREVIA EN VIVO ─── */}
      {modalPreviewOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1rem',
          }}
          onClick={() => setModalPreviewOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: previewDevice === 'mobile' ? '420px' : '95%',
              maxWidth: '1200px',
              height: '92vh',
              background: 'var(--bg)',
              borderRadius: 'var(--rad-md, 18px)',
              border: '2px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--sh-lg)',
              overflow: 'hidden',
              transition: 'width 0.3s ease',
            }}
          >
            {/* Barra de control del simulador */}
            <div
              style={{
                padding: '0.75rem 1.25rem',
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)' }}>
                  Simulador en Tiempo Real
                </span>
                <span className="status-badge s-info" style={{ fontSize: '0.68rem' }}>
                  {form.orden_secciones.filter(esVisible).length} secciones activas
                </span>
              </div>

              {/* Selector de Dispositivo */}
              <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--surface-2)', padding: '0.2rem', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: previewDevice === 'desktop' ? 'var(--primary)' : 'transparent',
                    color: previewDevice === 'desktop' ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Monitor size={14} /> Escritorio
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: previewDevice === 'mobile' ? 'var(--primary)' : 'transparent',
                    color: previewDevice === 'mobile' ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Smartphone size={14} /> Móvil
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={async () => {
                    await handleGuardar();
                    setModalPreviewOpen(false);
                  }}
                >
                  <Save size={14} /> Aplicar Cambios
                </button>
                <button
                  type="button"
                  onClick={() => setModalPreviewOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Contenido Simulado con Scroll */}
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1.25rem' }}>
              {/* Banner Simulado */}
              {form.banner_visible && (
                <div
                  style={{
                    padding: '0.65rem 1rem',
                    background: 'var(--primary-bg)',
                    color: 'var(--primary-h)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    marginBottom: '1rem',
                  }}
                >
                  {form.banner_texto}
                </div>
              )}

              {/* Hero Simulado */}
              {form.hero_visible && (
                <div
                  style={{
                    padding: '2rem 1.5rem',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--rad-md, 16px)',
                    textAlign: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                    {form.hero_eyebrow}
                  </span>
                  <h1 style={{ fontSize: previewDevice === 'mobile' ? '1.5rem' : '2.2rem', margin: '0.5rem 0', fontWeight: 900 }}>
                    {form.hero_titulo}
                  </h1>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 1.25rem auto' }}>
                    {form.hero_subtitulo}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button className="btn btn-primary btn-sm">{form.hero_cta_texto}</button>
                    <button className="btn btn-outline btn-sm">{form.hero_cta_secundario_texto}</button>
                  </div>
                </div>
              )}

              {/* Lista de Secciones Configuradas */}
              <div style={{ display: 'grid', gap: '1rem' }}>
                {form.orden_secciones
                  .filter(s => s !== 'banner' && s !== 'hero' && esVisible(s))
                  .map(sec => {
                    const info = SECCIONES_INFO[sec];
                    return (
                      <div
                        key={sec}
                        style={{
                          padding: '1.25rem',
                          background: 'var(--surface)',
                          border: '1.5px dashed var(--border)',
                          borderRadius: 'var(--rad-sm, 12px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span style={{ color: 'var(--primary)' }}>{info?.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                              {info?.label || sec}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {info?.desc || ''}
                            </div>
                          </div>
                        </div>
                        <span className="status-badge s-avail" style={{ fontSize: '0.68rem' }}>
                          Sección Activa
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
