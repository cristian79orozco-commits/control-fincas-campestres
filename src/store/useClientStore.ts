import { create } from 'zustand';
import debounce from 'lodash/debounce';
import sortBy from 'lodash/sortBy';
import filter from 'lodash/filter';
import type { Finca, BloqueoDisponibilidad } from '../types';
import { isAmenidadMatch } from '../utils/amenidades';

export interface ClientStoreState {
  // Filtros reactivos
  busquedaTexto: string;
  fechaEntrada: string;
  fechaSalida: string;
  personas: string;
  amenidades: string[];
  soloPetFriendly: boolean;
  zona: string;
  ordenPor: 'recomendado' | 'precio_asc' | 'precio_desc' | 'capacidad_desc';

  // Presentación
  vistaModo: 'grid' | 'lista';
  filtrosAvanzadosOpen: boolean;

  // Comparador de Fincas (máximo 3)
  fincasComparar: string[];
  comparadorModalOpen: boolean;

  // Calculadora interactiva de Presupuesto
  presupuestoHuespedes: number;
  presupuestoNoches: number;
  presupuestoPlanAlim: 'ninguno' | 'desayuno' | 'dia_completo' | 'asado';

  // Portal de autogestión del huésped
  modalConsultaOpen: boolean;
  consecutivoConsulta: string;

  // Favoritos
  favoritos: string[];

  // Acciones
  setBusquedaTexto: (texto: string) => void;
  setFechaEntrada: (fecha: string) => void;
  setFechaSalida: (fecha: string) => void;
  setPersonas: (personas: string) => void;
  toggleAmenidad: (amenidad: string) => void;
  setSoloPetFriendly: (val: boolean) => void;
  setZona: (zona: string) => void;
  setOrdenPor: (orden: 'recomendado' | 'precio_asc' | 'precio_desc' | 'capacidad_desc') => void;
  setVistaModo: (modo: 'grid' | 'lista') => void;
  setFiltrosAvanzadosOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  limpiarFiltros: () => void;

  // Comparador
  toggleCompararFinca: (fincaId: string) => void;
  limpiarComparador: () => void;
  setComparadorModalOpen: (open: boolean) => void;

  // Presupuesto
  setPresupuestoHuespedes: (val: number) => void;
  setPresupuestoNoches: (val: number) => void;
  setPresupuestoPlanAlim: (plan: 'ninguno' | 'desayuno' | 'dia_completo' | 'asado') => void;

  // Portal
  setModalConsultaOpen: (open: boolean) => void;
  setConsecutivoConsulta: (val: string) => void;

  // Favoritos
  toggleFavorito: (fincaId: string) => void;
}

const FAVORITOS_KEY = 'fc_cliente_favoritos';

function cargarFavoritosIniciales(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const useClientStore = create<ClientStoreState>((set) => ({
  busquedaTexto: '',
  fechaEntrada: '',
  fechaSalida: '',
  personas: '',
  amenidades: [],
  soloPetFriendly: false,
  zona: '',
  ordenPor: 'recomendado',

  vistaModo: 'grid',
  filtrosAvanzadosOpen: false,

  fincasComparar: [],
  comparadorModalOpen: false,

  presupuestoHuespedes: 12,
  presupuestoNoches: 2,
  presupuestoPlanAlim: 'ninguno',

  modalConsultaOpen: false,
  consecutivoConsulta: '',

  favoritos: cargarFavoritosIniciales(),

  setBusquedaTexto: (busquedaTexto) => set({ busquedaTexto }),
  setFechaEntrada: (fechaEntrada) => set({ fechaEntrada }),
  setFechaSalida: (fechaSalida) => set({ fechaSalida }),
  setPersonas: (personas) => set({ personas }),
  toggleAmenidad: (amenidad) =>
    set((state) => ({
      amenidades: state.amenidades.includes(amenidad)
        ? state.amenidades.filter((a) => a !== amenidad)
        : [...state.amenidades, amenidad],
    })),
  setSoloPetFriendly: (soloPetFriendly) => set({ soloPetFriendly }),
  setZona: (zona) => set({ zona }),
  setOrdenPor: (ordenPor) => set({ ordenPor }),
  setVistaModo: (vistaModo) => set({ vistaModo }),
  setFiltrosAvanzadosOpen: (open) =>
    set((state) => ({
      filtrosAvanzadosOpen: typeof open === 'function' ? open(state.filtrosAvanzadosOpen) : open,
    })),

  limpiarFiltros: () =>
    set({
      busquedaTexto: '',
      fechaEntrada: '',
      fechaSalida: '',
      personas: '',
      amenidades: [],
      soloPetFriendly: false,
      zona: '',
      ordenPor: 'recomendado',
    }),

  toggleCompararFinca: (fincaId) =>
    set((state) => {
      if (state.fincasComparar.includes(fincaId)) {
        return { fincasComparar: state.fincasComparar.filter((id) => id !== fincaId) };
      }
      if (state.fincasComparar.length >= 3) {
        // Máximo 3 para comparación óptima
        return { fincasComparar: [...state.fincasComparar.slice(1), fincaId] };
      }
      return { fincasComparar: [...state.fincasComparar, fincaId] };
    }),

  limpiarComparador: () => set({ fincasComparar: [], comparadorModalOpen: false }),
  setComparadorModalOpen: (comparadorModalOpen) => set({ comparadorModalOpen }),

  setPresupuestoHuespedes: (presupuestoHuespedes) => set({ presupuestoHuespedes }),
  setPresupuestoNoches: (presupuestoNoches) => set({ presupuestoNoches }),
  setPresupuestoPlanAlim: (presupuestoPlanAlim) => set({ presupuestoPlanAlim }),

  setModalConsultaOpen: (modalConsultaOpen) => set({ modalConsultaOpen }),
  setConsecutivoConsulta: (consecutivoConsulta) => set({ consecutivoConsulta }),

  toggleFavorito: (fincaId) =>
    set((state) => {
      const exists = state.favoritos.includes(fincaId);
      const nuevos = exists
        ? state.favoritos.filter((id) => id !== fincaId)
        : [...state.favoritos, fincaId];
      try {
        localStorage.setItem(FAVORITOS_KEY, JSON.stringify(nuevos));
      } catch {
        // ignorar error de almacenamiento local
      }
      return { favoritos: nuevos };
    }),
}));

/**
 * Función selectora optimizada con Lodash para filtrar y ordenar fincas reactivamente.
 */
export function filtrarFincasCliente(
  fincas: Finca[],
  bloquesAdmin: BloqueoDisponibilidad[],
  state: ClientStoreState
): Finca[] {
  const {
    busquedaTexto,
    fechaEntrada,
    fechaSalida,
    personas,
    amenidades,
    soloPetFriendly,
    zona,
    ordenPor,
  } = state;

  const resultado = filter(fincas, (finca) => {
    // 1. Solo fincas activas
    if (finca.activo === false) return false;

    // 2. Filtro textual
    if (busquedaTexto.trim()) {
      const q = busquedaTexto.toLowerCase();
      const coincideNombre = (finca.nombre || '').toLowerCase().includes(q);
      const coincideZona = (finca.zona || '').toLowerCase().includes(q);
      const coincideDesc = (finca.descripcion || '').toLowerCase().includes(q);
      if (!coincideNombre && !coincideZona && !coincideDesc) return false;
    }

    // 3. Zona
    if (zona && finca.zona && !finca.zona.toLowerCase().includes(zona.toLowerCase())) {
      return false;
    }

    // 4. Capacidad
    if (personas) {
      const capMin = finca.capacidad_minima || 1;
      const capMax = finca.capacidad || 10;
      if (personas === 'Hasta 10' && (capMin > 10 || capMax < 1)) return false;
      if (personas === '10 – 20' && (capMin > 20 || capMax < 10)) return false;
      if (personas === '20 – 40' && (capMin > 40 || capMax < 20)) return false;
      if (personas === 'Más de 40' && capMax <= 40) return false;
    }

    // 5. Pet friendly
    if (soloPetFriendly && (!finca.politica_mascotas || finca.politica_mascotas === 'no_permitido')) {
      return false;
    }

    // 6. Amenidades seleccionadas
    if (amenidades.length > 0) {
      const fincaAms = finca.finca_amenidades || [];
      const cumpleTodas = amenidades.every((sel) => {
        return fincaAms.some((a) => isAmenidadMatch(a.nombre, sel));
      });
      if (!cumpleTodas) return false;
    }

    // 7. Disponibilidad por fechas
    if (fechaEntrada || fechaSalida) {
      const rInicio = fechaEntrada || fechaSalida;
      const rFin = fechaSalida || fechaEntrada;
      if (rFin < rInicio) return false;

      const tieneBloqueo = bloquesAdmin.some((b) => {
        if (b.finca_id !== finca.id) return false;
        if (b.estado !== 'ocupado') return false;
        return b.fecha_inicio <= rFin && b.fecha_fin >= rInicio;
      });

      if (tieneBloqueo) return false;
    }

    return true;
  });

  // Ordenamiento con Lodash
  switch (ordenPor) {
    case 'precio_asc':
      return sortBy(resultado, (f) => Number(f.precio_pp) || 0);
    case 'precio_desc':
      return sortBy(resultado, (f) => -(Number(f.precio_pp) || 0));
    case 'capacidad_desc':
      return sortBy(resultado, (f) => -(Number(f.capacidad) || 0));
    default:
      return resultado;
  }
}
