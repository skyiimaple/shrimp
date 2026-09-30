import Bowser from 'bowser';

export interface UserAgentInfo {
  browser: string;
  system: string;
  device: string;
}

export function parseUserAgent(input: string): UserAgentInfo {
  if (!input.trim()) return { browser: '未知', system: '未知', device: '未知' };
  const parsed = Bowser.parse(input);
  const browser = parsed.browser.name
    ? `${parsed.browser.name}${parsed.browser.version ? ` ${parsed.browser.version}` : ''}`
    : '未知';
  const system = parsed.os.name
    ? `${parsed.os.name}${parsed.os.version ? ` ${parsed.os.version}` : ''}`
    : '未知';
  const device =
    parsed.platform.type === 'mobile'
      ? '手机'
      : parsed.platform.type === 'tablet'
        ? '平板'
        : parsed.platform.type === 'desktop'
          ? '桌面设备'
          : '未知';
  return { browser, system, device };
}
