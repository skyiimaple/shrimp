import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PhoneNumberTool } from './parity-phone-tool-panel';

describe('phone number tool', () => {
  it('formats a national number using the selected region', async () => {
    const user = userEvent.setup();
    render(<PhoneNumberTool />);
    await user.clear(screen.getByLabelText('地区代码'));
    await user.type(screen.getByLabelText('地区代码'), 'GB');
    await user.type(screen.getByLabelText('电话号码'), '020 7946 0018');
    await user.click(screen.getByRole('button', { name: '解析号码' }));
    expect(screen.getByLabelText('E.164')).toHaveValue('+442079460018');
    expect(screen.getByLabelText('国际格式')).toHaveValue('+44 20 7946 0018');
    expect(screen.getByLabelText('本地格式')).toHaveValue('020 7946 0018');
  });

  it('shows an error for an invalid number and clears stale results', async () => {
    const user = userEvent.setup();
    render(<PhoneNumberTool />);
    await user.type(screen.getByLabelText('电话号码'), '+1 202 555 0123');
    await user.click(screen.getByRole('button', { name: '解析号码' }));
    await user.clear(screen.getByLabelText('电话号码'));
    await user.type(screen.getByLabelText('电话号码'), '123');
    await user.click(screen.getByRole('button', { name: '解析号码' }));
    expect(screen.getByRole('alert')).toHaveTextContent('无效');
    expect(screen.getByLabelText('E.164')).toHaveValue('');
  });
});
