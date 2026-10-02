/**
 * Servicio de generación de documentos PDF — Fase 1
 * Utiliza jsPDF para crear documentos vinculados a reservas.
 *
 * Documentos disponibles:
 *  - separacion     : Documento de separación / reserva inicial
 *  - abono          : Comprobante de abono de pago
 *  - estado_cuenta  : Estado de cuenta con historial de pagos
 *  - paz_salvo      : Paz y salvo (solo cuando saldo = 0)
 */

import jsPDF from 'jspdf';
import type { Reserva, Pago } from '../types';
import { calcularSaldo } from '../types';

// ---------------------------------------------------------------
// Helpers de formato
// ---------------------------------------------------------------
function formatFecha(f?: string | null): string {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

function formatCOP(v: number): string {
  return '$' + v.toLocaleString('es-CO') + ' COP';
}

function nombreCompleto(reserva: Reserva): string {
  if (!reserva.clientes) return 'Cliente sin nombre';
  return `${reserva.clientes.nombre} ${reserva.clientes.apellido || ''}`.trim();
}

// ---------------------------------------------------------------
// Encabezado común
// ---------------------------------------------------------------
function encabezado(doc: jsPDF, titulo: string, numero?: string) {
  const ancho = doc.internal.pageSize.getWidth();

  // Franja verde
  doc.setFillColor(26, 107, 94);
  doc.rect(0, 0, ancho, 38, 'F');

  // Nombre empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('Control de Fincas Campestres', 14, 14);

  // Título del documento
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(titulo, 14, 24);

  // Número de documento (derecha)
  if (numero) {
    doc.setFontSize(9);
    doc.text(numero, ancho - 14, 24, { align: 'right' });
  }

  // Fecha de emisión
  doc.setFontSize(8);
  doc.text(`Emitido: ${formatFecha(new Date().toISOString().split('T')[0])}`, ancho - 14, 34, { align: 'right' });

  doc.setTextColor(30, 27, 19);
}

// ---------------------------------------------------------------
// Sección de datos del cliente y finca
// ---------------------------------------------------------------
function datosClienteFinca(doc: jsPDF, reserva: Reserva, y: number): number {
  const ancho = doc.internal.pageSize.getWidth();

  doc.setFillColor(244, 241, 234);
  doc.rect(0, y, ancho, 32, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('DATOS DE LA RESERVA', 14, y + 8);
  doc.setTextColor(30, 27, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const col2 = ancho / 2 + 4;

  doc.text(`Cliente: ${nombreCompleto(reserva)}`, 14, y + 17);
  doc.text(`Finca: ${reserva.fincas?.nombre || '—'}`, col2, y + 17);

  const wa = reserva.clientes?.whatsapp || reserva.clientes?.telefono || '—';
  doc.text(`WhatsApp / Tel: ${wa}`, 14, y + 26);
  doc.text(`Personas: ${reserva.personas}`, col2, y + 26);

  return y + 32;
}

// ---------------------------------------------------------------
// Línea separadora
// ---------------------------------------------------------------
function linea(doc: jsPDF, y: number): number {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setDrawColor(219, 212, 195);
  doc.line(14, y, ancho - 14, y);
  return y + 4;
}

// ---------------------------------------------------------------
// Fila de tabla simple
// ---------------------------------------------------------------
function fila(doc: jsPDF, y: number, izq: string, der: string, negrita = false): number {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', negrita ? 'bold' : 'normal');
  doc.setFontSize(9);
  doc.text(izq, 14, y);
  doc.text(der, ancho - 14, y, { align: 'right' });
  return y + 7;
}

// ---------------------------------------------------------------
// PIE DE PÁGINA
// ---------------------------------------------------------------
function pie(doc: jsPDF) {
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();

  doc.setFillColor(26, 107, 94);
  doc.rect(0, alto - 14, ancho, 14, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Control de Fincas Campestres — Documento generado automáticamente', ancho / 2, alto - 5.5, { align: 'center' });
  doc.setTextColor(30, 27, 19);
}

// ================================================================
// 1. DOCUMENTO DE SEPARACIÓN
// ================================================================
export function generarDocSeparacion(reserva: Reserva): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const num = `SEP-${reserva.id.slice(0, 8).toUpperCase()}`;

  encabezado(doc, 'DOCUMENTO DE SEPARACIÓN', num);

  let y = 46;
  y = datosClienteFinca(doc, reserva, y);
  y += 8;
  y = linea(doc, y);

  // Fechas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('DETALLE DE LA RESERVA', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  y = fila(doc, y, 'Fecha de llegada:', formatFecha(reserva.fecha_inicio));
  y = fila(doc, y, 'Fecha de salida:', formatFecha(reserva.fecha_fin));
  y = fila(doc, y, 'Personas:', String(reserva.personas));
  y += 4;
  y = linea(doc, y);

  // Valores
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('VALORES', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  y = fila(doc, y, 'Valor total de la reserva:', formatCOP(reserva.valor_total));
  y = fila(doc, y, 'Valor de separación pagado:', formatCOP(reserva.separacion), true);

  const saldo = calcularSaldo(reserva);
  y = fila(doc, y, 'Saldo pendiente:', formatCOP(saldo), true);
  y += 6;
  y = linea(doc, y);

  // Condiciones
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CONDICIONES', 14, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const condiciones = [
    '• La separación garantiza la disponibilidad de la finca para las fechas indicadas.',
    '• El saldo restante debe cancelarse antes de la fecha de llegada.',
    '• En caso de cancelación, la separación no es reembolsable salvo acuerdo previo.',
    '• Este documento no es una factura. La factura se emitirá al finalizar la reserva.',
  ];
  for (const c of condiciones) {
    doc.text(c, 14, y);
    y += 6;
  }

  // Firma
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Recibido conforme:', 14, y);
  y += 14;
  doc.setDrawColor(30, 27, 19);
  doc.line(14, y, 90, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Firma del cliente', 14, y + 5);

  pie(doc);
  doc.save(`Separacion_${reserva.id.slice(0, 8)}.pdf`);
}

// ================================================================
// 2. COMPROBANTE DE ABONO
// ================================================================
export function generarComprobantePago(reserva: Reserva, pago: Pago): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const num = `PAG-${pago.id.slice(0, 8).toUpperCase()}`;

  encabezado(doc, 'COMPROBANTE DE ABONO', num);

  let y = 46;
  y = datosClienteFinca(doc, reserva, y);
  y += 8;
  y = linea(doc, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('DETALLE DEL PAGO', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  y = fila(doc, y, 'Tipo de pago:', pago.tipo.replace('_', ' ').toUpperCase());
  y = fila(doc, y, 'Fecha del pago:', formatFecha(pago.fecha));
  y = fila(doc, y, 'Valor pagado:', formatCOP(pago.valor), true);
  if (pago.observacion) {
    y = fila(doc, y, 'Referencia / Observación:', pago.observacion);
  }
  y += 4;
  y = linea(doc, y);

  // Resumen de la reserva
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('RESUMEN DE LA RESERVA', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  y = fila(doc, y, 'Valor total:', formatCOP(reserva.valor_total));
  const pagado = (reserva.pagos || []).reduce((acc, p) =>
    acc + (p.tipo === 'devolucion' ? -p.valor : p.valor), 0);
  y = fila(doc, y, 'Total pagado hasta la fecha:', formatCOP(pagado), true);
  const saldo = calcularSaldo(reserva);
  y = fila(doc, y, 'Saldo pendiente:', formatCOP(saldo), true);
  y += 4;
  y = linea(doc, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 100, 87);
  doc.text('Este comprobante es válido como recibo de pago parcial o total de la reserva indicada.', 14, y, { maxWidth: 180 });

  pie(doc);
  doc.save(`Abono_${pago.id.slice(0, 8)}.pdf`);
}

// ================================================================
// 3. ESTADO DE CUENTA
// ================================================================
export function generarEstadoCuenta(reserva: Reserva): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const num = `EC-${reserva.id.slice(0, 8).toUpperCase()}`;

  encabezado(doc, 'ESTADO DE CUENTA', num);

  let y = 46;
  y = datosClienteFinca(doc, reserva, y);
  y += 8;
  y = linea(doc, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('HISTORIAL DE PAGOS', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  const pagos = reserva.pagos || [];
  if (pagos.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('No se han registrado pagos para esta reserva.', 14, y);
    y += 8;
  } else {
    // Cabecera de tabla
    doc.setFillColor(244, 241, 234);
    doc.rect(14, y - 4, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Fecha', 16, y);
    doc.text('Tipo', 50, y);
    doc.text('Observación', 90, y);
    doc.text('Valor', 182, y, { align: 'right' });
    y += 6;
    linea(doc, y);
    y += 3;

    let totalPagado = 0;
    for (const p of pagos) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(formatFecha(p.fecha), 16, y);
      doc.text(p.tipo.replace('_', ' '), 50, y);
      if (p.observacion) doc.text(p.observacion.slice(0, 35), 90, y);
      const signo = p.tipo === 'devolucion' ? -p.valor : p.valor;
      totalPagado += signo;
      doc.text(formatCOP(Math.abs(p.valor)), 182, y, { align: 'right' });
      y += 6;
    }
    y += 2;
  }

  y = linea(doc, y);

  // Totales finales
  y += 4;
  y = fila(doc, y, 'Valor total de la reserva:', formatCOP(reserva.valor_total));
  const pagado = pagos.reduce((acc, p) => acc + (p.tipo === 'devolucion' ? -p.valor : p.valor), 0);
  y = fila(doc, y, 'Total pagado:', formatCOP(pagado), true);
  const saldo = calcularSaldo(reserva);

  // Resaltar saldo
  doc.setFillColor(saldo === 0 ? 209 : 244, saldo === 0 ? 234 : 212, saldo === 0 ? 217 : 216);
  doc.rect(14, y - 4, 182, 9, 'F');
  y = fila(doc, y, 'SALDO PENDIENTE:', formatCOP(saldo), true);

  pie(doc);
  doc.save(`EstadoCuenta_${reserva.id.slice(0, 8)}.pdf`);
}

// ================================================================
// 4. PAZ Y SALVO
// ================================================================
export function generarPazYSalvo(reserva: Reserva): void {
  const saldo = calcularSaldo(reserva);
  if (saldo > 0) {
    alert('No es posible generar el Paz y Salvo: la reserva tiene saldo pendiente.');
    return;
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const num = `PS-${reserva.id.slice(0, 8).toUpperCase()}`;
  const ancho = doc.internal.pageSize.getWidth();

  encabezado(doc, 'PAZ Y SALVO', num);

  let y = 56;

  // Sello visual
  doc.setFillColor(209, 234, 217);
  doc.roundedRect(ancho / 2 - 40, y, 80, 22, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(26, 107, 94);
  doc.text('✓ PAGADO EN SU TOTALIDAD', ancho / 2, y + 14, { align: 'center' });
  doc.setTextColor(30, 27, 19);

  y += 32;
  y = datosClienteFinca(doc, reserva, y);
  y += 8;
  y = linea(doc, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('CERTIFICACIÓN', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const texto = [
    `Por medio del presente documento se certifica que el/la señor(a) ${nombreCompleto(reserva)}`,
    `ha cancelado en su TOTALIDAD el valor correspondiente a la reserva de la finca`,
    `"${reserva.fincas?.nombre || '—'}", correspondiente al período comprendido entre`,
    `el ${formatFecha(reserva.fecha_inicio)} y el ${formatFecha(reserva.fecha_fin)}.`,
    '',
    `Valor total cancelado: ${formatCOP(reserva.valor_total)}`,
    `Saldo pendiente: ${formatCOP(0)}`,
    '',
    'En consecuencia, se expide el presente paz y salvo a conformidad de las partes.',
  ];
  for (const linea of texto) {
    doc.text(linea, 14, y, { maxWidth: 182 });
    y += linea === '' ? 4 : 7;
  }

  y += 20;
  doc.setFont('helvetica', 'bold');
  doc.text('Firma del administrador:', 14, y);
  y += 14;
  doc.line(14, y, 90, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Firma y sello', 14, y + 5);

  pie(doc);
  doc.save(`PazYSalvo_${reserva.id.slice(0, 8)}.pdf`);
}
