import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { hapticTap } from '../lib/telegram';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export const Button = ({ className = '', variant = 'primary', onClick, children, ...props }: ButtonProps) => {
  const styles = {
    primary: 'bg-primary text-white shadow-soft',
    secondary: 'bg-white text-primary border border-blue-100',
    ghost: 'bg-blue-50 text-primary',
    danger: 'bg-red-50 text-red-600',
  };

  return (
    <button
      className={`min-h-11 rounded-2xl px-4 py-3 text-sm font-extrabold transition active:scale-[0.98] disabled:opacity-50 ${styles[variant]} ${className}`}
      onClick={(event) => {
        hapticTap();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </button>
  );
};

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-[22px] bg-white p-4 shadow-soft ${className}`}>{children}</section>
);

export const FieldLabel = ({ children }: { children: ReactNode }) => (
  <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">{children}</label>
);

export const Select = ({
  className = '',
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-primary ${className}`}
    {...props}
  />
);

export const Input = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-primary ${className}`}
    {...props}
  />
);

export const Pill = ({
  children,
  tone = 'blue',
}: {
  children: ReactNode;
  tone?: 'blue' | 'green' | 'gray' | 'red';
}) => {
  const tones = {
    blue: 'bg-blue-50 text-primary',
    green: 'bg-emerald-50 text-emerald-700',
    gray: 'bg-slate-100 text-slate-600',
    red: 'bg-red-50 text-red-600',
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${tones[tone]}`}>{children}</span>;
};

export const EmptyState = ({ title, text }: { title: string; text: string }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
    <p className="text-sm font-extrabold text-slate-800">{title}</p>
    <p className="mt-1 text-xs font-semibold text-slate-500">{text}</p>
  </div>
);

export const Spinner = () => (
  <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-primary" />
);
