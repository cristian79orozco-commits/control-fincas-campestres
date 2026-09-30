import React, { useState, useMemo } from 'react';
import { Search, X, Loader, Info, Filter } from 'lucide-react';
import { FincaCard } from './FincaCard';
import type { Finca, BloqueoDisponibilidad } from '../types';

interface CatalogProps {
  fincas: Finca[];
  loading: boolean;
  bloquesAdmin: BloqueoDisponibilidad[];
  onSelectFinca: (fincaId: string) => void;
}

export const Catalog: React.FC<CatalogProps> = ({
  fincas,
  loading,
  bloquesAdmin,
  onSelectFinca,
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

  return (
    <div className="cliente-flow">
      {/* 1. Panel de Estado Actual */}
      <div className="panel" id="estadoActual">
        <div className="panel-header" style={{ marginBottom: '0.5rem' }}>
          <div>
            <div className="panel-title">Estado actual · Fincas disponibles</div>
            <div className="text-xs text-muted mt-1">
              {fincas.length} propiedades registradas en Santa Elena, Valle
            </div>
          </div>
          <span className="status-badge s-avail">Sistema operativo</span>
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

        <p className="text-xs text-muted" style={{ marginTop: '0.75rem' }}>
          <Info size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
          Toca <strong>Ver y cotizar</strong> en cualquier finca para consultar el calendario interactivo y obtener tu cotización directa para WhatsApp.
        </p>
      </div>

      {/* 2. Filtros de Búsqueda */}
      <div className="filters-card" id="catalogo">
        <div className="sec-header">
          <div>
            <div className="sec-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={18} style={{ color: 'var(--primary)' }} /> Buscar disponibilidad
            </div>
            <div className="sec-sub">Filtra por fechas y capacidad para encontrar fincas libres</div>
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
                📍 Ubicación privilegiada
              </strong>
              Todas nuestras fincas campestres están ubicadas en:<br />
              <strong>Santa Elena, El Cerrito, Valle del Cauca</strong>
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

      {/* 3. Listado de Fincas */}
      <div>
        <div className="sec-header" style={{ marginBottom: '0.85rem' }}>
          <div>
            <div className="sec-title">Fincas disponibles</div>
            <div className="sec-sub">Selecciona una propiedad para ver fotografías en alta calidad y cotizar</div>
          </div>
          <span className="status-badge s-info">
            {fincasFiltradas.length} finca{fincasFiltradas.length !== 1 ? 's' : ''} disponible{fincasFiltradas.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
            <div>Cargando fincas desde Supabase…</div>
          </div>
        ) : fincasFiltradas.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              No se encontraron fincas disponibles para los criterios seleccionados.
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
    </div>
  );
};
