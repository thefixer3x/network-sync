'use client';

import React from 'react';

export interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function CodeEditor({ value, onChange, className, ariaLabel }: CodeEditorProps) {
  return (
    <textarea
      className={className}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label={ariaLabel ?? 'Code editor'}
      placeholder="Write code..."
    />
  );
}
