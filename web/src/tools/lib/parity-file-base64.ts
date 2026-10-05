export function fileToBase64(file: File): Promise<string> {
  if (file.size > 5_000_000) return Promise.reject(new Error('文件不能超过 5 MB'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('文件读取失败'));
    };
    reader.readAsDataURL(file);
  });
}
