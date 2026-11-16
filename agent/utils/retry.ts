import { logger } from './logger';

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number; label: string }
): Promise<T> {
  const retries = options.retries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1500;

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn(
        'Retry',
        `Attempt ${attempt}/${retries} failed for ${options.label}. Retrying in ${delay}ms`,
        { error: err instanceof Error ? err.message : String(err) }
      );
      if (attempt < retries) {
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

export class RateLimiter {
  private lastCall = 0;

  constructor(private minIntervalMs: number) {}

  async waitTurn(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCall;
    if (elapsed < this.minIntervalMs) {
      await sleep(this.minIntervalMs - elapsed);
    }
    this.lastCall = Date.now();
  }
}
