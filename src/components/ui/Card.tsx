import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  key?: any;
}

export const Card = ({ children, className }: CardProps) => (
  <div className={cn('bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden', className)}>
    {children}
  </div>
);

export const CardHeader = ({ children, className }: CardProps) => (
  <div className={cn('p-4 border-bottom border-zinc-50', className)}>
    {children}
  </div>
);

export const CardContent = ({ children, className }: CardProps) => (
  <div className={cn('p-4', className)}>
    {children}
  </div>
);

export const CardFooter = ({ children, className }: CardProps) => (
  <div className={cn('p-4 bg-zinc-50/50 border-t border-zinc-50', className)}>
    {children}
  </div>
);
