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

  // Finca seleccionada para la vista maximizada de primera mano
  const [fincaSeleccionadaId, setFincaSeleccionadaId] = useState<string>('');
  const [fotoActivaIndex, setFotoActivaIndex] = useState(0);

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

  // Finca activa en el panel maximizado
  const fincaActiva = useMemo(() => {
    if (!fincasFiltradas.length) return null;
    return fincasFiltradas.find(f => f.id === fincaSeleccionadaId) || fincasFiltradas[0];
  }, [fincasFiltradas, fincaSeleccionadaId]);

  // Sincronizar selección si la actual ya no coincide con los filtros aplicados
  useEffect(() => {
    if (fincasFiltradas.length > 0) {
      if (!fincaSeleccionadaId || !fincasFiltradas.some(f => f.id === fincaSeleccionadaId)) {
        setFincaSeleccionadaId(fincasFiltradas[0].id);
        setFotoActivaIndex(0);
      }
    }
  }, [fincasFiltradas, fincaSeleccionadaId]);

  // Extraer fotos de la finca activa
  const fotosFincaActiva = useMemo(() => {
    if (!fincaActiva) return [];
    const fotos: string[] = [];
    if (fincaActiva.finca_imagenes && fincaActiva.finca_imagenes.length > 0) {
      const ordenadas = [...fincaActiva.finca_imagenes].sort((a, b) => a.orden - b.orden);
      ordenadas.forEach(img => {
        if (img.url && !fotos.includes(img.url)) fotos.push(img.url);
      });
    }
    return fotos;
  }, [fincaActiva]);

  const fotoPrincipalMostrada = fotosFincaActiva[fotoActivaIndex] || fotosFincaActiva[0] || '';

  const handleLimpiarFiltros = () => {
    setBusquedaTexto('');
    setFechaEntrada('');
    setFechaSalida('');
    setPersonasFiltro('');
    setAmenidadesSeleccionadas([]);
    setSoloPetFriendly(false);
  };

  const handleConsultarFincaWa = (finca: Finca) => {
    const num = (finca.whatsapp || waNumber || '573176827093').replace(/[^0-9]/g, '');
    let fechasTexto = '';
    if (fechaEntrada && fechaSalida) {
      fechasTexto = ` para las fechas del ${fechaEntrada} al ${fechaSalida}`;
    } else if (fechaEntrada) {
      fechasTexto = ` a partir del ${fechaEntrada}`;
    }
    const msg = encodeURIComponent(
      `¡Hola! 👋 Me interesa consultar disponibilidad y cotización de la finca *${finca.nombre}* (${finca.zona || 'Santa Elena, Valle'})${fechasTexto}. ¿Nos pueden confirmar disponibilidad y condiciones?`
    );
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
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
          <div className="filters-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
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

          {/* ─── Vista Maestro-Detalle de Fincas Desplegada por Defecto ─── */}
          {seccionFincasAbierta && (
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
              {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
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
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '1.25rem',
                    alignItems: 'start',
                  }}
                >
                  {/* ─── PANEL IZQUIERDO: Lista en Miniatura de Fincas ─── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        Selecciona una finca para ver fotos y cotizar:
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                        {fincasFiltradas.length} opciones
                      </span>
                    </div>

                    <div
                      style={{
                        maxHeight: '560px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        paddingRight: '0.35rem',
                      }}
                    >
                      {fincasFiltradas.map(f => {
                        const isSelected = f.id === fincaActiva?.id;
                        const primeraFoto = (f.finca_imagenes && f.finca_imagenes.length > 0)
                          ? f.finca_imagenes[0].url
                          : '';

                        return (
                          <div
                            key={f.id}
                            onClick={() => {
                              setFincaSeleccionadaId(f.id);
                              setFotoActivaIndex(0);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.65rem 0.8rem',
                              borderRadius: 'var(--rad-xs, 8px)',
                              cursor: 'pointer',
                              border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                              background: isSelected
                                ? 'color-mix(in srgb, var(--primary) 8%, var(--surface))'
                                : 'var(--surface)',
                              boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {/* Miniatura cuadrada */}
                            <div
                              style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                background: 'var(--surface-sunken)',
                                flexShrink: 0,
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
                                  <Home size={22} opacity={0.5} />
                                </div>
                              )}
                            </div>

                            {/* Información preliminar de la finca */}
                            <div style={{ flexGrow: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                                <div
                                  style={{
                                    fontSize: '0.86rem',
                                    fontWeight: 700,
                                    color: 'var(--text-main)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {f.nombre}
                                </div>
                                {isSelected && (
                                  <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700 }}>
                                    ● En pantalla
                                  </span>
                                )}
                              </div>

                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  marginTop: '0.15rem',
                                }}
                              >
                                <MapPin size={11} style={{ flexShrink: 0 }} />
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {f.zona || 'Santa Elena, Valle'}
                                </span>
                              </div>

                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  marginTop: '0.2rem',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <span>👥 Hasta {f.capacidad} pers.</span>
                                <span>•</span>
                                <strong style={{ color: 'var(--primary)' }}>
                                  {formatCOP(Number(f.precio_pp) || 0)} /pp
                                </strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ─── PANEL DERECHO: Detalle Maximizado e Información de Primera Mano ─── */}
                  {fincaActiva && (
                    <div
                      style={{
                        background: 'var(--surface-sunken)',
                        borderRadius: 'var(--rad-sm, 10px)',
                        padding: '1.15rem',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.9rem',
                        position: 'sticky',
                        top: '1rem',
                      }}
                    >
                      {/* Galería / Foto Principal de la Finca */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '100%',
                            height: '240px',
                            borderRadius: 'var(--rad-xs, 8px)',
                            overflow: 'hidden',
                            position: 'relative',
                            background: '#0f172a',
                          }}
                        >
                          {fotoPrincipalMostrada ? (
                            <img
                              src={fotoPrincipalMostrada}
                              alt={fincaActiva.nombre}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'rgba(255,255,255,0.7)',
                                gap: '0.5rem',
                              }}
                            >
                              <Home size={38} />
                              <span style={{ fontSize: '0.78rem' }}>Fotos no disponibles</span>
                            </div>
                          )}

                          {/* Badges superpuestos sobre la foto */}
                          <div
                            style={{
                              position: 'absolute',
                              top: '0.65rem',
                              left: '0.65rem',
                              display: 'flex',
                              gap: '0.4rem',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span
                              style={{
                                background: 'rgba(0,0,0,0.65)',
                                backdropFilter: 'blur(4px)',
                                color: '#fff',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '14px',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <MapPin size={10} /> {fincaActiva.zona || 'Santa Elena, Valle'}
                            </span>
                            <span
                              style={{
                                background: 'rgba(16, 185, 129, 0.85)',
                                color: '#fff',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '14px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                              }}
                            >
                              Disponible
                            </span>
                          </div>

                          {fotosFincaActiva.length > 1 && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '0.65rem',
                                right: '0.65rem',
                                background: 'rgba(0,0,0,0.7)',
                                backdropFilter: 'blur(4px)',
                                color: '#fff',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '12px',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <ImageIcon size={11} /> {fotoActivaIndex + 1} / {fotosFincaActiva.length}
                            </div>
                          )}
                        </div>

                        {/* Carrusel de miniaturas para alternar fotos */}
                        {fotosFincaActiva.length > 1 && (
                          <div
                            style={{
                              display: 'flex',
                              gap: '0.45rem',
                              overflowX: 'auto',
                              paddingBottom: '0.3rem',
                            }}
                          >
                            {fotosFincaActiva.map((foto, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setFotoActivaIndex(idx)}
                                style={{
                                  width: '50px',
                                  height: '40px',
                                  borderRadius: '4px',
                                  overflow: 'hidden',
                                  border: `2px solid ${idx === fotoActivaIndex ? 'var(--primary)' : 'transparent'}`,
                                  padding: 0,
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                  opacity: idx === fotoActivaIndex ? 1 : 0.65,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <img
                                  src={foto}
                                  alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Título y especificaciones principales */}
                      <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-main)' }}>
                          {fincaActiva.nombre}
                        </h3>

                        {fincaActiva.descripcion && (
                          <p
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--text-muted)',
                              margin: '0 0 0.65rem 0',
                              lineHeight: 1.45,
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {fincaActiva.descripcion}
                          </p>
                        )}

                        {/* Fichas técnicas rápidas de capacidad y cuartos */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                            gap: '0.45rem',
                            marginBottom: '0.65rem',
                          }}
                        >
                          <div
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              padding: '0.45rem 0.6rem',
                              fontSize: '0.74rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Users size={14} style={{ color: 'var(--primary)' }} />
                            <span>Hasta <strong>{fincaActiva.capacidad}</strong> pers.</span>
                          </div>

                          <div
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              padding: '0.45rem 0.6rem',
                              fontSize: '0.74rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Bed size={14} style={{ color: 'var(--primary)' }} />
                            <span><strong>{fincaActiva.habitaciones}</strong> habitaciones</span>
                          </div>

                          <div
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              padding: '0.45rem 0.6rem',
                              fontSize: '0.74rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Bath size={14} style={{ color: 'var(--primary)' }} />
                            <span><strong>{fincaActiva.banos}</strong> baños</span>
                          </div>

                          {fincaActiva.politica_mascotas === 'permitido' && (
                            <div
                              style={{
                                background: 'color-mix(in srgb, var(--success) 10%, var(--surface))',
                                border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
                                borderRadius: '6px',
                                padding: '0.45rem 0.6rem',
                                fontSize: '0.74rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                color: 'var(--success)',
                                fontWeight: 600,
                              }}
                            >
                              <Dog size={14} />
                              <span>Pet Friendly</span>
                            </div>
                          )}
                        </div>

                        {/* Chips de amenidades destacadas */}
                        {fincaActiva.finca_amenidades && fincaActiva.finca_amenidades.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.65rem' }}>
                            {fincaActiva.finca_amenidades.map(am => (
                              <span
                                key={am.id || am.nombre}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '12px',
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border-subtle)',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                ✓ {am.nombre}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Bloque de Precio y Garantía Directa */}
                        <div
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '0.75rem 0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '0.75rem',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                              Tarifa por persona / noche
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>
                              {formatCOP(Number(fincaActiva.precio_pp) || 0)}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <ShieldCheck size={13} style={{ color: 'var(--success)' }} /> Tarifa directa garantizada
                          </span>
                        </div>

                        {/* Acciones de primera mano: Cotizar directamente o Consultar por WhatsApp */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => onSelectFinca(fincaActiva.id)}
                            style={{
                              width: '100%',
                              padding: '0.8rem',
                              fontSize: '0.86rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            <span>Cotizar y reservar estadía</span>
                            <ArrowRight size={16} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleConsultarFincaWa(fincaActiva)}
                            style={{
                              width: '100%',
                              padding: '0.65rem',
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.4rem',
                            }}
                          >
                            <MessageCircle size={15} style={{ color: '#25d366' }} />
                            <span>Consultar por WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
