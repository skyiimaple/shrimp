import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '../lib/utils';
export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
export function SecondaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      className={cn(
        'border-border bg-card text-foreground hover:bg-muted border shadow-none',
        className,
      )}
      {...props}
    />
  );
}
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'border-border bg-background placeholder:text-muted-foreground focus:border-primary focus:ring-ring/30 min-h-11 w-full rounded-xl border px-3 text-sm transition outline-none focus:ring-2',
        className,
      )}
      {...props}
    />
  );
}
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'border-border bg-background placeholder:text-muted-foreground focus:border-primary focus:ring-ring/30 min-h-36 w-full resize-y rounded-xl border p-3 font-mono text-sm leading-6 transition outline-none focus:ring-2',
        className,
      )}
      {...props}
    />
  );
}
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'border-border bg-background focus:border-primary focus:ring-ring/30 min-h-11 rounded-xl border px-3 text-sm outline-none focus:ring-2',
        className,
      )}
      {...props}
    />
  );
}
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-border bg-card rounded-2xl border p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,.45)]',
        className,
      )}
      {...props}
    />
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
      {hint && <span className="text-muted-foreground text-xs font-normal">{hint}</span>}
    </label>
  );
}
export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
    >
      {children}
    </div>
  );
}
