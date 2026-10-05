import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DnsLookupTool, IpLookupTool } from './network-lookup-tool-panels';

afterEach(() => vi.unstubAllGlobals());
describe('network lookup cards', () => {
  it('does not request on open and displays IP details after clicking', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ip: '8.8.8.8',
          type: 'IPv4',
          country: 'United States',
          city: 'Mountain View',
          asn: 'AS15169',
          isp: 'Google LLC',
          timezone: 'America/Los_Angeles',
        }),
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    render(<IpLookupTool />);
    expect(fetcher).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('IP 地址'), { target: { value: '8.8.8.8' } });
    await userEvent.setup().click(screen.getByRole('button', { name: '查询 IP' }));
    expect(await screen.findByText('Google LLC')).toBeInTheDocument();
    expect(screen.getByText('AS15169')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('IP 地址'), { target: { value: '1.1.1.1' } });
    expect(screen.queryByText('Google LLC')).not.toBeInTheDocument();
  });

  it('shows DNS record values and TTL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            name: 'example.com',
            status: 0,
            records: [{ name: 'example.com', type: 'A', ttl: 300, value: '93.184.216.34' }],
          }),
        ),
      ),
    );
    render(<DnsLookupTool />);
    fireEvent.change(screen.getByLabelText('域名'), { target: { value: 'example.com' } });
    await userEvent.setup().click(screen.getByRole('button', { name: '查询 DNS' }));
    expect(await screen.findByText('93.184.216.34')).toBeInTheDocument();
    expect(screen.getByText('300 秒')).toBeInTheDocument();
  });
});
