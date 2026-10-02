/**
 * Servicio de generación de documentos PDF — Fase 1, 2 y 4
 * Utiliza jsPDF para crear documentos oficiales vinculados a reservas, cotizaciones y menús.
 *
 * Fase 4: Integración automática con ConfiguracionGeneral:
 *  - Nombre, NIT, eslogan, logo y datos de contacto de la empresa
 *  - Encabezados y pie de página parametrizados desde Supabase
 *  - Términos, condiciones y cláusulas legales dinámicas
 *  - Prefijos y numeración consecutiva configurable
 *
 * Documentos disponibles:
 *  - cotizacion     : Propuesta formal de cotización
 *  - separacion     : Documento de separación / reserva inicial
 *  - abono          : Comprobante de abono de pago
 *  - estado_cuenta  : Estado de cuenta con historial de pagos
 *  - paz_salvo      : Paz y salvo (solo cuando saldo = 0)
 *  - propuesta_alim : Propuesta gastronómica de menús
 */

import jsPDF from 'jspdf';
import type { Reserva, Pago, Menu, Cliente, Finca, CotizacionDB, ConfiguracionGeneral, CierreReserva } from '../types';
import {
  calcularSaldo,
  obtenerNombreClienteHistorico,
  obtenerNombreFincaHistorico,
  obtenerContactoClienteHistorico,
} from '../types';
import { getConfiguracionGlobal } from './configuracion';

export interface PropuestaAlimentacionDatos {
  menu: Menu;
  cliente?: Pick<Cliente, 'nombre' | 'apellido' | 'whatsapp' | 'correo'> | null;
  finca?: { nombre: string; zona?: string } | null;
  personas?: number;
  cantidadServicios?: number;
  fechaEvento?: string;
  notasEspeciales?: string;
  config?: ConfiguracionGeneral;
}

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

async function urlABase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------
// Encabezado corporativo adaptable (Fase 4)
// ---------------------------------------------------------------
function encabezado(doc: jsPDF, titulo: string, numero?: string, configParam?: ConfiguracionGeneral) {
  const config = configParam || getConfiguracionGlobal();
  const ancho = doc.internal.pageSize.getWidth();

  // Franja verde institucional
  doc.setFillColor(26, 107, 94);
  doc.rect(0, 0, ancho, 40, 'F');

  // Nombre de empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(config.nombre_empresa || 'Control de Fincas Campestres', 14, 13);

  // Eslogan o Encabezado institucional
  if (config.eslogan) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(209, 234, 217);
    doc.text(config.eslogan.slice(0, 75), 14, 19);
  }

  // Título del documento
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(titulo, 14, 28);

  // Información de contacto rápida (teléfono / nit)
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 240, 235);
  const infoExtra = [config.nit ? `NIT: ${config.nit}` : '', config.telefono || ''].filter(Boolean).join(' • ');
  if (infoExtra) {
    doc.text(infoExtra, 14, 35);
  }

  // Número de documento (derecha)
  if (numero) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text(numero, ancho - 14, 20, { align: 'right' });
  }

  // Fecha de emisión
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 240, 235);
  doc.text(`Emitido: ${formatFecha(new Date().toISOString().split('T')[0])}`, ancho - 14, 29, { align: 'right' });

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
// PIE DE PÁGINA (Fase 4: parametrizable)
// ---------------------------------------------------------------
function pie(doc: jsPDF, configParam?: ConfiguracionGeneral) {
  const config = configParam || getConfiguracionGlobal();
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();

  doc.setFillColor(26, 107, 94);
  doc.rect(0, alto - 15, ancho, 15, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(255, 255, 255);

  const textoPie = config.doc_pie_pagina || 'Control de Fincas Campestres • Documento oficial generado automáticamente';
  doc.text(textoPie, ancho / 2, alto - 8.5, { align: 'center' });

  const textoContacto = config.doc_contacto_info || `${config.whatsapp ? `WhatsApp: +${config.whatsapp}` : ''} • ${config.correo || ''}`;
  if (textoContacto.trim()) {
    doc.setFontSize(6.5);
    doc.setTextColor(209, 234, 217);
    doc.text(textoContacto.trim(), ancho / 2, alto - 4, { align: 'center' });
  }

  doc.setTextColor(30, 27, 19);
}

// ================================================================
// 1. DOCUMENTO DE SEPARACIÓN
// ================================================================
export function generarDocSeparacion(reserva: Reserva, configParam?: ConfiguracionGeneral): void {
  const config = configParam || getConfiguracionGlobal();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const prefijo = config.prefijo_separacion || 'SEP-';
  const num = `${prefijo}${reserva.id.slice(0, 8).toUpperCase()}`;

  encabezado(doc, 'DOCUMENTO DE SEPARACIÓN', num, config);

  let y = 48;
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

  // Condiciones (Fase 4: extraídas de configuración)
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TÉRMINOS Y CONDICIONES', 14, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const terminosTexto = config.terminos_condiciones || `• La separación garantiza la disponibilidad de la finca para las fechas indicadas.\n• El saldo restante debe cancelarse antes de la fecha de llegada.\n• En caso de cancelación, la separación no es reembolsable salvo acuerdo previo.\n• Este documento no es una factura comercial.`;
  const lineasCondiciones = terminosTexto.split('\n');

  for (const c of lineasCondiciones) {
    if (c.trim()) {
      const split = doc.splitTextToSize(c.trim(), 182);
      doc.text(split, 14, y);
      y += split.length * 4.5;
    }
  }

  // Firma
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Recibido conforme:', 14, y);
  doc.text('Por la administración:', doc.internal.pageSize.getWidth() / 2 + 10, y);
  y += 14;
  doc.setDrawColor(30, 27, 19);
  doc.line(14, y, 80, y);
  doc.line(doc.internal.pageSize.getWidth() / 2 + 10, y, doc.internal.pageSize.getWidth() - 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Firma del cliente', 14, y + 4.5);
  doc.text(config.nombre_empresa || 'Administración', doc.internal.pageSize.getWidth() / 2 + 10, y + 4.5);

  pie(doc, config);
  doc.save(`Separacion_${reserva.id.slice(0, 8)}.pdf`);
}

// ================================================================
// 2. COMPROBANTE DE ABONO
// ================================================================
export function generarComprobantePago(reserva: Reserva, pago: Pago, configParam?: ConfiguracionGeneral): void {
  const config = configParam || getConfiguracionGlobal();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const prefijo = config.prefijo_abono || 'PAG-';
  const num = `${prefijo}${pago.id.slice(0, 8).toUpperCase()}`;

  encabezado(doc, 'COMPROBANTE DE ABONO / PAGO', num, config);

  let y = 48;
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
  const textoLegal = config.textos_legales || 'Este comprobante es válido como recibo de pago parcial o total de la reserva indicada.';
  doc.text(textoLegal, 14, y, { maxWidth: 182 });

  pie(doc, config);
  doc.save(`Abono_${pago.id.slice(0, 8)}.pdf`);
}

// ================================================================
// 3. ESTADO DE CUENTA
// ================================================================
export function generarEstadoCuenta(reserva: Reserva, configParam?: ConfiguracionGeneral): void {
  const config = configParam || getConfiguracionGlobal();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const prefijo = config.prefijo_estado_cuenta || 'EC-';
  const num = `${prefijo}${reserva.id.slice(0, 8).toUpperCase()}`;

  encabezado(doc, 'ESTADO DE CUENTA', num, config);

  let y = 48;
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

    for (const p of pagos) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(formatFecha(p.fecha), 16, y);
      doc.text(p.tipo.replace('_', ' '), 50, y);
      if (p.observacion) doc.text(p.observacion.slice(0, 35), 90, y);
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

  // Texto legal
  if (config.textos_legales) {
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 105, 95);
    doc.text(config.textos_legales, 14, y, { maxWidth: 182 });
  }

  pie(doc, config);
  doc.save(`EstadoCuenta_${reserva.id.slice(0, 8)}.pdf`);
}

// ================================================================
// 4. PAZ Y SALVO
// ================================================================
export function generarPazYSalvo(reserva: Reserva, configParam?: ConfiguracionGeneral): void {
  const config = configParam || getConfiguracionGlobal();
  const saldo = calcularSaldo(reserva);
  if (saldo > 0) {
    alert('No es posible generar el Paz y Salvo: la reserva tiene saldo pendiente.');
    return;
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const prefijo = config.prefijo_paz_salvo || 'PS-';
  const num = `${prefijo}${reserva.id.slice(0, 8).toUpperCase()}`;
  const ancho = doc.internal.pageSize.getWidth();

  encabezado(doc, 'CERTIFICADO DE PAZ Y SALVO', num, config);

  let y = 56;

  // Sello visual
  doc.setFillColor(209, 234, 217);
  doc.roundedRect(ancho / 2 - 45, y, 90, 22, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
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
  doc.text('CERTIFICACIÓN OFICIAL', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const texto = [
    `Por medio del presente documento, ${config.nombre_empresa || 'la administración'} certifica que el/la señor(a)`,
    `${nombreCompleto(reserva)} ha cancelado en su TOTALIDAD el valor correspondiente a la reserva`,
    `de la finca "${reserva.fincas?.nombre || '—'}", para el período comprendido entre el`,
    `${formatFecha(reserva.fecha_inicio)} y el ${formatFecha(reserva.fecha_fin)}.`,
    '',
    `Valor total cancelado: ${formatCOP(reserva.valor_total)}`,
    `Saldo pendiente: ${formatCOP(0)}`,
    '',
    config.textos_legales || 'En consecuencia, se expide el presente paz y salvo a plena conformidad de las partes.',
  ];
  for (const lineaTexto of texto) {
    doc.text(lineaTexto, 14, y, { maxWidth: 182 });
    y += lineaTexto === '' ? 4 : 6.5;
  }

  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.text('Firma y autorización administrativa:', 14, y);
  y += 14;
  doc.line(14, y, 90, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Administración • ${config.nombre_empresa}`, 14, y + 5);

  pie(doc, config);
  doc.save(`PazYSalvo_${reserva.id.slice(0, 8)}.pdf`);
}

// ================================================================
// 5. PROPUESTA DE ALIMENTACIÓN (FASE 2 & 4)
// ================================================================
export async function generarPropuestaAlimentacion(datos: PropuestaAlimentacionDatos): Promise<void> {
  const {
    menu,
    cliente,
    finca,
    personas = 10,
    cantidadServicios = 1,
    notasEspeciales,
    config: configParam,
  } = datos;

  const config = configParam || getConfiguracionGlobal();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const prefijo = config.prefijo_propuesta_menu || 'PROP-';
  const num = `${prefijo}${(menu.id || 'MEN').slice(0, 8).toUpperCase()}`;

  encabezado(doc, 'PROPUESTA DE SERVICIO GASTRONÓMICO', num, config);

  let y = 48;

  // Franja datos cliente y finca
  doc.setFillColor(244, 241, 234);
  doc.rect(0, y, ancho, 32, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('DATOS DE LA SOLICITUD', 14, y + 8);
  doc.setTextColor(30, 27, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const col2 = ancho / 2 + 4;

  const nombreCli = cliente ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : 'Cliente particular';
  doc.text(`Cliente: ${nombreCli}`, 14, y + 17);
  doc.text(`Finca / Lugar: ${finca?.nombre || 'Finca Campestre'}`, col2, y + 17);

  const contactoCli = cliente?.whatsapp || cliente?.correo || 'Coordinación directa';
  doc.text(`Contacto: ${contactoCli}`, 14, y + 26);
  doc.text(`Comensales: ${personas} personas • ${cantidadServicios} servicio(s)`, col2, y + 26);

  y += 38;

  // DETALLE DEL MENÚ
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 107, 94);
  doc.text('MENÚ SELECCIONADO', 14, y);
  doc.setTextColor(30, 27, 19);

  // Badge categoría
  doc.setFillColor(230, 243, 240);
  doc.roundedRect(ancho - 55, y - 4.5, 41, 6, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 107, 94);
  doc.text(menu.categoria.toUpperCase(), ancho - 34.5, y - 0.5, { align: 'center' });
  doc.setTextColor(30, 27, 19);

  y += 7;

  // Título del Menú
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(menu.nombre, 14, y);
  y += 6;

  // Descripción del menú
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 70, 60);
  const descLineas = doc.splitTextToSize(
    menu.descripcion || 'Servicio gastronómico completo elaborado con ingredientes frescos y preparación artesanal campesina.',
    182
  );
  doc.text(descLineas, 14, y);
  y += descLineas.length * 4.5 + 4;
  doc.setTextColor(30, 27, 19);

  // Intentar cargar e incrustar imagen si está disponible
  const imagenUrl = menu.imagen_url || (menu.menu_imagenes && menu.menu_imagenes[0]?.url);
  if (imagenUrl) {
    try {
      const b64 = await urlABase64(imagenUrl);
      if (b64) {
        doc.setDrawColor(219, 212, 195);
        doc.setFillColor(248, 247, 244);
        doc.roundedRect(14, y, 75, 45, 2, 2, 'FD');
        doc.addImage(b64, 'JPEG', 15, y + 1, 73, 43);

        doc.setFillColor(244, 241, 234);
        doc.roundedRect(95, y, ancho - 109, 45, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(26, 107, 94);
        doc.text('ASPECTOS DESTACADOS', 100, y + 8);
        doc.setTextColor(30, 27, 19);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`• Categoría: ${menu.categoria}`, 100, y + 16);
        doc.text(`• Valor individual: ${formatCOP(menu.precio_pp)} /pp`, 100, y + 23);
        doc.text(`• Servicio para: ${personas} personas`, 100, y + 30);
        doc.text(`• Total servicios: ${cantidadServicios}`, 100, y + 37);

        y += 50;
      }
    } catch {
      // Continuar limpiamente si la imagen no responde CORS
    }
  }

  y = linea(doc, y);
  y += 2;

  // TABLA DE LIQUIDACIÓN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(26, 107, 94);
  doc.text('COTIZACIÓN Y VALOR DEL SERVICIO', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 7;

  // Cabecera de tabla
  doc.setFillColor(244, 241, 234);
  doc.rect(14, y - 4, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Concepto / Menú', 16, y);
  doc.text('Precio / Persona', 90, y);
  doc.text('Comensales', 130, y);
  doc.text('Subtotal', 182, y, { align: 'right' });
  y += 6;
  y = linea(doc, y);
  y += 3;

  const totalServicio = (menu.precio_pp || 0) * personas * cantidadServicios;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(menu.nombre.slice(0, 38), 16, y);
  doc.text(formatCOP(menu.precio_pp), 90, y);
  doc.text(`${personas} pers. × ${cantidadServicios} serv.`, 130, y);
  doc.text(formatCOP(totalServicio), 182, y, { align: 'right' });
  y += 8;

  y = linea(doc, y);
  y += 3;

  // Total destacado
  doc.setFillColor(230, 243, 240);
  doc.rect(14, y - 4, 182, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 107, 94);
  doc.text('VALOR TOTAL PROPUESTA:', 18, y + 2.5);
  doc.text(formatCOP(totalServicio), 182, y + 2.5, { align: 'right' });
  doc.setTextColor(30, 27, 19);
  y += 14;

  // CONDICIONES (Fase 4)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('CONDICIONES Y POLÍTICAS DEL SERVICIO', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  const condicionesLista = [
    menu.condiciones ? `• ${menu.condiciones}` : '• Preparación con ingredientes seleccionados y frescos de la región.',
    '• Para confirmar el servicio de alimentación se requiere el 50% de anticipo junto con la reserva.',
    '• Toda modificación en el número de comensales debe notificarse con al menos 48 horas de anticipación.',
    '• Incluye menaje estándar, vajilla campestre y atención durante el horario pactado del servicio.',
  ];

  if (notasEspeciales) {
    condicionesLista.push(`• Observaciones particulares: ${notasEspeciales}`);
  }

  for (const cond of condicionesLista) {
    const lines = doc.splitTextToSize(cond, 182);
    doc.text(lines, 14, y);
    y += lines.length * 4.2;
  }

  // Firmas
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Atentamente,', 14, y);
  doc.text('Aceptado por el cliente:', col2, y);
  y += 14;
  doc.setDrawColor(30, 27, 19);
  doc.line(14, y, 80, y);
  doc.line(col2, y, col2 + 66, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Coordinación • ${config.nombre_empresa}`, 14, y + 4.5);
  doc.text(nombreCli, col2, y + 4.5);

  pie(doc, config);

  const nombreLimpio = menu.nombre.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
  doc.save(`Propuesta_Alimentacion_${nombreLimpio}.pdf`);
}

// ================================================================
// 6. PROPUESTA FORMAL DE COTIZACIÓN (FASE 4)
// ================================================================
export function generarDocCotizacion(cotizacion: CotizacionDB, configParam?: ConfiguracionGeneral): void {
  const config = configParam || getConfiguracionGlobal();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const prefijo = config.prefijo_cotizacion || 'COT-';
  const num = `${prefijo}${cotizacion.id.slice(0, 8).toUpperCase()}`;
  const ancho = doc.internal.pageSize.getWidth();

  encabezado(doc, 'COTIZACIÓN FORMAL DE SERVICIOS', num, config);

  let y = 48;

  // Datos cliente y finca
  doc.setFillColor(244, 241, 234);
  doc.rect(0, y, ancho, 32, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('DATOS DE LA COTIZACIÓN', 14, y + 8);
  doc.setTextColor(30, 27, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const col2 = ancho / 2 + 4;

  const cliNombre = cotizacion.clientes
    ? `${cotizacion.clientes.nombre} ${cotizacion.clientes.apellido || ''}`.trim()
    : 'Cliente Particular';
  doc.text(`Cliente: ${cliNombre}`, 14, y + 17);
  doc.text(`Finca: ${cotizacion.fincas?.nombre || 'Finca Campestre'}`, col2, y + 17);

  const waCli = cotizacion.clientes?.whatsapp || 'Coordinación directa';
  doc.text(`WhatsApp: ${waCli}`, 14, y + 26);
  doc.text(`Grupo: ${cotizacion.personas} personas`, col2, y + 26);

  y += 38;

  // Detalle de la estadía
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('DETALLE DE FECHAS Y ALOJAMIENTO', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  y = fila(doc, y, 'Fecha de ingreso:', formatFecha(cotizacion.fecha_inicio));
  y = fila(doc, y, 'Fecha de salida:', formatFecha(cotizacion.fecha_fin));
  y = fila(doc, y, 'Total de personas:', `${cotizacion.personas} huéspedes`);
  if (cotizacion.alimentacion && cotizacion.alimentacion !== 'Sin alimentación') {
    y = fila(doc, y, 'Servicio gastronómico:', cotizacion.alimentacion);
  }
  y += 4;
  y = linea(doc, y);

  // Liquidación de valores
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('DESGLOSE ECONÓMICO', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 8;

  y = fila(doc, y, 'Subtotal alojamiento:', formatCOP(cotizacion.subtotal_alojamiento));
  if (cotizacion.costo_alimentacion > 0) {
    y = fila(doc, y, 'Alimentación seleccionada:', formatCOP(cotizacion.costo_alimentacion));
  }
  if (cotizacion.descuento > 0) {
    y = fila(doc, y, 'Descuento aplicado:', `-${formatCOP(cotizacion.descuento)}`);
  }
  if (cotizacion.recargo > 0) {
    y = fila(doc, y, 'Recargos adicionales:', `+${formatCOP(cotizacion.recargo)}`);
  }

  y += 2;
  // Total destacado
  doc.setFillColor(230, 243, 240);
  doc.rect(14, y - 4, 182, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 107, 94);
  doc.text('VALOR TOTAL COTIZADO:', 18, y + 2.5);
  doc.text(formatCOP(cotizacion.total), 182, y + 2.5, { align: 'right' });
  doc.setTextColor(30, 27, 19);
  y += 14;

  // Condiciones y Políticas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('TÉRMINOS Y VALIDEZ DE LA COTIZACIÓN', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const terminos = config.terminos_condiciones || `• Esta cotización tiene una vigencia de 5 días hábiles a partir de su emisión.\n• Para formalizar y bloquear la disponibilidad de las fechas se requiere un anticipo del 50%.\n• Los precios pactados se respetan únicamente con la confirmación oportuna de la reserva.`;
  const lineas = terminos.split('\n');
  for (const l of lineas) {
    if (l.trim()) {
      const split = doc.splitTextToSize(l.trim(), 182);
      doc.text(split, 14, y);
      y += split.length * 4.2;
    }
  }

  // Firmas
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Elaborado por:', 14, y);
  doc.text('Aceptación de cotización:', col2, y);
  y += 14;
  doc.setDrawColor(30, 27, 19);
  doc.line(14, y, 80, y);
  doc.line(col2, y, col2 + 66, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Asesor Comercial • ${config.nombre_empresa}`, 14, y + 4.5);
  doc.text(cliNombre, col2, y + 4.5);

  pie(doc, config);
  doc.save(`Cotizacion_${cotizacion.id.slice(0, 8)}.pdf`);
}

// ---------------------------------------------------------------
// 7. EXPEDIENTE COMPLETO Y ACTA DE CIERRE (Fase 6)
// ---------------------------------------------------------------
export function generarExpedienteCompleto(
  reserva: Reserva,
  cierre?: CierreReserva | null,
  configParam?: ConfiguracionGeneral
) {
  const config = configParam || getConfiguracionGlobal();
  const doc = new jsPDF();
  const ancho = doc.internal.pageSize.getWidth();
  const col2 = 110;

  const cliNombre = obtenerNombreClienteHistorico(reserva);
  const cliContacto = obtenerContactoClienteHistorico(reserva);
  const finNombre = obtenerNombreFincaHistorico(reserva);
  const saldo = calcularSaldo(reserva);
  const totalPagado = reserva.valor_total - saldo;
  const numExpediente = `EXP-${reserva.id.slice(0, 8).toUpperCase()}`;

  encabezado(doc, 'EXPEDIENTE HISTÓRICO Y ACTA DE CIERRE', numExpediente, config);

  let y = 47;

  // Estado general
  doc.setFillColor(245, 247, 246);
  doc.roundedRect(14, y, ancho - 28, 12, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(26, 107, 94);
  doc.text(`EXPEDIENTE DE AUDITORÍA: ${numExpediente}`, 18, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 85, 75);
  const estadoStr = (reserva.estado || 'completada').toUpperCase();
  const fechaCierreStr = reserva.fecha_cierre || cierre?.fecha_cierre
    ? formatFecha((reserva.fecha_cierre || cierre?.fecha_cierre || '').split('T')[0])
    : formatFecha(new Date().toISOString().split('T')[0]);
  doc.text(`Estado: ${estadoStr}  •  Fecha de Cierre: ${fechaCierreStr}  •  Registros Inmutables Protegidos`, 18, y + 9);
  doc.setTextColor(30, 27, 19);
  y += 16;

  // Bloque 1: Datos del Huésped / Cliente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('1. EXPEDIENTE DEL CLIENTE / HUÉSPED TITULAR', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 5;

  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(220, 225, 222);
  doc.rect(14, y, ancho - 28, 22, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre completo: ${cliNombre}`, 18, y + 5.5);
  doc.text(`Teléfono / Celular: ${cliContacto.telefono || 'No registrado'}`, 18, y + 10.5);
  doc.text(`WhatsApp: ${cliContacto.whatsapp || 'No registrado'}`, 18, y + 15.5);

  doc.text(`Correo: ${cliContacto.correo || 'No registrado'}`, col2, y + 5.5);
  doc.text(`Identificador de Cliente: ${reserva.cliente_id.slice(0, 13)}…`, col2, y + 10.5);
  doc.text(`Integridad: Datos preservados en Snapshot inmutable`, col2, y + 15.5);
  y += 26;

  // Bloque 2: Datos de la Finca Campestre y Estancia
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('2. DETALLES DE LA FINCA Y ESTANCIA', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 5;

  doc.setFillColor(252, 252, 252);
  doc.rect(14, y, ancho - 28, 24, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Finca Campestre: ${finNombre}`, 18, y + 5.5);
  const zonaFinca = reserva.finca_snapshot?.zona || (reserva.fincas as any)?.zona || 'Santa Elena, El Cerrito';
  doc.text(`Ubicación / Sector: ${zonaFinca}`, 18, y + 10.5);
  doc.text(`Número de Huéspedes: ${reserva.personas} personas`, 18, y + 15.5);

  const [y1, m1, d1] = (reserva.fecha_inicio || '').split('-');
  const [y2, m2, d2] = (reserva.fecha_fin || '').split('-');
  const dt1 = new Date(reserva.fecha_inicio);
  const dt2 = new Date(reserva.fecha_fin);
  const nochesCalc = Math.max(1, Math.round((dt2.getTime() - dt1.getTime()) / (1000 * 3600 * 24)));

  doc.text(`Fecha de Entrada (Check-in): ${d1}/${m1}/${y1}`, col2, y + 5.5);
  doc.text(`Fecha de Salida (Check-out): ${d2}/${m2}/${y2}`, col2, y + 10.5);
  doc.text(`Total Noches de Alojamiento: ${nochesCalc} noche(s)`, col2, y + 15.5);
  y += 28;

  // Bloque 3: Balance Económico y Liquidación
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('3. DESGLOSE ECONÓMICO Y LIQUIDACIÓN DEFINITIVA', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 5;

  doc.setFillColor(248, 249, 248);
  doc.rect(14, y, ancho - 28, 26, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Concepto', 18, y + 5.5);
  doc.text('Monto COP', 182, y + 5.5, { align: 'right' });
  doc.line(14, y + 7.5, ancho - 14, y + 7.5);

  const costoAlim = reserva.costo_alimentacion || 0;
  const servAlim = reserva.alimentacion || 'Sin alimentación';
  doc.text(`Alojamiento por la estancia (${nochesCalc} noches, ${reserva.personas} pers.)`, 18, y + 12);
  doc.text(formatCOP(reserva.valor_total - costoAlim), 182, y + 12, { align: 'right' });

  if (costoAlim > 0) {
    doc.text(`Servicio de Alimentación (${servAlim})`, 18, y + 16.5);
    doc.text(formatCOP(costoAlim), 182, y + 16.5, { align: 'right' });
  }

  // Fila total liquidado
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL CONTRATADO:', 18, y + 21.5);
  doc.text(formatCOP(reserva.valor_total), 182, y + 21.5, { align: 'right' });
  y += 30;

  // Bloque 4: Historial de Pagos y Abonos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('4. HISTORIAL DE RECAUDO Y MOVIMIENTOS FINANCIEROS', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 5;

  const pagos = reserva.pagos || [];
  doc.setFillColor(26, 107, 94);
  doc.rect(14, y, ancho - 28, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha', 18, y + 4.2);
  doc.text('Tipo de Pago', 48, y + 4.2);
  doc.text('Detalle / Observación', 90, y + 4.2);
  doc.text('Valor COP', 182, y + 4.2, { align: 'right' });
  doc.setTextColor(30, 27, 19);
  y += 6;

  if (pagos.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.text('No hay registros detallados de abonos adicionales en la base de datos.', 18, y + 5);
    y += 8;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    pagos.forEach((p, idx) => {
      const fondo = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(fondo, fondo, fondo);
      doc.rect(14, y, ancho - 28, 5.5, 'F');
      doc.text(formatFecha(p.fecha), 18, y + 4);
      doc.text(p.tipo.toUpperCase(), 48, y + 4);
      doc.text((p.observacion || 'Abono verificado').slice(0, 42), 90, y + 4);
      const signo = p.tipo === 'devolucion' ? '-' : '+';
      doc.text(`${signo}${formatCOP(p.valor)}`, 182, y + 4, { align: 'right' });
      y += 5.5;
    });
  }

  // Resumen de saldo final
  doc.setFillColor(saldo <= 0 ? 230 : 255, saldo <= 0 ? 245 : 235, saldo <= 0 ? 236 : 235);
  doc.rect(14, y, ancho - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Total Recaudado: ${formatCOP(totalPagado)}`, 18, y + 4.8);
  doc.text(`Saldo Pendiente al Cierre: ${formatCOP(saldo)}`, 182, y + 4.8, { align: 'right' });
  y += 11;

  // Bloque 5: Acta de Cierre Operativo y Check-out
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 107, 94);
  doc.text('5. ACTA DE CIERRE OPERATIVO, ENTREGA Y OBSERVACIONES', 14, y);
  doc.setTextColor(30, 27, 19);
  y += 5;

  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(220, 225, 222);
  doc.rect(14, y, ancho - 28, 26, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');

  const responsableCierre = reserva.cerrada_por || cierre?.responsable || 'Administración de Fincas';
  const calif = cierre?.calificacion ? `${cierre.calificacion} / 5 Estrellas ★` : 'No calificada';
  const estadoFinca = cierre?.estado_entrega_finca
    ? cierre.estado_entrega_finca.replace('_', ' ').toUpperCase()
    : 'ENTREGA CONFORME EN BUEN ESTADO';
  const depGarantia = cierre?.deposito_garantia_devuelto
    ? `Depósito de garantía devuelto (${formatCOP(cierre?.valor_deposito_devuelto || 0)})`
    : 'Sin retenciones de depósito reportadas';

  doc.text(`Responsable de Cierre: ${responsableCierre}`, 18, y + 5);
  doc.text(`Calificación de la Estadía: ${calif}`, 18, y + 9.5);
  doc.text(`Estado de Entrega del Inmueble: ${estadoFinca}`, 18, y + 14);
  doc.text(`Garantía: ${depGarantia}`, 18, y + 18.5);

  const notasFinales = reserva.notas_cierre || cierre?.notas_cierre || reserva.observaciones || 'Operación finalizada a entera satisfacción sin novedades pendientes.';
  doc.text(`Observaciones de Cierre: ${notasFinales.slice(0, 110)}`, 18, y + 23);
  y += 30;

  // Firmas institucionales
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Por la Empresa Administradora:', 14, y);
  doc.text('Por el Cliente / Huésped Titular:', col2, y);
  y += 12;
  doc.setDrawColor(30, 27, 19);
  doc.line(14, y, 80, y);
  doc.line(col2, y, col2 + 66, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${responsableCierre} • ${config.nombre_empresa}`, 14, y + 4);
  doc.text(`${cliNombre}`, col2, y + 4);

  pie(doc, config);
  doc.save(`Expediente_${reserva.id.slice(0, 8)}.pdf`);
}

