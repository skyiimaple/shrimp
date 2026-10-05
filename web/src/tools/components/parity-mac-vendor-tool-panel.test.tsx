import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MacVendorTool } from './parity-mac-vendor-tool-panel';
afterEach(() => vi.unstubAllGlobals());

describe('MAC 厂商卡片', () => {
  it('shows a shard load error and allows a successful retry', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response('{"001A00":"Recovered vendor"}'));
    vi.stubGlobal('fetch', fetcher);
    render(<MacVendorTool />);
    fireEvent.change(screen.getByLabelText('MAC 地址'), { target: { value: '00:1A:00:12:34:56' } });
    fireEvent.click(screen.getByRole('button', { name: '查询厂商' }));
    expect(await screen.findByText(/本地 OUI 数据加载失败/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查询厂商' }));
    await waitFor(() =>
      expect((screen.getByLabelText('厂商信息') as HTMLTextAreaElement).value).toBe(
        'Recovered vendor',
      ),
    );
  });
  it('在浏览器本地显示厂商', async () => {
    const fetcher = vi.fn(async () => new Response('{"00000C":"Cisco Systems, Inc."}'));
    vi.stubGlobal('fetch', fetcher);
    const user = userEvent.setup();
    render(<MacVendorTool />);
    expect(fetcher).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('MAC 地址'), '00:00:0C:12:34:56');
    await user.click(screen.getByRole('button', { name: '查询厂商' }));
    await waitFor(() =>
      expect(
        (screen.getByLabelText('厂商信息') as HTMLTextAreaElement).value.toLowerCase(),
      ).toContain('cisco'),
    );
  });
  it('discards an obsolete pending result when the input changes', async () => {
    let complete: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve;
        }),
    );
    render(<MacVendorTool />);
    fireEvent.change(screen.getByLabelText('MAC 地址'), { target: { value: '00:1D:00:12:34:56' } });
    fireEvent.click(screen.getByRole('button', { name: '查询厂商' }));
    await waitFor(() => expect(complete).toBeDefined());
    fireEvent.change(screen.getByLabelText('MAC 地址'), { target: { value: '00:00:0C:12:34:56' } });
    await act(async () => {
      complete!(new Response('{"001D00":"Obsolete vendor"}'));
    });
    await waitFor(() =>
      expect((screen.getByLabelText('厂商信息') as HTMLTextAreaElement).value).toBe(''),
    );
  });
});
