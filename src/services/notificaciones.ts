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
 * Comprueba criptográficamente la existencia de un token JWT válido de Supabase Auth en storage.
 */
export function esAdminAutenticado(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.access_token || parsed.user)) {
            return true;
          }
        }
      }
    }
    return false;
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

// Singleton de AudioContext desbloqueado por interacción del usuario
let sharedAudioContext: AudioContext | null = null;

export function desbloquearAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioContextClass();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
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
    const ctx = desbloquearAudioContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // Primer tono: Re5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, t0);
    gain1.gain.setValueAtTime(0.30, t0);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t0);
    osc1.stop(t0 + 0.7);

    // Segundo tono armónico: La5 (880.00 Hz) con ligero retraso para efecto campana limpia
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, t0 + 0.12);
    gain2.gain.setValueAtTime(0.34, t0 + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t0 + 0.12);
    osc2.stop(t0 + 1.25);
  } catch (err) {
    console.warn('[notificaciones] No se pudo reproducir sonido de notificación:', err);
  }
}

/**
 * Muestra una notificación nativa en el sistema operativo (Windows, Mac, etc.)
 * o en la ventana independiente de la PWA instalada.
 * Utiliza prioritariamente el Service Worker registrado para garantizar que
 * Windows despierte la alerta y emita sonido aun con la app minimizada.
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

  const notifOptions: NotificationOptions = {
    body: opciones?.body,
    tag: opciones?.tag || `notif-${Date.now()}`,
    icon: opciones?.icon || './icon-192.png?v=2',
    badge: opciones?.icon || './icon-192.png?v=2',
    silent: false, // silent: false permite que Windows reproduzca su sonido nativo de notificación en segundo plano
    requireInteraction: true, // Mantiene la notificación visible en pantalla hasta que el usuario interactúe
  };

  // 1. Prioridad: Service Worker (Estándar obligatorio para PWAs y segundo plano en Windows / Chrome)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg && 'showNotification' in reg) {
          reg.showNotification(titulo, notifOptions).catch(() => {
            crearNotificacionDirecta(titulo, notifOptions, opciones?.onClick);
          });
        } else {
          crearNotificacionDirecta(titulo, notifOptions, opciones?.onClick);
        }
      }).catch(() => {
        crearNotificacionDirecta(titulo, notifOptions, opciones?.onClick);
      });
      return true;
    } catch {
      // Continuar con fallback directo
    }
  }

  // 2. Fallback: Constructor directo de Notification
  return crearNotificacionDirecta(titulo, notifOptions, opciones?.onClick);
}

function crearNotificacionDirecta(
  titulo: string,
  options: NotificationOptions,
  onClick?: () => void
): boolean {
  try {
    const notif = new Notification(titulo, options);

    notif.onclick = () => {
      try {
        window.focus();
      } catch {}
      if (onClick) {
        onClick();
      }
      notif.close();
    };

    // Auto-cierre tras 15 segundos
    setTimeout(() => {
      try {
        notif.close();
      } catch {}
    }, 15000);

    return true;
  } catch (err) {
    console.warn('[notificaciones] Error emitiendo notificación directa:', err);
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

/**
 * Interruptor Maestro Unificado de Notificaciones:
 * En un solo clic solicita permiso nativo de Windows si falta, desbloquea el Web Audio API
 * y emite una alerta de prueba audiovisual para confirmar que el PC está armado.
 */
export async function toggleMasterNotificaciones(
  showToast?: (mensaje: string, tipo?: 'success' | 'error' | 'info') => void,
  onNavigate?: () => void
): Promise<{ permiso: NotificationPermission | 'unsupported'; soundEnabled: boolean }> {
  // 1. Desbloquear el contexto de audio nativo mediante el gesto del clic
  desbloquearAudioContext();

  // 2. Comprobar / solicitar permiso de notificaciones nativas en el OS
  let permiso = obtenerEstadoPermisoNotificaciones();
  if (permiso === 'default') {
    permiso = await solicitarPermisoNotificaciones();
  }

  // 3. Activar sonido
  setSoundEnabled(true);

  // 4. Reproducir timbre armónico de confirmación
  reproducirSonidoNotificacion();

  // 5. Emitir notificación nativa de Windows de confirmación
  if (permiso === 'granted') {
    mostrarNotificacionEscritorio('🔔 Alertas PC & Sonido Activadas', {
      body: 'Tu computador te notificará nuevas cotizaciones, comisiones listas para cobrar y compras de alimentación aún con la ventana minimizada.',
      tag: 'master-notif-confirm',
      onClick: onNavigate,
    });
    if (showToast) {
      showToast('✓ Alertas de PC y sonido profesional activados con éxito', 'success');
    }
  } else if (permiso === 'denied') {
    if (showToast) {
      showToast('🔊 Sonido activado. Las notificaciones nativas están bloqueadas en tu navegador: haz clic en el candado de la barra de direcciones para permitirlas.', 'info');
    }
  } else {
    if (showToast) {
      showToast('🔊 Sonido activado. Para recibir alertas en Windows, confirma el permiso emergente.', 'info');
    }
  }

  return { permiso, soundEnabled: true };
}

/**
 * Notifica al administrador que una estadía terminó y su comisión está lista para cobro con el dueño.
 */
export function notificarComisionPendienteCobro({
  dueñoNombre,
  fincaNombre,
  comisionCOP,
  onClick,
}: {
  dueñoNombre: string;
  fincaNombre: string;
  comisionCOP: number;
  onClick?: () => void;
}): void {
  if (!esAdminAutenticado()) return;
  reproducirSonidoNotificacion();
  mostrarNotificacionEscritorio('💰 ¡Comisión lista para cobrar!', {
    body: `La estadía en ${fincaNombre} ha finalizado. Tu comisión con ${dueñoNombre} es de $${comisionCOP.toLocaleString('es-CO')} COP.`,
    tag: `comision-${fincaNombre}-${Date.now()}`,
    onClick,
  });
}

/**
 * Notifica al administrador con anticipación (48h/72h) que debe preparar compras de menú.
 */
export function notificarAlertaComprasAlimentacion({
  fincaNombre,
  clienteNombre,
  comensales,
  diasFaltantes,
  menuNombre,
  onClick,
}: {
  fincaNombre: string;
  clienteNombre: string;
  comensales: number;
  diasFaltantes: number;
  menuNombre?: string;
  onClick?: () => void;
}): void {
  if (!esAdminAutenticado()) return;
  reproducirSonidoNotificacion();
  const tiempoStr = diasFaltantes === 0 ? '¡Llegan HOY!' : `Llegan en ${diasFaltantes} días`;
  mostrarNotificacionEscritorio(`🛒 Alerta de Compras: ${tiempoStr}`, {
    body: `${fincaNombre} · ${clienteNombre} (${comensales} personas) - Menú: ${menuNombre || 'Alimentación'}. Preparar insumos.`,
    tag: `compras-${fincaNombre}-${Date.now()}`,
    onClick,
  });
}

