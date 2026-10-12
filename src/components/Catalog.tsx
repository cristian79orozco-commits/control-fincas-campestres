import React, { useState, useMemo, useEffect } from 'react';
import {
  Filter, X, Search, Sparkles, Dog, Check, ChevronDown, ChevronUp,
  MapPin, Users, Bed, Bath, Calendar, MessageCircle, ArrowRight,
  ShieldCheck, Image as ImageIcon, Home, CheckCircle2
} from 'lucide-react';
import type { Finca, BloqueoDisponibilidad, ContenidoSitio } from '../types';

interface CatalogProps {
  fincas: Finca[];
  loading: boolean;
  bloquesAdmin: BloqueoDisponibilidad[];
  onSelectFinca: (fincaId: string) => void;
  contenido?: ContenidoSitio;
  waNumber?: string;
}

function formatCOP(v: number) {
  return '$' + (v || 0).toLocaleString('es-CO') + ' COP';
}

// ─── Skeleton Card para carga del catálogo ────────────────────────────────────
const SkeletonFincaItem: React.FC = () => (
  <div
    style={{
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--rad-xs, 8px)',
      padding: '0.65rem 0.8rem',
      display: 'flex',
      gap: '0.75rem',
      alignItems: 'center',
      background: 'var(--surface)',
    }}
  >
    <div className="skeleton-box" style={{ width: '64px', height: '64px', borderRadius: '6px', flexShrink: 0 }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flexGrow: 1 }}>
      <div className="skeleton-box" style={{ height: '14px', width: '60%' }} />
      <div className="skeleton-box" style={{ height: '12px', width: '40%' }} />
      <div className="skeleton-box" style={{ height: '12px', width: '30%' }} />
    </div>
  </div>
);

// Amenidades frecuentes para filtros rápidos de interés del cliente
const AMENIDADES_FILTRO = [
  'Piscina',
  'Jacuzzi',
  'Zona BBQ',
  'Cancha',
  'Wifi',
  'Billar / Juegos',
];

export const Catalog: React.FC<CatalogProps> = ({
  fincas,
  loading,
  bloquesAdmin,
  onSelectFinca,
  contenido,
  waNumber,
}) => {
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [fechaEntrada, setFechaEntrada] = useState('');
  const [fechaSalida, setFechaSalida] = useState('');
  const [personasFiltro, setPersonasFiltro] = useState('');
  const [amenidadesSeleccionadas, setAmenidadesSeleccionadas] = useState<string[]>([]);
  const [soloPetFriendly, setSoloPetFriendly] = useState(false);
  const [filtrosAvanzadosAbiertos, setFiltrosAvanzadosAbiertos] = useState(false);

  // Estado de la sección de fincas disponibles: DESPLEGADA por defecto según requerimiento
  const [seccionFincasAbierta, setSeccionFincasAbierta] = useState(true);

  const toggleAmenidad = (amenidad: string) => {
    setAmenidadesSeleccionadas(prev =>
      prev.includes(amenidad)
        ? prev.filter(a => a !== amenidad)
        : [...prev, amenidad]
    );
  };

  // Filtrado de fincas inteligente con comprobación de fechas reales, capacidad y amenidades
  const fincasFiltradas = useMemo(() => {
    return fincas.filter(finca => {
      // 1. Filtro por texto (nombre, zona o descripción)
      if (busquedaTexto.trim()) {
        const q = busquedaTexto.toLowerCase();
        const coincideNombre = (finca.nombre || '').toLowerCase().includes(q);
        const coincideZona = (finca.zona || '').toLowerCase().includes(q);
        const coincideDesc = (finca.descripcion || '').toLowerCase().includes(q);
        if (!coincideNombre && !coincideZona && !coincideDesc) return false;
      }

      // 2. Filtro por capacidad
      if (personasFiltro) {
        if (personasFiltro === 'Hasta 10' && finca.capacidad > 10) return false;
        if (personasFiltro === '10 – 20' && (finca.capacidad < 10 || finca.capacidad > 20)) return false;
        if (personasFiltro === '20 – 40' && (finca.capacidad < 20 || finca.capacidad > 40)) return false;
        if (personasFiltro === 'Más de 40' && finca.capacidad <= 40) return false;
      }

      // 3. Filtro Pet Friendly
      if (soloPetFriendly) {
        if (!finca.politica_mascotas || finca.politica_mascotas === 'no_permitido') {
          return false;
        }
      }

      // 4. Filtro por amenidades seleccionadas
      if (amenidadesSeleccionadas.length > 0) {
        const amenidadesFinca = (finca.finca_amenidades || []).map(a => a.nombre.toLowerCase());
        const cumpleTodas = amenidadesSeleccionadas.every(sel => {
          const selLower = sel.toLowerCase();
          return amenidadesFinca.some(af => af.includes(selLower) || selLower.includes(af));
        });
        if (!cumpleTodas) return false;
      }

      // 5. Filtro de disponibilidad real en fechas seleccionadas
      // Se evalúa tanto si el cliente ingresa solo fecha de entrada como rango completo
      if (fechaEntrada || fechaSalida) {
        const rInicio = fechaEntrada || fechaSalida;
        const rFin = fechaSalida || fechaEntrada;

        if (rFin < rInicio) return false;

        // Comprobar si esta finca tiene algún bloqueo ocupado en ese rango
        const tieneBloqueo = bloquesAdmin.some(b => {
          if (b.finca_id !== finca.id) return false;
          if (b.estado !== 'ocupado') return false;
          // Comparación robusta en formato ISO YYYY-MM-DD
          return b.fecha_inicio <= rFin && b.fecha_fin >= rInicio;
        });

        if (tieneBloqueo) return false;
      }

      return true;
    });
  }, [fincas, busquedaTexto, personasFiltro, soloPetFriendly, amenidadesSeleccionadas, fechaEntrada, fechaSalida, bloquesAdmin]);

  const handleLimpiarFiltros = () => {
    setBusquedaTexto('');
    setFechaEntrada('');
    setFechaSalida('');
    setPersonasFiltro('');
    setAmenidadesSeleccionadas([]);
    setSoloPetFriendly(false);
  };

  const hayFiltrosActivos = !!(
    busquedaTexto ||
    fechaEntrada ||
    fechaSalida ||
    personasFiltro ||
    amenidadesSeleccionadas.length > 0 ||
    soloPetFriendly
  );

  // Textos y visibilidad configurables
  const filtrosVisible = contenido?.filtros_visible ?? true;
  const filtrosTitulo = contenido?.filtros_titulo || 'Buscar disponibilidad y fincas';
  const filtrosSubtitulo = contenido?.filtros_subtitulo || 'Filtra por fechas de entrada, capacidad y comodidades para tu estancia';
  const catalogoVisible = contenido?.catalogo_visible ?? true;
  const catalogoTitulo = contenido?.catalogo_titulo || 'Fincas disponibles';
  const catalogoSubtitulo = contenido?.catalogo_subtitulo || 'Explora nuestras propiedades campestres con información y fotos de primera mano';
  const catalogoVacioTexto = contenido?.catalogo_vacio_texto || 'No se encontraron fincas disponibles para los criterios seleccionados.';

  return (
    <div className="cliente-flow">
      {/* 1. Panel de Búsqueda y Filtros Centralizados */}
      {filtrosVisible && (
        <div className="filters-card" id="catalogo" style={{ borderRadius: 'var(--rad-sm, 10px)' }}>
          <div className="sec-header" style={{ marginBottom: '0.85rem' }}>
            <div>
              <div className="sec-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={18} style={{ color: 'var(--primary)' }} /> {filtrosTitulo}
              </div>
              <div className="sec-sub">{filtrosSubtitulo}</div>
            </div>

            {hayFiltrosActivos && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleLimpiarFiltros}
                style={{ fontSize: '0.75rem', gap: '4px' }}
              >
                <X size={13} /> Limpiar filtros
              </button>
            )}
          </div>

          {/* Fila principal: Búsqueda, Fechas y Capacidad */}
          <div className="filters-grid">
            {/* Búsqueda por texto */}
            <div className="field">
              <label><Search size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Finca o palabra clave</label>
              <input
                type="text"
                placeholder="Ej: Paraíso, Piscina, Santa Elena..."
                value={busquedaTexto}
                onChange={e => setBusquedaTexto(e.target.value)}
              />
            </div>

            {/* Fecha Llegada (Garantiza filtrado en tiempo real) */}
            <div className="field">
              <label>
                <Calendar size={12} style={{ display: 'inline', verticalAlign: '-1px', color: 'var(--primary)' }} /> Fecha de llegada
              </label>
              <input
                type="date"
                value={fechaEntrada}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => {
                  const val = e.target.value;
                  setFechaEntrada(val);
                  if (fechaSalida && val && fechaSalida < val) {
                    setFechaSalida(val);
                  }
                }}
              />
            </div>

            {/* Fecha Salida */}
            <div className="field">
              <label>
                <Calendar size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Fecha de salida
              </label>
              <input
                type="date"
                value={fechaSalida}
                min={fechaEntrada || new Date().toISOString().split('T')[0]}
                onChange={e => setFechaSalida(e.target.value)}
              />
            </div>

            {/* Capacidad requerida */}
            <div className="field">
              <label>
                <Users size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Capacidad de huéspedes
              </label>
              <select
                value={personasFiltro}
                onChange={e => setPersonasFiltro(e.target.value)}
              >
                <option value="">Cualquier capacidad</option>
                <option value="Hasta 10">Hasta 10 personas</option>
                <option value="10 – 20">De 10 a 20 personas</option>
                <option value="20 – 40">De 20 a 40 personas</option>
                <option value="Más de 40">Más de 40 personas</option>
              </select>
            </div>
          </div>

          {/* Indicador de filtro de fechas activo */}
          {(fechaEntrada || fechaSalida) && (
            <div
              style={{
                marginTop: '0.5rem',
                fontSize: '0.74rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: 'var(--primary)',
                background: 'color-mix(in srgb, var(--primary) 8%, var(--surface))',
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--rad-xs, 6px)',
                width: 'fit-content',
              }}
            >
              <Calendar size={13} />
              <span>
                Filtro de disponibilidad: <strong>{fechaEntrada ? `Entrada: ${fechaEntrada}` : ''}</strong>
                {fechaSalida ? ` | Salida: ${fechaSalida}` : ' (comprobando fecha exacta)'}
                {' — '}
                {fincasFiltradas.length} finca{fincasFiltradas.length !== 1 ? 's' : ''} disponible{fincasFiltradas.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Botón para desplegar más filtros de interés (Amenidades, Mascotas) */}
          <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setFiltrosAvanzadosAbiertos(v => !v)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.2rem 0',
              }}
            >
              <Sparkles size={13} />
              {filtrosAvanzadosAbiertos ? 'Ocultar amenidades y comodidades' : 'Filtrar por comodidades (Piscina, Jacuzzi, Mascotas...)'}
              {filtrosAvanzadosAbiertos ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {/* Panel Desplegable de Comodidades y Mascotas */}
          {filtrosAvanzadosAbiertos && (
            <div
              style={{
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'grid',
                gap: '0.6rem',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Comodidades imprescindibles para tu estadía:
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
                {AMENIDADES_FILTRO.map(am => {
                  const activa = amenidadesSeleccionadas.includes(am);
                  return (
                    <button
                      key={am}
                      type="button"
                      onClick={() => toggleAmenidad(am)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '20px',
                        border: `1.5px solid ${activa ? 'var(--primary)' : 'var(--border)'}`,
                        background: activa ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'var(--surface)',
                        color: activa ? 'var(--primary)' : 'var(--text-main)',
                        fontSize: '0.75rem',
                        fontWeight: activa ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {activa && <Check size={12} />}
                      {am}
                    </button>
                  );
                })}

                {/* Chip Pet Friendly */}
                <button
                  type="button"
                  onClick={() => setSoloPetFriendly(v => !v)}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '20px',
                    border: `1.5px solid ${soloPetFriendly ? 'var(--success)' : 'var(--border)'}`,
                    background: soloPetFriendly ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'var(--surface)',
                    color: soloPetFriendly ? 'var(--success)' : 'var(--text-main)',
                    fontSize: '0.75rem',
                    fontWeight: soloPetFriendly ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Dog size={13} />
                  Permite mascotas (Pet Friendly)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Sección de Fincas Disponibles — Estructura Maestro-Detalle con Información de Primera Mano */}
      {catalogoVisible && (
        <section style={{ marginTop: '1.25rem' }}>
          {/* Cabecera Interactiva Desplegada por Defecto */}
          <div
            onClick={() => setSeccionFincasAbierta(v => !v)}
            style={{
              background: 'var(--surface)',
              border: `1.5px solid ${seccionFincasAbierta ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 'var(--rad-sm, 10px)',
              padding: '0.85rem 1.1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
              boxShadow: seccionFincasAbierta ? '0 3px 12px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.18s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Home size={20} style={{ color: 'var(--primary)' }} />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  {catalogoTitulo}
                </h2>
                <span className="status-badge s-avail" style={{ fontSize: '0.7rem' }}>
                  {fincasFiltradas.length} finca{fincasFiltradas.length !== 1 ? 's' : ''} disponible{fincasFiltradas.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {catalogoSubtitulo}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={e => {
                  e.stopPropagation();
                  setSeccionFincasAbierta(v => !v);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  padding: '0.4rem 0.85rem',
                }}
              >
                {seccionFincasAbierta ? (
                  <>Ocultar fincas <ChevronUp size={14} /></>
                ) : (
                  <>Ver fincas y fotos <ChevronDown size={14} /></>
                )}
              </button>
            </div>
          </div>

          {/* ─── Ventana Estática con Scroll Interno para Fincas Disponibles ─── */}
          {seccionFincasAbierta && (
            <div className="fincas-scroll-window" style={{ marginTop: '0.85rem', animation: 'fadeIn 0.2s ease' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {[1, 2, 3, 4].map(n => (
                    <SkeletonFincaItem key={n} />
                  ))}
                </div>
              ) : fincasFiltradas.length === 0 ? (
                <div className="panel" style={{ textAlign: 'center', padding: '2.5rem' }}>
                  <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: '0.75rem' }}>
                    {catalogoVacioTexto}
                  </p>
                  <button className="btn btn-sm btn-primary" onClick={handleLimpiarFiltros}>
                    Ver todas las fincas
                  </button>
                </div>
              ) : (
                <>
                  {/* Barra de estado interna de la ventana estática */}
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
                      {fincasFiltradas.length} propiedad{fincasFiltradas.length !== 1 ? 'es' : ''} disponible{fincasFiltradas.length !== 1 ? 's' : ''} para reservar
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                      ↕ Desliza para explorar la lista (toca para ver detalles)
                    </span>
                  </div>

                  {/* Viewport estático con scroll interno */}
                  <div className="fincas-scroll-viewport">
                    {fincasFiltradas.map(f => {
                      const primeraFoto = (f.finca_imagenes && f.finca_imagenes.length > 0)
                        ? f.finca_imagenes[0].url
                        : '';
                      const totalFotos = f.finca_imagenes?.length || 0;

                      return (
                        <div
                          key={f.id}
                          onClick={() => onSelectFinca(f.id)}
                          className="finca-list-interactive-item"
                          role="button"
                          tabIndex={0}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectFinca(f.id);
                            }
                          }}
                        >
                          {/* Miniatura cuadrada / rectangular cuidada con badges */}
                          <div
                            style={{
                              width: '84px',
                              height: '84px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              flexShrink: 0,
                              position: 'relative',
                              background: '#0f172a',
                            }}
                          >
                            {primeraFoto ? (
                              <img
                                src={primeraFoto}
                                alt={f.nombre}
                                loading="lazy"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)' }}>
                                <Home size={26} />
                              </div>
                            )}

                            {totalFotos > 1 && (
                              <span
                                style={{
                                  position: 'absolute',
                                  bottom: '3px',
                                  right: '3px',
                                  background: 'rgba(0, 0, 0, 0.72)',
                                  backdropFilter: 'blur(3px)',
                                  color: '#fff',
                                  fontSize: '0.6rem',
                                  fontWeight: 700,
                                  padding: '0.08rem 0.3rem',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                <ImageIcon size={9} /> {totalFotos}
                              </span>
                            )}
                          </div>

                          {/* Información condensada (Nombre, ubicación, specs clave sin exceso) */}
                          <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                              <h3
                                style={{
                                  fontSize: '0.96rem',
                                  fontWeight: 800,
                                  margin: 0,
                                  color: 'var(--text-main)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  lineHeight: 1.25,
                                }}
                              >
                                {f.nombre}
                              </h3>
                              <span
                                style={{
                                  fontSize: '0.64rem',
                                  fontWeight: 700,
                                  color: '#059669',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  padding: '0.1rem 0.45rem',
                                  borderRadius: '10px',
                                  flexShrink: 0,
                                }}
                              >
                                Disponible
                              </span>
                            </div>

                            {/* Ubicación y zona */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              <MapPin size={12} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {f.zona || 'Santa Elena, Valle del Cauca'}
                              </span>
                            </div>

                            {/* Ficha técnica esencial: Capacidad, Habitaciones, Baños y Pet Friendly */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'var(--surface-sunken)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                                <Users size={12} style={{ color: 'var(--primary)' }} /> Hasta {f.capacidad} pers.
                              </span>

                              {f.habitaciones && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'var(--surface-sunken)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                                  <Bed size={12} style={{ color: 'var(--primary)' }} /> {f.habitaciones} habs
                                </span>
                              )}

                              {f.banos && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'var(--surface-sunken)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                                  <Bath size={12} style={{ color: 'var(--primary)' }} /> {f.banos} baños
                                </span>
                              )}

                              {f.politica_mascotas === 'permitido' && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.08)', color: '#059669', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                                  <Dog size={12} /> Pet Friendly
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Tarifa destacada y Botón de Cotizar */}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              flexShrink: 0,
                              paddingLeft: '0.5rem',
                              borderLeft: '1px solid var(--border-subtle)',
                            }}
                          >
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                                Tarifa /pp noche
                              </div>
                              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1.1 }}>
                                {formatCOP(Number(f.precio_pp) || 0)}
                              </div>
                            </div>

                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectFinca(f.id);
                              }}
                              style={{
                                padding: '0.4rem 0.75rem',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                boxShadow: '0 2px 6px rgba(26, 107, 94, 0.25)',
                              }}
                            >
                              <span>Cotizar</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
