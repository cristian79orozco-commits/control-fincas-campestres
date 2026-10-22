import React, { useState, useEffect } from 'react';
import { MessageCircle, FileDown, Copy, Check, X, Send, Phone, Edit2, Laptop, Globe, Info } from 'lucide-react';
import {
  abrirWhatsApp,
  copiarAlPortapapeles,
  formatearTelefonoWhatsApp,
  obtenerMetodoWhatsAppActual,
  setMetodoWhatsAppActual,
} from '../services/whatsapp';
import type { MetodoEnvioWhatsApp } from '../types';

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
  const [metodo, setMetodo] = useState<MetodoEnvioWhatsApp>(obtenerMetodoWhatsAppActual());

  useEffect(() => {
    if (isOpen) {
      setTelefono(formatearTelefonoWhatsApp(telefonoInicial) || telefonoInicial || '');
      setMensaje(mensajeInicial);
      setGenerarPdf(Boolean(nombreDocumento && onGenerarPdf));
      setCopiado(false);
      setMetodo(obtenerMetodoWhatsAppActual());
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

  const handleEnviarWhatsApp = async (metodoForzado?: MetodoEnvioWhatsApp) => {
    const metodoAUsar = metodoForzado || metodo;
    const telLimpio = formatearTelefonoWhatsApp(telefono);
    if (!telLimpio) {
      alert('Por favor introduce un número de teléfono o celular válido.');
      return;
    }

    setEnviando(true);
    try {
      // 1. Abrir WhatsApp de inmediato con el gesto de usuario activo para evitar bloqueo de protocolos
      abrirWhatsApp(telLimpio, mensaje, metodoAUsar);

      // 2. Si está activo generar PDF, ejecutar la generación y descarga
      if (generarPdf && onGenerarPdf) {
        await onGenerarPdf();
      }

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

          {/* Selector de Canal: WhatsApp Desktop PC vs WhatsApp Web */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--rad-sm)',
              background: 'var(--surface-alt, #f7f9f8)',
              border: '1px solid var(--border)',
              fontSize: '0.8rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              {metodo === 'desktop' ? (
                <Laptop size={16} style={{ color: '#16a34a' }} />
              ) : (
                <Globe size={16} style={{ color: '#0284c7' }} />
              )}
              <span style={{ fontWeight: 600 }}>Modo de apertura:</span>
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <button
                type="button"
                className={`btn btn-sm ${metodo === 'desktop' ? 'btn-primary' : ''}`}
                style={{
                  fontSize: '0.74rem',
                  padding: '0.22rem 0.55rem',
                  ...(metodo === 'desktop' ? { backgroundColor: '#16a34a', borderColor: '#16a34a' } : {}),
                }}
                onClick={() => {
                  setMetodo('desktop');
                  setMetodoWhatsAppActual('desktop');
                }}
                title="Abre directamente la aplicación de WhatsApp instalada en tu PC (sin salir de la página)"
              >
                💻 App de PC (Desktop)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${metodo === 'web' ? 'btn-primary' : ''}`}
                style={{
                  fontSize: '0.74rem',
                  padding: '0.22rem 0.55rem',
                  ...(metodo === 'web' ? { backgroundColor: '#0284c7', borderColor: '#0284c7' } : {}),
                }}
                onClick={() => {
                  setMetodo('web');
                  setMetodoWhatsAppActual('web');
                }}
                title="Abre WhatsApp Web en una nueva pestaña del navegador"
              >
                🌐 WhatsApp Web
              </button>
            </div>
          </div>

          {metodo === 'desktop' && (
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginTop: '-0.35rem',
                paddingLeft: '0.25rem',
              }}
            >
              <Info size={12} style={{ color: '#16a34a', flexShrink: 0 }} />
              <span>
                Se abrirá en la app de WhatsApp de tu PC sin cerrar ni salir de esta web (ideal para multitarea).
              </span>
            </div>
          )}
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
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Cancelar
          </button>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {metodo === 'desktop' && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handleEnviarWhatsApp('web')}
                disabled={enviando || !telefono.trim()}
                style={{ fontSize: '0.74rem', color: 'var(--text-muted)', gap: '0.3rem' }}
                title="Abrir como respaldo en WhatsApp Web si esta PC no tiene la app instalada"
              >
                <Globe size={12} /> Abrir en Web
              </button>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleEnviarWhatsApp()}
              disabled={enviando || !telefono.trim()}
              style={{
                backgroundColor: metodo === 'desktop' ? '#16a34a' : '#0284c7',
                borderColor: metodo === 'desktop' ? '#16a34a' : '#0284c7',
                color: '#ffffff',
                fontWeight: 600,
                gap: '0.45rem',
              }}
            >
              <Send size={15} />
              {enviando
                ? 'Procesando…'
                : (nombreDocumento && generarPdf
                    ? (metodo === 'desktop' ? 'Descargar PDF y Abrir en WhatsApp PC' : 'Descargar PDF y Abrir en WhatsApp Web')
                    : (metodo === 'desktop' ? 'Abrir chat en WhatsApp PC' : 'Abrir chat en WhatsApp Web'))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
