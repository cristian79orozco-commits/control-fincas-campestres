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
  precio_pp: number;
  descripcion?: string | null;
  estado: FincaEstado;
  whatsapp?: string | null;
  activo: boolean;
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
  estado: CotizacionEstado;
  notas?: string | null;
  created_at?: string;
  updated_at?: string;
  clientes?: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'whatsapp'>;
  fincas?: Pick<Finca, 'id' | 'nombre'>;
  menus?: Pick<Menu, 'id' | 'nombre' | 'categoria' | 'precio_pp'>;
}

export type ReservaEstado = 'activa' | 'completada' | 'cancelada' | 'no_show';

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
  estado: ReservaEstado;
  observaciones?: string | null;
  created_at?: string;
  updated_at?: string;
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

export interface ConfiguracionGeneral {
  id: string; // 'general'
  // 1. Datos de Empresa
  nombre_empresa: string;
  nit?: string | null;
  eslogan?: string | null;
  logo_url?: string | null;
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

  created_at?: string;
  updated_at?: string;
}

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
  | 'estado'
  | 'filtros'
  | 'catalogo'
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

  // 4. Estado Actual (Resumen de fincas)
  estado_visible: boolean;
  estado_titulo: string;
  estado_subtitulo: string;
  estado_badge_texto: string;
  estado_ayuda_texto: string;

  // 5. Filtros de Búsqueda
  filtros_visible: boolean;
  filtros_titulo: string;
  filtros_subtitulo: string;
  filtros_badge_titulo: string;
  filtros_badge_texto: string;

  // 6. Catálogo de Fincas
  catalogo_visible: boolean;
  catalogo_titulo: string;
  catalogo_subtitulo: string;
  catalogo_vacio_texto: string;

  // 7. Menús Campestres (Portal Público)
  menus_visible: boolean;
  menus_titulo: string;
  menus_subtitulo: string;
  menus_badge_texto: string;

  // 8. Preguntas Frecuentes (FAQ)
  faq_visible: boolean;
  faq_titulo: string;
  faq_subtitulo: string;
  faq_items: FaqItem[];

  // 9. Pie de página (Footer)
  footer_visible: boolean;
  footer_titulo: string;
  footer_subtitulo: string;
  footer_whatsapp_cta: string;

  created_at?: string;
  updated_at?: string;
}
