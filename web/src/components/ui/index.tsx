import type { ReactNode } from 'react';
import { Alert } from './alert';
import { Button, type ButtonProps } from './button';
import { Card } from './card';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { OptionSelect } from './option-select';

export { Button, Card, Input, OptionSelect, Textarea };

export function SecondaryButton({ className, ...props }: ButtonProps) {
  return <Button variant="outline" className={className} {...props} />;
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <Label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
      {hint && <span className="text-muted-foreground text-xs font-normal">{hint}</span>}
    </Label>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <Alert variant="destructive" className="rounded-xl">
      {children}
    </Alert>
  );
}
