import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="toast-container">
      {toasts.map(t => {
        const Icon = t.type === 'success' ? CheckCircle : t.type === 'error' ? AlertCircle : Info;
        return (
          <div key={t.id} className={`toast ${t.type}`}>
            <Icon size={18} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{t.text}</span>
            <button
              onClick={() => onDismiss(t.id)}
              style={{ cursor: 'pointer', opacity: 0.6, padding: '2px', display: 'grid' }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
