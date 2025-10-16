import { describe, expect, it, vi } from 'vitest';
import { withNetworkRetry, calculateBackoffDelay } from '../networkRetry';

describe('withNetworkRetry', () => {
  it('retries on network error and eventually succeeds', async () => {
    vi.useFakeTimers();
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce('ok');

    const promise = withNetworkRetry(operation, {
      attempts: 3,
      baseDelayMs: 100,
      jitter: false
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('throws the last error when retries exhausted', async () => {
    vi.useFakeTimers();
    const operation = vi.fn().mockRejectedValue(new Error('Offline'));

    const promise = withNetworkRetry(operation, {
      attempts: 2,
      baseDelayMs: 50,
      jitter: false
    });

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('네트워크 연결을 확인해 주세요.');
    expect(operation).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('calculateBackoffDelay', () => {
  it('applies exponential backoff capped by max delay', () => {
    const first = calculateBackoffDelay(0, 200, 2, 1000, false);
    const second = calculateBackoffDelay(1, 200, 2, 1000, false);
    const capped = calculateBackoffDelay(4, 200, 2, 1000, false);

    expect(first).toBe(200);
    expect(second).toBe(400);
    expect(capped).toBe(1000);
  });
});
