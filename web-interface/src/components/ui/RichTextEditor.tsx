'use client';

import React from 'react';

export interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function RichTextEditor({ value, onChange, className, ariaLabel }: RichTextEditorProps) {
  return (
    <textarea
      className={className}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label={ariaLabel ?? 'Rich text editor'}
      placeholder="Write rich text..."
    />
  );
}
