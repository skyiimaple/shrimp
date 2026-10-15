export const MAX_IMAGE_BYTES = 65_536;
export const MAX_TOTAL_IMAGE_BYTES = 131_072;
export const MAX_IMAGES = 4;
export interface JevImage {
  id: string;
  name: string;
  asset: { type: 'image'; format: 'png' | 'jpg' | 'jpeg'; data_base64: string };
}

export async function readJevImages(files: File[], existing: JevImage[]): Promise<JevImage[]> {
  if (files.length + existing.length > MAX_IMAGES) throw new Error('最多添加 4 张图片');
  let total = existing.reduce((sum, image) => sum + atob(image.asset.data_base64).length, 0);
  for (const file of files) {
    if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('只支持 PNG / JPEG 图片');
    if (!file.size || file.size > MAX_IMAGE_BYTES)
      throw new Error('每张图片须大于 0 且不超过 64 KiB');
    total += file.size;
  }
  if (total > MAX_TOTAL_IMAGE_BYTES) throw new Error('图片总大小不能超过 128 KiB');
  return Promise.all(
    files.map(async (file) => {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('图片读取失败，请重新选择'));
        reader.readAsDataURL(file);
      });
      const bytes = atob(data);
      const png = bytes.startsWith('\x89PNG\r\n\x1a\n');
      const jpg = bytes.startsWith('\xff\xd8\xff');
      if ((file.type === 'image/png' && !png) || (file.type === 'image/jpeg' && !jpg))
        throw new Error('图片内容与 PNG / JPEG 格式不符');
      return {
        id: crypto.randomUUID(),
        name: file.name,
        asset: {
          type: 'image' as const,
          format: png ? ('png' as const) : ('jpg' as const),
          data_base64: data,
        },
      };
    }),
  );
}
