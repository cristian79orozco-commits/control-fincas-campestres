import React, { useState, useEffect } from 'react';
import { MessageCircle, FileDown, Copy, Check, X, Send, Phone, Edit2 } from 'lucide-react';
import { abrirWhatsApp, copiarAlPortapapeles, formatearTelefonoWhatsApp } from '../services/whatsapp';

export interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  destinatarioNombre: string;
  telefonoInicial: string;
  mensajeInicial: string;
  nombreDocumento?: string; // Ej: 'Documento de Separación', 'Estado de Cuenta'
  onGenerarPdf?: () => Promise<void> | void;
  onDespuesDeEnviar?: (telefono: string, mensaje: string) => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  titulo,
  destinatarioNombre,
  telefonoInicial,
  mensajeInicial,
  nombreDocumento,
  onGenerarPdf,
  onDespuesDeEnviar,
}) => {
  const [telefono, setTelefono] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [generarPdf, setGenerarPdf] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTelefono(formatearTelefonoWhatsApp(telefonoInicial) || telefonoInicial || '');
      setMensaje(mensajeInicial);
      setGenerarPdf(Boolean(nombreDocumento && onGenerarPdf));
      setCopiado(false);
    }
  }, [isOpen, telefonoInicial, mensajeInicial, nombreDocumento, onGenerarPdf]);

  if (!isOpen) return null;

  const handleCopiar = async () => {
    const ok = await copiarAlPortapapeles(mensaje);
    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const handleDescargarSoloPdf = async () => {
    if (onGenerarPdf) {
      setEnviando(true);
      try {
        await onGenerarPdf();
      } finally {
        setEnviando(false);
      }
    }
  };

  const handleEnviarWhatsApp = async () => {
    const telLimpio = formatearTelefonoWhatsApp(telefono);
    if (!telLimpio) {
      alert('Por favor introduce un número de teléfono o celular válido.');
      return;
    }

    setEnviando(true);
    try {
      // 1. Si está activo generar PDF, ejecutarlo primero (regla del plan maestro)
      if (generarPdf && onGenerarPdf) {
        await onGenerarPdf();
      }

      // 2. Abrir WhatsApp con el número del cliente y el mensaje estructurado
      abrirWhatsApp(telLimpio, mensaje);

      // 3. Notificar callback de registro
      onDespuesDeEnviar?.(telLimpio, mensaje);

      onClose();
    } catch (err) {
      console.error('Error al enviar WhatsApp:', err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100 }}>
      <div
        className="modal-box"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '580px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Encabezado */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#25d366' }}>
            <MessageCircle size={20} />
            <span>{titulo}</span>
          </div>
          <button className="btn btn-sm" onClick={onClose} aria-label="Cerrar"><X size={15} /></button>
        </div>

        {/* Cuerpo con scroll */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Fila destinatario y teléfono */}
          <div style={{ background: 'var(--surface-alt, #f7f9f8)', padding: '0.85rem', borderRadius: 'var(--rad-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Destinatario:</span>
              <strong style={{ fontSize: '0.85rem' }}>{destinatarioNombre || 'Cliente sin nombre'}</strong>
            </div>

            <div className="field" style={{ margin: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
                <Phone size={12} /> Número de WhatsApp (código de país + celular):
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="Ej. 573176827093"
                style={{ fontSize: '0.85rem', fontWeight: 500 }}
              />
              <span className="text-xs text-muted" style={{ marginTop: '0.2rem', display: 'block' }}>
                Si el cliente es de Colombia, asegúrate de que inicie con 57 (ej: 573001234567).
              </span>
            </div>
          </div>

          {/* Banner de Documento PDF si aplica */}
          {nombreDocumento && onGenerarPdf && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.9rem',
                borderRadius: 'var(--rad-sm)',
                background: 'rgba(26, 107, 94, 0.08)',
                border: '1px solid rgba(26, 107, 94, 0.25)',
                fontSize: '0.82rem',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileDown size={18} style={{ color: 'var(--primary)' }} />
                <div>
                  <strong style={{ color: 'var(--primary)', display: 'block' }}>{nombreDocumento}</strong>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Se descargará automáticamente para que puedas adjuntarlo en el chat.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleDescargarSoloPdf}
                  disabled={enviando}
                  style={{ fontSize: '0.74rem', padding: '0.2rem 0.5rem' }}
                  title="Descargar únicamente el archivo PDF"
                >
                  <FileDown size={12} /> Solo descargar PDF
                </button>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.76rem', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={generarPdf}
                    onChange={e => setGenerarPdf(e.target.checked)}
                  />
                  <span>Descargar al enviar</span>
                </label>
              </div>
            </div>
          )}

          {/* Editor / Vista previa del mensaje */}
          <div className="field" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0 }}>
                <Edit2 size={12} /> Mensaje a enviar por WhatsApp:
              </label>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleCopiar}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
              >
                {copiado ? <><Check size={12} style={{ color: 'var(--success)' }} /> Copiado</> : <><Copy size={12} /> Copiar texto</>}
              </button>
            </div>

            <textarea
              rows={9}
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              style={{
                fontFamily: 'inherit',
                fontSize: '0.8rem',
                lineHeight: '1.45',
                padding: '0.65rem',
                whiteSpace: 'pre-wrap',
                borderRadius: 'var(--rad-sm)',
              }}
            />
          </div>
        </div>

        {/* Footer con acciones */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--surface)',
          }}
        >
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Cancelar
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleEnviarWhatsApp}
            disabled={enviando || !telefono.trim()}
            style={{
              backgroundColor: '#25d366',
              borderColor: '#25d366',
              color: '#ffffff',
              fontWeight: 600,
              gap: '0.45rem',
            }}
          >
            <Send size={15} />
            {enviando
              ? 'Procesando…'
              : (nombreDocumento && generarPdf ? 'Descargar PDF y Enviar por WhatsApp' : 'Abrir chat de WhatsApp')}
          </button>
        </div>
      </div>
    </div>
  );
};
