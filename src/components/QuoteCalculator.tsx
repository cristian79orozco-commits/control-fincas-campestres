import React, { useMemo } from 'react';
import { MessageCircle, Calculator, Calendar, Users, Utensils } from 'lucide-react';
import type { Finca, Cotizacion } from '../types';

interface QuoteCalculatorProps {
  finca: Finca;
  fechaInicio: string;
  fechaFin: string;
  personas: number;
  plan: string;
  waNumberGlobal: string;
  onFechaInicioChange: (val: string) => void;
  onFechaFinChange: (val: string) => void;
  onPersonasChange: (val: number) => void;
  onPlanChange: (val: string) => void;
}

export const QuoteCalculator: React.FC<QuoteCalculatorProps> = ({
  finca,
  fechaInicio,
  fechaFin,
  personas,
  plan,
  waNumberGlobal,
  onFechaInicioChange,
  onFechaFinChange,
  onPersonasChange,
  onPlanChange,
}) => {
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

    // Estimación opcional de costo de alimentación
    let costoPlanPorPersonaNoche = 0;
    if (plan.toLowerCase().includes('desayuno')) {
      costoPlanPorPersonaNoche = 15000;
    } else if (plan.toLowerCase().includes('todo incluido') || plan.toLowerCase().includes('completa')) {
      costoPlanPorPersonaNoche = 55000;
    }

    const costoPlanTotal = noches * personas * costoPlanPorPersonaNoche;
    const totalEstimado = subtotalAlojamiento + costoPlanTotal;

    // Construcción del mensaje formateado para WhatsApp
    const waNum = (finca.whatsapp || waNumberGlobal || '573176827093').replace(/[^0-9]/g, '');

    const partes = [
      `¡Hola! 👋 Me gustaría reservar en *${finca.nombre}*.`,
      fechaInicio && fechaFin ? `📅 *Fechas:* del *${fechaInicio}* al *${fechaFin}* (${noches} noche${noches !== 1 ? 's' : ''})` : '',
      `👥 *Cantidad de personas:* ${personas}`,
      plan ? `🍽️ *Plan de alimentación:* ${plan}` : '',
      totalEstimado > 0 ? `💰 *Cotización estimada:* $${totalEstimado.toLocaleString('es-CO')} COP` : '',
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
  }, [finca, fechaInicio, fechaFin, personas, plan, waNumberGlobal]);

  const planesDisponibles = finca.finca_planes && finca.finca_planes.length > 0
    ? finca.finca_planes.map(p => p.nombre)
    : ['Sin alimentación', 'Desayuno', 'Todo incluido'];

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
            onChange={e => onPlanChange(e.target.value)}
          >
            {planesDisponibles.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

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
            <span className="text-muted">Plan {cotizacion.plan}:</span>
            <span>+ ${cotizacion.costoPlanTotal.toLocaleString('es-CO')} COP</span>
          </div>
        )}

        <div className="quote-row quote-total">
          <span>Total Estimado:</span>
          <span>${cotizacion.totalEstimado.toLocaleString('es-CO')} COP</span>
        </div>
      </div>

      {/* Vista previa del mensaje de WhatsApp */}
      <div>
        <div className="wa-label">
          <MessageCircle size={14} style={{ color: '#25d366' }} /> Mensaje que se enviará automáticamente por WhatsApp:
        </div>
        <div className="wa-bubble">{cotizacion.waMensaje}</div>
      </div>

      {/* Botón directo de reserva */}
      <a
        href={cotizacion.waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn wa-btn"
        style={{ width: '100%', marginTop: '0.5rem' }}
      >
        <span className="wa-pulse" />
        <MessageCircle size={18} />
        Reservar {finca.nombre} por WhatsApp
      </a>
    </div>
  );
};
