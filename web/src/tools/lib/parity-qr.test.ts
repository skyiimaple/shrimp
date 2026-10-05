import { describe, expect, it } from 'vitest';
import { buildWifiPayload, generateQrSvg } from './parity-qr';

describe('QR generators', () => {
  it('generates a standalone SVG for nonempty text without exposing text as markup', () => {
    const svg = generateQrSvg('<script>alert(1)</script>');
    expect(svg).toMatch(/^<svg\b/);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).not.toContain('<script>');
    expect(generateQrSvg('different')).not.toBe(svg);
  });

  it('rejects empty QR content', () => {
    expect(() => generateQrSvg('  ')).toThrow('请输入');
  });

  it('escapes every ZXing WiFi reserved character in SSID and password', () => {
    expect(
      buildWifiPayload({ ssid: 'A\\;, :"B', password: 'p\\;, :"q', security: 'WPA', hidden: true }),
    ).toBe('WIFI:T:WPA;S:A\\\\\\;\\, \\:\\"B;P:p\\\\\\;\\, \\:\\"q;H:true;;');
  });

  it('supports open networks and omits the password field', () => {
    expect(
      buildWifiPayload({ ssid: 'Guest', password: 'ignored', security: 'nopass', hidden: false }),
    ).toBe('WIFI:T:nopass;S:Guest;H:false;;');
  });

  it('requires an SSID', () => {
    expect(() =>
      buildWifiPayload({ ssid: '', password: '', security: 'WPA', hidden: false }),
    ).toThrow('SSID');
  });
});
