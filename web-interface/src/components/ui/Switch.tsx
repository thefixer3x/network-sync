'use client';

import React from 'react';
import { clsx } from 'clsx';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function Switch({ checked, onChange, size = 'md', disabled = false }: SwitchProps) {
  const baseStyles = 'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
  
  const sizes = {
    sm: 'h-4 w-8',
    md: 'h-6 w-11',
  };

  const thumbSizes = {
    sm: 'h-3 w-3',
    md: 'h-5 w-5',
  };

  const translateX = {
    sm: checked ? 'translate-x-4' : 'translate-x-0',
    md: checked ? 'translate-x-5' : 'translate-x-0',
  };

  return (
    <button
      type="button"
      className={clsx(
        baseStyles,
        sizes[size],
        checked ? 'bg-blue-600' : 'bg-gray-200',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
    >
      <span
        className={clsx(
          'pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out',
          thumbSizes[size],
          translateX[size]
        )}
      />
    </button>
  );
}