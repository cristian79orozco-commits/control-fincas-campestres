import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, User, Lock, Calendar } from 'lucide-react';
import type { Finca, BloqueoDisponibilidad } from '../types';

interface AdminCalendarProps {
  fincas: Finca[];
  bloquesAdmin: BloqueoDisponibilidad[];
  onMarcarDias: (fincaId: string, fechas: string[], estado: 'ocupado' | 'libre', nombreCliente?: string) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const AdminCalendar: React.FC<AdminCalendarProps> = ({
  fincas,
  bloquesAdmin,
  onMarcarDias,
  showToast,
}) => {
  const [selectedFincaId, setSelectedFincaId] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState<Set<string>>(new Set());
  const [nombreCliente, setNombreCliente] = useState('');
  const [procesando, setProcesando] = useState(false);

  const anio = currentDate.getFullYear();
  const mes = currentDate.getMonth();

  // Bloqueos de la finca actualmente seleccionada
  const ocupadosSet = useMemo(() => {
    const set = new Set<string>();
    if (!selectedFincaId) return set;

    bloquesAdmin
      .filter(b => b.finca_id === selectedFincaId && b.estado === 'ocupado')
      .forEach(b => {
        const d = new Date(b.fecha_inicio + 'T00:00:00');
        const fin = new Date(b.fecha_fin + 'T00:00:00');
        while (d <= fin) {
          set.add(d.toISOString().split('T')[0]);
          d.setDate(d.getDate() + 1);
        }
      });
    return set;
  }, [bloquesAdmin, selectedFincaId]);

  const handlePrevMonth = () => setCurrentDate(new Date(anio, mes - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(anio, mes + 1, 1));

  const diasMes = new Date(anio, mes + 1, 0).getDate();
  const primerDiaSemana = new Date(anio, mes, 1).getDay();
  const offset = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

  const toggleDia = (fechaStr: string) => {
    setFechasSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(fechaStr)) next.delete(fechaStr);
      else next.add(fechaStr);
      return next;
    });
  };

  const handleMarcar = async (estado: 'ocupado' | 'libre') => {
    if (!selectedFincaId) {
      showToast('Selecciona una finca primero', 'error');
      return;
    }
    if (!fechasSeleccionadas.size) {
      showToast('Selecciona al menos un día en el calendario', 'error');
      return;
    }

    setProcesando(true);
    const res = await onMarcarDias(
      selectedFincaId,
      Array.from(fechasSeleccionadas),
      estado,
      nombreCliente.trim() || undefined
    );
    setProcesando(false);

    if (res.success) {
      showToast(`Días marcados como "${estado}" correctamente ✅`, 'success');
      setFechasSeleccionadas(new Set());
      setNombreCliente('');
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Calendar size={18} /> Calendario de disponibilidad interactivo
          </div>
          <div className="text-xs text-muted mt-1">
            Marca días como ocupados o libres. Los cambios se sincronizan en vivo con los clientes.
          </div>
        </div>
        <span className="status-badge s-info">Sincronizado</span>
      </div>

      <div className="field" style={{ marginBottom: '1rem' }}>
        <label>Finca a gestionar</label>
        <select
          value={selectedFincaId}
          onChange={e => {
            setSelectedFincaId(e.target.value);
            setFechasSeleccionadas(new Set());
          }}
        >
          <option value="">— Selecciona una finca —</option>
          {fincas.map(f => (
            <option key={f.id} value={f.id}>{f.nombre}</option>
          ))}
        </select>
      </div>

      {selectedFincaId ? (
        <div className="admin-cal-wrap" style={{ display: 'block' }}>
          <div className="admin-cal-nav">
            <button className="btn btn-sm" onClick={handlePrevMonth} title="Mes anterior">
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              {MESES[mes]} {anio}
            </span>
            <button className="btn btn-sm" onClick={handleNextMonth} title="Mes siguiente">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="calendar-wrap">
            <div className="cal-grid">
              <div className="cal-head">Lun</div>
              <div className="cal-head">Mar</div>
              <div className="cal-head">Mié</div>
              <div className="cal-head">Jue</div>
              <div className="cal-head">Vie</div>
              <div className="cal-head">Sáb</div>
              <div className="cal-head">Dom</div>

              {Array.from({ length: offset }).map((_, i) => (
                <div key={`offset-${i}`} className="cal-day empty" style={{ opacity: 0, pointerEvents: 'none' }} />
              ))}

              {Array.from({ length: diasMes }).map((_, i) => {
                const diaNum = i + 1;
                const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
                const esOcupado = ocupadosSet.has(fechaStr);
                const esSeleccionado = fechasSeleccionadas.has(fechaStr);

                let cls = 'cal-day';
                if (esSeleccionado) cls += ' selected';
                else if (esOcupado) cls += ' busy';
                else cls += ' free';

                return (
                  <div
                    key={fechaStr}
                    className={cls}
                    onClick={() => toggleDia(fechaStr)}
                    title={esOcupado ? 'Ocupado' : 'Libre'}
                  >
                    {diaNum}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="cal-legend" style={{ margin: '0.75rem 0' }}>
            <span className="legend-dot free">Libre</span>
            <span className="legend-dot busy">Ocupado</span>
            <span className="legend-dot sel">Seleccionado</span>
          </div>

          <p className="text-xs text-muted">
            {fechasSeleccionadas.size > 0
              ? `${fechasSeleccionadas.size} día(s) seleccionado(s)`
              : 'Haz clic en los días para seleccionarlos (puedes elegir varios días a la vez)'}
          </p>

          <div style={{ marginTop: '0.85rem', display: 'grid', gap: '0.4rem' }}>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              <User size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Nombre del cliente (reserva)
            </label>
            <input
              type="text"
              placeholder="Nombre y apellido del huésped — opcional para marcar como libre"
              value={nombreCliente}
              onChange={e => setNombreCliente(e.target.value)}
            />
            <p className="text-xs text-faint" style={{ margin: 0 }}>
              <Lock size={11} style={{ display: 'inline', verticalAlign: '-1px' }} />
              Solo visible en el panel administrador. El cliente nunca verá este dato.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
            <button
              className="btn btn-danger btn-sm"
              disabled={procesando || !fechasSeleccionadas.size}
              onClick={() => handleMarcar('ocupado')}
            >
              <XCircle size={14} /> Marcar como ocupado
            </button>
            <button
              className="btn btn-sm"
              disabled={procesando || !fechasSeleccionadas.size}
              onClick={() => handleMarcar('libre')}
              style={{ background: 'var(--success-bg)', borderColor: 'var(--success)', color: 'var(--success)' }}
            >
              <CheckCircle size={14} /> Marcar como libre
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', background: 'var(--surface-2)', borderRadius: 'var(--rad-sm)' }}>
          Selecciona una finca en el menú superior para ver y editar su disponibilidad.
        </div>
      )}
    </div>
  );
};
