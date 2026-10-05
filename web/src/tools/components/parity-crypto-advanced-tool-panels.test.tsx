import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BcryptTool, Bip39MnemonicTool } from './parity-crypto-advanced-tool-panels';

describe('Bcrypt card', () => {
  it('hashes and verifies a password locally', async () => {
    const user = userEvent.setup();
    render(<BcryptTool />);
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret' } });
    fireEvent.change(screen.getByLabelText('成本'), { target: { value: '4' } });
    await user.click(screen.getByRole('button', { name: '生成哈希' }));
    await waitFor(() =>
      expect((screen.getByLabelText('Bcrypt 哈希') as HTMLTextAreaElement).value).toMatch(/^\$2/),
    );
    const hash = (screen.getByLabelText('Bcrypt 哈希') as HTMLTextAreaElement).value;
    fireEvent.change(screen.getByLabelText('待验证哈希'), { target: { value: hash } });
    await user.click(screen.getByRole('button', { name: '验证密码' }));
    await waitFor(() => expect(screen.getByText('密码匹配')).toBeInTheDocument());
  });
});

describe('BIP39 card', () => {
  it('generates a phrase, validates it, and derives a seed', async () => {
    const user = userEvent.setup();
    render(<Bip39MnemonicTool />);
    await user.click(screen.getByRole('button', { name: '生成 12 词助记词' }));
    const phrase = (screen.getByLabelText('助记词') as HTMLTextAreaElement).value;
    expect(phrase.split(' ')).toHaveLength(12);
    await user.click(screen.getByRole('button', { name: '验证助记词' }));
    expect(screen.getByText('助记词有效')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '派生种子' }));
    await waitFor(() =>
      expect((screen.getByLabelText('种子（十六进制）') as HTMLTextAreaElement).value).toMatch(
        /^[0-9a-f]{128}$/,
      ),
    );
    fireEvent.change(screen.getByLabelText('助记词'), { target: { value: 'invalid phrase' } });
    expect(screen.getByLabelText('种子（十六进制）')).toHaveValue('');
  });
});
