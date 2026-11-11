import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

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
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notificaciones del sistema"
      aria-live="polite"
    >
      {toasts.map(t => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';

        const Icon = isSuccess ? CheckCircle2 : isError ? AlertTriangle : Info;
        const tagLabel = isSuccess ? 'Operación Exitosa' : isError ? 'Atención Requerida' : 'Notificación';

        return (
          <div
            key={t.id}
            className={`toast-pro toast-${t.type}`}
            role="status"
          >
            {/* Contenedor del Icono con Glow */}
            <div className={`toast-icon-wrap toast-icon-${t.type}`}>
              <Icon size={18} strokeWidth={2.2} />
            </div>

            {/* Contenido del Toast */}
            <div className="toast-body">
              <span className={`toast-badge-tag toast-tag-${t.type}`}>
                {tagLabel}
              </span>
              <p className="toast-text">{t.text}</p>
            </div>

            {/* Botón Cerrar Ergonómico */}
            <button
              type="button"
              className="toast-dismiss-btn"
              onClick={() => onDismiss(t.id)}
              aria-label="Cerrar notificación"
              title="Cerrar"
            >
              <X size={15} />
            </button>

            {/* Barra de Progreso Temporizada (4s) */}
            <div className={`toast-progress-bar toast-progress-${t.type}`} />
          </div>
        );
      })}
    </div>
  );
};
