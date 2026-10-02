import React, { useState } from 'react';
import { FileText, Download, Lock, CheckCircle, AlertTriangle, CreditCard } from 'lucide-react';
import type { Reserva, Pago } from '../types';
import { calcularSaldo } from '../types';
import {
  generarDocSeparacion,
  generarComprobantePago,
  generarEstadoCuenta,
  generarPazYSalvo,
} from '../services/documentos';

interface AdminDocumentosProps {
  reserva: Reserva;
}

export const AdminDocumentos: React.FC<AdminDocumentosProps> = ({ reserva }) => {
  const [generando, setGenerando] = useState<string | null>(null);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<string>('');

  const saldo = calcularSaldo(reserva);
  const pagos: Pago[] = reserva.pagos || [];
  const pazYSalvoDisponible = saldo <= 0 && pagos.length > 0;

  const ejecutar = async (tipo: string, fn: () => void) => {
    setGenerando(tipo);
    try {
      // jsPDF es síncrono, pero lo envolvemos para UI feedback
      await new Promise<void>(res => {
        setTimeout(() => { fn(); res(); }, 80);
      });
    } finally {
      setGenerando(null);
    }
  };

  const handleSeparacion = () =>
    ejecutar('separacion', () => generarDocSeparacion(reserva));

  const handleEstadoCuenta = () =>
    ejecutar('estado_cuenta', () => generarEstadoCuenta(reserva));

  const handlePazYSalvo = () =>
    ejecutar('paz_salvo', () => generarPazYSalvo(reserva));

  const handleComprobante = () => {
    if (!pagoSeleccionado) return;
    const pago = pagos.find(p => p.id === pagoSeleccionado);
    if (!pago) return;
    ejecutar('abono_' + pago.id, () => generarComprobantePago(reserva, pago));
  };

  return (
    <div style={{ display: 'grid', gap: '0.6rem' }}>
      <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)' }}>
        <FileText size={15} /> Documentos de la reserva
      </div>

      {/* Saldo pendiente */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontSize: '0.8rem',
          padding: '0.45rem 0.75rem',
          borderRadius: 'var(--rad-xs)',
          background: saldo > 0 ? 'var(--danger-bg)' : 'var(--success-bg)',
          color: saldo > 0 ? 'var(--danger)' : 'var(--success)',
          fontWeight: 600,
        }}
      >
        {saldo > 0
          ? <><AlertTriangle size={13} /> Saldo pendiente: ${saldo.toLocaleString('es-CO')} COP</>
          : <><CheckCircle size={13} /> Reserva completamente pagada</>
        }
      </div>

      {/* Botones de documentos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
        {/* 1. Separación */}
        <button
          className="btn btn-sm"
          style={{ justifyContent: 'flex-start', gap: '0.4rem', fontSize: '0.78rem' }}
          onClick={handleSeparacion}
          disabled={generando === 'separacion'}
          title="Descargar documento de separación"
        >
          <Download size={12} />
          {generando === 'separacion' ? 'Generando…' : 'Separación'}
        </button>

        {/* 3. Estado de cuenta */}
        <button
          className="btn btn-sm"
          style={{ justifyContent: 'flex-start', gap: '0.4rem', fontSize: '0.78rem' }}
          onClick={handleEstadoCuenta}
          disabled={generando === 'estado_cuenta'}
          title="Descargar estado de cuenta"
        >
          <Download size={12} />
          {generando === 'estado_cuenta' ? 'Generando…' : 'Estado de cuenta'}
        </button>

        {/* 4. Paz y salvo */}
        <button
          className="btn btn-sm"
          style={{
            justifyContent: 'flex-start', gap: '0.4rem', fontSize: '0.78rem',
            gridColumn: '1 / -1',
            opacity: pazYSalvoDisponible ? 1 : 0.5,
            cursor: pazYSalvoDisponible ? 'pointer' : 'not-allowed',
          }}
          onClick={pazYSalvoDisponible ? handlePazYSalvo : undefined}
          disabled={!pazYSalvoDisponible || generando === 'paz_salvo'}
          title={pazYSalvoDisponible ? 'Descargar paz y salvo' : 'Solo disponible cuando el saldo es cero'}
        >
          {pazYSalvoDisponible
            ? <CheckCircle size={12} style={{ color: 'var(--success)' }} />
            : <Lock size={12} />
          }
          {generando === 'paz_salvo' ? 'Generando…' : 'Paz y salvo'}
          {!pazYSalvoDisponible && <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginLeft: 'auto' }}>Solo con saldo = 0</span>}
        </button>
      </div>

      {/* 2. Comprobante de abono — requiere seleccionar pago */}
      {pagos.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <CreditCard size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <select
            value={pagoSeleccionado}
            onChange={e => setPagoSeleccionado(e.target.value)}
            className="btn btn-sm"
            style={{ flex: 1, fontSize: '0.75rem', minWidth: '160px' }}
          >
            <option value="">— Seleccionar pago —</option>
            {pagos.map(p => {
              const [y, m, d] = (p.fecha || '').split('-');
              return (
                <option key={p.id} value={p.id}>
                  {p.tipo} · {d}/{m}/{y} · ${p.valor.toLocaleString('es-CO')}
                </option>
              );
            })}
          </select>
          <button
            className="btn btn-sm"
            style={{ fontSize: '0.75rem', gap: '0.35rem' }}
            onClick={handleComprobante}
            disabled={!pagoSeleccionado || generando?.startsWith('abono_')}
          >
            <Download size={12} />
            {generando?.startsWith('abono_') ? 'Generando…' : 'Comprobante'}
          </button>
        </div>
      )}

      {pagos.length === 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', fontStyle: 'italic' }}>
          Registra pagos para generar comprobantes de abono.
        </p>
      )}
    </div>
  );
};
