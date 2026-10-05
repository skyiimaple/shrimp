import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BenchmarkTool,
  EtaTool,
  MathExpressionTool,
  StopwatchTool,
} from './parity-math-tool-panels';

afterEach(() => vi.useRealTimers());

describe('math parity panels', () => {
  it('shows a calculated expression and an error for unsafe input', async () => {
    const user = userEvent.setup();
    render(<MathExpressionTool />);
    fireEvent.change(screen.getByLabelText('数学表达式'), { target: { value: 'sqrt(9)+2^3' } });
    await user.click(screen.getByRole('button', { name: '计算表达式' }));
    expect(screen.getByLabelText('计算结果')).toHaveValue('11');
    fireEvent.change(screen.getByLabelText('数学表达式'), { target: { value: 'window.alert(1)' } });
    await user.click(screen.getByRole('button', { name: '计算表达式' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText('计算结果')).toHaveValue('');
  });

  it('calculates ETA from distance and speed', async () => {
    const user = userEvent.setup();
    render(<EtaTool />);
    fireEvent.change(screen.getByLabelText('距离（公里）'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('速度（公里/小时）'), { target: { value: '60' } });
    await user.click(screen.getByRole('button', { name: '计算耗时' }));
    expect(screen.getByLabelText('预计耗时')).toHaveValue('2 小时');
  });

  it('starts, pauses, resumes and resets the stopwatch', () => {
    vi.useFakeTimers();
    render(<StopwatchTool />);
    fireEvent.click(screen.getByRole('button', { name: '开始' }));
    act(() => vi.advanceTimersByTime(1230));
    expect(screen.getByText('00:01.23')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '暂停' }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('00:01.23')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '继续' }));
    act(() => vi.advanceTimersByTime(770));
    expect(screen.getByText('00:02.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重置' }));
    expect(screen.getByText('00:00.00')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the running interval when unmounted', () => {
    vi.useFakeTimers();
    const view = render(<StopwatchTool />);
    fireEvent.click(screen.getByRole('button', { name: '开始' }));
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('runs only a labeled fixed benchmark scenario', async () => {
    const user = userEvent.setup();
    render(<BenchmarkTool />);
    expect(screen.getByText(/固定基准场景/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '运行基准测试' }));
    expect((screen.getByLabelText('基准测试结果') as HTMLTextAreaElement).value).toMatch(/毫秒/);
  });
});
