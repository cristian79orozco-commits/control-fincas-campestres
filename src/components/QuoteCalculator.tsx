import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageCircle, Calculator, Calendar, Users,
  User, Phone, Loader2, BadgeCheck, AlertCircle, ShieldCheck, Dog
} from 'lucide-react';
import type { Finca, Menu, ConfiguracionGeneral } from '../types';
import type { DatosCotizacionPublica, ResultadoCotizacionPublica } from '../hooks/useCotizadorPublico';
import { MenuSelectorCards, PlanAlimentacionSeleccionado } from './MenuSelectorCards';
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
  /** Permite volver al calendario interactivo en móvil en 1 toque */
  onOpenCalendario?: () => void;
}

function formatCOP(v: number) {
  return '$' + (v || 0).toLocaleString('es-CO') + ' COP';
}

export const QuoteCalculator = React.memo<QuoteCalculatorProps>(({
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
  onOpenCalendario,
}) => {
  // Selección múltiple de planes de alimentación complementaria
  const [planesSeleccionados, setPlanesSeleccionados] = useState<PlanAlimentacionSeleccionado[]>([]);
  const [soloAlojamiento, setSoloAlojamiento] = useState(true);
  const [cantidadMascotas, setCantidadMascotas] = useState<number>(0);

  // Capacidad mínima y máxima permitida para esta propiedad
  const minPersonas = Math.max(1, finca.capacidad_minima || 1);
  const maxPersonas = Math.max(minPersonas, finca.capacidad || 20);
  const permiteMascotas = finca.politica_mascotas !== 'no_permitido';
  const valorMascotaUnitario = finca.politica_mascotas === 'con_costo' ? Math.max(0, Number(finca.valor_mascota) || 0) : 0;

  useEffect(() => {
    if (!permiteMascotas && cantidadMascotas > 0) {
      setCantidadMascotas(0);
    }
  }, [permiteMascotas, cantidadMascotas]);

  // Asegurar que el número de huéspedes cumpla con el rango permitido por la finca
  useEffect(() => {
    if (personas < minPersonas) {
      onPersonasChange(minPersonas);
    } else if (personas > maxPersonas) {
      onPersonasChange(maxPersonas);
    }
  }, [minPersonas, maxPersonas, personas, onPersonasChange]);

  // Campos obligatorios de cliente
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteCelular, setClienteCelular] = useState('');
  const [mismoWa, setMismoWa] = useState(true);
  const [clienteWa, setClienteWa] = useState('');

  // Estados de proceso
  const [guardandoCot, setGuardandoCot] = useState(false);
  const [cotGuardada, setCotGuardada] = useState<{ consecutivo: string; id: string } | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [verPreviewWa, setVerPreviewWa] = useState(false);

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
            personasAlimentacion: personas,
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

  const handleCambiarPersonasMenu = (menuId: string, cantidadPersonas: number) => {
    setPlanesSeleccionados(prev =>
      prev.map(p => (p.menuId === menuId ? { ...p, personasAlimentacion: cantidadPersonas } : p))
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
  const {
    noches,
    subtotalAlojamiento,
    costoMascotas,
    subtotalPropietario,
    depositoGarantia,
    costoTotalAlimentacion,
    totalEstimado,
    alimentacionDetalle,
    alimentacionTextoResumen,
    mascotasLineaTexto,
    depositoLineaTexto,
  } = useMemo(() => {
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
    const cantMasc = permiteMascotas ? Math.max(0, cantidadMascotas) : 0;
    const costoMasc = cantMasc * valorMascotaUnitario;
    const subPropietario = subtotalAloja + costoMasc;

    const costoAlim = soloAlojamiento || planesSeleccionados.length === 0
      ? 0
      : planesSeleccionados.reduce((acc, p) => {
          const persPlan = p.personasAlimentacion ?? personas;
          return acc + (p.precioPp * p.cantidadServicios * persPlan);
        }, 0);

    const tot = subtotalAloja + costoMasc + costoAlim;

    let detAlim = '';
    let resAlim = 'Solo alojamiento';

    if (soloAlojamiento || planesSeleccionados.length === 0) {
      detAlim = '🍽️ *Alimentación:* Solo alojamiento (Sin planes adicionales)';
    } else {
      const lineas = planesSeleccionados.map(p => {
        const persPlan = p.personasAlimentacion ?? personas;
        const sub = p.precioPp * p.cantidadServicios * persPlan;
        return `• ${p.nombre} (${p.categoria}): ${p.cantidadServicios} serv. × ${persPlan} pers. ($${p.precioPp.toLocaleString('es-CO')}/pp) = $${sub.toLocaleString('es-CO')} COP`;
      });
      detAlim = `🍽️ *Planes de alimentación complementaria:*\n${lineas.join('\n')}\n*Subtotal alimentación:* $${costoAlim.toLocaleString('es-CO')} COP`;
      resAlim = planesSeleccionados.map(p => {
        const persPlan = p.personasAlimentacion ?? personas;
        return `${p.nombre} (${p.cantidadServicios} serv. × ${persPlan} pers.)`;
      }).join(' + ');
    }

    const lineaMascotas = cantMasc > 0
      ? `🐾 *Mascotas:* ${cantMasc} mascota${cantMasc !== 1 ? 's' : ''} (${costoMasc > 0 ? `$${costoMasc.toLocaleString('es-CO')} COP` : 'Sin costo adicional'})`
      : '';
    const depGarantia = Math.max(0, Number(finca.deposito_garantia) || 0);
    const lineaDeposito = depGarantia > 0
      ? `🛡️ *Depósito reembolsable (Garantía):* $${depGarantia.toLocaleString('es-CO')} COP`
      : '';

    return {
      noches: n,
      subtotalAlojamiento: subtotalAloja,
      costoMascotas: costoMasc,
      subtotalPropietario: subPropietario,
      depositoGarantia: depGarantia,
      costoTotalAlimentacion: costoAlim,
      totalEstimado: tot,
      alimentacionDetalle: detAlim,
      alimentacionTextoResumen: resAlim,
      mascotasLineaTexto: lineaMascotas,
      depositoLineaTexto: lineaDeposito,
    };
  }, [fechaInicio, fechaFin, personas, finca.precio_pp, finca.deposito_garantia, permiteMascotas, cantidadMascotas, valorMascotaUnitario, soloAlojamiento, planesSeleccionados]);

  // Mensaje y Enlace de WhatsApp dinámico con Plantilla Editable
  const { waMensaje, waUrl } = useMemo(() => {
    const waNum = (finca.whatsapp || waNumberGlobal || '573176827093').replace(/[^0-9]/g, '');

    const template = configuracion?.plantillas_comunicacion?.solicitud_cliente_publica
      || PLANTILLAS_PREDETERMINADAS.solicitud_cliente_publica;

    const consecutivoTxt = cotGuardada ? cotGuardada.consecutivo : '';
    const consecutivoLineaTxt = cotGuardada ? `🆔 *Cotización N°:* ${cotGuardada.consecutivo}` : '';
    const waAltTxt = (!mismoWa && clienteWa.trim()) ? `\n📱 *WhatsApp alternativo:* ${clienteWa.trim()}` : '';

    // Si la plantilla personalizada no tiene aún el token {mascotas_linea}, lo integramos junto a {alimentacion_detalle}
    const plantillaTieneTokenMascotas = /\{mascotas_linea\}|\{mascotas_detalle\}/i.test(template);
    const bloquesExtras = [
      (!plantillaTieneTokenMascotas && mascotasLineaTexto) ? mascotasLineaTexto : '',
      alimentacionDetalle,
      depositoLineaTexto,
    ].filter(Boolean);
    const detalleAlimConMascotas = bloquesExtras.join('\n');

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
      mascotas: String(cantidadMascotas),
      costo_mascotas: `$${costoMascotas.toLocaleString('es-CO')} COP`,
      mascotas_linea: mascotasLineaTexto,
      mascotas_detalle: mascotasLineaTexto,
      deposito_garantia: depositoGarantia > 0 ? `$${depositoGarantia.toLocaleString('es-CO')} COP` : '$0 COP',
      deposito_linea: depositoLineaTexto,
      alojamiento_total: costoMascotas > 0
        ? `$${subtotalAlojamiento.toLocaleString('es-CO')} COP + Mascotas $${costoMascotas.toLocaleString('es-CO')} COP (Total Finca: $${subtotalPropietario.toLocaleString('es-CO')} COP)`
        : `$${subtotalAlojamiento.toLocaleString('es-CO')} COP`,
      alimentacion_detalle: detalleAlimConMascotas,
      costo_alimentacion: `$${costoTotalAlimentacion.toLocaleString('es-CO')} COP`,
      total: `$${totalEstimado.toLocaleString('es-CO')} COP`,
    };

    const msg = renderizarPlantillaPersonalizada(template, tokens);
    const url = `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`;

    return { waMensaje: msg, waUrl: url };
  }, [
    finca, waNumberGlobal, configuracion, cotGuardada, mismoWa, clienteWa,
    clienteNombre, clienteCelular, fechaInicio, fechaFin, noches, personas,
    cantidadMascotas, costoMascotas, subtotalPropietario, mascotasLineaTexto,
    depositoGarantia, depositoLineaTexto, subtotalAlojamiento, alimentacionDetalle,
    costoTotalAlimentacion, totalEstimado
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
        cantidadMascotas: permiteMascotas ? cantidadMascotas : 0,
        costoMascotas,
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
          const plantillaTieneTokenMascotas = /\{mascotas_linea\}|\{mascotas_detalle\}/i.test(template);
          const bloquesExtras = [
            (!plantillaTieneTokenMascotas && mascotasLineaTexto) ? mascotasLineaTexto : '',
            alimentacionDetalle,
            depositoLineaTexto,
          ].filter(Boolean);
          const detalleAlimConMascotas = bloquesExtras.join('\n');

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
            mascotas: String(cantidadMascotas),
            costo_mascotas: `$${costoMascotas.toLocaleString('es-CO')} COP`,
            mascotas_linea: mascotasLineaTexto,
            mascotas_detalle: mascotasLineaTexto,
            deposito_garantia: depositoGarantia > 0 ? `$${depositoGarantia.toLocaleString('es-CO')} COP` : '$0 COP',
            deposito_linea: depositoLineaTexto,
            alojamiento_total: costoMascotas > 0
              ? `$${subtotalAlojamiento.toLocaleString('es-CO')} COP + Mascotas $${costoMascotas.toLocaleString('es-CO')} COP (Total Finca: $${subtotalPropietario.toLocaleString('es-CO')} COP)`
              : `$${subtotalAlojamiento.toLocaleString('es-CO')} COP`,
            alimentacion_detalle: detalleAlimConMascotas,
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
    <div style={{ display: 'grid', gap: '0.9rem' }}>
      {/* 1. Selección compacta de fechas, personas y mascotas (2 columnas paralelas incluso en móvil) */}
      <div>
        {onOpenCalendario && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
              1. Configura tu estadía
            </span>
            <button
              type="button"
              onClick={onOpenCalendario}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: 0,
              }}
            >
              <Calendar size={12} /> Ver calendario
            </button>
          </div>
        )}

        <div className="quote-params-grid">
          <div className="field">
            <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>
              <Calendar size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> Llegada
            </label>
            <input
              type="date"
              value={fechaInicio}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => onFechaInicioChange(e.target.value)}
            />
          </div>

          <div className="field">
            <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>
              <Calendar size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> Salida
            </label>
            <input
              type="date"
              value={fechaFin}
              min={fechaInicio || new Date().toISOString().split('T')[0]}
              onChange={e => onFechaFinChange(e.target.value)}
            />
          </div>

          <div className="field">
            <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>
              <Users size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> Huéspedes
            </label>
            <select
              value={personas}
              onChange={e => onPersonasChange(Number(e.target.value))}
            >
              {Array.from({ length: maxPersonas - minPersonas + 1 }).map((_, i) => {
                const val = minPersonas + i;
                return (
                  <option key={val} value={val}>
                    {val} persona{val !== 1 ? 's' : ''}
                  </option>
                );
              })}
            </select>
            {minPersonas > 1 && (
              <span className="text-xs text-muted" style={{ display: 'block', marginTop: '0.15rem', fontSize: '0.66rem' }}>
                Mín. {minPersonas} pers.
              </span>
            )}
          </div>

          {permiteMascotas && (
            <div className="field">
              <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                <Dog size={11} style={{ display: 'inline', verticalAlign: '-1px', color: 'var(--primary)' }} /> Mascotas
              </label>
              <select
                value={cantidadMascotas}
                onChange={e => setCantidadMascotas(Number(e.target.value))}
              >
                <option value={0}>Sin mascotas</option>
                {Array.from({ length: 10 }).map((_, i) => {
                  const val = i + 1;
                  return (
                    <option key={val} value={val}>
                      {val} mascota{val !== 1 ? 's' : ''}
                      {valorMascotaUnitario > 0 ? ` (+$${(val * valorMascotaUnitario).toLocaleString('es-CO')})` : ''}
                    </option>
                  );
                })}
              </select>
              <span className="text-xs text-muted" style={{ display: 'block', marginTop: '0.15rem', fontSize: '0.66rem' }}>
                {valorMascotaUnitario > 0
                  ? `$${valorMascotaUnitario.toLocaleString('es-CO')} c/u`
                  : 'Sin costo'}
              </span>
            </div>
          )}
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
        onCambiarPersonasMenu={handleCambiarPersonasMenu}
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

      {/* 3. Resumen y Desglose de Valores Compacto y Transparente */}
      <div className="quote-card" style={{ padding: '0.85rem 0.95rem', borderRadius: 'var(--rad-sm, 10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.84rem', color: 'var(--primary)' }}>
            <Calculator size={15} /> Resumen de tu estadía
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
            <ShieldCheck size={12} /> Tarifa directa
          </span>
        </div>

        <div className="quote-row" style={{ fontSize: '0.78rem' }}>
          <span className="text-muted">Estadía:</span>
          <span style={{ fontWeight: 600 }}>
            {noches} noche{noches !== 1 ? 's' : ''} × {personas} pers. ({noches * personas} estancias)
          </span>
        </div>

        <div className="quote-row" style={{ fontSize: '0.78rem' }}>
          <span className="text-muted">
            Alojamiento (${(Number(finca.precio_pp) || 0).toLocaleString('es-CO')} /pp):
          </span>
          <span style={{ fontWeight: 700 }}>{formatCOP(subtotalAlojamiento)}</span>
        </div>

        {permiteMascotas && cantidadMascotas > 0 && (
          <div className="quote-row" style={{ fontSize: '0.78rem' }}>
            <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Dog size={12} style={{ color: 'var(--primary)' }} />
              Mascotas ({cantidadMascotas}):
            </span>
            <span style={{ fontWeight: 600, color: costoMascotas > 0 ? 'var(--text-main)' : 'var(--success)' }}>
              {costoMascotas > 0 ? formatCOP(costoMascotas) : 'Sin costo'}
            </span>
          </div>
        )}

        {costoMascotas > 0 && (
          <div className="quote-row" style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--primary)' }}>
            <span>Subtotal Finca:</span>
            <span>{formatCOP(subtotalPropietario)}</span>
          </div>
        )}

        {/* Desglose individual de cada menú complementario seleccionado */}
        {!soloAlojamiento && planesSeleccionados.map(p => {
          const persPlan = p.personasAlimentacion ?? personas;
          return (
            <div key={p.menuId} className="quote-row" style={{ fontSize: '0.76rem' }}>
              <span className="text-muted">
                • {p.nombre} ({p.cantidadServicios}×{persPlan}p):
              </span>
              <span style={{ fontWeight: 600 }}>+ {formatCOP(p.precioPp * p.cantidadServicios * persPlan)}</span>
            </div>
          );
        })}

        {costoTotalAlimentacion > 0 && planesSeleccionados.length > 1 && (
          <div className="quote-row" style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--primary)' }}>
            <span>Subtotal alimentación:</span>
            <span>+ {formatCOP(costoTotalAlimentacion)}</span>
          </div>
        )}

        <div className="quote-row quote-total" style={{ marginTop: '0.4rem', paddingTop: '0.5rem', borderTop: '1.5px dashed var(--border)', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>Total Estimado:</div>
            <div style={{ fontSize: '0.66rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              Sin comisiones de plataformas
            </div>
          </div>
          <span style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCOP(totalEstimado)}
          </span>
        </div>

        {depositoGarantia > 0 && (
          <div className="quote-row" style={{ fontSize: '0.73rem', marginTop: '0.3rem', paddingTop: '0.3rem', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={12} style={{ color: 'var(--primary)' }} /> Depósito reembolsable:
            </span>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
              {formatCOP(depositoGarantia)}
            </span>
          </div>
        )}
      </div>

      {/* 4. Datos obligatorios del cliente */}
      <div
        id="bloque-confirmar-reserva"
        style={{
          background: 'var(--surface-sunken)',
          borderRadius: 'var(--rad-xs, 8px)',
          padding: '0.85rem 0.95rem',
          display: 'grid',
          gap: '0.65rem',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <User size={14} style={{ color: 'var(--primary)' }} /> Tus datos de reserva
          </div>
          <span style={{ fontSize: '0.66rem', color: 'var(--danger)', fontWeight: 600 }}>
            * Obligatorios
          </span>
        </div>

        <div className="form-grid two-cols" style={{ gap: '0.6rem' }}>
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>
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
            <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>
              <Phone size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> Celular / WhatsApp <span style={{ color: 'var(--danger)' }}>*</span>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
          <input
            id="cotizador-mismo-wa"
            type="checkbox"
            checked={mismoWa}
            onChange={e => setMismoWa(e.target.checked)}
            style={{ width: '16px', height: '16px', minHeight: '16px', accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}
          />
          <span style={{ color: 'var(--text-muted)' }}>Este número también es mi WhatsApp</span>
        </label>

        {/* Campo WhatsApp alternativo */}
        {!mismoWa && (
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.72rem' }}>
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
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--rad-xs, 6px)',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            fontSize: '0.78rem',
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
            padding: '0.8rem 0.95rem',
            borderRadius: 'var(--rad-xs, 6px)',
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <BadgeCheck size={22} style={{ color: '#22c55e', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#16a34a' }}>
              ✓ Solicitud de cotización registrada con éxito
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Código asignado: <strong style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>#{cotGuardada.consecutivo}</strong>.
              Toca el botón verde para abrir WhatsApp.
            </div>
          </div>
        </div>
      )}

      {/* Recordatorio de requisito pendiente de alimentación */}
      {reglaAplica && !cumpleRegla && (
        <div
          style={{
            fontSize: '0.76rem',
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

      {/* Botón principal único de acción (Inmediatamente debajo de los datos del cliente) */}
      {!cotGuardada ? (
        <button
          id="cotizador-btn-generar"
          type="button"
          className="btn wa-btn"
          style={{ width: '100%', opacity: guardandoCot ? 0.75 : 1, padding: '0.85rem', fontWeight: 700 }}
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
              Confirmar y Solicitar por WhatsApp
            </>
          )}
        </button>
      ) : (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn wa-btn"
          style={{ width: '100%', padding: '0.85rem', fontWeight: 700 }}
        >
          <span className="wa-pulse" />
          <MessageCircle size={18} />
          Abrir WhatsApp con código #{cotGuardada.consecutivo}
        </a>
      )}

      {/* Vista previa colapsable del mensaje de WhatsApp (Discreta para no alargar el scroll móvil) */}
      <div>
        <button
          type="button"
          onClick={() => setVerPreviewWa(v => !v)}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.2rem 0',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.73rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
            <MessageCircle size={13} style={{ color: '#25d366' }} />
            {verPreviewWa ? 'Ocultar vista previa del mensaje de WhatsApp' : 'Ver vista previa del mensaje que se enviará'}
          </span>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
            {verPreviewWa ? '▲' : '▼'}
          </span>
        </button>

        {verPreviewWa && (
          <div className="wa-bubble" style={{ maxHeight: '160px', overflowY: 'auto', marginTop: '0.35rem', fontSize: '0.76rem' }}>
            {waMensaje}
          </div>
        )}
      </div>
    </div>
  );
});

QuoteCalculator.displayName = 'QuoteCalculator';
