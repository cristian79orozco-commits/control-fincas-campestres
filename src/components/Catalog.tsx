import React, { useState, useMemo } from 'react';
import { Filter, X, Search, Sparkles, Dog, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { FincaCard } from './FincaCard';
import type { Finca, BloqueoDisponibilidad, ContenidoSitio } from '../types';

interface CatalogProps {
  fincas: Finca[];
  loading: boolean;
  bloquesAdmin: BloqueoDisponibilidad[];
  onSelectFinca: (fincaId: string) => void;
  contenido?: ContenidoSitio;
}

// ─── Skeleton Card para carga del catálogo ────────────────────────────────────
const SkeletonFincaCard: React.FC = () => (
  <div className="skeleton-finca-card" style={{ border: '1px solid var(--border)', borderRadius: 'var(--rad-sm, 10px)', overflow: 'hidden' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', padding: '0.75rem', gap: '0.85rem', alignItems: 'center' }}>
      <div className="skeleton-box" style={{ height: '75px', width: '100px', borderRadius: '6px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div className="skeleton-box" style={{ height: '16px', width: '50%' }} />
        <div className="skeleton-box" style={{ height: '14px', width: '70%' }} />
        <div className="skeleton-box" style={{ height: '12px', width: '30%' }} />
      </div>
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
}) => {
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [fechaEntrada, setFechaEntrada] = useState('');
  const [fechaSalida, setFechaSalida] = useState('');
  const [personasFiltro, setPersonasFiltro] = useState('');
  const [amenidadesSeleccionadas, setAmenidadesSeleccionadas] = useState<string[]>([]);
  const [soloPetFriendly, setSoloPetFriendly] = useState(false);
  const [filtrosAvanzadosAbiertos, setFiltrosAvanzadosAbiertos] = useState(false);
  const [expandirTodas, setExpandirTodas] = useState(false);

  // Estado de la sección de fincas disponibles: CONTRAÍDA por defecto para evitar crecimiento vertical
  const [seccionFincasAbierta, setSeccionFincasAbierta] = useState(false);

  const toggleAmenidad = (amenidad: string) => {
    setAmenidadesSeleccionadas(prev =>
      prev.includes(amenidad)
        ? prev.filter(a => a !== amenidad)
        : [...prev, amenidad]
    );
    setSeccionFincasAbierta(true);
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
      if (fechaEntrada && fechaSalida) {
        const ini = new Date(fechaEntrada + 'T00:00:00').getTime();
        const fin = new Date(fechaSalida + 'T00:00:00').getTime();

        if (fin < ini) return false;

        // Buscar si esta finca tiene algún bloqueo ocupado en ese rango
        const tieneBloqueo = bloquesAdmin.some(b => {
          if (b.finca_id !== finca.id || b.estado !== 'ocupado') return false;
          const bIni = new Date(b.fecha_inicio + 'T00:00:00').getTime();
          const bFin = new Date(b.fecha_fin + 'T00:00:00').getTime();
          return ini <= bFin && fin >= bIni;
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
  const filtrosSubtitulo = contenido?.filtros_subtitulo || 'Filtra por fechas, capacidad y comodidades ideales para tu estancia';
  const catalogoVisible = contenido?.catalogo_visible ?? true;
  const catalogoTitulo = contenido?.catalogo_titulo || 'Fincas disponibles';
  const catalogoSubtitulo = contenido?.catalogo_subtitulo || 'Lista interactiva de propiedades campestres en Santa Elena, Valle';
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
                onChange={e => {
                  setBusquedaTexto(e.target.value);
                  if (e.target.value) setSeccionFincasAbierta(true);
                }}
              />
            </div>

            {/* Fecha Llegada */}
            <div className="field">
              <label>Fecha de llegada</label>
              <input
                type="date"
                value={fechaEntrada}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => {
                  setFechaEntrada(e.target.value);
                  if (e.target.value) setSeccionFincasAbierta(true);
                }}
              />
            </div>

            {/* Fecha Salida */}
            <div className="field">
              <label>Fecha de salida</label>
              <input
                type="date"
                value={fechaSalida}
                min={fechaEntrada || new Date().toISOString().split('T')[0]}
                onChange={e => {
                  setFechaSalida(e.target.value);
                  if (e.target.value) setSeccionFincasAbierta(true);
                }}
              />
            </div>

            {/* Capacidad requerida */}
            <div className="field">
              <label>Capacidad de huéspedes</label>
              <select
                value={personasFiltro}
                onChange={e => {
                  setPersonasFiltro(e.target.value);
                  if (e.target.value) setSeccionFincasAbierta(true);
                }}
              >
                <option value="">Cualquier capacidad</option>
                <option value="Hasta 10">Hasta 10 personas</option>
                <option value="10 – 20">De 10 a 20 personas</option>
                <option value="20 – 40">De 20 a 40 personas</option>
                <option value="Más de 40">Más de 40 personas</option>
              </select>
            </div>
          </div>

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
                padding: 0,
              }}
            >
              <Sparkles size={13} />
              {filtrosAvanzadosAbiertos ? 'Ocultar filtros específicos' : 'Filtros específicos (Comodidades, Mascotas)'}
              {filtrosAvanzadosAbiertos ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <span className="text-xs text-muted">
              {fincasFiltradas.length} finca{fincasFiltradas.length !== 1 ? 's' : ''} encontrada{fincasFiltradas.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Panel colapsable de amenidades y opciones avanzadas */}
          {filtrosAvanzadosAbiertos && (
            <div
              style={{
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'grid',
                gap: '0.65rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Comodidades clave de tu preferencia:
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
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
                  onClick={() => {
                    setSoloPetFriendly(v => !v);
                    setSeccionFincasAbierta(true);
                  }}
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

      {/* 2. Sección de Fincas Disponibles — Contraída por Defecto para evitar desbordamiento vertical */}
      {catalogoVisible && (
        <div style={{ marginTop: '1.25rem' }}>
          {/* Cabecera / Barra Contraída Predeterminada */}
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
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: fincasFiltradas.length > 0 ? 'var(--success)' : 'var(--text-muted)',
                  }}
                />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  {catalogoTitulo}
                </h2>
                <span className="status-badge s-info" style={{ fontSize: '0.7rem' }}>
                  {fincasFiltradas.length} propiedad{fincasFiltradas.length !== 1 ? 'es' : ''}
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
                  <>Ocultar listado <ChevronUp size={14} /></>
                ) : (
                  <>Ver y desplegar fincas <ChevronDown size={14} /></>
                )}
              </button>
            </div>
          </div>

          {/* Listado desplegado con contenedor scrollable para no extender la página */}
          {seccionFincasAbierta && (
            <div
              style={{
                marginTop: '0.85rem',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              {/* Barra de utilidades del catálogo */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.65rem',
                  padding: '0 0.25rem',
                }}
              >
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Toca cualquier finca para ver detalles o cotizar directamente
                </span>

                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setExpandirTodas(v => !v)}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                >
                  {expandirTodas ? 'Contraer detalles de todas' : 'Desplegar detalles de todas'}
                </button>
              </div>

              {/* Contenedor con altura máxima y scroll interno para prevenir crecimiento vertical excesivo */}
              <div
                style={{
                  maxHeight: '680px',
                  overflowY: 'auto',
                  paddingRight: '0.35rem',
                  display: 'grid',
                  gap: '0.75rem',
                }}
              >
                {loading ? (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {[1, 2, 3, 4].map(n => (
                      <SkeletonFincaCard key={n} />
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
                  fincasFiltradas.map(f => (
                    <FincaCard
                      key={f.id}
                      finca={f}
                      defaultExpanded={expandirTodas}
                      onSelect={onSelectFinca}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
