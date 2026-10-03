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
  cliente?: { nombre?: string; apellido?: string | null; whatsapp?: string | null } | null
): string {
  const cNombre = cliente ? `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() : (cotizacion.clientes ? `${cotizacion.clientes.nombre} ${cotizacion.clientes.apellido || ''}`.trim() : 'Estimado/a cliente');
  const fNombre = finca?.nombre || cotizacion.fincas?.nombre || 'Finca Campestre';
  const noches = calcularNoches(cotizacion.fecha_inicio, cotizacion.fecha_fin);
  const tieneAlim = (cotizacion.costo_alimentacion || 0) > 0 || (cotizacion.alimentacion && cotizacion.alimentacion !== 'Sin alimentación');

  let msg = `🏡 *COTIZACIÓN OFICIAL DE ESTANCIA*
*Control de Fincas Campestres*

¡Hola, *${cNombre}*! 👋 Con gusto te presentamos los detalles de tu cotización para disfrutar de una experiencia campestre inolvidable.

📍 *Finca solicitada:* ${fNombre}
${cotizacion.consecutivo ? `🆔 *Consecutivo N°:* ${cotizacion.consecutivo}\n` : ''}📅 *Fecha de llegada:* ${formatFecha(cotizacion.fecha_inicio)}
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
export function plantillaSeparacion(reserva: Reserva): string {
  const clienteNombre = reserva.clientes ? `${reserva.clientes.nombre} ${reserva.clientes.apellido || ''}`.trim() : 'Estimado/a cliente';
  const fincaNombre = reserva.fincas?.nombre || 'Finca Campestre';
  const saldo = calcularSaldo(reserva);
  const anticipo = reserva.separacion || 0;
  const noches = calcularNoches(reserva.fecha_inicio, reserva.fecha_fin);

  return `🎉 *CONFIRMACIÓN DE RESERVA Y SEPARACIÓN*
*Control de Fincas Campestres*

Hola, *${clienteNombre}* 🙌 Hemos emitido satisfactoriamente tu *Documento Oficial de Separación*.

📍 *Finca reservada:* ${fincaNombre}
${reserva.consecutivo ? `🆔 *Consecutivo de Reserva:* ${reserva.consecutivo}\n` : ''}📅 *Llegada (Check-in):* ${formatFecha(reserva.fecha_inicio)}
📅 *Salida (Check-out):* ${formatFecha(reserva.fecha_fin)}
🌙 *Noches:* ${noches} | 👥 *Huéspedes:* ${reserva.personas} personas

📊 *ESTADO ECONÓMICO DE LA RESERVA:*
• Valor Total Acordado: *${formatCOP(reserva.valor_total)}*
• Anticipo de Separación: *${formatCOP(anticipo)}* ✅
• Saldo Pendiente: *${formatCOP(saldo)}* ${saldo <= 0 ? '🟢 (Completamente pagada)' : '⚠️'}

📄 *DOCUMENTO PDF ADJUNTO:*
Hemos generado tu documento oficial de separación en formato PDF con todos los términos, condiciones y políticas de uso de la finca.

${saldo > 0 ? `⏰ *Recordatorio:* El saldo restante de *${formatCOP(saldo)}* deberá ser cancelado antes del ingreso a las instalaciones.` : ''}

¡Te agradecemos por tu preferencia y te deseamos una maravillosa estadía campestre! 🌿🏡`;
}

/**
 * 3. Plantilla: Comprobante de Abono / Pago
 */
export function plantillaComprobantePago(reserva: Reserva, pago: Pago): string {
  const clienteNombre = reserva.clientes ? `${reserva.clientes.nombre} ${reserva.clientes.apellido || ''}`.trim() : 'Estimado/a cliente';
  const fincaNombre = reserva.fincas?.nombre || 'Finca Campestre';
  const saldo = calcularSaldo(reserva);

  const etiquetaTipo =
    pago.tipo === 'separacion' ? 'Separación de fechas' :
    pago.tipo === 'abono' ? 'Abono a reserva' :
    pago.tipo === 'pago_total' ? 'Cancelación total' : 'Devolución';

  return `💳 *COMPROBANTE OFICIAL DE PAGO / ABONO*
*Control de Fincas Campestres*

Hola, *${clienteNombre}* ✅ Confirmamos la recepción de tu pago para la finca *${fincaNombre}*.
${reserva.consecutivo ? `🆔 *Consecutivo de Reserva:* ${reserva.consecutivo}\n` : ''}
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

📄 Adjuntamos tu recibo y comprobante digital en PDF emitido por el sistema.

¡Muchas gracias por tu oportuno cumplimiento! 🙏`;
}

/**
 * 4. Plantilla: Estado de Cuenta
 */
export function plantillaEstadoCuenta(reserva: Reserva): string {
  const clienteNombre = reserva.clientes ? `${reserva.clientes.nombre} ${reserva.clientes.apellido || ''}`.trim() : 'Estimado/a cliente';
  const fincaNombre = reserva.fincas?.nombre || 'Finca Campestre';
  const saldo = calcularSaldo(reserva);
  const totalPagado = reserva.valor_total - saldo;
  const pagos = reserva.pagos || [];

  let historialTexto = '';
  if (pagos.length > 0) {
    historialTexto = pagos.map((p, idx) =>
      `  ${idx + 1}. ${formatFecha(p.fecha)} | ${p.tipo.toUpperCase()}: ${formatCOP(p.valor)}`
    ).join('\n');
  } else {
    historialTexto = '  (Sin abonos registrados aún)';
  }

  return `📊 *ESTADO DE CUENTA DE RESERVA*
*Control de Fincas Campestres*

Hola, *${clienteNombre}* 📋 Te compartimos el balance financiero detallado de tu reserva:

📍 *Finca:* ${fincaNombre}
${reserva.consecutivo ? `🆔 *Consecutivo de Reserva:* ${reserva.consecutivo}\n` : ''}📅 *Estancia:* ${formatFecha(reserva.fecha_inicio)} al ${formatFecha(reserva.fecha_fin)}

💳 *HISTORIAL DE ABONOS REGISTRADOS:*
${historialTexto}

━━━━━━━━━━━━━━━━━━━━
• Valor Total Reserva: ${formatCOP(reserva.valor_total)}
• Total Pagado a la Fecha: ${formatCOP(totalPagado)}
• *SALDO PENDIENTE:* *${formatCOP(saldo)}* ${saldo <= 0 ? '🟢 (PAZ Y SALVO)' : '⚠️'}
━━━━━━━━━━━━━━━━━━━━

📄 Hemos generado el Estado de Cuenta consolidado en PDF con la relación detallada de todos los movimientos.

Cualquier duda o aclaración sobre los pagos, con gusto te atendemos. 🤝`;
}

/**
 * 5. Plantilla: Paz y Salvo Oficial
 */
export function plantillaPazYSalvo(reserva: Reserva): string {
  const clienteNombre = reserva.clientes ? `${reserva.clientes.nombre} ${reserva.clientes.apellido || ''}`.trim() : 'Estimado/a cliente';
  const fincaNombre = reserva.fincas?.nombre || 'Finca Campestre';

  return `🏅 *CERTIFICADO OFICIAL DE PAZ Y SALVO*
*Control de Fincas Campestres*

Estimado/a *${clienteNombre}* 🌟

Nos complace certificarte que tu reserva para la finca *${fincaNombre}* se encuentra *100% CANCELADA Y AL DÍA*.
${reserva.consecutivo ? `🆔 *Certificado de Reserva N°:* ${reserva.consecutivo}\n` : ''}
✅ *Estado Financiero:* PAZ Y SALVO
📅 *Fechas de Estadía:* ${formatFecha(reserva.fecha_inicio)} al ${formatFecha(reserva.fecha_fin)}
👥 *Huéspedes autorizados:* ${reserva.personas} personas
💰 *Saldo pendiente:* $0 COP

📄 Se adjunta tu documento formal de *Paz y Salvo* con código y sello de validación.

¡Todo está listo para tu llegada! En breve te enviaremos las indicaciones de ruta y el contacto del mayordomo anfitrión. 🌿☀️`;
}

/**
 * 6. Plantilla: Propuesta de Menú / Alimentación
 */
export function plantillaPropuestaAlimentacion(datos: PropuestaAlimentacionDatos): string {
  const cNombre = datos.cliente ? `${datos.cliente.nombre} ${datos.cliente.apellido || ''}`.trim() : 'Estimado/a cliente';
  const fNombre = datos.finca?.nombre || 'Finca Campestre';
  const total = (datos.menu.precio_pp || 0) * (datos.personas || 1) * (datos.cantidadServicios || 1);

  return `🍽️ *PROPUESTA GASTRONÓMICA CAMPESTRE*
*Control de Fincas Campestres*

Hola, *${cNombre}* 👨‍🍳 Te presentamos la propuesta culinaria para tu estadía en *${fNombre}*:

🍲 *Menú seleccionado:* *${datos.menu.nombre}*
🏷️ *Categoría:* ${datos.menu.categoria}
${datos.menu.descripcion ? `📝 *Descripción:* ${datos.menu.descripcion}\n` : ''}
👥 *Comensales:* ${datos.personas || 1} personas
🍽️ *Servicios / Días:* ${datos.cantidadServicios || 1}
💵 *Tarifa por persona:* ${formatCOP(datos.menu.precio_pp)}
━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL DEL SERVICIO:* *${formatCOP(total)}*
━━━━━━━━━━━━━━━━━━━━

${datos.menu.condiciones ? `📌 *Condiciones:* ${datos.menu.condiciones}\n` : ''}
📄 Te adjuntamos la propuesta formal en PDF con fotografías de los platos y las condiciones del servicio.

¿Deseas que coordinemos y reservemos este menú para tus fechas? 👩‍🍳✨`;
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
