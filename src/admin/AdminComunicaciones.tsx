import React, { useState } from 'react';
import {
  MessageCircle, Send, FileText, CheckCircle, Clock, Copy, Check,
  Download, Users, ClipboardList, Utensils, RefreshCw, Trash2, Settings,
  AlertTriangle, Phone, ExternalLink, BookOpen, CreditCard
} from 'lucide-react';
import type {
  Cliente, Finca, Reserva, CotizacionDB, Menu, Pago, TipoComunicacion, Comunicacion
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
} from '../services/whatsapp';
import {
  generarDocSeparacion,
  generarComprobantePago,
  generarEstadoCuenta,
  generarPazYSalvo,
  generarPropuestaAlimentacion,
} from '../services/documentos';

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

  // Configuración de número global
  const [waGlobalInput, setWaGlobalInput] = useState<string>(currentWaNumber);

  // Filtro historial
  const [filtroTipoHistorial, setFiltroTipoHistorial] = useState<string>('todos');

  // Al cambiar el tipo de plantilla o la selección, regenerar mensaje
  const actualizarPlantilla = (
    nuevoTipo: TipoComunicacion,
    resId = reservaId,
    cotId = cotizacionId,
    cliId = clienteId,
    pId = pagoId
  ) => {
    let msg = '';
    let tel = telefonoInput;
    let nom = destinatarioNombre;

    if (nuevoTipo === 'cotizacion') {
      const c = cotizaciones.find(x => x.id === cotId) || cotizaciones[0];
      if (c) {
        msg = plantillaCotizacion(c, c.fincas, c.clientes);
        tel = c.clientes?.whatsapp || tel;
        nom = c.clientes ? `${c.clientes.nombre} ${c.clientes.apellido || ''}`.trim() : nom;
      }
    } else if (nuevoTipo === 'separacion') {
      const r = reservas.find(x => x.id === resId) || reservas[0];
      if (r) {
        msg = plantillaSeparacion(r);
        tel = r.clientes?.whatsapp || r.clientes?.telefono || tel;
        nom = r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.trim() : nom;
      }
    } else if (nuevoTipo === 'abono') {
      const r = reservas.find(x => x.id === resId) || reservas[0];
      if (r) {
        const pagos = r.pagos || [];
        const p = pagos.find(x => x.id === pId) || pagos[0] || {
          id: 'pago-temp',
          reserva_id: r.id,
          tipo: 'abono',
          fecha: new Date().toISOString().split('T')[0],
          valor: r.separacion || 0,
        } as Pago;
        msg = plantillaComprobantePago(r, p);
        tel = r.clientes?.whatsapp || r.clientes?.telefono || tel;
        nom = r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.trim() : nom;
      }
    } else if (nuevoTipo === 'estado_cuenta') {
      const r = reservas.find(x => x.id === resId) || reservas[0];
      if (r) {
        msg = plantillaEstadoCuenta(r);
        tel = r.clientes?.whatsapp || r.clientes?.telefono || tel;
        nom = r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.trim() : nom;
      }
    } else if (nuevoTipo === 'paz_salvo') {
      const r = reservas.find(x => x.id === resId) || reservas[0];
      if (r) {
        msg = plantillaPazYSalvo(r);
        tel = r.clientes?.whatsapp || r.clientes?.telefono || tel;
        nom = r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.trim() : nom;
      }
    } else if (nuevoTipo === 'menu') {
      const c = cotizaciones.find(x => x.id === cotId) || cotizaciones[0];
      const m = (c && menus.find(x => x.id === c.menu_id)) || menus[0];
      if (m) {
        msg = plantillaPropuestaAlimentacion({
          menu: m,
          cliente: c?.clientes,
          finca: c?.fincas,
          personas: c?.personas || 4,
          cantidadServicios: c?.cantidad_alimentacion || 1,
        });
        if (c?.clientes) {
          tel = c.clientes.whatsapp || tel;
          nom = `${c.clientes.nombre} ${c.clientes.apellido || ''}`.trim();
        }
      }
    } else if (nuevoTipo === 'recordatorio_pago') {
      const r = reservas.find(x => x.id === resId) || reservas[0];
      if (r) {
        msg = plantillaRecordatorioPago(r);
        tel = r.clientes?.whatsapp || r.clientes?.telefono || tel;
        nom = r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.trim() : nom;
      }
    } else if (nuevoTipo === 'bienvenida') {
      const r = reservas.find(x => x.id === resId) || reservas[0];
      if (r) {
        msg = plantillaBienvenida(r);
        tel = r.clientes?.whatsapp || r.clientes?.telefono || tel;
        nom = r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.trim() : nom;
      }
    } else {
      // personalizado
      const cli = clientes.find(x => x.id === cliId);
      if (cli) {
        tel = cli.whatsapp || cli.telefono || tel;
        nom = `${cli.nombre} ${cli.apellido || ''}`.trim();
        msg = `Hola, *${nom}* 👋\n\nTe escribimos de *Control de Fincas Campestres*.`;
      } else {
        msg = `Hola 👋\n\nTe escribimos de *Control de Fincas Campestres*.`;
      }
    }

    setMensajeTexto(msg);
    if (tel) setTelefonoInput(formatearTelefonoWhatsApp(tel));
    if (nom) setDestinatarioNombre(nom);
  };

  // Inicializar al cargar
  React.useEffect(() => {
    actualizarPlantilla('cotizacion');
  }, []);

  const handleTipoChange = (nuevo: TipoComunicacion) => {
    setTipoSeleccionado(nuevo);
    actualizarPlantilla(nuevo);
  };

  const handleCotizacionChange = (id: string) => {
    setCotizacionId(id);
    actualizarPlantilla(tipoSeleccionado, reservaId, id, clienteId, pagoId);
  };

  const handleReservaChange = (id: string) => {
    setReservaId(id);
    const r = reservas.find(x => x.id === id);
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

  // Determinar si el tipo actual requiere documento PDF
  const tieneDocumentoPdf = [
    'separacion', 'abono', 'estado_cuenta', 'paz_salvo', 'menu'
  ].includes(tipoSeleccionado);

  const nombreDocumento =
    tipoSeleccionado === 'separacion' ? 'Documento Oficial de Separación (PDF)' :
    tipoSeleccionado === 'abono' ? 'Comprobante de Abono / Pago (PDF)' :
    tipoSeleccionado === 'estado_cuenta' ? 'Estado de Cuenta Consolidado (PDF)' :
    tipoSeleccionado === 'paz_salvo' ? 'Certificado de Paz y Salvo (PDF)' :
    tipoSeleccionado === 'menu' ? 'Propuesta Gastronómica de Menú (PDF)' : '';

  const ejecutarDescargaPdf = async () => {
    const r = reservas.find(x => x.id === reservaId) || reservas[0];
    const c = cotizaciones.find(x => x.id === cotizacionId) || cotizaciones[0];

    switch (tipoSeleccionado) {
      case 'separacion':
        if (r) generarDocSeparacion(r);
        break;
      case 'abono':
        if (r) {
          const p = r.pagos?.find(x => x.id === pagoId) || r.pagos?.[0];
          if (p) generarComprobantePago(r, p);
          else showToast('Selecciona o registra un pago primero', 'error');
        }
        break;
      case 'estado_cuenta':
        if (r) generarEstadoCuenta(r);
        break;
      case 'paz_salvo':
        if (r) {
          if (calcularSaldo(r) > 0) {
            showToast('El saldo debe ser $0 para generar Paz y Salvo', 'error');
            return false;
          }
          generarPazYSalvo(r);
        }
        break;
      case 'menu':
        const m = (c && menus.find(x => x.id === c.menu_id)) || menus[0];
        if (m) {
          await generarPropuestaAlimentacion({
            menu: m,
            cliente: c?.clientes,
            finca: c?.fincas,
            personas: c?.personas || 4,
            cantidadServicios: c?.cantidad_alimentacion || 1,
          });
        }
        break;
    }
    return true;
  };

  const handleCopiar = async () => {
    const ok = await copiarAlPortapapeles(mensajeTexto);
    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      showToast('Mensaje copiado al portapapeles 📋', 'success');
    }
  };

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
    try {
      // 1. Si está activo descargar PDF y aplica, generarlo primero (Regla obligatoria)
      if (tieneDocumentoPdf && descargarPdf) {
        const okPdf = await ejecutarDescargaPdf();
        if (okPdf === false) {
          setProcesando(false);
          return;
        }
      }

      // 2. Abrir WhatsApp
      abrirWhatsApp(telLimpio, mensajeTexto);

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
        mensaje: mensajeTexto,
        estado: 'enviado',
      });

      showToast('WhatsApp abierto y comunicación registrada ✅', 'success');
    } catch (err: any) {
      showToast(`Error al procesar comunicación: ${err.message}`, 'error');
    } finally {
      setProcesando(false);
    }
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

  return (
    <div className="panel">
      {/* Encabezado */}
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#25d366' }}>
            <MessageCircle size={20} />
            <span>Comunicaciones y WhatsApp</span>
          </div>
          <div className="text-xs text-muted mt-1">
            Gestión integral de mensajería con clientes, envío de cotizaciones, documentos PDF y recordatorios.
          </div>
        </div>

        {/* Pestañas */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm${tabActiva === 'envio' ? ' btn-primary' : ''}`}
            onClick={() => setTabActiva('envio')}
            style={{ fontSize: '0.76rem', gap: '0.35rem' }}
          >
            <Send size={13} /> Enviar Mensaje
          </button>
          <button
            className={`btn btn-sm${tabActiva === 'historial' ? ' btn-primary' : ''}`}
            onClick={() => setTabActiva('historial')}
            style={{ fontSize: '0.76rem', gap: '0.35rem' }}
          >
            <Clock size={13} /> Historial ({comunicaciones.length})
          </button>
          <button
            className={`btn btn-sm${tabActiva === 'plantillas' ? ' btn-primary' : ''}`}
            onClick={() => setTabActiva('plantillas')}
            style={{ fontSize: '0.76rem', gap: '0.35rem' }}
          >
            <BookOpen size={13} /> Plantillas
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
          PESTAÑA 1: CENTRO DE ENVÍOS RÁPIDOS
          ======================================================== */}
      {tabActiva === 'envio' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', paddingTop: '0.5rem' }}>
          {/* Columna Izquierda: Configuración del Mensaje */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {/* 1. Selector de Plantilla */}
            <div className="field">
              <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>1. Tipo de Comunicación / Documento</label>
              <select
                value={tipoSeleccionado}
                onChange={e => handleTipoChange(e.target.value as TipoComunicacion)}
                style={{ fontSize: '0.85rem', fontWeight: 500 }}
              >
                <option value="cotizacion">📄 Cotización Oficial</option>
                <option value="separacion">🎉 Documento de Separación (PDF)</option>
                <option value="abono">💳 Comprobante de Abono / Pago (PDF)</option>
                <option value="estado_cuenta">📊 Estado de Cuenta Consolidado (PDF)</option>
                <option value="paz_salvo">🏅 Certificado de Paz y Salvo (PDF)</option>
                <option value="menu">🍽️ Propuesta de Menú / Alimentación (PDF)</option>
                <option value="recordatorio_pago">⏰ Recordatorio Amistoso de Saldo</option>
                <option value="bienvenida">👋 Bienvenida e Instrucciones de Llegada</option>
                <option value="personalizado">💬 Mensaje Personalizado Libre</option>
              </select>
            </div>

            {/* 2. Selectores dependientes */}
            {tipoSeleccionado === 'cotizacion' && (
              <div className="field">
                <label style={{ fontSize: '0.78rem' }}>Seleccionar Cotización</label>
                <select
                  value={cotizacionId}
                  onChange={e => handleCotizacionChange(e.target.value)}
                  style={{ fontSize: '0.82rem' }}
                >
                  <option value="">— Seleccionar cotización —</option>
                  {cotizaciones.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.fincas?.nombre} · {c.clientes ? `${c.clientes.nombre} ${c.clientes.apellido || ''}` : 'Sin cliente'} · {formatCOP(c.total)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {['separacion', 'estado_cuenta', 'paz_salvo', 'recordatorio_pago', 'bienvenida'].includes(tipoSeleccionado) && (
              <div className="field">
                <label style={{ fontSize: '0.78rem' }}>Seleccionar Reserva</label>
                <select
                  value={reservaId}
                  onChange={e => handleReservaChange(e.target.value)}
                  style={{ fontSize: '0.82rem' }}
                >
                  <option value="">— Seleccionar reserva registrada —</option>
                  {reservas.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.fincas?.nombre} · {r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}` : 'Cliente'} ({formatFecha(r.fecha_inicio)})
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
                        {r.fincas?.nombre} · {r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ''}` : 'Cliente'}
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
                      {c.fincas?.nombre} · {c.alimentacion || 'Menú'} · {c.clientes?.nombre || 'Cliente'}
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
                  Siguiendo las reglas del Plan Maestro, el documento PDF se genera primero para que puedas adjuntarlo en la conversación de WhatsApp.
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={ejecutarDescargaPdf}
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
                    <span>Descargar al enviar</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Vista previa y acción de envío */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MessageCircle size={14} style={{ color: '#25d366' }} /> Vista previa del mensaje (editable)
              </label>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleCopiar}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
              >
                {copiado ? <><Check size={11} style={{ color: 'var(--success)' }} /> Copiado</> : <><Copy size={11} /> Copiar texto</>}
              </button>
            </div>

            <textarea
              rows={15}
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
                minHeight: '260px',
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
                  ? 'Generando y enviando…'
                  : (tieneDocumentoPdf && descargarPdf ? 'Descargar PDF y Enviar por WhatsApp' : 'Abrir chat de WhatsApp')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA 2: HISTORIAL DE COMUNICACIONES
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
          PESTAÑA 3: CATÁLOGO DE PLANTILLAS
          ======================================================== */}
      {tabActiva === 'plantillas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', paddingTop: '0.5rem' }}>
          {[
            {
              titulo: '📄 Cotización Oficial',
              desc: 'Desglose económico completo con fechas, noches, personas, desglose de alojamiento y alimentación seleccionada.',
              tipo: 'cotizacion' as TipoComunicacion,
              badge: 'Automática',
            },
            {
              titulo: '🎉 Documento de Separación',
              desc: 'Confirmación formal de reserva con anticipo recibido, saldo pendiente, fechas y aviso de PDF de separación adjunto.',
              tipo: 'separacion' as TipoComunicacion,
              badge: 'PDF Vinculado',
            },
            {
              titulo: '💳 Comprobante de Abono / Pago',
              desc: 'Recibo oficial del pago con fecha, tipo (abono/separación), monto cancelado y nuevo saldo restante de la finca.',
              tipo: 'abono' as TipoComunicacion,
              badge: 'PDF Vinculado',
            },
            {
              titulo: '📊 Estado de Cuenta',
              desc: 'Historial completo de pagos recibidos, balance general y aviso de documento PDF de estado de cuenta adjunto.',
              tipo: 'estado_cuenta' as TipoComunicacion,
              badge: 'PDF Vinculado',
            },
            {
              titulo: '🏅 Certificado de Paz y Salvo',
              desc: 'Certificación 100% de saldo $0 COP al día, habilitado únicamente cuando la reserva está totalmente pagada.',
              tipo: 'paz_salvo' as TipoComunicacion,
              badge: 'PDF Vinculado',
            },
            {
              titulo: '🍽️ Propuesta de Menú / Alimentación',
              desc: 'Presentación gastronómica con detalle de platos, precio por comensal, valor total y propuesta formal en PDF.',
              tipo: 'menu' as TipoComunicacion,
              badge: 'PDF Vinculado',
            },
            {
              titulo: '⏰ Recordatorio Amistoso de Saldo',
              desc: 'Notificación amable para que el cliente recuerde cancelar el saldo de su estancia antes de la llegada.',
              tipo: 'recordatorio_pago' as TipoComunicacion,
              badge: 'Operativo',
            },
            {
              titulo: '👋 Bienvenida e Instrucciones de Llegada',
              desc: 'Mensaje de recepción con recomendaciones de viaje, contacto del anfitrión / mayordomo y coordenadas.',
              tipo: 'bienvenida' as TipoComunicacion,
              badge: 'Huéspedes',
            },
          ].map(p => (
            <div
              key={p.tipo}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--rad-sm)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.65rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.85rem' }}>{p.titulo}</strong>
                  <span className="status-badge s-avail" style={{ fontSize: '0.65rem' }}>{p.badge}</span>
                </div>
                <p className="text-xs text-muted" style={{ marginTop: '0.4rem', lineHeight: '1.4' }}>
                  {p.desc}
                </p>
              </div>

              <button
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setTabActiva('envio');
                  handleTipoChange(p.tipo);
                }}
                style={{ fontSize: '0.72rem', alignSelf: 'flex-start' }}
              >
                Usar plantilla
              </button>
            </div>
          ))}
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
            <strong>Nota de configuración:</strong>
            <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0, lineHeight: '1.5' }}>
              <li>Este es el número al que se redirigen las consultas de cotización desde la página pública del cliente.</li>
              <li>Cada finca puede tener opcionalmente su propio número de WhatsApp asignado en su formulario de edición individual.</li>
              <li>Al enviar documentos a clientes desde el módulo de reservas o cotizaciones, el sistema utiliza el WhatsApp registrado directamente en el perfil del cliente.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
