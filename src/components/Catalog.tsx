import React, { useMemo, useEffect } from 'react';
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
    style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--rad-sm, 14px)',
      padding: '1rem',
      display: 'flex',
      gap: '0.85rem',
      alignItems: 'center',
      background: 'var(--surface)',
    }}
  >
    <div className="skeleton-box" style={{ width: '80px', height: '80px', borderRadius: '8px', flexShrink: 0 }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flexGrow: 1 }}>
      <div className="skeleton-box" style={{ height: '16px', width: '60%' }} />
      <div className="skeleton-box" style={{ height: '12px', width: '40%' }} />
      <div className="skeleton-box" style={{ height: '12px', width: '30%' }} />
    </div>
  </div>
);

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
  onOpenPortalHuesped,
}) => {
  const store = useClientStore();
  const {
    busquedaTexto, setBusquedaTexto,
    fechaEntrada, setFechaEntrada,
    fechaSalida, setFechaSalida,
    personas, setPersonas,
    amenidades, toggleAmenidad,
    soloPetFriendly, setSoloPetFriendly,
    ordenPor, setOrdenPor,
    vistaModo, setVistaModo,
    filtrosAvanzadosOpen, setFiltrosAvanzadosOpen,
    limpiarFiltros,
    fincasComparar,
  } = store;

  // Sincronizar vista predeterminada según configuración del administrador
  useEffect(() => {
    if (contenido?.catalogo_vista_predeterminada) {
      setVistaModo(contenido.catalogo_vista_predeterminada);
    }
  }, [contenido?.catalogo_vista_predeterminada, setVistaModo]);

  // Filtrado reactivo optimizado con Lodash
  const fincasFiltradas = useMemo(() => {
    return filtrarFincasCliente(fincas, bloquesAdmin, store);
  }, [fincas, bloquesAdmin, store]);

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
      {/* 1. Panel de Búsqueda y Filtros Centralizados */}
      {filtrosVisible && (
        <div className="filters-card" id="catalogo" style={{ borderRadius: 'var(--rad-md, 18px)' }}>
          <div className="sec-header" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.6rem' }}>
            <div>
              <div className="sec-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={18} style={{ color: 'var(--primary)' }} /> {filtrosTitulo}
              </div>
              <div className="sec-sub">{filtrosSubtitulo}</div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {onOpenPortalHuesped && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={onOpenPortalHuesped}
                  style={{ fontSize: '0.75rem', gap: '5px' }}
                >
                  <FileCheck2 size={13} style={{ color: 'var(--primary)' }} /> Consultar mi reserva
                </button>
              )}

              {hayFiltrosActivos && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={limpiarFiltros}
                  style={{ fontSize: '0.75rem', gap: '4px' }}
                >
                  <X size={13} /> Limpiar filtros
                </button>
              )}
            </div>
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

            {/* Fecha Llegada */}
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
                value={personas}
                onChange={e => setPersonas(e.target.value)}
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
                marginTop: '0.65rem',
                fontSize: '0.76rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--primary)',
                background: 'var(--primary-bg)',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--rad-xs, 8px)',
                width: 'fit-content',
              }}
            >
              <Calendar size={14} />
              <span>
                Filtro en tiempo real: <strong>{fechaEntrada ? `Llegada: ${fechaEntrada}` : ''}</strong>
                {fechaSalida ? ` | Salida: ${fechaSalida}` : ' (comprobando fecha exacta)'}
                {' — '}
                {fincasFiltradas.length} finca{fincasFiltradas.length !== 1 ? 's' : ''} disponible{fincasFiltradas.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Botón para desplegar más comodidades y ordenamiento */}
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setFiltrosAvanzadosOpen(v => !v)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0',
              }}
            >
              <Sparkles size={14} />
              {filtrosAvanzadosOpen ? 'Ocultar comodidades y ordenamiento' : 'Filtrar por comodidades (Piscina, Jacuzzi, Mascotas, etc.)'}
              {filtrosAvanzadosOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Selector de ordenamiento rápido */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Ordenar por:</span>
              <select
                value={ordenPor}
                onChange={e => setOrdenPor(e.target.value as any)}
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.76rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
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
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border)',
                display: 'grid',
                gap: '0.6rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Comodidades prioritarias para tu grupo:
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
                {AMENIDADES_FILTRO.map(am => {
                  const activa = amenidades.includes(am);
                  return (
                    <button
                      key={am}
                      type="button"
                      onClick={() => toggleAmenidad(am)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '999px',
                        border: `1.5px solid ${activa ? 'var(--primary)' : 'var(--border)'}`,
                        background: activa ? 'var(--primary-bg)' : 'var(--surface)',
                        color: activa ? 'var(--primary)' : 'var(--text)',
                        fontSize: '0.75rem',
                        fontWeight: activa ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
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
                  onClick={() => setSoloPetFriendly(!soloPetFriendly)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '999px',
                    border: `1.5px solid ${soloPetFriendly ? 'var(--success)' : 'var(--border)'}`,
                    background: soloPetFriendly ? 'var(--success-bg)' : 'var(--surface)',
                    color: soloPetFriendly ? 'var(--success)' : 'var(--text)',
                    fontSize: '0.75rem',
                    fontWeight: soloPetFriendly ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Dog size={13} />
                  Permite mascotas (Pet Friendly)
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
              marginBottom: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Home size={22} style={{ color: 'var(--primary)' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  {catalogoTitulo}
                </h2>
                <span className="status-badge s-avail" style={{ fontSize: '0.72rem' }}>
                  {fincasFiltradas.length} disponible{fincasFiltradas.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                {catalogoSubtitulo}
              </p>
            </div>

            {/* Selector de Modo de Vista (Grid 3D vs Lista) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.25rem',
              }}
            >
              <button
                type="button"
                onClick={() => setVistaModo('grid')}
                title="Vista cuadrícula 3D de lujo"
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: vistaModo === 'grid' ? 'var(--primary)' : 'transparent',
                  color: vistaModo === 'grid' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                }}
              >
                <LayoutGrid size={14} /> Cuadrícula 3D
              </button>

              <button
                type="button"
                onClick={() => setVistaModo('lista')}
                title="Vista lista compacta"
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: vistaModo === 'lista' ? 'var(--primary)' : 'transparent',
                  color: vistaModo === 'lista' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                }}
              >
                <List size={14} /> Lista
              </button>
            </div>
          </div>

          {/* Renderizado de Fincas según vista seleccionada */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <SkeletonFincaItem key={n} />
              ))}
            </div>
          ) : fincasFiltradas.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--surface)' }}>
              <p className="text-muted" style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>
                {catalogoVacioTexto}
              </p>
              <button className="btn btn-primary btn-sm" onClick={limpiarFiltros}>
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
                  onSelect={onSelectFinca}
                  mostrarPrecioTotal={mostrarPrecioTotal}
                  mostrarBadges={mostrarBadges}
                />
              ))}
            </motion.div>
          ) : (
            /* ─── VISTA 2: LISTA COMPACTA EJECUTIVA CON SCROLL ─── */
            <div className="fincas-scroll-viewport" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {fincasFiltradas.map(f => {
                const primeraFoto = f.finca_imagenes?.[0]?.url || '';
                const totalFotos = f.finca_imagenes?.length || 0;
                return (
                  <div
                    key={f.id}
                    onClick={() => onSelectFinca(f.id)}
                    className="finca-list-interactive-item"
                    role="button"
                    tabIndex={0}
                    style={{
                      background: 'var(--surface)',
                      border: '1.5px solid var(--border)',
                      borderRadius: 'var(--rad-sm, 12px)',
                      padding: '0.85rem',
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Miniatura */}
                    <div
                      style={{
                        width: '90px',
                        height: '90px',
                        borderRadius: '10px',
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
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <Home size={26} />
                        </div>
                      )}
                      {totalFotos > 1 && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '3px',
                            right: '3px',
                            background: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.35rem',
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

                    {/* Información condensada */}
                    <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                          {f.nombre}
                        </h3>
                        <span className="status-badge s-avail" style={{ fontSize: '0.64rem' }}>
                          Disponible
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        <MapPin size={12} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span>{f.zona || 'Santa Elena, Valle'}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'var(--surface-2)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                          <Users size={12} style={{ color: 'var(--primary)' }} /> {f.capacidad_minima ? `${f.capacidad_minima} - ${f.capacidad}` : `Hasta ${f.capacidad}`} pers.
                        </span>
                        {f.habitaciones && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'var(--surface-2)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                            <Bed size={12} style={{ color: 'var(--primary)' }} /> {f.habitaciones} habs
                          </span>
                        )}
                        {f.politica_mascotas === 'permitido' && (
                          <span style={{ color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Dog size={12} /> Pet Friendly
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tarifa y Cotizar */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        flexShrink: 0,
                        paddingLeft: '0.75rem',
                        borderLeft: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Tarifa /pp noche
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--primary)' }}>
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
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
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
          )}
        </section>
      )}
    </div>
  );
};
