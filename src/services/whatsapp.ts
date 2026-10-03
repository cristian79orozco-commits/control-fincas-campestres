/**
 * Servicio Independiente de WhatsApp y Comunicaciones — Fase 3
 * 
 * Reglas de diseño del Plan Maestro:
 * - Diseñar como servicio independiente para no acoplarla al resto.
 * - Analizar y mantener la integración existente (wa.me / WhatsApp Web / App).
 * - Los documentos PDF deben generarse primero y luego enviarse desde la reserva/cotización.
 * - Capacidades:
 *    - Enviar mensajes y recordatorios
 *    - Enviar cotizaciones
 *    - Enviar documentos PDF (Separación)
 *    - Enviar comprobantes de abono
 *    - Enviar estados de cuenta
 *    - Enviar paz y salvo
 *    - Enviar propuestas de menús / alimentación
 */

import type { Reserva, Pago, CotizacionDB, Cliente, Finca, TipoComunicacion } from '../types';
import { calcularSaldo } from '../types';
import {
  generarDocSeparacion,
  generarComprobantePago,
  generarEstadoCuenta,
  generarPazYSalvo,
  generarPropuestaAlimentacion,
  type PropuestaAlimentacionDatos,
} from './documentos';
import { DEFAULT_WA_NUMBER } from './supabase';
import { formatearConsecutivoConPrefijo, type TipoDocumentoPrefijo } from '../utils/consecutivos';

// ---------------------------------------------------------------
// Utilidades de formateo
// ---------------------------------------------------------------
export function formatearTelefonoWhatsApp(tel?: string | null): string {
  if (!tel) return '';
  const digits = tel.replace(/[^0-9]/g, '');
  if (!digits) return '';
  // Si tiene 10 dígitos (ej: 3176827093 típico celular colombiano), anteponer indicativo 57
  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`;
  }
  return digits;
}

export function formatCOP(v: number): string {
  return '$' + v.toLocaleString('es-CO') + ' COP';
}

export function formatFecha(f?: string | null): string {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

export function calcularNoches(fi?: string, ff?: string): number {
  if (!fi || !ff) return 1;
  const d = new Date(ff + 'T00:00:00').getTime() - new Date(fi + 'T00:00:00').getTime();
  return Math.max(1, Math.round(d / 86400000));
}

// ---------------------------------------------------------------
// Motor de Tokens y Plantillas Personalizadas
// ---------------------------------------------------------------
export function renderizarPlantillaPersonalizada(template: string, tokens: Record<string, string>): string {
  let resultado = template;
  for (const [clave, valor] of Object.entries(tokens)) {
    const regex = new RegExp(`\\{\\{${clave}\\}\\}`, 'gi');
    resultado = resultado.replace(regex, valor);
  }
  return resultado;
}

// ---------------------------------------------------------------
// Generación de Enlaces de WhatsApp
// ---------------------------------------------------------------
export function generarUrlWhatsApp(telefono: string, mensaje: string): string {
  const telLimpio = formatearTelefonoWhatsApp(telefono) || DEFAULT_WA_NUMBER;
  return `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensaje)}`;
}

export function abrirWhatsApp(telefono: string, mensaje: string): void {
  const url = generarUrlWhatsApp(telefono, mensaje);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    } else {
      // Fallback para contextos no seguros o navegadores antiguos
      const textArea = document.createElement('textarea');
      textArea.value = texto;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const ex = document.execCommand('copy');
      document.body.removeChild(textArea);
      return ex;
    }
  } catch (err) {
    console.error('Error al copiar al portapapeles:', err);
    return false;
  }
}

// ---------------------------------------------------------------
// Plantillas de Mensajes de WhatsApp
// ---------------------------------------------------------------

/**
 * 1. Plantilla: Cotización Oficial
 */
export function plantillaCotizacion(
  cotizacion: CotizacionDB,
  finca?: { nombre?: string } | null,
  cliente?: { nombre?: string; apellido?: string | null; whatsapp?: string | null } | null,
  enlacePdf?: string
): string {
  const cNombre = cliente ? `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() : (cotizacion.clientes ? `${cotizacion.clientes.nombre} ${cotizacion.clientes.apellido || ''}`.trim() : 'Estimado/a cliente');
  const fNombre = finca?.nombre || cotizacion.fincas?.nombre || 'Finca Campestre';
  const noches = calcularNoches(cotizacion.fecha_inicio, cotizacion.fecha_fin);
  const tieneAlim = (cotizacion.costo_alimentacion || 0) > 0 || (cotizacion.alimentacion && cotizacion.alimentacion !== 'Sin alimentación');
  const consecPrefijado = formatearConsecutivoConPrefijo(cotizacion.consecutivo, 'cotizacion');

  let msg = `🏡 *COTIZACIÓN OFICIAL DE ESTANCIA*
*Control de Fincas Campestres*

¡Hola, *${cNombre}*! 👋 Con gusto te presentamos los detalles de tu cotización para disfrutar de una experiencia campestre inolvidable.

📍 *Finca solicitada:* ${fNombre}
🆔 *Consecutivo N°:* ${consecPrefijado}
📅 *Fecha de llegada:* ${formatFecha(cotizacion.fecha_inicio)}
📅 *Fecha de salida:* ${formatFecha(cotizacion.fecha_fin)}
🌙 *Noches de estancia:* ${noches}
👥 *Capacidad / Personas:* ${cotizacion.personas} personas

💵 *RESUMEN DE LIQUIDACIÓN:*
• Alojamiento: ${formatCOP(cotizacion.subtotal_alojamiento || 0)}`;

  if (tieneAlim) {
    msg += `\n• Menú / Alimentación: ${formatCOP(cotizacion.costo_alimentacion || 0)} (${cotizacion.alimentacion || 'Seleccionado'})`;
  }
  if (cotizacion.descuento && cotizacion.descuento > 0) {
    msg += `\n• Descuento especial: -${formatCOP(cotizacion.descuento)}`;
  }
  if (cotizacion.recargo && cotizacion.recargo > 0) {
    msg += `\n• Recargos adicionales: +${formatCOP(cotizacion.recargo)}`;
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL DE LA COTIZACIÓN:* *${formatCOP(cotizacion.total || 0)}*
━━━━━━━━━━━━━━━━━━━━

📝 *Estado:* ${cotizacion.estado.toUpperCase()}
`;

  if (cotizacion.notas) {
    msg += `\n📌 *Notas adicionales:* ${cotizacion.notas}\n`;
  }

  if (enlacePdf) {
    msg += `\n📄 *Documento Oficial Adjunto (PDF):*\n${enlacePdf}\n`;
  }

  msg += `\n💡 Para separar tus fechas y asegurar disponibilidad, por favor indícanos si deseas proceder con el pago del anticipo de reserva. ¡Estamos atentos a tus inquietudes! ✨`;

  return msg;
}

/**
 * 1.1 Plantilla Oficial: Solicitud de Abono para Bloqueo de Fechas
 */
export function plantillaPedirAbonoCotizacion(
  cotizacion: CotizacionDB,
  finca?: { nombre?: string } | null,
  cliente?: { nombre?: string; apellido?: string | null; whatsapp?: string | null } | null,
  bancosInfo?: { banco?: string; tipoCuenta?: string; cuenta?: string; titular?: string; nit?: string } | null,
  porcentaje: number = 50
): string {
  const cNombre = cliente ? `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() : (cotizacion.clientes ? `${cotizacion.clientes.nombre} ${cotizacion.clientes.apellido || ''}`.trim() : 'Estimado/a cliente');
  const fNombre = finca?.nombre || cotizacion.fincas?.nombre || 'Finca Campestre';
  const noches = calcularNoches(cotizacion.fecha_inicio, cotizacion.fecha_fin);
  const total = cotizacion.total || 0;
  const abonoSugerido = Math.round(total * (porcentaje / 100));

  let msg = `🌿 *SOLICITUD OFICIAL DE ABONO Y BLOQUEO DE FECHAS*
*Control de Fincas Campestres*

Hola, *${cNombre}* 👋
Adjuntamos la propuesta oficial de cotización para tu estadía en *${fNombre}*.

📅 *Fechas solicitadas:* ${formatFecha(cotizacion.fecha_inicio)} al ${formatFecha(cotizacion.fecha_fin)} (${noches} noche${noches > 1 ? 's' : ''})
👥 *Huéspedes:* ${cotizacion.personas} personas
${cotizacion.consecutivo ? `🆔 *Cotización N°:* ${cotizacion.consecutivo}\n` : ''}💰 *Valor Total:* *${formatCOP(total)}*

━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 *ABONO REQUERIDO (${porcentaje}%):* *${formatCOP(abonoSugerido)}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
_Con este abono garantizamos tu cupo y bloqueamos de inmediato la disponibilidad de la finca en el calendario oficial._

💳 *DATOS DE CONSIGNACIÓN / TRANSFERENCIA:*`;

  if (bancosInfo && bancosInfo.cuenta) {
    msg += `
• *Banco:* ${bancosInfo.banco || 'Bancolombia'}
• *Tipo de Cuenta:* ${bancosInfo.tipoCuenta || 'Ahorros'}
• *Número de Cuenta:* ${bancosInfo.cuenta}
• *Titular:* ${bancosInfo.titular || 'Administración de Fincas'}
${bancosInfo.nit ? `• *Identificación:* ${bancosInfo.nit}` : ''}`;
  } else {
    msg += `
• Por favor consúltanos los datos de transferencia directa (Bancolombia, Nequi o Daviplata).`;
  }

  msg += `

📲 *Siguiente paso:* Una vez realices la transferencia, por favor compártenos el comprobante por este medio para emitir tu *Documento Oficial de Reserva* y bloquear formalmente tus fechas. ¡Quedamos muy atentos! ✨`;

  return msg;
}

/**
 * 2. Plantilla: Documento de Separación / Reserva Confirmada
 */
export function plantillaSeparacion(reserva: Reserva, enlacePdf?: string): string {
  const clienteNombre = reserva.clientes ? `${reserva.clientes.nombre} ${reserva.clientes.apellido || ''}`.trim() : 'Estimado/a cliente';
  const fincaNombre = reserva.fincas?.nombre || 'Finca Campestre';
  const saldo = calcularSaldo(reserva);
  const anticipo = reserva.separacion || 0;
  const noches = calcularNoches(reserva.fecha_inicio, reserva.fecha_fin);
  const consecPrefijado = formatearConsecutivoConPrefijo(reserva.consecutivo, 'separacion');

  let msg = `🎉 *CONFIRMACIÓN DE RESERVA Y SEPARACIÓN*
*Control de Fincas Campestres*

Hola, *${clienteNombre}* 🙌 Hemos emitido satisfactoriamente tu *Documento Oficial de Separación*.

📍 *Finca reservada:* ${fincaNombre}
🆔 *Consecutivo de Reserva:* ${consecPrefijado}
📅 *Llegada (Check-in):* ${formatFecha(reserva.fecha_inicio)}
📅 *Salida (Check-out):* ${formatFecha(reserva.fecha_fin)}
🌙 *Noches:* ${noches} | 👥 *Huéspedes:* ${reserva.personas} personas

📊 *ESTADO ECONÓMICO DE LA RESERVA:*
• Valor Total Acordado: *${formatCOP(reserva.valor_total)}*
• Anticipo de Separación: *${formatCOP(anticipo)}* ✅
• Saldo Pendiente: *${formatCOP(saldo)}* ${saldo <= 0 ? '🟢 (Completamente pagada)' : '⚠️'}

📄 *DOCUMENTO PDF ADJUNTO:*
Hemos generado tu documento oficial de separación en formato PDF con todos los términos, condiciones y políticas de uso de la finca.`;

  if (enlacePdf) {
    msg += `\n\n📎 *Enlace de consulta y descarga directa:*\n${enlacePdf}`;
  }

  if (saldo > 0) {
    msg += `\n\n⏰ *Recordatorio:* El saldo restante de *${formatCOP(saldo)}* deberá ser cancelado antes del ingreso a las instalaciones.`;
  }

  msg += `\n\n¡Te agradecemos por tu preferencia y te deseamos una maravillosa estadía campestre! 🌿🏡`;
  return msg;
}

/**
 * 3. Plantilla: Comprobante de Abono / Pago
 */
export function plantillaComprobantePago(reserva: Reserva, pago: Pago, enlacePdf?: string): string {
  const clienteNombre = reserva.clientes ? `${reserva.clientes.nombre} ${reserva.clientes.apellido || ''}`.trim() : 'Estimado/a cliente';
  const fincaNombre = reserva.fincas?.nombre || 'Finca Campestre';
  const saldo = calcularSaldo(reserva);
  const consecPrefijado = formatearConsecutivoConPrefijo(reserva.consecutivo, 'abono');

  const etiquetaTipo =
    pago.tipo === 'separacion' ? 'Separación de fechas' :
    pago.tipo === 'abono' ? 'Abono a reserva' :
    pago.tipo === 'pago_total' ? 'Cancelación total' : 'Devolución';

  let msg = `💳 *COMPROBANTE OFICIAL DE PAGO / ABONO*
*Control de Fincas Campestres*

Hola, *${clienteNombre}* ✅ Confirmamos la recepción de tu pago para la finca *${fincaNombre}*.
🆔 *Comprobante N°:* ${consecPrefijado}

📝 *DETALLE DE LA TRANSACCIÓN:*
• Concepto: *${etiquetaTipo}*
• Fecha del pago: ${formatFecha(pago.fecha)}
• Valor cancelado: *${formatCOP(pago.valor)}*
${pago.observacion ? `• Observación / Ref: ${pago.observacion}\n` : ''}
━━━━━━━━━━━━━━━━━━━━
💰 *ESTADO DE CUENTA ACTUALIZADO:*
• Total de la Reserva: ${formatCOP(reserva.valor_total)}
• *Saldo Restante:* *${formatCOP(saldo)}* ${saldo <= 0 ? '🟢 (Saldo al día)' : ''}
━━━━━━━━━━━━━━━━━━━━

📄 Adjuntamos tu recibo y comprobante digital en PDF emitido por el sistema.`;

  if (enlacePdf) {
    msg += `\n\n📎 *Descarga tu comprobante oficial aquí:*\n${enlacePdf}`;
  }

  msg += `\n\n¡Muchas gracias por tu oportuno cumplimiento! 🙏`;
  return msg;
}

/**
 * 4. Plantilla: Estado de Cuenta
 */
export function plantillaEstadoCuenta(reserva: Reserva, enlacePdf?: string): string {
  const clienteNombre = reserva.clientes ? `${reserva.clientes.nombre} ${reserva.clientes.apellido || ''}`.trim() : 'Estimado/a cliente';
  const fincaNombre = reserva.fincas?.nombre || 'Finca Campestre';
  const saldo = calcularSaldo(reserva);
  const totalPagado = reserva.valor_total - saldo;
  const pagos = reserva.pagos || [];
  const consecPrefijado = formatearConsecutivoConPrefijo(reserva.consecutivo, 'estado_cuenta');

  let historialTexto = '';
  if (pagos.length > 0) {
    historialTexto = pagos.map((p, idx) =>
      `  ${idx + 1}. ${formatFecha(p.fecha)} | ${p.tipo.toUpperCase()}: ${formatCOP(p.valor)}`
    ).join('\n');
  } else {
    historialTexto = '  (Sin abonos registrados aún)';
  }

  let msg = `📊 *ESTADO DE CUENTA DE RESERVA*
*Control de Fincas Campestres*

Hola, *${clienteNombre}* 📋 Te compartimos el balance financiero detallado de tu reserva:

📍 *Finca:* ${fincaNombre}
🆔 *Estado de Cuenta N°:* ${consecPrefijado}
📅 *Estancia:* ${formatFecha(reserva.fecha_inicio)} al ${formatFecha(reserva.fecha_fin)}

💳 *HISTORIAL DE ABONOS REGISTRADOS:*
${historialTexto}

━━━━━━━━━━━━━━━━━━━━
• Valor Total Reserva: ${formatCOP(reserva.valor_total)}
• Total Pagado a la Fecha: ${formatCOP(totalPagado)}
• *SALDO PENDIENTE:* *${formatCOP(saldo)}* ${saldo <= 0 ? '🟢 (PAZ Y SALVO)' : '⚠️'}
━━━━━━━━━━━━━━━━━━━━

📄 Hemos generado el Estado de Cuenta consolidado en PDF con la relación detallada de todos los movimientos.`;

  if (enlacePdf) {
    msg += `\n\n📎 *Descarga tu Estado de Cuenta en PDF aquí:*\n${enlacePdf}`;
  }

  msg += `\n\nCualquier duda o aclaración sobre los pagos, con gusto te atendemos. 🤝`;
  return msg;
}

/**
 * 5. Plantilla: Paz y Salvo Oficial
 */
export function plantillaPazYSalvo(reserva: Reserva, enlacePdf?: string): string {
  const clienteNombre = reserva.clientes ? `${reserva.clientes.nombre} ${reserva.clientes.apellido || ''}`.trim() : 'Estimado/a cliente';
  const fincaNombre = reserva.fincas?.nombre || 'Finca Campestre';
  const consecPrefijado = formatearConsecutivoConPrefijo(reserva.consecutivo, 'paz_salvo');

  let msg = `🏅 *CERTIFICADO OFICIAL DE PAZ Y SALVO*
*Control de Fincas Campestres*

Estimado/a *${clienteNombre}* 🌟

Nos complace certificarte que tu reserva para la finca *${fincaNombre}* se encuentra *100% CANCELADA Y AL DÍA*.
🆔 *Certificado N°:* ${consecPrefijado}

✅ *Estado Financiero:* PAZ Y SALVO
📅 *Fechas de Estadía:* ${formatFecha(reserva.fecha_inicio)} al ${formatFecha(reserva.fecha_fin)}
👥 *Huéspedes autorizados:* ${reserva.personas} personas
💰 *Saldo pendiente:* $0 COP

📄 Se adjunta tu documento formal de *Paz y Salvo* con código y sello de validación.`;

  if (enlacePdf) {
    msg += `\n\n📎 *Descarga tu Certificado de Paz y Salvo aquí:*\n${enlacePdf}`;
  }

  msg += `\n\n¡Todo está listo para tu llegada! En breve te enviaremos las indicaciones de ruta y el contacto del mayordomo anfitrión. 🌿☀️`;
  return msg;
}

/**
 * 6. Plantilla: Propuesta de Menú / Alimentación
 */
export function plantillaPropuestaAlimentacion(datos: PropuestaAlimentacionDatos, enlacePdf?: string): string {
  const cNombre = datos.cliente ? `${datos.cliente.nombre} ${datos.cliente.apellido || ''}`.trim() : 'Estimado/a cliente';
  const fNombre = datos.finca?.nombre || 'Finca Campestre';
  const total = (datos.menu.precio_pp || 0) * (datos.personas || 1) * (datos.cantidadServicios || 1);
  const consecPrefijado = formatearConsecutivoConPrefijo(datos.menu.id || '1001', 'menu');

  let msg = `🍽️ *PROPUESTA GASTRONÓMICA CAMPESTRE*
*Control de Fincas Campestres*

Hola, *${cNombre}* 👨‍🍳 Te presentamos la propuesta culinaria para tu estadía en *${fNombre}*:

🍲 *Menú seleccionado:* *${datos.menu.nombre}*
🏷️ *Categoría:* ${datos.menu.categoria}
🆔 *Propuesta N°:* ${consecPrefijado}
${datos.menu.descripcion ? `📝 *Descripción:* ${datos.menu.descripcion}\n` : ''}
👥 *Comensales:* ${datos.personas || 1} personas
🍽️ *Servicios / Días:* ${datos.cantidadServicios || 1}
💵 *Tarifa por persona:* ${formatCOP(datos.menu.precio_pp)}
━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL DEL SERVICIO:* *${formatCOP(total)}*
━━━━━━━━━━━━━━━━━━━━

${datos.menu.condiciones ? `📌 *Condiciones:* ${datos.menu.condiciones}\n` : ''}
📄 Te adjuntamos la propuesta formal en PDF con fotografías de los platos y las condiciones del servicio.`;

  if (enlacePdf) {
    msg += `\n\n📎 *Consulta la propuesta completa en PDF:*\n${enlacePdf}`;
  }

  msg += `\n\n¿Deseas que coordinemos y reservemos este menú para tus fechas? 👩‍🍳✨`;
  return msg;
}


/**
 * 7. Plantilla: Recordatorio Amistoso de Saldo
 */
export function plantillaRecordatorioPago(reserva: Reserva): string {
  const clienteNombre = reserva.clientes ? `${reserva.clientes.nombre} ${reserva.clientes.apellido || ''}`.trim() : 'Estimado/a cliente';
  const fincaNombre = reserva.fincas?.nombre || 'Finca Campestre';
  const saldo = calcularSaldo(reserva);

  return `⏰ *RECORDATORIO AMISTOSO DE SALDO*
*Control de Fincas Campestres*

Hola, *${clienteNombre}* 👋 Esperamos que te encuentres muy bien.

Te recordamos que se acerca la fecha de tu estadía en *${fincaNombre}*${reserva.consecutivo ? ` (Reserva N° ${reserva.consecutivo})` : ''} (Llegada: ${formatFecha(reserva.fecha_inicio)}).

📌 Tu saldo pendiente por liquidar es de *${formatCOP(saldo)}*.

Por favor compártenos el comprobante una vez realices la consignación o transferencia para emitir tu Paz y Salvo oficial. ¡Muchas gracias! 🌿🏡`;
}

/**
 * 8. Plantilla: Bienvenida e Instrucciones de Llegada
 */
export function plantillaBienvenida(reserva: Reserva): string {
  const clienteNombre = reserva.clientes ? `${reserva.clientes.nombre} ${reserva.clientes.apellido || ''}`.trim() : 'Estimado/a cliente';
  const fincaNombre = reserva.fincas?.nombre || 'Finca Campestre';

  return `👋 *¡BIENVENIDOS A ${fincaNombre.toUpperCase()}!*
*Control de Fincas Campestres*

Hola, *${clienteNombre}* 🌞 ¡Estamos muy emocionados por recibirte!

📅 *Llegada:* ${formatFecha(reserva.fecha_inicio)}
📅 *Salida:* ${formatFecha(reserva.fecha_fin)}
👥 *Personas:* ${reserva.personas}

🏡 *RECOMENDACIONES PARA TU LLEGADA:*
1. Recuerda llevar documento de identidad de los huéspedes para el registro.
2. El anfitrión / mayordomo estará esperándote para la entrega de llaves y recorrido inicial.
3. Te recomendamos llegar con luz natural para facilitar el trayecto por carretera rural.

Si necesitas la ubicación en tiempo real por Google Maps o Waze, ¡pídenosla por aquí! Te deseamos un descanso inolvidable. 🌺✨`;
}

// ---------------------------------------------------------------
// Función Central de Envío con Generación Previa de Documentos
// Cumple con la regla obligatoria:
// "Los documentos deben generarse primero y luego enviarse desde la reserva/cotización."
// ---------------------------------------------------------------

export interface EnviarWhatsAppOpciones {
  tipo: TipoComunicacion;
  telefonoDestino: string;
  reserva?: Reserva;
  pago?: Pago;
  cotizacion?: CotizacionDB;
  cliente?: Cliente;
  finca?: Finca;
  menuDatos?: PropuestaAlimentacionDatos;
  mensajePersonalizado?: string;
  generarPdfAntes?: boolean;
}

export async function ejecutarEnvioWhatsAppConDocumento(
  opciones: EnviarWhatsAppOpciones
): Promise<{ success: boolean; mensaje: string; error?: string }> {
  try {
    const { tipo, telefonoDestino, reserva, pago, cotizacion, cliente, finca, menuDatos, mensajePersonalizado, generarPdfAntes = true } = opciones;

    let mensajeFinal = '';

    // 1. Paso obligatorio: Generar y descargar el documento PDF si aplica
    if (generarPdfAntes) {
      switch (tipo) {
        case 'separacion':
          if (reserva) {
            generarDocSeparacion(reserva);
          }
          break;
        case 'abono':
          if (reserva && pago) {
            generarComprobantePago(reserva, pago);
          }
          break;
        case 'estado_cuenta':
          if (reserva) {
            generarEstadoCuenta(reserva);
          }
          break;
        case 'paz_salvo':
          if (reserva) {
            generarPazYSalvo(reserva);
          }
          break;
        case 'menu':
          if (menuDatos) {
            await generarPropuestaAlimentacion(menuDatos);
          }
          break;
      }
    }

    // 2. Determinar el mensaje de WhatsApp a enviar
    if (mensajePersonalizado && mensajePersonalizado.trim()) {
      mensajeFinal = mensajePersonalizado;
    } else {
      switch (tipo) {
        case 'cotizacion':
          if (cotizacion) {
            mensajeFinal = plantillaCotizacion(cotizacion, finca, cliente);
          }
          break;
        case 'separacion':
          if (reserva) {
            mensajeFinal = plantillaSeparacion(reserva);
          }
          break;
        case 'abono':
          if (reserva && pago) {
            mensajeFinal = plantillaComprobantePago(reserva, pago);
          }
          break;
        case 'estado_cuenta':
          if (reserva) {
            mensajeFinal = plantillaEstadoCuenta(reserva);
          }
          break;
        case 'paz_salvo':
          if (reserva) {
            mensajeFinal = plantillaPazYSalvo(reserva);
          }
          break;
        case 'menu':
          if (menuDatos) {
            mensajeFinal = plantillaPropuestaAlimentacion(menuDatos);
          }
          break;
        case 'recordatorio_pago':
          if (reserva) {
            mensajeFinal = plantillaRecordatorioPago(reserva);
          }
          break;
        case 'bienvenida':
          if (reserva) {
            mensajeFinal = plantillaBienvenida(reserva);
          }
          break;
        case 'personalizado':
          mensajeFinal = mensajePersonalizado || 'Hola, te escribimos de Control de Fincas Campestres.';
          break;
      }
    }

    if (!mensajeFinal) {
      throw new Error('No se pudo construir el contenido del mensaje.');
    }

    // 3. Abrir WhatsApp con el número del cliente
    abrirWhatsApp(telefonoDestino, mensajeFinal);

    return {
      success: true,
      mensaje: mensajeFinal,
    };
  } catch (err: any) {
    console.error('Error en servicio de WhatsApp:', err);
    return {
      success: false,
      mensaje: '',
      error: err.message || 'Error desconocido al procesar el envío de WhatsApp',
    };
  }
}

// ---------------------------------------------------------------
// Textos Predeterminados para el Editor de Plantillas
// ---------------------------------------------------------------
export const PLANTILLAS_PREDETERMINADAS: Record<string, string> = {
  cotizacion: `🏡 *COTIZACIÓN OFICIAL DE ESTANCIA*
*Control de Fincas Campestres*

¡Hola, *{{cliente}}*! 👋 Con gusto te presentamos los detalles de tu cotización para disfrutar de una experiencia campestre inolvidable.

📍 *Finca solicitada:* {{finca}}
🆔 *Consecutivo N°:* {{consecutivo}}
📅 *Estancia:* {{fechas}}
🌙 *Noches:* {{noches}} | 👥 *Personas:* {{personas}}

💰 *TOTAL DE LA COTIZACIÓN:* *{{total}}*

{{enlace_pdf}}

💡 Para separar tus fechas y asegurar disponibilidad, por favor indícanos si deseas proceder con el pago del anticipo de reserva. ¡Estamos atentos a tus inquietudes! ✨`,

  separacion: `🎉 *CONFIRMACIÓN DE RESERVA Y SEPARACIÓN*
*Control de Fincas Campestres*

Hola, *{{cliente}}* 🙌 Hemos emitido satisfactoriamente tu *Documento Oficial de Separación*.

📍 *Finca reservada:* {{finca}}
🆔 *Consecutivo de Reserva:* {{consecutivo}}
📅 *Estancia:* {{fechas}}
🌙 *Noches:* {{noches}} | 👥 *Huéspedes:* {{personas}} personas

📊 *ESTADO ECONÓMICO DE LA RESERVA:*
• Valor Total Acordado: *{{total}}*
• Anticipo de Separación: *{{anticipo}}* ✅
• Saldo Pendiente: *{{saldo}}*

{{enlace_pdf}}

¡Te agradecemos por tu preferencia y te deseamos una maravillosa estadía campestre! 🌿🏡`,

  abono: `💳 *COMPROBANTE OFICIAL DE PAGO / ABONO*
*Control de Fincas Campestres*

Hola, *{{cliente}}* ✅ Confirmamos la recepción de tu pago para la finca *{{finca}}*.
🆔 *Comprobante N°:* {{consecutivo}}

📝 *DETALLE DE LA TRANSACCIÓN:*
• Valor cancelado: *{{pago_valor}}*
• Saldo restante: *{{saldo}}*

{{enlace_pdf}}

¡Muchas gracias por tu oportuno cumplimiento! 🙏`,

  estado_cuenta: `📊 *ESTADO DE CUENTA DE RESERVA*
*Control de Fincas Campestres*

Hola, *{{cliente}}* 📋 Te compartimos el balance financiero detallado de tu reserva:

📍 *Finca:* {{finca}}
🆔 *Estado de Cuenta N°:* {{consecutivo}}
📅 *Estancia:* {{fechas}}

• Valor Total Reserva: {{total}}
• Anticipo / Pagos: {{anticipo}}
• *SALDO PENDIENTE:* *{{saldo}}*

{{enlace_pdf}}

Cualquier duda o aclaración sobre los pagos, con gusto te atendemos. 🤝`,

  paz_salvo: `🏅 *CERTIFICADO OFICIAL DE PAZ Y SALVO*
*Control de Fincas Campestres*

Estimado/a *{{cliente}}* 🌟

Nos complace certificarte que tu reserva para la finca *{{finca}}* se encuentra *100% CANCELADA Y AL DÍA*.
🆔 *Certificado N°:* {{consecutivo}}

✅ *Estado Financiero:* PAZ Y SALVO
📅 *Estadía:* {{fechas}}
👥 *Huéspedes:* {{personas}} personas
💰 *Saldo pendiente:* $0 COP

{{enlace_pdf}}

¡Todo está listo para tu llegada! Te deseamos un descanso inolvidable. 🌿☀️`,

  menu: `🍽️ *PROPUESTA GASTRONÓMICA CAMPESTRE*
*Control de Fincas Campestres*

Hola, *{{cliente}}* 👨‍🍳 Te presentamos la propuesta culinaria para tu estadía en *{{finca}}*:
🆔 *Propuesta N°:* {{consecutivo}}

👥 *Comensales:* {{personas}} personas
💰 *TOTAL DEL SERVICIO:* *{{total}}*

{{enlace_pdf}}

¿Deseas que coordinemos y reservemos este menú para tus fechas? 👩‍🍳✨`,

  recordatorio_pago: `⏰ *RECORDATORIO AMISTOSO DE SALDO*
*Control de Fincas Campestres*

Hola, *{{cliente}}* 👋 Esperamos que te encuentres muy bien.

Te recordamos que se acerca la fecha de tu estadía en *{{finca}}* (Reserva N° {{consecutivo}}).
Llegada programada: {{fecha_llegada}}.

📌 Tu saldo pendiente por liquidar es de *{{saldo}}*.

Por favor compártenos el comprobante una vez realices la consignación o transferencia para emitir tu Paz y Salvo oficial. ¡Muchas gracias! 🌿🏡`,

  bienvenida: `👋 *¡BIENVENIDOS A {{finca}}!*
*Control de Fincas Campestres*

Hola, *{{cliente}}* 🌞 ¡Estamos muy emocionados por recibirte!

📅 *Llegada:* {{fecha_llegada}}
📅 *Salida:* {{fecha_salida}}
👥 *Personas:* {{personas}}

🏡 *RECOMENDACIONES PARA TU LLEGADA:*
1. Recuerda llevar documento de identidad de los huéspedes para el registro.
2. El anfitrión / mayordomo estará esperándote para la entrega de llaves y recorrido inicial.
3. Te recomendamos llegar con luz natural para facilitar el trayecto por carretera rural.

Si necesitas la ubicación en tiempo real por Google Maps o Waze, ¡pídenosla por aquí! Te deseamos un descanso inolvidable. 🌺✨`
};

export function obtenerTokensParaMensaje(params: {
  tipo: TipoComunicacion;
  cotizacion?: CotizacionDB;
  reserva?: Reserva;
  cliente?: any;
  finca?: any;
  pago?: Pago;
  consecutivoBase?: string | number;
  enlacePdf?: string;
}): Record<string, string> {
  const { tipo, cotizacion, reserva, cliente, finca, pago, consecutivoBase, enlacePdf } = params;
  const numBase = consecutivoBase || reserva?.consecutivo || cotizacion?.consecutivo || '1001';
  const tipoPrefijo = (tipo === 'recordatorio_pago' || tipo === 'bienvenida' || tipo === 'personalizado')
    ? 'separacion'
    : (tipo as TipoDocumentoPrefijo);
  const consecPrefijado = formatearConsecutivoConPrefijo(numBase, tipoPrefijo);

  const cNombre = cliente
    ? `${cliente.nombre} ${cliente.apellido || ''}`.trim()
    : (reserva?.clientes
        ? `${reserva.clientes.nombre} ${reserva.clientes.apellido || ''}`.trim()
        : (cotizacion?.clientes
            ? `${cotizacion.clientes.nombre} ${cotizacion.clientes.apellido || ''}`.trim()
            : 'Estimado/a cliente'));

  const fNombre = finca?.nombre || reserva?.fincas?.nombre || cotizacion?.fincas?.nombre || 'Finca Campestre';
  const fi = reserva?.fecha_inicio || cotizacion?.fecha_inicio || '';
  const ff = reserva?.fecha_fin || cotizacion?.fecha_fin || '';
  const noches = calcularNoches(fi, ff);
  const personas = reserva?.personas || cotizacion?.personas || 1;
  const total = reserva?.valor_total || cotizacion?.total || 0;
  const saldo = reserva ? calcularSaldo(reserva) : total;
  const anticipo = reserva?.separacion || 0;
  const valorPago = pago?.valor || 0;

  return {
    cliente: cNombre,
    finca: fNombre,
    consecutivo: consecPrefijado,
    consecutivo_base: String(numBase).replace(/^[A-Za-z\-]+/, ''),
    fecha_llegada: formatFecha(fi),
    fecha_salida: formatFecha(ff),
    fechas: fi && ff ? `${formatFecha(fi)} al ${formatFecha(ff)}` : 'Fechas acordadas',
    noches: String(noches),
    personas: String(personas),
    total: formatCOP(total),
    anticipo: formatCOP(anticipo),
    saldo: formatCOP(saldo),
    pago_valor: formatCOP(valorPago),
    enlace_pdf: enlacePdf ? `📎 *Documento oficial adjunto (PDF):*\n${enlacePdf}` : '',
  };
}
