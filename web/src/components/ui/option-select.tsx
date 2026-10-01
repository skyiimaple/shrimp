import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

export interface SelectOption {
  value: string;
  label: string;
}

export function OptionSelect({
  value,
  onValueChange,
  options,
  className,
  disabled,
  'aria-label': ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
  'aria-label': string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
