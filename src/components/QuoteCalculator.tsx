import React, { useState, useMemo } from 'react';
import {
  MessageCircle, Calculator, Calendar, Users, Utensils,
  Check, User, Phone, Loader2, BadgeCheck,
} from 'lucide-react';
import type { Finca, Cotizacion, Menu } from '../types';
import type { DatosCotizacionPublica, ResultadoCotizacionPublica } from '../hooks/useCotizadorPublico';
import { MenuSelectorCards } from './MenuSelectorCards';
import { calcularCotizacion } from '../utils/calcularCotizacion';
import { NumericStepper } from './NumericStepper';

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
    let menuPrecioPp = menuSeleccionado ? (menuSeleccionado.precio_pp || 0) : 0;
    if (!menuSeleccionado && plan && !plan.toLowerCase().includes('sin alimentación')) {
      if (plan.toLowerCase().includes('desayuno')) menuPrecioPp = 18000;
      else if (plan.toLowerCase().includes('todo incluido') || plan.toLowerCase().includes('completa')) menuPrecioPp = 75000;
    }

    // Fuente única de verdad compartida con el panel de administración
    const { subtotalAlojamiento, costoAlimentacion: costoPlanTotal, total: totalEstimado } = calcularCotizacion({
      noches,
      personas,
      precioPp: precioBasePorPersona,
      menuPrecioPp,
      cantidadServicios: cantidadServicios || noches || 1,
    });

    const waNum = (finca.whatsapp || waNumberGlobal || '573176827093').replace(/[^0-9]/g, '');

    const consecutivoLinea = cotGuardada
      ? `🆔 *Cotización N°:* ${cotGuardada.consecutivo}`
      : '';

    const clienteLinea = clienteNombre.trim()
      ? `👤 *Cliente:* ${clienteNombre.trim()}`
      : '';

    const telefonoLinea = clienteCelular.trim()
      ? `📞 *Teléfono de contacto:* ${clienteCelular.trim()}`
      : '';

    const waAlternativoLinea = (!mismoWa && clienteWa.trim())
      ? `📱 *WhatsApp:* ${clienteWa.trim()}`
      : '';

    const partes = [
      `¡Hola! 👋 Me gustaría reservar en *${finca.nombre}*.`,
      consecutivoLinea,
      clienteLinea,
      telefonoLinea,
      waAlternativoLinea,
      fechaInicio && fechaFin
        ? `📅 *Fechas:* del *${fechaInicio}* al *${fechaFin}* (${noches} noche${noches !== 1 ? 's' : ''})`
        : '',
      `👥 *Cantidad de personas:* ${personas}`,
      menuSeleccionado
        ? `🍽️ *Plan de alimentación:* ${menuSeleccionado.nombre} (${menuSeleccionado.categoria}) — ${personas} pers. × ${cantidadServicios} servicio(s): $${costoPlanTotal.toLocaleString('es-CO')} COP`
        : (plan && plan !== 'Sin alimentación' ? `🍽️ *Plan de alimentación:* ${plan}` : ''),
      totalEstimado > 0 ? `💰 *Cotización estimada total:* $${totalEstimado.toLocaleString('es-CO')} COP` : '',
      `\n📌 *Interés en reserva:* Tengo total interés en reservar esta finca para estas fechas. Por favor confírmenme disponibilidad y los pasos para consignar el anticipo de reserva con este código. ¡Muchas gracias! 🙏`,
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
  }, [finca, fechaInicio, fechaFin, personas, plan, waNumberGlobal, menuSeleccionado, cantidadServicios, cotGuardada, clienteNombre, clienteCelular, clienteWa, mismoWa]);

  const handlePlanSelect = (val: string) => {
    onPlanChange(val);
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
    if (!cotizacion.fechaInicio || !cotizacion.fechaFin) {
      setErrorGuardado('Por favor selecciona las fechas de llegada y salida en el calendario.');
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

        // Intentar abrir WhatsApp en pestaña nueva automáticamente
        const waNum = (finca.whatsapp || waNumberGlobal || '573176827093').replace(/[^0-9]/g, '');
        const partesExito = [
          `¡Hola! 👋 Me gustaría reservar en *${finca.nombre}*.`,
          `🆔 *Cotización N°:* ${resultado.consecutivo}`,
          `👤 *Cliente:* ${clienteNombre.trim()}`,
          `📞 *Teléfono de contacto:* ${clienteCelular.trim()}`,
          (!mismoWa && clienteWa.trim()) ? `📱 *WhatsApp:* ${clienteWa.trim()}` : '',
          cotizacion.fechaInicio && cotizacion.fechaFin
            ? `📅 *Fechas:* del *${cotizacion.fechaInicio}* al *${cotizacion.fechaFin}* (${cotizacion.noches} noche${cotizacion.noches !== 1 ? 's' : ''})`
            : '',
          `👥 *Cantidad de personas:* ${cotizacion.personas}`,
          menuSeleccionado
            ? `🍽️ *Plan de alimentación:* ${menuSeleccionado.nombre} (${menuSeleccionado.categoria}) — ${cotizacion.personas} pers. × ${cantidadServicios} servicio(s): $${cotizacion.costoPlanTotal.toLocaleString('es-CO')} COP`
            : (plan && plan !== 'Sin alimentación' ? `🍽️ *Plan de alimentación:* ${plan}` : ''),
          cotizacion.totalEstimado > 0 ? `💰 *Cotización estimada total:* $${cotizacion.totalEstimado.toLocaleString('es-CO')} COP` : '',
          `\n📌 *Interés en reserva:* Tengo total interés en reservar esta finca para estas fechas. Por favor confírmenme disponibilidad y los pasos para consignar el anticipo de reserva con este código. ¡Muchas gracias! 🙏`,
        ].filter(Boolean).join('\n');

        const directoWaUrl = `https://wa.me/${waNum}?text=${encodeURIComponent(partesExito)}`;
        try {
          window.open(directoWaUrl, '_blank', 'noopener,noreferrer');
        } catch {
          // Si el navegador bloquea la apertura automática, el botón verde queda listo
        }
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
      </div>

      {/* Selector visual de planes de alimentación — Fase 2 */}
      <MenuSelectorCards
        menus={menus}
        planSeleccionado={plan}
        onSelect={handlePlanSelect}
      />


      {/* Campo de días/servicios cuando hay menú seleccionado */}
      {menuSeleccionado && (
        <div style={{
          background: 'var(--surface-sunken)',
          padding: '0.65rem 1rem',
          borderRadius: 'var(--rad-xs)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem', flexGrow: 1 }}>
            <Utensils size={13} /> {menuSeleccionado.nombre} — {(menuSeleccionado.precio_pp || 0).toLocaleString('es-CO')} COP/pp
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Servicios:</label>
            <NumericStepper
              size="sm"
              min={1}
              max={30}
              value={cantidadServicios}
              onChange={setCantidadServicios}
            />
          </div>
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
      {!cotGuardada ? (
        <div>
          <div className="wa-label">
            <MessageCircle size={14} style={{ color: '#25d366' }} /> Mensaje de WhatsApp:
          </div>
          <div className="wa-bubble">{cotizacion.waMensaje}</div>
        </div>
      ) : (
        <details style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <summary style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0' }}>
            <MessageCircle size={12} style={{ color: '#25d366' }} /> Ver detalle del mensaje para WhatsApp
          </summary>
          <div className="wa-bubble" style={{ marginTop: '0.45rem', opacity: 0.9 }}>{cotizacion.waMensaje}</div>
        </details>
      )}

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
              <MessageCircle size={18} />
              Solicitar cotización por WhatsApp
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
          Abrir WhatsApp con código {cotGuardada.consecutivo}
        </a>
      )}
    </div>
  );
};
