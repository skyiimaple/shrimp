import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Ipv4AddressTool, Ipv4SubnetTool, MacAddressTool } from './parity-network-tool-panels';

describe('network tool panels', () => {
  it('calculates a subnet and displays its key details', async () => {
    const user = userEvent.setup();
    render(<Ipv4SubnetTool />);
    fireEvent.change(screen.getByLabelText('IPv4 CIDR'), { target: { value: '192.168.1.130/26' } });
    await user.click(screen.getByRole('button', { name: '计算子网' }));
    const result = (screen.getByLabelText('子网计算结果') as HTMLTextAreaElement).value;
    expect(result).toContain('192.168.1.128');
    expect(result).toContain('192.168.1.191');
  });

  it('converts an IPv4 input and shows validation errors', async () => {
    const user = userEvent.setup();
    render(<Ipv4AddressTool />);
    fireEvent.change(screen.getByLabelText('IPv4 地址或整数'), { target: { value: '4294967295' } });
    await user.click(screen.getByRole('button', { name: '转换地址' }));
    expect((screen.getByLabelText('地址转换结果') as HTMLTextAreaElement).value).toContain('255.255.255.255');
    fireEvent.change(screen.getByLabelText('IPv4 地址或整数'), { target: { value: '4294967296' } });
    await user.click(screen.getByRole('button', { name: '转换地址' }));
    expect(screen.getByText(/无效/)).toBeInTheDocument();
  });

  it('generates a formatted MAC address', async () => {
    const user = userEvent.setup();
    render(<MacAddressTool />);
    await user.click(screen.getByRole('button', { name: '生成 MAC 地址' }));
    expect((screen.getByLabelText('MAC 地址') as HTMLTextAreaElement).value).toMatch(/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/);
  });
});
