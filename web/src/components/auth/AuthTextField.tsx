'use client';

import { AlertCircle } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface AuthTextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  rightContent?: ReactNode;
}

export default function AuthTextField({
  label,
  error,
  hint,
  rightContent,
  className = '',
  ...props
}: AuthTextFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={props.id} className="text-xs font-medium text-gray-600">
          {label}
        </label>
        {rightContent}
      </div>
      <input
        {...props}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined
        }
        className={`h-10 w-full rounded-lg border px-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 ${
          error
            ? 'border-red-300 bg-red-50/70 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
            : 'border-gray-200 bg-gray-50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
        }`}
      />
      {error ? (
        <p
          id={`${props.id}-error`}
          className="flex items-start gap-1.5 text-[11px] font-semibold leading-5 text-red-600"
        >
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${props.id}-hint`} className="text-[11px] text-gray-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
