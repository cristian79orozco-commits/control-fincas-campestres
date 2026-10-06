import React, { useState, useMemo } from 'react';
import {
  MessageCircle, Calculator, Calendar, Users, Utensils,
  Check, User, Phone, Loader2, BadgeCheck, AlertCircle, Sparkles, ShieldCheck
} from 'lucide-react';
import type { Finca, Cotizacion, Menu, ConfiguracionGeneral } from '../types';
import type { DatosCotizacionPublica, ResultadoCotizacionPublica } from '../hooks/useCotizadorPublico';
import { MenuSelectorCards, PlanAlimentacionSeleccionado } from './MenuSelectorCards';
import { NumericStepper } from './NumericStepper';
import { PLANTILLAS_PREDETERMINADAS, renderizarPlantillaPersonalizada } from '../services/whatsapp';

interface QuoteCalculatorProps {
  finca: Finca;
  fechaInicio: string;
  fechaFin: string;
  personas: number;
  plan?: string;
  waNumberGlobal: string;
  menus?: Menu[];
  configuracion?: ConfiguracionGeneral;
  onFechaInicioChange: (val: string) => void;
  onFechaFinChange: (val: string) => void;
  onPersonasChange: (val: number) => void;
  onPlanChange?: (val: string) => void;
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
  waNumberGlobal,
  menus = [],
  configuracion,
  onFechaInicioChange,
  onFechaFinChange,
  onPersonasChange,
  onGuardarCotizacion,
}) => {
  // Selección múltiple de planes de alimentación complementaria
  const [planesSeleccionados, setPlanesSeleccionados] = useState<PlanAlimentacionSeleccionado[]>([]);
  const [soloAlojamiento, setSoloAlojamiento] = useState(true);

  // Campos obligatorios de cliente
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteCelular, setClienteCelular] = useState('');
  const [mismoWa, setMismoWa] = useState(true);
  const [clienteWa, setClienteWa] = useState('');

  // Estados de proceso
  const [guardandoCot, setGuardandoCot] = useState(false);
  const [cotGuardada, setCotGuardada] = useState<{ consecutivo: string; id: string } | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  // Manejo de alternancia en planes de alimentación
  const handleToggleSoloAlojamiento = () => {
    setSoloAlojamiento(true);
    setPlanesSeleccionados([]);
  };

  const handleToggleMenu = (menu: Menu) => {
    setSoloAlojamiento(false);
    setPlanesSeleccionados(prev => {
      const existe = prev.find(p => p.menuId === menu.id);
      if (existe) {
        const filtrados = prev.filter(p => p.menuId !== menu.id);
        if (filtrados.length === 0) {
          setSoloAlojamiento(true);
        }
        return filtrados;
      } else {
        return [
          ...prev,
          {
            menuId: menu.id,
            nombre: menu.nombre,
            categoria: menu.categoria,
            precioPp: menu.precio_pp || 0,
            cantidadServicios: 1,
          },
        ];
      }
    });
  };

  const handleCambiarServicios = (menuId: string, cantidad: number) => {
    setPlanesSeleccionados(prev =>
      prev.map(p => (p.menuId === menuId ? { ...p, cantidadServicios: cantidad } : p))
    );
  };

  // Regla operativa: Requisito de alimentación mínima para grupos pequeños
  const reglaActiva = configuracion?.regla_alimentacion_activa !== false;
  const maxPersonasRegla = configuracion?.regla_alimentacion_max_personas ?? 10;
  const minServiciosRegla = configuracion?.regla_alimentacion_min_servicios ?? 2;
  const reglaAplica = reglaActiva && personas <= maxPersonasRegla;
  const totalServicios = soloAlojamiento
    ? 0
    : planesSeleccionados.reduce((acc, p) => acc + p.cantidadServicios, 0);
  const cumpleRegla = !reglaAplica || totalServicios >= minServiciosRegla;

  // Cálculo de estancia y valores
  const { noches, subtotalAlojamiento, costoTotalAlimentacion, totalEstimado, alimentacionDetalle, alimentacionTextoResumen } = useMemo(() => {
    let n = 1;
    if (fechaInicio && fechaFin) {
      const ini = new Date(fechaInicio + 'T00:00:00').getTime();
      const fn = new Date(fechaFin + 'T00:00:00').getTime();
      if (fn > ini) {
        n = Math.round((fn - ini) / (1000 * 60 * 60 * 24));
      }
    }

    const precioBasePp = Number(finca.precio_pp) || 0;
    const subtotalAloja = precioBasePp * n * personas;

    const costoAlim = soloAlojamiento || planesSeleccionados.length === 0
      ? 0
      : planesSeleccionados.reduce((acc, p) => acc + (p.precioPp * p.cantidadServicios * personas), 0);

    const tot = subtotalAloja + costoAlim;

    let detAlim = '';
    let resAlim = 'Solo alojamiento';

    if (soloAlojamiento || planesSeleccionados.length === 0) {
      detAlim = '🍽️ *Alimentación:* Solo alojamiento (Sin planes adicionales)';
    } else {
      const lineas = planesSeleccionados.map(
        p => `• ${p.nombre} (${p.categoria}): ${p.cantidadServicios} serv. × ${personas} pers. ($${p.precioPp.toLocaleString('es-CO')}/pp) = $${(p.precioPp * p.cantidadServicios * personas).toLocaleString('es-CO')} COP`
      );
      detAlim = `🍽️ *Planes de alimentación complementaria:*\n${lineas.join('\n')}\n*Subtotal alimentación:* $${costoAlim.toLocaleString('es-CO')} COP`;
      resAlim = planesSeleccionados.map(p => `${p.nombre} (${p.cantidadServicios} serv.)`).join(' + ');
    }

    return {
      noches: n,
      subtotalAlojamiento: subtotalAloja,
      costoTotalAlimentacion: costoAlim,
      totalEstimado: tot,
      alimentacionDetalle: detAlim,
      alimentacionTextoResumen: resAlim,
    };
  }, [fechaInicio, fechaFin, personas, finca.precio_pp, soloAlojamiento, planesSeleccionados]);

  // Mensaje y Enlace de WhatsApp dinámico con Plantilla Editable
  const { waMensaje, waUrl } = useMemo(() => {
    const waNum = (finca.whatsapp || waNumberGlobal || '573176827093').replace(/[^0-9]/g, '');

    const template = configuracion?.plantillas_comunicacion?.solicitud_cliente_publica
      || PLANTILLAS_PREDETERMINADAS.solicitud_cliente_publica;

    const consecutivoTxt = cotGuardada ? cotGuardada.consecutivo : '';
    const consecutivoLineaTxt = cotGuardada ? `🆔 *Cotización N°:* ${cotGuardada.consecutivo}` : '';
    const waAltTxt = (!mismoWa && clienteWa.trim()) ? `\n📱 *WhatsApp alternativo:* ${clienteWa.trim()}` : '';

    const tokens: Record<string, string> = {
      finca: finca.nombre,
      consecutivo: consecutivoTxt,
      consecutivo_linea: consecutivoLineaTxt,
      cliente: clienteNombre.trim() || 'No especificado',
      celular: clienteCelular.trim() || 'No especificado',
      whatsapp: (!mismoWa && clienteWa.trim()) ? clienteWa.trim() : clienteCelular.trim(),
      whatsapp_linea: waAltTxt,
      fechas: fechaInicio && fechaFin ? `del ${fechaInicio} al ${fechaFin}` : 'Por definir',
      fecha_inicio: fechaInicio || 'Por definir',
      fecha_fin: fechaFin || 'Por definir',
      fecha_llegada: fechaInicio || 'Por definir',
      fecha_salida: fechaFin || 'Por definir',
      noches: String(noches),
      noches_plural: noches !== 1 ? 's' : '',
      personas: String(personas),
      alojamiento_total: `$${subtotalAlojamiento.toLocaleString('es-CO')} COP`,
      alimentacion_detalle: alimentacionDetalle,
      costo_alimentacion: `$${costoTotalAlimentacion.toLocaleString('es-CO')} COP`,
      total: `$${totalEstimado.toLocaleString('es-CO')} COP`,
    };

    const msg = renderizarPlantillaPersonalizada(template, tokens);
    const url = `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`;

    return { waMensaje: msg, waUrl: url };
  }, [
    finca, waNumberGlobal, configuracion, cotGuardada, mismoWa, clienteWa,
    clienteNombre, clienteCelular, fechaInicio, fechaFin, noches, personas,
    subtotalAlojamiento, alimentacionDetalle, costoTotalAlimentacion, totalEstimado
  ]);

  // --- Acción principal: Validar y Generar Cotización ---
  const handleGenerarCotizacion = async () => {
    setErrorGuardado(null);

    // Validación obligatoria de Nombre
    if (!clienteNombre.trim() || clienteNombre.trim().length < 2) {
      setErrorGuardado('Por favor ingresa tu nombre completo para vincular tu solicitud.');
      const el = document.getElementById('cotizador-nombre');
      if (el) el.focus();
      return;
    }

    // Validación obligatoria de Celular
    const cleanTel = clienteCelular.replace(/\D/g, '');
    if (!cleanTel || cleanTel.length < 7) {
      setErrorGuardado('Por favor ingresa un número de celular de contacto válido (mínimo 7 a 10 dígitos).');
      const el = document.getElementById('cotizador-celular');
      if (el) el.focus();
      return;
    }

    // Validación de fechas
    if (!fechaInicio || !fechaFin) {
      setErrorGuardado('Por favor selecciona las fechas de llegada y salida en el calendario interactivo.');
      return;
    }

    // Validación de regla operativa de alimentación para grupos pequeños
    if (reglaAplica && !cumpleRegla) {
      const msg =
        configuracion?.regla_alimentacion_mensaje ||
        `Por política de servicio, para grupos de hasta ${maxPersonasRegla} personas es obligatorio seleccionar al menos ${minServiciosRegla} servicios de alimentación (llevas ${totalServicios}). Por favor selecciona los planes correspondientes.`;
      setErrorGuardado(msg);
      return;
    }

    // Si no hay callback de Supabase, abrir WhatsApp directo
    if (!onGuardarCotizacion) {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
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
        fechaInicio,
        fechaFin,
        personas,
        alimentacion: alimentacionTextoResumen,
        menuId: planesSeleccionados[0]?.menuId,
        cantidadServicios: planesSeleccionados.reduce((a, b) => a + b.cantidadServicios, 0) || 1,
        precioBasePp: Number(finca.precio_pp) || 0,
        subtotalAlojamiento,
        costoAlimentacion: costoTotalAlimentacion,
        total: totalEstimado,
      };

      const resultado = await onGuardarCotizacion(datos);

      if (resultado.success && resultado.consecutivo && resultado.cotizacionId) {
        setCotGuardada({ consecutivo: resultado.consecutivo, id: resultado.cotizacionId });

        // Intentar abrir WhatsApp inmediatamente
        try {
          const template = configuracion?.plantillas_comunicacion?.solicitud_cliente_publica
            || PLANTILLAS_PREDETERMINADAS.solicitud_cliente_publica;

          const waNum = (finca.whatsapp || waNumberGlobal || '573176827093').replace(/[^0-9]/g, '');
          const waAltTxt = (!mismoWa && clienteWa.trim()) ? `\n📱 *WhatsApp alternativo:* ${clienteWa.trim()}` : '';

          const tokensExito: Record<string, string> = {
            finca: finca.nombre,
            consecutivo: resultado.consecutivo,
            consecutivo_linea: `🆔 *Cotización N°:* ${resultado.consecutivo}`,
            cliente: clienteNombre.trim(),
            celular: clienteCelular.trim(),
            whatsapp: (!mismoWa && clienteWa.trim()) ? clienteWa.trim() : clienteCelular.trim(),
            whatsapp_linea: waAltTxt,
            fechas: `del ${fechaInicio} al ${fechaFin}`,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            fecha_llegada: fechaInicio,
            fecha_salida: fechaFin,
            noches: String(noches),
            noches_plural: noches !== 1 ? 's' : '',
            personas: String(personas),
            alojamiento_total: `$${subtotalAlojamiento.toLocaleString('es-CO')} COP`,
            alimentacion_detalle: alimentacionDetalle,
            costo_alimentacion: `$${costoTotalAlimentacion.toLocaleString('es-CO')} COP`,
            total: `$${totalEstimado.toLocaleString('es-CO')} COP`,
          };

          const directMsg = renderizarPlantillaPersonalizada(template, tokensExito);
          const directUrl = `https://wa.me/${waNum}?text=${encodeURIComponent(directMsg)}`;
          window.open(directUrl, '_blank', 'noopener,noreferrer');
        } catch {
          // El botón verde queda listo
        }
      } else {
        setErrorGuardado(resultado.error || 'No se pudo registrar la cotización, pero puedes contactarnos directamente por WhatsApp.');
      }
    } finally {
      setGuardandoCot(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {/* 1. Selección básica de fechas y personas */}
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
        <div className="field">
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            <Calendar size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Llegada
          </label>
          <input
            type="date"
            value={fechaInicio}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => onFechaInicioChange(e.target.value)}
          />
        </div>

        <div className="field">
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            <Calendar size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Salida
          </label>
          <input
            type="date"
            value={fechaFin}
            min={fechaInicio || new Date().toISOString().split('T')[0]}
            onChange={e => onFechaFinChange(e.target.value)}
          />
        </div>

        <div className="field">
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            <Users size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Huéspedes
          </label>
          <select
            value={personas}
            onChange={e => onPersonasChange(Number(e.target.value))}
          >
            {Array.from({ length: Math.min(finca.capacidad || 20, 60) }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} persona{i + 1 !== 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Selector múltiple de planes de alimentación complementaria */}
      <MenuSelectorCards
        menus={menus}
        planesSeleccionados={planesSeleccionados}
        soloAlojamiento={soloAlojamiento}
        onToggleSoloAlojamiento={handleToggleSoloAlojamiento}
        onToggleMenu={handleToggleMenu}
        onCambiarServicios={handleCambiarServicios}
        personas={personas}
        reglaAlimentacion={{
          activa: reglaActiva,
          maxPersonas: maxPersonasRegla,
          minServicios: minServiciosRegla,
          mensaje: configuracion?.regla_alimentacion_mensaje,
          aplica: reglaAplica,
          cumple: cumpleRegla,
          totalServicios,
        }}
      />

      {/* 3. Resumen y Desglose de Valores Transparente */}
      <div className="quote-card" style={{ padding: '1rem', borderRadius: 'var(--rad-sm, 10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--primary)' }}>
            <Calculator size={16} /> Resumen de valores de estadía
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <ShieldCheck size={12} style={{ color: 'var(--success)' }} /> Tarifa directa garantizada
          </span>
        </div>

        <div className="quote-row">
          <span className="text-muted">Estadía:</span>
          <span>
            {noches} noche{noches !== 1 ? 's' : ''} × {personas} personas ({noches * personas} estancias)
          </span>
        </div>

        <div className="quote-row">
          <span className="text-muted">
            Alojamiento ({formatCOP(Number(finca.precio_pp) || 0)} /pp noche):
          </span>
          <span style={{ fontWeight: 600 }}>{formatCOP(subtotalAlojamiento)}</span>
        </div>

        {/* Desglose individual de cada menú complementario seleccionado */}
        {!soloAlojamiento && planesSeleccionados.map(p => (
          <div key={p.menuId} className="quote-row" style={{ fontSize: '0.8rem' }}>
            <span className="text-muted" style={{ paddingLeft: '0.5rem' }}>
              • {p.nombre} ({p.cantidadServicios} serv. × {personas} pers.):
            </span>
            <span>+ {formatCOP(p.precioPp * p.cantidadServicios * personas)}</span>
          </div>
        ))}

        {costoTotalAlimentacion > 0 && planesSeleccionados.length > 1 && (
          <div className="quote-row" style={{ fontWeight: 600, color: 'var(--primary)' }}>
            <span>Subtotal alimentación:</span>
            <span>+ {formatCOP(costoTotalAlimentacion)}</span>
          </div>
        )}

        <div className="quote-row quote-total" style={{ marginTop: '0.5rem', paddingTop: '0.65rem', borderTop: '2px dashed var(--border)' }}>
          <div style={{ display: 'grid' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>Total Estimado:</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              Sin cobros sorpresa ni comisiones de plataformas
            </span>
          </div>
          <span style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--primary)' }}>
            {formatCOP(totalEstimado)}
          </span>
        </div>
      </div>

      {/* 4. Datos obligatorios del cliente */}
      <div
        style={{
          background: 'var(--surface-sunken)',
          borderRadius: 'var(--rad-xs, 8px)',
          padding: '1rem',
          display: 'grid',
          gap: '0.75rem',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <User size={15} style={{ color: 'var(--primary)' }} /> Tus datos de reserva
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--danger)', fontWeight: 600 }}>
            * Campos obligatorios
          </span>
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              <User size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> Nombre completo <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="cotizador-nombre"
              type="text"
              placeholder="Ej: Laura Gómez"
              value={clienteNombre}
              onChange={e => setClienteNombre(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              <Phone size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> Celular <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="cotizador-celular"
              type="tel"
              placeholder="Ej: 3101234567"
              value={clienteCelular}
              onChange={e => setClienteCelular(e.target.value)}
              autoComplete="tel"
              required
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
          <span style={{ color: 'var(--text-muted)' }}>El celular anterior también es mi WhatsApp</span>
        </label>

        {/* Campo WhatsApp alternativo */}
        {!mismoWa && (
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>
              <MessageCircle size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> WhatsApp alternativo
            </label>
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

      {/* Alerta de error si falta algún dato */}
      {errorGuardado && (
        <div
          style={{
            padding: '0.65rem 0.9rem',
            borderRadius: 'var(--rad-xs, 6px)',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            fontSize: '0.8rem',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{errorGuardado}</span>
        </div>
      )}

      {/* Badge de éxito con consecutivo */}
      {cotGuardada && (
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: 'var(--rad-xs, 6px)',
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <BadgeCheck size={24} style={{ color: '#22c55e', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#16a34a' }}>
              ✓ Solicitud de cotización registrada con éxito
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Código oficial asignado: <strong style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>{cotGuardada.consecutivo}</strong>.
              Toca el botón a continuación para abrir WhatsApp y confirmar tu separación.
            </div>
          </div>
        </div>
      )}

      {/* Vista previa del mensaje de WhatsApp editable */}
      <div>
        <div className="wa-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MessageCircle size={14} style={{ color: '#25d366' }} /> Previsualización del mensaje para el Administrador:
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            Plantilla oficial sincronizada
          </span>
        </div>
        <div className="wa-bubble" style={{ maxHeight: '180px', overflowY: 'auto' }}>
          {waMensaje}
        </div>
      </div>

      {/* Recordatorio de requisito pendiente de alimentación */}
      {reglaAplica && !cumpleRegla && (
        <div
          style={{
            fontSize: '0.78rem',
            color: '#b45309',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--rad-xs, 6px)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>
            <strong>Requisito pendiente:</strong> Para {personas} personas debes seleccionar al menos {minServiciosRegla} servicios de alimentación (llevas {totalServicios}/{minServiciosRegla}).
          </span>
        </div>
      )}

      {/* Botón principal de acción */}
      {!cotGuardada ? (
        <button
          id="cotizador-btn-generar"
          type="button"
          className="btn wa-btn"
          style={{ width: '100%', marginTop: '0.2rem', opacity: guardandoCot ? 0.75 : 1, padding: '0.85rem' }}
          disabled={guardandoCot}
          onClick={handleGenerarCotizacion}
        >
          {guardandoCot ? (
            <>
              <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              Registrando y generando código...
            </>
          ) : (
            <>
              <MessageCircle size={18} />
              Solicitar cotización por WhatsApp
            </>
          )}
        </button>
      ) : (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn wa-btn"
          style={{ width: '100%', marginTop: '0.2rem', padding: '0.85rem' }}
        >
          <span className="wa-pulse" />
          <MessageCircle size={18} />
          Abrir WhatsApp con código {cotGuardada.consecutivo}
        </a>
      )}
    </div>
  );
};
