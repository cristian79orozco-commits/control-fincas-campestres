import React from 'react';
import { Trash2, User, Calendar } from 'lucide-react';
import type { BloqueoDisponibilidad } from '../types';

interface AdminReservasTableProps {
  bloques: BloqueoDisponibilidad[];
  onEliminar: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

function formatFecha(fecha?: string) {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

export const AdminReservasTable: React.FC<AdminReservasTableProps> = ({
  bloques,
  onEliminar,
  showToast,
  openConfirm,
}) => {
  const ocupados = bloques.filter(b => b.estado === 'ocupado');

  const handleLiberarFecha = (id: number | string, fincaNombre?: string) => {
    openConfirm(
      '¿Liberar esta fecha reservada?',
      `Se eliminará el bloqueo para ${fincaNombre || 'la finca'} y el rango quedará disponible inmediatamente para nuevos clientes.`,
      async () => {
        const res = await onEliminar(id);
        if (res.success) {
          showToast('Fecha liberada correctamente ✅', 'success');
        } else {
          showToast(`Error al liberar: ${res.error}`, 'error');
        }
      }
    );
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Calendar size={18} /> Reservas y fechas ocupadas
          </div>
          <div className="text-xs text-muted mt-1">
            Fechas bloqueadas registradas en el sistema con cliente asignado
          </div>
        </div>
        <span className="status-badge s-busy">{ocupados.length} ocupada{ocupados.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="avail-table">
        {ocupados.length === 0 ? (
          <p className="text-muted text-sm" style={{ padding: '1rem', textAlign: 'center' }}>
            No hay fechas ocupadas registradas en este momento.
          </p>
        ) : (
          ocupados.map(b => {
            const fincaNombre = Array.isArray(b.fincas) ? b.fincas[0]?.nombre : b.fincas?.nombre;
            return (
              <div key={b.id} className="avail-row reservas-cal-row">
                <div>
                  <div style={{ fontWeight: 600 }}>{fincaNombre || 'Finca'}</div>
                  <div className="avail-date">{formatFecha(b.fecha_inicio)} → {formatFecha(b.fecha_fin)}</div>
                </div>

                <div>
                  {b.notas ? (
                    <div className="avail-cliente">
                      <User size={12} /> {b.notas}
                    </div>
                  ) : (
                    <div className="avail-cliente-empty">Sin nombre registrado</div>
                  )}
                </div>

                <span className="status-badge s-busy">Ocupado</span>

                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleLiberarFecha(b.id, fincaNombre)}
                  title="Liberar fecha para reservas"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
