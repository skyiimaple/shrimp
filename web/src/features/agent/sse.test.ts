import { describe, expect, it } from 'vitest';
import { readSseData } from './sse';

describe('SSE parser', () => {
  it('reassembles UTF-8 and frames split across arbitrary chunks', async () => {
    const bytes = new TextEncoder().encode('data: {"text":"虾"}\r\n\r\ndata: [DONE]\n\n');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 16));
        controller.enqueue(bytes.slice(16, 18));
        controller.enqueue(bytes.slice(18));
        controller.close();
      },
    });
    const values: string[] = [];
    for await (const value of readSseData(stream)) values.push(value);
    expect(values).toEqual(['{"text":"虾"}', '[DONE]']);
  });
});
