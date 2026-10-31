/**
 * Utilidades para normalización, detección de emojis y categorías de comodidades (amenidades)
 * Cumple con los lineamientos de arquitectura desacoplada y UI/UX High-End Futuro Digital Pro.
 */

export interface AmenidadInfo {
  emoji: string;
  cleanNombre: string;
  fullNombre: string;
  icono: string;
}

export interface EmojiCategory {
  nombre: string;
  icono: string;
  emojis: string[];
}

// Regex universal para detectar emojis al inicio de una cadena (incluye secuencias complejas, ZWJ y selectores de variación)
export const EMOJI_LEADING_REGEX = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\uFE0F|\u200D\p{Extended_Pictographic})*/u;

// Emojis rápidos de acceso directo para fincas campestres y recreativas
export const EMOJIS_RAPIDOS_FINCAS: string[] = [
  '🏊', '♨️', '🥩', '📶', '🚗', '🌿', '⚽', '🔊', '🍳', '📺', '🎱', '🛖', '🏓', '🌲', '🔥', '🐴', '🐾', '❄️'
];

// Categorías organizadas de emojis para el selector High-End
export const CATEGORIAS_EMOJIS_FINCAS: EmojiCategory[] = [
  {
    nombre: 'Acuáticas & Relax',
    icono: '🏊',
    emojis: ['🏊', '♨️', '🧖', '🌊', '🎣', '🚣', '🤿', '🛁', '🚿', '💦', '🫧', '🏖️'],
  },
  {
    nombre: 'Naturaleza & Exteriores',
    icono: '🌿',
    emojis: ['🌿', '🌲', '🌳', '🌴', '🌾', '🌺', '🏕️', '🔥', '🪵', '🌄', '🌅', '🐴', '🐦', '🦜', '🌻'],
  },
  {
    nombre: 'Deportes & Juegos',
    icono: '⚽',
    emojis: ['⚽', '🏓', '🎱', '🏀', '🏐', '🎾', '🏸', '🎯', '🎲', '🛝', '🚴', '⛳', '♟️', '🎳', '🥊'],
  },
  {
    nombre: 'BBQ, Cocina & Bar',
    icono: '🥩',
    emojis: ['🥩', '🍳', '🍕', '☕', '🍹', '🍻', '🧊', '🍽️', '🍔', '🥂', '🍷', '🥖', '🥤', '🔪', '🧂'],
  },
  {
    nombre: 'Tecnología & Confort',
    icono: '📶',
    emojis: ['📶', '📺', '🔊', '❄️', '💨', '⚡', '💻', '💡', '🔌', '🛋️', '🛌', '🪟', '📻', '📽️'],
  },
  {
    nombre: 'Instalaciones & Servicios',
    icono: '🛖',
    emojis: ['🛖', '🚗', '🅿️', '🚌', '🛡️', '🐾', '🐶', '🐱', '🧹', '🧑‍🍳', '♿', '🔒', '🪑', '🧺', '🚿', '🛎️'],
  },
];

// Diccionario de palabras clave para autocompletar emoji si el texto no lo trae
const KEYWORDS_EMOJI_MAP: { keywords: string[]; emoji: string }[] = [
  { keywords: ['piscina', 'alberca', 'natacion', 'swimming'], emoji: '🏊' },
  { keywords: ['jacuzzi', 'hidromasaje', 'spa', 'burbujas'], emoji: '♨️' },
  { keywords: ['bbq', 'asador', 'parrilla', 'carbon', 'carne'], emoji: '🥩' },
  { keywords: ['wifi', 'wi-fi', 'internet', 'fibra', 'red'], emoji: '📶' },
  { keywords: ['parqueadero', 'parqueo', 'garaje', 'estacionamiento', 'autos', 'carros'], emoji: '🚗' },
  { keywords: ['zonas verdes', 'zonas verde', 'jardin', 'jardín', 'verde', 'bosque', 'prado'], emoji: '🌿' },
  { keywords: ['futbol', 'fútbol', 'cancha', 'microfutbol', 'sintetica', 'sintética'], emoji: '⚽' },
  { keywords: ['pin pon', 'ping pong', 'tenis de mesa'], emoji: '🏓' },
  { keywords: ['billar', 'billarpool', 'pool', 'mesa de billar'], emoji: '🎱' },
  { keywords: ['sonido', 'bluetooth', 'musica', 'música', 'altavoz', 'parlante', 'bafle', 'cabina'], emoji: '🔊' },
  { keywords: ['cocina', 'electrodomestico', 'electrodoméstico', 'estufa', 'horno', 'nevera'], emoji: '🍳' },
  { keywords: ['tv', 'smart', 'television', 'televisor', 'streaming', 'netflix'], emoji: '📺' },
  { keywords: ['kiosko', 'quiosco', 'estadero', 'choza', 'maloca'], emoji: '🛖' },
  { keywords: ['panorámica', 'panoramica', 'vista', 'mirador', 'paisaje', 'valle', 'montaña', 'montana'], emoji: '🌅' },
  { keywords: ['aire acondicionado', 'clima', 'acondicionado'], emoji: '❄️' },
  { keywords: ['ventilador', 'abanico'], emoji: '💨' },
  { keywords: ['sendero', 'caminata', 'ecologico', 'ecológico', 'trekking'], emoji: '🌲' },
  { keywords: ['fogata', 'fogata campestre', 'fuego', 'leña', 'chimenea'], emoji: '🔥' },
  { keywords: ['caballo', 'caballos', 'cabalgata', 'equitacion', 'caballeriza'], emoji: '🐴' },
  { keywords: ['rio', 'río', 'quebrada', 'cascada', 'charco'], emoji: '🌊' },
  { keywords: ['pesca', 'lago', 'laguna', 'pescar'], emoji: '🎣' },
  { keywords: ['mascota', 'pet', 'perro', 'canino'], emoji: '🐾' },
  { keywords: ['sauna', 'turco', 'vapor'], emoji: '🧖' },
  { keywords: ['hamaca', 'hamacas'], emoji: '🌴' },
  { keywords: ['juegos', 'juegos de mesa', 'parques', 'dominó', 'cartas'], emoji: '🎲' },
  { keywords: ['infantil', 'columpios', 'rodadero', 'parque infantil'], emoji: '🛝' },
  { keywords: ['bicicleta', 'cicloruta', 'bici'], emoji: '🚴' },
  { keywords: ['seguridad', 'vigilancia', 'porteria', 'portería'], emoji: '🛡️' },
  { keywords: ['limpieza', 'aseo', 'camarera', 'servicio'], emoji: '🧹' },
  { keywords: ['cocinera', 'chef', 'mayordomo'], emoji: '🧑‍🍳' },
];

/**
 * Descompone y normaliza la información de una comodidad (nombre, emoji e ícono)
 * asegurando una presentación limpia y libre de duplicaciones tanto en admin como cliente.
 */
export function getAmenidadInfo(nombreRaw?: string | null, iconoRaw?: string | null): AmenidadInfo {
  const nombre = (nombreRaw || '').trim();
  const icono = (iconoRaw || '').trim();

  if (!nombre) {
    return {
      emoji: '✨',
      cleanNombre: '',
      fullNombre: '',
      icono: icono || 'check',
    };
  }

  // 1. Verificar si el texto ya comienza con un emoji
  const leadingMatch = nombre.match(EMOJI_LEADING_REGEX);
  if (leadingMatch) {
    const emoji = leadingMatch[0];
    let cleanNombre = nombre.slice(emoji.length).trim();
    // Limpiar posibles guiones o separadores residuales tipo "- " o ": "
    cleanNombre = cleanNombre.replace(/^[-–—:•]\s*/, '').trim();
    // Capitalizar la primera letra del nombre limpio si es minúscula
    if (cleanNombre.length > 0) {
      cleanNombre = cleanNombre.charAt(0).toUpperCase() + cleanNombre.slice(1);
    }
    return {
      emoji,
      cleanNombre: cleanNombre || nombre,
      fullNombre: `${emoji} ${cleanNombre || nombre}`,
      icono: icono || emoji,
    };
  }

  // 2. Si el icono almacenado en BD es un emoji
  if (icono && EMOJI_LEADING_REGEX.test(icono)) {
    const cleanNombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    return {
      emoji: icono,
      cleanNombre,
      fullNombre: `${icono} ${cleanNombre}`,
      icono,
    };
  }

  // 3. Buscar en el diccionario por palabras clave
  const norm = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const item of KEYWORDS_EMOJI_MAP) {
    const matched = item.keywords.some(kw => {
      const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return norm.includes(kwNorm);
    });
    if (matched) {
      const cleanNombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
      return {
        emoji: item.emoji,
        cleanNombre,
        fullNombre: `${item.emoji} ${cleanNombre}`,
        icono: item.emoji,
      };
    }
  }

  // 4. Fallback si no tiene emoji
  const cleanNombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
  return {
    emoji: '✨',
    cleanNombre,
    fullNombre: `✨ ${cleanNombre}`,
    icono: icono || 'check',
  };
}

/**
 * Prepara el objeto de amenidad para guardar en base de datos.
 * Preserva compatibilidad con supabase `{ nombre, icono }`.
 */
export function formatAmenidadParaGuardar(texto: string, emojiSeleccionado?: string): { nombre: string; icono: string } {
  const trimmed = texto.trim();
  if (!trimmed) {
    return { nombre: '', icono: 'check' };
  }

  const info = getAmenidadInfo(trimmed, emojiSeleccionado);
  const emojiFinal = emojiSeleccionado || info.emoji;

  // Si ya tiene el emoji al inicio, preservar tal cual
  if (trimmed.startsWith(emojiFinal)) {
    return {
      nombre: trimmed,
      icono: emojiFinal,
    };
  }

  // Si el texto ya tiene un emoji distinto al inicio
  const match = trimmed.match(EMOJI_LEADING_REGEX);
  if (match) {
    return {
      nombre: trimmed,
      icono: match[0],
    };
  }

  // Si no tiene emoji, anteponer el seleccionado o resuelto
  const nombreFinal = emojiFinal && emojiFinal !== '✨'
    ? `${emojiFinal} ${info.cleanNombre}`
    : info.cleanNombre;

  return {
    nombre: nombreFinal,
    icono: emojiFinal || 'check',
  };
}

/**
 * Compara dos comodidades para verificar si coinciden, ignorando mayúsculas, tildes y emojis.
 */
export function isAmenidadMatch(nombreA: string, nombreB: string): boolean {
  if (!nombreA || !nombreB) return false;
  const infoA = getAmenidadInfo(nombreA);
  const infoB = getAmenidadInfo(nombreB);

  const cleanA = infoA.cleanNombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const cleanB = infoB.cleanNombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
}

