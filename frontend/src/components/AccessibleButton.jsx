import React from 'react';

/**
 * Accessible Button Component
 * WCAG 2.1 AA compliant button with proper ARIA attributes
 * Requirements: 4.3
 */
const AccessibleButton = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  className = '',
  type = 'button',
  ...props
}) => {
  const baseClasses = 'font-medium rounded transition focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-300',
  };

  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default AccessibleButton;
