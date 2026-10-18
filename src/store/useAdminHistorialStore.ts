import { create } from 'zustand';

export type HistorialChartTab = 'evolucion' | 'fincas' | 'estados';
export type HistorialVistaModo = 'cards' | 'compacto';

export interface AdminHistorialState {
  chartTab: HistorialChartTab;
  vistaModo: HistorialVistaModo;
  mostrarGraficos: boolean;

  setChartTab: (tab: HistorialChartTab) => void;
  setVistaModo: (modo: HistorialVistaModo) => void;
  toggleMostrarGraficos: () => void;
}

export const useAdminHistorialStore = create<AdminHistorialState>((set) => ({
  chartTab: 'evolucion',
  vistaModo: 'cards',
  mostrarGraficos: true,

  setChartTab: (chartTab) => set({ chartTab }),
  setVistaModo: (vistaModo) => set({ vistaModo }),
  toggleMostrarGraficos: () => set((state) => ({ mostrarGraficos: !state.mostrarGraficos })),
}));
