import React, { useState, useMemo } from 'react';
import {
  MessageCircle, Calculator, Calendar, Users, Utensils, Info,
  Check, User, Phone, Loader2, BadgeCheck,
} from 'lucide-react';
import type { Finca, Cotizacion, Menu } from '../types';
import type { DatosCotizacionPublica, ResultadoCotizacionPublica } from '../hooks/useCotizadorPublico';

interface QuoteCalculatorProps {
  finca: Finca;
  fechaInicio: string;
  fechaFin: string;
  personas: number;
  plan: string;
  waNumberGlobal: string;
  menus?: Menu[];
  onFechaInicioChange: (val: string) => void;
  onFechaFinChange: (val: string) => void;
  onPersonasChange: (val: number) => void;
  onPlanChange: (val: string) => void;
  /** Prop de Etapa 2: conecta el guardado a Supabase vía useCotizadorPublico */
  onGuardarCotizacion?: (datos: DatosCotizacionPublica) => Promise<ResultadoCotizacionPublica>;
}

function formatCOP(v: number) {
  return '$' + (v || 0).toLocaleString('es-CO') + ' COP';
}

export const QuoteCalculator: React.FC<QuoteCalculatorProps> = ({
  finca,
  fechaInicio,
  fechaFin,
  personas,
  plan,
  waNumberGlobal,
  menus = [],
  onFechaInicioChange,
  onFechaFinChange,
  onPersonasChange,
  onPlanChange,
  onGuardarCotizacion,
}) => {
  const [cantidadServicios, setCantidadServicios] = useState<number>(1);
  const [verDetalleMenu, setVerDetalleMenu] = useState(false);

  // --- Campos de cliente (Etapa 2) ---
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteCelular, setClienteCelular] = useState('');
  const [mismoWa, setMismoWa] = useState(true);
  const [clienteWa, setClienteWa] = useState('');
  const [guardandoCot, setGuardandoCot] = useState(false);
  const [cotGuardada, setCotGuardada] = useState<{ consecutivo: string; id: string } | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  // Menús activos disponibles
  const menusActivos = useMemo(() => {
    return menus.filter(m => m.activo);
  }, [menus]);

  // Identificar el menú seleccionado actualmente
  const menuSeleccionado = useMemo(() => {
    if (!plan || plan.toLowerCase().includes('sin alimentación')) return null;
    return menusActivos.find(
      m => m.nombre.toLowerCase() === plan.toLowerCase()
        || `${m.categoria}: ${m.nombre}`.toLowerCase() === plan.toLowerCase()
    );
  }, [plan, menusActivos]);

  // Cotización calculada en tiempo real
  const cotizacion = useMemo<Cotizacion>(() => {
    let noches = 1;
    if (fechaInicio && fechaFin) {
      const ini = new Date(fechaInicio + 'T00:00:00').getTime();
      const fn = new Date(fechaFin + 'T00:00:00').getTime();
      if (fn > ini) {
        noches = Math.round((fn - ini) / (1000 * 60 * 60 * 24));
      }
    }

    const precioBasePorPersona = Number(finca.precio_pp) || 0;
    const subtotalAlojamiento = noches * personas * precioBasePorPersona;

    let costoPlanTotal = 0;
    if (menuSeleccionado) {
      const cant = cantidadServicios || noches || 1;
      costoPlanTotal = (menuSeleccionado.precio_pp || 0) * personas * cant;
    } else if (plan && !plan.toLowerCase().includes('sin alimentación')) {
      let costoPorPp = 0;
      if (plan.toLowerCase().includes('desayuno')) costoPorPp = 18000;
      else if (plan.toLowerCase().includes('todo incluido') || plan.toLowerCase().includes('completa')) costoPorPp = 75000;
      costoPlanTotal = noches * personas * costoPorPp;
    }

    const totalEstimado = subtotalAlojamiento + costoPlanTotal;

    const waNum = (finca.whatsapp || waNumberGlobal || '573176827093').replace(/[^0-9]/g, '');

    const consecutivoLinea = cotGuardada ? `\n🆔 *Cotización:* ${cotGuardada.consecutivo}` : '';

    const partes = [
      `¡Hola! 👋 Me gustaría reservar en *${finca.nombre}*.`,
      fechaInicio && fechaFin
        ? `📅 *Fechas:* del *${fechaInicio}* al *${fechaFin}* (${noches} noche${noches !== 1 ? 's' : ''})`
        : '',
      `👥 *Cantidad de personas:* ${personas}`,
      menuSeleccionado
        ? `🍽️ *Plan de alimentación:* ${menuSeleccionado.nombre} (${menuSeleccionado.categoria}) — ${personas} pers. × ${cantidadServicios} servicio(s): $${costoPlanTotal.toLocaleString('es-CO')} COP`
        : (plan && plan !== 'Sin alimentación' ? `🍽️ *Plan de alimentación:* ${plan}` : ''),
      totalEstimado > 0 ? `💰 *Cotización estimada total:* $${totalEstimado.toLocaleString('es-CO')} COP` : '',
      consecutivoLinea,
      `\n¿Tienen disponibilidad confirmada para estas fechas? Quedo atento/a para coordinar los detalles. ¡Muchas gracias! 🙏`,
    ].filter(Boolean).join('\n');

    const waUrl = `https://wa.me/${waNum}?text=${encodeURIComponent(partes)}`;

    return {
      finca,
      fechaInicio,
      fechaFin,
      noches,
      personas,
      plan,
      precioBasePorPersona,
      subtotalAlojamiento,
      costoPlanTotal,
      totalEstimado,
      waMensaje: partes,
      waUrl,
    };
  }, [finca, fechaInicio, fechaFin, personas, plan, waNumberGlobal, menuSeleccionado, cantidadServicios, cotGuardada]);

  const handlePlanSelect = (val: string) => {
    onPlanChange(val);
    setVerDetalleMenu(false);
  };

  // --- Acción principal: Generar cotización y guardar en Supabase ---
  const handleGenerarCotizacion = async () => {
    // Siempre limpiar error previo
    setErrorGuardado(null);

    // Validar campos requeridos
    if (!clienteNombre.trim()) {
      setErrorGuardado('Por favor ingresa tu nombre.');
      return;
    }
    if (!clienteCelular.trim()) {
      setErrorGuardado('Por favor ingresa tu número de celular.');
      return;
    }

    // Si no hay integración con Supabase (prop opcional no provista), abrir WhatsApp directo
    if (!onGuardarCotizacion) {
      window.open(cotizacion.waUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setGuardandoCot(true);
    try {
      const whatsappFinal = mismoWa ? clienteCelular.trim() : clienteWa.trim();

      const datos: DatosCotizacionPublica = {
        clienteNombre: clienteNombre.trim(),
        clienteCelular: clienteCelular.trim(),
        clienteWhatsapp: whatsappFinal || clienteCelular.trim(),
        fincaId: finca.id,
        fechaInicio: cotizacion.fechaInicio,
        fechaFin: cotizacion.fechaFin,
        personas: cotizacion.personas,
        alimentacion: plan || 'Sin alimentación',
        menuId: menuSeleccionado?.id,
        cantidadServicios,
        precioBasePp: cotizacion.precioBasePorPersona,
        subtotalAlojamiento: cotizacion.subtotalAlojamiento,
        costoAlimentacion: cotizacion.costoPlanTotal,
        total: cotizacion.totalEstimado,
      };

      const resultado = await onGuardarCotizacion(datos);

      if (resultado.success && resultado.consecutivo && resultado.cotizacionId) {
        setCotGuardada({ consecutivo: resultado.consecutivo, id: resultado.cotizacionId });
      } else {
        // Guardado falló pero no bloqueamos el flujo de WhatsApp
        setErrorGuardado(resultado.error || 'No se pudo registrar la cotización, pero puedes contactarnos por WhatsApp.');
      }
    } finally {
      setGuardandoCot(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="field">
          <label><Calendar size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Fecha de llegada</label>
          <input
            type="date"
            value={fechaInicio}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => onFechaInicioChange(e.target.value)}
          />
        </div>

        <div className="field">
          <label><Calendar size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Fecha de salida</label>
          <input
            type="date"
            value={fechaFin}
            min={fechaInicio || new Date().toISOString().split('T')[0]}
            onChange={e => onFechaFinChange(e.target.value)}
          />
        </div>

        <div className="field">
          <label><Users size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Personas</label>
          <select
            value={personas}
            onChange={e => onPersonasChange(Number(e.target.value))}
          >
            {Array.from({ length: Math.min(finca.capacidad || 20, 50) }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} persona{i + 1 !== 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label><Utensils size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Plan de alimentación</label>
          <select
            value={plan}
            onChange={e => handlePlanSelect(e.target.value)}
          >
            <option value="Sin alimentación">Sin alimentación (+$0)</option>
            {menusActivos.map(m => (
              <option key={m.id} value={m.nombre}>
                [{m.categoria}] {m.nombre} — {formatCOP(m.precio_pp)}/pp
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Servicios / Días de alimentación y botón ver detalle */}
      {menuSeleccionado && (
        <div style={{ background: 'var(--surface-sunken)', padding: '0.75rem 1rem', borderRadius: 'var(--rad-xs)', display: 'grid', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Utensils size={13} /> {menuSeleccionado.nombre} ({formatCOP(menuSeleccionado.precio_pp)}/pp)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Días/servicios:</label>
              <input
                type="number"
                min={1}
                max={30}
                value={cantidadServicios}
                onChange={e => setCantidadServicios(Math.max(1, +e.target.value))}
                style={{ width: '56px', padding: '0.2rem 0.4rem', height: '28px', fontSize: '0.8rem', textAlign: 'center' }}
              />
              <button
                type="button"
                className="btn btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                onClick={() => setVerDetalleMenu(v => !v)}
              >
                <Info size={11} /> {verDetalleMenu ? 'Ocultar' : 'Ver qué incluye'}
              </button>
            </div>
          </div>

          {/* Detalle desplegable del menú */}
          {verDetalleMenu && (
            <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              {menuSeleccionado.imagen_url && (
                <img
                  src={menuSeleccionado.imagen_url}
                  alt={menuSeleccionado.nombre}
                  style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: 'var(--rad-xs)', flexShrink: 0 }}
                />
              )}
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{menuSeleccionado.categoria}</div>
                <div>{menuSeleccionado.descripcion}</div>
                {menuSeleccionado.condiciones && (
                  <div style={{ fontSize: '0.72rem', fontStyle: 'italic', marginTop: '0.25rem' }}>
                    ℹ️ {menuSeleccionado.condiciones}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tarjeta de Desglose de Cotización */}
      <div className="quote-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--primary)' }}>
          <Calculator size={16} /> Resumen de la cotización
        </div>

        <div className="quote-row">
          <span className="text-muted">Estadía:</span>
          <span>{cotizacion.noches} noche{cotizacion.noches !== 1 ? 's' : ''} × {cotizacion.personas} personas</span>
        </div>

        {cotizacion.precioBasePorPersona > 0 && (
          <div className="quote-row">
            <span className="text-muted">Alojamiento (${cotizacion.precioBasePorPersona.toLocaleString('es-CO')} /pp/noche):</span>
            <span>${cotizacion.subtotalAlojamiento.toLocaleString('es-CO')} COP</span>
          </div>
        )}

        {cotizacion.costoPlanTotal > 0 && (
          <div className="quote-row">
            <span className="text-muted">
              Alimentación ({menuSeleccionado ? menuSeleccionado.nombre : cotizacion.plan}):
            </span>
            <span>+ ${cotizacion.costoPlanTotal.toLocaleString('es-CO')} COP</span>
          </div>
        )}

        <div className="quote-row quote-total">
          <span>Total Estimado:</span>
          <span>${cotizacion.totalEstimado.toLocaleString('es-CO')} COP</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CAMPOS DE CLIENTE — Etapa 2                                         */}
      {/* ------------------------------------------------------------------ */}
      <div style={{
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--rad-xs)',
        padding: '1rem',
        display: 'grid',
        gap: '0.85rem',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <User size={14} style={{ color: 'var(--primary)' }} /> Tus datos de contacto
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.75rem' }}><User size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> Nombre *</label>
            <input
              id="cotizador-nombre"
              type="text"
              placeholder="Tu nombre completo"
              value={clienteNombre}
              onChange={e => setClienteNombre(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.75rem' }}><Phone size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> Celular *</label>
            <input
              id="cotizador-celular"
              type="tel"
              placeholder="Ej: 3001234567"
              value={clienteCelular}
              onChange={e => setClienteCelular(e.target.value)}
              autoComplete="tel"
            />
          </div>
        </div>

        {/* Checkbox: ¿Mismo número WhatsApp? */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', cursor: 'pointer', userSelect: 'none' }}>
          <input
            id="cotizador-mismo-wa"
            type="checkbox"
            checked={mismoWa}
            onChange={e => setMismoWa(e.target.checked)}
            style={{ width: '15px', height: '15px', accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          <span style={{ color: 'var(--text-muted)' }}>El celular también es mi número de WhatsApp</span>
        </label>

        {/* Campo WhatsApp alternativo */}
        {!mismoWa && (
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.75rem' }}><MessageCircle size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> WhatsApp (diferente al celular)</label>
            <input
              id="cotizador-whatsapp"
              type="tel"
              placeholder="Ej: 3009876543"
              value={clienteWa}
              onChange={e => setClienteWa(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Mensaje de error no bloqueante */}
      {errorGuardado && (
        <div style={{
          padding: '0.6rem 0.9rem',
          borderRadius: 'var(--rad-xs)',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          fontSize: '0.78rem',
          color: '#ef4444',
        }}>
          ⚠️ {errorGuardado}
        </div>
      )}

      {/* Badge de éxito: cotización registrada con consecutivo */}
      {cotGuardada && (
        <div style={{
          padding: '0.85rem 1rem',
          borderRadius: 'var(--rad-xs)',
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
        }}>
          <BadgeCheck size={22} style={{ color: '#22c55e', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#16a34a' }}>
              ✓ Cotización registrada
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Código: <strong style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>{cotGuardada.consecutivo}</strong> — Ahora puedes contactarnos por WhatsApp con este código.
            </div>
          </div>
        </div>
      )}

      {/* Vista previa del mensaje de WhatsApp */}
      <div>
        <div className="wa-label">
          <MessageCircle size={14} style={{ color: '#25d366' }} /> Mensaje de WhatsApp:
        </div>
        <div className="wa-bubble">{cotizacion.waMensaje}</div>
      </div>

      {/* Botón principal: Generar Cotización */}
      {!cotGuardada && (
        <button
          id="cotizador-btn-generar"
          type="button"
          className="btn wa-btn"
          style={{ width: '100%', marginTop: '0.25rem', opacity: guardandoCot ? 0.75 : 1 }}
          disabled={guardandoCot}
          onClick={handleGenerarCotizacion}
        >
          {guardandoCot ? (
            <>
              <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              Registrando cotización...
            </>
          ) : (
            <>
              <Check size={18} />
              Generar cotización
            </>
          )}
        </button>
      )}

      {/* Botón de WhatsApp (siempre disponible una vez cotización generada o si ya hay consecutivo) */}
      {cotGuardada && (
        <a
          href={cotizacion.waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn wa-btn"
          style={{ width: '100%', marginTop: '0.25rem' }}
        >
          <span className="wa-pulse" />
          <MessageCircle size={18} />
          Contactar por WhatsApp con código {cotGuardada.consecutivo}
        </a>
      )}
    </div>
  );
};
