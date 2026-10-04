import React, { useState, useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';

export interface NumericInputProps {
  value: number | undefined | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  suffix?: string;
  prefix?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  name?: string;
  required?: boolean;
  showSteppers?: boolean;
}

/**
 * Componente de entrada numérica pensado para máxima fluidez de edición:
 * Permite borrar completamente el texto con Backspace/Supr sin forzar ceros inmediatos,
 * y valida/normaliza limpiamente en blur o al presionar los controles de incremento/decremento.
 */
export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  placeholder = '0',
  suffix,
  prefix,
  disabled = false,
  className = '',
  style,
  id,
  name,
  required,
  showSteppers = true,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    return value !== undefined && value !== null ? String(value) : '';
  });
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar desde fuera cuando el valor cambia y no estamos escribiendo activamente
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value !== undefined && value !== null ? String(value) : '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Permitir borrar completamente el campo (string vacío)
    if (raw === '') {
      setDisplayValue('');
      onChange(min);
      return;
    }

    // Permitir solo dígitos numéricos
    const cleaned = raw.replace(/\D/g, '');
    setDisplayValue(cleaned);

    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed)) {
      let clamped = parsed;
      if (max !== undefined && clamped > max) clamped = max;
      onChange(clamped);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (displayValue === '' || isNaN(parseInt(displayValue, 10))) {
      const fallback = min !== undefined ? min : 0;
      setDisplayValue(String(fallback));
      onChange(fallback);
    } else {
      let parsed = parseInt(displayValue, 10);
      if (min !== undefined && parsed < min) parsed = min;
      if (max !== undefined && parsed > max) parsed = max;
      setDisplayValue(String(parsed));
      onChange(parsed);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Si es 0 o min, seleccionar el texto para facilitar reemplazarlo inmediatamente
    if (displayValue === '0' || displayValue === String(min)) {
      requestAnimationFrame(() => {
        inputRef.current?.select();
      });
    }
  };

  const handleIncrement = () => {
    if (disabled) return;
    const current = parseInt(displayValue, 10) || min || 0;
    const next = max !== undefined ? Math.min(max, current + step) : current + step;
    setDisplayValue(String(next));
    onChange(next);
  };

  const handleDecrement = () => {
    if (disabled) return;
    const current = parseInt(displayValue, 10) || min || 0;
    const next = min !== undefined ? Math.max(min, current - step) : current - step;
    setDisplayValue(String(next));
    onChange(next);
  };

  return (
    <div
      className={`numeric-input-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--surface-sunken, var(--surface-2))',
        border: '1px solid var(--border)',
        borderRadius: 'var(--rad-xs, 8px)',
        overflow: 'hidden',
        width: '100%',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: isFocused ? '0 0 0 2px color-mix(in srgb, var(--primary) 25%, transparent)' : 'none',
        borderColor: isFocused ? 'var(--primary)' : 'var(--border)',
        ...style,
      }}
    >
      {prefix && (
        <span
          style={{
            paddingLeft: '0.75rem',
            color: 'var(--text-muted)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            userSelect: 'none',
          }}
        >
          {prefix}
        </span>
      )}

      {showSteppers && (
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || (min !== undefined && (parseInt(displayValue, 10) || 0) <= min)}
          onClick={handleDecrement}
          style={{
            border: 'none',
            background: 'transparent',
            padding: '0.5rem 0.65rem',
            color: 'var(--text-muted)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
            opacity: disabled ? 0.4 : 1,
          }}
          title="Disminuir"
          onMouseEnter={e => { (e.currentTarget.style.background = 'var(--surface-3)'); }}
          onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); }}
        >
          <Minus size={13} />
        </button>
      )}

      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        value={displayValue}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{
          border: 'none',
          background: 'transparent',
          outline: 'none',
          textAlign: showSteppers ? 'center' : 'left',
          width: '100%',
          padding: showSteppers ? '0.55rem 0.2rem' : '0.55rem 0.85rem',
          fontWeight: 600,
          color: 'var(--text)',
          fontSize: 'var(--text-base)',
          minWidth: 0,
        }}
      />

      {suffix && (
        <span
          style={{
            paddingRight: showSteppers ? '0.35rem' : '0.75rem',
            color: 'var(--text-muted)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {suffix}
        </span>
      )}

      {showSteppers && (
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || (max !== undefined && (parseInt(displayValue, 10) || 0) >= max)}
          onClick={handleIncrement}
          style={{
            border: 'none',
            background: 'transparent',
            padding: '0.5rem 0.65rem',
            color: 'var(--text-muted)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
            opacity: disabled ? 0.4 : 1,
          }}
          title="Aumentar"
          onMouseEnter={e => { (e.currentTarget.style.background = 'var(--surface-3)'); }}
          onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); }}
        >
          <Plus size={13} />
        </button>
      )}
    </div>
  );
};
