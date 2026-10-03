import React, { useState, useEffect, useRef } from 'react';

export interface CurrencyInputProps {
  value: number | undefined | null;
  onChange: (value: number) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  allowDecimals?: boolean;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  name?: string;
  required?: boolean;
  autoFocus?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
}

/**
 * Formatea un número agregando separadores de miles (.) y decimales (,).
 */
export function formatCurrencyValue(val: number | null | undefined, allowDecimals = false): string {
  if (val === undefined || val === null || isNaN(val)) return '';
  if (val === 0) return '0';

  if (allowDecimals) {
    const parts = val.toString().split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (parts.length > 1) {
      return intPart + ',' + parts[1].slice(0, 2);
    }
    return intPart;
  }

  // Pesos COP típicamente no usan centavos
  const intVal = Math.round(val);
  return intVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parsea un texto con separadores a un valor numérico real.
 */
export function parseCurrencyValue(str: string, allowDecimals = false): number {
  if (!str) return 0;

  if (allowDecimals) {
    const cleaned = str.replace(/[^\d,\.]/g, '');
    const hasComma = cleaned.includes(',');
    let intStr = cleaned;
    let decStr = '';
    if (hasComma) {
      const split = cleaned.split(',');
      intStr = split[0].replace(/\D/g, '');
      decStr = split[1] ? split[1].replace(/\D/g, '').slice(0, 2) : '';
    } else {
      intStr = cleaned.replace(/\D/g, '');
    }
    const num = parseFloat((intStr || '0') + (decStr ? '.' + decStr : ''));
    return isNaN(num) ? 0 : num;
  }

  const digits = str.replace(/\D/g, '');
  const num = parseInt(digits, 10);
  return isNaN(num) ? 0 : num;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = '0',
  prefix = '$',
  suffix = 'COP',
  allowDecimals = false,
  min = 0,
  max,
  disabled = false,
  className = '',
  style,
  id,
  name,
  required,
  autoFocus,
  onBlur,
  onFocus,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    return value !== undefined && value !== null && value !== 0
      ? formatCurrencyValue(value, allowDecimals)
      : (value === 0 ? '0' : '');
  });

  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar cuando el valor externo cambia y no estamos editando activamente
  useEffect(() => {
    if (!isFocused) {
      if (value === undefined || value === null) {
        setDisplayValue('');
      } else if (value === 0) {
        setDisplayValue('0');
      } else {
        setDisplayValue(formatCurrencyValue(value, allowDecimals));
      }
    }
  }, [value, isFocused, allowDecimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawText = e.target.value;
    const inputEl = inputRef.current;
    const prevCursorPos = inputEl?.selectionStart ?? rawText.length;

    // Calcular cuántos dígitos numéricos había antes del cursor
    const textBeforeCursor = rawText.slice(0, prevCursorPos);
    const digitsBeforeCursor = textBeforeCursor.replace(/\D/g, '').length;

    // Si el usuario vació todo el campo
    if (!rawText.trim() || rawText.replace(/\D/g, '') === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    // Parsear nuevo valor numérico
    let num = parseCurrencyValue(rawText, allowDecimals);

    if (min !== undefined && num < min) {
      // Permitir continuar escribiendo sin truncar a la fuerza
    }
    if (max !== undefined && num > max) {
      num = max;
    }

    const formatted = formatCurrencyValue(num, allowDecimals);
    setDisplayValue(formatted);
    onChange(num);

    // Reposicionar el cursor suavemente después de reformatear
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      let count = 0;
      let newPos = formatted.length;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          count++;
        }
        if (count === digitsBeforeCursor) {
          newPos = i + 1;
          break;
        }
      }
      inputRef.current.setSelectionRange(newPos, newPos);
    });
  };

  const handleFocusInternal = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Si el valor es '0', seleccionar todo para facilitar reemplazo inmediato al teclear
    if (displayValue === '0') {
      requestAnimationFrame(() => {
        inputRef.current?.select();
      });
    }
    onFocus?.();
  };

  const handleBlurInternal = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (!displayValue || displayValue.trim() === '') {
      setDisplayValue(value ? formatCurrencyValue(value, allowDecimals) : '0');
    } else {
      const num = parseCurrencyValue(displayValue, allowDecimals);
      setDisplayValue(formatCurrencyValue(num, allowDecimals));
    }
    onBlur?.();
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '100%',
        ...style,
      }}
    >
      {prefix && (
        <span
          style={{
            position: 'absolute',
            left: '0.85rem',
            color: 'var(--text-muted)',
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            pointerEvents: 'none',
            zIndex: 1,
            userSelect: 'none',
          }}
        >
          {prefix}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode={allowDecimals ? 'decimal' : 'numeric'}
        id={id}
        name={name}
        required={required}
        autoFocus={autoFocus}
        disabled={disabled}
        value={displayValue}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={handleFocusInternal}
        onBlur={handleBlurInternal}
        className={className}
        style={{
          width: '100%',
          paddingLeft: prefix ? '1.85rem' : '0.95rem',
          paddingRight: suffix ? '3.5rem' : '0.95rem',
          fontWeight: 600,
        }}
      />
      {suffix && (
        <span
          style={{
            position: 'absolute',
            right: '0.85rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            pointerEvents: 'none',
            zIndex: 1,
            letterSpacing: '0.04em',
            userSelect: 'none',
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  );
};
