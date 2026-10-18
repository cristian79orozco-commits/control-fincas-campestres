import { create } from 'zustand';

export type DashboardPeriodo = 'hoy' | '7dias' | '30dias' | 'mes_actual' | 'ano_actual' | 'todos';
export type DashboardTab = 'finanzas' | 'ocupacion' | 'embudo';

export interface AdminDashboardState {
  periodo: DashboardPeriodo;
  fincaId: string; // 'todas' o id de finca específico
  tabActiva: DashboardTab;
  compararPeriodoAnterior: boolean;
  busquedaQuery: string;

  // Acciones
  setPeriodo: (periodo: DashboardPeriodo) => void;
  setFincaId: (fincaId: string) => void;
  setTabActiva: (tab: DashboardTab) => void;
  toggleCompararPeriodo: () => void;
  setBusquedaQuery: (query: string) => void;
  resetFiltros: () => void;
}

export const useAdminDashboardStore = create<AdminDashboardState>((set) => ({
  periodo: 'mes_actual',
  fincaId: 'todas',
  tabActiva: 'finanzas',
  compararPeriodoAnterior: false,
  busquedaQuery: '',

  setPeriodo: (periodo) => set({ periodo }),
  setFincaId: (fincaId) => set({ fincaId }),
  setTabActiva: (tabActiva) => set({ tabActiva }),
  toggleCompararPeriodo: () => set((state) => ({ compararPeriodoAnterior: !state.compararPeriodoAnterior })),
  setBusquedaQuery: (busquedaQuery) => set({ busquedaQuery }),
  resetFiltros: () => set({ periodo: 'mes_actual', fincaId: 'todas', busquedaQuery: '' }),
}));
