import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DeviceInformationTool,
  HttpStatusTool,
  KeycodeTool,
  MimeTypeTool,
} from './parity-web-reference-tool-panels';

describe('Web reference panels', () => {
  it('shows common MIME matches in both lookup directions', () => {
    render(<MimeTypeTool />);
    fireEvent.change(screen.getByLabelText('扩展名或 MIME 类型'), { target: { value: '.png' } });
    expect(screen.getByText('image/png')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('扩展名或 MIME 类型'), {
      target: { value: 'application/json' },
    });
    expect(screen.getByText('.json')).toBeInTheDocument();
    expect(screen.getByText(/仅收录常见类型/)).toBeInTheDocument();
  });

  it('shows HTTP code and description for a query', () => {
    render(<HttpStatusTool />);
    fireEvent.change(screen.getByLabelText('状态码或名称'), { target: { value: '404' } });
    expect(screen.getByText('Not Found')).toBeInTheDocument();
    expect(screen.getByText('请求的资源不存在。')).toBeInTheDocument();
  });

  it('shows device information available to the browser', () => {
    render(<DeviceInformationTool />);
    expect(screen.getByText('用户代理')).toBeInTheDocument();
    expect(screen.getByText(navigator.userAgent)).toBeInTheDocument();
    expect(screen.getByText('屏幕尺寸')).toBeInTheDocument();
  });

  it('shows the latest key event and removes its listener on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const view = render(<KeycodeTool />);
    fireEvent.keyDown(window, { key: 'A', code: 'KeyA', keyCode: 65, ctrlKey: true });
    expect(screen.getByText('KeyA')).toBeInTheDocument();
    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByText('Ctrl')).toBeInTheDocument();
    view.unmount();
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function));
    remove.mockRestore();
  });
});
