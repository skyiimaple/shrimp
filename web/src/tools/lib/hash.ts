export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
export async function hashText(text: string, algorithm: HashAlgorithm) {
  const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
