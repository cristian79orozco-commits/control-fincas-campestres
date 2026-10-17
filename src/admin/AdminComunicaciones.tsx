import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Send, FileText, CheckCircle, Clock, Copy, Check,
  Download, Users, Trash2, Settings, Phone, BookOpen,
  Search, RotateCcw, Save, Sparkles, Tag, ExternalLink,
  CreditCard, Utensils, Home, AlertCircle, ChevronRight,
  ShieldCheck, ArrowRight, CornerDownRight, X, Eye, Edit3
} from 'lucide-react';
import type {
  Cliente, Finca, Reserva, CotizacionDB, Menu, Pago, TipoComunicacion, Comunicacion, ConfiguracionGeneral
} from '../types';
import { calcularSaldo, desglosarFinanzasReserva } from '../types';
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
  formatearConsecutivoConPrefijo,
  type TipoDocumentoPrefijo
} from '../utils/consecutivos';

interface AdminComunicacionesProps {
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

type TabComunicaciones = 'envio' | 'plantillas' | 'historial' | 'config';

type FaseMensaje = 'fase_1_cotizacion' | 'fase_2_reserva' | 'fase_3_saldos' | 'fase_4_llegada' | 'fase_5_libre';

interface TarjetaTipoMensaje {
  id: TipoComunicacion | 'pedir_abono' | 'cobrar_alimentacion';
  tipoReal: TipoComunicacion;
  titulo: string;
  subtitulo: string;
  fase: FaseMensaje;
  destinatarioCobro: 'dueno' | 'admin' | 'info';
  icono: React.ReactNode;
  prefijoDoc?: TipoDocumentoPrefijo;
}

export const AdminComunicaciones: React.FC<AdminComunicacionesProps> = ({
  currentWaNumber,
  onSaveWaNumber,
  clientes,
  fincas,
  reservas,
  cotizaciones,
  menus,
  comunicaciones,
  onRegistrarComunicacion,
  onLimpiarHistorial,
  configuracion,
  onGuardarConfiguracion,
  showToast,
  expedienteInicial,
  onExpedienteInicialCargado,
}) => {
  const [tabActiva, setTabActiva] = useState<TabComunicaciones>('envio');

  // Expediente seleccionado activo (Cotización o Reserva)
  const [expedienteTipo, setExpedienteTipo] = useState<'cotizacion' | 'reserva' | null>('cotizacion');
  const [cotizacionId, setCotizacionId] = useState<string>('');
  const [reservaId, setReservaId] = useState<string>('');
  const [clienteId, setClienteId] = useState<string>('');
  const [pagoId, setPagoId] = useState<string>('');

  // Búsqueda inteligente de expedientes
  const [busquedaExpediente, setBusquedaExpediente] = useState<string>('');
  const [busquedaAbierta, setBusquedaAbierta] = useState<boolean>(false);

  // Tipo de mensaje seleccionado
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoComunicacion>('cotizacion');
  const [subTipoAccion, setSubTipoAccion] = useState<'normal' | 'pedir_abono' | 'cobrar_alimentacion'>('normal');
  const [faseFiltro, setFaseFiltro] = useState<FaseMensaje>('fase_1_cotizacion');

  // Formulario de envío
  const [telefonoInput, setTelefonoInput] = useState<string>('');
  const [destinatarioNombre, setDestinatarioNombre] = useState<string>('');
  const [mensajeTexto, setMensajeTexto] = useState<string>('');
  const [descargarPdf, setDescargarPdf] = useState<boolean>(true);
  const [copiado, setCopiado] = useState<boolean>(false);
  const [procesando, setProcesando] = useState<boolean>(false);
  const [copiadoBancoDueno, setCopiadoBancoDueno] = useState<boolean>(false);
  const [copiadoBancoAdmin, setCopiadoBancoAdmin] = useState<boolean>(false);

  // Editor de Plantillas en Supabase
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string>('cotizacion');
  const [textoEditorPlantilla, setTextoEditorPlantilla] = useState<string>('');
  const [guardandoPlantilla, setGuardandoPlantilla] = useState<boolean>(false);

  // Configuración de número global
  const [waGlobalInput, setWaGlobalInput] = useState<string>(currentWaNumber);

  // Filtro historial
  const [filtroTipoHistorial, setFiltroTipoHistorial] = useState<string>('todos');

  // ---------------------------------------------------------------------------
  // Referencias a los objetos activos actuales
  // ---------------------------------------------------------------------------
  const reservaActual = useMemo(() => reservas.find(r => r.id === reservaId) || null, [reservas, reservaId]);
  const cotizacionActual = useMemo(() => cotizaciones.find(c => c.id === cotizacionId) || null, [cotizaciones, cotizacionId]);

  const fincaActual = useMemo(() => {
    if (reservaActual) {
      return fincas.find(f => f.id === reservaActual.finca_id) || reservaActual.fincas || null;
    }
    if (cotizacionActual) {
      return fincas.find(f => f.id === cotizacionActual.finca_id) || cotizacionActual.fincas || null;
    }
    return fincas[0] || null;
  }, [reservaActual, cotizacionActual, fincas]);

  const clienteActual = useMemo(() => {
    if (clienteId) {
      const cli = clientes.find(c => c.id === clienteId);
      if (cli) return cli;
    }
    if (reservaActual?.clientes) return reservaActual.clientes;
    if (cotizacionActual?.clientes) return cotizacionActual.clientes;
    return null;
  }, [clienteId, clientes, reservaActual, cotizacionActual]);

  // Consecutivo numérico base unificado (ej: '1001')
  const consecutivoBase = useMemo(() => {
    if (reservaActual?.consecutivo) return formatearConsecutivoSimple(reservaActual.consecutivo);
    if (cotizacionActual?.consecutivo) return formatearConsecutivoSimple(cotizacionActual.consecutivo);
    return '1001';
  }, [reservaActual, cotizacionActual]);

  // ---------------------------------------------------------------------------
  // Desglose Financiero Doble (Finca/Dueño vs Alimentación/Paraíso Terrenal)
  // ---------------------------------------------------------------------------
  const finanzasDoble = useMemo(() => {
    if (reservaActual) {
      const desglose = desglosarFinanzasReserva(reservaActual);
      return {
        esReserva: true,
        // Finca
        subtotalFinca: desglose.subtotalAlojamiento,
        pagadoFinca: desglose.pagadoFinca,
        saldoFincaCheckIn: desglose.saldoFincaCheckIn,
        // Alimentación
        costoAlimentacion: desglose.costoAlimentacion,
        pagadoAlimentacion: desglose.pagadoAlimentacion,
        saldoAlimentacionAdmin: desglose.saldoAlimentacionAdmin,
        // Totales
        totalConsolidado: desglose.totalConsolidado,
        totalRecaudado: desglose.totalRecaudado,
        saldoConsolidado: desglose.saldoConsolidado,
      };
    }

    if (cotizacionActual) {
      const costoAlim = cotizacionActual.costo_alimentacion || 0;
      const subtotalFinca = cotizacionActual.subtotal_alojamiento || Math.max(0, (cotizacionActual.total || 0) - costoAlim);
      const anticipoFinca50 = Math.round(subtotalFinca * 0.5);

      return {
        esReserva: false,
        subtotalFinca,
        pagadoFinca: 0,
        saldoFincaCheckIn: subtotalFinca,
        anticipoFinca50,
        costoAlimentacion: costoAlim,
        pagadoAlimentacion: 0,
        saldoAlimentacionAdmin: costoAlim,
        totalConsolidado: cotizacionActual.total || 0,
        totalRecaudado: 0,
        saldoConsolidado: cotizacionActual.total || 0,
      };
    }

    return null;
  }, [reservaActual, cotizacionActual]);

  // ---------------------------------------------------------------------------
  // Generador de Mensajes según el tipo y subtipo
  // ---------------------------------------------------------------------------
  const construirMensaje = (
    tipo: TipoComunicacion,
    subtipo: 'normal' | 'pedir_abono' | 'cobrar_alimentacion' = subTipoAccion,
    rId = reservaId,
    cId = cotizacionId,
    cliId = clienteId
  ): { msg: string; tel: string; nom: string } => {
    let msg = '';
    let tel = telefonoInput;
    let nom = destinatarioNombre;

    const r = reservas.find(x => x.id === rId) || null;
    const c = cotizaciones.find(x => x.id === cId) || null;
    const cli = (cliId ? clientes.find(x => x.id === cliId) : null) || r?.clientes || c?.clientes;
    const f = (r ? fincas.find(x => x.id === r.finca_id) : null) || (c ? fincas.find(x => x.id === c.finca_id) : null) || r?.fincas || c?.fincas;

    if (cli) {
      nom = `${cli.nombre} ${cli.apellido || ''}`.trim();
      tel = cli.whatsapp || (cli as any).telefono || tel;
    }

    // Caso A: Solicitud de Anticipo Finca (50% a cuenta de propietario)
    if (subtipo === 'pedir_abono' && c) {
      const fObj: any = f;
      const bancosInfo = fObj?.banco_cuenta ? {
        banco: fObj.banco_nombre || 'Bancolombia',
        tipoCuenta: fObj.banco_tipo_cuenta || 'Ahorros',
        cuenta: fObj.banco_cuenta,
        titular: fObj.banco_titular || 'Propietario de la Finca',
        nit: fObj.banco_identificacion || undefined,
      } : {
        banco: configuracion?.banco_nombre || 'Bancolombia',
        tipoCuenta: configuracion?.banco_tipo_cuenta || 'Ahorros',
        cuenta: configuracion?.banco_cuenta || '',
        titular: configuracion?.banco_titular || configuracion?.nombre_empresa,
        nit: configuracion?.nit || undefined,
      };
      msg = plantillaPedirAbonoCotizacion(c, f, cli, bancosInfo, 50);
      return { msg, tel, nom };
    }

    // Caso B: Cobro de Alimentación (a cuenta de la administración Paraíso Terrenal)
    if (subtipo === 'cobrar_alimentacion' && (c || r)) {
      const item = (r || c)!;
      const bancosAdmin = {
        banco: configuracion?.banco_nombre || 'Bancolombia',
        tipoCuenta: configuracion?.banco_tipo_cuenta || 'Ahorros',
        cuenta: configuracion?.banco_cuenta || '',
        titular: configuracion?.banco_titular || 'Administración de Fincas',
        nit: configuracion?.nit || undefined,
      };
      msg = plantillaCobroAlimentacion(item, f, cli, bancosAdmin);
      return { msg, tel, nom };
    }

    // Caso C: Verificar plantilla personalizada en Supabase
    const plantillaCustom = configuracion?.plantillas_comunicacion?.[tipo];
    if (plantillaCustom) {
      const tokens = obtenerTokensParaMensaje({
        tipo,
        cotizacion: c || undefined,
        reserva: r || undefined,
        cliente: cli,
        finca: f,
        consecutivoBase,
        configuracion,
      });
      msg = renderizarPlantillaPersonalizada(plantillaCustom, tokens);
      return { msg, tel, nom };
    }

    // Caso D: Plantillas oficiales del sistema
    switch (tipo) {
      case 'cotizacion': {
        const target = c || cotizaciones[0];
        if (target) {
          msg = plantillaCotizacion(target, target.fincas, target.clientes);
        }
        break;
      }
      case 'separacion': {
        const target = r || reservas[0];
        if (target) {
          msg = plantillaSeparacion(target);
        }
        break;
      }
      case 'abono': {
        const target = r || reservas[0];
        if (target) {
          const pagoTarget = target.pagos?.find(p => p.id === pagoId) || target.pagos?.[0] || {
            id: 'temp',
            reserva_id: target.id,
            tipo: 'abono',
            fecha: new Date().toISOString().split('T')[0],
            valor: target.separacion || 0,
          } as Pago;
          msg = plantillaComprobantePago(target, pagoTarget);
        }
        break;
      }
      case 'estado_cuenta': {
        const target = r || reservas[0];
        if (target) {
          msg = plantillaEstadoCuenta(target);
        }
        break;
      }
      case 'paz_salvo': {
        const target = r || reservas[0];
        if (target) {
          msg = plantillaPazYSalvo(target);
        }
        break;
      }
      case 'menu': {
        const target = c || cotizaciones[0];
        const m = (target && menus.find(x => x.id === target.menu_id)) || menus[0];
        if (m) {
          msg = plantillaPropuestaAlimentacion({
            menu: m,
            cliente: target?.clientes,
            finca: target?.fincas,
            personas: target?.personas || 4,
            cantidadServicios: target?.cantidad_alimentacion || 1,
            config: configuracion,
          });
        }
        break;
      }
      case 'recordatorio_pago': {
        const target = r || reservas[0];
        if (target) {
          msg = plantillaRecordatorioPago(target);
        }
        break;
      }
      case 'bienvenida': {
        const target = r || reservas[0];
        if (target) {
          msg = plantillaBienvenida(target);
        }
        break;
      }
      case 'personalizado': {
        msg = `Hola, *${nom || 'Estimado/a cliente'}* 👋\n\nTe escribimos de *Paraíso Terrenal*.`;
        break;
      }
    }

    return { msg, tel, nom };
  };

  const aplicarMensaje = (
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
  };

  // ---------------------------------------------------------------------------
  // Selección de Expediente inicial si viene por navegación cruzada
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (expedienteInicial) {
      if (expedienteInicial.tipo === 'cotizacion') {
        const c = cotizaciones.find(x => x.id === expedienteInicial.id);
        if (c) {
          setExpedienteTipo('cotizacion');
          setCotizacionId(c.id);
          setReservaId('');
          setFaseFiltro('fase_1_cotizacion');
          setTipoSeleccionado('cotizacion');
          setSubTipoAccion('normal');
          aplicarMensaje('cotizacion', 'normal', '', c.id, c.cliente_id || '');
          showToast(`Cotización #${formatearConsecutivoSimple(c.consecutivo)} cargada en Comunicaciones ✅`, 'success');
        }
      } else if (expedienteInicial.tipo === 'reserva') {
        const r = reservas.find(x => x.id === expedienteInicial.id);
        if (r) {
          setExpedienteTipo('reserva');
          setReservaId(r.id);
          if (r.cotizacion_id) setCotizacionId(r.cotizacion_id);
          const saldo = calcularSaldo(r);
          const sugerido: TipoComunicacion = saldo <= 0 ? 'paz_salvo' : 'estado_cuenta';
          setFaseFiltro('fase_3_saldos');
          setTipoSeleccionado(sugerido);
          setSubTipoAccion('normal');
          aplicarMensaje(sugerido, 'normal', r.id, r.cotizacion_id || '', r.cliente_id || '');
          showToast(`Reserva #${formatearConsecutivoSimple(r.consecutivo)} cargada en Comunicaciones ✅`, 'success');
        }
      }
      onExpedienteInicialCargado?.();
    }
  }, [expedienteInicial]);

  // Inicialización por defecto si no hay nada cargado
  useEffect(() => {
    if (!cotizacionId && !reservaId) {
      if (reservas.length > 0) {
        const r = reservas[0];
        setExpedienteTipo('reserva');
        setReservaId(r.id);
        if (r.cotizacion_id) setCotizacionId(r.cotizacion_id);
        aplicarMensaje('estado_cuenta', 'normal', r.id, r.cotizacion_id || '', r.cliente_id || '');
      } else if (cotizaciones.length > 0) {
        const c = cotizaciones[0];
        setExpedienteTipo('cotizacion');
        setCotizacionId(c.id);
        aplicarMensaje('cotizacion', 'normal', '', c.id, c.cliente_id || '');
      }
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Catálogo de Mensajes por Fases del Negocio (Estructura de Información)
  // ---------------------------------------------------------------------------
  const CATALOGO_MENSAJES: TarjetaTipoMensaje[] = [
    // FASE 1: PROSPECCIÓN Y COTIZACIÓN
    {
      id: 'cotizacion',
      tipoReal: 'cotizacion',
      titulo: 'Cotización Formal de Estancia',
      subtitulo: 'Propuesta completa con desglose de alojamiento y alimentación',
      fase: 'fase_1_cotizacion',
      destinatarioCobro: 'info',
      prefijoDoc: 'cotizacion',
      icono: <FileText size={18} />,
    },
    {
      id: 'pedir_abono',
      tipoReal: 'cotizacion',
      titulo: 'Solicitud de Anticipo (50% Finca)',
      subtitulo: 'Abono para bloquear fechas en la cuenta bancaria del Propietario',
      fase: 'fase_1_cotizacion',
      destinatarioCobro: 'dueno',
      prefijoDoc: 'cotizacion',
      icono: <Home size={18} />,
    },
    {
      id: 'menu',
      tipoReal: 'menu',
      titulo: 'Propuesta Gastronómica de Menú',
      subtitulo: 'Catálogo de platos y costos del servicio de alimentación campestre',
      fase: 'fase_1_cotizacion',
      destinatarioCobro: 'admin',
      prefijoDoc: 'menu',
      icono: <Utensils size={18} />,
    },

    // FASE 2: RESERVAS Y PAGOS
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
      tipoReal: 'cotizacion',
      titulo: 'Cobro de Alimentación (Paraíso Terrenal)',
      subtitulo: 'Solicitud de pago a la cuenta de la administración para insumos y chefs',
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

    // FASE 3: SALDOS Y LIQUIDACIÓN
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

    // FASE 4: EXPERIENCIA Y LLEGADA
    {
      id: 'bienvenida',
      tipoReal: 'bienvenida',
      titulo: 'Instrucciones de Llegada y Bienvenida',
      subtitulo: 'Ubicación, normas de la finca y contacto directo del anfitrión/mayordomo',
      fase: 'fase_4_llegada',
      destinatarioCobro: 'info',
      icono: <Sparkles size={18} />,
    },

    // FASE 5: LIBRE
    {
      id: 'personalizado',
      tipoReal: 'personalizado',
      titulo: 'Mensaje Rápido Personalizado',
      subtitulo: 'Texto libre con soporte de etiquetas y variables dinámicas',
      fase: 'fase_5_libre',
      destinatarioCobro: 'info',
      icono: <MessageCircle size={18} />,
    },
  ];

  const mensajesFiltrados = useMemo(() => {
    return CATALOGO_MENSAJES.filter(m => m.fase === faseFiltro);
  }, [faseFiltro]);

  // Manejador al hacer clic en una tarjeta de tipo de mensaje
  const handleSeleccionarMensajeCard = (tarjeta: TarjetaTipoMensaje) => {
    setTipoSeleccionado(tarjeta.tipoReal);
    if (tarjeta.id === 'pedir_abono') {
      setSubTipoAccion('pedir_abono');
      aplicarMensaje('cotizacion', 'pedir_abono');
    } else if (tarjeta.id === 'cobrar_alimentacion') {
      setSubTipoAccion('cobrar_alimentacion');
      aplicarMensaje('cotizacion', 'cobrar_alimentacion');
    } else {
      setSubTipoAccion('normal');
      aplicarMensaje(tarjeta.tipoReal, 'normal');
    }
  };

  // ---------------------------------------------------------------------------
  // Selección de expediente desde el Smart Finder
  // ---------------------------------------------------------------------------
  const listaResultadosFinder = useMemo(() => {
    const q = busquedaExpediente.toLowerCase().trim();
    if (!q) return [];

    const res: Array<{
      tipo: 'cotizacion' | 'reserva';
      id: string;
      consecutivo: string;
      clienteNombre: string;
      fincaNombre: string;
      fechas: string;
      total: number;
    }> = [];

    // Buscar en cotizaciones
    cotizaciones.forEach(c => {
      const num = formatearConsecutivoSimple(c.consecutivo);
      const cliNom = c.clientes ? `${c.clientes.nombre} ${c.clientes.apellido || ''}`.toLowerCase() : '';
      const fNom = (c.fincas?.nombre || '').toLowerCase();
      const tel = (c.clientes?.whatsapp || '').toLowerCase();

      if (num.includes(q) || cliNom.includes(q) || fNom.includes(q) || tel.includes(q)) {
        res.push({
          tipo: 'cotizacion',
          id: c.id,
          consecutivo: num,
          clienteNombre: c.clientes ? `${c.clientes.nombre} ${c.clientes.apellido || ''}`.trim() : 'Sin cliente',
          fincaNombre: c.fincas?.nombre || 'Finca Campestre',
          fechas: `${formatFecha(c.fecha_inicio)} al ${formatFecha(c.fecha_fin)}`,
          total: c.total || 0,
        });
      }
    });

    // Buscar en reservas
    reservas.forEach(r => {
      const num = formatearConsecutivoSimple(r.consecutivo);
      const cliNom = r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.toLowerCase() : '';
      const fNom = (r.fincas?.nombre || '').toLowerCase();
      const tel = (r.clientes?.whatsapp || '').toLowerCase();

      if (num.includes(q) || cliNom.includes(q) || fNom.includes(q) || tel.includes(q)) {
        res.push({
          tipo: 'reserva',
          id: r.id,
          consecutivo: num,
          clienteNombre: r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.trim() : 'Sin cliente',
          fincaNombre: r.fincas?.nombre || 'Finca Campestre',
          fechas: `${formatFecha(r.fecha_inicio)} al ${formatFecha(r.fecha_fin)}`,
          total: r.valor_total || 0,
        });
      }
    });

    return res.slice(0, 8);
  }, [busquedaExpediente, cotizaciones, reservas]);

  const cargarExpedienteSeleccionado = (item: { tipo: 'cotizacion' | 'reserva'; id: string; consecutivo: string }) => {
    if (item.tipo === 'cotizacion') {
      const c = cotizaciones.find(x => x.id === item.id);
      if (c) {
        setExpedienteTipo('cotizacion');
        setCotizacionId(c.id);
        setReservaId('');
        setFaseFiltro('fase_1_cotizacion');
        setTipoSeleccionado('cotizacion');
        setSubTipoAccion('normal');
        aplicarMensaje('cotizacion', 'normal', '', c.id, c.cliente_id || '');
      }
    } else {
      const r = reservas.find(x => x.id === item.id);
      if (r) {
        setExpedienteTipo('reserva');
        setReservaId(r.id);
        if (r.cotizacion_id) setCotizacionId(r.cotizacion_id);
        const saldo = calcularSaldo(r);
        const sugerido: TipoComunicacion = saldo <= 0 ? 'paz_salvo' : 'estado_cuenta';
        setFaseFiltro('fase_3_saldos');
        setTipoSeleccionado(sugerido);
        setSubTipoAccion('normal');
        aplicarMensaje(sugerido, 'normal', r.id, r.cotizacion_id || '', r.cliente_id || '');
      }
    }
    setBusquedaExpediente('');
    setBusquedaAbierta(false);
    showToast(`Expediente #${item.consecutivo} vinculado con éxito ✅`, 'success');
  };

  // ---------------------------------------------------------------------------
  // Copiado de cuentas bancarias
  // ---------------------------------------------------------------------------
  const copiarCuentaDueno = async () => {
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
  };

  const copiarCuentaAdmin = async () => {
    const texto = `${configuracion?.banco_nombre || 'Bancolombia'} ${configuracion?.banco_tipo_cuenta || 'Ahorros'} N° ${configuracion?.banco_cuenta || ''} a nombre de ${configuracion?.banco_titular || 'Administración Paraíso Terrenal'}${configuracion?.nit ? ` (NIT: ${configuracion.nit})` : ''}`.trim();
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
  };

  // ---------------------------------------------------------------------------
  // Generación y descarga de PDF
  // ---------------------------------------------------------------------------
  const tieneDocumentoPdf = [
    'cotizacion', 'separacion', 'abono', 'estado_cuenta', 'paz_salvo', 'menu'
  ].includes(tipoSeleccionado);

  const ejecutarDescargaPdf = async (): Promise<boolean> => {
    try {
      if (tipoSeleccionado === 'cotizacion' && cotizacionActual) {
        generarDocCotizacion(cotizacionActual, configuracion);
        return true;
      }
      if (tipoSeleccionado === 'separacion' && reservaActual) {
        generarDocSeparacion(reservaActual, configuracion);
        return true;
      }
      if (tipoSeleccionado === 'abono' && reservaActual) {
        const p = reservaActual.pagos?.find(x => x.id === pagoId) || reservaActual.pagos?.[0] || {
          id: 'temp',
          reserva_id: reservaActual.id,
          tipo: 'abono',
          fecha: new Date().toISOString().split('T')[0],
          valor: reservaActual.separacion || 0,
        } as Pago;
        generarComprobantePago(reservaActual, p, configuracion);
        return true;
      }
      if (tipoSeleccionado === 'estado_cuenta' && reservaActual) {
        generarEstadoCuenta(reservaActual, configuracion);
        return true;
      }
      if (tipoSeleccionado === 'paz_salvo' && reservaActual) {
        if (calcularSaldo(reservaActual) > 0) {
          showToast('El saldo debe ser $0 COP para emitir el Paz y Salvo', 'error');
          return false;
        }
        generarPazYSalvo(reservaActual, configuracion);
        return true;
      }
      if (tipoSeleccionado === 'menu') {
        const m = (cotizacionActual && menus.find(x => x.id === cotizacionActual.menu_id)) || menus[0];
        if (m) {
          await generarPropuestaAlimentacion({
            menu: m,
            cliente: cotizacionActual?.clientes,
            finca: cotizacionActual?.fincas,
            personas: cotizacionActual?.personas || 4,
            cantidadServicios: cotizacionActual?.cantidad_alimentacion || 1,
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
  };

  // ---------------------------------------------------------------------------
  // Enviar mensaje a WhatsApp
  // ---------------------------------------------------------------------------
  const handleEnviarWhatsApp = async () => {
    const telLimpio = formatearTelefonoWhatsApp(telefonoInput);
    if (!telLimpio || telLimpio.length < 10) {
      showToast('Por favor introduce un número de WhatsApp válido (ej: 573176827093)', 'error');
      return;
    }

    setProcesando(true);
    try {
      // 1. Si está activo descargar PDF, generarlo
      if (tieneDocumentoPdf && descargarPdf) {
        await ejecutarDescargaPdf();
      }

      // 2. Abrir WhatsApp
      abrirWhatsApp(telLimpio, mensajeTexto);

      // 3. Registrar en historial de auditoría
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

      showToast('WhatsApp abierto y comunicación registrada con éxito ✅', 'success');
    } catch (err: any) {
      showToast(`Error al procesar comunicación: ${err.message}`, 'error');
    } finally {
      setProcesando(false);
    }
  };

  const handleCopiarMensaje = async () => {
    const ok = await copiarAlPortapapeles(mensajeTexto);
    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      showToast('Texto del mensaje copiado al portapapeles 📋', 'success');
    }
  };

  const insertarTokenEnMensaje = (token: string) => {
    setMensajeTexto(prev => `${prev} {{${token}}}`);
    showToast(`Etiqueta {{${token}}} agregada al mensaje`, 'info');
  };

  // ---------------------------------------------------------------------------
  // Gestión de Plantillas en Supabase
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const custom = configuracion?.plantillas_comunicacion?.[plantillaSeleccionada];
    setTextoEditorPlantilla(custom || PLANTILLAS_PREDETERMINADAS[plantillaSeleccionada] || '');
  }, [plantillaSeleccionada, configuracion]);

  const handleGuardarPlantilla = async () => {
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
  };

  const handleRestablecerPlantilla = async () => {
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
  };

  const handleGuardarWaGlobal = () => {
    const cleanNum = waGlobalInput.replace(/[^0-9]/g, '');
    if (cleanNum.length < 10) {
      showToast('Número inválido. Usa formato internacional (ej: 573176827093)', 'error');
      return;
    }
    onSaveWaNumber(cleanNum);
    showToast('Número de WhatsApp corporativo actualizado ✅', 'success');
  };

  const comunicacionesFiltradas = comunicaciones.filter(c =>
    filtroTipoHistorial === 'todos' || c.tipo === filtroTipoHistorial
  );

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* =====================================================================
          1. HEADER DEL MÓDULO CON MICRO-NAVEGACIÓN
          ===================================================================== */}
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#16a34a' }}>
            <MessageCircle size={22} />
            <span>Centro Inteligente de Comunicaciones & WhatsApp</span>
          </div>
          <div className="text-xs text-muted mt-1">
            Gestión centralizada con Cotizaciones y Reservas · Doble balance financiero transparente (Finca / Propietario vs Menús / Administración).
          </div>
        </div>

        {/* Pestañas animadas */}
        <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--surface-2)', padding: '0.25rem', borderRadius: '10px' }}>
          {[
            { id: 'envio', label: 'Centro de Envíos', icon: <Send size={13} /> },
            { id: 'plantillas', label: 'Editor de Plantillas', icon: <BookOpen size={13} /> },
            { id: 'historial', label: `Historial (${comunicaciones.length})`, icon: <Clock size={13} /> },
            { id: 'config', label: 'Configuración', icon: <Settings size={13} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id as TabComunicaciones)}
              className={`btn btn-sm${tabActiva === tab.id ? ' btn-primary' : ''}`}
              style={{
                fontSize: '0.78rem',
                gap: '0.35rem',
                border: 'none',
                background: tabActiva === tab.id ? 'var(--primary)' : 'transparent',
                color: tabActiva === tab.id ? '#ffffff' : 'var(--text-muted)',
                fontWeight: tabActiva === tab.id ? 600 : 500,
                borderRadius: '8px',
                padding: '0.35rem 0.75rem',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================================
          PESTAÑA 1: CENTRO DE ENVÍOS INTELIGENTE
          ===================================================================== */}
      {tabActiva === 'envio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* ─────────────────────────────────────────────────────────────
              A. SMART EXPEDIENTE FINDER & BARRA DE MICROINFORMACIÓN
              ───────────────────────────────────────────────────────────── */}
          <div
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 7%, var(--surface)) 0%, color-mix(in srgb, var(--accent) 5%, var(--surface)) 100%)',
              border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)',
              borderRadius: '16px',
              padding: '1.1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
          >
            {/* Fila de Búsqueda y Chips de Expedientes Recientes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative', flex: 1, minWidth: '280px' }}>
                <Search size={16} style={{ color: 'var(--primary)', position: 'absolute', left: '0.75rem' }} />
                <input
                  type="text"
                  placeholder="Buscar por Consecutivo (#1001), Cliente, Finca o Teléfono…"
                  value={busquedaExpediente}
                  onChange={e => {
                    setBusquedaExpediente(e.target.value);
                    setBusquedaAbierta(true);
                  }}
                  onFocus={() => setBusquedaAbierta(true)}
                  style={{
                    paddingLeft: '2.3rem',
                    fontSize: '0.84rem',
                    borderRadius: '10px',
                    width: '100%',
                    fontWeight: 500,
                    background: 'var(--surface)',
                  }}
                />

                {/* Dropdown flotante con resultados predictivos */}
                <AnimatePresence>
                  {busquedaAbierta && listaResultadosFinder.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      style={{
                        position: 'absolute',
                        top: '110%',
                        left: 0,
                        right: 0,
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
                        zIndex: 50,
                        maxHeight: '260px',
                        overflowY: 'auto',
                        padding: '0.4rem',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.35rem 0.6rem', textTransform: 'uppercase' }}>
                        Expedientes Coincidentes:
                      </div>
                      {listaResultadosFinder.map(item => (
                        <div
                          key={`${item.tipo}-${item.id}`}
                          onClick={() => cargarExpedienteSeleccionado(item)}
                          style={{
                            padding: '0.55rem 0.75rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            fontSize: '0.8rem',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--primary) 10%, transparent)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '0.74rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: item.tipo === 'reserva' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 88, 12, 0.15)',
                                color: item.tipo === 'reserva' ? '#15803d' : '#c2410c',
                              }}
                            >
                              #{item.consecutivo}
                            </span>
                            <strong>{item.clienteNombre}</strong>
                            <span className="text-muted">· {item.fincaNombre}</span>
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCOP(item.total)}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Botón modo libre */}
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setExpedienteTipo(null);
                  setCotizacionId('');
                  setReservaId('');
                  setTipoSeleccionado('personalizado');
                  setFaseFiltro('fase_5_libre');
                  aplicarMensaje('personalizado');
                  showToast('Modo chat libre activado (sin vincular a expediente)', 'info');
                }}
                style={{ fontSize: '0.74rem', padding: '0.4rem 0.75rem', borderRadius: '8px' }}
                title="Escribir mensaje libre sin vincular a ningún expediente"
              >
                💬 Modo Libre / Chat Rápido
              </button>
            </div>

            {/* Chips de acceso directo a últimos expedientes */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.76rem' }}>
              <span className="text-muted" style={{ fontWeight: 600 }}>Cargar reciente:</span>
              {cotizaciones.slice(0, 3).map(c => {
                const num = formatearConsecutivoSimple(c.consecutivo);
                const activo = cotizacionId === c.id && expedienteTipo === 'cotizacion';
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => cargarExpedienteSeleccionado({ tipo: 'cotizacion', id: c.id, consecutivo: num })}
                    style={{
                      border: activo ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: activo ? 'var(--primary)' : 'var(--surface)',
                      color: activo ? '#ffffff' : 'var(--text)',
                      borderRadius: '6px',
                      padding: '0.2rem 0.55rem',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    COT #{num} ({c.clientes?.nombre || 'Cliente'})
                  </button>
                );
              })}
              {reservas.slice(0, 3).map(r => {
                const num = formatearConsecutivoSimple(r.consecutivo);
                const activo = reservaId === r.id && expedienteTipo === 'reserva';
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => cargarExpedienteSeleccionado({ tipo: 'reserva', id: r.id, consecutivo: num })}
                    style={{
                      border: activo ? '1px solid #16a34a' : '1px solid var(--border)',
                      background: activo ? '#16a34a' : 'var(--surface)',
                      color: activo ? '#ffffff' : 'var(--text)',
                      borderRadius: '6px',
                      padding: '0.2rem 0.55rem',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    RES #{num} ({r.clientes?.nombre || 'Cliente'})
                  </button>
                );
              })}
            </div>

            {/* ─────────────────────────────────────────────────────────
                B. RADIOGRAFÍA FINANCIERA DOBLE (MICROINFORMACIÓN EN VIVO)
                ───────────────────────────────────────────────────────── */}
            {finanzasDoble ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
                  gap: '0.85rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid color-mix(in srgb, var(--primary) 15%, transparent)',
                }}
              >
                {/* TARJETA 1: ALOJAMIENTO · PROPIETARIO DE LA FINCA */}
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid rgba(22, 163, 74, 0.25)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#15803d', fontWeight: 700, fontSize: '0.82rem' }}>
                      <Home size={16} />
                      <span>1. ALOJAMIENTO (PROPIETARIO DE LA FINCA)</span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: 'rgba(22, 163, 74, 0.12)',
                        color: '#15803d',
                      }}
                    >
                      Paga al Dueño
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    <span className="text-muted">Valor Finca:</span>
                    <strong>{formatCOP(finanzasDoble.subtotalFinca)}</strong>
                  </div>

                  {finanzasDoble.esReserva ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span className="text-muted">Abonado al Propietario:</span>
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>{formatCOP(finanzasDoble.pagadoFinca)}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                          padding: '0.35rem 0.55rem',
                          borderRadius: '6px',
                          background: finanzasDoble.saldoFincaCheckIn > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.1)',
                          border: finanzasDoble.saldoFincaCheckIn > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(34, 197, 94, 0.3)',
                        }}
                      >
                        <strong style={{ color: finanzasDoble.saldoFincaCheckIn > 0 ? '#b91c1c' : '#15803d' }}>
                          Saldo Check-in (al Dueño):
                        </strong>
                        <strong style={{ color: finanzasDoble.saldoFincaCheckIn > 0 ? '#b91c1c' : '#15803d' }}>
                          {formatCOP(finanzasDoble.saldoFincaCheckIn)}
                        </strong>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem',
                        padding: '0.35rem 0.55rem',
                        borderRadius: '6px',
                        background: 'rgba(22, 163, 74, 0.08)',
                        border: '1px solid rgba(22, 163, 74, 0.2)',
                      }}
                    >
                      <span style={{ color: '#15803d', fontWeight: 600 }}>Anticipo Requerido (50% Finca):</span>
                      <strong style={{ color: '#15803d' }}>{formatCOP(finanzasDoble.anticipoFinca50 || 0)}</strong>
                    </div>
                  )}

                  {/* Datos bancarios del Propietario con botón de copiado */}
                  <div
                    style={{
                      marginTop: '0.2rem',
                      paddingTop: '0.4rem',
                      borderTop: '1px dashed var(--border)',
                      fontSize: '0.74rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span className="text-muted">Cuenta Dueño: </span>
                      <strong>{(fincaActual as any)?.banco_cuenta ? `${(fincaActual as any)?.banco_nombre || 'Bancolombia'} (${(fincaActual as any)?.banco_cuenta})` : 'Sin cuenta registrada'}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={copiarCuentaDueno}
                      className="btn btn-sm"
                      style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', gap: '0.25rem', flexShrink: 0 }}
                      title="Copiar datos bancarios del propietario"
                    >
                      {copiadoBancoDueno ? <Check size={10} style={{ color: '#16a34a' }} /> : <Copy size={10} />}
                      {copiadoBancoDueno ? 'Copiada' : 'Copiar'}
                    </button>
                  </div>
                </div>

                {/* TARJETA 2: ALIMENTACIÓN · ADMINISTRACIÓN PARAÍSO TERRENAL */}
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid rgba(194, 65, 12, 0.25)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c2410c', fontWeight: 700, fontSize: '0.82rem' }}>
                      <Utensils size={16} />
                      <span>2. MENÚS / ALIMENTACIÓN (PARAÍSO TERRENAL)</span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: 'rgba(194, 65, 12, 0.12)',
                        color: '#c2410c',
                      }}
                    >
                      Paga a Paraíso
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    <span className="text-muted">Valor Total Menú:</span>
                    <strong>{formatCOP(finanzasDoble.costoAlimentacion)}</strong>
                  </div>

                  {finanzasDoble.esReserva ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span className="text-muted">Abonado a Paraíso Terrenal:</span>
                        <span style={{ color: '#ea580c', fontWeight: 600 }}>{formatCOP(finanzasDoble.pagadoAlimentacion)}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                          padding: '0.35rem 0.55rem',
                          borderRadius: '6px',
                          background: finanzasDoble.saldoAlimentacionAdmin > 0 ? 'rgba(234, 88, 12, 0.08)' : 'rgba(34, 197, 94, 0.1)',
                          border: finanzasDoble.saldoAlimentacionAdmin > 0 ? '1px solid rgba(234, 88, 12, 0.25)' : '1px solid rgba(34, 197, 94, 0.3)',
                        }}
                      >
                        <strong style={{ color: finanzasDoble.saldoAlimentacionAdmin > 0 ? '#c2410c' : '#15803d' }}>
                          Saldo Menú (a Paraíso Terrenal):
                        </strong>
                        <strong style={{ color: finanzasDoble.saldoAlimentacionAdmin > 0 ? '#c2410c' : '#15803d' }}>
                          {formatCOP(finanzasDoble.saldoAlimentacionAdmin)}
                        </strong>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem',
                        padding: '0.35rem 0.55rem',
                        borderRadius: '6px',
                        background: 'rgba(194, 65, 12, 0.08)',
                        border: '1px solid rgba(194, 65, 12, 0.2)',
                      }}
                    >
                      <span style={{ color: '#c2410c', fontWeight: 600 }}>Cobro de Menú (Paraíso):</span>
                      <strong style={{ color: '#c2410c' }}>{formatCOP(finanzasDoble.costoAlimentacion)}</strong>
                    </div>
                  )}

                  {/* Datos bancarios de Paraíso Terrenal con botón de copiado */}
                  <div
                    style={{
                      marginTop: '0.2rem',
                      paddingTop: '0.4rem',
                      borderTop: '1px dashed var(--border)',
                      fontSize: '0.74rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span className="text-muted">Cuenta Paraíso: </span>
                      <strong>{configuracion?.banco_cuenta ? `${configuracion.banco_nombre || 'Bancolombia'} (${configuracion.banco_cuenta})` : 'Por definir'}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={copiarCuentaAdmin}
                      className="btn btn-sm"
                      style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', gap: '0.25rem', flexShrink: 0 }}
                      title="Copiar datos bancarios de la administración Paraíso Terrenal"
                    >
                      {copiadoBancoAdmin ? <Check size={10} style={{ color: '#16a34a' }} /> : <Copy size={10} />}
                      {copiadoBancoAdmin ? 'Copiada' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                💡 Puedes buscar o seleccionar un expediente de Cotización o Reserva arriba para ver su desglose financiero doble.
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              C. ARQUITECTURA DE MENSAJES POR ETAPAS (CARDS INTERACTIVAS)
              ───────────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={16} style={{ color: '#16a34a' }} />
                <span>Seleccionar Tipo Lógico de Mensaje para el Cliente:</span>
              </div>

              {/* Selector de fase comercial */}
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'fase_1_cotizacion', label: '1. Cotización & Finca' },
                  { id: 'fase_2_reserva', label: '2. Reserva & Abonos' },
                  { id: 'fase_3_saldos', label: '3. Saldos & Paz y Salvo' },
                  { id: 'fase_4_llegada', label: '4. Llegada & Bienvenida' },
                  { id: 'fase_5_libre', label: '5. Libre' },
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFaseFiltro(f.id as FaseMensaje)}
                    className={`btn btn-sm${faseFiltro === f.id ? ' btn-primary' : ''}`}
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      fontWeight: faseFiltro === f.id ? 700 : 500,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid animado de tarjetas de mensajes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.65rem' }}>
              {mensajesFiltrados.map(tarjeta => {
                const esActivo =
                  tipoSeleccionado === tarjeta.tipoReal &&
                  ((tarjeta.id === 'pedir_abono' && subTipoAccion === 'pedir_abono') ||
                   (tarjeta.id === 'cobrar_alimentacion' && subTipoAccion === 'cobrar_alimentacion') ||
                   (tarjeta.id !== 'pedir_abono' && tarjeta.id !== 'cobrar_alimentacion' && subTipoAccion === 'normal'));

                return (
                  <motion.div
                    key={tarjeta.id}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => handleSeleccionarMensajeCard(tarjeta)}
                    style={{
                      border: esActivo ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: esActivo ? 'color-mix(in srgb, var(--primary) 7%, var(--surface))' : 'var(--surface)',
                      borderRadius: '12px',
                      padding: '0.75rem 0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      boxShadow: esActivo ? '0 4px 14px color-mix(in srgb, var(--primary) 20%, transparent)' : 'none',
                      transition: 'border 0.2s ease, box-shadow 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.82rem', color: esActivo ? 'var(--primary)' : 'var(--text)' }}>
                        {tarjeta.icono}
                        <span>{tarjeta.titulo}</span>
                      </div>
                      {tarjeta.destinatarioCobro === 'dueno' && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.15)', color: '#15803d' }}>
                          Dueño
                        </span>
                      )}
                      {tarjeta.destinatarioCobro === 'admin' && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(234, 88, 12, 0.15)', color: '#c2410c' }}>
                          Paraíso
                        </span>
                      )}
                      {tarjeta.destinatarioCobro === 'info' && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(0,0,0,0.06)', color: 'var(--text-muted)' }}>
                          Info
                        </span>
                      )}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.72rem', lineHeight: '1.35' }}>
                      {tarjeta.subtitulo}
                    </div>
                    {tarjeta.prefijoDoc && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.2rem' }}>
                        <span>PDF:</span>
                        <code>{formatearConsecutivoConPrefijo(consecutivoBase, tarjeta.prefijoDoc)}</code>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              D. SIMULADOR INTERACTIVO TIPO WHATSAPP & EDITOR EN VIVO
              ───────────────────────────────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1.25rem',
              alignItems: 'start',
            }}
          >
            {/* COLUMNA 1: EDITOR DE PARÁMETROS Y TEXTO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              
              {/* Destinatario y Celular */}
              <div style={{ background: 'var(--surface)', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'grid', gap: '0.6rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Destinatario:</label>
                    <input
                      type="text"
                      value={destinatarioNombre}
                      onChange={e => setDestinatarioNombre(e.target.value)}
                      placeholder="Nombre del cliente"
                      style={{ fontSize: '0.82rem' }}
                    />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>WhatsApp (con indicativo):</label>
                    <input
                      type="tel"
                      value={telefonoInput}
                      onChange={e => setTelefonoInput(e.target.value)}
                      placeholder="573176827093"
                      style={{ fontSize: '0.82rem', fontWeight: 600 }}
                    />
                  </div>
                </div>

                {/* Banner PDF adjunto */}
                {tieneDocumentoPdf && (
                  <div
                    style={{
                      background: 'rgba(22, 163, 74, 0.08)',
                      border: '1px solid rgba(22, 163, 74, 0.25)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      fontSize: '0.76rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#15803d', fontWeight: 600 }}>
                      <Download size={14} />
                      <span>Documento Oficial ({formatearConsecutivoConPrefijo(consecutivoBase, tipoSeleccionado as TipoDocumentoPrefijo)})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <button
                        type="button"
                        onClick={ejecutarDescargaPdf}
                        className="btn btn-sm"
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                      >
                        <Download size={11} /> Descargar ahora
                      </button>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={descargarPdf}
                          onChange={e => setDescargarPdf(e.target.checked)}
                        />
                        <span>Descargar al enviar</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Editor del mensaje editable con inserción de tokens */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Edit3 size={13} style={{ color: 'var(--primary)' }} />
                    <span>Contenido del mensaje (editable):</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => aplicarMensaje(tipoSeleccionado, subTipoAccion)}
                      title="Regenerar texto desde la plantilla oficial"
                      style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                    >
                      <RotateCcw size={11} /> Restablecer
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={handleCopiarMensaje}
                      style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                    >
                      {copiado ? <><Check size={11} style={{ color: '#16a34a' }} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                    </button>
                  </div>
                </div>

                <textarea
                  rows={14}
                  value={mensajeTexto}
                  onChange={e => setMensajeTexto(e.target.value)}
                  placeholder="El mensaje redactado aparecerá aquí…"
                  style={{
                    fontSize: '0.82rem',
                    lineHeight: '1.45',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    fontFamily: 'inherit',
                    whiteSpace: 'pre-wrap',
                    minHeight: '260px',
                  }}
                />

                {/* Tokens rápidos */}
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Insertar variables dinámicas con 1 clic:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {[
                      'cliente', 'finca', 'consecutivo', 'fechas', 'noches', 'personas',
                      'saldo_finca', 'saldo_alimentacion', 'total', 'cuenta_dueno', 'cuenta_admin'
                    ].map(tk => (
                      <button
                        key={tk}
                        type="button"
                        onClick={() => insertarTokenEnMensaje(tk)}
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface-2)',
                          color: 'var(--text)',
                          cursor: 'pointer',
                        }}
                      >
                        + {`{{${tk}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA 2: PREVIEW INTERACTIVO TIPO WHATSAPP REAL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#15803d' }}>
                <Eye size={14} />
                <span>Simulador en Tiempo Real (Vista del Huésped en WhatsApp):</span>
              </div>

              {/* Mockup de teléfono / chat */}
              <div
                style={{
                  background: '#efeae2',
                  borderRadius: '16px',
                  border: '1px solid #d1d7db',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '440px',
                }}
              >
                {/* Header de WhatsApp */}
                <div
                  style={{
                    background: '#075e54',
                    color: '#ffffff',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#128c7e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    }}
                  >
                    PT
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {destinatarioNombre || 'Cliente Paraíso Terrenal'}
                    </div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>
                      {telefonoInput ? `+${telefonoInput}` : 'En línea'}
                    </div>
                  </div>
                </div>

                {/* Contenedor del mensaje estilo WhatsApp */}
                <div
                  style={{
                    padding: '1rem',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    backgroundImage: 'radial-gradient(rgba(0,0,0,0.04) 1px, transparent 0)',
                    backgroundSize: '16px 16px',
                  }}
                >
                  <div
                    style={{
                      alignSelf: 'flex-start',
                      maxWidth: '92%',
                      background: '#ffffff',
                      borderRadius: '8px 8px 8px 0px',
                      padding: '0.75rem 0.95rem',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                      fontSize: '0.8rem',
                      lineHeight: '1.45',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: '#111b21',
                    }}
                  >
                    {mensajeTexto || 'El mensaje redactado aparecerá aquí en tiempo real…'}
                    <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#667781', marginTop: '0.35rem' }}>
                      {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} ✓✓
                    </div>
                  </div>
                </div>

                {/* Botón Gigante de Envío */}
                <div style={{ padding: '0.85rem', background: '#f0f2f5', borderTop: '1px solid #d1d7db' }}>
                  <button
                    type="button"
                    onClick={handleEnviarWhatsApp}
                    disabled={procesando || !telefonoInput.trim()}
                    style={{
                      width: '100%',
                      background: '#25d366',
                      borderColor: '#25d366',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 211, 102, 0.4)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Send size={18} />
                    {procesando ? 'Procesando y abriendo WhatsApp…' : 'Abrir chat de WhatsApp Oficial'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 2: EDITOR DE PLANTILLAS EN SUPABASE
          ===================================================================== */}
      {tabActiva === 'plantillas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.88rem' }}>
                <BookOpen size={18} style={{ color: 'var(--primary)' }} />
                <span>Personalizar Plantilla Oficial en Supabase:</span>
              </div>
              <select
                value={plantillaSeleccionada}
                onChange={e => setPlantillaSeleccionada(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', minWidth: '240px' }}
              >
                <option value="cotizacion">📄 Cotización Oficial</option>
                <option value="separacion">🎉 Documento de Separación</option>
                <option value="abono">💳 Comprobante de Abono / Pago</option>
                <option value="estado_cuenta">📊 Estado de Cuenta (Doble Balance)</option>
                <option value="paz_salvo">🏅 Certificado de Paz y Salvo</option>
                <option value="menu">🍽️ Propuesta de Menú / Alimentación</option>
                <option value="recordatorio_pago">⏰ Recordatorio Amistoso de Saldo</option>
                <option value="bienvenida">👋 Bienvenida e Instrucciones de Llegada</option>
              </select>
            </div>

            <div className="field">
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cuerpo de la Plantilla:</label>
              <textarea
                rows={12}
                value={textoEditorPlantilla}
                onChange={e => setTextoEditorPlantilla(e.target.value)}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.82rem',
                  lineHeight: '1.45',
                  padding: '0.75rem',
                  borderRadius: '8px',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleRestablecerPlantilla}
                disabled={guardandoPlantilla}
                style={{ fontSize: '0.76rem', color: '#c0392b' }}
              >
                <RotateCcw size={12} /> Restablecer a plantilla oficial
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleGuardarPlantilla}
                  disabled={guardandoPlantilla}
                  style={{ fontSize: '0.78rem', gap: '0.35rem' }}
                >
                  <Save size={13} /> {guardandoPlantilla ? 'Guardando en Supabase…' : 'Guardar en Supabase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 3: HISTORIAL DE COMUNICACIONES
          ===================================================================== */}
      {tabActiva === 'historial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {['todos', 'cotizacion', 'separacion', 'abono', 'estado_cuenta', 'paz_salvo', 'menu', 'recordatorio_pago'].map(t => (
                <button
                  key={t}
                  className={`btn btn-sm${filtroTipoHistorial === t ? ' btn-primary' : ''}`}
                  onClick={() => setFiltroTipoHistorial(t)}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                >
                  {t}
                </button>
              ))}
            </div>

            {onLimpiarHistorial && comunicaciones.length > 0 && (
              <button
                className="btn btn-sm btn-danger"
                onClick={onLimpiarHistorial}
                style={{ fontSize: '0.72rem' }}
              >
                <Trash2 size={12} /> Limpiar registro
              </button>
            )}
          </div>

          <div className="avail-table">
            {comunicacionesFiltradas.length === 0 ? (
              <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '2.5rem' }}>
                No hay comunicaciones registradas aún.
              </p>
            ) : (
              comunicacionesFiltradas.map(c => {
                const fechaStr = c.created_at ? new Date(c.created_at).toLocaleString('es-CO') : '—';
                return (
                  <div key={c.id} className="avail-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.6rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="status-badge s-avail" style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}>
                          {c.tipo}
                        </span>
                        <strong style={{ fontSize: '0.85rem' }}>{c.destinatario}</strong>
                        <span style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 600 }}>
                          +{c.telefono}
                        </span>
                        <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>
                          {fechaStr}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          marginTop: '0.35rem',
                          background: 'var(--surface-2)',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          maxHeight: '70px',
                          overflowY: 'hidden',
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {c.mensaje}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: '0.72rem', gap: '0.3rem', color: '#16a34a', borderColor: '#16a34a' }}
                        onClick={() => abrirWhatsApp(c.telefono, c.mensaje)}
                      >
                        <MessageCircle size={12} /> Reenviar
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}
                        onClick={() => copiarAlPortapapeles(c.mensaje)}
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 4: CONFIGURACIÓN CORPORATIVA
          ===================================================================== */}
      {tabActiva === 'config' && (
        <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="wa-config-row">
            <div className="field" style={{ flex: 1 }}>
              <label>Número WhatsApp Corporativo (Predeterminado)</label>
              <input
                type="tel"
                placeholder="573176827093"
                value={waGlobalInput}
                onChange={e => setWaGlobalInput(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={handleGuardarWaGlobal} style={{ alignSelf: 'end' }}>
              Guardar número
            </button>
          </div>

          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle size={14} /> Número corporativo activo: +{currentWaNumber}
          </div>

          <div style={{ background: 'var(--surface-2)', padding: '0.85rem', borderRadius: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <strong>Reglas del Doble Balance Financiero:</strong>
            <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0, lineHeight: '1.6' }}>
              <li><strong>Finca / Alojamiento:</strong> El abono de separación (50%) y el saldo en el check-in se liquidan directamente con el <em>Propietario de la finca</em>.</li>
              <li><strong>Alimentación / Menús:</strong> El valor total de los menús se liquida en la cuenta bancaria de la <em>Administración de Paraíso Terrenal</em> para suministro de insumos y chefs.</li>
              <li><strong>Consecutivo Único:</strong> Se conserva el mismo número de seguimiento (ej: <code>#1001</code>) adaptando el prefijo del documento emitido (<code>COT-1001</code>, <code>SEP-1001</code>, <code>ABO-1001</code>, <code>SAL-1001</code>, <code>PAZ-1001</code>).</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
