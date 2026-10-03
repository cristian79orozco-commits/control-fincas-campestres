import React, { useRef } from 'react';
import { Minus, Plus } from 'lucide-react';

export interface NumericStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  size?: 'sm' | 'md';
}

export const NumericStepper: React.FC<NumericStepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  label,
  disabled = false,
  style,
  size = 'md',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDecrement = () => {
    if (disabled) return;
    const newVal = Math.max(min, (value || min) - step);
    onChange(newVal);
  };

  const handleIncrement = () => {
    if (disabled) return;
    const newVal = Math.min(max, (value || min) + step);
    onChange(newVal);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      onChange(min);
      return;
    }
    const val = parseInt(raw, 10);
    if (isNaN(val)) return;
    onChange(Math.min(max, Math.max(min, val)));
  };

  const btnSize = size === 'sm' ? '28px' : '36px';
  const iconSize = size === 'sm' ? 13 : 16;
  const inputWidth = size === 'sm' ? '50px' : '65px';
  const inputHeight = size === 'sm' ? '28px' : '36px';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        ...style,
      }}
    >
      {label && (
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginRight: '0.35rem' }}>
          {label}
        </span>
      )}
      <button
        type="button"
        disabled={disabled || (min !== undefined && value <= min)}
        onClick={handleDecrement}
        aria-label="Disminuir"
        style={{
          width: btnSize,
          height: btnSize,
          borderRadius: 'var(--rad-xs, 6px)',
          border: '1px solid var(--border)',
          background: 'var(--surface-sunken, var(--bg))',
          color: 'var(--text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled || value <= min ? 'not-allowed' : 'pointer',
          opacity: disabled || value <= min ? 0.45 : 1,
          transition: 'all 0.15s ease',
        }}
      >
        <Minus size={iconSize} />
      </button>

      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={value ?? min}
        onChange={handleChange}
        disabled={disabled}
        onFocus={() => inputRef.current?.select()}
        style={{
          width: inputWidth,
          height: inputHeight,
          minHeight: inputHeight,
          textAlign: 'center',
          fontWeight: 700,
          fontSize: size === 'sm' ? '0.85rem' : '0.95rem',
          padding: '0 0.25rem',
          borderRadius: 'var(--rad-xs, 6px)',
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--text)',
        }}
      />

      <button
        type="button"
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={handleIncrement}
        aria-label="Aumentar"
        style={{
          width: btnSize,
          height: btnSize,
          borderRadius: 'var(--rad-xs, 6px)',
          border: '1px solid var(--border)',
          background: 'var(--surface-sunken, var(--bg))',
          color: 'var(--text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled || value >= max ? 'not-allowed' : 'pointer',
          opacity: disabled || value >= max ? 0.45 : 1,
          transition: 'all 0.15s ease',
        }}
      >
        <Plus size={iconSize} />
      </button>
    </div>
  );
};
