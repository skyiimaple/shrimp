import { describe, expect, it } from 'vitest';
import { parseUserAgent } from './user-agent';

describe('User-Agent 解析', () => {
  it('识别常见浏览器、系统和设备', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    );
    expect(result.browser).toContain('Safari');
    expect(result.system).toContain('iOS');
    expect(result.device).toBe('手机');
  });
  it('未知或空 UA 明确标记未知', () => {
    expect(parseUserAgent('mystery-client/1.0')).toEqual({
      browser: '未知',
      system: '未知',
      device: '未知',
    });
    expect(parseUserAgent('')).toEqual({ browser: '未知', system: '未知', device: '未知' });
  });
});
