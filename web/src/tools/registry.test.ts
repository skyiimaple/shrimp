import { describe, expect, it } from 'vitest';
import { groupToolsByCategory, searchTools, tools } from './registry';

describe('工具注册表', () => {
  it('slug 与路径唯一并保持对应', () => {
    expect(new Set(tools.map((tool) => tool.slug)).size).toBe(91);
    expect(new Set(tools.map((tool) => tool.path)).size).toBe(91);
    expect(tools.every((tool) => tool.path === `/tools/${tool.slug}`)).toBe(true);
  });
  it('按名称、关键词、分类和简介检索', () => {
    expect(searchTools('令牌').map((tool) => tool.slug)).toContain('jwt');
    expect(searchTools('编码转换').map((tool) => tool.slug)).toEqual(
      expect.arrayContaining(['base64', 'jwt']),
    );
    expect(searchTools('周报').map((tool) => tool.slug)).toContain('weekly-report');
    expect(searchTools('YAML').map((tool) => tool.slug)).toContain('yaml-json');
    expect(searchTools('查询参数').map((tool) => tool.slug)).toContain('url');
    expect(searchTools('去重').map((tool) => tool.slug)).toContain('list');
    expect(searchTools('十六进制').map((tool) => tool.slug)).toContain('radix');
    expect(searchTools('Markdown').map((tool) => tool.slug)).toContain('markdown');
    expect(searchTools('SQL').map((tool) => tool.slug)).toContain('sql');
    expect(searchTools('密码').map((tool) => tool.slug)).toContain('password');
    expect(searchTools('HEX').map((tool) => tool.slug)).toContain('color');
    expect(searchTools('User-Agent').map((tool) => tool.slug)).toContain('user-agent');
    expect(searchTools('Jev').map((tool) => tool.slug)).toContain('jev');
    expect(searchTools('JSON 差异').map((tool) => tool.slug)).toContain('json-diff');
    expect(searchTools('TSV').map((tool) => tool.slug)).toContain('csv-json');
    expect(searchTools('HTML 实体').map((tool) => tool.slug)).toContain('html-entities');
    expect(searchTools('文本差异').map((tool) => tool.slug)).toContain('text-diff');
    expect(searchTools('HMAC').map((tool) => tool.slug)).toContain('hmac');
    expect(searchTools('Basic Auth').map((tool) => tool.slug)).toContain('basic-auth');
    expect(searchTools('chmod').map((tool) => tool.slug)).toContain('chmod');
    expect(searchTools('罗马数字').map((tool) => tool.slug)).toContain('roman-numeral');
    expect(searchTools('文本统计').map((tool) => tool.slug)).toContain('text-stats');
    expect(searchTools('数字缩写').map((tool) => tool.slug)).toContain('numeronym');
    expect(searchTools('ULID').map((tool) => tool.slug)).toContain('ulid');
    expect(searchTools('随机端口').map((tool) => tool.slug)).toContain('random-port');
    expect(searchTools('二进制文本').map((tool) => tool.slug)).toContain('binary-text');
    expect(searchTools('Unicode').map((tool) => tool.slug)).toContain('unicode-text');
    expect(searchTools('Slug').map((tool) => tool.slug)).toContain('slugify');
    expect(searchTools('温度').map((tool) => tool.slug)).toContain('temperature');
    expect(searchTools('YAML TOML').map((tool) => tool.slug)).toContain('yaml-toml');
    expect(searchTools('YAML 格式化').map((tool) => tool.slug)).toContain('yaml-format');
    expect(searchTools('Open Graph').map((tool) => tool.slug)).toContain('og-meta');
    expect(searchTools('SVG 占位图').map((tool) => tool.slug)).toContain('svg-placeholder');
    expect(searchTools('百分比').map((tool) => tool.slug)).toContain('percentage');
    expect(searchTools('AES-GCM').map((tool) => tool.slug)).toContain('text-encryption');
    expect(searchTools('TOTP').map((tool) => tool.slug)).toContain('totp');
    expect(searchTools('RSA').map((tool) => tool.slug)).toContain('rsa-key-pair');
    expect(searchTools('XML 格式化').map((tool) => tool.slug)).toContain('xml-format');
    expect(searchTools('XML 转 JSON').map((tool) => tool.slug)).toContain('xml-to-json');
    expect(searchTools('JSON 转 XML').map((tool) => tool.slug)).toContain('json-to-xml');
    expect(searchTools('IPv4 子网').map((tool) => tool.slug)).toContain('ipv4-subnet');
    expect(searchTools('IPv4 地址').map((tool) => tool.slug)).toContain('ipv4-address');
    expect(searchTools('MAC 地址').map((tool) => tool.slug)).toContain('mac-address');
    expect(searchTools('MIME').map((tool) => tool.slug)).toContain('mime-types');
    expect(searchTools('HTTP 状态码').map((tool) => tool.slug)).toContain('http-status');
    expect(searchTools('设备信息').map((tool) => tool.slug)).toContain('device-info');
    expect(searchTools('Keycode').map((tool) => tool.slug)).toContain('keycode');
    expect(searchTools('Lorem Ipsum').map((tool) => tool.slug)).toContain('lorem-ipsum');
    expect(searchTools('文本脱敏').map((tool) => tool.slug)).toContain('text-mask');
    expect(searchTools('Email 标准化').map((tool) => tool.slug)).toContain('email-normalizer');
    expect(searchTools('正则速查').map((tool) => tool.slug)).toContain('regex-cheatsheet');
    expect(searchTools('IPv4 范围').map((tool) => tool.slug)).toContain('ipv4-range');
    expect(searchTools('IPv6 ULA').map((tool) => tool.slug)).toContain('ipv6-ula');
    expect(searchTools('Base64 文件').map((tool) => tool.slug)).toContain('base64-file');
    expect(searchTools('二维码').map((tool) => tool.slug)).toContain('qr-code');
    expect(searchTools('WiFi 二维码').map((tool) => tool.slug)).toContain('wifi-qr-code');
    expect(searchTools('数学表达式').map((tool) => tool.slug)).toContain('math-expression');
    expect(searchTools('ETA').map((tool) => tool.slug)).toContain('eta');
    expect(searchTools('秒表').map((tool) => tool.slug)).toContain('stopwatch');
    expect(searchTools('基准测试').map((tool) => tool.slug)).toContain('benchmark');
    expect(searchTools('NATO').map((tool) => tool.slug)).toContain('nato-alphabet');
    expect(searchTools('Outlook Safe Links').map((tool) => tool.slug)).toContain(
      'outlook-safe-link',
    );
    expect(searchTools('Git 命令').map((tool) => tool.slug)).toContain('git-commands');
    expect(searchTools('Emoji').map((tool) => tool.slug)).toContain('emoji-picker');
    expect(searchTools('IBAN').map((tool) => tool.slug)).toContain('iban');
    expect(searchTools('Bcrypt').map((tool) => tool.slug)).toContain('bcrypt');
    expect(searchTools('BIP39').map((tool) => tool.slug)).toContain('bip39-mnemonic');
    expect(searchTools('摄像头').map((tool) => tool.slug)).toContain('camera-recorder');
    expect(searchTools('Docker').map((tool) => tool.slug)).toContain('docker-compose');
    expect(searchTools('电话号码').map((tool) => tool.slug)).toContain('phone-number');
    expect(searchTools('HTML 编辑').map((tool) => tool.slug)).toContain('html-editor');
    expect(searchTools('令牌生成').map((tool) => tool.slug)).toContain('token-generator');
    expect(searchTools('密码强度').map((tool) => tool.slug)).toContain('password-strength');
    expect(searchTools('ASCII 字画').map((tool) => tool.slug)).toContain('ascii-text');
    expect(searchTools('MAC 厂商').map((tool) => tool.slug)).toContain('mac-vendor');
    expect(searchTools('PDF 签名').map((tool) => tool.slug)).toContain('pdf-signature');
    expect(searchTools('IP 查询').map((tool) => tool.slug)).toContain('ip-lookup');
    expect(searchTools('DNS 查询').map((tool) => tool.slug)).toContain('dns-lookup');
  });
  it('按注册顺序分组', () => {
    expect(groupToolsByCategory(tools).get('网络工具')?.[0].slug).toBe('http');
  });
});
