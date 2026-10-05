export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export interface HttpProxyStatus {
  available: boolean;
  allowedMethods: HttpMethod[];
  timeoutMs: number;
  maxResponseBytes: number;
  maxRedirects: number;
}
export interface HttpSendRequest {
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body?: string;
}
export interface HttpSendResponse {
  status: number;
  headers: Record<string, string[]>;
  body: string;
  bodyEncoding: 'text' | 'base64';
  durationMs: number;
}
