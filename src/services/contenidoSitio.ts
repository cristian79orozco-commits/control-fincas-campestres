import type { ContenidoSitio, SeccionClave } from '../types';

export const CONTENIDO_SITIO_DEFAULT: ContenidoSitio = {
  id: 'principal',

  // Orden predeterminado de las secciones
  orden_secciones: [
    'banner',
    'hero',
    'destacados',
    'graficos',
    'estado',
    'filtros',
    'catalogo',
    'comparador',
    'menus',
    'faq',
  ],

  // 1. Banner Superior Promocional
  banner_visible: true,
  banner_texto: '🌿 ¡Reserva directa sin comisiones! Consulta fechas libres en nuestro calendario y cotiza al instante por WhatsApp.',
  banner_link_texto: 'Ver disponibilidad',
  banner_link_url: '#catalogo',
  banner_tipo: 'promo',

  // 2. Hero Section
  hero_visible: true,
  hero_eyebrow: 'Reserva directa sin comisiones',
  hero_titulo: 'Tu escapada campestre empieza aquí',
  hero_subtitulo: 'Elige la finca ideal en Santa Elena, consulta la disponibilidad en tiempo real en nuestro calendario y cotiza tu reserva instantáneamente por WhatsApp.',
  hero_cta_texto: 'Explorar fincas disponibles',
  hero_cta_secundario_texto: 'Conocer gastronomía',
  hero_mostrar_metricas: true,
  hero_mostrar_pasos: true,
  hero_paso_1: 'Elige tus fechas',
  hero_paso_2: 'Consulta el calendario',
  hero_paso_3: 'Cotiza por WhatsApp',
  hero_imagen_url: '',
  hero_badge_ubicacion: 'Santa Elena, El Cerrito, Valle',

  // 3. Información Destacada / Beneficios
  destacados_visible: true,
  destacados_titulo: '¿Por qué reservar con nosotros?',
  destacados_subtitulo: 'Garantizamos tranquilidad, transparencia y el mejor descanso en el Valle del Cauca',
  destacados_items: [
    {
      id: 'ben-1',
      icono: '🌿',
      titulo: 'Espacios 100% Campestres',
      descripcion: 'Fincas privadas rodeadas de naturaleza, piscinas cristalinas, zonas verdes y máxima tranquilidad para tu familia o grupo.',
    },
    {
      id: 'ben-2',
      icono: '📅',
      titulo: 'Disponibilidad en Tiempo Real',
      descripcion: 'Calendario sincronizado al instante. Puedes verificar fechas ocupadas y libres antes de cotizar sin esperas innecesarias.',
    },
    {
      id: 'ben-3',
      icono: '🍽️',
      titulo: 'Gastronomía Opcional Integrada',
      descripcion: 'Menús típicos vallunos, desayunos campestres y parrilladas preparados directamente en tu estadía con cotización formal.',
    },
    {
      id: 'ben-4',
      icono: '🛡️',
      titulo: 'Trato Directo y Seguro',
      descripcion: 'Sin intermediarios ni sobrecostos. Documentos oficiales de separación, estado de cuenta y confirmación por WhatsApp.',
    },
  ],

  // 4. Visualización y Gráficos Interactivos (Chart.js / 3D)
  graficos_visible: true,
  graficos_titulo: 'Análisis Visual & Calculadora de Presupuesto',
  graficos_subtitulo: 'Compara capacidades, tarifas y simula tu inversión con ahorro directo en tiempo real',
  graficos_tipo: 'ambos',

  // 5. Estado Actual (Resumen de fincas)
  estado_visible: true,
  estado_titulo: 'Estado actual · Fincas disponibles',
  estado_subtitulo: 'propiedades registradas en Santa Elena, Valle',
  estado_badge_texto: 'Sistema operativo',
  estado_ayuda_texto: 'Toca Ver y cotizar en cualquier finca para consultar el calendario interactivo y obtener tu cotización directa para WhatsApp.',

  // 6. Filtros de Búsqueda
  filtros_visible: true,
  filtros_titulo: 'Buscar disponibilidad',
  filtros_subtitulo: 'Filtra por fechas y capacidad para encontrar fincas libres',
  filtros_badge_titulo: '📍 Ubicación privilegiada',
  filtros_badge_texto: 'Todas nuestras fincas campestres están ubicadas en Santa Elena, El Cerrito, Valle del Cauca.',

  // 7. Catálogo de Fincas y Opciones de Presentación
  catalogo_visible: true,
  catalogo_titulo: 'Fincas disponibles',
  catalogo_subtitulo: 'Selecciona una propiedad para ver fotografías en alta calidad y cotizar',
  catalogo_vacio_texto: 'No se encontraron fincas disponibles para los criterios seleccionados.',
  catalogo_vista_predeterminada: 'grid',
  catalogo_mostrar_badges: true,
  catalogo_mostrar_precio_total: true,

  // 8. Comparador de Fincas Cara a Cara
  comparador_visible: true,
  comparador_titulo: 'Comparador de Fincas',
  comparador_subtitulo: 'Analiza lado a lado las especificaciones, comodidades y capacidades de tus opciones favoritas',

  // 9. Portal del Huésped
  portal_cliente_visible: true,
  portal_cliente_titulo: 'Consulta de Reserva & Cotización',
  portal_cliente_subtitulo: 'Verifica el estado de tu reserva o cotización con tu número consecutivo o teléfono',

  // 10. Opciones visuales
  personalizacion_visual: {
    estilo_tarjeta: 'moderno_3d',
    tema_color: 'esmeralda',
  },

  // 7. Menús Campestres (Portal Público)
  menus_visible: true,
  menus_titulo: 'Gastronomía y Menús Campestres',
  menus_subtitulo: 'Complementa tu descanso con deliciosas opciones de alimentación tradicional para todo tu grupo',
  menus_badge_texto: 'Servicio Adicional Opcional',

  // 8. Preguntas Frecuentes (FAQ)
  faq_visible: true,
  faq_titulo: 'Preguntas Frecuentes',
  faq_subtitulo: 'Todo lo que necesitas saber antes de programar tu viaje campestre',
  faq_items: [
    {
      id: 'faq-1',
      pregunta: '¿Cómo confirmo y aseguro mi reserva?',
      pregunta_clean: 'Como confirmo y aseguro mi reserva',
      respuesta: 'Una vez elijas la finca y fechas en el cotizador, te comunicarás con nosotros vía WhatsApp. Tu fecha quedará formalmente reservada con el abono del porcentaje de separación pactado (habitualmente el 50%) y la expedición del documento oficial de separación.',
    } as any,
    {
      id: 'faq-2',
      pregunta: '¿Cuáles son los horarios de Check-in y Check-out?',
      respuesta: 'El ingreso regular es a partir de las 9:00 AM y la salida se realiza habitualmente a las 5:00 PM del último día pactado. Horarios específicos pueden coordinarse previamente según la programación y disponibilidad.',
    },
    {
      id: 'faq-3',
      pregunta: '¿Podemos incluir el servicio de alimentación?',
      respuesta: '¡Claro que sí! Contamos con menús de desayunos, almuerzos campestres, parrilladas y cenas. Puedes cotizarlos directamente desde la finca o solicitar la propuesta gastronómica a nuestro asesor por WhatsApp.',
    },
    {
      id: 'faq-4',
      pregunta: '¿Se admiten mascotas en las instalaciones?',
      respuesta: 'La gran mayoría de nuestras fincas son pet-friendly. Al momento de generar tu cotización indícanos si llevarás mascotas para verificar las condiciones y cuidados específicos de la finca elegida.',
    },
    {
      id: 'faq-5',
      pregunta: '¿Qué métodos de pago reciben?',
      respuesta: 'Aceptamos transferencias bancarias directas (Bancolombia, Nequi, Daviplata) y pagos según las instrucciones oficiales consignadas en tu documento de cotización.',
    },
  ],

  // 9. Pie de página (Footer)
  footer_visible: true,
  footer_titulo: 'Paraíso Terrenal',
  footer_subtitulo: 'Fincas de Alquiler · Alquiler exclusivo de fincas de recreo y descanso en Santa Elena, El Cerrito, Valle del Cauca.',
  footer_whatsapp_cta: '¿Tienes alguna duda especial? Escríbenos directamente a WhatsApp',
};

export const CAMPOS_EXTENDIDOS_PERSONALIZACION = [
  'graficos_visible',
  'graficos_titulo',
  'graficos_subtitulo',
  'graficos_tipo',
  'comparador_visible',
  'comparador_titulo',
  'comparador_subtitulo',
  'portal_cliente_visible',
  'portal_cliente_titulo',
  'portal_cliente_subtitulo',
  'catalogo_vista_predeterminada',
  'catalogo_mostrar_badges',
  'catalogo_mostrar_precio_total',
  'personalizacion_visual',
] as const;

export function extraerCamposExtendidos(datos: Partial<ContenidoSitio>): Record<string, any> {
  const extra: Record<string, any> = {};
  for (const campo of CAMPOS_EXTENDIDOS_PERSONALIZACION) {
    if (campo in datos && (datos as any)[campo] !== undefined) {
      extra[campo] = (datos as any)[campo];
    }
  }
  return extra;
}

export function normalizeContenidoSitio(raw: any, backupExtra?: any): ContenidoSitio {
  if (!raw && !backupExtra) return CONTENIDO_SITIO_DEFAULT;
  const source = { ...(backupExtra || {}), ...(raw || {}) };
  const merged: ContenidoSitio = { ...CONTENIDO_SITIO_DEFAULT, ...source };

  // Garantizar que las nuevas secciones existan siempre en orden_secciones
  const orden: SeccionClave[] = Array.isArray(source.orden_secciones) && source.orden_secciones.length > 0
    ? [...source.orden_secciones]
    : [...CONTENIDO_SITIO_DEFAULT.orden_secciones];

  if (!orden.includes('graficos')) {
    const idxCat = orden.indexOf('catalogo');
    if (idxCat !== -1) {
      orden.splice(idxCat, 0, 'graficos');
    } else {
      orden.push('graficos');
    }
  }

  if (!orden.includes('comparador')) {
    const idxCat = orden.indexOf('catalogo');
    if (idxCat !== -1) {
      orden.splice(idxCat + 1, 0, 'comparador');
    } else {
      orden.push('comparador');
    }
  }

  merged.orden_secciones = orden;
  merged.graficos_visible = source.graficos_visible ?? true;
  merged.graficos_titulo = source.graficos_titulo || CONTENIDO_SITIO_DEFAULT.graficos_titulo;
  merged.graficos_subtitulo = source.graficos_subtitulo || CONTENIDO_SITIO_DEFAULT.graficos_subtitulo;
  merged.graficos_tipo = source.graficos_tipo || 'ambos';
  merged.comparador_visible = source.comparador_visible ?? true;
  merged.comparador_titulo = source.comparador_titulo || CONTENIDO_SITIO_DEFAULT.comparador_titulo;
  merged.comparador_subtitulo = source.comparador_subtitulo || CONTENIDO_SITIO_DEFAULT.comparador_subtitulo;
  merged.portal_cliente_visible = source.portal_cliente_visible ?? true;
  merged.catalogo_vista_predeterminada = source.catalogo_vista_predeterminada || 'grid';
  merged.catalogo_mostrar_badges = source.catalogo_mostrar_badges ?? true;
  merged.catalogo_mostrar_precio_total = source.catalogo_mostrar_precio_total ?? true;
  merged.personalizacion_visual = {
    ...CONTENIDO_SITIO_DEFAULT.personalizacion_visual,
    ...(backupExtra?.personalizacion_visual || {}),
    ...(raw?.personalizacion_visual || {}),
  };

  return merged;
}

const STORAGE_KEY = 'fc_contenido_sitio_v2';

let contenidoGlobal: ContenidoSitio = (() => {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      return normalizeContenidoSitio(JSON.parse(local));
    }
  } catch {
    // Si localStorage no está disponible
  }
  return CONTENIDO_SITIO_DEFAULT;
})();

export function getContenidoSitioGlobal(): ContenidoSitio {
  return contenidoGlobal;
}

export function setContenidoSitioGlobal(cfg: ContenidoSitio): void {
  contenidoGlobal = normalizeContenidoSitio(cfg);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contenidoGlobal));
  } catch {
    // ignorar error de almacenamiento
  }
}

