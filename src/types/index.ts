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
  | 'whatsapp';

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

