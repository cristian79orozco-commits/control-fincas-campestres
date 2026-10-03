import React, { useState, useMemo } from 'react';
import { Loader, Info, Filter, X } from 'lucide-react';
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
  <div className="skeleton-finca-card">
    <div className="skeleton-box" style={{ height: '210px', width: '100%', borderRadius: 0 }} />
    <div style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton-box" style={{ height: '18px', width: '60%' }} />
        <div className="skeleton-box" style={{ height: '16px', width: '25%' }} />
      </div>
      <div className="skeleton-box" style={{ height: '14px', width: '40%' }} />
      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
        <div className="skeleton-box" style={{ height: '22px', width: '30%', borderRadius: '999px' }} />
        <div className="skeleton-box" style={{ height: '22px', width: '30%', borderRadius: '999px' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border)' }}>
        <div className="skeleton-box" style={{ height: '20px', width: '45%' }} />
        <div className="skeleton-box" style={{ height: '32px', width: '35%', borderRadius: '6px' }} />
      </div>
    </div>
  </div>
);

export const Catalog: React.FC<CatalogProps> = ({
  fincas,
  loading,
  bloquesAdmin,
  onSelectFinca,
  contenido,
}) => {
  const [fechaEntrada, setFechaEntrada] = useState('');
  const [fechaSalida, setFechaSalida] = useState('');
  const [personasFiltro, setPersonasFiltro] = useState('');

  // Filtrado de fincas inteligente con comprobación de fechas reales y capacidad
  const fincasFiltradas = useMemo(() => {
    return fincas.filter(finca => {
      // 1. Filtro por capacidad
      if (personasFiltro) {
        if (personasFiltro === 'Hasta 10' && finca.capacidad > 10) return false;
        if (personasFiltro === '10 – 20' && (finca.capacidad < 10 || finca.capacidad > 20)) return false;
        if (personasFiltro === '20 – 40' && (finca.capacidad < 20 || finca.capacidad > 40)) return false;
        if (personasFiltro === 'Más de 40' && finca.capacidad <= 40) return false;
      }

      // 2. Filtro de disponibilidad real en fechas seleccionadas
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
  }, [fincas, personasFiltro, fechaEntrada, fechaSalida, bloquesAdmin]);

  const handleLimpiarFiltros = () => {
    setFechaEntrada('');
    setFechaSalida('');
    setPersonasFiltro('');
  };

  const estadoBadgeMap: Record<string, string> = {
    disponible: 's-avail',
    alta_demanda: 's-warn',
    no_disponible: 's-busy',
    fin_de_semana: 's-info',
  };

  // Textos y visibilidad configurables
  const estadoVisible = contenido?.estado_visible ?? true;
  const estadoTitulo = contenido?.estado_titulo || 'Estado actual · Fincas disponibles';
  const estadoSubtitulo = contenido?.estado_subtitulo || 'propiedades registradas en Santa Elena, Valle';
  const estadoBadgeTexto = contenido?.estado_badge_texto || 'Sistema operativo';
  const estadoAyudaTexto = contenido?.estado_ayuda_texto || 'Toca Ver y cotizar en cualquier finca para consultar el calendario interactivo y obtener tu cotización directa para WhatsApp.';

  const filtrosVisible = contenido?.filtros_visible ?? true;
  const filtrosTitulo = contenido?.filtros_titulo || 'Buscar disponibilidad';
  const filtrosSubtitulo = contenido?.filtros_subtitulo || 'Filtra por fechas y capacidad para encontrar fincas libres';
  const filtrosBadgeTitulo = contenido?.filtros_badge_titulo || '📍 Ubicación privilegiada';
  const filtrosBadgeTexto = contenido?.filtros_badge_texto || 'Todas nuestras fincas campestres están ubicadas en Santa Elena, El Cerrito, Valle del Cauca.';

  const catalogoVisible = contenido?.catalogo_visible ?? true;
  const catalogoTitulo = contenido?.catalogo_titulo || 'Fincas disponibles';
  const catalogoSubtitulo = contenido?.catalogo_subtitulo || 'Selecciona una propiedad para ver fotografías en alta calidad y cotizar';
  const catalogoVacioTexto = contenido?.catalogo_vacio_texto || 'No se encontraron fincas disponibles para los criterios seleccionados.';

  return (
    <div className="cliente-flow">
      {/* 1. Panel de Estado Actual */}
      {estadoVisible && (
        <div className="panel" id="estadoActual">
          <div className="panel-header" style={{ marginBottom: '0.5rem' }}>
            <div>
              <div className="panel-title">{estadoTitulo}</div>
              <div className="text-xs text-muted mt-1">
                {fincas.length} {estadoSubtitulo}
              </div>
            </div>
            {estadoBadgeTexto && (
              <span className="status-badge s-avail">{estadoBadgeTexto}</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {loading ? (
              <span className="status-badge s-info">Cargando fincas…</span>
            ) : (
              fincas.map(f => (
                <span
                  key={f.id}
                  className={`status-badge ${estadoBadgeMap[f.estado] || 's-info'}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectFinca(f.id)}
                  title="Clic para ver detalles"
                >
                  {f.nombre} · {f.estado.replace('_', ' ')}
                </span>
              ))
            )}
          </div>

          {estadoAyudaTexto && (
            <p className="text-xs text-muted" style={{ marginTop: '0.75rem' }}>
              <Info size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
              {estadoAyudaTexto}
            </p>
          )}
        </div>
      )}

      {/* 2. Filtros de Búsqueda */}
      {filtrosVisible && (
        <div className="filters-card" id="catalogo">
          <div className="sec-header">
            <div>
              <div className="sec-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={18} style={{ color: 'var(--primary)' }} /> {filtrosTitulo}
              </div>
              <div className="sec-sub">{filtrosSubtitulo}</div>
            </div>
          </div>

          <div className="filters-grid">
            <div className="field">
              <label>Desde (Fecha llegada)</label>
              <input
                type="date"
                value={fechaEntrada}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setFechaEntrada(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Hasta (Fecha salida)</label>
              <input
                type="date"
                value={fechaSalida}
                min={fechaEntrada || new Date().toISOString().split('T')[0]}
                onChange={e => setFechaSalida(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Capacidad requerida</label>
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

            <div className="field">
              <p
                className="text-xs"
                style={{
                  background: 'var(--primary-bg)',
                  color: 'var(--primary)',
                  border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
                  borderRadius: 'var(--rad-sm)',
                  padding: '0.65rem 0.9rem',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ display: 'block', marginBottom: '0.15rem', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                  {filtrosBadgeTitulo}
                </strong>
                {filtrosBadgeTexto}
              </p>
            </div>
          </div>

          <div className="filter-actions">
            {(fechaEntrada || fechaSalida || personasFiltro) && (
              <button className="btn btn-sm" onClick={handleLimpiarFiltros}>
                <X size={14} /> Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Listado de Fincas */}
      {catalogoVisible && (
        <div>
          <div className="sec-header" style={{ marginBottom: '0.85rem' }}>
            <div>
              <div className="sec-title">{catalogoTitulo}</div>
              <div className="sec-sub">{catalogoSubtitulo}</div>
            </div>
            <span className="status-badge s-info">
              {fincasFiltradas.length} finca{fincasFiltradas.length !== 1 ? 's' : ''} disponible{fincasFiltradas.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="catalog-grid">
              {[1, 2, 3, 4].map(n => (
                <SkeletonFincaCard key={n} />
              ))}
            </div>
          ) : fincasFiltradas.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '2.5rem' }}>
              <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                {catalogoVacioTexto}
              </p>
              <button className="btn btn-sm btn-primary" onClick={handleLimpiarFiltros} style={{ marginTop: '0.8rem' }}>
                Ver todas las fincas
              </button>
            </div>
          ) : (
            <div className="catalog-grid">
              {fincasFiltradas.map(f => (
                <FincaCard
                  key={f.id}
                  finca={f}
                  onSelect={onSelectFinca}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
