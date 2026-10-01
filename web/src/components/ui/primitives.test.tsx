import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Alert } from './alert';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { OptionSelect } from './option-select';

describe('shadcn primitives adapted to Shrimp', () => {
  it('keeps the established large rounded primary button and supports secondary variant', () => {
    render(
      <>
        <Button>执行</Button>
        <Button variant="secondary">取消</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: '执行' }).className).toContain('min-h-10');
    expect(screen.getByRole('button', { name: '执行' }).className).toContain('rounded-xl');
    expect(screen.getByRole('button', { name: '取消' }).className).toContain('bg-card');
  });

  it('exposes checked changes through the shadcn checkbox', async () => {
    const change = vi.fn();
    render(<Checkbox aria-label="去重" checked={false} onCheckedChange={change} />);
    await userEvent.setup().click(screen.getByRole('checkbox', { name: '去重' }));
    expect(change).toHaveBeenCalledWith(true);
  });

  it('announces errors with the shadcn alert role', () => {
    render(<Alert variant="destructive">输入有误</Alert>);
    expect(screen.getByRole('alert')).toHaveTextContent('输入有误');
  });

  it('selects a value through the shadcn popup', async () => {
    const change = vi.fn();
    render(
      <OptionSelect
        aria-label="排序"
        value="none"
        onValueChange={change}
        options={[
          { value: 'none', label: '保持顺序' },
          { value: 'asc', label: '升序' },
        ]}
      />,
    );
    await userEvent.setup().click(screen.getByRole('combobox', { name: '排序' }));
    await userEvent.setup().click(screen.getByRole('option', { name: '升序' }));
    expect(change).toHaveBeenCalledWith('asc');
  });
});
