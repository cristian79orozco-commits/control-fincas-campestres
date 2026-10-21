import { create } from 'zustand';
import _ from 'lodash';
import type { TipoComunicacion, Comunicacion, MetodoEnvioWhatsApp } from '../types';
import { obtenerMetodoWhatsAppActual, setMetodoWhatsAppActual } from '../services/whatsapp';

export type TabComunicaciones = 'envio' | 'analytics' | 'plantillas' | 'historial' | 'config';
export type FaseMensaje = 'fase_1_cotizacion' | 'fase_2_reserva' | 'fase_3_saldos' | 'fase_4_llegada' | 'fase_5_libre';

export interface ComunicacionesState {
  // Pestaña y Navegación
  tabActiva: TabComunicaciones;
  faseFiltro: FaseMensaje;
  tipoSeleccionado: TipoComunicacion;
  subTipoAccion: 'normal' | 'pedir_abono' | 'cobrar_alimentacion';

  // Expediente Activo
  expedienteTipo: 'cotizacion' | 'reserva' | null;
  cotizacionId: string;
  reservaId: string;
  clienteId: string;
  pagoId: string;

  // Búsqueda Inteligente (Smart Finder)
  busquedaExpediente: string;
  busquedaAbierta: boolean;

  // Formulario y Envío
  telefonoInput: string;
  destinatarioNombre: string;
  mensajeTexto: string;
  descargarPdf: boolean;
  copiado: boolean;
  procesando: boolean;
  copiadoBancoDueno: boolean;
  copiadoBancoAdmin: boolean;

  // Editor de Plantillas en Supabase
  plantillaSeleccionada: string;
  textoEditorPlantilla: string;
  guardandoPlantilla: boolean;

  // Historial
  filtroTipoHistorial: string;
  busquedaHistorial: string;

  // Configuración WhatsApp (Número corporativo y Método Desktop PC vs Web)
  waGlobalInput: string;
  metodoWhatsApp: MetodoEnvioWhatsApp;

  // Acciones
  setTabActiva: (tab: TabComunicaciones) => void;
  setFaseFiltro: (fase: FaseMensaje) => void;
  setTipoSeleccionado: (tipo: TipoComunicacion) => void;
  setSubTipoAccion: (subtipo: 'normal' | 'pedir_abono' | 'cobrar_alimentacion') => void;
  setMetodoWhatsApp: (metodo: MetodoEnvioWhatsApp) => void;
  
  setExpediente: (datos: {
    tipo: 'cotizacion' | 'reserva' | null;
    cotizacionId?: string;
    reservaId?: string;
    clienteId?: string;
    pagoId?: string;
  }) => void;
  
  setBusquedaExpediente: (q: string) => void;
  setBusquedaAbierta: (abierta: boolean) => void;

  setTelefonoInput: (tel: string) => void;
  setDestinatarioNombre: (nombre: string) => void;
  setMensajeTexto: (texto: string | ((prev: string) => string)) => void;
  setDescargarPdf: (descargar: boolean) => void;
  setCopiado: (val: boolean) => void;
  setProcesando: (val: boolean) => void;
  setCopiadoBancoDueno: (val: boolean) => void;
  setCopiadoBancoAdmin: (val: boolean) => void;

  setPlantillaSeleccionada: (p: string) => void;
  setTextoEditorPlantilla: (txt: string | ((prev: string) => string)) => void;
  setGuardandoPlantilla: (val: boolean) => void;

  setFiltroTipoHistorial: (tipo: string) => void;
  setBusquedaHistorial: (q: string) => void;
  setWaGlobalInput: (num: string) => void;

  // Funciones de cálculo con Lodash
  obtenerEstadisticasHistorial: (comunicaciones: Comunicacion[]) => {
    total: number;
    porTipo: Record<string, number>;
    ultimosEnvios: Comunicacion[];
    destinatariosFrecuentes: Array<{ destinatario: string; telefono: string; total: number }>;
  };
}

export const useComunicacionesStore = create<ComunicacionesState>((set, get) => ({
  tabActiva: 'envio',
  faseFiltro: 'fase_1_cotizacion',
  tipoSeleccionado: 'cotizacion',
  subTipoAccion: 'normal',

  expedienteTipo: 'cotizacion',
  cotizacionId: '',
  reservaId: '',
  clienteId: '',
  pagoId: '',

  busquedaExpediente: '',
  busquedaAbierta: false,

  telefonoInput: '',
  destinatarioNombre: '',
  mensajeTexto: '',
  descargarPdf: true,
  copiado: false,
  procesando: false,
  copiadoBancoDueno: false,
  copiadoBancoAdmin: false,

  plantillaSeleccionada: 'cotizacion',
  textoEditorPlantilla: '',
  guardandoPlantilla: false,

  filtroTipoHistorial: 'todos',
  busquedaHistorial: '',
  waGlobalInput: '',
  metodoWhatsApp: obtenerMetodoWhatsAppActual(),

  setTabActiva: (tabActiva) => set({ tabActiva }),
  setFaseFiltro: (faseFiltro) => set({ faseFiltro }),
  setTipoSeleccionado: (tipoSeleccionado) => set({ tipoSeleccionado }),
  setSubTipoAccion: (subTipoAccion) => set({ subTipoAccion }),

  setExpediente: (datos) =>
    set({
      expedienteTipo: datos.tipo,
      cotizacionId: datos.cotizacionId !== undefined ? datos.cotizacionId : get().cotizacionId,
      reservaId: datos.reservaId !== undefined ? datos.reservaId : get().reservaId,
      clienteId: datos.clienteId !== undefined ? datos.clienteId : get().clienteId,
      pagoId: datos.pagoId !== undefined ? datos.pagoId : get().pagoId,
    }),

  setBusquedaExpediente: (busquedaExpediente) => set({ busquedaExpediente }),
  setBusquedaAbierta: (busquedaAbierta) => set({ busquedaAbierta }),

  setTelefonoInput: (telefonoInput) => set({ telefonoInput }),
  setDestinatarioNombre: (destinatarioNombre) => set({ destinatarioNombre }),
  setMensajeTexto: (texto) =>
    set((state) => ({
      mensajeTexto: typeof texto === 'function' ? texto(state.mensajeTexto) : texto,
    })),
  setDescargarPdf: (descargarPdf) => set({ descargarPdf }),
  setCopiado: (copiado) => set({ copiado }),
  setProcesando: (procesando) => set({ procesando }),
  setCopiadoBancoDueno: (copiadoBancoDueno) => set({ copiadoBancoDueno }),
  setCopiadoBancoAdmin: (copiadoBancoAdmin) => set({ copiadoBancoAdmin }),

  setPlantillaSeleccionada: (plantillaSeleccionada) => set({ plantillaSeleccionada }),
  setTextoEditorPlantilla: (texto) =>
    set((state) => ({
      textoEditorPlantilla: typeof texto === 'function' ? texto(state.textoEditorPlantilla) : texto,
    })),
  setGuardandoPlantilla: (guardandoPlantilla) => set({ guardandoPlantilla }),

  setFiltroTipoHistorial: (filtroTipoHistorial) => set({ filtroTipoHistorial }),
  setBusquedaHistorial: (busquedaHistorial) => set({ busquedaHistorial }),
  setWaGlobalInput: (waGlobalInput) => set({ waGlobalInput }),
  setMetodoWhatsApp: (metodoWhatsApp) => {
    setMetodoWhatsAppActual(metodoWhatsApp);
    set({ metodoWhatsApp });
  },

  obtenerEstadisticasHistorial: (comunicaciones: Comunicacion[]) => {
    const total = comunicaciones.length;
    // Agrupación y conteo por tipo con Lodash
    const porTipo = _.countBy(comunicaciones, 'tipo');

    // Destinatarios más contactados con Lodash
    const agrupadosPorDestinatario = _.groupBy(comunicaciones, (c) => `${c.destinatario}___${c.telefono}`);
    const destinatariosFrecuentes = _.chain(agrupadosPorDestinatario)
      .map((items, key) => {
        const [destinatario, telefono] = key.split('___');
        return {
          destinatario,
          telefono,
          total: items.length,
        };
      })
      .orderBy(['total'], ['desc'])
      .take(5)
      .value();

    const ultimosEnvios = _.take(
      _.orderBy(comunicaciones, [(c) => new Date(c.created_at || '').getTime()], ['desc']),
      5
    );

    return {
      total,
      porTipo,
      ultimosEnvios,
      destinatariosFrecuentes,
    };
  },
}));
