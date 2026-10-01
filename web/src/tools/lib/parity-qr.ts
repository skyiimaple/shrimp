export type WifiQrOptions = {
  ssid: string;
  password: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
};

export function buildWifiPayload(_options: WifiQrOptions): string {
  throw new Error('Not implemented');
}

export function generateQrSvg(_content: string): string {
  throw new Error('Not implemented');
}
