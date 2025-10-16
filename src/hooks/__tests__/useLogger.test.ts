import { describe, expect, it } from 'vitest';
import { maskSensitiveData } from '../useLogger';

describe('useLogger maskSensitiveData', () => {
  it('masks sensitive primitives and nested fields', () => {
    const masked = maskSensitiveData({
      email: 'user@example.com',
      token: 'abcdef123456',
      route: [
        { lat: 37.5, lon: 127.0 }
      ],
      profile: {
        phone: '01012345678',
        name: 'Runner'
      },
      distance: 5
    });

    expect(masked.email).toBe('us***r@example.com');
    expect(masked.token).toBe('ab***56');
    expect(masked.route).toBe('[route:1 points]');
    expect(masked.route).not.toContain('37.5');
    expect(masked.profile).toMatchObject({
      phone: '01***78',
      name: 'Runner'
    });
    expect(masked.distance).toBe(5);
  });

  it('returns primitives masked when passed directly', () => {
    expect(maskSensitiveData('sensitive')).toBe('se***ve');
    expect(maskSensitiveData(123456)).toBe('***');
    expect(maskSensitiveData('user@example.com')).toBe('us***r@example.com');
  });
});
