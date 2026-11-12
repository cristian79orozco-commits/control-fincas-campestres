import React, { useEffect, useMemo, useCallback } from 'react';
import {
  FileText, Home, Utensils, CheckCircle, CreditCard, Tag,
  Clock, ShieldCheck, Sparkles, MessageCircle
} from 'lucide-react';
import type {
  Cliente, Finca, Reserva, CotizacionDB, Menu, Pago, TipoComunicacion, Comunicacion,
  ConfiguracionGeneral, MetodoEnvioWhatsApp
} from '../types';
import { calcularSaldo, desglosarFinanzasReserva, desglosarFinanzasCotizacion } from '../types';
import { resolverPlanesAlimentacionDetalle } from '../utils/calcularCotizacion';
import {
  plantillaCotizacion,
  plantillaPedirAbonoCotizacion,
  plantillaCobroAlimentacion,
  plantillaSeparacion,
  plantillaComprobantePago,
  plantillaEstadoCuenta,
  plantillaPazYSalvo,
  plantillaPropuestaAlimentacion,
  plantillaRecordatorioPago,
  plantillaBienvenida,
  abrirWhatsApp,
  copiarAlPortapapeles,
  formatearTelefonoWhatsApp,
  formatCOP,
  formatFecha,
  calcularNoches,
  renderizarPlantillaPersonalizada,
  PLANTILLAS_PREDETERMINADAS,
  obtenerTokensParaMensaje,
} from '../services/whatsapp';
import {
  generarDocSeparacion,
  generarComprobantePago,
  generarEstadoCuenta,
  generarPazYSalvo,
  generarPropuestaAlimentacion,
  generarDocCotizacion,
} from '../services/documentos';
import {
  formatearConsecutivoSimple,
  type TipoDocumentoPrefijo
} from '../utils/consecutivos';
import { getConfiguracionGlobal } from '../services/configuracion';
import { useComunicacionesStore, type FaseMensaje, type TabComunicaciones } from '../store/useComunicacionesStore';

export interface UseComunicacionesControllerParams {
  currentWaNumber: string;
  onSaveWaNumber: (num: string) => void;
  clientes: Cliente[];
  fincas: Finca[];
  reservas: Reserva[];
  cotizaciones: CotizacionDB[];
  menus: Menu[];
  comunicaciones: Comunicacion[];
  onRegistrarComunicacion: (com: Omit<Comunicacion, 'id' | 'created_at'>) => Promise<any>;
  onLimpiarHistorial?: () => void;
  configuracion?: ConfiguracionGeneral;
  onGuardarConfiguracion?: (datos: Partial<ConfiguracionGeneral>) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  expedienteInicial?: { tipo: 'cotizacion' | 'reserva'; id: string } | null;
  onExpedienteInicialCargado?: () => void;
}

export interface TarjetaTipoMensaje {
  id: TipoComunicacion | 'pedir_abono' | 'cobrar_alimentacion' | 'cobrar_alimentacion_cotiz';
  tipoReal: TipoComunicacion;
  titulo: string;
  subtitulo: string;
  fase: FaseMensaje;
  destinatarioCobro: 'dueno' | 'admin' | 'info';
  icono: React.ReactNode;
  prefijoDoc?: TipoDocumentoPrefijo;
}

/**
 * Controller Hook desacoplado para AdminComunicaciones.
 * Separa toda la lógica de construcción de mensajes, plantillas, WhatsApp,
 * generación de PDFs y auditoría, dejando la UI limpia a 60 FPS.
 */
export function useComunicacionesController({
  currentWaNumber,
  onSaveWaNumber,
  clientes = [],
  fincas = [],
  reservas = [],
  cotizaciones = [],
  menus = [],
  comunicaciones = [],
  onRegistrarComunicacion,
  onLimpiarHistorial,
  configuracion,
  onGuardarConfiguracion,
  showToast,
  expedienteInicial,
  onExpedienteInicialCargado,
}: UseComunicacionesControllerParams) {
  // Estado centralizado con Zustand
  const {
    tabActiva,
    setTabActiva,
    faseFiltro,
    setFaseFiltro,
    tipoSeleccionado,
    setTipoSeleccionado,
    subTipoAccion,
    setSubTipoAccion,
    expedienteTipo,
    cotizacionId,
    reservaId,
    clienteId,
    pagoId,
    setExpediente,
    busquedaExpediente,
    setBusquedaExpediente,
    busquedaAbierta,
    setBusquedaAbierta,
    telefonoInput,
    setTelefonoInput,
    destinatarioNombre,
    setDestinatarioNombre,
    mensajeTexto,
    setMensajeTexto,
    descargarPdf,
    setDescargarPdf,
    copiado,
    setCopiado,
    procesando,
    setProcesando,
    copiadoBancoDueno,
    setCopiadoBancoDueno,
    copiadoBancoAdmin,
    setCopiadoBancoAdmin,
    plantillaSeleccionada,
    setPlantillaSeleccionada,
    textoEditorPlantilla,
    setTextoEditorPlantilla,
    guardandoPlantilla,
    setGuardandoPlantilla,
    filtroTipoHistorial,
    setFiltroTipoHistorial,
    waGlobalInput,
    setWaGlobalInput,
    metodoWhatsApp,
    setMetodoWhatsApp,
  } = useComunicacionesStore();

  useEffect(() => {
    setWaGlobalInput(currentWaNumber);
  }, [currentWaNumber, setWaGlobalInput]);

  // ---------------------------------------------------------------------------
  // Referencias a los objetos activos actuales
  // ---------------------------------------------------------------------------
  const reservaActual = useMemo(() => reservas.find(r => r.id === reservaId) || null, [reservas, reservaId]);
  const cotizacionActual = useMemo(() => cotizaciones.find(c => c.id === cotizacionId) || null, [cotizaciones, cotizacionId]);

  // Cotización efectiva vinculada o sintética
  const cotizacionEfectiva = useMemo(() => {
    if (cotizacionActual) return cotizacionActual;
    if (reservaActual) {
      const cVinculada = cotizaciones.find(c => (reservaActual.cotizacion_id && c.id === reservaActual.cotizacion_id) || (reservaActual.consecutivo && formatearConsecutivoSimple(c.consecutivo) === formatearConsecutivoSimple(reservaActual.consecutivo)));
      if (cVinculada) return cVinculada;
      const finRes = desglosarFinanzasReserva(reservaActual, fincas.find(f => f.id === reservaActual.finca_id) || (reservaActual.fincas as any));
      return {
        id: reservaActual.cotizacion_id || reservaActual.id,
        cliente_id: reservaActual.cliente_id,
        finca_id: reservaActual.finca_id,
        fecha_inicio: reservaActual.fecha_inicio,
        fecha_fin: reservaActual.fecha_fin,
        personas: reservaActual.personas,
        noches: calcularNoches(reservaActual.fecha_inicio, reservaActual.fecha_fin),
        total: reservaActual.valor_total,
        costo_alimentacion: reservaActual.costo_alimentacion || 0,
        subtotal_alojamiento: finRes.subtotalAlojamientoBase,
        cantidad_mascotas: finRes.cantidadMascotas,
        costo_mascotas: finRes.costoMascotas,
        notas: reservaActual.observaciones,
        consecutivo: reservaActual.consecutivo,
        estado: 'confirmada' as const,
        clientes: reservaActual.clientes,
        fincas: reservaActual.fincas,
        alimentacion: reservaActual.alimentacion,
        precio_base_pp: 0,
        descuento: 0,
        recargo: 0,
      } as CotizacionDB;
    }
    return cotizaciones[0] || null;
  }, [cotizacionActual, reservaActual, cotizaciones, fincas]);

  // Reserva efectiva vinculada o sintética
  const reservaEfectiva = useMemo(() => {
    if (reservaActual) return reservaActual;
    if (cotizacionActual) {
      const rVinculada = reservas.find(r => r.cotizacion_id === cotizacionActual.id || (cotizacionActual.consecutivo && formatearConsecutivoSimple(r.consecutivo) === formatearConsecutivoSimple(cotizacionActual.consecutivo)));
      if (rVinculada) return rVinculada;
      const finCot = desglosarFinanzasCotizacion(cotizacionActual, fincas.find(f => f.id === cotizacionActual.finca_id) || (cotizacionActual.fincas as any));
      return {
        id: cotizacionActual.id,
        cotizacion_id: cotizacionActual.id,
        consecutivo: cotizacionActual.consecutivo,
        cliente_id: cotizacionActual.cliente_id || '',
        finca_id: cotizacionActual.finca_id,
        fecha_inicio: cotizacionActual.fecha_inicio,
        fecha_fin: cotizacionActual.fecha_fin,
        personas: cotizacionActual.personas,
        noches: cotizacionActual.noches,
        valor_total: finCot.totalCotizado,
        costo_alimentacion: finCot.costoAlimentacion,
        subtotal_alojamiento: finCot.subtotalAlojamientoBase,
        cantidad_mascotas: finCot.cantidadMascotas,
        costo_mascotas: finCot.costoMascotas,
        observaciones: cotizacionActual.notas,
        separacion: finCot.abono50Propietario,
        estado: 'activa' as const,
        clientes: cotizacionActual.clientes,
        fincas: cotizacionActual.fincas,
        alimentacion: cotizacionActual.alimentacion,
        pagos: [
          {
            id: 'abono-inicial',
            reserva_id: cotizacionActual.id,
            tipo: 'abono' as const,
            fecha: new Date().toISOString().split('T')[0],
            valor: finCot.abono50Propietario,
            observacion: 'Abono de separación (50% Finca)'
          }
        ]
      } as Reserva;
    }
    return reservas[0] || null;
  }, [reservaActual, cotizacionActual, reservas, fincas]);

  const fincaActual = useMemo(() => {
    if (expedienteTipo === 'cotizacion' && cotizacionEfectiva) {
      return fincas.find(f => f.id === cotizacionEfectiva.finca_id) || cotizacionEfectiva.fincas || null;
    }
    if (reservaEfectiva) {
      return fincas.find(f => f.id === reservaEfectiva.finca_id) || reservaEfectiva.fincas || null;
    }
    if (cotizacionEfectiva) {
      return fincas.find(f => f.id === cotizacionEfectiva.finca_id) || cotizacionEfectiva.fincas || null;
    }
    return fincas[0] || null;
  }, [expedienteTipo, reservaEfectiva, cotizacionEfectiva, fincas]);

  const clienteActual = useMemo(() => {
    if (expedienteTipo === 'cotizacion' && cotizacionEfectiva?.clientes) {
      return cotizacionEfectiva.clientes;
    }
    if (clienteId) {
      const cli = clientes.find(c => c.id === clienteId);
      if (cli) return cli;
    }
    if (reservaEfectiva?.clientes) return reservaEfectiva.clientes;
    if (cotizacionEfectiva?.clientes) return cotizacionEfectiva.clientes;
    return null;
  }, [expedienteTipo, clienteId, clientes, reservaEfectiva, cotizacionEfectiva]);

  // Consecutivo numérico base unificado
  const consecutivoBase = useMemo(() => {
    if (expedienteTipo === 'cotizacion' && cotizacionEfectiva?.consecutivo) {
      return formatearConsecutivoSimple(cotizacionEfectiva.consecutivo);
    }
    if (expedienteTipo === 'reserva' && reservaEfectiva?.consecutivo) {
      return formatearConsecutivoSimple(reservaEfectiva.consecutivo);
    }
    if (cotizacionEfectiva?.consecutivo) return formatearConsecutivoSimple(cotizacionEfectiva.consecutivo);
    if (reservaEfectiva?.consecutivo) return formatearConsecutivoSimple(reservaEfectiva.consecutivo);
    return '1001';
  }, [expedienteTipo, cotizacionEfectiva, reservaEfectiva]);

  // ---------------------------------------------------------------------------
  // Desglose Financiero Doble (Finca/Dueño + Mascotas vs Alimentación/Paraíso Terrenal)
  // ---------------------------------------------------------------------------
  const finanzasDoble = useMemo(() => {
    if (expedienteTipo === 'cotizacion' && !reservaActual && cotizacionEfectiva) {
      const finCot = desglosarFinanzasCotizacion(cotizacionEfectiva, fincaActual as any);
      return {
        esReserva: false,
        subtotalAlojamientoBase: finCot.subtotalAlojamientoBase,
        cantidadMascotas: finCot.cantidadMascotas,
        costoMascotas: finCot.costoMascotas,
        depositoGarantia: finCot.depositoGarantia,
        subtotalFinca: finCot.totalPropietarioFinca,
        pagadoFinca: 0,
        saldoFincaCheckIn: finCot.totalPropietarioFinca,
        anticipoFinca50: finCot.abono50Propietario,
        costoAlimentacion: finCot.costoAlimentacion,
        pagadoAlimentacion: 0,
        saldoAlimentacionAdmin: finCot.costoAlimentacion,
        totalConsolidado: finCot.totalCotizado,
        totalRecaudado: 0,
        saldoConsolidado: finCot.totalCotizado,
      };
    }

    if (reservaEfectiva) {
      const desglose = desglosarFinanzasReserva(reservaEfectiva, fincaActual as any);
      return {
        esReserva: true,
        subtotalAlojamientoBase: desglose.subtotalAlojamientoBase,
        cantidadMascotas: desglose.cantidadMascotas,
        costoMascotas: desglose.costoMascotas,
        depositoGarantia: desglose.depositoGarantia,
        subtotalFinca: desglose.subtotalAlojamiento,
        pagadoFinca: desglose.pagadoFinca,
        saldoFincaCheckIn: desglose.saldoFincaCheckIn,
        anticipoFinca50: Math.round(desglose.subtotalAlojamiento * 0.5),
        costoAlimentacion: desglose.costoAlimentacion,
        pagadoAlimentacion: desglose.pagadoAlimentacion,
        saldoAlimentacionAdmin: desglose.saldoAlimentacionAdmin,
        totalConsolidado: desglose.totalConsolidado,
        totalRecaudado: desglose.totalRecaudado,
        saldoConsolidado: desglose.saldoConsolidado,
      };
    }

    return null;
  }, [expedienteTipo, reservaActual, reservaEfectiva, cotizacionEfectiva, fincaActual]);

  // ---------------------------------------------------------------------------
  // Generador de Mensajes según el tipo y subtipo
  // ---------------------------------------------------------------------------
  const construirMensaje = useCallback((
    tipo: TipoComunicacion,
    subtipo: 'normal' | 'pedir_abono' | 'cobrar_alimentacion' = subTipoAccion,
    rId = reservaId,
    cId = cotizacionId,
    cliId = clienteId
  ): { msg: string; tel: string; nom: string } => {
    let msg = '';
    let tel = telefonoInput;
    let nom = destinatarioNombre;

    const c = (cId && cId !== cotizacionId ? cotizaciones.find(x => x.id === cId) : null) || cotizacionEfectiva;
    const r = (rId && rId !== reservaId ? reservas.find(x => x.id === rId) : null) || reservaEfectiva;
    const cli = (cliId ? clientes.find(x => x.id === cliId) : null)
      || (expedienteTipo === 'cotizacion' ? c?.clientes : (r?.clientes || c?.clientes));
    
    const fId = (expedienteTipo === 'cotizacion' ? c?.finca_id : (r?.finca_id || c?.finca_id))
      || (c?.fincas as any)?.id || (r?.fincas as any)?.id;
    const fincaCompleta = (fId ? fincas.find(x => x.id === fId) : null)
      || fincaActual
      || (expedienteTipo === 'cotizacion' ? c?.fincas : (r?.fincas || c?.fincas));
    const f = fincaCompleta;

    if (cli) {
      nom = `${cli.nombre} ${cli.apellido || ''}`.trim();
      tel = cli.whatsapp || (cli as any).telefono || tel;
    }

    // Identificar la clave de plantilla centralizada (Sinergia Total Cliente ↔ Administrador)
    let clavePlantilla: string = tipo;
    if (subtipo === 'pedir_abono') {
      clavePlantilla = 'pedir_abono';
    } else if (subtipo === 'cobrar_alimentacion') {
      clavePlantilla = 'cobrar_alimentacion';
    }

    const cfg = configuracion || getConfiguracionGlobal();
    const plantillaCustom = cfg?.plantillas_comunicacion?.[clavePlantilla];
    const plantillaEfectiva = plantillaCustom || PLANTILLAS_PREDETERMINADAS[clavePlantilla];

    if (plantillaEfectiva) {
      const tokens = obtenerTokensParaMensaje({
        tipo: clavePlantilla as any,
        cotizacion: c || undefined,
        reserva: r || undefined,
        cliente: cli,
        finca: f,
        pago: (r?.pagos?.find(p => p.id === pagoId) || r?.pagos?.[0]),
        consecutivoBase,
        configuracion: cfg,
      });
      msg = renderizarPlantillaPersonalizada(plantillaEfectiva, tokens);
      return { msg, tel, nom };
    }

    switch (tipo) {
      case 'cotizacion': {
        if (c) msg = plantillaCotizacion(c, f, cli);
        break;
      }
      case 'separacion': {
        if (r) msg = plantillaSeparacion(r);
        break;
      }
      case 'abono': {
        if (r) {
          const pagoTarget = r.pagos?.find(p => p.id === pagoId) || r.pagos?.[0] || {
            id: 'temp',
            reserva_id: r.id,
            tipo: 'abono',
            fecha: new Date().toISOString().split('T')[0],
            valor: r.separacion || Math.round((r.valor_total || 0) * 0.5),
          } as Pago;
          msg = plantillaComprobantePago(r, pagoTarget);
        }
        break;
      }
      case 'estado_cuenta': {
        if (r) msg = plantillaEstadoCuenta(r);
        break;
      }
      case 'paz_salvo': {
        if (r) msg = plantillaPazYSalvo(r);
        break;
      }
      case 'menu': {
        if (c) {
          const resuelto = resolverPlanesAlimentacionDetalle({
            alimentacionTexto: c.alimentacion,
            costoTotalReal: c.costo_alimentacion,
            menusCatalogo: menus,
            menuPrincipal: (c.menu_id && menus.find(x => x.id === c.menu_id)) || menus[0] || null,
            personasDefault: c.personas || 4,
            serviciosDefault: (c as any)?.cantidad_alimentacion || 1,
          });
          const m = resuelto.items[0]?.menuCatalogo || (c.menu_id && menus.find(x => x.id === c.menu_id)) || menus[0];
          if (m) {
            msg = plantillaPropuestaAlimentacion({
              menu: m,
              menusCatalogo: menus,
              alimentacionTexto: c.alimentacion,
              costoTotalReal: c.costo_alimentacion,
              cliente: cli,
              finca: f,
              personas: c.personas || 4,
              cantidadServicios: (c as any)?.cantidad_alimentacion || 1,
              config: configuracion,
            });
          }
        }
        break;
      }
      case 'recordatorio_pago': {
        if (r) msg = plantillaRecordatorioPago(r);
        break;
      }
      case 'bienvenida': {
        if (r) msg = plantillaBienvenida(r);
        break;
      }
      case 'personalizado': {
        msg = `Hola, *${nom || 'Estimado/a cliente'}* 👋\n\nTe escribimos de *Paraíso Terrenal*.`;
        break;
      }
    }

    return { msg, tel, nom };
  }, [
    subTipoAccion, reservaId, cotizacionId, clienteId, telefonoInput,
    destinatarioNombre, cotizaciones, cotizacionEfectiva, reservas,
    reservaEfectiva, clientes, expedienteTipo, fincas, fincaActual,
    configuracion, consecutivoBase, pagoId, menus
  ]);

  const aplicarMensaje = useCallback((
    tipo: TipoComunicacion,
    subtipo: 'normal' | 'pedir_abono' | 'cobrar_alimentacion' = 'normal',
    rId = reservaId,
    cId = cotizacionId,
    cliId = clienteId
  ) => {
    const { msg, tel, nom } = construirMensaje(tipo, subtipo, rId, cId, cliId);
    setMensajeTexto(msg);
    if (tel) setTelefonoInput(formatearTelefonoWhatsApp(tel));
    if (nom) setDestinatarioNombre(nom);
  }, [construirMensaje, reservaId, cotizacionId, clienteId, setMensajeTexto, setTelefonoInput, setDestinatarioNombre]);

  // ---------------------------------------------------------------------------
  // Selección inicial cruzada
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (expedienteInicial) {
      if (expedienteInicial.tipo === 'cotizacion') {
        const c = cotizaciones.find(x => x.id === expedienteInicial.id);
        if (c) {
          const rAsociada = reservas.find(x => x.cotizacion_id === c.id || (c.consecutivo && x.consecutivo === c.consecutivo));
          setExpediente({
            tipo: 'cotizacion',
            cotizacionId: c.id,
            reservaId: rAsociada ? rAsociada.id : '',
            clienteId: c.cliente_id || (c.clientes as any)?.id || '',
          });
          setFaseFiltro('fase_1_cotizacion');
          setTipoSeleccionado('cotizacion');
          setSubTipoAccion('normal');
          aplicarMensaje('cotizacion', 'normal', rAsociada ? rAsociada.id : '', c.id, c.cliente_id || '');
          showToast(`Cotización #${formatearConsecutivoSimple(c.consecutivo)} cargada en Comunicaciones ✅`, 'success');
        }
      } else if (expedienteInicial.tipo === 'reserva') {
        const r = reservas.find(x => x.id === expedienteInicial.id);
        if (r) {
          const cAsociada = cotizaciones.find(x => (r.cotizacion_id && x.id === r.cotizacion_id) || (r.consecutivo && x.consecutivo === r.consecutivo));
          const saldo = calcularSaldo(r);
          const sugerido: TipoComunicacion = saldo <= 0 ? 'paz_salvo' : 'estado_cuenta';
          setExpediente({
            tipo: 'reserva',
            reservaId: r.id,
            cotizacionId: cAsociada ? cAsociada.id : (r.cotizacion_id || ''),
            clienteId: r.cliente_id || (r.clientes as any)?.id || '',
          });
          setFaseFiltro('fase_3_saldos');
          setTipoSeleccionado(sugerido);
          setSubTipoAccion('normal');
          aplicarMensaje(sugerido, 'normal', r.id, cAsociada ? cAsociada.id : (r.cotizacion_id || ''), r.cliente_id || '');
          showToast(`Reserva #${formatearConsecutivoSimple(r.consecutivo)} cargada en Comunicaciones ✅`, 'success');
        }
      }
      onExpedienteInicialCargado?.();
    }
  }, [expedienteInicial, cotizaciones, reservas, setExpediente, setFaseFiltro, setTipoSeleccionado, setSubTipoAccion, aplicarMensaje, showToast, onExpedienteInicialCargado]);

  // Inicialización por defecto
  useEffect(() => {
    if (!cotizacionId && !reservaId) {
      if (reservas.length > 0) {
        const r = reservas[0];
        const cAsociada = cotizaciones.find(x => (r.cotizacion_id && x.id === r.cotizacion_id) || (r.consecutivo && x.consecutivo === r.consecutivo));
        setExpediente({
          tipo: 'reserva',
          reservaId: r.id,
          cotizacionId: cAsociada ? cAsociada.id : (r.cotizacion_id || ''),
          clienteId: r.cliente_id || (r.clientes as any)?.id || '',
        });
        aplicarMensaje('estado_cuenta', 'normal', r.id, cAsociada ? cAsociada.id : (r.cotizacion_id || ''), r.cliente_id || '');
      } else if (cotizaciones.length > 0) {
        const c = cotizaciones[0];
        const rAsociada = reservas.find(x => x.cotizacion_id === c.id || (c.consecutivo && x.consecutivo === c.consecutivo));
        setExpediente({
          tipo: 'cotizacion',
          cotizacionId: c.id,
          reservaId: rAsociada ? rAsociada.id : '',
          clienteId: c.cliente_id || (c.clientes as any)?.id || '',
        });
        aplicarMensaje('cotizacion', 'normal', rAsociada ? rAsociada.id : '', c.id, c.cliente_id || '');
      }
    }
  }, [cotizacionId, reservaId, reservas, cotizaciones, setExpediente, aplicarMensaje]);

  // ---------------------------------------------------------------------------
  // Catálogo de Mensajes por Fases del Negocio (Sinergia Total Cliente ↔ Administrador)
  // ---------------------------------------------------------------------------
  const CATALOGO_MENSAJES: TarjetaTipoMensaje[] = useMemo(() => [
    {
      id: 'cotizacion',
      tipoReal: 'cotizacion',
      titulo: 'Cotización Formal de Estancia (Finca)',
      subtitulo: 'Propuesta formal exclusiva de la finca (alojamiento, mascotas y depósito si aplica)',
      fase: 'fase_1_cotizacion',
      destinatarioCobro: 'dueno',
      prefijoDoc: 'cotizacion',
      icono: <FileText size={18} />,
    },
    {
      id: 'pedir_abono',
      tipoReal: 'pedir_abono' as any,
      titulo: 'Solicitud de Anticipo (50% Finca)',
      subtitulo: 'Abono del 50% de los valores contratados de la finca para bloquear disponibilidad',
      fase: 'fase_1_cotizacion',
      destinatarioCobro: 'dueno',
      prefijoDoc: 'cotizacion',
      icono: <Home size={18} />,
    },
    {
      id: 'cobrar_alimentacion',
      tipoReal: 'cobrar_alimentacion' as any,
      titulo: 'Cobro de Alimentación (Paraíso Terrenal)',
      subtitulo: 'Solicitud de pago o saldo de menú a la cuenta de la administración para insumos y cocina',
      fase: 'fase_1_cotizacion',
      destinatarioCobro: 'admin',
      prefijoDoc: 'menu',
      icono: <Utensils size={18} />,
    },
    {
      id: 'separacion',
      tipoReal: 'separacion',
      titulo: 'Confirmación Oficial de Separación',
      subtitulo: 'Notifica reserva asegurada y saldo pendiente de finca al check-in',
      fase: 'fase_2_reserva',
      destinatarioCobro: 'dueno',
      prefijoDoc: 'separacion',
      icono: <CheckCircle size={18} />,
    },
    {
      id: 'cobrar_alimentacion',
      tipoReal: 'cobrar_alimentacion' as any,
      titulo: 'Cobro de Alimentación (Paraíso Terrenal)',
      subtitulo: 'Solicitud de pago o saldo de menú a la cuenta de la administración',
      fase: 'fase_2_reserva',
      destinatarioCobro: 'admin',
      prefijoDoc: 'menu',
      icono: <Utensils size={18} />,
    },
    {
      id: 'abono',
      tipoReal: 'abono',
      titulo: 'Comprobante de Abono / Pago',
      subtitulo: 'Certifica la recepción de un pago y actualiza el saldo',
      fase: 'fase_2_reserva',
      destinatarioCobro: 'info',
      prefijoDoc: 'abono',
      icono: <CreditCard size={18} />,
    },
    {
      id: 'estado_cuenta',
      tipoReal: 'estado_cuenta',
      titulo: 'Estado de Cuenta (Doble Balance)',
      subtitulo: 'Desglose transparente: Saldo check-in (dueño) vs Saldo comida (Paraíso)',
      fase: 'fase_3_saldos',
      destinatarioCobro: 'info',
      prefijoDoc: 'estado_cuenta',
      icono: <Tag size={18} />,
    },
    {
      id: 'cobrar_alimentacion',
      tipoReal: 'cobrar_alimentacion' as any,
      titulo: 'Cobro de Alimentación (Paraíso Terrenal)',
      subtitulo: 'Cobro exclusivo del menú a la cuenta de la administración para insumos y cocina',
      fase: 'fase_3_saldos',
      destinatarioCobro: 'admin',
      prefijoDoc: 'menu',
      icono: <Utensils size={18} />,
    },
    {
      id: 'recordatorio_pago',
      tipoReal: 'recordatorio_pago',
      titulo: 'Recordatorio Amistoso de Saldos',
      subtitulo: 'Recordatorio previo a la llegada detallando qué pagar en finca y qué a Paraíso',
      fase: 'fase_3_saldos',
      destinatarioCobro: 'info',
      icono: <Clock size={18} />,
    },
    {
      id: 'paz_salvo',
      tipoReal: 'paz_salvo',
      titulo: 'Certificado de Paz y Salvo',
      subtitulo: 'Emisión oficial cuando los saldos de finca y alimentación están en $0',
      fase: 'fase_3_saldos',
      destinatarioCobro: 'info',
      prefijoDoc: 'paz_salvo',
      icono: <ShieldCheck size={18} />,
    },
    {
      id: 'bienvenida',
      tipoReal: 'bienvenida',
      titulo: 'Instrucciones de Llegada y Bienvenida',
      subtitulo: 'Ubicación, normas de la finca y contacto directo del anfitrión/mayordomo',
      fase: 'fase_4_llegada',
      destinatarioCobro: 'info',
      icono: <Sparkles size={18} />,
    },
    {
      id: 'solicitud_cliente_publica' as any,
      tipoReal: 'solicitud_cliente_publica' as any,
      titulo: 'Cotización Web del Huésped',
      subtitulo: 'Formato recibido cuando el huésped cotiza directamente desde el cotizador público',
      fase: 'fase_5_libre',
      destinatarioCobro: 'info',
      icono: <MessageCircle size={18} />,
    },
    {
      id: 'personalizado',
      tipoReal: 'personalizado',
      titulo: 'Mensaje Rápido Personalizado',
      subtitulo: 'Texto libre con soporte de etiquetas y variables dinámicas',
      fase: 'fase_5_libre',
      destinatarioCobro: 'info',
      icono: <Sparkles size={18} />,
    },
  ], []);

  const mensajesFiltrados = useMemo(() => {
    return CATALOGO_MENSAJES.filter(m => m.fase === faseFiltro);
  }, [CATALOGO_MENSAJES, faseFiltro]);

  const handleSeleccionarMensajeCard = useCallback((tarjeta: TarjetaTipoMensaje) => {
    setTipoSeleccionado(tarjeta.tipoReal);
    if (tarjeta.id === 'pedir_abono') {
      setSubTipoAccion('pedir_abono');
      aplicarMensaje('pedir_abono', 'pedir_abono');
    } else if (tarjeta.id === 'cobrar_alimentacion' || (tarjeta.id as string) === 'cobrar_alimentacion_cotiz') {
      setSubTipoAccion('cobrar_alimentacion');
      aplicarMensaje('cobrar_alimentacion', 'cobrar_alimentacion');
    } else if (tarjeta.id === 'solicitud_cliente_publica') {
      setSubTipoAccion('normal');
      aplicarMensaje('solicitud_cliente_publica', 'normal');
    } else {
      setSubTipoAccion('normal');
      aplicarMensaje(tarjeta.tipoReal, 'normal');
    }
  }, [setTipoSeleccionado, setSubTipoAccion, aplicarMensaje]);

  const handleCambiarFaseTab = useCallback((nuevaFase: FaseMensaje) => {
    setFaseFiltro(nuevaFase);
    const tarjetasDeNuevaFase = CATALOGO_MENSAJES.filter(m => m.fase === nuevaFase);
    const tarjetaCoincidente = tarjetasDeNuevaFase.find(
      t => t.tipoReal === tipoSeleccionado &&
        ((subTipoAccion === 'pedir_abono' && t.id === 'pedir_abono') ||
         (subTipoAccion === 'cobrar_alimentacion' && (t.id === 'cobrar_alimentacion' || t.id === 'cobrar_alimentacion_cotiz')) ||
         (subTipoAccion === 'normal' && t.id !== 'pedir_abono' && t.id !== 'cobrar_alimentacion' && t.id !== 'cobrar_alimentacion_cotiz'))
    );

    if (tarjetaCoincidente) {
      handleSeleccionarMensajeCard(tarjetaCoincidente);
    } else if (tarjetasDeNuevaFase.length > 0) {
      handleSeleccionarMensajeCard(tarjetasDeNuevaFase[0]);
    }
  }, [setFaseFiltro, CATALOGO_MENSAJES, tipoSeleccionado, subTipoAccion, handleSeleccionarMensajeCard]);

  // ---------------------------------------------------------------------------
  // Expedientes Unificados por Consecutivo (1 solo registro por consecutivo con su estado actual)
  // ---------------------------------------------------------------------------
  const expedientesUnificados = useMemo(() => {
    const mapaPorConsecutivo = new Map<string, {
      tipo: 'cotizacion' | 'reserva';
      id: string;
      consecutivo: string;
      estadoActual: string;
      etiquetaPrefijo: 'COT' | 'RES';
      clienteNombre: string;
      fincaNombre: string;
      telefono: string;
      fechas: string;
      total: number;
    }>();

    // 1. Primero registrar todas las Reservas activas/históricas (tienen prioridad de estado sobre su cotización origen)
    reservas.forEach(r => {
      const num = formatearConsecutivoSimple(r.consecutivo);
      const key = num || `res-${r.id}`;
      mapaPorConsecutivo.set(key, {
        tipo: 'reserva',
        id: r.id,
        consecutivo: num,
        estadoActual: r.estado || 'activa',
        etiquetaPrefijo: 'RES',
        clienteNombre: r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.trim() : 'Sin cliente',
        fincaNombre: r.fincas?.nombre || 'Finca Campestre',
        telefono: r.clientes?.whatsapp || r.clientes?.telefono || '',
        fechas: `${formatFecha(r.fecha_inicio)} al ${formatFecha(r.fecha_fin)}`,
        total: r.valor_total || 0,
      });
    });

    // 2. Registrar Cotizaciones únicamente si su consecutivo aún NO se ha convertido en Reserva
    cotizaciones.forEach(c => {
      const num = formatearConsecutivoSimple(c.consecutivo);
      const key = num || `cot-${c.id}`;
      const yaTieneReserva = mapaPorConsecutivo.has(key) || reservas.some(r => r.cotizacion_id === c.id);
      if (!yaTieneReserva) {
        mapaPorConsecutivo.set(key, {
          tipo: 'cotizacion',
          id: c.id,
          consecutivo: num,
          estadoActual: c.estado || 'pendiente',
          etiquetaPrefijo: 'COT',
          clienteNombre: c.clientes ? `${c.clientes.nombre} ${c.clientes.apellido || ''}`.trim() : 'Sin cliente',
          fincaNombre: c.fincas?.nombre || 'Finca Campestre',
          telefono: c.clientes?.whatsapp || (c.clientes as any)?.telefono || '',
          fechas: `${formatFecha(c.fecha_inicio)} al ${formatFecha(c.fecha_fin)}`,
          total: c.total || 0,
        });
      }
    });

    // Ordenar por número de consecutivo descendente (más reciente primero)
    return Array.from(mapaPorConsecutivo.values()).sort((a, b) => {
      const numA = parseInt(a.consecutivo.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.consecutivo.replace(/\D/g, ''), 10) || 0;
      return numB - numA;
    });
  }, [cotizaciones, reservas]);

  const expedientesRecientes = useMemo(() => {
    return expedientesUnificados.slice(0, 6);
  }, [expedientesUnificados]);

  // ---------------------------------------------------------------------------
  // Smart Finder (Sin duplicados de consecutivo)
  // ---------------------------------------------------------------------------
  const listaResultadosFinder = useMemo(() => {
    const q = busquedaExpediente.toLowerCase().trim();
    if (!q) return [];

    return expedientesUnificados.filter(item => {
      const num = item.consecutivo.toLowerCase();
      const cliNom = item.clienteNombre.toLowerCase();
      const fNom = item.fincaNombre.toLowerCase();
      const tel = item.telefono.toLowerCase();
      return num.includes(q) || cliNom.includes(q) || fNom.includes(q) || tel.includes(q);
    }).slice(0, 8);
  }, [busquedaExpediente, expedientesUnificados]);

  const cargarExpedienteSeleccionado = useCallback((item: { tipo: 'cotizacion' | 'reserva'; id: string; consecutivo: string }) => {
    if (item.tipo === 'cotizacion') {
      const c = cotizaciones.find(x => x.id === item.id);
      if (c) {
        const rAsociada = reservas.find(x => x.cotizacion_id === c.id || (c.consecutivo && formatearConsecutivoSimple(x.consecutivo) === formatearConsecutivoSimple(c.consecutivo)));
        if (rAsociada) {
          const saldo = calcularSaldo(rAsociada);
          const sugerido: TipoComunicacion = saldo <= 0 ? 'paz_salvo' : 'estado_cuenta';
          setExpediente({
            tipo: 'reserva',
            reservaId: rAsociada.id,
            cotizacionId: c.id,
            clienteId: rAsociada.cliente_id || c.cliente_id || '',
          });
          setFaseFiltro('fase_3_saldos');
          setTipoSeleccionado(sugerido);
          setSubTipoAccion('normal');
          aplicarMensaje(sugerido, 'normal', rAsociada.id, c.id, rAsociada.cliente_id || c.cliente_id || '');
        } else {
          setExpediente({
            tipo: 'cotizacion',
            cotizacionId: c.id,
            reservaId: '',
            clienteId: c.cliente_id || (c.clientes as any)?.id || '',
          });
          setFaseFiltro('fase_1_cotizacion');
          setTipoSeleccionado('cotizacion');
          setSubTipoAccion('normal');
          aplicarMensaje('cotizacion', 'normal', '', c.id, c.cliente_id || '');
        }
      }
    } else {
      const r = reservas.find(x => x.id === item.id);
      if (r) {
        const cAsociada = cotizaciones.find(x => (r.cotizacion_id && x.id === r.cotizacion_id) || (r.consecutivo && formatearConsecutivoSimple(x.consecutivo) === formatearConsecutivoSimple(r.consecutivo)));
        const saldo = calcularSaldo(r);
        const sugerido: TipoComunicacion = saldo <= 0 ? 'paz_salvo' : 'estado_cuenta';
        setExpediente({
          tipo: 'reserva',
          reservaId: r.id,
          cotizacionId: cAsociada ? cAsociada.id : (r.cotizacion_id || ''),
          clienteId: r.cliente_id || (r.clientes as any)?.id || '',
        });
        setFaseFiltro('fase_3_saldos');
        setTipoSeleccionado(sugerido);
        setSubTipoAccion('normal');
        aplicarMensaje(sugerido, 'normal', r.id, cAsociada ? cAsociada.id : (r.cotizacion_id || ''), r.cliente_id || '');
      }
    }
    setBusquedaExpediente('');
    setBusquedaAbierta(false);
    showToast(`Expediente #${item.consecutivo} vinculado con éxito ✅`, 'success');
  }, [cotizaciones, reservas, setExpediente, setFaseFiltro, setTipoSeleccionado, setSubTipoAccion, aplicarMensaje, setBusquedaExpediente, setBusquedaAbierta, showToast]);

  // ---------------------------------------------------------------------------
  // Copiado de Cuentas
  // ---------------------------------------------------------------------------
  const copiarCuentaDueno = useCallback(async () => {
    const fObj: any = fincaActual;
    const texto = `${fObj?.banco_nombre || 'Bancolombia'} ${fObj?.banco_tipo_cuenta || 'Ahorros'} N° ${fObj?.banco_cuenta || ''} a nombre de ${fObj?.banco_titular || 'Propietario'}${fObj?.banco_identificacion ? ` (ID: ${fObj.banco_identificacion})` : ''}`.trim();
    if (!fObj?.banco_cuenta) {
      showToast('Esta finca aún no tiene configurada una cuenta bancaria del propietario', 'info');
      return;
    }
    const ok = await copiarAlPortapapeles(texto);
    if (ok) {
      setCopiadoBancoDueno(true);
      setTimeout(() => setCopiadoBancoDueno(false), 2000);
      showToast('Cuenta bancaria del propietario copiada al portapapeles 📋', 'success');
    }
  }, [fincaActual, showToast, setCopiadoBancoDueno]);

  const copiarCuentaAdmin = useCallback(async () => {
    const iden = (configuracion as any)?.banco_identificacion;
    const texto = `${configuracion?.banco_nombre || 'Bancolombia'} ${configuracion?.banco_tipo_cuenta || 'Ahorros'} N° ${configuracion?.banco_cuenta || ''} a nombre de ${configuracion?.banco_titular || 'Administración Paraíso Terrenal'}${iden ? ` (NIT: ${iden})` : ''}`.trim();
    if (!configuracion?.banco_cuenta) {
      showToast('No se ha configurado la cuenta bancaria de la administración', 'info');
      return;
    }
    const ok = await copiarAlPortapapeles(texto);
    if (ok) {
      setCopiadoBancoAdmin(true);
      setTimeout(() => setCopiadoBancoAdmin(false), 2000);
      showToast('Cuenta bancaria de Paraíso Terrenal copiada al portapapeles 📋', 'success');
    }
  }, [configuracion, showToast, setCopiadoBancoAdmin]);

  // ---------------------------------------------------------------------------
  // PDF
  // ---------------------------------------------------------------------------
  const tieneDocumentoPdf = useMemo(() => [
    'cotizacion', 'separacion', 'abono', 'estado_cuenta', 'paz_salvo', 'menu'
  ].includes(tipoSeleccionado), [tipoSeleccionado]);

  const ejecutarDescargaPdf = useCallback(async (): Promise<boolean> => {
    try {
      if (subTipoAccion === 'cobrar_alimentacion') {
        const itemActual = (expedienteTipo === 'cotizacion' && cotizacionEfectiva) ? cotizacionEfectiva : (reservaEfectiva || cotizacionEfectiva);
        if (!itemActual) {
          showToast('No hay expediente cargado para generar el documento de alimentación', 'error');
          return false;
        }

        const resuelto = resolverPlanesAlimentacionDetalle({
          alimentacionTexto: itemActual.alimentacion,
          costoTotalReal: itemActual.costo_alimentacion,
          menusCatalogo: menus,
          menuPrincipal: (itemActual.menu_id && menus.find(x => x.id === itemActual.menu_id)) || null,
          personasDefault: itemActual.personas || 4,
          serviciosDefault: (itemActual as any).cantidad_alimentacion || 1,
        });

        const primerItem = resuelto.items[0];
        const cantPersonas = primerItem?.personas || itemActual.personas || 4;
        const cantServ = primerItem?.cantidadServicios || (itemActual as any).cantidad_alimentacion || 1;

        const m = primerItem?.menuCatalogo || (itemActual.menu_id && menus.find(x => x.id === itemActual.menu_id)) || (itemActual.alimentacion && itemActual.alimentacion !== 'Sin alimentación' ? {
          id: itemActual.menu_id || 'cotiz-menu',
          nombre: primerItem?.nombre || itemActual.alimentacion,
          descripcion: primerItem?.descripcion || 'Servicio gastronómico campestre.',
          categoria: (primerItem?.categoria as any) || ('Almuerzo' as const),
          precio_pp: primerItem?.precioPp || (itemActual.costo_alimentacion || 0) / Math.max(1, cantPersonas * cantServ),
          activo: true,
        } : menus[0]);

        const f = fincas.find(x => x.id === itemActual.finca_id) || itemActual.fincas;
        if (m) {
          await generarPropuestaAlimentacion({
            menu: m,
            menusCatalogo: menus,
            alimentacionTexto: itemActual.alimentacion,
            costoTotalReal: itemActual.costo_alimentacion,
            cliente: itemActual.clientes,
            finca: f,
            personas: cantPersonas,
            cantidadServicios: cantServ,
            consecutivo: itemActual.consecutivo,
            tituloDocumento: 'DETALLE Y COBRO DE ALIMENTACIÓN',
            config: configuracion,
          });
          return true;
        }
        return false;
      }
      if (tipoSeleccionado === 'cotizacion' && cotizacionEfectiva) {
        const f = fincas.find(x => x.id === cotizacionEfectiva.finca_id) || (cotizacionEfectiva.fincas as any);
        generarDocCotizacion(cotizacionEfectiva, configuracion, f);
        return true;
      }
      if (tipoSeleccionado === 'separacion' && reservaEfectiva) {
        const f = fincas.find(x => x.id === reservaEfectiva.finca_id) || (reservaEfectiva.fincas as any);
        generarDocSeparacion(reservaEfectiva, configuracion, f);
        return true;
      }
      if (tipoSeleccionado === 'abono' && reservaEfectiva) {
        const p = reservaEfectiva.pagos?.find(x => x.id === pagoId) || reservaEfectiva.pagos?.[0] || {
          id: 'temp',
          reserva_id: reservaEfectiva.id,
          tipo: 'abono',
          fecha: new Date().toISOString().split('T')[0],
          valor: reservaEfectiva.separacion || Math.round((reservaEfectiva.valor_total || 0) * 0.5),
        } as Pago;
        generarComprobantePago(reservaEfectiva, p, configuracion);
        return true;
      }
      if (tipoSeleccionado === 'estado_cuenta' && reservaEfectiva) {
        generarEstadoCuenta(reservaEfectiva, configuracion);
        return true;
      }
      if (tipoSeleccionado === 'paz_salvo' && reservaEfectiva) {
        if (calcularSaldo(reservaEfectiva) > 0) {
          showToast('El saldo debe ser $0 COP para emitir el Paz y Salvo', 'error');
          return false;
        }
        generarPazYSalvo(reservaEfectiva, configuracion);
        return true;
      }
      if (tipoSeleccionado === 'menu') {
        const target = cotizacionEfectiva;
        const f = target ? (fincas.find(x => x.id === target.finca_id) || target.fincas) : null;
        const resuelto = resolverPlanesAlimentacionDetalle({
          alimentacionTexto: target?.alimentacion,
          costoTotalReal: target?.costo_alimentacion,
          menusCatalogo: menus,
          menuPrincipal: (target && menus.find(x => x.id === target.menu_id)) || menus[0] || null,
          personasDefault: target?.personas || 4,
          serviciosDefault: (target as any)?.cantidad_alimentacion || 1,
        });
        const m = resuelto.items[0]?.menuCatalogo || (target && menus.find(x => x.id === target.menu_id)) || menus[0];
        if (m) {
          await generarPropuestaAlimentacion({
            menu: m,
            menusCatalogo: menus,
            alimentacionTexto: target?.alimentacion,
            costoTotalReal: target?.costo_alimentacion,
            cliente: target?.clientes,
            finca: f,
            personas: target?.personas || 4,
            cantidadServicios: (target as any)?.cantidad_alimentacion || 1,
            consecutivo: target?.consecutivo || configuracion?.siguiente_propuesta_menu || 1001,
            tituloDocumento: 'PROPUESTA DE SERVICIO GASTRONÓMICO',
            config: configuracion,
          });
          return true;
        }
      }
      return false;
    } catch (e: any) {
      showToast(`Error generando PDF: ${e.message}`, 'error');
      return false;
    }
  }, [
    subTipoAccion, expedienteTipo, cotizacionEfectiva, reservaEfectiva, showToast,
    menus, fincas, configuracion, tipoSeleccionado, pagoId
  ]);

  // ---------------------------------------------------------------------------
  // Enviar a WhatsApp
  // ---------------------------------------------------------------------------
  const handleEnviarWhatsApp = useCallback(async (metodoForzado?: MetodoEnvioWhatsApp) => {
    const metodoAUsar = metodoForzado || metodoWhatsApp;
    const telLimpio = formatearTelefonoWhatsApp(telefonoInput);
    if (!telLimpio || telLimpio.length < 10) {
      showToast('Por favor introduce un número de WhatsApp válido (ej: 573176827093)', 'error');
      return;
    }

    setProcesando(true);
    try {
      // 1. Invocar apertura de WhatsApp de inmediato con el gesto de usuario activo
      abrirWhatsApp(telLimpio, mensajeTexto, metodoAUsar);

      // 2. Si está configurado generar y descargar el documento PDF, procesarlo
      if (tieneDocumentoPdf && descargarPdf) {
        await ejecutarDescargaPdf();
      }

      await onRegistrarComunicacion({
        cliente_id: clienteActual?.id || clienteId || null,
        reserva_id: reservaActual?.id || null,
        cotizacion_id: cotizacionActual?.id || null,
        tipo: tipoSeleccionado,
        destinatario: destinatarioNombre || clienteActual?.nombre || 'Cliente',
        telefono: telLimpio,
        mensaje: mensajeTexto,
        estado: 'enviado',
      });

      showToast(
        metodoAUsar === 'desktop'
          ? 'WhatsApp Desktop abierto en PC y registrado en auditoría ✅'
          : 'WhatsApp Web abierto en navegador y registrado en auditoría ✅',
        'success'
      );
    } catch (err: any) {
      showToast(`Error al procesar comunicación: ${err.message}`, 'error');
    } finally {
      setProcesando(false);
    }
  }, [
    metodoWhatsApp, telefonoInput, showToast, setProcesando, mensajeTexto,
    tieneDocumentoPdf, descargarPdf, ejecutarDescargaPdf, onRegistrarComunicacion,
    clienteActual, clienteId, reservaActual, cotizacionActual, tipoSeleccionado,
    destinatarioNombre
  ]);

  const handleCopiarMensaje = useCallback(async () => {
    const ok = await copiarAlPortapapeles(mensajeTexto);
    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      showToast('Texto del mensaje copiado al portapapeles 📋', 'success');
    }
  }, [mensajeTexto, setCopiado, showToast]);

  const insertarTokenEnMensaje = useCallback((token: string) => {
    setMensajeTexto(prev => `${prev} {{${token}}}`);
    showToast(`Etiqueta {{${token}}} agregada al mensaje`, 'info');
  }, [setMensajeTexto, showToast]);

  // ---------------------------------------------------------------------------
  // Plantillas Supabase
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const custom = configuracion?.plantillas_comunicacion?.[plantillaSeleccionada];
    setTextoEditorPlantilla(custom || PLANTILLAS_PREDETERMINADAS[plantillaSeleccionada] || '');
  }, [plantillaSeleccionada, configuracion, setTextoEditorPlantilla]);

  const handleGuardarPlantilla = useCallback(async () => {
    if (!onGuardarConfiguracion) {
      showToast('No se dispone de permisos para guardar la configuración', 'error');
      return;
    }

    setGuardandoPlantilla(true);
    const plantillasActuales = { ...(configuracion?.plantillas_comunicacion || {}) };
    plantillasActuales[plantillaSeleccionada] = textoEditorPlantilla;

    const res = await onGuardarConfiguracion({
      plantillas_comunicacion: plantillasActuales,
    });
    setGuardandoPlantilla(false);

    if (res.success) {
      showToast(`Plantilla de ${plantillaSeleccionada} guardada en Supabase ✅`, 'success');
    } else {
      showToast(`Error al guardar plantilla: ${res.error}`, 'error');
    }
  }, [onGuardarConfiguracion, showToast, setGuardandoPlantilla, configuracion, plantillaSeleccionada, textoEditorPlantilla]);

  const handleRestablecerPlantilla = useCallback(async () => {
    if (!onGuardarConfiguracion) return;
    const def = PLANTILLAS_PREDETERMINADAS[plantillaSeleccionada] || '';
    setTextoEditorPlantilla(def);

    const plantillasActuales = { ...(configuracion?.plantillas_comunicacion || {}) };
    delete plantillasActuales[plantillaSeleccionada];

    setGuardandoPlantilla(true);
    const res = await onGuardarConfiguracion({
      plantillas_comunicacion: plantillasActuales,
    });
    setGuardandoPlantilla(false);

    if (res.success) {
      showToast(`Plantilla de ${plantillaSeleccionada} restablecida a la predeterminada 🔄`, 'info');
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  }, [onGuardarConfiguracion, plantillaSeleccionada, setTextoEditorPlantilla, configuracion, setGuardandoPlantilla, showToast]);

  const handleGuardarWaGlobal = useCallback(() => {
    const cleanNum = waGlobalInput.replace(/[^0-9]/g, '');
    if (cleanNum.length < 10) {
      showToast('Número inválido. Usa formato internacional (ej: 573176827093)', 'error');
      return;
    }
    onSaveWaNumber(cleanNum);
    showToast('Número de WhatsApp corporativo actualizado ✅', 'success');
  }, [waGlobalInput, onSaveWaNumber, showToast]);

  const comunicacionesFiltradas = useMemo(() => {
    return comunicaciones.filter(c =>
      filtroTipoHistorial === 'todos' || c.tipo === filtroTipoHistorial
    );
  }, [comunicaciones, filtroTipoHistorial]);

  return {
    // Zustand State
    tabActiva,
    setTabActiva,
    faseFiltro,
    setFaseFiltro,
    tipoSeleccionado,
    setTipoSeleccionado,
    subTipoAccion,
    setSubTipoAccion,
    expedienteTipo,
    cotizacionId,
    reservaId,
    clienteId,
    pagoId,
    setExpediente,
    busquedaExpediente,
    setBusquedaExpediente,
    busquedaAbierta,
    setBusquedaAbierta,
    telefonoInput,
    setTelefonoInput,
    destinatarioNombre,
    setDestinatarioNombre,
    mensajeTexto,
    setMensajeTexto,
    descargarPdf,
    setDescargarPdf,
    copiado,
    procesando,
    copiadoBancoDueno,
    copiadoBancoAdmin,
    plantillaSeleccionada,
    setPlantillaSeleccionada,
    textoEditorPlantilla,
    setTextoEditorPlantilla,
    guardandoPlantilla,
    filtroTipoHistorial,
    setFiltroTipoHistorial,
    waGlobalInput,
    setWaGlobalInput,
    metodoWhatsApp,
    setMetodoWhatsApp,

    // Props & Colecciones
    currentWaNumber,
    clientes,
    fincas,
    reservas,
    cotizaciones,
    menus,
    comunicaciones,
    comunicacionesFiltradas,
    configuracion,
    onRegistrarComunicacion,
    onLimpiarHistorial,
    onGuardarConfiguracion,
    showToast,

    // Entidades Activas Derivadas
    reservaActual,
    cotizacionActual,
    cotizacionEfectiva,
    reservaEfectiva,
    fincaActual,
    clienteActual,
    consecutivoBase,
    finanzasDoble,

    // Catálogo y Búsqueda
    CATALOGO_MENSAJES,
    mensajesFiltrados,
    expedientesUnificados,
    expedientesRecientes,
    listaResultadosFinder,
    cargarExpedienteSeleccionado,
    handleSeleccionarMensajeCard,
    handleCambiarFaseTab,

    // Acciones de WhatsApp y Mensajes
    construirMensaje,
    aplicarMensaje,
    handleEnviarWhatsApp,
    handleCopiarMensaje,
    insertarTokenEnMensaje,
    tieneDocumentoPdf,
    ejecutarDescargaPdf,

    // Cuentas y Plantillas
    copiarCuentaDueno,
    copiarCuentaAdmin,
    handleGuardarPlantilla,
    handleRestablecerPlantilla,
    handleGuardarWaGlobal,
  };
}

export type UseComunicacionesControllerReturn = ReturnType<typeof useComunicacionesController>;
