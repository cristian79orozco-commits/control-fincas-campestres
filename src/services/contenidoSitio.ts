import type { ContenidoSitio } from '../types';

export const CONTENIDO_SITIO_DEFAULT: ContenidoSitio = {
  id: 'principal',

  // Orden predeterminado de las secciones
  orden_secciones: [
    'banner',
    'hero',
    'destacados',
    'estado',
    'filtros',
    'catalogo',
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

  // 4. Estado Actual (Resumen de fincas)
  estado_visible: true,
  estado_titulo: 'Estado actual · Fincas disponibles',
  estado_subtitulo: 'propiedades registradas en Santa Elena, Valle',
  estado_badge_texto: 'Sistema operativo',
  estado_ayuda_texto: 'Toca Ver y cotizar en cualquier finca para consultar el calendario interactivo y obtener tu cotización directa para WhatsApp.',

  // 5. Filtros de Búsqueda
  filtros_visible: true,
  filtros_titulo: 'Buscar disponibilidad',
  filtros_subtitulo: 'Filtra por fechas y capacidad para encontrar fincas libres',
  filtros_badge_titulo: '📍 Ubicación privilegiada',
  filtros_badge_texto: 'Todas nuestras fincas campestres están ubicadas en Santa Elena, El Cerrito, Valle del Cauca.',

  // 6. Catálogo de Fincas
  catalogo_visible: true,
  catalogo_titulo: 'Fincas disponibles',
  catalogo_subtitulo: 'Selecciona una propiedad para ver fotografías en alta calidad y cotizar',
  catalogo_vacio_texto: 'No se encontraron fincas disponibles para los criterios seleccionados.',

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
  footer_titulo: 'Control de Fincas Campestres',
  footer_subtitulo: 'Alquiler exclusivo de fincas de recreo y descanso en Santa Elena, El Cerrito, Valle del Cauca.',
  footer_whatsapp_cta: '¿Tienes alguna duda especial? Escríbenos directamente a WhatsApp',
};

const STORAGE_KEY = 'fc_contenido_sitio';

let contenidoGlobal: ContenidoSitio = (() => {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      return { ...CONTENIDO_SITIO_DEFAULT, ...JSON.parse(local) };
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
  contenidoGlobal = { ...CONTENIDO_SITIO_DEFAULT, ...cfg };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contenidoGlobal));
  } catch {
    // ignorar error de almacenamiento
  }
}
