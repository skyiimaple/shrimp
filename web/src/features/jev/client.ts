import type { JevRequest } from './request';

export interface JevAnswer {
  type: 'noul' | 'choice' | 'score';
  noul?: number;
  choice?: string;
  score?: number;
  confidence?: number;
  probabilities?: Record<string, number>;
  legend?: Record<string, string>;
}

export interface JevResponse {
  model: string;
  answers: Record<string, JevAnswer>;
  usage: { input_tokens: number; output_tokens: number };
}

export class JevApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'JevApiError';
  }
}

const errorMessages: Record<number, string> = {
  401: 'API Key 无效，请检查后重试',
  422: '请求内容未通过 Jev 校验，请检查问题结构',
  429: '请求过于频繁，请稍后重试',
  529: 'Jev 服务暂时繁忙，请稍后重试',
};

export async function evaluateJev(
  apiKey: string,
  request: JevRequest,
  signal?: AbortSignal,
): Promise<JevResponse> {
  let response: Response;
  try {
    response = await fetch('/api/jev/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new JevApiError(0, '无法连接本地服务，请确认后端已启动');
  }
  if (!response.ok)
    throw new JevApiError(
      response.status,
      errorMessages[response.status] ?? 'Jev 请求失败，请稍后重试',
    );
  const data: unknown = await response.json().catch(() => null);
  if (!data || typeof data !== 'object' || !('answers' in data) || !('model' in data)) {
    throw new JevApiError(502, 'Jev 返回了无法识别的结果');
  }
  return data as JevResponse;
}
