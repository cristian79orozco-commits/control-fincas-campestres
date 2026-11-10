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
  // Comisión del administrador / broker comercial y datos de contacto de propietario
  porcentaje_comision?: number | null;
  tipo_comision?: 'porcentaje' | 'monto_fijo' | null;
  valor_comision_fija?: number | null;
  propietario_nombre?: string | null;
  propietario_telefono?: string | null;
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
  cantidad_mascotas?: number | null;
  costo_mascotas?: number | null;
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
  fincas?: Pick<Finca, 'id' | 'nombre' | 'banco_nombre' | 'banco_tipo_cuenta' | 'banco_cuenta' | 'banco_titular' | 'banco_identificacion' | 'politica_mascotas' | 'valor_mascota' | 'deposito_garantia'>;
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
  cantidad_mascotas?: number | null;
  costo_mascotas?: number | null;
  estado_alimentacion?: EstadoAlimentacion | null;
  monto_pagado_alimentacion?: number;
  saldo_pendiente_alimentacion?: number;
  fecha_pago_alimentacion?: string | null;
  metodo_pago_alimentacion?: string | null;
  // Gestión de comisión de promotor y logística de alimentación
  comision_porcentaje?: number | null;
  comision_monto?: number | null;
  comision_estado?: 'pendiente' | 'cobrada' | 'no_aplica' | null;
  comision_fecha_cobro?: string | null;
  alimentacion_compras_listas?: boolean | null;
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
  fincas?: Pick<Finca, 'id' | 'nombre' | 'deposito_garantia' | 'politica_mascotas' | 'valor_mascota' | 'banco_nombre' | 'banco_tipo_cuenta' | 'banco_cuenta' | 'banco_titular' | 'banco_identificacion'>;
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

/**
 * Resuelve y enriquece de forma centralizada los metadatos de una finca (incluyendo
 * depósito reembolsable, política/tarifa de mascotas y datos bancarios) desde el objeto
 * proporcionado o desde la caché local sincronizada cuando la relación de Supabase viene parcial.
 */
export function resolverMetadatosFinca(
  finca?: Partial<Finca> | Record<string, any> | null,
  fincaIdFallback?: string | null
): Partial<Finca> {
  const fId = finca?.id || fincaIdFallback || '';
  let cacheFinca: Partial<Finca> = {};
  let extMeta: Partial<Finca> = {};

  if (fId && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const rawCache = localStorage.getItem('fc_cache_fincas');
      if (rawCache) {
        const lista = JSON.parse(rawCache);
        if (Array.isArray(lista)) {
          const encontrada = lista.find((x: any) => x && x.id === fId);
          if (encontrada) cacheFinca = encontrada;
        }
      }
      const rawExt = localStorage.getItem('fc_fincas_extended_meta');
      if (rawExt) {
        const mapa = JSON.parse(rawExt);
        if (mapa && typeof mapa === 'object' && mapa[fId]) {
          extMeta = mapa[fId];
        }
      }
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }

  return {
    ...cacheFinca,
    ...extMeta,
    ...(finca || {}),
    deposito_garantia:
      finca?.deposito_garantia !== undefined && finca?.deposito_garantia !== null
        ? Number(finca.deposito_garantia)
        : extMeta?.deposito_garantia !== undefined && extMeta?.deposito_garantia !== null
        ? Number(extMeta.deposito_garantia)
        : cacheFinca?.deposito_garantia !== undefined && cacheFinca?.deposito_garantia !== null
        ? Number(cacheFinca.deposito_garantia)
        : 0,
    politica_mascotas:
      finca?.politica_mascotas || extMeta?.politica_mascotas || cacheFinca?.politica_mascotas || 'permitido',
    valor_mascota:
      finca?.valor_mascota !== undefined && finca?.valor_mascota !== null
        ? Number(finca.valor_mascota)
        : extMeta?.valor_mascota !== undefined && extMeta?.valor_mascota !== null
        ? Number(extMeta.valor_mascota)
        : cacheFinca?.valor_mascota !== undefined && cacheFinca?.valor_mascota !== null
        ? Number(cacheFinca.valor_mascota)
        : 0,
    banco_nombre: finca?.banco_nombre || extMeta?.banco_nombre || cacheFinca?.banco_nombre || 'Bancolombia',
    banco_tipo_cuenta: finca?.banco_tipo_cuenta || extMeta?.banco_tipo_cuenta || cacheFinca?.banco_tipo_cuenta || 'Ahorros',
    banco_cuenta: finca?.banco_cuenta || extMeta?.banco_cuenta || cacheFinca?.banco_cuenta || null,
    banco_titular: finca?.banco_titular || extMeta?.banco_titular || cacheFinca?.banco_titular || null,
    banco_identificacion: finca?.banco_identificacion || extMeta?.banco_identificacion || cacheFinca?.banco_identificacion || null,
    porcentaje_comision:
      finca?.porcentaje_comision !== undefined && finca?.porcentaje_comision !== null
        ? Number(finca.porcentaje_comision)
        : extMeta?.porcentaje_comision !== undefined && extMeta?.porcentaje_comision !== null
        ? Number(extMeta.porcentaje_comision)
        : cacheFinca?.porcentaje_comision !== undefined && cacheFinca?.porcentaje_comision !== null
        ? Number(cacheFinca.porcentaje_comision)
        : 10, // Predeterminado: 10% de comisión estándar
    tipo_comision: finca?.tipo_comision || extMeta?.tipo_comision || cacheFinca?.tipo_comision || 'porcentaje',
    valor_comision_fija: Number(finca?.valor_comision_fija || extMeta?.valor_comision_fija || cacheFinca?.valor_comision_fija || 0),
    propietario_nombre: finca?.propietario_nombre || extMeta?.propietario_nombre || cacheFinca?.propietario_nombre || finca?.banco_titular || 'Propietario',
    propietario_telefono: finca?.propietario_telefono || extMeta?.propietario_telefono || cacheFinca?.propietario_telefono || finca?.whatsapp || null,
  };
}

/**
 * Extrae de forma centralizada la cantidad y costo de mascotas desde una Cotización o Reserva
 * (soportando campos directos, cotizacion_snapshot o metadatos embebidos en notas/observaciones).
 */
export function extraerInfoMascotas(
  item?: Partial<CotizacionDB> | Partial<Reserva> | Record<string, any> | null,
  finca?: Partial<Finca> | Record<string, any> | null
): { cantidadMascotas: number; costoMascotas: number; valorUnitario: number } {
  const fincaResuelta = resolverMetadatosFinca(
    finca || (item as any)?.fincas || (item as any)?.finca_snapshot,
    (item as any)?.finca_id
  );
  if (!item) {
    const valUnit = fincaResuelta?.politica_mascotas === 'con_costo' ? Number(fincaResuelta?.valor_mascota || 0) : 0;
    return { cantidadMascotas: 0, costoMascotas: 0, valorUnitario: valUnit };
  }

  const snap = (item as Reserva).cotizacion_snapshot || {};
  let cantidad = typeof item.cantidad_mascotas === 'number'
    ? item.cantidad_mascotas
    : (typeof snap.cantidad_mascotas === 'number' ? snap.cantidad_mascotas : 0);

  let costo = typeof item.costo_mascotas === 'number'
    ? item.costo_mascotas
    : (typeof snap.costo_mascotas === 'number' ? snap.costo_mascotas : 0);

  const textoNotas = `${(item as CotizacionDB).notas || ''} ${(item as Reserva).observaciones || ''}`;

  if (cantidad <= 0 && textoNotas) {
    const matchTag = textoNotas.match(/\[MASCOTAS:(\d+):(\d+)\]/i);
    if (matchTag) {
      cantidad = parseInt(matchTag[1], 10) || 0;
      costo = parseInt(matchTag[2], 10) || 0;
    } else {
      const matchTexto = textoNotas.match(/Mascotas:\s*(\d+)\s*(?:\(\$([\d.,]+)\s*COP)?/i);
      if (matchTexto) {
        cantidad = parseInt(matchTexto[1], 10) || 0;
        if (matchTexto[2]) {
          costo = parseInt(matchTexto[2].replace(/\D/g, ''), 10) || 0;
        }
      }
    }
  }

  const valorFinca = fincaResuelta?.politica_mascotas === 'con_costo' ? Number(fincaResuelta?.valor_mascota || 0) : 0;
  if (cantidad > 0 && costo <= 0 && valorFinca > 0) {
    costo = cantidad * valorFinca;
  }

  const valorUnitario = cantidad > 0 && costo > 0
    ? Math.round(costo / cantidad)
    : valorFinca;

  return {
    cantidadMascotas: Math.max(0, cantidad),
    costoMascotas: Math.max(0, costo),
    valorUnitario: Math.max(0, valorUnitario),
  };
}

/**
 * Limpia las etiquetas técnicas o embebidas de mascotas de un texto de notas u observaciones
 * para que no se dupliquen al mostrarlas en documentos o mensajes.
 */
export function limpiarMetaMascotasDeTexto(textoOriginal?: string | null): string {
  if (!textoOriginal) return '';
  return textoOriginal
    .replace(/\s*·?\s*🐾\s*Mascotas:\s*\d+\s*(?:\(\$[\d.,]+\s*COP[^)]*\)|\(Sin costo adicional\))?/gi, '')
    .replace(/\s*\[MASCOTAS:\d+:\d+\]/gi, '')
    .trim();
}

/**
 * Embebe de forma limpia y legible la información de mascotas en notas u observaciones
 * para garantizar persistencia total en Supabase sin depender de migraciones de esquema.
 */
export function adjuntarMetaMascotasEnTexto(
  textoOriginal: string | null | undefined,
  cantidadMascotas: number,
  costoMascotas: number
): string | null {
  const limpio = limpiarMetaMascotasDeTexto(textoOriginal);

  if (!cantidadMascotas || cantidadMascotas <= 0) {
    return limpio || null;
  }

  const etiqueta = costoMascotas > 0
    ? `🐾 Mascotas: ${cantidadMascotas} ($${costoMascotas.toLocaleString('es-CO')} COP)`
    : `🐾 Mascotas: ${cantidadMascotas} (Sin costo adicional)`;

  return limpio ? `${limpio} · ${etiqueta}` : etiqueta;
}

/**
 * Desglosa las finanzas de una Cotización separando claramente lo que corresponde a
 * la Reserva de la Finca (Alojamiento Base + Mascotas + Depósito de Garantía informativo)
 * y a la Administración (Alimentación).
 */
export function desglosarFinanzasCotizacion(
  cotizacion: Partial<CotizacionDB> | null | undefined,
  finca?: Partial<Finca> | null
) {
  const fincaResuelta = resolverMetadatosFinca(
    finca || cotizacion?.fincas,
    cotizacion?.finca_id
  );
  const depositoGarantia = Math.max(0, Number(fincaResuelta?.deposito_garantia || 0));

  if (!cotizacion) {
    return {
      subtotalAlojamientoBase: 0,
      cantidadMascotas: 0,
      costoMascotas: 0,
      valorMascotaUnitario: 0,
      depositoGarantia,
      totalPropietarioFinca: 0,
      abono50Propietario: 0,
      costoAlimentacion: 0,
      descuento: 0,
      recargo: 0,
      totalCotizado: 0,
    };
  }

  const infoMascotas = extraerInfoMascotas(cotizacion, fincaResuelta);
  const costoAlimentacion = Number(cotizacion.costo_alimentacion || 0);
  const descuento = Number(cotizacion.descuento || 0);
  const recargo = Number(cotizacion.recargo || 0);
  const totalCotizado = Number(cotizacion.total || 0);
  const subRaw = Number(cotizacion.subtotal_alojamiento || 0);

  // Determinar total que va a la Finca (todo excepto alimentación)
  const totalPropietarioFinca = totalCotizado > 0
    ? Math.max(0, totalCotizado - costoAlimentacion)
    : Math.max(0, subRaw + infoMascotas.costoMascotas - descuento + recargo);

  // Determinar alojamiento base sin mascotas
  const subtotalAlojamientoBase = Math.abs((subRaw + infoMascotas.costoMascotas + costoAlimentacion - descuento + recargo) - totalCotizado) <= 10 && subRaw > 0
    ? subRaw
    : Math.max(0, totalPropietarioFinca - infoMascotas.costoMascotas + descuento - recargo);

  const abono50Propietario = Math.round(totalPropietarioFinca * 0.5);

  return {
    subtotalAlojamientoBase,
    cantidadMascotas: infoMascotas.cantidadMascotas,
    costoMascotas: infoMascotas.costoMascotas,
    valorMascotaUnitario: infoMascotas.valorUnitario,
    depositoGarantia,
    totalPropietarioFinca,
    abono50Propietario,
    costoAlimentacion,
    descuento,
    recargo,
    totalCotizado: totalCotizado || (totalPropietarioFinca + costoAlimentacion),
  };
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
 * (Alojamiento Base + Ingreso de Mascotas) de lo que le corresponde a la Administración
 * por servicios de alimentación.
 */
export function desglosarFinanzasReserva(reserva: Reserva, finca?: Partial<Finca> | null) {
  const fincaResuelta = resolverMetadatosFinca(
    finca || reserva.fincas || reserva.finca_snapshot,
    reserva.finca_id
  );
  const depositoGarantia = Math.max(0, Number(fincaResuelta?.deposito_garantia || 0));
  const costoAlim = reserva.costo_alimentacion || 0;
  const snap = reserva.cotizacion_snapshot || {};
  const infoMascotas = extraerInfoMascotas(reserva, fincaResuelta);

  // Todo lo que no es alimentación corresponde al Propietario de la Finca (Alojamiento + Mascotas)
  const subtotalAlojamiento = Math.max(0, (reserva.valor_total || 0) - costoAlim);
  const subtotalAlojamientoBase = Math.max(0, subtotalAlojamiento - infoMascotas.costoMascotas);

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

  // El resto de los pagos corresponde al propietario de la finca (alojamiento + mascotas)
  const pagadoFinca = Math.max(0, Math.min(subtotalAlojamiento, totalRecaudado - pagadoAlimentacion));
  const saldoFincaCheckIn = Math.max(0, subtotalAlojamiento - pagadoFinca);
  const saldoAlimentacionAdmin = Math.max(0, costoAlim - pagadoAlimentacion);
  const saldoConsolidado = saldoFincaCheckIn + saldoAlimentacionAdmin;

  return {
    subtotalAlojamiento, // Total Propietario de la Finca (Alojamiento Base + Mascotas)
    subtotalAlojamientoBase,
    cantidadMascotas: infoMascotas.cantidadMascotas,
    costoMascotas: infoMascotas.costoMascotas,
    valorMascotaUnitario: infoMascotas.valorUnitario,
    depositoGarantia,
    pagadoFinca,
    saldoFincaCheckIn,
    costoAlimentacion: costoAlim,
    pagadoAlimentacion,
    saldoAlimentacionAdmin,
    totalConsolidado: reserva.valor_total,
    totalRecaudado,
    totalPagado: totalRecaudado,
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
  | 'personalizado'
  | 'pedir_abono'
  | 'cobrar_alimentacion'
  | 'solicitud_cliente_publica';

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

  // Mapeo, escala y posición de la firma digital (Fase PDF Pro)
  firma_posicion?: 'centro' | 'izquierda' | 'derecha';
  firma_escala?: number; // Factor de escala (ej: 0.5 a 1.5, default: 1.0)
  firma_ancho_mm?: number; // Ancho base en milímetros (default: 48)
  firma_alto_mm?: number; // Alto base en milímetros (default: 16)
  firma_mostrar_linea?: boolean; // Mostrar línea sobre la que apoya la firma (default: true)
  firma_mostrar_cargo?: boolean; // Mostrar nombre/cargo bajo la firma (default: true)
  firma_mostrar_leyenda?: boolean; // Mostrar "Firma Autorizada Paraíso Terrenal" (default: true)
  firma_leyenda_personalizada?: string;

  // Personalización visual y rediseño dinámico de documentos PDF
  tema_color_primario?: string; // Color institucional en HEX (default: #1a6b5e)
  tema_color_acento?: string; // Color de acento/filete en HEX (default: #d4ac3f)
  estilo_encabezado?: 'corporativo' | 'moderno' | 'clasico' | 'minimalista';
  mostrar_marca_agua?: boolean;
  texto_marca_agua?: string; // Ej: "CONFIRMADA", "COTIZACIÓN", "COPIA OFICIAL"
  tamano_fuente_cuerpo?: 'compacto' | 'estandar' | 'amplio';
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

// -----------------------------------------------------------------------------
// Tipos para Mantenimiento y Reinicio de Datos (Architecture Shield)
// -----------------------------------------------------------------------------

export interface OpcionesReinicioDatos {
  reservasYPagos: boolean;
  cotizaciones: boolean;
  disponibilidad: boolean;
  clientes: boolean;
  comunicaciones: boolean;
  reiniciarConsecutivos: boolean;
  fincas?: boolean;
  menus?: boolean;
}

export interface ConteoDatosBD {
  reservas: number;
  pagos: number;
  cotizaciones: number;
  disponibilidad: number;
  clientes: number;
  comunicaciones: number;
  fincas: number;
  menus: number;
  siguienteCotizacion: number;
  siguienteSeparacion: number;
}

export interface ResultadoReinicioDatos {
  success: boolean;
  eliminados?: {
    reservas?: number;
    pagos?: number;
    cierres?: number;
    cotizaciones?: number;
    disponibilidad?: number;
    clientes?: number;
    comunicaciones?: number;
    fincas?: number;
    menus?: number;
  };
  error?: string;
  mensaje?: string;
}


