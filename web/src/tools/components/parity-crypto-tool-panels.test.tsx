import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EncryptTextTool, RsaKeyPairTool, TotpTool } from './parity-crypto-tool-panels';

describe('浏览器加密卡片', () => {
  it('加密后可用同一口令解密，修改输入清空旧结果', async () => {
    const user = userEvent.setup();
    render(<EncryptTextTool />);
    fireEvent.change(screen.getByLabelText('输入文本或密文'), { target: { value: 'hello' } });
    fireEvent.change(screen.getByLabelText('口令'), { target: { value: 'password' } });
    await user.click(screen.getByRole('button', { name: '加密文本' }));
    await waitFor(() =>
      expect((screen.getByLabelText('转换结果') as HTMLTextAreaElement).value).toMatch(
        /^shrimp:aes-gcm:v1:/,
      ),
    );
    fireEvent.change(screen.getByLabelText('输入文本或密文'), { target: { value: 'new' } });
    expect(screen.getByLabelText('转换结果')).toHaveValue('');
  });

  it('OTP 可生成密钥并计算验证码', async () => {
    const user = userEvent.setup();
    render(<TotpTool />);
    await user.click(screen.getByRole('button', { name: '生成密钥' }));
    expect((screen.getByLabelText('Base32 密钥') as HTMLInputElement).value).toMatch(
      /^[A-Z2-7]{32}$/,
    );
    await user.click(screen.getByRole('button', { name: '生成验证码' }));
    expect((screen.getByLabelText('验证码') as HTMLTextAreaElement).value).toMatch(/^\d{6}$/);
  });

  it('RSA 显示公钥和私钥 PEM', async () => {
    const user = userEvent.setup();
    render(<RsaKeyPairTool />);
    await user.click(screen.getByRole('button', { name: '生成 RSA 密钥对' }));
    await waitFor(() =>
      expect((screen.getByLabelText('公钥 PEM') as HTMLTextAreaElement).value).toContain(
        'BEGIN PUBLIC KEY',
      ),
    );
    expect((screen.getByLabelText('私钥 PEM') as HTMLTextAreaElement).value).toContain(
      'BEGIN PRIVATE KEY',
    );
  });
});
