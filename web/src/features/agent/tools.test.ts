import { describe, expect, it } from 'vitest';
import { agentToolSchemas, executeAgentTool } from './tools';

describe('Agent fixed local tools', () => {
  it('exposes the approved deterministic local functions', () => {
    expect(agentToolSchemas.map((tool) => tool.function.name)).toEqual([
      'json_transform',
      'base64_transform',
      'timestamp_convert',
      'uuid_generate',
      'regex_match',
      'url_transform',
      'html_entities',
      'text_stats',
      'text_case',
      'slugify',
      'jwt_decode',
      'color_convert',
      'radix_convert',
      'query_transform',
      'hash_text',
      'json_diff',
      'csv_json_transform',
      'structured_data_transform',
      'yaml_format',
      'roman_numeral',
      'numeronym',
      'binary_text_transform',
      'unicode_text_transform',
      'temperature_convert',
      'ipv4_subnet',
      'ipv4_address',
      'mac_address_generate',
      'mime_lookup',
      'http_status_lookup',
    ]);
  });

  it('formats JSON using the existing utility', async () => {
    const result = await executeAgentTool('json_transform', { mode: 'format', input: '{"a":1}' });
    expect(result).toEqual({ ok: true, content: '{\n  "a": 1\n}' });
  });

  it('encodes UTF-8 Base64', async () => {
    const result = await executeAgentTool('base64_transform', { mode: 'encode', input: '虾' });
    expect(result).toEqual({ ok: true, content: '6Jm+' });
  });

  it('converts a Unix timestamp', async () => {
    const result = await executeAgentTool('timestamp_convert', { input: '0', unit: 'seconds' });
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.content)).toMatchObject({
      iso: '1970-01-01T00:00:00.000Z',
      seconds: 0,
    });
  });

  it('generates a bounded number of UUIDs', async () => {
    const result = await executeAgentTool('uuid_generate', { count: 2 });
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.content)).toHaveLength(2);
    expect((await executeAgentTool('uuid_generate', { count: 101 })).ok).toBe(false);
  });

  it('runs the added pure text tools without network or file access', async () => {
    expect(await executeAgentTool('url_transform', { mode: 'encode', input: 'a b' })).toEqual({
      ok: true,
      content: 'a%20b',
    });
    expect(
      await executeAgentTool('html_entities', { mode: 'decode', input: '&lt;虾&gt;' }),
    ).toEqual({
      ok: true,
      content: '<虾>',
    });
    expect(await executeAgentTool('text_stats', { input: 'Hi 虾\n!' })).toEqual({
      ok: true,
      content: '{"characters":6,"words":2,"lines":2,"bytes":8}',
    });
    expect(await executeAgentTool('text_case', { mode: 'camel', input: 'hello world' })).toEqual({
      ok: true,
      content: 'helloWorld',
    });
    expect(await executeAgentTool('slugify', { input: 'Hello, World!' })).toEqual({
      ok: true,
      content: 'hello-world',
    });
  });

  it('runs JWT, color, radix, query and hash tools with explicit semantics', async () => {
    const jwt = await executeAgentTool('jwt_decode', {
      input: 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjMifQ.signature',
    });
    expect(JSON.parse(jwt.content)).toEqual({ header: { alg: 'none' }, payload: { sub: '123' } });
    expect(await executeAgentTool('color_convert', { input: '#ff0000' })).toMatchObject({
      ok: true,
      content: '{"hex":"#FF0000","rgb":"rgb(255, 0, 0)","hsl":"hsl(0, 100%, 50%)"}',
    });
    expect(await executeAgentTool('radix_convert', { input: '255', from: 10, to: 16 })).toEqual({
      ok: true,
      content: 'FF',
    });
    expect(
      await executeAgentTool('query_transform', { mode: 'parse', input: '?a=1&b=two' }),
    ).toEqual({
      ok: true,
      content: '[{"key":"a","value":"1"},{"key":"b","value":"two"}]',
    });
    expect(
      await executeAgentTool('query_transform', {
        mode: 'build',
        entries: [{ key: 'a b', value: '虾' }],
      }),
    ).toEqual({ ok: true, content: 'a%20b=%E8%99%BE' });
    expect(await executeAgentTool('hash_text', { input: 'abc', algorithm: 'SHA-256' })).toEqual({
      ok: true,
      content: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    });
  });

  it('runs the third batch of structured-data tools and rejects malformed input', async () => {
    const diff = await executeAgentTool('json_diff', { left: '{"a":1}', right: '{"a":2}' });
    expect(diff.ok).toBe(true);
    expect(JSON.parse(diff.content).changes).toEqual([
      { path: '/a', kind: 'changed', before: 1, after: 2 },
    ]);
    expect(
      await executeAgentTool('csv_json_transform', {
        mode: 'to_json',
        format: 'csv',
        input: 'a,b\n1,2',
      }),
    ).toEqual({ ok: true, content: '[\n  {\n    "a": "1",\n    "b": "2"\n  }\n]' });
    expect(
      await executeAgentTool('csv_json_transform', {
        mode: 'from_json',
        format: 'csv',
        input: '[{"a":"1","b":"2"}]',
      }),
    ).toEqual({ ok: true, content: 'a,b\r\n1,2' });
    expect(
      await executeAgentTool('structured_data_transform', {
        mode: 'yaml_to_json',
        input: 'name: shrimp',
      }),
    ).toEqual({ ok: true, content: '{\n  "name": "shrimp"\n}' });
    expect(
      await executeAgentTool('structured_data_transform', {
        mode: 'json_to_toml',
        input: '{"name":"shrimp"}',
      }),
    ).toEqual({ ok: true, content: 'name = "shrimp"' });
    expect(await executeAgentTool('yaml_format', { input: 'name: shrimp' })).toEqual({
      ok: true,
      content: 'name: shrimp',
    });
    expect((await executeAgentTool('json_diff', { left: 'x'.repeat(4001), right: '{}' })).ok).toBe(
      false,
    );
    expect(
      (
        await executeAgentTool('csv_json_transform', {
          mode: 'to_json',
          format: 'csv',
          input: 'a\n"',
        })
      ).ok,
    ).toBe(false);
  });

  it('runs the fourth batch of deterministic conversions with boundary errors', async () => {
    expect(await executeAgentTool('roman_numeral', { mode: 'to_roman', input: '1999' })).toEqual({
      ok: true,
      content: 'MCMXCIX',
    });
    expect(
      await executeAgentTool('roman_numeral', { mode: 'from_roman', input: 'MCMXCIX' }),
    ).toEqual({
      ok: true,
      content: '1999',
    });
    expect(await executeAgentTool('numeronym', { input: 'internationalization' })).toEqual({
      ok: true,
      content: 'i18n',
    });
    expect(
      await executeAgentTool('binary_text_transform', { mode: 'to_binary', input: 'A' }),
    ).toEqual({
      ok: true,
      content: '01000001',
    });
    expect(
      await executeAgentTool('binary_text_transform', { mode: 'from_binary', input: '01000001' }),
    ).toEqual({
      ok: true,
      content: 'A',
    });
    expect(
      await executeAgentTool('unicode_text_transform', { mode: 'to_unicode', input: '虾' }),
    ).toEqual({
      ok: true,
      content: 'U+867E',
    });
    expect(
      await executeAgentTool('unicode_text_transform', { mode: 'from_unicode', input: 'U+867E' }),
    ).toEqual({
      ok: true,
      content: '虾',
    });
    expect(await executeAgentTool('temperature_convert', { value: 0, from: 'C', to: 'F' })).toEqual(
      {
        ok: true,
        content: '32',
      },
    );
    expect((await executeAgentTool('roman_numeral', { mode: 'to_roman', input: '4000' })).ok).toBe(
      false,
    );
    expect(
      (await executeAgentTool('binary_text_transform', { mode: 'from_binary', input: '101' })).ok,
    ).toBe(false);
    expect(
      (await executeAgentTool('unicode_text_transform', { mode: 'from_unicode', input: 'U+D800' }))
        .ok,
    ).toBe(false);
    expect(
      (await executeAgentTool('temperature_convert', { value: -300, from: 'C', to: 'K' })).ok,
    ).toBe(false);
  });

  it('runs local network and reference lookups without making requests', async () => {
    const subnet = await executeAgentTool('ipv4_subnet', { input: '192.168.1.10/24' });
    expect(JSON.parse(subnet.content)).toMatchObject({
      network: '192.168.1.0',
      broadcast: '192.168.1.255',
      usableHosts: 254,
    });
    expect(await executeAgentTool('ipv4_address', { input: '0xC0A80101' })).toMatchObject({
      ok: true,
      content: expect.stringContaining('192.168.1.1'),
    });
    const mac = await executeAgentTool('mac_address_generate', {});
    expect(mac.content).toMatch(/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/);
    expect(JSON.parse((await executeAgentTool('mime_lookup', { query: 'json' })).content)).toEqual([
      { mime: 'application/json', extensions: ['json'], description: 'JSON 数据' },
    ]);
    expect(
      JSON.parse((await executeAgentTool('http_status_lookup', { query: '404' })).content),
    ).toEqual([{ code: 404, name: 'Not Found', description: '请求的资源不存在。' }]);
    expect((await executeAgentTool('ipv4_subnet', { input: '300.1.1.1/24' })).ok).toBe(false);
    expect((await executeAgentTool('ipv4_address', { input: '4294967296' })).ok).toBe(false);
    expect((await executeAgentTool('mime_lookup', { query: 'x'.repeat(201) })).ok).toBe(false);
  });

  it('rejects unknown functions and oversized or malformed inputs', async () => {
    expect((await executeAgentTool('http_send', {})).ok).toBe(false);
    expect(
      (await executeAgentTool('json_transform', { mode: 'format', input: 'x'.repeat(5000) })).ok,
    ).toBe(false);
    expect((await executeAgentTool('base64_transform', { mode: 'unknown', input: 'x' })).ok).toBe(
      false,
    );
    expect((await executeAgentTool('uuid_generate', { count: '2' })).ok).toBe(false);
  });
});
