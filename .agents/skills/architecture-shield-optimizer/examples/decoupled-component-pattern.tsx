import React, { useMemo, useCallback } from 'react';
import type { Reserva, ReservaEstado } from '../types';

// ============================================================================
// 1. CONTRATOS E INTERFACES VISUALES
// ============================================================================
export interface ReservasListViewProps {
  reservas: Reserva[];
  isLoading: boolean;
  filtroActual: ReservaEstado | 'todas';
  onSeleccionarFiltro: (estado: ReservaEstado | 'todas') => void;
  onCambiarEstado: (id: string, nuevoEstado: ReservaEstado) => void;
  onVerDetalle: (reserva: Reserva) => void;
}

// ============================================================================
// 2. COMPONENTE VISUAL PURO (DUMB / PRESENTATIONAL UI)
// ============================================================================
export const ReservasListView: React.FC<ReservasListViewProps> = React.memo(({
  reservas,
  isLoading,
  filtroActual,
  onSeleccionarFiltro,
  onCambiarEstado,
  onVerDetalle,
}) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 animate-pulse">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-20 bg-[var(--surface-2)] rounded-[var(--rad-md)] border border-[var(--border)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de Filtros */}
      <div className="flex gap-2 pb-2 overflow-x-auto">
        {(['todas', 'pendiente', 'confirmada', 'cancelada'] as const).map((filtro) => (
          <button
            key={filtro}
            onClick={() => onSeleccionarFiltro(filtro)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 capitalize ${
              filtroActual === filtro
                ? 'bg-[var(--accent)] text-[#141210] border-[var(--accent)] shadow-[0_0_10px_rgba(212,146,74,0.3)]'
                : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]'
            }`}
          >
            {filtro}
          </button>
        ))}
      </div>

      {/* Lista de Registros */}
      <div className="space-y-3">
        {reservas.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)] bg-[var(--surface)] rounded-[var(--rad-md)] border border-[var(--border)]">
            No se encontraron reservas con el filtro seleccionado.
          </div>
        ) : (
          reservas.map((reserva) => (
            <div
              key={reserva.id}
              onClick={() => onVerDetalle(reserva)}
              className="group p-4 bg-[var(--surface)] hover:bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)]/50 rounded-[var(--rad-md)] cursor-pointer transition-all duration-200 flex items-center justify-between shadow-sm"
            >
              <div>
                <h4 className="font-semibold text-[var(--text)] text-sm group-hover:text-[var(--accent)] transition-colors">
                  {reserva.clienteNombre}
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Finca: {reserva.fincaNombre || reserva.fincaId} | Fechas: {reserva.fechaInicio} al {reserva.fechaFin}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[var(--text)]">
                  ${(reserva.total || 0).toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = reserva.estado === 'confirmada' ? 'pendiente' : 'confirmada';
                    onCambiarEstado(reserva.id, next as ReservaEstado);
                  }}
                  className="text-xs px-3 py-1 rounded bg-[var(--surface-3)] hover:bg-[var(--accent)] hover:text-[#141210] transition-colors border border-[var(--border)]"
                >
                  Cambiar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

ReservasListView.displayName = 'ReservasListView';
