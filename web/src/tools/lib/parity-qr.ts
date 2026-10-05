import qrcode from 'qrcode-generator';

export type WifiQrOptions = {
  ssid: string;
  password: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
};

function escapeWifiField(value: string): string {
  const reserved = new Set(['\\', ';', ',', ':', '"']);
  return Array.from(value, (character) =>
    reserved.has(character) ? `\\${character}` : character,
  ).join('');
}

export function buildWifiPayload({ ssid, password, security, hidden }: WifiQrOptions): string {
  if (!ssid.trim()) throw new Error('请输入 WiFi 名称（SSID）');
  const passwordField = security === 'nopass' ? '' : `P:${escapeWifiField(password)};`;
  return `WIFI:T:${security};S:${escapeWifiField(ssid)};${passwordField}H:${hidden};;`;
}

export function generateQrSvg(content: string): string {
  if (!content.trim()) throw new Error('请输入二维码内容');
  try {
    const qr = qrcode(0, 'M');
    const bytes = new TextEncoder().encode(content);
    qr.addData(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''), 'Byte');
    qr.make();
    return qr.createSvgTag({ cellSize: 6, margin: 24 });
  } catch {
    throw new Error('内容过长，无法生成二维码');
  }
}
