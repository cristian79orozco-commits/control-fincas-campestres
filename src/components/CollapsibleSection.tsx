import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  badge?: string | number;
  children: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
  headerStyle?: React.CSSProperties;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  defaultOpen = true,
  badge,
  children,
  icon,
  subtitle,
  className = '',
  headerStyle,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`collapsible-section ${className}`}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--rad-xs, 8px)',
        overflow: 'hidden',
        background: 'var(--surface)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.1rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--text)',
          userSelect: 'none',
          gap: '0.75rem',
          ...headerStyle,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flex: 1, minWidth: 0 }}>
          {icon && (
            <span style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              {icon}
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: '0.92rem', letterSpacing: '-0.01em' }}>
                {title}
              </span>
              {badge !== undefined && badge !== null && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.12rem 0.5rem',
                    borderRadius: 'var(--rad-full, 999px)',
                    background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                    color: 'var(--primary)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            color: 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <ChevronDown size={17} />
        </div>
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div
            style={{
              padding: '0 1.1rem 1.1rem 1.1rem',
              borderTop: isOpen ? '1px solid var(--border)' : '1px solid transparent',
              transition: 'border-color 0.2s ease',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
