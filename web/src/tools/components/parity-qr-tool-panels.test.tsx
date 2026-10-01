import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { QrCodeTool, WifiQrCodeTool } from './parity-qr-tool-panels';

describe('QR tool panels', () => {
  it('creates a copyable and downloadable SVG and clears it when text changes', async () => {
    const user = userEvent.setup();
    render(<QrCodeTool />);
    fireEvent.change(screen.getByLabelText('二维码内容'), { target: { value: 'https://example.com' } });
    await user.click(screen.getByRole('button', { name: '生成二维码' }));
    expect(screen.getByLabelText('SVG 源码')).toHaveValue(expect.stringMatching(/^<svg\b/));
    expect(screen.getByRole('button', { name: '复制结果' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '下载 SVG' })).toHaveAttribute('download', 'qr-code.svg');
    fireEvent.change(screen.getByLabelText('二维码内容'), { target: { value: 'changed' } });
    expect(screen.getByLabelText('SVG 源码')).toHaveValue('');
    expect(screen.queryByRole('link', { name: '下载 SVG' })).not.toBeInTheDocument();
  });

  it('creates a WiFi QR and clears private output after a credential change', async () => {
    const user = userEvent.setup();
    render(<WifiQrCodeTool />);
    fireEvent.change(screen.getByLabelText('WiFi 名称（SSID）'), { target: { value: 'Cafe;Net' } });
    fireEvent.change(screen.getByLabelText('WiFi 密码'), { target: { value: 'secret' } });
    await user.click(screen.getByRole('button', { name: '生成 WiFi 二维码' }));
    expect(screen.getByLabelText('WiFi 内容')).toHaveValue('WIFI:T:WPA;S:Cafe\\;Net;P:secret;H:false;;');
    expect(screen.getByLabelText('SVG 源码')).toHaveValue(expect.stringMatching(/^<svg\b/));
    expect(screen.getByRole('link', { name: '下载 SVG' })).toHaveAttribute('download', 'wifi-qr-code.svg');
    fireEvent.change(screen.getByLabelText('WiFi 密码'), { target: { value: 'new secret' } });
    expect(screen.getByLabelText('WiFi 内容')).toHaveValue('');
    expect(screen.getByLabelText('SVG 源码')).toHaveValue('');
  });
});
