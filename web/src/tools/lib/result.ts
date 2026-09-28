export type Result<T> = { ok: true; value: T } | { ok: false; error: string }
export const failure = (error: string): Result<never> => ({ ok: false, error })
