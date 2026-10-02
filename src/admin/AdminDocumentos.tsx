import React, { useState } from 'react';
import { FileText, Download, Lock, CheckCircle, AlertTriangle, CreditCard, MessageCircle } from 'lucide-react';
import type { Reserva, Pago } from '../types';
import { calcularSaldo } from '../types';
import {
  generarDocSeparacion,
  generarComprobantePago,
  generarEstadoCuenta,
  generarPazYSalvo,
} from '../services/documentos';
import {
  plantillaSeparacion,
  plantillaComprobantePago,
  plantillaEstadoCuenta,
  plantillaPazYSalvo,
} from '../services/whatsapp';
import { WhatsAppModal } from '../components/WhatsAppModal';

interface AdminDocumentosProps {
  reserva: Reserva;
  onRegistrarEnvio?: (com: any) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminDocumentos: React.FC<AdminDocumentosProps> = ({
  reserva,
  onRegistrarEnvio,
  showToast,
}) => {
  const [generando, setGenerando] = useState<string | null>(null);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<string>('');

  // Estado del modal de WhatsApp
  const [modalWa, setModalWa] = useState<{
    abierto: boolean;
    titulo: string;
    nombreDoc: string;
    mensaje: string;
    onGenerarPdf: () => Promise<void> | void;
    tipoComunicacion: 'separacion' | 'abono' | 'estado_cuenta' | 'paz_salvo';
  }>({
    abierto: false,
    titulo: '',
    nombreDoc: '',
    mensaje: '',
    onGenerarPdf: () => {},
    tipoComunicacion: 'separacion',
  });

  const saldo = calcularSaldo(reserva);
  const pagos: Pago[] = reserva.pagos || [];
  const pazYSalvoDisponible = saldo <= 0 && pagos.length > 0;
  const clienteNombre = reserva.clientes ? `${reserva.clientes.nombre} ${reserva.clientes.apellido || ''}`.trim() : 'Cliente';
  const telefonoCliente = reserva.clientes?.whatsapp || reserva.clientes?.telefono || '';

  const ejecutarDescarga = async (tipo: string, fn: () => void) => {
    setGenerando(tipo);
    try {
      await new Promise<void>(res => {
        setTimeout(() => { fn(); res(); }, 80);
      });
      showToast?.('Documento PDF descargado ✅', 'success');
    } finally {
      setGenerando(null);
    }
  };

  // Acciones WhatsApp
  const abrirWaSeparacion = () => {
    setModalWa({
      abierto: true,
      titulo: 'Enviar Separación por WhatsApp',
      nombreDoc: 'Documento Oficial de Separación (PDF)',
      mensaje: plantillaSeparacion(reserva),
      onGenerarPdf: () => generarDocSeparacion(reserva),
      tipoComunicacion: 'separacion',
    });
  };

  const abrirWaEstadoCuenta = () => {
    setModalWa({
      abierto: true,
      titulo: 'Enviar Estado de Cuenta por WhatsApp',
      nombreDoc: 'Estado de Cuenta Consolidado (PDF)',
      mensaje: plantillaEstadoCuenta(reserva),
      onGenerarPdf: () => generarEstadoCuenta(reserva),
      tipoComunicacion: 'estado_cuenta',
    });
  };

  const abrirWaPazYSalvo = () => {
    setModalWa({
      abierto: true,
      titulo: 'Enviar Paz y Salvo por WhatsApp',
      nombreDoc: 'Certificado de Paz y Salvo (PDF)',
      mensaje: plantillaPazYSalvo(reserva),
      onGenerarPdf: () => generarPazYSalvo(reserva),
      tipoComunicacion: 'paz_salvo',
    });
  };

  const abrirWaComprobante = () => {
    if (!pagoSeleccionado) {
      showToast?.('Selecciona primero un pago para enviar su comprobante', 'info');
      return;
    }
    const pago = pagos.find(p => p.id === pagoSeleccionado);
    if (!pago) return;

    setModalWa({
      abierto: true,
      titulo: 'Enviar Comprobante de Abono por WhatsApp',
      nombreDoc: `Comprobante de Pago (${pago.tipo})`,
      mensaje: plantillaComprobantePago(reserva, pago),
      onGenerarPdf: () => generarComprobantePago(reserva, pago),
      tipoComunicacion: 'abono',
    });
  };

  const handleEnvioExitoso = (tel: string, msg: string) => {
    showToast?.('WhatsApp abierto y documento generado correctamente ✅', 'success');
    if (onRegistrarEnvio) {
      onRegistrarEnvio({
        cliente_id: reserva.cliente_id || null,
        reserva_id: reserva.id,
        tipo: modalWa.tipoComunicacion,
        destinatario: clienteNombre,
        telefono: tel,
        mensaje: msg,
        estado: 'enviado',
      });
    }
  };

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--primary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FileText size={15} /> Documentos y Comunicaciones
        </span>
        {telefonoCliente && (
          <span style={{ fontSize: '0.74rem', color: '#25d366', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <MessageCircle size={12} /> WhatsApp: {telefonoCliente}
          </span>
        )}
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
          : <><CheckCircle size={13} /> Reserva completamente pagada (Paz y Salvo habilitado)</>
        }
      </div>

      {/* Grid de documentos con descarga y envío por WhatsApp */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.6rem' }}>
        {/* 1. Separación */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)', padding: '0.55rem 0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Separación</span>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button
              className="btn btn-sm"
              onClick={() => ejecutarDescarga('separacion', () => generarDocSeparacion(reserva))}
              disabled={generando === 'separacion'}
              title="Descargar PDF de Separación"
              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
            >
              <Download size={11} /> PDF
            </button>
            <button
              className="btn btn-sm"
              onClick={abrirWaSeparacion}
              title="Generar PDF y Enviar por WhatsApp"
              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#25d366', borderColor: '#25d366' }}
            >
              <MessageCircle size={11} /> WhatsApp
            </button>
          </div>
        </div>

        {/* 2. Estado de cuenta */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)', padding: '0.55rem 0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Estado de cuenta</span>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button
              className="btn btn-sm"
              onClick={() => ejecutarDescarga('estado_cuenta', () => generarEstadoCuenta(reserva))}
              disabled={generando === 'estado_cuenta'}
              title="Descargar PDF de Estado de Cuenta"
              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
            >
              <Download size={11} /> PDF
            </button>
            <button
              className="btn btn-sm"
              onClick={abrirWaEstadoCuenta}
              title="Generar PDF y Enviar por WhatsApp"
              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#25d366', borderColor: '#25d366' }}
            >
              <MessageCircle size={11} /> WhatsApp
            </button>
          </div>
        </div>

        {/* 3. Paz y salvo */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--rad-xs)',
          padding: '0.55rem 0.7rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: pazYSalvoDisponible ? 1 : 0.6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {pazYSalvoDisponible
              ? <CheckCircle size={12} style={{ color: 'var(--success)' }} />
              : <Lock size={12} />
            }
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Paz y salvo</span>
          </div>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button
              className="btn btn-sm"
              onClick={pazYSalvoDisponible ? () => ejecutarDescarga('paz_salvo', () => generarPazYSalvo(reserva)) : undefined}
              disabled={!pazYSalvoDisponible || generando === 'paz_salvo'}
              title={pazYSalvoDisponible ? "Descargar Paz y Salvo" : "Requiere saldo = 0"}
              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
            >
              <Download size={11} /> PDF
            </button>
            <button
              className="btn btn-sm"
              onClick={pazYSalvoDisponible ? abrirWaPazYSalvo : undefined}
              disabled={!pazYSalvoDisponible}
              title={pazYSalvoDisponible ? "Generar y Enviar Paz y Salvo por WhatsApp" : "Requiere saldo = 0"}
              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: pazYSalvoDisponible ? '#25d366' : 'inherit', borderColor: pazYSalvoDisponible ? '#25d366' : 'var(--border)' }}
            >
              <MessageCircle size={11} /> WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* 4. Comprobante de abono específico */}
      {pagos.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rad-xs)', padding: '0.65rem 0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 500, minWidth: '130px' }}>
            <CreditCard size={13} style={{ color: 'var(--primary)' }} /> Comprobante:
          </div>

          <select
            value={pagoSeleccionado}
            onChange={e => setPagoSeleccionado(e.target.value)}
            className="btn btn-sm"
            style={{ flex: 1, fontSize: '0.75rem', minWidth: '170px' }}
          >
            <option value="">— Seleccionar pago registrado —</option>
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
            style={{ fontSize: '0.72rem', gap: '0.3rem', padding: '0.25rem 0.5rem' }}
            onClick={() => {
              const p = pagos.find(x => x.id === pagoSeleccionado);
              if (p) ejecutarDescarga('abono_' + p.id, () => generarComprobantePago(reserva, p));
            }}
            disabled={!pagoSeleccionado || generando?.startsWith('abono_')}
          >
            <Download size={11} /> PDF
          </button>

          <button
            className="btn btn-sm"
            style={{ fontSize: '0.72rem', gap: '0.3rem', padding: '0.25rem 0.5rem', color: '#25d366', borderColor: '#25d366' }}
            onClick={abrirWaComprobante}
            disabled={!pagoSeleccionado}
          >
            <MessageCircle size={11} /> WhatsApp
          </button>
        </div>
      )}

      {pagos.length === 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', fontStyle: 'italic', margin: 0 }}>
          Registra pagos en la reserva para generar y enviar comprobantes de abono.
        </p>
      )}

      {/* Modal interactivo de WhatsApp */}
      <WhatsAppModal
        isOpen={modalWa.abierto}
        onClose={() => setModalWa(p => ({ ...p, abierto: false }))}
        titulo={modalWa.titulo}
        destinatarioNombre={clienteNombre}
        telefonoInicial={telefonoCliente}
        mensajeInicial={modalWa.mensaje}
        nombreDocumento={modalWa.nombreDoc}
        onGenerarPdf={modalWa.onGenerarPdf}
        onDespuesDeEnviar={handleEnvioExitoso}
      />
    </div>
  );
};
