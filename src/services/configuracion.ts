import type { ConfiguracionGeneral } from '../types';

export const CONFIGURACION_DEFAULT: ConfiguracionGeneral = {
  id: 'general',
  // 1. Empresa
  nombre_empresa: 'Paraíso Terrenal',
  nit: '900.123.456-7',
  eslogan: 'Fincas de Alquiler · Experiencias exclusivas y descanso en la naturaleza',
  logo_url: '/logo.png',
  telefono: '+57 317 682 7093',
  whatsapp: '573176827093',
  correo: 'reservas@fincascampestres.com',
  direccion: 'Santa Elena, El Cerrito, Valle del Cauca',
  ciudad: 'Valle del Cauca, Colombia',
  sitio_web: 'https://fincascampestres.com',
  redes_sociales: {
    facebook: 'https://facebook.com/fincascampestres',
    instagram: 'https://instagram.com/fincascampestres',
    tiktok: 'https://tiktok.com/@fincascampestres',
  },

  // 2. Documentos
  doc_logo_url: '/logo.png',
  doc_encabezado: 'PARAÍSO TERRENAL — FINCAS DE ALQUILER Y SERVICIOS TURÍSTICOS',
  doc_pie_pagina: 'Paraíso Terrenal • Fincas de Alquiler • Documento oficial generado automáticamente • Santa Elena, Valle del Cauca',
  doc_contacto_info: 'WhatsApp: +57 317 682 7093 | reservas@fincascampestres.com | Santa Elena, Valle',
  terminos_condiciones: `• La separación garantiza la reserva y bloquea la disponibilidad para las fechas pactadas.
• El saldo pendiente debe cancelarse en su totalidad antes del ingreso a la finca.
• En caso de cancelación por el cliente, el anticipo no será reembolsable salvo acuerdo formal previo.
• El huésped es responsable del cuidado del inmueble, enseres e inventario entregados.
• La capacidad máxima de personas pactada en este documento debe respetarse estrictamente.`,
  textos_legales: 'Documento expedido de conformidad con las disposiciones turísticas y comerciales colombianas vigentes. Válido como soporte contractual de reserva de finca campestre y servicios complementarios.',
  politicas_cancelacion: 'Cancelaciones con más de 15 días calendario de anticipación permiten reprogramación sujeta a disponibilidad dentro del mismo año. Cancelaciones posteriores conllevan la pérdida de la suma de separación pactada.',

  // 3. Consecutivos (Inicio en 1001 sin letras)
  prefijo_cotizacion: '',
  siguiente_cotizacion: 1001,
  prefijo_separacion: '',
  siguiente_separacion: 1001,
  prefijo_abono: '',
  siguiente_abono: 1001,
  prefijo_estado_cuenta: '',
  siguiente_estado_cuenta: 1001,
  prefijo_paz_salvo: '',
  siguiente_paz_salvo: 1001,
  prefijo_propuesta_menu: '',
  siguiente_propuesta_menu: 1001,

  // 4. Datos Bancarios
  banco_nombre: 'Bancolombia',
  banco_tipo_cuenta: 'Ahorros',
  banco_cuenta: '',
  banco_titular: 'Paraíso Terrenal - Fincas de Alquiler',

  // 5. Regla Operativa de Alimentación Mínima por Tamaño de Grupo
  regla_alimentacion_activa: true,
  regla_alimentacion_max_personas: 10,
  regla_alimentacion_min_servicios: 2,
  regla_alimentacion_mensaje: 'Para grupos de hasta 10 personas, como mínimo se debe contratar servicio de desayuno y almuerzo (mínimo 2 servicios de alimentación complementaria).',
};

// Variable en memoria global para sincronización inmediata
let configuracionGlobal: ConfiguracionGeneral = (() => {
  try {
    const local = localStorage.getItem('fc_configuracion_general');
    if (local) {
      return { ...CONFIGURACION_DEFAULT, ...JSON.parse(local) };
    }
  } catch {
    // Si localStorage no está disponible
  }
  return CONFIGURACION_DEFAULT;
})();

export function getConfiguracionGlobal(): ConfiguracionGeneral {
  return configuracionGlobal;
}

export function setConfiguracionGlobal(cfg: ConfiguracionGeneral): void {
  configuracionGlobal = { ...CONFIGURACION_DEFAULT, ...cfg };
  try {
    localStorage.setItem('fc_configuracion_general', JSON.stringify(configuracionGlobal));
  } catch {
    // ignorar error de cuota o restricción
  }
}
