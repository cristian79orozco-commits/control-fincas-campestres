export type FincaEstado = 'disponible' | 'alta_demanda' | 'fin_de_semana' | 'no_disponible';

export interface FincaImagen {
  id?: number | string;
  finca_id: string;
  url: string;
  alt?: string | null;
  orden: number;
  es_principal: boolean;
  created_at?: string;
}

export interface FincaAmenidad {
  id?: number | string;
  finca_id: string;
  nombre: string;
  icono?: string | null;
}

export interface FincaPlan {
  id?: number | string;
  finca_id: string;
  nombre: string;
}

export interface Finca {
  id: string;
  nombre: string;
  zona: string;
  capacidad: number;
  capacidad_minima?: number | null;
  precio_pp: number;
  descripcion?: string | null;
  estado: FincaEstado;
  whatsapp?: string | null;
  activo: boolean;
  // Campos profesionales extendidos
  habitaciones?: number | null;
  camas?: number | null;
  banos?: number | null;
  checkin_hora?: string | null;
  checkout_hora?: string | null;
  politica_mascotas?: string | null;
  valor_mascota?: number | null;
  politica_musica?: string | null;
  precio_finca_completa?: number | null;
  deposito_garantia?: number | null;
  normas?: string | null;
  indicaciones_llegada?: string | null;
  // Cuenta bancaria del propietario para separación / abono
  banco_nombre?: string | null;
  banco_tipo_cuenta?: string | null;
  banco_cuenta?: string | null;
  banco_titular?: string | null;
  banco_identificacion?: string | null;
  created_at?: string;
  updated_at?: string;
  finca_imagenes?: FincaImagen[];
  finca_amenidades?: FincaAmenidad[];
  finca_planes?: FincaPlan[];
}

export interface BloqueoDisponibilidad {
  id: number | string;
  finca_id: string;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;    // YYYY-MM-DD
  estado: 'ocupado' | 'libre';
  personas?: number | null;
  notas?: string | null;
  created_at?: string;
  fincas?: {
    nombre: string;
  } | {
    nombre: string;
  }[];
}

export interface FiltrosBusqueda {
  fechaInicio: string;
  fechaFin: string;
  personas: string;
}

export interface Cotizacion {
  finca: Finca;
  fechaInicio: string;
  fechaFin: string;
  noches: number;
  personas: number;
  plan: string;
  precioBasePorPersona: number;
  subtotalAlojamiento: number;
  costoPlanTotal: number;
  totalEstimado: number;
  waMensaje: string;
  waUrl: string;
}

export type ViewType = 'cliente' | 'detalle' | 'admin';

// ---------------------------------------------------------------
// FASE 1 — Nuevos tipos
// ---------------------------------------------------------------

export interface Cliente {
  id: string;
  nombre: string;
  apellido?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  correo?: string | null;
  observaciones?: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export type CotizacionEstado =
  | 'borrador'
  | 'cotizada'
  | 'enviada'
  | 'pendiente'
  | 'confirmada'
  | 'cancelada'
  | 'vencida';

export interface CotizacionDB {
  id: string;
  cliente_id?: string | null;
  finca_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  personas: number;
  noches?: number;
  menu_id?: string | null;
  cantidad_alimentacion?: number;
  alimentacion?: string | null;
  precio_base_pp: number;
  subtotal_alojamiento: number;
  costo_alimentacion: number;
  descuento: number;
  recargo: number;
  total: number;
  consecutivo?: string | null;  // Consecutivo numérico de seguimiento (ej: 1001, sin letras al inicio)
  estado: CotizacionEstado;
  notas?: string | null;
  created_at?: string;
  updated_at?: string;
  clientes?: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'whatsapp'>;
  fincas?: Pick<Finca, 'id' | 'nombre' | 'banco_nombre' | 'banco_tipo_cuenta' | 'banco_cuenta' | 'banco_titular' | 'banco_identificacion'>;
  menus?: Pick<Menu, 'id' | 'nombre' | 'categoria' | 'precio_pp'>;
}

export type ReservaEstado = 'activa' | 'completada' | 'cancelada' | 'no_show';
export type EstadoAlimentacion = 'pendiente' | 'parcial' | 'pagada' | 'cancelada';

export interface Reserva {
  id: string;
  cotizacion_id?: string | null;
  cliente_id: string;
  finca_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  personas: number;
  valor_total: number;
  separacion: number;
  menu_id?: string | null;
  alimentacion?: string | null;
  costo_alimentacion?: number;
  estado_alimentacion?: EstadoAlimentacion | null;
  monto_pagado_alimentacion?: number;
  saldo_pendiente_alimentacion?: number;
  fecha_pago_alimentacion?: string | null;
  metodo_pago_alimentacion?: string | null;
  consecutivo?: string | null;  // Consecutivo numérico de seguimiento (ej: 1001, sin letras al inicio)
  estado: ReservaEstado;
  observaciones?: string | null;
  created_at?: string;
  updated_at?: string;
  // Fase 6: Cierre y Snapshots inmutables para blindaje histórico
  fecha_cierre?: string | null;
  cerrada_por?: string | null;
  notas_cierre?: string | null;
  cliente_snapshot?: {
    id?: string;
    nombre: string;
    apellido?: string | null;
    whatsapp?: string | null;
    telefono?: string | null;
    correo?: string | null;
  } | null;
  finca_snapshot?: {
    id?: string;
    nombre: string;
    zona?: string | null;
    capacidad?: number | null;
    capacidad_minima?: number | null;
    precio_pp?: number | null;
  } | null;
  cotizacion_snapshot?: Record<string, any> | null;
  cierre?: CierreReserva | null;
  // Relaciones expandidas
  clientes?: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'whatsapp' | 'telefono'>;
  fincas?: Pick<Finca, 'id' | 'nombre'>;
  menus?: Pick<Menu, 'id' | 'nombre' | 'categoria' | 'precio_pp'>;
  pagos?: Pago[];
}

export type PagoTipo = 'separacion' | 'abono' | 'pago_total' | 'devolucion';

export interface Pago {
  id: string;
  reserva_id: string;
  tipo: PagoTipo;
  fecha: string;
  valor: number;
  observacion?: string | null;
  created_at?: string;
}

// Saldo calculado en frontend a partir de pagos
export function calcularSaldo(reserva: Reserva): number {
  if (!reserva.pagos || reserva.pagos.length === 0) {
    return reserva.valor_total - reserva.separacion;
  }
  const totalPagado = reserva.pagos.reduce((acc, p) => {
    return acc + (p.tipo === 'devolucion' ? -p.valor : p.valor);
  }, 0);
  return reserva.valor_total - totalPagado;
}

/**
 * Desglose financiero independiente pero centralizado:
 * Separa de manera transparente lo que le corresponde al Propietario de la finca
 * de lo que le corresponde a la Administración por servicios de alimentación.
 */
export function desglosarFinanzasReserva(reserva: Reserva) {
  const costoAlim = reserva.costo_alimentacion || 0;
  const snap = reserva.cotizacion_snapshot || {};
  const subtotalAlojamiento = typeof snap.subtotal_alojamiento === 'number'
    ? snap.subtotal_alojamiento
    : Math.max(0, reserva.valor_total - costoAlim);

  // Pagos totales
  const totalPagos = (reserva.pagos || []).reduce((acc, p) => {
    return acc + (p.tipo === 'devolucion' ? -p.valor : p.valor);
  }, 0);
  const totalRecaudado = (reserva.pagos && reserva.pagos.length > 0) ? totalPagos : reserva.separacion;

  // Monto pagado de alimentación
  let pagadoAlimentacion = 0;
  if (costoAlim > 0) {
    if (typeof reserva.monto_pagado_alimentacion === 'number') {
      pagadoAlimentacion = reserva.monto_pagado_alimentacion;
    } else if (typeof snap.monto_pagado_alimentacion === 'number') {
      pagadoAlimentacion = snap.monto_pagado_alimentacion;
    } else if (reserva.estado_alimentacion === 'pagada' || snap.estado_alimentacion === 'pagada') {
      pagadoAlimentacion = costoAlim;
    } else {
      // Buscar en pagos aquellos con etiqueta de alimentación
      const pagosAlim = (reserva.pagos || []).filter(p =>
        p.observacion?.toLowerCase().includes('alimentaci') ||
        p.observacion?.toLowerCase().includes('menú') ||
        p.observacion?.toLowerCase().includes('menu')
      );
      if (pagosAlim.length > 0) {
        pagadoAlimentacion = pagosAlim.reduce((acc, p) => acc + (p.tipo === 'devolucion' ? -p.valor : p.valor), 0);
      }
    }
  }
  pagadoAlimentacion = Math.max(0, Math.min(costoAlim, pagadoAlimentacion));

  // El resto de los pagos corresponde al alojamiento (finca para el propietario)
  const pagadoFinca = Math.max(0, Math.min(subtotalAlojamiento, totalRecaudado - pagadoAlimentacion));
  const saldoFincaCheckIn = Math.max(0, subtotalAlojamiento - pagadoFinca);
  const saldoAlimentacionAdmin = Math.max(0, costoAlim - pagadoAlimentacion);
  const saldoConsolidado = saldoFincaCheckIn + saldoAlimentacionAdmin;

  return {
    subtotalAlojamiento,
    pagadoFinca,
    saldoFincaCheckIn,
    costoAlimentacion: costoAlim,
    pagadoAlimentacion,
    saldoAlimentacionAdmin,
    totalConsolidado: reserva.valor_total,
    totalRecaudado,
    saldoConsolidado,
  };
}

// ---------------------------------------------------------------
// FASE 2 — Tipos de Menús y Alimentación
// ---------------------------------------------------------------

export type MenuCategoria =
  | 'Desayuno'
  | 'Almuerzo'
  | 'Cena'
  | 'Parrilla'
  | 'Refrigerio'
  | 'Menú especial'
  | 'Paquetes';

export interface MenuImagen {
  id?: number | string;
  menu_id: string;
  url: string;
  alt?: string | null;
  orden: number;
  es_principal: boolean;
  created_at?: string;
}

export interface Menu {
  id: string;
  nombre: string;
  descripcion?: string | null;
  categoria: MenuCategoria;
  precio_pp: number;
  condiciones?: string | null;
  imagen_url?: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
  menu_imagenes?: MenuImagen[];
}

// Panel admin: secciones del sidebar
export type AdminSection =
  | 'dashboard'
  | 'fincas'
  | 'disponibilidad'
  | 'clientes'
  | 'cotizaciones'
  | 'reservas'
  | 'menus'
  | 'historial'
  | 'whatsapp'
  | 'configuracion'
  | 'personalizacion';

// ---------------------------------------------------------------
// FASE 3 — Tipos de Comunicaciones y WhatsApp
// ---------------------------------------------------------------

export type TipoComunicacion =
  | 'cotizacion'
  | 'separacion'
  | 'abono'
  | 'estado_cuenta'
  | 'paz_salvo'
  | 'menu'
  | 'recordatorio_pago'
  | 'bienvenida'
  | 'personalizado';

export interface Comunicacion {
  id: string;
  cliente_id?: string | null;
  reserva_id?: string | null;
  cotizacion_id?: string | null;
  tipo: TipoComunicacion;
  destinatario: string;
  telefono: string;
  mensaje: string;
  estado: 'enviado' | 'preparado' | 'fallido';
  created_at?: string;
  clientes?: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'whatsapp' | 'telefono'>;
}

// ---------------------------------------------------------------
// FASE 4 — Configuración General (Empresa y Documentos)
// ---------------------------------------------------------------

export interface RedesSociales {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
}

export interface PlantillasPdfPersonalizadas {
  // Títulos de documentos
  titulo_cotizacion?: string;
  titulo_separacion?: string;
  titulo_abono?: string;
  titulo_estado_cuenta?: string;
  titulo_paz_salvo?: string;
  titulo_propuesta_menu?: string;

  // Textos, instrucciones y condiciones específicas
  instruccion_abono_cotizacion?: string;
  vigencia_cotizacion?: string;
  clausulas_separacion?: string;
  politicas_cancelacion?: string;
  texto_paz_salvo?: string;
  condiciones_gastronomicas?: string;
  pie_firma_admin?: string;
  pie_firma_cargo?: string;
  firma_digital_url?: string | null;
  pie_firma_cliente?: string;
}

export interface ConfiguracionGeneral {
  id: string; // 'general'
  // 1. Datos de Empresa
  nombre_empresa: string;
  nit?: string | null;
  eslogan?: string | null;
  logo_url?: string | null;
  firma_digital_url?: string | null;
  telefono?: string | null;
  whatsapp: string;
  correo?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  sitio_web?: string | null;
  redes_sociales?: RedesSociales;

  // 2. Configuración de Documentos
  doc_logo_url?: string | null;
  doc_encabezado?: string | null;
  doc_pie_pagina?: string | null;
  doc_contacto_info?: string | null;
  terminos_condiciones?: string | null;
  textos_legales?: string | null;
  politicas_cancelacion?: string | null;

  // 3. Consecutivos y Prefijos de Documentación
  prefijo_cotizacion: string;
  siguiente_cotizacion: number;
  prefijo_separacion: string;
  siguiente_separacion: number;
  prefijo_abono: string;
  siguiente_abono: number;
  prefijo_estado_cuenta: string;
  siguiente_estado_cuenta: number;
  prefijo_paz_salvo: string;
  siguiente_paz_salvo: number;
  prefijo_propuesta_menu: string;
  siguiente_propuesta_menu: number;

  // 4. Datos Bancarios para Abonos y Pagos
  banco_nombre?: string | null;
  banco_tipo_cuenta?: string | null;
  banco_cuenta?: string | null;
  banco_titular?: string | null;
  banco_identificacion?: string | null;

  // 5. Plantillas de Mensajes de Comunicación y PDF Editables
  plantillas_comunicacion?: Record<string, string>;
  plantillas_pdf?: PlantillasPdfPersonalizadas;

  // 6. Regla Operativa de Alimentación Mínima por Tamaño de Grupo
  regla_alimentacion_activa?: boolean;
  regla_alimentacion_max_personas?: number;
  regla_alimentacion_min_servicios?: number;
  regla_alimentacion_mensaje?: string | null;

  // 7. Método de Apertura de WhatsApp (Desktop PC vs Web)
  metodo_whatsapp?: MetodoEnvioWhatsApp;

  created_at?: string;
  updated_at?: string;
}

export type MetodoEnvioWhatsApp = 'desktop' | 'web' | 'native';

// ---------------------------------------------------------------
// FASE 5 — Control del Contenido del Cliente (Sitio Público)
// ---------------------------------------------------------------

export interface BeneficioItem {
  id: string;
  icono: string;
  titulo: string;
  descripcion: string;
}

export interface FaqItem {
  id: string;
  pregunta: string;
  respuesta: string;
}

export type SeccionClave =
  | 'banner'
  | 'hero'
  | 'destacados'
  | 'graficos'
  | 'estado'
  | 'filtros'
  | 'catalogo'
  | 'comparador'
  | 'portal_cliente'
  | 'menus'
  | 'faq';

export interface ContenidoSitio {
  id: string; // 'principal'

  // Orden de secciones en la página pública
  orden_secciones: SeccionClave[];

  // 1. Banner Superior Promocional
  banner_visible: boolean;
  banner_texto: string;
  banner_link_texto: string;
  banner_link_url: string;
  banner_tipo: 'promo' | 'info' | 'aviso';

  // 2. Hero Section
  hero_visible: boolean;
  hero_eyebrow: string;
  hero_titulo: string;
  hero_subtitulo: string;
  hero_cta_texto: string;
  hero_cta_secundario_texto: string;
  hero_mostrar_metricas: boolean;
  hero_mostrar_pasos: boolean;
  hero_paso_1: string;
  hero_paso_2: string;
  hero_paso_3: string;
  hero_imagen_url?: string | null;
  hero_badge_ubicacion?: string | null;

  // 3. Información Destacada / Beneficios
  destacados_visible: boolean;
  destacados_titulo: string;
  destacados_subtitulo: string;
  destacados_items: BeneficioItem[];

  // 4. Visualización y Gráficos Interactivos (Chart.js / 3D)
  graficos_visible?: boolean;
  graficos_titulo?: string;
  graficos_subtitulo?: string;
  graficos_tipo?: 'ambos' | 'comparativa' | 'presupuesto';

  // 5. Estado Actual (Resumen de fincas)
  estado_visible: boolean;
  estado_titulo: string;
  estado_subtitulo: string;
  estado_badge_texto: string;
  estado_ayuda_texto: string;

  // 6. Filtros de Búsqueda
  filtros_visible: boolean;
  filtros_titulo: string;
  filtros_subtitulo: string;
  filtros_badge_titulo: string;
  filtros_badge_texto: string;

  // 7. Catálogo de Fincas y Opciones de Presentación
  catalogo_visible: boolean;
  catalogo_titulo: string;
  catalogo_subtitulo: string;
  catalogo_vacio_texto: string;
  catalogo_vista_predeterminada?: 'grid' | 'lista';
  catalogo_mostrar_badges?: boolean;
  catalogo_mostrar_precio_total?: boolean;

  // 8. Comparador de Fincas Cara a Cara
  comparador_visible?: boolean;
  comparador_titulo?: string;
  comparador_subtitulo?: string;

  // 9. Portal de Autogestión del Huésped (Consultar Reserva / Cotización)
  portal_cliente_visible?: boolean;
  portal_cliente_titulo?: string;
  portal_cliente_subtitulo?: string;

  // 10. Menús Campestres (Portal Público)
  menus_visible: boolean;
  menus_titulo: string;
  menus_subtitulo: string;
  menus_badge_texto: string;

  // 11. Preguntas Frecuentes (FAQ)
  faq_visible: boolean;
  faq_titulo: string;
  faq_subtitulo: string;
  faq_items: FaqItem[];

  // 12. Pie de página (Footer)
  footer_visible: boolean;
  footer_titulo: string;
  footer_subtitulo: string;
  footer_whatsapp_cta: string;

  // 13. Opciones Visuales Avanzadas
  personalizacion_visual?: {
    estilo_tarjeta?: 'moderno_3d' | 'clasico';
    tema_color?: 'esmeralda' | 'dorado' | 'bosque' | 'lujo_oscuro';
  };

  created_at?: string;
  updated_at?: string;
}

// ---------------------------------------------------------------
// FASE 6 — Historial y Cierre de Reservas
// ---------------------------------------------------------------

export type EstadoEntregaFinca = 'excelente' | 'bueno' | 'con_observaciones' | 'danos_reportados';

export interface CierreReserva {
  id?: string;
  reserva_id: string;
  fecha_cierre: string;
  responsable?: string | null;
  estado_cierre: ReservaEstado;
  calificacion?: number | null; // 1 a 5 estrellas
  estado_entrega_finca?: EstadoEntregaFinca;
  deposito_garantia_devuelto?: boolean;
  valor_deposito_devuelto?: number;
  notas_cierre?: string | null;
  observaciones_entrega?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FiltrosHistorial {
  busqueda: string;
  fechaDesde: string;
  fechaHasta: string;
  mes: string; // 'todos' | '01'..'12'
  anio: string; // 'todos' | '2024'..'2030'
  fincaId: string; // 'todas' | id
  clienteId: string; // 'todos' | id
  estado: string; // 'todas' | 'completada' | 'cancelada' | 'no_show' | 'activa'
}

/**
 * Helpers para garantizar que aun si un cliente o finca es modificado o desactivado,
 * el historial obtenga siempre los datos inmutables preservados en el snapshot.
 */
export function obtenerNombreClienteHistorico(reserva: Reserva): string {
  if (reserva.cliente_snapshot?.nombre) {
    return `${reserva.cliente_snapshot.nombre} ${reserva.cliente_snapshot.apellido || ''}`.trim();
  }
  if (reserva.clientes?.nombre) {
    return `${reserva.clientes.nombre} ${reserva.clientes.apellido || ''}`.trim();
  }
  return 'Cliente no especificado';
}

export function obtenerContactoClienteHistorico(reserva: Reserva): {
  whatsapp?: string;
  telefono?: string;
  correo?: string;
} {
  return {
    whatsapp: reserva.cliente_snapshot?.whatsapp || reserva.clientes?.whatsapp || undefined,
    telefono: reserva.cliente_snapshot?.telefono || reserva.clientes?.telefono || undefined,
    correo: reserva.cliente_snapshot?.correo || undefined,
  };
}

export function obtenerNombreFincaHistorico(reserva: Reserva): string {
  if (reserva.finca_snapshot?.nombre) {
    return reserva.finca_snapshot.nombre;
  }
  if (reserva.fincas?.nombre) {
    return reserva.fincas.nombre;
  }
  return 'Finca no especificada';
}

