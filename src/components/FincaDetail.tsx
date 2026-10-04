import React, { useState } from 'react';
import { ArrowLeft, MapPin, Users, Check, Sparkles, Image as ImageIcon, Bed, Bath, Clock, ShieldAlert, Dog, Volume2 } from 'lucide-react';
import { CalendarPicker } from './CalendarPicker';
import { QuoteCalculator } from './QuoteCalculator';
import { GalleryLightbox } from './GalleryLightbox';
import { CollapsibleSection } from './CollapsibleSection';
import type { Finca, BloqueoDisponibilidad, Menu } from '../types';
import type { DatosCotizacionPublica, ResultadoCotizacionPublica } from '../hooks/useCotizadorPublico';

interface FincaDetailProps {
  finca: Finca;
  bloques: BloqueoDisponibilidad[];
  waNumberGlobal: string;
  menus?: Menu[];
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

export const FincaDetail: React.FC<FincaDetailProps> = ({
  finca,
  bloques,
  waNumberGlobal,
  menus = [],
  onBackToCatalog,
  onGuardarCotizacion,
}) => {

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [personas, setPersonas] = useState(Math.min(finca.capacidad || 10, 12));
  const [plan, setPlan] = useState('Todo incluido');

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Recopilación de imágenes
  const fincaImages = (finca.finca_imagenes || []).sort((a, b) => a.orden - b.orden);
  const imagesList = fincaImages.length > 0
    ? fincaImages.map(i => i.url)
    : DEFAULT_FALLBACK_IMAGES;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const estadoInfo = estadoMap[finca.estado] || { cls: 's-info', lbl: finca.estado };
  const precioFormatted = finca.precio_pp ? Number(finca.precio_pp).toLocaleString('es-CO') : '0';

  const handleRangeSelect = (inicio: string, fin: string) => {
    setFechaInicio(inicio);
    setFechaFin(fin);
  };

  const handleClearRange = () => {
    setFechaInicio('');
    setFechaFin('');
  };

  return (
    <div className="detail-shell">
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
              <span><Users size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> hasta {finca.capacidad} personas</span>
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
          <span className={`status-badge ${estadoInfo.cls}`}>{estadoInfo.lbl}</span>
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
                {finca.finca_amenidades.map((amenidad, idx) => (
                  <span key={idx} className="amenity">
                    <Check size={13} style={{ color: 'var(--primary)' }} /> {amenidad.nombre}
                  </span>
                ))}
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
          onFechaInicioChange={setFechaInicio}
          onFechaFinChange={setFechaFin}
          onPersonasChange={setPersonas}
          onPlanChange={setPlan}
          onGuardarCotizacion={onGuardarCotizacion}
        />

      </div>

      {/* Lightbox para visualización de fotos */}
      <GalleryLightbox
        isOpen={lightboxOpen}
        images={imagesList}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
};
