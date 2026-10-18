import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  X,
  Check,
  Minus,
  Users,
  Bed,
  Bath,
  Clock,
  Dog,
  Volume2,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import type { Finca } from '../types';
import { useClientStore } from '../store/useClientStore';

interface FincaComparatorProps {
  fincas: Finca[];
  onSelectFinca: (fincaId: string) => void;
  titulo?: string;
  subtitulo?: string;
}

function formatCOP(v: number): string {
  return '$' + Math.round(v || 0).toLocaleString('es-CO') + ' COP';
}

export const FincaComparator: React.FC<FincaComparatorProps> = ({
  fincas,
  onSelectFinca,
  titulo = 'Comparador de Fincas Campestres',
  subtitulo = 'Compara especificaciones, comodidades y tarifas lado a lado para tomar la mejor decisión',
}) => {
  const {
    fincasComparar,
    toggleCompararFinca,
    limpiarComparador,
    comparadorModalOpen,
    setComparadorModalOpen,
  } = useClientStore();

  const fincasSeleccionadas = fincas.filter((f) => fincasComparar.includes(f.id));

  if (fincasSeleccionadas.length === 0) {
    return null; // No muestra nada si el cliente no ha seleccionado fincas
  }

  // Lista única de amenidades entre las fincas comparadas
  const todasAmenidades = Array.from(
    new Set(
      fincasSeleccionadas.flatMap((f) => (f.finca_amenidades || []).map((a) => a.nombre))
    )
  );

  return (
    <>
      {/* ─── 1. SECCIÓN DEDICADA EN LA PÁGINA ─── */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="finca-comparator-section"
        id="seccion-comparador"
        style={{
          marginTop: '2rem',
          marginBottom: '2rem',
          background: 'var(--surface)',
          border: '1.5px solid var(--primary)',
          borderRadius: 'var(--rad-md, 18px)',
          padding: '1.5rem',
          boxShadow: 'var(--sh-md)',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera del comparador */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '1rem',
            marginBottom: '1.25rem',
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
                }}
              >
                <Scale size={20} />
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                {titulo} ({fincasSeleccionadas.length} seleccionadas)
              </h2>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {subtitulo}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={limpiarComparador}
              style={{ fontSize: '0.78rem', gap: '4px' }}
            >
              <X size={14} /> Limpiar comparación
            </button>
          </div>
        </div>

        {/* Tabla / Matriz Comparativa Responsiva con Scroll Horizontal */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table
            style={{
              width: '100%',
              minWidth: `${fincasSeleccionadas.length * 240 + 160}px`,
              borderCollapse: 'separate',
              borderSpacing: 0,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    width: '180px',
                    padding: '0.75rem',
                    textAlign: 'left',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    background: 'var(--surface-2)',
                    borderTopLeftRadius: '10px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  Propiedad
                </th>
                {fincasSeleccionadas.map((f) => {
                  const img =
                    f.finca_imagenes?.[0]?.url ||
                    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80';
                  return (
                    <th
                      key={f.id}
                      style={{
                        padding: '0.75rem',
                        textAlign: 'center',
                        background: 'var(--surface-2)',
                        borderBottom: '1px solid var(--border)',
                        position: 'relative',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCompararFinca(f.id)}
                        title="Quitar finca de la comparación"
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={12} />
                      </button>

                      <div
                        style={{
                          width: '100%',
                          height: '110px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          marginBottom: '0.5rem',
                          background: '#0f172a',
                        }}
                      >
                        <img
                          src={img}
                          alt={f.nombre}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)' }}>
                        {f.nombre}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {f.zona || 'Santa Elena'}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Tarifa /pp noche */}
              <tr>
                <td style={{ padding: '0.75rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                  Tarifa /pp noche
                </td>
                {fincasSeleccionadas.map((f) => (
                  <td key={f.id} style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 900, color: 'var(--primary)', fontSize: '1.05rem', borderBottom: '1px solid var(--border)' }}>
                    {formatCOP(Number(f.precio_pp) || 0)}
                  </td>
                ))}
              </tr>

              {/* Finca Completa */}
              <tr>
                <td style={{ padding: '0.75rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                  Finca completa
                </td>
                {fincasSeleccionadas.map((f) => (
                  <td key={f.id} style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
                    {f.precio_finca_completa ? formatCOP(Number(f.precio_finca_completa)) : 'Consultar'}
                  </td>
                ))}
              </tr>

              {/* Capacidad */}
              <tr>
                <td style={{ padding: '0.75rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                  Capacidad de huéspedes
                </td>
                {fincasSeleccionadas.map((f) => (
                  <td key={f.id} style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.82rem', borderBottom: '1px solid var(--border)' }}>
                    <strong>{f.capacidad_minima ? `${f.capacidad_minima} a ${f.capacidad}` : `Hasta ${f.capacidad}`}</strong> pers.
                  </td>
                ))}
              </tr>

              {/* Habitaciones & Baños */}
              <tr>
                <td style={{ padding: '0.75rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                  Distribución
                </td>
                {fincasSeleccionadas.map((f) => (
                  <td key={f.id} style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem', borderBottom: '1px solid var(--border)' }}>
                    {f.habitaciones || '-'} habs · {f.camas || '-'} camas · {f.banos || '-'} baños
                  </td>
                ))}
              </tr>

              {/* Check-in / Check-out */}
              <tr>
                <td style={{ padding: '0.75rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                  Horarios
                </td>
                {fincasSeleccionadas.map((f) => (
                  <td key={f.id} style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                    Ingreso: {f.checkin_hora || '9:00 AM'} <br /> Salida: {f.checkout_hora || '5:00 PM'}
                  </td>
                ))}
              </tr>

              {/* Política de Mascotas */}
              <tr>
                <td style={{ padding: '0.75rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                  Mascotas (Pet friendly)
                </td>
                {fincasSeleccionadas.map((f) => (
                  <td key={f.id} style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.82rem', borderBottom: '1px solid var(--border)' }}>
                    {f.politica_mascotas === 'permitido' ? (
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓ Permitido</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Bajo consulta</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Amenidades clave */}
              {todasAmenidades.map((am) => (
                <tr key={am}>
                  <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                    {am}
                  </td>
                  {fincasSeleccionadas.map((f) => {
                    const tiene = (f.finca_amenidades || []).some(
                      (a) => a.nombre.toLowerCase() === am.toLowerCase()
                    );
                    return (
                      <td
                        key={f.id}
                        style={{
                          padding: '0.55rem 0.75rem',
                          textAlign: 'center',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {tiene ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: 'var(--primary-bg)',
                              color: 'var(--primary)',
                            }}
                          >
                            <Check size={14} />
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', opacity: 0.4 }}>
                            <Minus size={14} />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Fila de Botones para Cotizar */}
              <tr>
                <td style={{ padding: '1rem 0.75rem', background: 'var(--surface-2)' }}>Acción</td>
                {fincasSeleccionadas.map((f) => (
                  <td key={f.id} style={{ padding: '1rem 0.75rem', textAlign: 'center', background: 'var(--surface-2)' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => onSelectFinca(f.id)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        margin: '0 auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>Cotizar {f.nombre}</span>
                      <ArrowRight size={13} />
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </motion.section>

      {/* ─── 2. BOTÓN FLOTANTE DISCRETO EN LA ESQUINA INFERIOR ─── */}
      <AnimatePresence>
        {fincasSeleccionadas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 900,
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              borderRadius: '999px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('seccion-comparador');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.7rem 1.25rem',
                borderRadius: '999px',
                background: 'var(--primary)',
                color: '#ffffff',
                border: '2px solid rgba(255,255,255,0.25)',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: 'var(--sh-lg)',
              }}
            >
              <Scale size={18} />
              <span>Comparando {fincasSeleccionadas.length} finca{fincasSeleccionadas.length > 1 ? 's' : ''}</span>
              <span
                style={{
                  background: 'rgba(255,255,255,0.25)',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                }}
              >
                Ver
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
