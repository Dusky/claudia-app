import React from 'react';
import styles from './StatusBar.module.css';

export interface IndicatorProps {
  icon?: string;
  label: string;
  value?: string | number;
  status?: 'normal' | 'warning' | 'error' | 'success' | 'disabled';
  tooltip?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  className?: string;
  'aria-label'?: string;
}

export const Indicator: React.FC<IndicatorProps> = ({
  icon,
  label,
  value,
  status = 'normal',
  tooltip,
  onClick,
  onDoubleClick,
  className = '',
  'aria-label': ariaLabel
}) => {
  const isClickable = Boolean(onClick);
  
  const combinedClassName = [
    styles.indicator,
    isClickable && styles.clickable,
    status !== 'normal' && styles[`status-${status}`],
    className
  ].filter(Boolean).join(' ');

  const displayValue = value !== undefined ? String(value) : '';
  const displayText = displayValue ? `${label}: ${displayValue}` : label;

  return (
    <div
      className={combinedClassName}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={tooltip || displayText}
      role={isClickable ? 'button' : 'status'}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={ariaLabel || displayText}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      <span className={styles.label}>{label}</span>
      {displayValue && <span className={styles.value}>{displayValue}</span>}
    </div>
  );
};