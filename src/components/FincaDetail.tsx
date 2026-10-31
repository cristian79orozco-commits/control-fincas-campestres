import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft, MapPin, Users, Check, Sparkles, Image as ImageIcon,
  Bed, Bath, Clock, ShieldAlert, Dog, Volume2, Calendar, Calculator,
  ChevronLeft, ChevronRight, ShieldCheck, Home
} from 'lucide-react';
import { CalendarPicker } from './CalendarPicker';
import { QuoteCalculator } from './QuoteCalculator';
import { GalleryLightbox } from './GalleryLightbox';
import { CollapsibleSection } from './CollapsibleSection';
import type { Finca, BloqueoDisponibilidad, Menu, ConfiguracionGeneral } from '../types';
import type { DatosCotizacionPublica, ResultadoCotizacionPublica } from '../hooks/useCotizadorPublico';
import { getAmenidadInfo } from '../utils/amenidades';

interface FincaDetailProps {
  finca: Finca;
  bloques: BloqueoDisponibilidad[];
  waNumberGlobal: string;
  menus?: Menu[];
  configuracion?: ConfiguracionGeneral;
  onBackToCatalog: () => void;
  /** Etapa 2: conecta el cotizador público con Supabase */
  onGuardarCotizacion?: (datos: DatosCotizacionPublica) => Promise<ResultadoCotizacionPublica>;
}

const estadoMap: Record<string, { cls: string; lbl: string }> = {
  disponible: { cls: 's-avail', lbl: 'Disponible' },
  alta_demanda: { cls: 's-warn', lbl: 'Alta demanda' },
  no_disponible: { cls: 's-busy', lbl: 'No disponible' },
  fin_de_semana: { cls: 's-info', lbl: 'Fin de semana' },
};

const DEFAULT_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
];

const FincaDetailComponent: React.FC<FincaDetailProps> = ({
  finca,
  bloques,
  waNumberGlobal,
  menus = [],
  configuracion,
  onBackToCatalog,
  onGuardarCotizacion,
}) => {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const minCapacidad = Math.max(1, finca.capacidad_minima || 1);
  const maxCapacidad = Math.max(minCapacidad, finca.capacidad || 10);
  const [personas, setPersonas] = useState(Math.max(minCapacidad, Math.min(maxCapacidad, 10)));
  const [plan, setPlan] = useState('Todo incluido');

  // Detección responsive para dispositivos móviles
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 860;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 859px)');
    const update = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    update(mq);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Estado exclusivo para navegación móvil por pestañas
  const [activeMobileTab, setActiveMobileTab] = useState<'finca' | 'disponibilidad' | 'cotizar'>('finca');
  const [mobilePhotoIndex, setMobilePhotoIndex] = useState(0);
  const [descExpandida, setDescExpandida] = useState(false);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Recopilación de imágenes memoizada para estabilidad de referencias
  const imagesList = useMemo(() => {
    const fincaImages = [...(finca.finca_imagenes || [])].sort((a, b) => a.orden - b.orden);
    return fincaImages.length > 0 ? fincaImages.map(i => i.url) : DEFAULT_FALLBACK_IMAGES;
  }, [finca.finca_imagenes]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const estadoInfo = estadoMap[finca.estado] || { cls: 's-info', lbl: finca.estado };
  const precioFormatted = finca.precio_pp ? Number(finca.precio_pp).toLocaleString('es-CO') : '0';

  const handleRangeSelect = useCallback((inicio: string, fin: string) => {
    setFechaInicio(inicio);
    setFechaFin(fin);
  }, []);

  const handleClearRange = useCallback(() => {
    setFechaInicio('');
    setFechaFin('');
  }, []);

  // Cálculo de noches para badges y resumen
  const nochesEstadia = useMemo(() => {
    if (!fechaInicio || !fechaFin) return 0;
    const ini = new Date(fechaInicio + 'T00:00:00').getTime();
    const fn = new Date(fechaFin + 'T00:00:00').getTime();
    if (fn <= ini) return 0;
    return Math.round((fn - ini) / (1000 * 60 * 60 * 24));
  }, [fechaInicio, fechaFin]);

  const subtotalEstimadoAlojamiento = useMemo(() => {
    const p = Number(finca.precio_pp || 0);
    const n = nochesEstadia > 0 ? nochesEstadia : 1;
    return p * n * personas;
  }, [finca.precio_pp, nochesEstadia, personas]);

  // Controles de foto móvil
  const handlePrevMobilePhoto = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMobilePhotoIndex(prev => (prev === 0 ? imagesList.length - 1 : prev - 1));
  }, [imagesList.length]);

  const handleNextMobilePhoto = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMobilePhotoIndex(prev => (prev === imagesList.length - 1 ? 0 : prev + 1));
  }, [imagesList.length]);

  const scrollToTabs = useCallback(() => {
    const el = document.getElementById('mobile-tabs-bar');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <>
      {/* ============================================================== */}
      {/* VISTA MÓVIL (Android & iPhone - Reestructurada, limpia y rápida) */}
      {/* ============================================================== */}
      {isMobile ? (
        <div className="mobile-detail-shell mobile-only">
          {/* Cabecera Móvil */}
          <div className="mobile-detail-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={onBackToCatalog}
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem' }}
              >
                <ArrowLeft size={13} /> Catálogo
              </button>
              <span className={`status-badge ${estadoInfo.cls}`} style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span className="pulse-dot" />
                {estadoInfo.lbl}
              </span>
            </div>

            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.2rem 0', color: 'var(--text-main)', lineHeight: 1.25 }}>
                {finca.nombre}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <MapPin size={12} style={{ color: 'var(--primary)' }} /> {finca.zona || 'Santa Elena, Valle'}
                </span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <Users size={12} style={{ color: 'var(--primary)' }} /> Hasta {finca.capacidad} personas
                </span>
              </div>
            </div>
          </div>

          {/* Carrusel Táctil de Fotos Móvil */}
          <div
            className="mobile-carousel-container"
            onClick={() => openLightbox(mobilePhotoIndex)}
            role="button"
            tabIndex={0}
          >
            <img
              src={imagesList[mobilePhotoIndex]}
              alt={`${finca.nombre} foto ${mobilePhotoIndex + 1}`}
              className="mobile-carousel-img"
              loading="eager"
            />

            {/* Flecha Anterior */}
            {imagesList.length > 1 && (
              <button
                type="button"
                className="mobile-carousel-arrow prev"
                onClick={handlePrevMobilePhoto}
                aria-label="Foto anterior"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            {/* Flecha Siguiente */}
            {imagesList.length > 1 && (
              <button
                type="button"
                className="mobile-carousel-arrow next"
                onClick={handleNextMobilePhoto}
                aria-label="Foto siguiente"
              >
                <ChevronRight size={18} />
              </button>
            )}

            {/* Badge Contador y Visor */}
            <div className="mobile-carousel-badge">
              <ImageIcon size={12} />
              <span>{mobilePhotoIndex + 1} / {imagesList.length}</span>
              <span style={{ opacity: 0.6 }}>•</span>
              <span style={{ textDecoration: 'underline', fontSize: '0.68rem' }}>Ver todas</span>
            </div>
          </div>

          {/* Barra de Pestañas Táctiles Segmentadas */}
          <div id="mobile-tabs-bar" className="mobile-detail-tabs">
            <button
              type="button"
              className={`mobile-tab-btn ${activeMobileTab === 'finca' ? 'active' : ''}`}
              onClick={() => {
                setActiveMobileTab('finca');
                scrollToTabs();
              }}
            >
              <Home size={15} />
              <span>Finca</span>
            </button>

            <button
              type="button"
              className={`mobile-tab-btn ${activeMobileTab === 'disponibilidad' ? 'active' : ''}`}
              onClick={() => {
                setActiveMobileTab('disponibilidad');
                scrollToTabs();
              }}
            >
              <Calendar size={15} />
              <span>Fechas</span>
              {nochesEstadia > 0 && (
                <span className="mobile-tab-badge">{nochesEstadia}n</span>
              )}
            </button>

            <button
              type="button"
              className={`mobile-tab-btn ${activeMobileTab === 'cotizar' ? 'active' : ''}`}
              onClick={() => {
                setActiveMobileTab('cotizar');
                scrollToTabs();
              }}
            >
              <Calculator size={15} />
              <span>Cotizar</span>
            </button>
          </div>

          {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA EN MÓVIL */}

          {/* Pestaña 1: Finca y Detalles Clave */}
          {activeMobileTab === 'finca' && (
            <div className="mobile-tab-card">
              {/* Tarifa destacada con garantía directa */}
              <div
                style={{
                  background: 'color-mix(in srgb, var(--primary) 6%, var(--surface))',
                  border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
                  borderRadius: 'var(--rad-xs, 8px)',
                  padding: '0.75rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Tarifa por persona / noche
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>
                    ${precioFormatted} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>COP</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <ShieldCheck size={13} style={{ color: 'var(--success)' }} /> Sin comisiones
                </span>
              </div>

              {/* Ficha técnica rápida de capacidad y cuartos */}
              <div className="mobile-spec-grid">
                <div className="mobile-spec-item">
                  <Users size={15} style={{ color: 'var(--primary)' }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{finca.capacidad_minima && finca.capacidad_minima > 1 ? `${finca.capacidad_minima} a ${finca.capacidad}` : `Hasta ${finca.capacidad}`}</div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Personas</div>
                  </div>
                </div>

                <div className="mobile-spec-item">
                  <Bed size={15} style={{ color: 'var(--primary)' }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{finca.habitaciones || '—'}</div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Habitaciones</div>
                  </div>
                </div>

                <div className="mobile-spec-item">
                  <Bed size={15} style={{ color: 'var(--primary)' }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{finca.camas || '—'}</div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Camas</div>
                  </div>
                </div>

                <div className="mobile-spec-item">
                  <Bath size={15} style={{ color: 'var(--primary)' }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{finca.banos || '—'}</div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Baños</div>
                  </div>
                </div>
              </div>

              {/* Descripción resumida con Leer más */}
              <div>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                  Sobre esta finca
                </h3>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    lineHeight: '1.5',
                    overflow: descExpandida ? 'visible' : 'hidden',
                    display: descExpandida ? 'block' : '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: descExpandida ? 'unset' : 3,
                  } as React.CSSProperties}
                >
                  {finca.descripcion || 'Disfruta de una estancia inolvidable en medio de la naturaleza, con amplias zonas verdes, total privacidad y todas las comodidades para tu grupo o familia.'}
                </div>
                {finca.descripcion && finca.descripcion.length > 120 && (
                  <button
                    type="button"
                    onClick={() => setDescExpandida(v => !v)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '0.25rem 0 0 0',
                    }}
                  >
                    {descExpandida ? 'Mostrar menos' : 'Leer descripción completa →'}
                  </button>
                )}
              </div>

              {/* Comodidades y servicios */}
              {finca.finca_amenidades && finca.finca_amenidades.length > 0 && (
                <CollapsibleSection
                  title="Comodidades y servicios"
                  badge={finca.finca_amenidades.length}
                  defaultOpen={true}
                  icon={<Check size={15} />}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', paddingTop: '0.5rem' }}>
                    {finca.finca_amenidades.map((amenidad, idx) => {
                      const info = getAmenidadInfo(amenidad.nombre, amenidad.icono);
                      return (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.74rem',
                            background: 'var(--surface-sunken)',
                            padding: '0.35rem 0.55rem',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            color: 'var(--text-main)',
                          }}
                        >
                          <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{info.emoji}</span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.cleanNombre}</span>
                        </span>
                      );
                    })}
                  </div>
                </CollapsibleSection>
              )}

              {/* Planes de estadía disponibles */}
              {finca.finca_planes && finca.finca_planes.length > 0 && (
                <CollapsibleSection
                  title="Planes de estadía"
                  badge={finca.finca_planes.length}
                  defaultOpen={false}
                  icon={<Sparkles size={15} />}
                >
                  <div className="plans-row" style={{ paddingTop: '0.5rem' }}>
                    {finca.finca_planes.map((p, idx) => (
                      <span key={idx} className="plan-tag" style={{ fontSize: '0.72rem' }}>
                        <Sparkles size={10} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                        {p.nombre}
                      </span>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Horarios y políticas clave */}
              <CollapsibleSection
                title="Horarios y condiciones"
                badge="Importante"
                defaultOpen={true}
                icon={<Clock size={15} />}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', paddingTop: '0.5rem' }}>
                  <div style={{ background: 'var(--surface-sunken)', padding: '0.5rem 0.65rem', borderRadius: 'var(--rad-xs)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Check-in (Entrada)</div>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', marginTop: '0.1rem' }}>
                      {finca.checkin_hora || '3:00 PM'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--surface-sunken)', padding: '0.5rem 0.65rem', borderRadius: 'var(--rad-xs)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Check-out (Salida)</div>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', marginTop: '0.1rem' }}>
                      {finca.checkout_hora || '1:00 PM'}
                    </div>
                  </div>

                  {finca.politica_mascotas && (
                    <div style={{ background: 'var(--surface-sunken)', padding: '0.5rem 0.65rem', borderRadius: 'var(--rad-xs)', gridColumn: 'span 2' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Dog size={12} style={{ color: 'var(--primary)' }} /> Mascotas
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.76rem', marginTop: '0.1rem' }}>
                        {finca.politica_mascotas === 'permitido' ? 'Bienvenidas sin costo' : finca.politica_mascotas === 'con_costo' ? 'Se aceptan con costo adicional' : 'No permitidas'}
                      </div>
                    </div>
                  )}
                </div>

                {finca.normas && (
                  <div style={{ marginTop: '0.55rem', background: 'var(--surface-sunken)', padding: '0.55rem 0.7rem', borderRadius: 'var(--rad-xs)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <ShieldAlert size={12} style={{ color: 'var(--warning)' }} /> Normas de la finca:
                    </div>
                    {finca.normas}
                  </div>
                )}
              </CollapsibleSection>

              {/* Botón de acción al pie de la pestaña */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setActiveMobileTab('disponibilidad');
                  scrollToTabs();
                }}
                style={{ width: '100%', padding: '0.8rem', marginTop: '0.2rem', fontWeight: 700 }}
              >
                <Calendar size={16} /> Consultar disponibilidad y fechas →
              </button>
            </div>
          )}

          {/* Pestaña 2: Calendario y Disponibilidad */}
          {activeMobileTab === 'disponibilidad' && (
            <div className="mobile-tab-card">
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  Fechas de estadía
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Toca primero tu día de llegada y luego el día de salida:
                </div>
              </div>

              <CalendarPicker
                bloques={bloques}
                fechaInicio={fechaInicio}
                fechaFin={fechaFin}
                onRangeSelect={handleRangeSelect}
                onClearRange={handleClearRange}
              />

              {/* Resumen de fechas elegidas */}
              {fechaInicio && fechaFin ? (
                <div
                  style={{
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: 'var(--rad-xs, 6px)',
                    padding: '0.75rem 0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16a34a' }}>
                    ✓ Fechas seleccionadas: {nochesEstadia} noche{nochesEstadia !== 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>
                    Llegada: <strong>{fechaInicio}</strong> · Salida: <strong>{fechaFin}</strong>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setActiveMobileTab('cotizar');
                      scrollToTabs();
                    }}
                    style={{ width: '100%', marginTop: '0.2rem', padding: '0.75rem', fontWeight: 700 }}
                  >
                    <Calculator size={16} /> Continuar al cotizador con estas fechas →
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    background: 'var(--surface-sunken)',
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--rad-xs, 6px)',
                    padding: '0.75rem 0.85rem',
                    fontSize: '0.76rem',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                  }}
                >
                  Selecciona en el calendario de arriba para fijar tus fechas de estadía.
                </div>
              )}
            </div>
          )}

          {/* Pestaña 3: Cotizador Completo & Reserva Express */}
          {activeMobileTab === 'cotizar' && (
            <div className="mobile-tab-card">
              <QuoteCalculator
                finca={finca}
                fechaInicio={fechaInicio}
                fechaFin={fechaFin}
                personas={personas}
                plan={plan}
                waNumberGlobal={waNumberGlobal}
                menus={menus}
                configuracion={configuracion}
                onFechaInicioChange={setFechaInicio}
                onFechaFinChange={setFechaFin}
                onPersonasChange={setPersonas}
                onPlanChange={setPlan}
                onGuardarCotizacion={onGuardarCotizacion}
              />
            </div>
          )}

          {/* Barra Flotante Inferior Móvil (Sticky Booking Bar) */}
          <div className="mobile-booking-bar">
            <div>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                {fechaInicio && fechaFin ? `Total estadía (${nochesEstadia}n · ${personas}p)` : 'Tarifa directa /pp'}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1.1 }}>
                {fechaInicio && fechaFin
                  ? `$${subtotalEstimadoAlojamiento.toLocaleString('es-CO')}`
                  : `$${precioFormatted}`}
                <span style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '2px' }}>
                  {fechaInicio && fechaFin ? 'COP' : '/noche'}
                </span>
              </div>
            </div>

            <div>
              {activeMobileTab === 'finca' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setActiveMobileTab('disponibilidad');
                    scrollToTabs();
                  }}
                  style={{ padding: '0.65rem 0.95rem', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  <Calendar size={14} /> Fechas
                </button>
              )}

              {activeMobileTab === 'disponibilidad' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setActiveMobileTab('cotizar');
                    scrollToTabs();
                  }}
                  style={{ padding: '0.65rem 0.95rem', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  <Calculator size={14} /> Cotizar
                </button>
              )}

              {activeMobileTab === 'cotizar' && (
                <button
                  type="button"
                  className="btn wa-btn"
                  onClick={() => {
                    const btn = document.getElementById('cotizador-btn-generar');
                    if (btn) {
                      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      btn.focus();
                    }
                  }}
                  style={{ padding: '0.65rem 0.95rem', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Ir a reservar
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* VISTA DE ESCRITORIO (PC Desktop - 100% INTACTA Y SIN CAMBIOS)  */
        /* ============================================================== */
        <div className="detail-shell desktop-only">
          {/* Columna Izquierda: Información de la propiedad y Galería */}
          <div className="detail-panel">
            <div className="panel-header">
              <div>
                <button className="btn btn-sm" onClick={onBackToCatalog} style={{ marginBottom: '0.75rem' }}>
                  <ArrowLeft size={14} /> Volver al catálogo
                </button>
                <div className="panel-title">{finca.nombre}</div>
                <div className="text-muted text-sm mt-1" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span><MapPin size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> {finca.zona || 'Santa Elena, Valle'}</span>
                  <span><Users size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> {finca.capacidad_minima && finca.capacidad_minima > 1 ? `${finca.capacidad_minima} a ${finca.capacidad}` : `hasta ${finca.capacidad}`} personas</span>
                  {finca.habitaciones ? (
                    <span><Bed size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> {finca.habitaciones} habs</span>
                  ) : null}
                  {finca.camas ? (
                    <span><Bed size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> {finca.camas} camas</span>
                  ) : null}
                  {finca.banos ? (
                    <span><Bath size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> {finca.banos} baños</span>
                  ) : null}
                  <strong className="text-primary">${precioFormatted} /pp noche</strong>
                </div>
              </div>
              <span className={`status-badge ${estadoInfo.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span className="pulse-dot" />
                {estadoInfo.lbl}
              </span>
            </div>

            {/* Galería de imágenes estilo mosaico */}
            <div className="gallery-grid">
              <div className="gallery-img-wrap main-img" onClick={() => openLightbox(0)}>
                <img loading="lazy" src={imagesList[0]} alt={finca.nombre} />
              </div>
              {imagesList.slice(1, 5).map((url, idx) => {
                const realIdx = idx + 1;
                const isLast = realIdx === 4 && imagesList.length > 5;
                return (
                  <div key={idx} className="gallery-img-wrap" onClick={() => openLightbox(realIdx)}>
                    <img loading="lazy" src={url} alt={`${finca.nombre} ${realIdx + 1}`} />
                    {isLast && (
                      <div className="gallery-badge">
                        <ImageIcon size={18} style={{ marginRight: '4px' }} /> +{imagesList.length - 5} fotos
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Descripción */}
            <div style={{ marginTop: '1.25rem' }}>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: '0.4rem' }}>
                Sobre esta finca campestre
              </h3>
              <div
                className="detail-desc"
                style={{
                  whiteSpace: 'pre-line',
                  wordBreak: 'break-word',
                  lineHeight: '1.7',
                }}
              >
                {finca.descripcion || 'Disfruta de una estancia inolvidable en medio de la naturaleza, con amplias zonas verdes, total privacidad y todas las comodidades para tu grupo o familia.'}
              </div>
            </div>

            {/* Amenidades y Servicios */}
            {finca.finca_amenidades && finca.finca_amenidades.length > 0 && (
              <div style={{ marginTop: '1.25rem' }}>
                <CollapsibleSection
                  title="Comodidades y servicios"
                  badge={finca.finca_amenidades.length}
                  defaultOpen={true}
                  icon={<Check size={16} />}
                >
                  <div className="amenities-grid" style={{ paddingTop: '0.75rem' }}>
                    {finca.finca_amenidades.map((amenidad, idx) => {
                      const info = getAmenidadInfo(amenidad.nombre, amenidad.icono);
                      return (
                        <span key={idx} className="amenity" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>{info.emoji}</span>
                          <span>{info.cleanNombre}</span>
                        </span>
                      );
                    })}
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {/* Planes de estadía */}
            {finca.finca_planes && finca.finca_planes.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <CollapsibleSection
                  title="Planes de estadía disponibles"
                  badge={finca.finca_planes.length}
                  defaultOpen={true}
                  icon={<Sparkles size={16} />}
                >
                  <div className="plans-row" style={{ paddingTop: '0.75rem' }}>
                    {finca.finca_planes.map((p, idx) => (
                      <span key={idx} className="plan-tag">
                        <Sparkles size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                        {p.nombre}
                      </span>
                    ))}
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {/* Horarios y condiciones de estadía */}
            <div style={{ marginTop: '1rem' }}>
              <CollapsibleSection
                title="Horarios y condiciones de estadía"
                badge="Información clave"
                defaultOpen={true}
                icon={<Clock size={16} />}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', paddingTop: '0.75rem' }}>
                  <div style={{ background: 'var(--surface-2)', padding: '0.65rem 0.85rem', borderRadius: 'var(--rad-xs)' }}>
                    <div className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={13} style={{ color: 'var(--primary)' }} /> Check-in (Entrada)
                    </div>
                    <div style={{ fontWeight: 700, marginTop: '0.15rem' }}>
                      {finca.checkin_hora || '15:00 (3:00 PM)'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--surface-2)', padding: '0.65rem 0.85rem', borderRadius: 'var(--rad-xs)' }}>
                    <div className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={13} style={{ color: 'var(--primary)' }} /> Check-out (Salida)
                    </div>
                    <div style={{ fontWeight: 700, marginTop: '0.15rem' }}>
                      {finca.checkout_hora || '13:00 (1:00 PM)'}
                    </div>
                  </div>

                  {finca.politica_mascotas && (
                    <div style={{ background: 'var(--surface-2)', padding: '0.65rem 0.85rem', borderRadius: 'var(--rad-xs)' }}>
                      <div className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Dog size={13} style={{ color: 'var(--primary)' }} /> Mascotas
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '0.15rem' }}>
                        {finca.politica_mascotas === 'permitido'
                          ? 'Bienvenidas sin costo'
                          : finca.politica_mascotas === 'con_costo'
                          ? `Se aceptan ($${Number(finca.valor_mascota || 0).toLocaleString('es-CO')} c/u)`
                          : finca.politica_mascotas === 'consulta_previa'
                          ? 'Previa consulta / razas pequeñas'
                          : 'No permitidas'}
                      </div>
                    </div>
                  )}

                  {finca.politica_musica && (
                    <div style={{ background: 'var(--surface-2)', padding: '0.65rem 0.85rem', borderRadius: 'var(--rad-xs)' }}>
                      <div className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Volume2 size={13} style={{ color: 'var(--primary)' }} /> Música y sonido
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '0.15rem' }}>
                        {finca.politica_musica === 'moderada' ? 'Música moderada' : finca.politica_musica === 'hasta_medianoche' ? 'Hasta 12:00 AM' : finca.politica_musica === 'sin_restriccion' ? 'Eventos permitidos' : 'Tranquilidad total'}
                      </div>
                    </div>
                  )}
                </div>

                {finca.normas && (
                  <div style={{ marginTop: '0.75rem', background: 'var(--surface-sunken)', padding: '0.65rem 0.85rem', borderRadius: 'var(--rad-xs)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <ShieldAlert size={13} style={{ color: 'var(--warning)' }} /> Normas importantes:
                    </div>
                    {finca.normas}
                  </div>
                )}
              </CollapsibleSection>
            </div>

            {/* Galería completa si tiene más de 5 fotos */}
            {imagesList.length > 5 && (
              <div style={{ marginTop: '1rem' }}>
                <CollapsibleSection
                  title="Galería completa de fotos"
                  badge={`${imagesList.length} fotos`}
                  defaultOpen={false}
                  icon={<ImageIcon size={16} />}
                >
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '0.5rem',
                    paddingTop: '0.75rem',
                  }}>
                    {imagesList.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => openLightbox(idx)}
                        style={{
                          borderRadius: 'var(--rad-xs, 6px)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          height: '75px',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <img
                          src={url}
                          alt={`${finca.nombre} foto ${idx + 1}`}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              </div>
            )}
          </div>

          {/* Columna Derecha: Calendario Interactivo y Cotizador en Vivo */}
          <div className="detail-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Consultar disponibilidad y cotizar</div>
                <div className="text-xs text-muted mt-1">Selecciona tus fechas en el calendario</div>
              </div>
            </div>

            <CalendarPicker
              bloques={bloques}
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
              onRangeSelect={handleRangeSelect}
              onClearRange={handleClearRange}
            />

            <div className="divider" style={{ margin: '1.25rem 0' }} />

            <QuoteCalculator
              finca={finca}
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
              personas={personas}
              plan={plan}
              waNumberGlobal={waNumberGlobal}
              menus={menus}
              configuracion={configuracion}
              onFechaInicioChange={setFechaInicio}
              onFechaFinChange={setFechaFin}
              onPersonasChange={setPersonas}
              onPlanChange={setPlan}
              onGuardarCotizacion={onGuardarCotizacion}
            />
          </div>
        </div>
      )}

      {/* Lightbox para visualización de fotos en pantalla completa */}
      <GalleryLightbox
        isOpen={lightboxOpen}
        images={imagesList}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
      />
    </>
  );
};

export const FincaDetail = React.memo<FincaDetailProps>(FincaDetailComponent);
FincaDetail.displayName = 'FincaDetail';
