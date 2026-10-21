import React, { useState } from 'react';
import { MessageCircle, Save, Check } from 'lucide-react';
import { obtenerMetodoWhatsAppActual, setMetodoWhatsAppActual } from '../services/whatsapp';
import type { MetodoEnvioWhatsApp } from '../types';

interface AdminWaConfigProps {
  currentWaNumber: string;
  onSaveWaNumber: (num: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminWaConfig: React.FC<AdminWaConfigProps> = ({
  currentWaNumber,
  onSaveWaNumber,
  showToast,
}) => {
  const [waInput, setWaInput] = useState(currentWaNumber);
  const [metodo, setMetodo] = useState<MetodoEnvioWhatsApp>(obtenerMetodoWhatsAppActual());

  const handleGuardar = () => {
    const cleanNum = waInput.replace(/[^0-9]/g, '');
    if (cleanNum.length < 10) {
      showToast('Número inválido. Usa formato internacional (ej: 573176827093)', 'error');
      return;
    }
    onSaveWaNumber(cleanNum);
    showToast('Número de WhatsApp global actualizado ✅', 'success');
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <MessageCircle size={18} style={{ color: '#25d366' }} /> WhatsApp de contacto principal
          </div>
          <div className="text-xs text-muted mt-1">
            Número predeterminado al que llegan las cotizaciones y reservas generadas por los clientes.
          </div>
        </div>
      </div>

      <div className="wa-config-row">
        <div className="field">
          <label>Número (formato internacional con código de país)</label>
          <input
            type="tel"
            placeholder="573176827093"
            value={waInput}
            onChange={e => setWaInput(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleGuardar} style={{ alignSelf: 'end' }}>
          <Save size={14} /> Guardar número
        </button>
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: 'var(--text-xs)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <Check size={14} /> Número activo actual: +{currentWaNumber}
      </div>

      {/* Selector de Método de Apertura: Desktop PC vs Web */}
      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
          Canal predeterminado de envío al escribir a clientes:
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${metodo === 'desktop' ? 'btn-primary' : ''}`}
            style={{
              fontSize: '0.75rem',
              ...(metodo === 'desktop' ? { backgroundColor: '#16a34a', borderColor: '#16a34a' } : {}),
            }}
            onClick={() => {
              setMetodo('desktop');
              setMetodoWhatsAppActual('desktop');
              showToast('Canal configurado: WhatsApp Desktop (App de PC) 💻', 'success');
            }}
          >
            💻 WhatsApp Desktop (App de PC)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${metodo === 'web' ? 'btn-primary' : ''}`}
            style={{
              fontSize: '0.75rem',
              ...(metodo === 'web' ? { backgroundColor: '#0284c7', borderColor: '#0284c7' } : {}),
            }}
            onClick={() => {
              setMetodo('web');
              setMetodoWhatsAppActual('web');
              showToast('Canal configurado: WhatsApp Web (Navegador) 🌐', 'info');
            }}
          >
            🌐 WhatsApp Web (Navegador)
          </button>
        </div>
        <p className="text-xs text-muted" style={{ marginTop: '0.45rem' }}>
          {metodo === 'desktop'
            ? '✓ Se abre directamente en tu app de WhatsApp para Windows sin cerrar ni salir de esta web (ideal para multitarea).'
            : '✓ Se abre en una pestaña nueva del navegador en WhatsApp Web.'}
        </p>
      </div>

      <p className="text-xs text-muted" style={{ marginTop: '0.75rem' }}>
        Nota: Cada finca puede tener opcionalmente su propio número de WhatsApp asignado en su formulario de edición.
      </p>
    </div>
  );
};
