import React, { useEffect, useMemo } from 'react';
import type {
  Cliente,
  Finca,
  Reserva,
  CotizacionDB,
  Menu,
  Pago,
  TipoComunicacion,
  Comunicacion,
  ConfiguracionGeneral,
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
  calcularNoches,
  renderizarPlantillaPersonalizada,
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
} from '../utils/consecutivos';
import { getConfiguracionGlobal } from '../services/configuracion';

import {
  useComunicacionesStore,
  type FaseMensaje,
} from '../store/useComunicacionesStore';

import { ComunicacionesHeader } from './comunicaciones/ComunicacionesHeader';
import { ComunicacionesFinder } from './comunicaciones/ComunicacionesFinder';
import { ComunicacionesBalanceDoble } from './comunicaciones/ComunicacionesBalanceDoble';
import {
  ComunicacionesCatalogo,
  CATALOGO_MENSAJES,
  type TarjetaTipoMensaje,
} from './comunicaciones/ComunicacionesCatalogo';
import { ComunicacionesEditor } from './comunicaciones/ComunicacionesEditor';
import { ComunicacionesSimulator } from './comunicaciones/ComunicacionesSimulator';
import { ComunicacionesCharts } from './comunicaciones/ComunicacionesCharts';
import { ComunicacionesPlantillasAdmin } from './comunicaciones/ComunicacionesPlantillasAdmin';
import { ComunicacionesHistorial } from './comunicaciones/ComunicacionesHistorial';
import { ComunicacionesConfig } from './comunicaciones/ComunicacionesConfig';

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
  onGuardarConfiguracion?: (
    datos: Partial<ConfiguracionGeneral>
  ) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  expedienteInicial?: { tipo: 'cotizacion' | 'reserva'; id: string } | null;
  onExpedienteInicialCargado?: () => void;
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
  // Store de Zustand
  const {
    tabActiva,
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

    telefonoInput,
    setTelefonoInput,
    destinatarioNombre,
    setDestinatarioNombre,
    mensajeTexto,
    setMensajeTexto,
    descargarPdf,
    procesando,
    setProcesando,
    setCopiado,
    copiadoBancoDueno,
    setCopiadoBancoDueno,
    copiadoBancoAdmin,
    setCopiadoBancoAdmin,
  } = useComunicacionesStore();

  // ---------------------------------------------------------------------------
  // Referencias a los objetos activos actuales
  // ---------------------------------------------------------------------------
  const reservaActual = useMemo(
    () => reservas.find((r) => r.id === reservaId) || null,
    [reservas, reservaId]
  );
  const cotizacionActual = useMemo(
    () => cotizaciones.find((c) => c.id === cotizacionId) || null,
    [cotizaciones, cotizacionId]
  );

  // Cotización efectiva vinculada o sintética para garantizar que NUNCA salte a otro cliente
  const cotizacionEfectiva = useMemo(() => {
    if (cotizacionActual) return cotizacionActual;
    if (reservaActual) {
      const cVinculada = cotizaciones.find(
        (c) =>
          (reservaActual.cotizacion_id && c.id === reservaActual.cotizacion_id) ||
          (reservaActual.consecutivo && c.consecutivo === reservaActual.consecutivo)
      );
      if (cVinculada) return cVinculada;
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
        subtotal_alojamiento:
          (reservaActual as any).subtotal_alojamiento ||
          Math.max(
            0,
            (reservaActual.valor_total || 0) - (reservaActual.costo_alimentacion || 0)
          ),
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
  }, [cotizacionActual, reservaActual, cotizaciones]);

  // Reserva efectiva vinculada o sintética
  const reservaEfectiva = useMemo(() => {
    if (reservaActual) return reservaActual;
    if (cotizacionActual) {
      const rVinculada = reservas.find(
        (r) =>
          r.cotizacion_id === cotizacionActual.id ||
          (cotizacionActual.consecutivo && r.consecutivo === cotizacionActual.consecutivo)
      );
      if (rVinculada) return rVinculada;
      const subAloja =
        cotizacionActual.subtotal_alojamiento ||
        Math.max(0, (cotizacionActual.total || 0) - (cotizacionActual.costo_alimentacion || 0));
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
        valor_total: cotizacionActual.total,
        costo_alimentacion: cotizacionActual.costo_alimentacion || 0,
        subtotal_alojamiento: subAloja,
        separacion: Math.round(subAloja * 0.5),
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
            valor: Math.round(subAloja * 0.5),
            observacion: 'Abono de separación (50% Finca)',
          },
        ],
      } as Reserva;
    }
    return reservas[0] || null;
  }, [reservaActual, cotizacionActual, reservas]);

  const fincaActual = useMemo(() => {
    if (expedienteTipo === 'cotizacion' && cotizacionEfectiva) {
      return (
        fincas.find((f) => f.id === cotizacionEfectiva.finca_id) ||
        cotizacionEfectiva.fincas ||
        null
      );
    }
    if (reservaEfectiva) {
      return (
        fincas.find((f) => f.id === reservaEfectiva.finca_id) ||
        reservaEfectiva.fincas ||
        null
      );
    }
    if (cotizacionEfectiva) {
      return (
        fincas.find((f) => f.id === cotizacionEfectiva.finca_id) ||
        cotizacionEfectiva.fincas ||
        null
      );
    }
    return fincas[0] || null;
  }, [expedienteTipo, reservaEfectiva, cotizacionEfectiva, fincas]);

  const clienteActual = useMemo(() => {
    if (expedienteTipo === 'cotizacion' && cotizacionEfectiva?.clientes) {
      return cotizacionEfectiva.clientes;
    }
    if (clienteId) {
      const cli = clientes.find((c) => c.id === clienteId);
      if (cli) return cli;
    }
    if (reservaEfectiva?.clientes) return reservaEfectiva.clientes;
    if (cotizacionEfectiva?.clientes) return cotizacionEfectiva.clientes;
    return null;
  }, [expedienteTipo, clienteId, clientes, reservaEfectiva, cotizacionEfectiva]);

  // Consecutivo numérico base unificado siempre fiel al expediente activo
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
  // Desglose Financiero Doble (Finca vs Menús)
  // ---------------------------------------------------------------------------
  const finanzasDoble = useMemo(() => {
    if (expedienteTipo === 'cotizacion' && cotizacionEfectiva) {
      const costoAlim = cotizacionEfectiva.costo_alimentacion || 0;
      const subtotalFinca =
        cotizacionEfectiva.subtotal_alojamiento ||
        Math.max(0, (cotizacionEfectiva.total || 0) - costoAlim);
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
        totalConsolidado: cotizacionEfectiva.total || 0,
        totalRecaudado: 0,
        saldoConsolidado: cotizacionEfectiva.total || 0,
      };
    }

    if (reservaEfectiva) {
      const desglose = desglosarFinanzasReserva(reservaEfectiva);
      return {
        esReserva: true,
        subtotalFinca: desglose.subtotalAlojamiento,
        pagadoFinca: desglose.pagadoFinca,
        saldoFincaCheckIn: desglose.saldoFincaCheckIn,
        costoAlimentacion: desglose.costoAlimentacion,
        pagadoAlimentacion: desglose.pagadoAlimentacion,
        saldoAlimentacionAdmin: desglose.saldoAlimentacionAdmin,
        totalConsolidado: desglose.totalConsolidado,
        totalRecaudado: desglose.totalRecaudado,
        saldoConsolidado: desglose.saldoConsolidado,
      };
    }

    return null;
  }, [expedienteTipo, reservaEfectiva, cotizacionEfectiva]);

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

    const c =
      (cId && cId !== cotizacionId ? cotizaciones.find((x) => x.id === cId) : null) ||
      cotizacionEfectiva;
    const r =
      (rId && rId !== reservaId ? reservas.find((x) => x.id === rId) : null) ||
      reservaEfectiva;
    const cli =
      (cliId ? clientes.find((x) => x.id === cliId) : null) ||
      (expedienteTipo === 'cotizacion' ? c?.clientes : r?.clientes || c?.clientes);

    const fId =
      (expedienteTipo === 'cotizacion' ? c?.finca_id : r?.finca_id || c?.finca_id) ||
      (c?.fincas as any)?.id ||
      (r?.fincas as any)?.id;
    const fincaCompleta =
      (fId ? fincas.find((x) => x.id === fId) : null) ||
      fincaActual ||
      (expedienteTipo === 'cotizacion' ? c?.fincas : r?.fincas || c?.fincas);
    const f = fincaCompleta;

    if (cli) {
      nom = `${cli.nombre} ${cli.apellido || ''}`.trim();
      tel = cli.whatsapp || (cli as any).telefono || tel;
    }

    // Caso A: Solicitud de Anticipo Finca (50% a cuenta del dueño)
    if (subtipo === 'pedir_abono' && c) {
      const fObj: any = f;
      const bancosInfo = fObj?.banco_cuenta
        ? {
            banco: fObj.banco_nombre || 'Bancolombia',
            tipoCuenta: fObj.banco_tipo_cuenta || 'Ahorros',
            cuenta: fObj.banco_cuenta,
            titular: fObj.banco_titular || 'Propietario de la Finca',
            nit: fObj.banco_identificacion || undefined,
          }
        : null;
      msg = plantillaPedirAbonoCotizacion(c, f, cli, bancosInfo, 50);
      return { msg, tel, nom };
    }

    // Caso B: Cobro de Alimentación (cuenta de la administración Paraíso Terrenal)
    if (subtipo === 'cobrar_alimentacion') {
      const item = (expedienteTipo === 'cotizacion' && c) ? c : r || c;
      if (item) {
        const cfg = configuracion || getConfiguracionGlobal();
        const iden = (cfg as any)?.banco_identificacion
          ? (cfg as any).banco_identificacion.trim()
          : undefined;
        const bancosAdmin = cfg?.banco_cuenta
          ? {
              banco: cfg.banco_nombre || 'Bancolombia',
              tipoCuenta: cfg.banco_tipo_cuenta || 'Ahorros',
              cuenta: cfg.banco_cuenta,
              titular: cfg.banco_titular || 'Administración Paraíso Terrenal',
              nit: iden || undefined,
            }
          : null;
        msg = plantillaCobroAlimentacion(item, f, cli, bancosAdmin);
        return { msg, tel, nom };
      }
    }

    // Caso C: Plantilla personalizada en Supabase
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

    // Caso D: Plantillas oficiales predeterminadas
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
          const pagoTarget =
            r.pagos?.find((p) => p.id === pagoId) ||
            r.pagos?.[0] ||
            ({
              id: 'temp',
              reserva_id: r.id,
              tipo: 'abono',
              fecha: new Date().toISOString().split('T')[0],
              valor: r.separacion || Math.round((r.valor_total || 0) * 0.5),
            } as Pago);
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
          const m = (c.menu_id && menus.find((x) => x.id === c.menu_id)) || menus[0];
          if (m) {
            msg = plantillaPropuestaAlimentacion({
              menu: m,
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
  // Manejo de Expediente Inicial Cruzado
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (expedienteInicial) {
      if (expedienteInicial.tipo === 'cotizacion') {
        const c = cotizaciones.find((x) => x.id === expedienteInicial.id);
        if (c) {
          const rAsociada = reservas.find(
            (x) =>
              x.cotizacion_id === c.id ||
              (c.consecutivo && x.consecutivo === c.consecutivo)
          );
          setExpediente({
            tipo: 'cotizacion',
            cotizacionId: c.id,
            reservaId: rAsociada ? rAsociada.id : '',
            clienteId: c.cliente_id || (c.clientes as any)?.id || '',
          });
          setFaseFiltro('fase_1_cotizacion');
          setTipoSeleccionado('cotizacion');
          setSubTipoAccion('normal');
          aplicarMensaje(
            'cotizacion',
            'normal',
            rAsociada ? rAsociada.id : '',
            c.id,
            c.cliente_id || ''
          );
          showToast(
            `Cotización #${formatearConsecutivoSimple(c.consecutivo)} cargada en Comunicaciones ✅`,
            'success'
          );
        }
      } else if (expedienteInicial.tipo === 'reserva') {
        const r = reservas.find((x) => x.id === expedienteInicial.id);
        if (r) {
          const cAsociada = cotizaciones.find(
            (x) =>
              (r.cotizacion_id && x.id === r.cotizacion_id) ||
              (r.consecutivo && x.consecutivo === r.consecutivo)
          );
          const saldo = calcularSaldo(r);
          const sugerido: TipoComunicacion = saldo <= 0 ? 'paz_salvo' : 'estado_cuenta';
          setExpediente({
            tipo: 'reserva',
            reservaId: r.id,
            cotizacionId: cAsociada ? cAsociada.id : r.cotizacion_id || '',
            clienteId: r.cliente_id || (r.clientes as any)?.id || '',
          });
          setFaseFiltro('fase_3_saldos');
          setTipoSeleccionado(sugerido);
          setSubTipoAccion('normal');
          aplicarMensaje(
            sugerido,
            'normal',
            r.id,
            cAsociada ? cAsociada.id : r.cotizacion_id || '',
            r.cliente_id || ''
          );
          showToast(
            `Reserva #${formatearConsecutivoSimple(r.consecutivo)} cargada en Comunicaciones ✅`,
            'success'
          );
        }
      }
      onExpedienteInicialCargado?.();
    }
  }, [expedienteInicial]);

  // Inicialización por defecto
  useEffect(() => {
    if (!cotizacionId && !reservaId) {
      if (reservas.length > 0) {
        const r = reservas[0];
        const cAsociada = cotizaciones.find(
          (x) =>
            (r.cotizacion_id && x.id === r.cotizacion_id) ||
            (r.consecutivo && x.consecutivo === r.consecutivo)
        );
        setExpediente({
          tipo: 'reserva',
          reservaId: r.id,
          cotizacionId: cAsociada ? cAsociada.id : r.cotizacion_id || '',
          clienteId: r.cliente_id || (r.clientes as any)?.id || '',
        });
        aplicarMensaje(
          'estado_cuenta',
          'normal',
          r.id,
          cAsociada ? cAsociada.id : r.cotizacion_id || '',
          r.cliente_id || ''
        );
      } else if (cotizaciones.length > 0) {
        const c = cotizaciones[0];
        const rAsociada = reservas.find(
          (x) =>
            x.cotizacion_id === c.id ||
            (c.consecutivo && x.consecutivo === c.consecutivo)
        );
        setExpediente({
          tipo: 'cotizacion',
          cotizacionId: c.id,
          reservaId: rAsociada ? rAsociada.id : '',
          clienteId: c.cliente_id || (c.clientes as any)?.id || '',
        });
        aplicarMensaje(
          'cotizacion',
          'normal',
          rAsociada ? rAsociada.id : '',
          c.id,
          c.cliente_id || ''
        );
      }
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Selección desde el Smart Finder
  // ---------------------------------------------------------------------------
  const handleCargarExpediente = (item: {
    tipo: 'cotizacion' | 'reserva';
    id: string;
    consecutivo: string;
  }) => {
    if (item.tipo === 'cotizacion') {
      const c = cotizaciones.find((x) => x.id === item.id);
      if (c) {
        const rAsociada = reservas.find(
          (x) =>
            x.cotizacion_id === c.id ||
            (c.consecutivo && x.consecutivo === c.consecutivo)
        );
        setExpediente({
          tipo: 'cotizacion',
          cotizacionId: c.id,
          reservaId: rAsociada ? rAsociada.id : '',
          clienteId: c.cliente_id || (c.clientes as any)?.id || '',
        });
        setFaseFiltro('fase_1_cotizacion');
        setTipoSeleccionado('cotizacion');
        setSubTipoAccion('normal');
        aplicarMensaje(
          'cotizacion',
          'normal',
          rAsociada ? rAsociada.id : '',
          c.id,
          c.cliente_id || ''
        );
      }
    } else {
      const r = reservas.find((x) => x.id === item.id);
      if (r) {
        const cAsociada = cotizaciones.find(
          (x) =>
            (r.cotizacion_id && x.id === r.cotizacion_id) ||
            (r.consecutivo && x.consecutivo === r.consecutivo)
        );
        const saldo = calcularSaldo(r);
        const sugerido: TipoComunicacion = saldo <= 0 ? 'paz_salvo' : 'estado_cuenta';
        setExpediente({
          tipo: 'reserva',
          reservaId: r.id,
          cotizacionId: cAsociada ? cAsociada.id : r.cotizacion_id || '',
          clienteId: r.cliente_id || (r.clientes as any)?.id || '',
        });
        setFaseFiltro('fase_3_saldos');
        setTipoSeleccionado(sugerido);
        setSubTipoAccion('normal');
        aplicarMensaje(
          sugerido,
          'normal',
          r.id,
          cAsociada ? cAsociada.id : r.cotizacion_id || '',
          r.cliente_id || ''
        );
      }
    }
    showToast(`Expediente #${item.consecutivo} vinculado con éxito ✅`, 'success');
  };

  const handleActivarModoLibre = () => {
    setExpediente({
      tipo: null,
      cotizacionId: '',
      reservaId: '',
    });
    setTipoSeleccionado('personalizado');
    setFaseFiltro('fase_5_libre');
    aplicarMensaje('personalizado');
    showToast('Modo chat libre activado (sin vincular a expediente)', 'info');
  };

  // ---------------------------------------------------------------------------
  // Selección de Tarjeta de Mensaje del Catálogo
  // ---------------------------------------------------------------------------
  const handleSeleccionarTarjeta = (tarjeta: TarjetaTipoMensaje) => {
    setTipoSeleccionado(tarjeta.tipoReal);
    if (tarjeta.id === 'pedir_abono') {
      setSubTipoAccion('pedir_abono');
      aplicarMensaje('cotizacion', 'pedir_abono');
    } else if (
      tarjeta.id === 'cobrar_alimentacion' ||
      tarjeta.id === 'cobrar_alimentacion_cotiz'
    ) {
      setSubTipoAccion('cobrar_alimentacion');
      aplicarMensaje('cotizacion', 'cobrar_alimentacion');
    } else {
      setSubTipoAccion('normal');
      aplicarMensaje(tarjeta.tipoReal, 'normal');
    }
  };

  const handleCambiarFase = (nuevaFase: FaseMensaje) => {
    setFaseFiltro(nuevaFase);
    const tarjetasDeNuevaFase = CATALOGO_MENSAJES.filter((m) => m.fase === nuevaFase);
    const tarjetaCoincidente = tarjetasDeNuevaFase.find(
      (t) =>
        t.tipoReal === tipoSeleccionado &&
        ((subTipoAccion === 'pedir_abono' && t.id === 'pedir_abono') ||
          (subTipoAccion === 'cobrar_alimentacion' &&
            (t.id === 'cobrar_alimentacion' || t.id === 'cobrar_alimentacion_cotiz')) ||
          (subTipoAccion === 'normal' &&
            t.id !== 'pedir_abono' &&
            t.id !== 'cobrar_alimentacion' &&
            t.id !== 'cobrar_alimentacion_cotiz'))
    );

    if (tarjetaCoincidente) {
      handleSeleccionarTarjeta(tarjetaCoincidente);
    } else if (tarjetasDeNuevaFase.length > 0) {
      handleSeleccionarTarjeta(tarjetasDeNuevaFase[0]);
    }
  };

  // ---------------------------------------------------------------------------
  // Copiado de Cuentas Bancarias
  // ---------------------------------------------------------------------------
  const handleCopiarCuentaDueno = async () => {
    const fObj: any = fincaActual;
    const texto = `${fObj?.banco_nombre || 'Bancolombia'} ${
      fObj?.banco_tipo_cuenta || 'Ahorros'
    } N° ${fObj?.banco_cuenta || ''} a nombre de ${
      fObj?.banco_titular || 'Propietario'
    }${fObj?.banco_identificacion ? ` (ID: ${fObj.banco_identificacion})` : ''}`.trim();
    if (!fObj?.banco_cuenta) {
      showToast(
        'Esta finca aún no tiene configurada una cuenta bancaria del propietario',
        'info'
      );
      return;
    }
    const ok = await copiarAlPortapapeles(texto);
    if (ok) {
      setCopiadoBancoDueno(true);
      setTimeout(() => setCopiadoBancoDueno(false), 2000);
      showToast('Cuenta bancaria del propietario copiada al portapapeles 📋', 'success');
    }
  };

  const handleCopiarCuentaAdmin = async () => {
    const iden = (configuracion as any)?.banco_identificacion;
    const texto = `${configuracion?.banco_nombre || 'Bancolombia'} ${
      configuracion?.banco_tipo_cuenta || 'Ahorros'
    } N° ${configuracion?.banco_cuenta || ''} a nombre de ${
      configuracion?.banco_titular || 'Administración Paraíso Terrenal'
    }${iden ? ` (NIT: ${iden})` : ''}`.trim();
    if (!configuracion?.banco_cuenta) {
      showToast('No se ha configurado la cuenta bancaria de la administración', 'info');
      return;
    }
    const ok = await copiarAlPortapapeles(texto);
    if (ok) {
      setCopiadoBancoAdmin(true);
      setTimeout(() => setCopiadoBancoAdmin(false), 2000);
      showToast(
        'Cuenta bancaria de Paraíso Terrenal copiada al portapapeles 📋',
        'success'
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Generación y Descarga de PDF
  // ---------------------------------------------------------------------------
  const tieneDocumentoPdf = [
    'cotizacion',
    'separacion',
    'abono',
    'estado_cuenta',
    'paz_salvo',
    'menu',
  ].includes(tipoSeleccionado);

  const ejecutarDescargaPdf = async (): Promise<boolean> => {
    try {
      if (subTipoAccion === 'cobrar_alimentacion') {
        const itemActual =
          expedienteTipo === 'cotizacion' && cotizacionEfectiva
            ? cotizacionEfectiva
            : reservaEfectiva || cotizacionEfectiva;
        if (!itemActual) {
          showToast(
            'No hay expediente cargado para generar el documento de alimentación',
            'error'
          );
          return false;
        }

        let cantPersonas = itemActual.personas || 4;
        let cantServ = (itemActual as any).cantidad_alimentacion || 1;
        if (itemActual.alimentacion) {
          const match = itemActual.alimentacion.match(
            /(\d+)\s*serv(?:\.|\w*)\s*×\s*(\d+)\s*pers/i
          );
          if (match) {
            cantServ = parseInt(match[1], 10) || cantServ;
            cantPersonas = parseInt(match[2], 10) || cantPersonas;
          }
        }

        const m =
          (itemActual.menu_id && menus.find((x) => x.id === itemActual.menu_id)) ||
          (itemActual.alimentacion && itemActual.alimentacion !== 'Sin alimentación'
            ? {
                id: itemActual.menu_id || 'cotiz-menu',
                nombre: itemActual.alimentacion,
                categoria: 'Almuerzo' as const,
                precio_pp:
                  (itemActual.costo_alimentacion || 0) /
                  Math.max(1, cantPersonas * cantServ),
                activo: true,
              }
            : menus[0]);

        const f = fincas.find((x) => x.id === itemActual.finca_id) || itemActual.fincas;
        if (m) {
          await generarPropuestaAlimentacion({
            menu: m,
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
        const f =
          fincas.find((x) => x.id === cotizacionEfectiva.finca_id) ||
          (cotizacionEfectiva.fincas as any);
        generarDocCotizacion(cotizacionEfectiva, configuracion, f);
        return true;
      }
      if (tipoSeleccionado === 'separacion' && reservaEfectiva) {
        const f =
          fincas.find((x) => x.id === reservaEfectiva.finca_id) ||
          (reservaEfectiva.fincas as any);
        generarDocSeparacion(reservaEfectiva, configuracion, f);
        return true;
      }
      if (tipoSeleccionado === 'abono' && reservaEfectiva) {
        const p =
          reservaEfectiva.pagos?.find((x) => x.id === pagoId) ||
          reservaEfectiva.pagos?.[0] ||
          ({
            id: 'temp',
            reserva_id: reservaEfectiva.id,
            tipo: 'abono',
            fecha: new Date().toISOString().split('T')[0],
            valor:
              reservaEfectiva.separacion ||
              Math.round((reservaEfectiva.valor_total || 0) * 0.5),
          } as Pago);
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
        const f = target
          ? fincas.find((x) => x.id === target.finca_id) || target.fincas
          : null;
        const m = (target && menus.find((x) => x.id === target.menu_id)) || menus[0];
        if (m) {
          await generarPropuestaAlimentacion({
            menu: m,
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
  };

  // ---------------------------------------------------------------------------
  // Enviar a WhatsApp
  // ---------------------------------------------------------------------------
  const handleEnviarWhatsApp = async () => {
    const telLimpio = formatearTelefonoWhatsApp(telefonoInput);
    if (!telLimpio || telLimpio.length < 10) {
      showToast(
        'Por favor introduce un número de WhatsApp válido (ej: 573176827093)',
        'error'
      );
      return;
    }

    setProcesando(true);
    try {
      if (tieneDocumentoPdf && descargarPdf) {
        await ejecutarDescargaPdf();
      }

      abrirWhatsApp(telLimpio, mensajeTexto);

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

  const handleInsertarToken = (token: string) => {
    setMensajeTexto((prev) => `${prev} {{${token}}}`);
    showToast(`Etiqueta {{${token}}} agregada al mensaje`, 'info');
  };

  return (
    <div className="flex flex-col gap-5 font-sans">
      {/* 1. Header del Módulo con Tabs Animadas */}
      <ComunicacionesHeader
        currentWaNumber={currentWaNumber}
        totalComunicaciones={comunicaciones.length}
      />

      {/* PESTAÑA 1: CENTRO DE ENVÍOS INTELIGENTE */}
      {tabActiva === 'envio' && (
        <div className="flex flex-col gap-5">
          {/* A. Smart Finder & Acceso Rápido */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-md shadow-sm flex flex-col gap-4">
            <ComunicacionesFinder
              cotizaciones={cotizaciones}
              reservas={reservas}
              onSeleccionarExpediente={handleCargarExpediente}
              onActivarModoLibre={handleActivarModoLibre}
            />

            {/* B. Doble Balance Financiero Transparente */}
            <ComunicacionesBalanceDoble
              finanzasDoble={finanzasDoble}
              fincaActual={fincaActual}
              configuracion={configuracion}
              copiadoBancoDueno={copiadoBancoDueno}
              copiadoBancoAdmin={copiadoBancoAdmin}
              onCopiarCuentaDueno={handleCopiarCuentaDueno}
              onCopiarCuentaAdmin={handleCopiarCuentaAdmin}
            />
          </div>

          {/* C. Catálogo de Mensajes por Fases Comerciales */}
          <ComunicacionesCatalogo
            consecutivoBase={consecutivoBase}
            onSeleccionarTarjeta={handleSeleccionarTarjeta}
            onCambiarFase={handleCambiarFase}
          />

          {/* D. Grid de Editor de Mensaje y Simulador de WhatsApp */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <ComunicacionesEditor
              consecutivoBase={consecutivoBase}
              tieneDocumentoPdf={tieneDocumentoPdf}
              onEjecutarDescargaPdf={ejecutarDescargaPdf}
              onRestablecerMensaje={() =>
                aplicarMensaje(tipoSeleccionado, subTipoAccion)
              }
              onCopiarMensaje={handleCopiarMensaje}
              onInsertarToken={handleInsertarToken}
            />

            <ComunicacionesSimulator
              onEnviarWhatsApp={handleEnviarWhatsApp}
            />
          </div>
        </div>
      )}

      {/* PESTAÑA 2: ANALÍTICA & VISUALIZACIÓN (CHART.JS) */}
      {tabActiva === 'analytics' && (
        <ComunicacionesCharts
          comunicaciones={comunicaciones}
          finanzasDoble={finanzasDoble}
          expedienteConsecutivo={consecutivoBase}
        />
      )}

      {/* PESTAÑA 3: EDITOR DE PLANTILLAS EN SUPABASE */}
      {tabActiva === 'plantillas' && (
        <ComunicacionesPlantillasAdmin
          configuracion={configuracion}
          onGuardarConfiguracion={onGuardarConfiguracion}
          showToast={showToast}
          cotizacionEfectiva={cotizacionEfectiva}
          reservaEfectiva={reservaEfectiva}
          clienteActual={clienteActual}
          fincaActual={fincaActual}
          consecutivoBase={consecutivoBase}
        />
      )}

      {/* PESTAÑA 4: HISTORIAL DE COMUNICACIONES */}
      {tabActiva === 'historial' && (
        <ComunicacionesHistorial
          comunicaciones={comunicaciones}
          onLimpiarHistorial={onLimpiarHistorial}
          showToast={showToast}
        />
      )}

      {/* PESTAÑA 5: CONFIGURACIÓN CORPORATIVA */}
      {tabActiva === 'config' && (
        <ComunicacionesConfig
          currentWaNumber={currentWaNumber}
          onSaveWaNumber={onSaveWaNumber}
          showToast={showToast}
        />
      )}
    </div>
  );
};
