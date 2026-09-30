import React, { useState } from 'react';
import { ArrowLeft, MapPin, Users, Check, Sparkles, Image as ImageIcon } from 'lucide-react';
import { CalendarPicker } from './CalendarPicker';
import { QuoteCalculator } from './QuoteCalculator';
import { GalleryLightbox } from './GalleryLightbox';
import type { Finca, BloqueoDisponibilidad } from '../types';

interface FincaDetailProps {
  finca: Finca;
  bloques: BloqueoDisponibilidad[];
  waNumberGlobal: string;
  onBackToCatalog: () => void;
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
  onBackToCatalog,
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
          <p className="detail-desc">
            {finca.descripcion || 'Disfruta de una estancia inolvidable en medio de la naturaleza, con amplias zonas verdes, total privacidad y todas las comodidades para tu grupo o familia.'}
          </p>
        </div>

        {/* Amenidades y Servicios */}
        {finca.finca_amenidades && finca.finca_amenidades.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: '0.5rem' }}>
              Comodidades y servicios
            </h3>
            <div className="amenities-grid">
              {finca.finca_amenidades.map((amenidad, idx) => (
                <span key={idx} className="amenity">
                  <Check size={13} style={{ color: 'var(--primary)' }} /> {amenidad.nombre}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Planes de alimentación */}
        {finca.finca_planes && finca.finca_planes.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: '0.5rem' }}>
              Planes de estadía disponibles
            </h3>
            <div className="plans-row">
              {finca.finca_planes.map((p, idx) => (
                <span key={idx} className="plan-tag">
                  <Sparkles size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                  {p.nombre}
                </span>
              ))}
            </div>
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
          onFechaInicioChange={setFechaInicio}
          onFechaFinChange={setFechaFin}
          onPersonasChange={setPersonas}
          onPlanChange={setPlan}
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
