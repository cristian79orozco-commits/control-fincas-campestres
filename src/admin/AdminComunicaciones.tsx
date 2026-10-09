import React, { useState, useEffect } from 'react';
import {
  MessageCircle, Send, FileText, CheckCircle, Clock, Copy, Check,
  Download, Users, Trash2, Settings, Phone, BookOpen,
  Search, RotateCcw, Save, Sparkles, Tag, ExternalLink
} from 'lucide-react';
import type {
  Cliente, Finca, Reserva, CotizacionDB, Menu, Pago, TipoComunicacion, Comunicacion, ConfiguracionGeneral
} from '../types';
import { calcularSaldo } from '../types';
import {
  plantillaCotizacion,
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
  subirDocumentoStorage,
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
}

type TabComunicaciones = 'envio' | 'historial' | 'plantillas' | 'config';

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
}) => {
  const [tabActiva, setTabActiva] = useState<TabComunicaciones>('envio');

  // Estado del formulario de envío rápido
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoComunicacion>('cotizacion');
  const [reservaId, setReservaId] = useState<string>('');
  const [cotizacionId, setCotizacionId] = useState<string>('');
  const [clienteId, setClienteId] = useState<string>('');
  const [pagoId, setPagoId] = useState<string>('');
  const [telefonoInput, setTelefonoInput] = useState<string>('');
  const [destinatarioNombre, setDestinatarioNombre] = useState<string>('');
  const [mensajeTexto, setMensajeTexto] = useState<string>('');
  const [descargarPdf, setDescargarPdf] = useState<boolean>(true);
  const [copiado, setCopiado] = useState<boolean>(false);
  const [procesando, setProcesando] = useState<boolean>(false);

  // Consecutivo Lookup
  const [inputBusquedaConsecutivo, setInputBusquedaConsecutivo] = useState<string>('');
  const [consecutivoBaseActivo, setConsecutivoBaseActivo] = useState<string>('');

  // Editor de Plantillas
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string>('cotizacion');
  const [textoEditorPlantilla, setTextoEditorPlantilla] = useState<string>('');
  const [guardandoPlantilla, setGuardandoPlantilla] = useState<boolean>(false);

  // Configuración de número global
  const [waGlobalInput, setWaGlobalInput] = useState<string>(currentWaNumber);

  // Filtro historial
  const [filtroTipoHistorial, setFiltroTipoHistorial] = useState<string>('todos');

  // -------------------------------------------------------------
  // Inicialización del editor de plantillas
  // -------------------------------------------------------------
  useEffect(() => {
    const custom = configuracion?.plantillas_comunicacion?.[plantillaSeleccionada];
    setTextoEditorPlantilla(custom || PLANTILLAS_PREDETERMINADAS[plantillaSeleccionada] || '');
  }, [plantillaSeleccionada, configuracion]);

  // -------------------------------------------------------------
  // Generador de Mensaje dinámico con soporte de Plantillas Personalizadas
  // -------------------------------------------------------------
  const generarTextoMensaje = (
    nuevoTipo: TipoComunicacion,
    resId = reservaId,
    cotId = cotizacionId,
    cliId = clienteId,
    pId = pagoId,
    consecBase = consecutivoBaseActivo
  ): { msg: string; tel: string; nom: string } => {
    let msg = '';
    let tel = telefonoInput;
    let nom = destinatarioNombre;

    const r = reservas.find(x => x.id === resId);
    const c = cotizaciones.find(x => x.id === cotId);
    const cli = clientes.find(x => x.id === cliId) || r?.clientes || c?.clientes;
    const f = fincas.find(x => x.id === (r?.finca_id || c?.finca_id)) || r?.fincas || c?.fincas;
    const p = r?.pagos?.find(x => x.id === pId) || r?.pagos?.[0];

    // Verificar si el usuario tiene una plantilla personalizada en Supabase
    const plantillaCustom = configuracion?.plantillas_comunicacion?.[nuevoTipo];

    if (plantillaCustom) {
      const tokens = obtenerTokensParaMensaje({
        tipo: nuevoTipo,
        cotizacion: c,
        reserva: r,
        cliente: cli,
        finca: f,
        pago: p,
        consecutivoBase: consecBase,
      });
      msg = renderizarPlantillaPersonalizada(plantillaCustom, tokens);

      if (cli) {
        tel = cli.whatsapp || (cli as any)?.telefono || tel;
        nom = `${cli.nombre} ${cli.apellido || ''}`.trim();
      }
      return { msg, tel, nom };
    }

    // Si no hay plantilla personalizada, usar la plantilla oficial por defecto
    if (nuevoTipo === 'cotizacion') {
      const cotTarget = c || cotizaciones[0];
      if (cotTarget) {
        msg = plantillaCotizacion(cotTarget, cotTarget.fincas, cotTarget.clientes);
        tel = cotTarget.clientes?.whatsapp || (cotTarget.clientes as any)?.telefono || tel;
        nom = cotTarget.clientes ? `${cotTarget.clientes.nombre} ${cotTarget.clientes.apellido || ''}`.trim() : nom;
      }
    } else if (nuevoTipo === 'separacion') {
      const resTarget = r || reservas[0];
      if (resTarget) {
        msg = plantillaSeparacion(resTarget);
        tel = resTarget.clientes?.whatsapp || (resTarget.clientes as any)?.telefono || tel;
        nom = resTarget.clientes ? `${resTarget.clientes.nombre} ${resTarget.clientes.apellido || ''}`.trim() : nom;
      }
    } else if (nuevoTipo === 'abono') {
      const resTarget = r || reservas[0];
      if (resTarget) {
        const pagoTarget = p || {
          id: 'pago-temp',
          reserva_id: resTarget.id,
          tipo: 'abono',
          fecha: new Date().toISOString().split('T')[0],
          valor: resTarget.separacion || 0,
        } as Pago;
        msg = plantillaComprobantePago(resTarget, pagoTarget);
        tel = resTarget.clientes?.whatsapp || (resTarget.clientes as any)?.telefono || tel;
        nom = resTarget.clientes ? `${resTarget.clientes.nombre} ${resTarget.clientes.apellido || ''}`.trim() : nom;
      }
    } else if (nuevoTipo === 'estado_cuenta') {
      const resTarget = r || reservas[0];
      if (resTarget) {
        msg = plantillaEstadoCuenta(resTarget);
        tel = resTarget.clientes?.whatsapp || (resTarget.clientes as any)?.telefono || tel;
        nom = resTarget.clientes ? `${resTarget.clientes.nombre} ${resTarget.clientes.apellido || ''}`.trim() : nom;
      }
    } else if (nuevoTipo === 'paz_salvo') {
      const resTarget = r || reservas[0];
      if (resTarget) {
        msg = plantillaPazYSalvo(resTarget);
        tel = resTarget.clientes?.whatsapp || (resTarget.clientes as any)?.telefono || tel;
        nom = resTarget.clientes ? `${resTarget.clientes.nombre} ${resTarget.clientes.apellido || ''}`.trim() : nom;
      }
    } else if (nuevoTipo === 'menu') {
      const cotTarget = c || cotizaciones[0];
      const m = (cotTarget && menus.find(x => x.id === cotTarget.menu_id)) || menus[0];
      if (m) {
        msg = plantillaPropuestaAlimentacion({
          menu: m,
          cliente: cotTarget?.clientes,
          finca: cotTarget?.fincas,
          personas: cotTarget?.personas || 4,
          cantidadServicios: cotTarget?.cantidad_alimentacion || 1,
        });
        if (cotTarget?.clientes) {
          tel = cotTarget.clientes.whatsapp || (cotTarget.clientes as any)?.telefono || tel;
          nom = `${cotTarget.clientes.nombre} ${cotTarget.clientes.apellido || ''}`.trim();
        }
      }
    } else if (nuevoTipo === 'recordatorio_pago') {
      const resTarget = r || reservas[0];
      if (resTarget) {
        msg = plantillaRecordatorioPago(resTarget);
        tel = resTarget.clientes?.whatsapp || (resTarget.clientes as any)?.telefono || tel;
        nom = resTarget.clientes ? `${resTarget.clientes.nombre} ${resTarget.clientes.apellido || ''}`.trim() : nom;
      }
    } else if (nuevoTipo === 'bienvenida') {
      const resTarget = r || reservas[0];
      if (resTarget) {
        msg = plantillaBienvenida(resTarget);
        tel = resTarget.clientes?.whatsapp || (resTarget.clientes as any)?.telefono || tel;
        nom = resTarget.clientes ? `${resTarget.clientes.nombre} ${resTarget.clientes.apellido || ''}`.trim() : nom;
      }
    } else {
      // Personalizado
      if (cli) {
        tel = cli.whatsapp || (cli as any)?.telefono || tel;
        nom = `${cli.nombre} ${cli.apellido || ''}`.trim();
        msg = `Hola, *${nom}* 👋\n\nTe escribimos de *Paraíso Terrenal*.`;
      } else {
        msg = `Hola 👋\n\nTe escribimos de *Paraíso Terrenal*.`;
      }
    }

    return { msg, tel, nom };
  };

  const actualizarPlantilla = (
    nuevoTipo: TipoComunicacion,
    resId = reservaId,
    cotId = cotizacionId,
    cliId = clienteId,
    pId = pagoId,
    consecBase = consecutivoBaseActivo
  ) => {
    const { msg, tel, nom } = generarTextoMensaje(nuevoTipo, resId, cotId, cliId, pId, consecBase);
    setMensajeTexto(msg);
    if (tel) setTelefonoInput(formatearTelefonoWhatsApp(tel));
    if (nom) setDestinatarioNombre(nom);
  };

  // Inicializar al cargar
  useEffect(() => {
    actualizarPlantilla('cotizacion');
  }, []);

  // -------------------------------------------------------------
  // Consecutivo Lookup
  // -------------------------------------------------------------
  const ejecutarBusquedaConsecutivo = (valorBuscar?: string) => {
    const query = valorBuscar !== undefined ? valorBuscar : inputBusquedaConsecutivo;
    const numLimpio = formatearConsecutivoSimple(query);
    if (!numLimpio || numLimpio === '1001' && !query.includes('1001')) {
      showToast('Ingresa un número de consecutivo válido (ej: 1001)', 'info');
      return;
    }

    // Buscar coincidencia en reservas
    const rMatch = reservas.find(r =>
      formatearConsecutivoSimple(r.consecutivo) === numLimpio ||
      (r.cotizacion_id && cotizaciones.some(c => c.id === r.cotizacion_id && formatearConsecutivoSimple(c.consecutivo) === numLimpio))
    );

    // Buscar coincidencia en cotizaciones
    const cMatch = cotizaciones.find(c =>
      formatearConsecutivoSimple(c.consecutivo) === numLimpio
    );

    if (!rMatch && !cMatch) {
      showToast(`No se encontró ninguna reserva o cotización con el consecutivo #${numLimpio}`, 'error');
      return;
    }

    setConsecutivoBaseActivo(numLimpio);

    if (rMatch) {
      setReservaId(rMatch.id);
      if (rMatch.cotizacion_id) setCotizacionId(rMatch.cotizacion_id);
      if (rMatch.cliente_id) setClienteId(rMatch.cliente_id);
      const cliNom = rMatch.clientes ? `${rMatch.clientes.nombre} ${rMatch.clientes.apellido || ''}`.trim() : '';
      const cliTel = rMatch.clientes?.whatsapp || (rMatch.clientes as any)?.telefono || '';
      if (cliNom) setDestinatarioNombre(cliNom);
      if (cliTel) setTelefonoInput(formatearTelefonoWhatsApp(cliTel));

      // Determinar tipo sugerido
      const saldo = calcularSaldo(rMatch);
      const tipoSugerido: TipoComunicacion = saldo <= 0 ? 'paz_salvo' : (rMatch.pagos && rMatch.pagos.length > 1 ? 'abono' : 'separacion');
      setTipoSeleccionado(tipoSugerido);
      actualizarPlantilla(tipoSugerido, rMatch.id, rMatch.cotizacion_id || '', rMatch.cliente_id || '', '', numLimpio);
      showToast(`¡Consecutivo #${numLimpio} cargado! Reserva de ${rMatch.fincas?.nombre || 'Finca'} (${cliNom})`, 'success');
    } else if (cMatch) {
      setCotizacionId(cMatch.id);
      if (cMatch.cliente_id) setClienteId(cMatch.cliente_id);
      const cliNom = cMatch.clientes ? `${cMatch.clientes.nombre} ${cMatch.clientes.apellido || ''}`.trim() : '';
      const cliTel = cMatch.clientes?.whatsapp || (cMatch.clientes as any)?.telefono || '';
      if (cliNom) setDestinatarioNombre(cliNom);
      if (cliTel) setTelefonoInput(formatearTelefonoWhatsApp(cliTel));

      setTipoSeleccionado('cotizacion');
      actualizarPlantilla('cotizacion', '', cMatch.id, cMatch.cliente_id || '', '', numLimpio);
      showToast(`¡Consecutivo #${numLimpio} cargado! Cotización para ${cMatch.fincas?.nombre || 'Finca'} (${cliNom})`, 'success');
    }
  };

  const seleccionarTipoRapido = (tipo: TipoComunicacion) => {
    setTipoSeleccionado(tipo);
    actualizarPlantilla(tipo, reservaId, cotizacionId, clienteId, pagoId, consecutivoBaseActivo);
  };

  const handleTipoChange = (nuevo: TipoComunicacion) => {
    setTipoSeleccionado(nuevo);
    actualizarPlantilla(nuevo);
  };

  const handleCotizacionChange = (id: string) => {
    setCotizacionId(id);
    const c = cotizaciones.find(x => x.id === id);
    if (c?.consecutivo) setConsecutivoBaseActivo(formatearConsecutivoSimple(c.consecutivo));
    actualizarPlantilla(tipoSeleccionado, reservaId, id, clienteId, pagoId);
  };

  const handleReservaChange = (id: string) => {
    setReservaId(id);
    const r = reservas.find(x => x.id === id);
    if (r?.consecutivo) setConsecutivoBaseActivo(formatearConsecutivoSimple(r.consecutivo));
    const primerPago = r?.pagos?.[0]?.id || '';
    setPagoId(primerPago);
    actualizarPlantilla(tipoSeleccionado, id, cotizacionId, clienteId, primerPago);
  };

  const handlePagoChange = (id: string) => {
    setPagoId(id);
    actualizarPlantilla(tipoSeleccionado, reservaId, cotizacionId, clienteId, id);
  };

  const handleClienteChange = (id: string) => {
    setClienteId(id);
    const cli = clientes.find(x => x.id === id);
    if (cli) {
      setDestinatarioNombre(`${cli.nombre} ${cli.apellido || ''}`.trim());
      if (cli.whatsapp || cli.telefono) {
        setTelefonoInput(formatearTelefonoWhatsApp(cli.whatsapp || cli.telefono));
      }
    }
  };

  // Determinar si el tipo actual requiere o admite documento PDF
  const tieneDocumentoPdf = [
    'cotizacion', 'separacion', 'abono', 'estado_cuenta', 'paz_salvo', 'menu'
  ].includes(tipoSeleccionado);

  const nombreDocumento =
    tipoSeleccionado === 'cotizacion' ? 'Cotización Formal de Servicios (PDF)' :
    tipoSeleccionado === 'separacion' ? 'Documento Oficial de Separación (PDF)' :
    tipoSeleccionado === 'abono' ? 'Comprobante de Abono / Pago (PDF)' :
    tipoSeleccionado === 'estado_cuenta' ? 'Estado de Cuenta Consolidado (PDF)' :
    tipoSeleccionado === 'paz_salvo' ? 'Certificado de Paz y Salvo (PDF)' :
    tipoSeleccionado === 'menu' ? 'Propuesta Gastronómica de Menú (PDF)' : '';

  // -------------------------------------------------------------
  // Ejecución y generación de PDF
  // -------------------------------------------------------------
  const ejecutarGeneracionYDescargaPdf = async (): Promise<{ blob: Blob; nombreArchivo: string } | null> => {
    const r = reservas.find(x => x.id === reservaId) || reservas[0];
    const c = cotizaciones.find(x => x.id === cotizacionId) || cotizaciones[0];

    try {
      switch (tipoSeleccionado) {
        case 'cotizacion':
          if (c) {
            const res = generarDocCotizacion(c, configuracion);
            return { blob: res.blob, nombreArchivo: res.nombreArchivo };
          }
          break;
        case 'separacion':
          if (r) {
            const res = generarDocSeparacion(r, configuracion);
            return { blob: res.blob, nombreArchivo: res.nombreArchivo };
          }
          break;
        case 'abono':
          if (r) {
            const p = r.pagos?.find(x => x.id === pagoId) || r.pagos?.[0] || {
              id: 'pago-temp',
              reserva_id: r.id,
              tipo: 'abono',
              fecha: new Date().toISOString().split('T')[0],
              valor: r.separacion || 0,
            } as Pago;
            const res = generarComprobantePago(r, p, configuracion);
            return { blob: res.blob, nombreArchivo: res.nombreArchivo };
          }
          break;
        case 'estado_cuenta':
          if (r) {
            const res = generarEstadoCuenta(r, configuracion);
            return { blob: res.blob, nombreArchivo: res.nombreArchivo };
          }
          break;
        case 'paz_salvo':
          if (r) {
            if (calcularSaldo(r) > 0) {
              showToast('El saldo debe ser $0 COP para emitir el Paz y Salvo', 'error');
              return null;
            }
            const res = generarPazYSalvo(r, configuracion);
            if (res) {
              return { blob: res.blob, nombreArchivo: res.nombreArchivo };
            }
            return null;
          }
          break;
        case 'menu': {
          const m = (c && menus.find(x => x.id === c.menu_id)) || menus[0];
          if (m) {
            const res = await generarPropuestaAlimentacion({
              menu: m,
              cliente: c?.clientes,
              finca: c?.fincas,
              personas: c?.personas || 4,
              cantidadServicios: c?.cantidad_alimentacion || 1,
              config: configuracion,
            });
            if (res) {
              return { blob: res.blob, nombreArchivo: res.nombreArchivo };
            }
            return null;
          }
          break;
        }
      }
      return null;
    } catch (err: any) {
      showToast(`Error al generar documento PDF: ${err.message}`, 'error');
      return null;
    }
  };

  const handleCopiar = async () => {
    const ok = await copiarAlPortapapeles(mensajeTexto);
    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      showToast('Mensaje copiado al portapapeles 📋', 'success');
    }
  };

  // -------------------------------------------------------------
  // Envío por WhatsApp con integración Storage
  // -------------------------------------------------------------
  const handleEnviar = async () => {
    const telLimpio = formatearTelefonoWhatsApp(telefonoInput);
    if (!telLimpio) {
      showToast('Ingresa un número de WhatsApp válido', 'error');
      return;
    }
    if (!mensajeTexto.trim()) {
      showToast('El contenido del mensaje no puede estar vacío', 'error');
      return;
    }

    setProcesando(true);
    let textoFinalParaEnviar = mensajeTexto;

    try {
      // 1. Si está activo descargar PDF y aplica, generarlo y subirlo a Storage
      if (tieneDocumentoPdf && descargarPdf) {
        showToast('Generando documento PDF y preparando enlace seguro…', 'info');
        const resultadoPdf = await ejecutarGeneracionYDescargaPdf();
        if (resultadoPdf) {
          const enlacePublico = await subirDocumentoStorage(resultadoPdf.blob, resultadoPdf.nombreArchivo);
          if (enlacePublico) {
            if (textoFinalParaEnviar.includes('{{enlace_pdf}}')) {
              textoFinalParaEnviar = textoFinalParaEnviar.replace(/\{\{enlace_pdf\}\}/gi, `📎 *Documento oficial adjunto (PDF):*\n${enlacePublico}`);
            } else if (!textoFinalParaEnviar.includes(enlacePublico)) {
              textoFinalParaEnviar += `\n\n📎 *Documento oficial adjunto (PDF):*\n${enlacePublico}`;
            }
            setMensajeTexto(textoFinalParaEnviar);
          }
        }
      }

      // 2. Abrir WhatsApp
      abrirWhatsApp(telLimpio, textoFinalParaEnviar);

      // 3. Registrar en historial de auditoría
      const r = reservas.find(x => x.id === reservaId);
      const c = cotizaciones.find(x => x.id === cotizacionId);
      await onRegistrarComunicacion({
        cliente_id: r?.cliente_id || c?.cliente_id || clienteId || null,
        reserva_id: r?.id || null,
        cotizacion_id: c?.id || null,
        tipo: tipoSeleccionado,
        destinatario: destinatarioNombre || 'Cliente',
        telefono: telLimpio,
        mensaje: textoFinalParaEnviar,
        estado: 'enviado',
      });

      showToast('WhatsApp abierto y comunicación registrada con éxito ✅', 'success');
    } catch (err: any) {
      showToast(`Error al procesar comunicación: ${err.message}`, 'error');
    } finally {
      setProcesando(false);
    }
  };

  // -------------------------------------------------------------
  // Gestión de Plantillas Personalizadas en Supabase
  // -------------------------------------------------------------
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
      showToast(`Plantilla de ${plantillaSeleccionada} restablecida a la versión oficial predeterminada 🔄`, 'info');
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  };

  const insertarEtiquetaEnEditor = (etiqueta: string) => {
    setTextoEditorPlantilla(prev => `${prev} {{${etiqueta}}}`);
    showToast(`Etiqueta {{${etiqueta}}} insertada`, 'info');
  };

  const handleGuardarWaGlobal = () => {
    const cleanNum = waGlobalInput.replace(/[^0-9]/g, '');
    if (cleanNum.length < 10) {
      showToast('Número inválido. Usa formato internacional (ej: 573176827093)', 'error');
      return;
    }
    onSaveWaNumber(cleanNum);
    showToast('Número de WhatsApp global actualizado ✅', 'success');
  };

  const comunicacionesFiltradas = comunicaciones.filter(c =>
    filtroTipoHistorial === 'todos' || c.tipo === filtroTipoHistorial
  );

  const reservaActual = reservas.find(x => x.id === reservaId);
  const cotizacionActual = cotizaciones.find(x => x.id === cotizacionId);
  const baseNum = consecutivoBaseActivo || (reservaActual?.consecutivo ? formatearConsecutivoSimple(reservaActual.consecutivo) : (cotizacionActual?.consecutivo ? formatearConsecutivoSimple(cotizacionActual.consecutivo) : '1001'));

  return (
    <div className="panel">
      {/* Encabezado */}
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#25d366' }}>
            <MessageCircle size={20} />
            <span>Comunicaciones, Consecutivos y WhatsApp</span>
          </div>
          <div className="text-xs text-muted mt-1">
            Sinergia completa con Cotizaciones y Reservas: gestión de consecutivos dinámicos, documentos PDF, almacenamiento y plantillas personalizadas.
          </div>
        </div>

        {/* Pestañas de navegación */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm${tabActiva === 'envio' ? ' btn-primary' : ''}`}
            onClick={() => setTabActiva('envio')}
            style={{ fontSize: '0.76rem', gap: '0.35rem' }}
          >
            <Send size={13} /> Enviar Mensaje
          </button>
          <button
            className={`btn btn-sm${tabActiva === 'plantillas' ? ' btn-primary' : ''}`}
            onClick={() => setTabActiva('plantillas')}
            style={{ fontSize: '0.76rem', gap: '0.35rem' }}
          >
            <BookOpen size={13} /> Editor de Plantillas
          </button>
          <button
            className={`btn btn-sm${tabActiva === 'historial' ? ' btn-primary' : ''}`}
            onClick={() => setTabActiva('historial')}
            style={{ fontSize: '0.76rem', gap: '0.35rem' }}
          >
            <Clock size={13} /> Historial ({comunicaciones.length})
          </button>
          <button
            className={`btn btn-sm${tabActiva === 'config' ? ' btn-primary' : ''}`}
            onClick={() => setTabActiva('config')}
            style={{ fontSize: '0.76rem', gap: '0.35rem' }}
          >
            <Settings size={13} /> Configuración
          </button>
        </div>
      </div>

      {/* ========================================================
          PESTAÑA 1: CENTRO DE ENVÍOS RÁPIDOS & CONSECUTIVOS
          ======================================================== */}
      {tabActiva === 'envio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
          
          {/* BARRA SUPERIOR: LOOKUP RÁPIDO POR CONSECUTIVO */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(26, 107, 94, 0.08) 0%, rgba(37, 211, 102, 0.06) 100%)',
              border: '1px solid rgba(26, 107, 94, 0.25)',
              borderRadius: 'var(--rad-sm)',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.84rem', color: 'var(--primary)' }}>
                <Search size={16} />
                <span>Cargar por N° Consecutivo de Cotización o Reserva:</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Ej: 1001 o COT-1001"
                  value={inputBusquedaConsecutivo}
                  onChange={e => setInputBusquedaConsecutivo(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') ejecutarBusquedaConsecutivo(); }}
                  style={{
                    fontSize: '0.82rem',
                    padding: '0.35rem 0.65rem',
                    width: '160px',
                    fontWeight: 600,
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => ejecutarBusquedaConsecutivo()}
                  style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem' }}
                >
                  Cargar
                </button>
              </div>
            </div>

            {/* Ficha de Consecutivo Activo y Selector Dinámico de Documentos */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.6rem',
                paddingTop: '0.4rem',
                borderTop: '1px solid rgba(26, 107, 94, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                <span style={{ background: 'var(--primary)', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                  N° Base: #{baseNum}
                </span>
                {destinatarioNombre && (
                  <span><strong>Cliente:</strong> {destinatarioNombre}</span>
                )}
                {reservaActual && (
                  <span><strong>Finca:</strong> {reservaActual.fincas?.nombre || 'Finca'}</span>
                )}
                {reservaActual && (
                  <span><strong>Saldo:</strong> {formatCOP(calcularSaldo(reservaActual))}</span>
                )}
              </div>

              {/* Botones rápidos de Documentos con Prefijo Dinámico sobre el mismo Consecutivo */}
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn btn-sm${tipoSeleccionado === 'cotizacion' ? ' btn-primary' : ''}`}
                  onClick={() => seleccionarTipoRapido('cotizacion')}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}
                  title="Cotización oficial"
                >
                  COT-{baseNum}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm${tipoSeleccionado === 'separacion' ? ' btn-primary' : ''}`}
                  onClick={() => seleccionarTipoRapido('separacion')}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}
                  title="Documento de separación"
                >
                  SEP-{baseNum}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm${tipoSeleccionado === 'abono' ? ' btn-primary' : ''}`}
                  onClick={() => seleccionarTipoRapido('abono')}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}
                  title="Comprobante de abono"
                >
                  ABO-{baseNum}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm${tipoSeleccionado === 'estado_cuenta' ? ' btn-primary' : ''}`}
                  onClick={() => seleccionarTipoRapido('estado_cuenta')}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}
                  title="Estado de cuenta consolidado"
                >
                  SAL-{baseNum}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm${tipoSeleccionado === 'paz_salvo' ? ' btn-primary' : ''}`}
                  onClick={() => seleccionarTipoRapido('paz_salvo')}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}
                  title="Certificado de paz y salvo"
                >
                  PAZ-{baseNum}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm${tipoSeleccionado === 'menu' ? ' btn-primary' : ''}`}
                  onClick={() => seleccionarTipoRapido('menu')}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}
                  title="Propuesta de menú gastronómico"
                >
                  MEN-{baseNum}
                </button>
              </div>
            </div>
          </div>

          {/* CUERPO PRINCIPAL DEL FORMULARIO DE ENVÍO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {/* Columna Izquierda: Parámetros del Documento y Destinatario */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* 1. Selector de Plantilla */}
              <div className="field">
                <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>1. Tipo de Comunicación / Documento</label>
                <select
                  value={tipoSeleccionado}
                  onChange={e => handleTipoChange(e.target.value as TipoComunicacion)}
                  style={{ fontSize: '0.85rem', fontWeight: 500 }}
                >
                  <option value="cotizacion">📄 Cotización Oficial ({formatearConsecutivoConPrefijo(baseNum, 'cotizacion')})</option>
                  <option value="separacion">🎉 Documento de Separación ({formatearConsecutivoConPrefijo(baseNum, 'separacion')})</option>
                  <option value="abono">💳 Comprobante de Abono / Pago ({formatearConsecutivoConPrefijo(baseNum, 'abono')})</option>
                  <option value="estado_cuenta">📊 Estado de Cuenta ({formatearConsecutivoConPrefijo(baseNum, 'estado_cuenta')})</option>
                  <option value="paz_salvo">🏅 Certificado de Paz y Salvo ({formatearConsecutivoConPrefijo(baseNum, 'paz_salvo')})</option>
                  <option value="menu">🍽️ Propuesta de Menú ({formatearConsecutivoConPrefijo(baseNum, 'menu')})</option>
                  <option value="recordatorio_pago">⏰ Recordatorio Amistoso de Saldo</option>
                  <option value="bienvenida">👋 Bienvenida e Instrucciones de Llegada</option>
                  <option value="personalizado">💬 Mensaje Personalizado Libre</option>
                </select>
              </div>

              {/* 2. Selectores dependientes */}
              {tipoSeleccionado === 'cotizacion' && (
                <div className="field">
                  <label style={{ fontSize: '0.78rem' }}>Seleccionar Cotización Registrada</label>
                  <select
                    value={cotizacionId}
                    onChange={e => handleCotizacionChange(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                  >
                    <option value="">— Seleccionar cotización —</option>
                    {cotizaciones.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.consecutivo ? `[#${formatearConsecutivoSimple(c.consecutivo)}] ` : ''}{c.fincas?.nombre} · {c.clientes ? `${c.clientes.nombre} ${c.clientes.apellido || ''}` : 'Sin cliente'} · {formatCOP(c.total)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {['separacion', 'estado_cuenta', 'paz_salvo', 'recordatorio_pago', 'bienvenida'].includes(tipoSeleccionado) && (
                <div className="field">
                  <label style={{ fontSize: '0.78rem' }}>Seleccionar Reserva Registrada</label>
                  <select
                    value={reservaId}
                    onChange={e => handleReservaChange(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                  >
                    <option value="">— Seleccionar reserva registrada —</option>
                    {reservas.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.consecutivo ? `[#${formatearConsecutivoSimple(r.consecutivo)}] ` : ''}{r.fincas?.nombre} · {r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}` : 'Cliente'} ({formatFecha(r.fecha_inicio)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {tipoSeleccionado === 'abono' && (
                <>
                  <div className="field">
                    <label style={{ fontSize: '0.78rem' }}>Seleccionar Reserva</label>
                    <select
                      value={reservaId}
                      onChange={e => handleReservaChange(e.target.value)}
                      style={{ fontSize: '0.82rem' }}
                    >
                      <option value="">— Seleccionar reserva —</option>
                      {reservas.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.consecutivo ? `[#${formatearConsecutivoSimple(r.consecutivo)}] ` : ''}{r.fincas?.nombre} · {r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}` : 'Cliente'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {reservaActual && (reservaActual.pagos || []).length > 0 && (
                    <div className="field">
                      <label style={{ fontSize: '0.78rem' }}>Seleccionar Pago a Certificar</label>
                      <select
                        value={pagoId}
                        onChange={e => handlePagoChange(e.target.value)}
                        style={{ fontSize: '0.82rem' }}
                      >
                        {(reservaActual.pagos || []).map(p => (
                          <option key={p.id} value={p.id}>
                            {p.tipo} · {formatFecha(p.fecha)} · {formatCOP(p.valor)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {tipoSeleccionado === 'menu' && (
                <div className="field">
                  <label style={{ fontSize: '0.78rem' }}>Cotización con menú asociado</label>
                  <select
                    value={cotizacionId}
                    onChange={e => handleCotizacionChange(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                  >
                    <option value="">— Seleccionar cotización —</option>
                    {cotizaciones.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.consecutivo ? `[#${formatearConsecutivoSimple(c.consecutivo)}] ` : ''}{c.fincas?.nombre} · {c.alimentacion || 'Menú'} · {c.clientes?.nombre || 'Cliente'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {tipoSeleccionado === 'personalizado' && (
                <div className="field">
                  <label style={{ fontSize: '0.78rem' }}>Vincular a cliente registrado (opcional)</label>
                  <select
                    value={clienteId}
                    onChange={e => handleClienteChange(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                  >
                    <option value="">— Ninguno / Ingreso manual —</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.apellido || ''} {c.whatsapp ? `(${c.whatsapp})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. Datos del Destinatario */}
              <div style={{ background: 'var(--surface-alt, #f7f9f8)', padding: '0.85rem', borderRadius: 'var(--rad-sm)', border: '1px solid var(--border)' }}>
                <div className="field" style={{ marginBottom: '0.6rem' }}>
                  <label style={{ fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Users size={12} /> Nombre del Destinatario:
                  </label>
                  <input
                    type="text"
                    value={destinatarioNombre}
                    onChange={e => setDestinatarioNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Phone size={12} /> WhatsApp (indicativo + celular):
                  </label>
                  <input
                    type="tel"
                    value={telefonoInput}
                    onChange={e => setTelefonoInput(e.target.value)}
                    placeholder="Ej. 573176827093"
                    style={{ fontSize: '0.85rem', fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* 4. Banner de Documento PDF */}
              {tieneDocumentoPdf && (
                <div
                  style={{
                    background: 'rgba(26, 107, 94, 0.08)',
                    border: '1px solid rgba(26, 107, 94, 0.25)',
                    padding: '0.75rem',
                    borderRadius: 'var(--rad-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    fontSize: '0.78rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--primary)', fontWeight: 600 }}>
                    <Download size={15} /> {nombreDocumento}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                    El PDF se generará con el código <strong>{formatearConsecutivoConPrefijo(baseNum, tipoSeleccionado as TipoDocumentoPrefijo)}</strong>, se guardará en tu equipo y se subirá automáticamente a la nube para adjuntar el enlace directo en WhatsApp.
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={ejecutarGeneracionYDescargaPdf}
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                    >
                      <Download size={11} /> Descargar PDF ahora
                    </button>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.74rem', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={descargarPdf}
                        onChange={e => setDescargarPdf(e.target.checked)}
                      />
                      <span>Generar y subir al enviar</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Columna Derecha: Vista previa y acción de envío */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MessageCircle size={14} style={{ color: '#25d366' }} /> Mensaje a enviar por WhatsApp (editable)
                </label>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => actualizarPlantilla(tipoSeleccionado)}
                    title="Regenerar texto con plantilla actual"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}
                  >
                    <RotateCcw size={11} /> Regenerar
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleCopiar}
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                  >
                    {copiado ? <><Check size={11} style={{ color: 'var(--success)' }} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                  </button>
                </div>
              </div>

              <textarea
                rows={16}
                value={mensajeTexto}
                onChange={e => setMensajeTexto(e.target.value)}
                placeholder="Escribe o previsualiza aquí el mensaje que recibirá el cliente…"
                style={{
                  fontFamily: 'inherit',
                  fontSize: '0.82rem',
                  lineHeight: '1.45',
                  padding: '0.85rem',
                  borderRadius: 'var(--rad-sm)',
                  whiteSpace: 'pre-wrap',
                  flex: 1,
                  minHeight: '280px',
                }}
              />

              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleEnviar}
                  disabled={procesando || !telefonoInput.trim()}
                  style={{
                    flex: 1,
                    backgroundColor: '#25d366',
                    borderColor: '#25d366',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    gap: '0.45rem',
                    justifyContent: 'center',
                    padding: '0.65rem 1rem',
                  }}
                >
                  <Send size={16} />
                  {procesando
                    ? 'Generando PDF y abriendo WhatsApp…'
                    : (tieneDocumentoPdf && descargarPdf ? 'Descargar PDF y Enviar por WhatsApp' : 'Abrir chat de WhatsApp')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA 2: EDITOR DE PLANTILLAS EN SUPABASE
          ======================================================== */}
      {tabActiva === 'plantillas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--rad-sm)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Selector de plantilla a editar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Seleccionar Plantilla a Personalizar:</span>
              </div>
              <select
                value={plantillaSeleccionada}
                onChange={e => setPlantillaSeleccionada(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '0.3rem 0.6rem', minWidth: '240px' }}
              >
                <option value="cotizacion">📄 Cotización Oficial</option>
                <option value="solicitud_cliente_publica">🌐 Solicitud Web de Cotización (Cliente → WhatsApp)</option>
                <option value="separacion">🎉 Documento de Separación</option>
                <option value="abono">💳 Comprobante de Abono / Pago</option>
                <option value="estado_cuenta">📊 Estado de Cuenta Consolidado</option>
                <option value="paz_salvo">🏅 Certificado de Paz y Salvo</option>
                <option value="menu">🍽️ Propuesta de Menú / Alimentación</option>
                <option value="recordatorio_pago">⏰ Recordatorio Amistoso de Saldo</option>
                <option value="bienvenida">👋 Bienvenida e Instrucciones de Llegada</option>
              </select>
            </div>

            {/* Estado actual de la plantilla */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
              <span className="text-muted">Estado actual:</span>
              {configuracion?.plantillas_comunicacion?.[plantillaSeleccionada] ? (
                <span className="status-badge s-avail" style={{ fontSize: '0.7rem' }}>
                  ✓ Plantilla personalizada activa en Supabase
                </span>
              ) : (
                <span className="status-badge" style={{ fontSize: '0.7rem', background: 'rgba(0,0,0,0.06)' }}>
                  Predeterminada del sistema
                </span>
              )}
            </div>

            {/* Inserción rápida de etiquetas / tokens */}
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Tag size={12} /> Haz clic en cualquier etiqueta para insertarla en el texto del mensaje:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {[
                  { tag: 'cliente', desc: 'Nombre del cliente' },
                  { tag: 'celular', desc: 'Celular del cliente' },
                  { tag: 'finca', desc: 'Nombre de la finca' },
                  { tag: 'consecutivo', desc: 'N° consecutivo' },
                  { tag: 'consecutivo_linea', desc: 'Línea de consecutivo formateada' },
                  { tag: 'whatsapp_linea', desc: 'Línea con WhatsApp secundario' },
                  { tag: 'fechas', desc: 'Rango de fechas' },
                  { tag: 'fecha_inicio', desc: 'Día de llegada' },
                  { tag: 'fecha_fin', desc: 'Día de salida' },
                  { tag: 'fecha_llegada', desc: 'Día de llegada' },
                  { tag: 'fecha_salida', desc: 'Día de salida' },
                  { tag: 'noches', desc: 'Noches de estancia' },
                  { tag: 'noches_plural', desc: 's o vacío' },
                  { tag: 'personas', desc: 'N° comensales / huéspedes' },
                  { tag: 'alimentacion_detalle', desc: 'Detalle de menús seleccionados' },
                  { tag: 'alojamiento_total', desc: 'Subtotal alojamiento' },
                  { tag: 'total', desc: 'Valor total' },
                  { tag: 'anticipo', desc: 'Valor anticipo / separación' },
                  { tag: 'saldo', desc: 'Saldo pendiente' },
                  { tag: 'pago_valor', desc: 'Monto del pago' },
                  { tag: 'enlace_pdf', desc: 'Enlace público del PDF' },
                ].map(item => (
                  <button
                    key={item.tag}
                    type="button"
                    className="btn btn-sm"
                    onClick={() => insertarEtiquetaEnEditor(item.tag)}
                    style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', background: 'rgba(26, 107, 94, 0.06)', borderColor: 'rgba(26, 107, 94, 0.2)' }}
                    title={item.desc}
                  >
                    + {`{{${item.tag}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea de edición */}
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
                  borderRadius: 'var(--rad-sm)',
                }}
              />
            </div>

            {/* Acciones de guardado */}
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
                  className="btn btn-sm"
                  onClick={() => {
                    setTipoSeleccionado(plantillaSeleccionada as TipoComunicacion);
                    setTabActiva('envio');
                    actualizarPlantilla(plantillaSeleccionada as TipoComunicacion);
                  }}
                  style={{ fontSize: '0.76rem' }}
                >
                  <Send size={12} /> Usar en Enviar Mensaje
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleGuardarPlantilla}
                  disabled={guardandoPlantilla}
                  style={{ fontSize: '0.76rem', gap: '0.35rem' }}
                >
                  <Save size={13} /> {guardandoPlantilla ? 'Guardando en Supabase…' : 'Guardar en Supabase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA 3: HISTORIAL DE COMUNICACIONES
          ======================================================== */}
      {tabActiva === 'historial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingTop: '0.5rem' }}>
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
                title="Limpiar registro de auditoría local"
              >
                <Trash2 size={12} /> Limpiar registro
              </button>
            )}
          </div>

          <div className="avail-table">
            {comunicacionesFiltradas.length === 0 ? (
              <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '2rem' }}>
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
                        <span style={{ fontSize: '0.76rem', color: '#25d366', fontWeight: 500 }}>
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
                          background: 'var(--surface-alt, #fafafa)',
                          padding: '0.45rem 0.65rem',
                          borderRadius: 'var(--rad-xs)',
                          maxHeight: '70px',
                          overflowY: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {c.mensaje}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: '0.72rem', gap: '0.3rem', color: '#25d366', borderColor: '#25d366' }}
                        title="Reenviar este mensaje por WhatsApp"
                        onClick={() => abrirWhatsApp(c.telefono, c.mensaje)}
                      >
                        <MessageCircle size={12} /> Reenviar
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}
                        title="Copiar mensaje"
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

      {/* ========================================================
          PESTAÑA 4: CONFIGURACIÓN DE WHATSAPP GLOBAL
          ======================================================== */}
      {tabActiva === 'config' && (
        <div style={{ maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
          <div className="wa-config-row">
            <div className="field" style={{ flex: 1 }}>
              <label>Número WhatsApp de Contacto Principal (Predeterminado)</label>
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
            <CheckCircle size={14} /> Número activo actual: +{currentWaNumber}
          </div>

          <div style={{ background: 'var(--surface-alt, #fafafa)', padding: '0.85rem', borderRadius: 'var(--rad-sm)', border: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <strong>Reglas de envío y consecutivos:</strong>
            <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0, lineHeight: '1.5' }}>
              <li>El número secuencial inicial lo otorga la cotización (ej: <code>1001</code>).</li>
              <li>A partir de ahí, todos los documentos vinculados (Separación, Abono, Estado de Cuenta, Paz y Salvo, Menú) conservan exactamente el mismo número base, modificando dinámicamente el prefijo (<code>COT-1001</code>, <code>SEP-1001</code>, <code>ABO-1001</code>, etc.).</li>
              <li>Al hacer clic en "Descargar PDF y Enviar por WhatsApp", el documento se compila en tu equipo y se genera un enlace público directo que se inserta en el chat.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
