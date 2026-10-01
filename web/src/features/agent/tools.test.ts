import { describe, expect, it } from 'vitest';
import { agentToolSchemas, executeAgentTool } from './tools';

describe('Agent fixed local tools', () => {
  it('exposes exactly five approved functions', () => {
    expect(agentToolSchemas.map((tool) => tool.function.name)).toEqual([
      'json_transform',
      'base64_transform',
      'timestamp_convert',
      'uuid_generate',
      'regex_match',
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
