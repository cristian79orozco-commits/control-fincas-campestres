import React, { useMemo, useEffect, useCallback } from 'react';
import {
  Filter, X, Search, Sparkles, Dog, Check, ChevronDown, ChevronUp,
  MapPin, Users, Bed, Bath, Calendar, MessageCircle, ArrowRight,
  ShieldCheck, Image as ImageIcon, Home, LayoutGrid, List, SlidersHorizontal,
  FileCheck2, Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Finca, BloqueoDisponibilidad, ContenidoSitio } from '../types';
import { useClientStore, filtrarFincasCliente } from '../store/useClientStore';
import { FincaCard3D } from './FincaCard3D';

interface CatalogProps {
  fincas: Finca[];
  loading: boolean;
  bloquesAdmin: BloqueoDisponibilidad[];
  onSelectFinca: (fincaId: string) => void;
  contenido?: ContenidoSitio;
  waNumber?: string;
  onOpenPortalHuesped?: () => void;
}

function formatCOP(v: number) {
  return '$' + (v || 0).toLocaleString('es-CO') + ' COP';
}

// ─── Skeleton Card para carga del catálogo ────────────────────────────────────
const SkeletonFincaItem: React.FC = () => (
  <div
    className="card-pro"
    style={{
      padding: '1.25rem',
      display: 'flex',
      gap: '1rem',
      alignItems: 'center',
    }}
  >
    <div className="skeleton-shimmer" style={{ width: '88px', height: '88px', borderRadius: '12px', flexShrink: 0 }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flexGrow: 1 }}>
      <div className="skeleton-shimmer" style={{ height: '18px', width: '65%' }} />
      <div className="skeleton-shimmer" style={{ height: '14px', width: '45%' }} />
      <div className="skeleton-shimmer" style={{ height: '12px', width: '35%' }} />
    </div>
  </div>
);

// ─── Componente de Lista Compacta Memoizado (Cero re-renders innecesarios) ─────
interface FincaListItemProps {
  finca: Finca;
  onSelect: (fincaId: string) => void;
  mostrarPrecioTotal?: boolean;
}

const FincaListItem = React.memo<FincaListItemProps>(({ finca, onSelect, mostrarPrecioTotal = true }) => {
  const isEnComparacion = useClientStore(useCallback(s => s.fincasComparar.includes(finca.id), [finca.id]));
  const toggleCompararFinca = useClientStore(s => s.toggleCompararFinca);

  const images = useMemo(() => [...(finca.finca_imagenes || [])].sort((a, b) => a.orden - b.orden), [finca.finca_imagenes]);
  const primeraFoto = images[0]?.url || '';
  const totalFotos = images.length;
  const precioPp = Number(finca.precio_pp) || 0;
  const precioFincaCompleta = Number(finca.precio_finca_completa) || 0;

  return (
    <div
      onClick={() => onSelect(finca.id)}
      className="card-pro finca-list-interactive-item"
      role="button"
      tabIndex={0}
      style={{
        padding: '0.95rem 1.15rem',
        display: 'flex',
        gap: '1.15rem',
        alignItems: 'center',
        cursor: 'pointer',
        borderRadius: 'var(--rad-sm, 14px)',
        transition: 'all 0.25s ease',
        border: `1.5px solid ${isEnComparacion ? 'var(--primary)' : 'var(--border)'}`,
      }}
    >
      {/* Miniatura */}
      <div
        style={{
          width: '96px',
          height: '96px',
          borderRadius: '12px',
          overflow: 'hidden',
          flexShrink: 0,
          position: 'relative',
          background: 'var(--surface-2)',
        }}
      >
        {primeraFoto ? (
          <img
            src={primeraFoto}
            alt={finca.nombre}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <Home size={28} />
          </div>
        )}
        {totalFotos > 1 && (
          <span
            style={{
              position: 'absolute',
              bottom: '4px',
              right: '4px',
              background: 'rgba(20, 18, 16, 0.75)',
              color: 'var(--text)',
              fontSize: '0.62rem',
              fontWeight: 700,
              padding: '0.12rem 0.4rem',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              backdropFilter: 'blur(4px)',
            }}
          >
            <ImageIcon size={9} /> {totalFotos}
          </span>
        )}
      </div>

      {/* Información condensada */}
      <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {finca.nombre}
          </h3>
          <span className="badge-pro-avail" style={{ fontSize: '0.68rem' }}>
            <span className="pulse-dot" />
            Disponible
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <MapPin size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span>{finca.zona || 'Santa Elena, Valle'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              padding: '0.18rem 0.5rem',
              borderRadius: '6px',
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            <Users size={12} style={{ color: 'var(--primary)' }} />
            {finca.capacidad_minima ? `${finca.capacidad_minima} - ${finca.capacidad}` : `Hasta ${finca.capacidad}`} pers.
          </span>
          {finca.habitaciones && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                padding: '0.18rem 0.5rem',
                borderRadius: '6px',
              }}
            >
              <Bed size={12} style={{ color: 'var(--primary)' }} /> {finca.habitaciones} habs
            </span>
          )}
          {finca.politica_mascotas === 'permitido' && (
            <span
              style={{
                color: 'var(--success)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'color-mix(in srgb, var(--success) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
                padding: '0.18rem 0.5rem',
                borderRadius: '6px',
              }}
            >
              <Dog size={12} /> Pet Friendly
            </span>
          )}
        </div>
      </div>

      {/* Tarifa y Botones de Acción */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '0.45rem',
          flexShrink: 0,
          paddingLeft: '1rem',
          borderLeft: '1px solid var(--border)',
        }}
      >
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>
            Tarifa /pp noche
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)', marginTop: '2px' }}>
            {formatCOP(precioPp)}
          </div>
          {mostrarPrecioTotal && precioFincaCompleta > 0 && (
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              O completa: <strong style={{ color: 'var(--text)' }}>{formatCOP(precioFincaCompleta)}</strong>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCompararFinca(finca.id);
            }}
            title={isEnComparacion ? 'Quitar del comparador' : 'Comparar con otras fincas'}
            style={{
              padding: '0.42rem',
              borderRadius: 'var(--rad-xs, 6px)',
              border: `1.5px solid ${isEnComparacion ? 'var(--primary)' : 'var(--border)'}`,
              background: isEnComparacion ? 'var(--primary-bg)' : 'var(--surface-2)',
              color: isEnComparacion ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            {isEnComparacion ? <Check size={14} /> : <Scale size={14} />}
          </button>

          <button
            type="button"
            className="btn-pro-primary"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(finca.id);
            }}
            style={{
              padding: '0.45rem 0.95rem',
              fontSize: '0.78rem',
            }}
          >
            <span>Cotizar</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
});

FincaListItem.displayName = 'FincaListItem';

const AMENIDADES_FILTRO = [
  'Piscina',
  'Jacuzzi',
  'Zona BBQ',
  'Cancha',
  'Wifi',
  'Billar / Juegos',
];

const CatalogComponent: React.FC<CatalogProps> = ({
  fincas,
  loading,
  bloquesAdmin,
  onSelectFinca,
  contenido,
  waNumber,
  onOpenPortalHuesped,
}) => {
  // Selectores atómicos de Zustand para eliminar re-renders masivos
  const busquedaTexto = useClientStore(s => s.busquedaTexto);
  const setBusquedaTexto = useClientStore(s => s.setBusquedaTexto);
  const fechaEntrada = useClientStore(s => s.fechaEntrada);
  const setFechaEntrada = useClientStore(s => s.setFechaEntrada);
  const fechaSalida = useClientStore(s => s.fechaSalida);
  const setFechaSalida = useClientStore(s => s.setFechaSalida);
  const personas = useClientStore(s => s.personas);
  const setPersonas = useClientStore(s => s.setPersonas);
  const amenidades = useClientStore(s => s.amenidades);
  const toggleAmenidad = useClientStore(s => s.toggleAmenidad);
  const soloPetFriendly = useClientStore(s => s.soloPetFriendly);
  const setSoloPetFriendly = useClientStore(s => s.setSoloPetFriendly);
  const zona = useClientStore(s => s.zona);
  const ordenPor = useClientStore(s => s.ordenPor);
  const setOrdenPor = useClientStore(s => s.setOrdenPor);
  const vistaModo = useClientStore(s => s.vistaModo);
  const setVistaModo = useClientStore(s => s.setVistaModo);
  const filtrosAvanzadosOpen = useClientStore(s => s.filtrosAvanzadosOpen);
  const setFiltrosAvanzadosOpen = useClientStore(s => s.setFiltrosAvanzadosOpen);
  const limpiarFiltros = useClientStore(s => s.limpiarFiltros);

  // Sincronizar vista predeterminada según configuración del administrador
  useEffect(() => {
    if (contenido?.catalogo_vista_predeterminada) {
      setVistaModo(contenido.catalogo_vista_predeterminada);
    }
  }, [contenido?.catalogo_vista_predeterminada, setVistaModo]);

  // Handler memoizado estable para evitar romper el React.memo de las tarjetas
  const handleSelectFinca = useCallback((fincaId: string) => {
    onSelectFinca(fincaId);
  }, [onSelectFinca]);

  // Filtrado reactivo memoizado con dependencias atómicas exactas
  const fincasFiltradas = useMemo(() => {
    return filtrarFincasCliente(fincas, bloquesAdmin, {
      busquedaTexto,
      fechaEntrada,
      fechaSalida,
      personas,
      amenidades,
      soloPetFriendly,
      zona,
      ordenPor,
    } as any);
  }, [fincas, bloquesAdmin, busquedaTexto, fechaEntrada, fechaSalida, personas, amenidades, soloPetFriendly, zona, ordenPor]);

  const hayFiltrosActivos = !!(
    busquedaTexto ||
    fechaEntrada ||
    fechaSalida ||
    personas ||
    amenidades.length > 0 ||
    soloPetFriendly ||
    ordenPor !== 'recomendado'
  );

  // Textos y visibilidad configurables
  const filtrosVisible = contenido?.filtros_visible ?? true;
  const filtrosTitulo = contenido?.filtros_titulo || 'Buscar disponibilidad y fincas';
  const filtrosSubtitulo = contenido?.filtros_subtitulo || 'Filtra por fechas de entrada, capacidad y comodidades para tu estancia';
  const catalogoVisible = contenido?.catalogo_visible ?? true;
  const catalogoTitulo = contenido?.catalogo_titulo || 'Fincas campestres disponibles';
  const catalogoSubtitulo = contenido?.catalogo_subtitulo || 'Explora nuestras propiedades campestres con información y fotos de primera mano';
  const catalogoVacioTexto = contenido?.catalogo_vacio_texto || 'No se encontraron fincas disponibles para los criterios seleccionados.';
  const mostrarBadges = contenido?.catalogo_mostrar_badges ?? true;
  const mostrarPrecioTotal = contenido?.catalogo_mostrar_precio_total ?? true;

  return (
    <div className="cliente-flow">
      {/* 1. Panel de Búsqueda y Filtros Centralizados High-End */}
      {filtrosVisible && (
        <div
          className="card-pro"
          id="catalogo"
          style={{
            padding: '1.6rem',
            borderRadius: 'var(--rad-md, 20px)',
            marginBottom: '1.5rem',
          }}
        >
          {/* Luz ambiental sutil en esquina */}
          <div className="card-pro-ambient" />

          {/* Cabecera del Panel de Filtros */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--primary-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    boxShadow: '0 2px 8px rgba(77, 168, 158, 0.2)',
                  }}
                >
                  <Filter size={18} />
                </span>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                    {filtrosTitulo}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                    {filtrosSubtitulo}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {onOpenPortalHuesped && (
                <button
                  type="button"
                  className="btn-pro-secondary"
                  onClick={onOpenPortalHuesped}
                  style={{ fontSize: '0.78rem', padding: '0.45rem 0.95rem' }}
                >
                  <FileCheck2 size={14} style={{ color: 'var(--primary)' }} />
                  <span>Consultar mi reserva</span>
                </button>
              )}

              {hayFiltrosActivos && (
                <button
                  type="button"
                  className="btn-pro-secondary"
                  onClick={limpiarFiltros}
                  style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', color: 'var(--text-muted)' }}
                  title="Restablecer todos los filtros"
                >
                  <X size={14} />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>

          {/* Fila principal: Búsqueda, Fechas y Capacidad con Focus Glow */}
          <div className="filters-grid" style={{ position: 'relative', zIndex: 1, gap: '0.85rem' }}>
            {/* Búsqueda por texto */}
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Search size={13} style={{ color: 'var(--primary)' }} /> Finca o palabra clave
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-pro"
                  placeholder="Ej: Paraíso, Piscina, Santa Elena..."
                  value={busquedaTexto}
                  onChange={e => setBusquedaTexto(e.target.value)}
                  style={{ paddingLeft: '2.2rem' }}
                />
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '11px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>

            {/* Fecha Llegada */}
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} style={{ color: 'var(--primary)' }} /> Fecha de llegada
              </label>
              <input
                type="date"
                className="input-pro"
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
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} style={{ color: 'var(--accent)' }} /> Fecha de salida
              </label>
              <input
                type="date"
                className="input-pro"
                value={fechaSalida}
                min={fechaEntrada || new Date().toISOString().split('T')[0]}
                onChange={e => setFechaSalida(e.target.value)}
              />
            </div>

            {/* Capacidad requerida */}
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={13} style={{ color: 'var(--primary)' }} /> Capacidad de huéspedes
              </label>
              <select
                className="input-pro"
                value={personas}
                onChange={e => setPersonas(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="">Cualquier capacidad</option>
                <option value="Hasta 10">Hasta 10 personas</option>
                <option value="10 – 20">De 10 a 20 personas</option>
                <option value="20 – 40">De 20 a 40 personas</option>
                <option value="Más de 40">Más de 40 personas</option>
              </select>
            </div>
          </div>

          {/* Indicador de filtro de fechas activo en tiempo real */}
          {(fechaEntrada || fechaSalida) && (
            <div
              className="badge-pro-avail"
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                fontSize: '0.78rem',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <span className="pulse-dot" />
              <span>
                Filtro activo: <strong>{fechaEntrada ? `Llegada: ${fechaEntrada}` : ''}</strong>
                {fechaSalida ? ` | Salida: ${fechaSalida}` : ' (comprobando disponibilidad)'}
                {' — '}
                {fincasFiltradas.length} finca{fincasFiltradas.length !== 1 ? 's' : ''} disponible{fincasFiltradas.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Barra inferior: Botón de comodidades y Ordenamiento */}
          <div
            style={{
              marginTop: '1.15rem',
              paddingTop: '0.95rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <button
              type="button"
              onClick={() => setFiltrosAvanzadosOpen(v => !v)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.3rem 0',
                transition: 'opacity 0.2s ease',
              }}
            >
              <Sparkles size={14} />
              <span>
                {filtrosAvanzadosOpen ? 'Ocultar comodidades y ordenamiento' : 'Filtrar por comodidades (Piscina, Jacuzzi, Mascotas, etc.)'}
              </span>
              {filtrosAvanzadosOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Selector de ordenamiento rápido */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Ordenar por:</span>
              <select
                value={ordenPor}
                onChange={e => setOrdenPor(e.target.value as any)}
                className="input-pro"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  borderRadius: 'var(--rad-xs, 8px)',
                  width: 'auto',
                  cursor: 'pointer',
                }}
              >
                <option value="recomendado">Recomendados</option>
                <option value="precio_asc">Menor precio /pp</option>
                <option value="precio_desc">Mayor precio /pp</option>
                <option value="capacidad_desc">Mayor capacidad</option>
              </select>
            </div>
          </div>

          {/* Panel Desplegable de Comodidades y Mascotas */}
          {filtrosAvanzadosOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                marginTop: '0.85rem',
                paddingTop: '0.85rem',
                borderTop: '1px dashed var(--border)',
                display: 'grid',
                gap: '0.75rem',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Comodidades prioritarias para tu grupo:
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                {AMENIDADES_FILTRO.map(am => {
                  const activa = amenidades.includes(am);
                  return (
                    <button
                      key={am}
                      type="button"
                      onClick={() => toggleAmenidad(am)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '999px',
                        border: `1.5px solid ${activa ? 'var(--accent)' : 'var(--border)'}`,
                        background: activa ? 'color-mix(in srgb, var(--accent) 15%, var(--surface))' : 'var(--surface-2)',
                        color: activa ? 'var(--accent)' : 'var(--text)',
                        fontSize: '0.76rem',
                        fontWeight: activa ? 700 : 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s ease',
                        boxShadow: activa ? '0 0 12px rgba(212, 146, 74, 0.2)' : 'none',
                      }}
                    >
                      {activa && <Check size={12} />}
                      {am}
                    </button>
                  );
                })}

                {/* Chip Pet Friendly con estándar High-End */}
                <button
                  type="button"
                  onClick={() => setSoloPetFriendly(!soloPetFriendly)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '999px',
                    border: `1.5px solid ${soloPetFriendly ? 'var(--success)' : 'var(--border)'}`,
                    background: soloPetFriendly ? 'color-mix(in srgb, var(--success) 16%, var(--surface))' : 'var(--surface-2)',
                    color: soloPetFriendly ? 'var(--success)' : 'var(--text)',
                    fontSize: '0.76rem',
                    fontWeight: soloPetFriendly ? 700 : 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s ease',
                    boxShadow: soloPetFriendly ? '0 0 12px rgba(90, 170, 120, 0.25)' : 'none',
                  }}
                >
                  <Dog size={14} />
                  <span>Permite mascotas (Pet Friendly)</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* 2. Sección del Catálogo de Fincas Campestres */}
      {catalogoVisible && (
        <section style={{ marginTop: '1.75rem' }}>
          {/* Cabecera Interactiva con Selector de Vista (Grid vs Lista) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--primary-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                  }}
                >
                  <Home size={18} />
                </span>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  {catalogoTitulo}
                </h2>
                <span className="badge-pro-avail" style={{ fontSize: '0.7rem' }}>
                  <span className="pulse-dot" />
                  {fincasFiltradas.length} disponible{fincasFiltradas.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0', lineHeight: 1.5 }}>
                {catalogoSubtitulo}
              </p>
            </div>

            {/* Selector de Modo de Vista High-End (Grid 3D vs Lista) */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--rad-xs, 8px)',
                padding: '4px',
                boxShadow: 'var(--sh-sm)',
              }}
            >
              <button
                type="button"
                onClick={() => setVistaModo('grid')}
                title="Vista cuadrícula 3D de lujo"
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: vistaModo === 'grid' ? 'var(--accent)' : 'transparent',
                  color: vistaModo === 'grid' ? '#141210' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                  boxShadow: vistaModo === 'grid' ? '0 2px 10px rgba(212, 146, 74, 0.3)' : 'none',
                }}
              >
                <LayoutGrid size={14} />
                <span>Cuadrícula 3D</span>
              </button>

              <button
                type="button"
                onClick={() => setVistaModo('lista')}
                title="Vista lista compacta ejecutiva"
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: vistaModo === 'lista' ? 'var(--accent)' : 'transparent',
                  color: vistaModo === 'lista' ? '#141210' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                  boxShadow: vistaModo === 'lista' ? '0 2px 10px rgba(212, 146, 74, 0.3)' : 'none',
                }}
              >
                <List size={14} />
                <span>Lista</span>
              </button>
            </div>
          </div>

          {/* Renderizado de Fincas según vista seleccionada */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <SkeletonFincaItem key={n} />
              ))}
            </div>
          ) : fincasFiltradas.length === 0 ? (
            <div
              className="card-pro"
              style={{
                textAlign: 'center',
                padding: '3.5rem 1.5rem',
                borderRadius: 'var(--rad-md, 20px)',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                  color: 'var(--accent)',
                }}
              >
                <Home size={26} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 0.4rem 0' }}>
                Sin fincas para estos criterios
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
                {catalogoVacioTexto}
              </p>
              <button
                type="button"
                className="btn-pro-primary"
                onClick={limpiarFiltros}
              >
                Restablecer filtros y ver todas las fincas
              </button>
            </div>
          ) : vistaModo === 'grid' ? (
            /* ─── VISTA 1: GRID MODERNO DE TARJETAS 3D TILT ─── */
            <motion.div
              layout
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {fincasFiltradas.map(f => (
                <FincaCard3D
                  key={f.id}
                  finca={f}
                  onSelect={handleSelectFinca}
                  mostrarPrecioTotal={mostrarPrecioTotal}
                  mostrarBadges={mostrarBadges}
                />
              ))}
            </motion.div>
          ) : (
            /* ─── VISTA 2: LISTA COMPACTA EJECUTIVA CARD PRO ─── */
            <div className="fincas-scroll-viewport" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {fincasFiltradas.map(f => (
                <FincaListItem
                  key={f.id}
                  finca={f}
                  onSelect={handleSelectFinca}
                  mostrarPrecioTotal={mostrarPrecioTotal}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export const Catalog = React.memo<CatalogProps>(CatalogComponent);
Catalog.displayName = 'Catalog';
