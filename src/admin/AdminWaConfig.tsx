import React, { useState } from 'react';
import { MessageCircle, Save, Check } from 'lucide-react';

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

      <p className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>
        Nota: Cada finca puede tener opcionalmente su propio número de WhatsApp asignado en su formulario de edición.
      </p>
    </div>
  );
};
