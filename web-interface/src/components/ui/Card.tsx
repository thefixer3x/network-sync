'use client';

import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-ln border border-[color:var(--border-default)] bg-ln-surface shadow-ln',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
