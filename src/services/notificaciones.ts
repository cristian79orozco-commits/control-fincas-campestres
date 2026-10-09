/**
 * notificaciones.ts
 * Servicio centralizado de notificaciones multi-canal para el Administrador:
 * - Sonido de campana armónico (Web Audio API - cero dependencias externas)
 * - Notificaciones de escritorio nativas (Notification API en Windows / Chrome / Edge / PWA)
 * - Control de permisos y preferencias de usuario (Sonido sí/no, guardado en localStorage)
 * - Deduplicación estricta de cotizaciones para evitar alertas repetidas
 * - Filtro estricto por rol: SOLO el administrador recibe estas alertas
 */

import type { CotizacionDB } from '../types';

const STORAGE_SOUND_KEY = 'fc_notif_sound_enabled';
const STORAGE_NOTIFIED_IDS_KEY = 'fc_notified_cotizaciones_ids';

// Memoria volátil para evitar repeticiones en la misma sesión
const idsNotificadosEnSesion = new Set<string>();

// Cargar IDs previamente notificados desde sessionStorage para persistencia ante recargas
try {
  const guardados = sessionStorage.getItem(STORAGE_NOTIFIED_IDS_KEY);
  if (guardados) {
    const parsed = JSON.parse(guardados);
    if (Array.isArray(parsed)) {
      parsed.forEach(id => idsNotificadosEnSesion.add(id));
    }
  }
} catch {
  // Manejo silencioso de cuotas de storage
}

function persistirIdsNotificados() {
  try {
    const arr = Array.from(idsNotificadosEnSesion).slice(-100); // Conservar últimos 100
    sessionStorage.setItem(STORAGE_NOTIFIED_IDS_KEY, JSON.stringify(arr));
  } catch {
    // Manejo silencioso
  }
}

/**
 * Verifica si el usuario actual tiene sesión activa de Administrador.
 * Consulta la clave oficial de autenticación administrativa en localStorage.
 */
export function esAdminAutenticado(): boolean {
  try {
    const raw = localStorage.getItem('fc_admin_auth_session');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!(parsed && parsed.isLoggedIn);
  } catch {
    return false;
  }
}

/**
 * Consulta si el sonido de alertas está habilitado por el administrador.
 * Por defecto está activado (true).
 */
export function isSoundEnabled(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_SOUND_KEY);
    if (saved === null) return true;
    return saved === 'true';
  } catch {
    return true;
  }
}

/**
 * Configura la preferencia de sonido del administrador.
 */
export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_SOUND_KEY, enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('[notificaciones] Error guardando preferencia de sonido:', err);
  }
}

/**
 * Comprueba si el navegador soporta la API nativa de notificaciones de escritorio.
 */
export function soportaNotificacionesEscritorio(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Obtiene el estado actual del permiso de notificaciones en el navegador.
 */
export function obtenerEstadoPermisoNotificaciones(): NotificationPermission | 'unsupported' {
  if (!soportaNotificacionesEscritorio()) return 'unsupported';
  return Notification.permission;
}

/**
 * Solicita al usuario permiso para mostrar notificaciones nativas en el sistema operativo.
 */
export async function solicitarPermisoNotificaciones(): Promise<NotificationPermission | 'unsupported'> {
  if (!soportaNotificacionesEscritorio()) return 'unsupported';
  try {
    const permiso = await Notification.requestPermission();
    return permiso;
  } catch (err) {
    console.warn('[notificaciones] Error solicitando permiso de notificaciones:', err);
    return Notification.permission;
  }
}

/**
 * Reproduce un sonido armónico agradable y profesional de campana/timbre (Chime doble tono).
 * Sintetizado al vuelo con Web Audio API:
 * - Tono 1: 587.33 Hz (Re5 / D5)
 * - Tono 2: 880.00 Hz (La5 / A5)
 * Cero dependencias de archivos MP3, cero latencia, funciona 100% offline y en PWAs.
 */
export function reproducirSonidoNotificacion(): void {
  if (!isSoundEnabled()) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t0 = ctx.currentTime;

    // Primer tono: Re5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, t0);
    gain1.gain.setValueAtTime(0.28, t0);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t0);
    osc1.stop(t0 + 0.7);

    // Segundo tono: La5 (880.00 Hz) con ligero retraso para efecto de campana doble
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, t0 + 0.12);
    gain2.gain.setValueAtTime(0.32, t0 + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t0 + 0.12);
    osc2.stop(t0 + 1.2);

    // Liberar contexto tras finalizar
    setTimeout(() => {
      try {
        if (ctx.state !== 'closed') ctx.close();
      } catch {}
    }, 1500);
  } catch (err) {
    console.warn('[notificaciones] No se pudo reproducir sonido de notificación:', err);
  }
}

/**
 * Muestra una notificación nativa en el sistema operativo (Windows, Mac, etc.)
 * o en la ventana independiente de la PWA instalada.
 */
export function mostrarNotificacionEscritorio(
  titulo: string,
  opciones?: {
    body?: string;
    tag?: string;
    icon?: string;
    onClick?: () => void;
  }
): boolean {
  if (!soportaNotificacionesEscritorio()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const notif = new Notification(titulo, {
      body: opciones?.body,
      tag: opciones?.tag || 'cotizacion-notif',
      icon: opciones?.icon || '/favicon.ico',
      badge: opciones?.icon || '/favicon.ico',
      silent: true, // El sonido lo gestionamos nosotros con Web Audio para consistencia
    });

    notif.onclick = () => {
      try {
        window.focus();
      } catch {}
      if (opciones?.onClick) {
        opciones.onClick();
      }
      notif.close();
    };

    // Auto-cierre tras 10 segundos
    setTimeout(() => {
      try {
        notif.close();
      } catch {}
    }, 10000);

    return true;
  } catch (err) {
    console.warn('[notificaciones] Error emitiendo notificación de escritorio:', err);
    return false;
  }
}

/**
 * Deduplica y despacha la notificación de una nueva cotización.
 * Regla de negocio mandataria:
 * - SOLO se procesa si el usuario actual es un Administrador autenticado.
 * - Si el usuario es un cliente o visitante público, se ignora por completo.
 */
export interface DespachoNuevaCotizacionParams {
  cotizacion: Partial<CotizacionDB> & {
    clientes?: { nombre?: string | null; apellido?: string | null; telefono?: string | null; whatsapp?: string | null } | null | any;
    fincas?: { nombre?: string | null } | null | any;
  };
  currentView: string;
  isAdminLoggedIn?: boolean;
  showToast?: (mensaje: string, tipo?: 'success' | 'error' | 'info') => void;
  onNavigateToCotizaciones?: () => void;
}

export function notificarNuevaCotizacion({
  cotizacion,
  currentView,
  isAdminLoggedIn,
  showToast,
  onNavigateToCotizaciones,
}: DespachoNuevaCotizacionParams): boolean {
  // 1. Aislamiento estricto: Comprobar autenticación administrativa
  const esAdmin = isAdminLoggedIn ?? esAdminAutenticado();
  if (!esAdmin) {
    // Si no es administrador, NO notificar bajo ninguna circunstancia
    return false;
  }

  // 2. Deduplicación por ID o Consecutivo
  const idUnico = cotizacion.id || cotizacion.consecutivo;
  if (idUnico && idsNotificadosEnSesion.has(idUnico)) {
    return false; // Ya fue notificada en esta sesión
  }

  if (idUnico) {
    idsNotificadosEnSesion.add(idUnico);
    persistirIdsNotificados();
  }

  // 3. Preparar textos informativos
  const consecutivoStr = cotizacion.consecutivo ? `[#${cotizacion.consecutivo}] ` : '';
  const clienteNombre = cotizacion.clientes?.nombre
    ? `${cotizacion.clientes.nombre} ${cotizacion.clientes.apellido || ''}`.trim()
    : 'Cliente Web';
  const fincaNombre = cotizacion.fincas?.nombre ? ` · ${cotizacion.fincas.nombre}` : '';
  const totalStr = cotizacion.total ? ` ($${Number(cotizacion.total).toLocaleString('es-CO')} COP)` : '';

  const tituloEscritorio = `🔔 ¡Nueva Cotización Web! ${consecutivoStr}`;
  const cuerpoEscritorio = `${clienteNombre}${fincaNombre}${totalStr}\nDisponible en tu panel de administración.`;

  // 4. Reproducir sonido de campana (si está habilitado)
  reproducirSonidoNotificacion();

  // 5. Notificación nativa de escritorio (Visible en Windows / PWA incluso con app minimizada o en segundo plano)
  mostrarNotificacionEscritorio(tituloEscritorio, {
    body: cuerpoEscritorio,
    tag: `cot-${idUnico || Date.now()}`,
    onClick: onNavigateToCotizaciones,
  });

  // 6. Toast dentro de la interfaz:
  // SOLO se muestra en pantalla si el administrador está dentro del panel admin (view === 'admin')
  // para no contaminar la vista si está en modo previsualización del cliente.
  if (currentView === 'admin' && showToast) {
    showToast(
      `🔔 ¡Nueva cotización web recibida! ${consecutivoStr}${clienteNombre}${fincaNombre}`,
      'info'
    );
  }

  return true;
}

/**
 * Prueba manual para el administrador: emite sonido, toast y notificación nativa de Windows
 * para que el administrador pueda verificar de inmediato que su PC y navegador están listos.
 */
export function probarNotificacionAdmin(
  showToast?: (mensaje: string, tipo?: 'success' | 'error' | 'info') => void,
  onNavigateToCotizaciones?: () => void
): void {
  reproducirSonidoNotificacion();

  const titulo = '🔔 Notificación de Prueba · Fincas Campestres';
  const cuerpo = 'Tu computador está configurado correctamente para recibir alertas de cotizaciones en tiempo real.';

  const mostradaEscritorio = mostrarNotificacionEscritorio(titulo, {
    body: cuerpo,
    tag: 'prueba-admin',
    onClick: onNavigateToCotizaciones,
  });

  if (showToast) {
    if (mostradaEscritorio) {
      showToast('✓ Alerta de prueba enviada con éxito (Sonido + Notificación de PC)', 'success');
    } else {
      const permiso = obtenerEstadoPermisoNotificaciones();
      if (permiso === 'denied') {
        showToast('🔊 Sonido reproducido. Notificación bloqueada en el navegador: debes permitirla en configuración.', 'info');
      } else if (permiso === 'default') {
        showToast('🔊 Sonido reproducido. Para ver alertas en Windows, presiona "Activar en PC".', 'info');
      } else {
        showToast('🔊 Sonido reproducido correctamente.', 'success');
      }
    }
  }
}
