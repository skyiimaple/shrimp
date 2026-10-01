export type MimeEntry = { mime: string; extensions: string[]; description: string };
export type HttpStatusEntry = { code: number; name: string; description: string };

// A practical reference for common file types, not a complete IANA registry.
export const COMMON_MIME_TYPES: MimeEntry[] = [
  { mime: 'application/json', extensions: ['json'], description: 'JSON 数据' },
  { mime: 'application/pdf', extensions: ['pdf'], description: 'PDF 文档' },
  { mime: 'application/zip', extensions: ['zip'], description: 'ZIP 压缩包' },
  { mime: 'application/gzip', extensions: ['gz'], description: 'Gzip 压缩文件' },
  { mime: 'application/octet-stream', extensions: ['bin'], description: '二进制数据' },
  { mime: 'application/xml', extensions: ['xml'], description: 'XML 文档' },
  { mime: 'application/javascript', extensions: ['js', 'mjs'], description: 'JavaScript' },
  { mime: 'application/wasm', extensions: ['wasm'], description: 'WebAssembly' },
  { mime: 'application/rtf', extensions: ['rtf'], description: '富文本格式' },
  { mime: 'application/vnd.ms-excel', extensions: ['xls'], description: 'Excel 工作簿' },
  { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extensions: ['xlsx'], description: 'Excel 工作簿' },
  { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extensions: ['docx'], description: 'Word 文档' },
  { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', extensions: ['pptx'], description: 'PowerPoint 演示文稿' },
  { mime: 'application/x-tar', extensions: ['tar'], description: 'TAR 归档' },
  { mime: 'audio/mpeg', extensions: ['mp3'], description: 'MP3 音频' },
  { mime: 'audio/ogg', extensions: ['ogg', 'oga'], description: 'Ogg 音频' },
  { mime: 'audio/wav', extensions: ['wav'], description: 'WAV 音频' },
  { mime: 'audio/webm', extensions: ['weba'], description: 'WebM 音频' },
  { mime: 'font/woff', extensions: ['woff'], description: 'WOFF 字体' },
  { mime: 'font/woff2', extensions: ['woff2'], description: 'WOFF2 字体' },
  { mime: 'image/avif', extensions: ['avif'], description: 'AVIF 图像' },
  { mime: 'image/gif', extensions: ['gif'], description: 'GIF 图像' },
  { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'], description: 'JPEG 图像' },
  { mime: 'image/png', extensions: ['png'], description: 'PNG 图像' },
  { mime: 'image/svg+xml', extensions: ['svg'], description: 'SVG 矢量图' },
  { mime: 'image/webp', extensions: ['webp'], description: 'WebP 图像' },
  { mime: 'image/x-icon', extensions: ['ico'], description: '图标文件' },
  { mime: 'text/css', extensions: ['css'], description: 'CSS 样式表' },
  { mime: 'text/csv', extensions: ['csv'], description: 'CSV 表格' },
  { mime: 'text/html', extensions: ['html', 'htm'], description: 'HTML 文档' },
  { mime: 'text/markdown', extensions: ['md'], description: 'Markdown 文档' },
  { mime: 'text/plain', extensions: ['txt'], description: '纯文本' },
  { mime: 'text/xml', extensions: ['xml'], description: 'XML 文本' },
  { mime: 'video/mp4', extensions: ['mp4'], description: 'MP4 视频' },
  { mime: 'video/ogg', extensions: ['ogv'], description: 'Ogg 视频' },
  { mime: 'video/webm', extensions: ['webm'], description: 'WebM 视频' },
];

export function findMimeTypes(query: string): MimeEntry[] {
  const term = query.trim().toLowerCase().replace(/^\./, '');
  if (!term) return COMMON_MIME_TYPES;
  return COMMON_MIME_TYPES.filter((entry) =>
    entry.mime.toLowerCase().includes(term) ||
    entry.extensions.some((extension) => extension.includes(term)) ||
    entry.description.toLowerCase().includes(term),
  );
}

// Common standard HTTP codes with short descriptions for quick reference.
export const COMMON_HTTP_STATUSES: HttpStatusEntry[] = [
  { code: 100, name: 'Continue', description: '客户端可继续发送请求。' },
  { code: 101, name: 'Switching Protocols', description: '服务器正在切换协议。' },
  { code: 200, name: 'OK', description: '请求成功。' },
  { code: 201, name: 'Created', description: '资源已创建。' },
  { code: 202, name: 'Accepted', description: '请求已接受，尚未完成处理。' },
  { code: 204, name: 'No Content', description: '请求成功，但没有响应内容。' },
  { code: 206, name: 'Partial Content', description: '返回了请求的部分内容。' },
  { code: 301, name: 'Moved Permanently', description: '资源已永久迁移。' },
  { code: 302, name: 'Found', description: '资源暂时位于其他位置。' },
  { code: 303, name: 'See Other', description: '请使用 GET 请求其他地址。' },
  { code: 304, name: 'Not Modified', description: '资源未修改，可使用缓存。' },
  { code: 307, name: 'Temporary Redirect', description: '临时重定向，保持原请求方法。' },
  { code: 308, name: 'Permanent Redirect', description: '永久重定向，保持原请求方法。' },
  { code: 400, name: 'Bad Request', description: '请求格式有误。' },
  { code: 401, name: 'Unauthorized', description: '请求缺少有效的身份认证。' },
  { code: 403, name: 'Forbidden', description: '服务器拒绝访问。' },
  { code: 404, name: 'Not Found', description: '请求的资源不存在。' },
  { code: 405, name: 'Method Not Allowed', description: '请求方法不被允许。' },
  { code: 408, name: 'Request Timeout', description: '服务器等待请求超时。' },
  { code: 409, name: 'Conflict', description: '请求与资源当前状态冲突。' },
  { code: 410, name: 'Gone', description: '资源已不可用。' },
  { code: 413, name: 'Content Too Large', description: '请求内容超过服务器允许的大小。' },
  { code: 415, name: 'Unsupported Media Type', description: '不支持请求内容的媒体类型。' },
  { code: 418, name: "I'm a Teapot", description: '服务器拒绝煮咖啡。' },
  { code: 422, name: 'Unprocessable Content', description: '请求内容可理解，但无法处理。' },
  { code: 429, name: 'Too Many Requests', description: '请求次数过多。' },
  { code: 500, name: 'Internal Server Error', description: '服务器内部发生错误。' },
  { code: 501, name: 'Not Implemented', description: '服务器不支持请求功能。' },
  { code: 502, name: 'Bad Gateway', description: '网关收到无效的上游响应。' },
  { code: 503, name: 'Service Unavailable', description: '服务暂时不可用。' },
  { code: 504, name: 'Gateway Timeout', description: '网关等待上游响应超时。' },
];

export function findHttpStatuses(query: string): HttpStatusEntry[] {
  const term = query.trim().toLowerCase();
  if (!term) return COMMON_HTTP_STATUSES;
  return COMMON_HTTP_STATUSES.filter((entry) =>
    String(entry.code).includes(term) || entry.name.toLowerCase().includes(term) || entry.description.includes(term),
  );
}
