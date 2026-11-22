import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import type { BloqueoDisponibilidad } from '../types';

interface CalendarPickerProps {
  bloques: BloqueoDisponibilidad[];
  fechaInicio: string;
  fechaFin: string;
  onRangeSelect: (inicio: string, fin: string) => void;
  onClearRange: () => void;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function formatFechaLegible(f?: string): string {
  if (!f) return '';
  const partes = f.split('-');
  if (partes.length !== 3) return f;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export const CalendarPicker = React.memo<CalendarPickerProps>(({
  bloques,
  fechaInicio,
  fechaFin,
  onRangeSelect,
  onClearRange,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [rangeWarning, setRangeWarning] = useState<string | null>(null);

  const anio = currentDate.getFullYear();
  const mes = currentDate.getMonth();

  // Conjunto de fechas ocupadas (en formato YYYY-MM-DD)
  const ocupadosSet = useMemo(() => {
    const set = new Set<string>();
    bloques
      .filter(b => b.estado === 'ocupado')
      .forEach(b => {
        const d = new Date(b.fecha_inicio + 'T00:00:00');
        const fin = new Date(b.fecha_fin + 'T00:00:00');
        while (d <= fin) {
          set.add(d.toISOString().split('T')[0]);
          d.setDate(d.getDate() + 1);
        }
      });
    return set;
  }, [bloques]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(anio, mes - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(anio, mes + 1, 1));
  };

  // Cuadrícula del mes
  const diasMes = new Date(anio, mes + 1, 0).getDate();
  const primerDiaSemana = new Date(anio, mes, 1).getDay();
  const offset = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1; // Lunes como primer día

  const handleDayClick = (fechaStr: string) => {
    setRangeWarning(null);

    // No permitir seleccionar fechas en el pasado
    const hoyStr = new Date().toISOString().split('T')[0];
    if (fechaStr < hoyStr) return;

    // Si el día está ocupado, no permitir seleccionarlo
    if (ocupadosSet.has(fechaStr)) {
      setRangeWarning(`El día ${fechaStr} ya se encuentra ocupado.`);
      return;
    }

    // Si no hay fecha de inicio, o ya hay ambas seleccionadas: reiniciar selección con este día
    if (!fechaInicio || (fechaInicio && fechaFin)) {
      onRangeSelect(fechaStr, '');
      return;
    }

    // Si ya hay fecha de inicio y no de fin:
    if (fechaInicio && !fechaFin) {
      if (fechaStr < fechaInicio) {
        // Si hace clic en un día anterior al inicio, se convierte en el nuevo inicio
        onRangeSelect(fechaStr, '');
        return;
      }

      if (fechaStr === fechaInicio) {
        // Mismo día: estadía de 1 noche (inicio hoy, fin mañana)
        const d = new Date(fechaStr + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        const nextDay = d.toISOString().split('T')[0];
        if (ocupadosSet.has(nextDay)) {
          setRangeWarning('El día siguiente está ocupado.');
          return;
        }
        onRangeSelect(fechaStr, nextDay);
        return;
      }

      // Validar si entre fechaInicio y fechaStr hay algún día ocupado
      const d = new Date(fechaInicio + 'T00:00:00');
      const target = new Date(fechaStr + 'T00:00:00');
      let hayCruces = false;

      while (d <= target) {
        const cur = d.toISOString().split('T')[0];
        if (ocupadosSet.has(cur)) {
          hayCruces = true;
          break;
        }
        d.setDate(d.getDate() + 1);
      }

      if (hayCruces) {
        setRangeWarning('El rango seleccionado incluye días que ya están reservados. Elige un período continuo libre.');
        return;
      }

      onRangeSelect(fechaInicio, fechaStr);
    }
  };

  // Cálculo de noches
  const nochesSeleccionadas = useMemo(() => {
    if (!fechaInicio || !fechaFin) return 0;
    const ini = new Date(fechaInicio + 'T00:00:00').getTime();
    const fin = new Date(fechaFin + 'T00:00:00').getTime();
    if (fin <= ini) return 0;
    return Math.round((fin - ini) / (1000 * 60 * 60 * 24));
  }, [fechaInicio, fechaFin]);

  return (
    <div>
      {/* Guía visual unificada paso a paso para el cliente (sin duplicación inferior) */}
      <div
        style={{
          background: fechaInicio && fechaFin
            ? 'color-mix(in srgb, var(--primary) 12%, var(--surface))'
            : 'var(--surface-2)',
          border: `1px solid ${fechaInicio && fechaFin ? 'color-mix(in srgb, var(--primary) 32%, transparent)' : 'var(--border)'}`,
          borderRadius: 'var(--rad-xs, 8px)',
          padding: '0.6rem 0.85rem',
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          flexWrap: 'wrap',
          fontSize: '0.78rem',
          boxShadow: 'var(--sh-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'var(--primary)',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {!fechaInicio ? '1' : !fechaFin ? '2' : '✓'}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.25 }}>
              {!fechaInicio
                ? 'Paso 1: Toca el día de llegada'
                : !fechaFin
                ? `Llegada: ${formatFechaLegible(fechaInicio)} · Toca el día de salida`
                : `${nochesSeleccionadas} noche${nochesSeleccionadas !== 1 ? 's' : ''}: ${formatFechaLegible(fechaInicio)} → ${formatFechaLegible(fechaFin)}`}
            </div>
          </div>
        </div>

        {fechaInicio && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={onClearRange}
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', minHeight: '30px', height: '30px' }}
          >
            Cambiar
          </button>
        )}
      </div>

      <div className="sec-header" style={{ marginBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn btn-sm" onClick={handlePrevMonth} title="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-muted" style={{ minWidth: '140px', textAlign: 'center', fontWeight: 600 }}>
            {MESES[mes]} {anio}
          </span>
          <button className="btn btn-sm" onClick={handleNextMonth} title="Mes siguiente">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="cal-legend">
          <span className="legend-dot free">Libre</span>
          <span className="legend-dot busy">Ocupado</span>
          <span className="legend-dot sel">Seleccionado</span>
        </div>
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
            const hoyStr = new Date().toISOString().split('T')[0];
            const esPasado = fechaStr < hoyStr;
            const esOcupado = ocupadosSet.has(fechaStr);
            const esInicio = fechaStr === fechaInicio;
            const esFin = fechaStr === fechaFin;
            const enRango = fechaInicio && fechaFin && fechaStr >= fechaInicio && fechaStr <= fechaFin;

            let dayClass = 'cal-day';
            if (esOcupado) dayClass += ' busy';
            else if (esPasado) dayClass += ' past';
            else dayClass += ' free';

            if (esInicio) dayClass += ' range-start';
            else if (esFin) dayClass += ' range-end';
            else if (enRango) dayClass += ' in-range';

            return (
              <div
                key={fechaStr}
                className={dayClass}
                onClick={() => handleDayClick(fechaStr)}
                title={esOcupado ? 'Ocupado' : esPasado ? 'Fecha pasada' : 'Disponible para reservar'}
                style={{
                  opacity: esPasado ? 0.4 : 1,
                  cursor: esPasado || esOcupado ? 'not-allowed' : 'pointer',
                }}
              >
                {diaNum}
              </div>
            );
          })}
        </div>
      </div>

      {rangeWarning && (
        <div style={{ marginTop: '0.6rem', color: 'var(--danger)', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>{rangeWarning}</span>
        </div>
      )}
    </div>
  );
});

CalendarPicker.displayName = 'CalendarPicker';
