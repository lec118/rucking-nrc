# Test Gap Analysis & Missing Test Cases

## 📊 Current Test Coverage Summary

### Existing Test Files (9 files)
1. ✅ `src/utils/__tests__/workoutStats.test.ts` - Stats 계산 로직
2. ✅ `src/schemas/__tests__/workout.schema.test.ts` - Zod 검증 스키마
3. ✅ `src/components/__tests__/AddWorkoutModal.test.tsx` - 폼 통합 테스트
4. ✅ `src/services/__tests__/api.test.ts` - API 서비스
5. ✅ `src/context/__tests__/AuthContext.test.tsx` - 인증 컨텍스트
6. ✅ `src/app/__tests__/ErrorBoundary.test.tsx` - 에러 경계
7. ✅ `src/utils/__tests__/formValidation.test.ts` - 폼 검증
8. ✅ `src/utils/__tests__/networkRetry.test.ts` - 재시도 로직
9. ✅ `src/hooks/__tests__/useLogger.test.ts` - 로깅 훅

### Coverage Gaps Identified

**High Priority Gaps** (Security & Core Features):
- ❌ GPS 관련 테스트 전무
- ❌ 에러 핸들러 유틸리티 테스트 없음
- ❌ 토큰 저장/관리 테스트 없음
- ❌ CSRF 보호 테스트 없음
- ❌ 민감정보 마스킹 테스트 없음

**Medium Priority Gaps** (Integration & E2E):
- ❌ 백엔드 API 엔드포인트 테스트 없음
- ❌ 오프라인 동기화 테스트 없음
- ❌ E2E 플로우 테스트 없음

**Low Priority Gaps** (Edge Cases):
- ❌ 경쟁 상태(Race conditions) 테스트
- ❌ 메모리 누수 테스트
- ❌ 성능 벤치마크 테스트

---

## 🎯 Priority Matrix

| Priority | Category | Tests Needed | Estimated Value | Implementation Difficulty |
|----------|----------|--------------|-----------------|---------------------------|
| **P0** | Security | 12 tests | ★★★★★ | ★★★☆☆ |
| **P1** | GPS Core | 15 tests | ★★★★★ | ★★★★☆ |
| **P2** | Error Handling | 8 tests | ★★★★☆ | ★★☆☆☆ |
| **P3** | Backend API | 10 tests | ★★★★☆ | ★★★☆☆ |
| **P4** | Offline Sync | 6 tests | ★★★☆☆ | ★★★★☆ |
| **P5** | E2E Flows | 5 tests | ★★★★☆ | ★★★★★ |
| **P6** | Edge Cases | 8 tests | ★★☆☆☆ | ★★★☆☆ |

**Total Missing Tests**: 64 tests across 7 categories

---

## 🔴 P0: Security Tests (Critical - 12 tests)

### 1. Token Storage Security Test
**파일**: `src/utils/__tests__/tokenStorage.test.ts` (신규)
**중요도**: ★★★★★
**난이도**: ★★☆☆☆
**가치**: ★★★★★

**시나리오**:
- Access token이 localStorage에 저장되지 않는지 검증
- Refresh token이 암호화되어 저장되는지 검증
- XSS 공격 시 토큰 노출 방지

```typescript
describe('TokenStorage Security', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should NOT store access token in localStorage', () => {
    const storage = new TokenStorage();
    storage.setAccessToken('sensitive-access-token');

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    // Access token should only exist in memory
    expect(storage.getAccessToken()).toBe('sensitive-access-token');
  });

  it('should store refresh token in localStorage only', () => {
    const storage = new TokenStorage();
    storage.setRefreshToken('refresh-token', Date.now() + 3600000);

    const stored = localStorage.getItem('__refresh_token__');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).token).toBe('refresh-token');
  });

  it('should clear access token on page refresh', () => {
    const storage = new TokenStorage();
    storage.setAccessToken('temp-token');

    // Simulate page refresh by creating new instance
    const newStorage = new TokenStorage();
    expect(newStorage.getAccessToken()).toBeNull();
  });

  it('should reject expired refresh tokens', () => {
    const storage = new TokenStorage();
    const pastTime = Date.now() - 1000;
    storage.setRefreshToken('expired-token', pastTime);

    expect(storage.getRefreshToken()).toBeNull();
    expect(localStorage.getItem('__refresh_token__')).toBeNull();
  });
});
```

---

### 2. PII Masking Tests
**파일**: `src/utils/__tests__/piiMasking.test.ts` (신규)
**중요도**: ★★★★★
**난이도**: ★★★☆☆
**가치**: ★★★★★

**시나리오**:
- 이메일 마스킹 검증
- GPS 좌표 마스킹 검증
- 토큰 마스킹 검증
- IP 주소 마스킹 검증

```typescript
describe('PII Masking Utilities', () => {
  describe('maskEmail', () => {
    it('should mask middle characters of email', () => {
      expect(maskEmail('user@example.com')).toBe('us***r@example.com');
      expect(maskEmail('a@test.com')).toBe('a***@test.com');
    });

    it('should handle invalid email gracefully', () => {
      expect(maskEmail('not-an-email')).toBe('not-an-email');
      expect(maskEmail('')).toBe('');
    });
  });

  describe('maskGPSCoordinates', () => {
    it('should replace route array with count', () => {
      const route = [[37.5665, 126.9780], [37.5666, 126.9781]];
      expect(maskGPSCoordinates(route)).toBe('[2 GPS points]');
    });

    it('should round individual coordinates', () => {
      const coord = { lat: 37.566535, lon: 126.978029 };
      expect(maskCoordinate(coord)).toEqual({ lat: 37, lon: 126 });
    });

    it('should not log precise location in error messages', () => {
      const error = new Error('GPS failed at 37.566535, 126.978029');
      const masked = maskSensitiveData({ error: error.message });

      expect(masked.error).not.toContain('37.566535');
      expect(masked.error).not.toContain('126.978029');
    });
  });

  describe('maskToken', () => {
    it('should show only first and last 4 chars', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      expect(maskToken(token)).toBe('eyJh...R8U');
    });

    it('should handle short tokens', () => {
      expect(maskToken('abc')).toBe('***');
    });
  });

  describe('maskIPAddress', () => {
    it('should mask last octet of IPv4', () => {
      expect(maskIPAddress('192.168.1.105')).toBe('192.168.1.xxx');
    });

    it('should mask last segment of IPv6', () => {
      expect(maskIPAddress('2001:0db8:85a3::8a2e:0370:7334'))
        .toMatch(/2001:0db8:85a3:.*:xxxx$/);
    });
  });
});
```

---

### 3. SQL Injection Prevention Tests
**파일**: `server/__tests__/sqlInjection.test.ts` (신규)
**중요도**: ★★★★★
**난이도**: ★★★☆☆
**가치**: ★★★★★

```typescript
describe('SQL Injection Prevention', () => {
  it('should reject SQL injection in workout ID', async () => {
    const maliciousId = "1 OR 1=1; DROP TABLE workouts;--";

    const response = await request(app)
      .get(`/api/workouts/${maliciousId}`)
      .expect(400);

    expect(response.body.error).toBe('VALIDATION_ERROR');
    expect(response.body.code).toBe('VALIDATION_001');
  });

  it('should reject SQL injection in query parameters', async () => {
    const response = await request(app)
      .get('/api/workouts')
      .query({ startDate: "'; DROP TABLE users;--" })
      .expect(400);

    expect(response.body.error).toBe('VALIDATION_ERROR');
  });

  it('should use parameterized queries for all database operations', () => {
    // This test verifies code structure, not runtime behavior
    const workoutRoutes = fs.readFileSync('server/routes/workouts.js', 'utf-8');

    // Should NOT contain string concatenation in queries
    expect(workoutRoutes).not.toMatch(/['"]SELECT.*\+.*['"/);
    expect(workoutRoutes).not.toMatch(/`SELECT.*\${.*}`/);

    // Should contain prepared statements
    expect(workoutRoutes).toContain('db.prepare(');
    expect(workoutRoutes).toContain('.run(');
  });
});
```

---

### 4. XSS Prevention Tests
**파일**: `src/utils/__tests__/xssPrevention.test.ts` (신규)
**중요도**: ★★★★★
**난이도**: ★★☆☆☆
**가치**: ★★★★★

```typescript
describe('XSS Prevention', () => {
  it('should sanitize HTML in workout title', () => {
    const result = ManualWorkoutSchema.safeParse({
      title: '<script>alert("xss")</script>Morning Run',
      distance: 5,
      duration: 30
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).not.toContain('<script>');
      expect(result.data.title).toBe('Morning Run');
    }
  });

  it('should remove dangerous HTML attributes', () => {
    const result = ManualWorkoutSchema.safeParse({
      title: '<img src=x onerror="alert(1)">Run',
      distance: 5,
      duration: 30
    });

    if (result.success) {
      expect(result.data.title).not.toContain('onerror');
      expect(result.data.title).not.toContain('<img');
    }
  });

  it('should escape special characters in user input', () => {
    const input = '"><script>alert(document.cookie)</script>';
    const sanitized = sanitizeInput(input);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('document.cookie');
  });
});
```

---

### 5. CSRF Token Tests
**파일**: `src/context/__tests__/CsrfProtection.test.tsx` (신규)
**중요도**: ★★★★★
**난이도**: ★★★☆☆
**가치**: ★★★★☆

```typescript
describe('CSRF Protection', () => {
  it('should fetch CSRF token on mount', async () => {
    mockCsrf.mockResolvedValue({ csrfToken: 'csrf-abc123' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockCsrf).toHaveBeenCalled();
      expect(screen.getByTestId('csrf-token').textContent).toBe('csrf-abc123');
    });
  });

  it('should include CSRF token in state-changing requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;

    await workoutAPI.createWorkout({ distance: 5, duration: 30 }, 'token', 'csrf-token');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-CSRF-Token': 'csrf-token'
        })
      })
    );
  });

  it('should reject requests without CSRF token', async () => {
    const response = await request(app)
      .post('/api/workouts')
      .set('Authorization', 'Bearer valid-token')
      .send({ distance: 5, duration: 30 })
      .expect(403);

    expect(response.body.error).toBe('CSRF_ERROR');
  });

  it('should validate CSRF token on server', async () => {
    const invalidToken = 'wrong-csrf-token';

    const response = await request(app)
      .post('/api/workouts')
      .set('Authorization', 'Bearer valid-token')
      .set('X-CSRF-Token', invalidToken)
      .send({ distance: 5, duration: 30 })
      .expect(403);

    expect(response.body.message).toContain('Invalid CSRF token');
  });
});
```

---

### 6. Authorization Tests
**파일**: `server/__tests__/authorization.test.ts` (신규)
**중요도**: ★★★★★
**난이도**: ★★★☆☆
**가치**: ★★★★★

```typescript
describe('Authorization Middleware', () => {
  it('should deny access to other users workouts', async () => {
    // User 1 creates a workout
    const workout = await createWorkout({ userId: 'user-1' });

    // User 2 tries to access it
    const response = await request(app)
      .get(`/api/workouts/${workout.id}`)
      .set('Authorization', 'Bearer user-2-token')
      .expect(403);

    expect(response.body.error).toBe('AUTHORIZATION_ERROR');
    expect(response.body.code).toBe('AUTHZ_002');
  });

  it('should allow owner to access their workout', async () => {
    const workout = await createWorkout({ userId: 'user-1' });

    const response = await request(app)
      .get(`/api/workouts/${workout.id}`)
      .set('Authorization', 'Bearer user-1-token')
      .expect(200);

    expect(response.body.id).toBe(workout.id);
  });

  it('should deny deletion of other users workouts', async () => {
    const workout = await createWorkout({ userId: 'user-1' });

    const response = await request(app)
      .delete(`/api/workouts/${workout.id}`)
      .set('Authorization', 'Bearer user-2-token')
      .expect(403);

    // Verify workout still exists
    const check = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(workout.id);
    expect(check).toBeTruthy();
  });

  it('should require authentication for protected routes', async () => {
    const response = await request(app)
      .get('/api/workouts')
      .expect(401);

    expect(response.body.error).toBe('AUTHENTICATION_ERROR');
    expect(response.body.code).toBe('AUTH_001');
  });
});
```

---

## 🟡 P1: GPS Core Tests (Critical - 15 tests)

### 7. GPS Coordinate Validation Tests
**파일**: `src/utils/__tests__/gpsValidation.test.ts` (신규)
**중요도**: ★★★★★
**난이도**: ★★★☆☆
**가치**: ★★★★★

```typescript
describe('GPS Coordinate Validation', () => {
  describe('isValidCoordinate', () => {
    it('should accept valid coordinates', () => {
      expect(isValidCoordinate(37.5665, 126.9780)).toBe(true); // Seoul
      expect(isValidCoordinate(0, 0)).toBe(true); // Null Island
      expect(isValidCoordinate(-90, -180)).toBe(true); // Extremes
      expect(isValidCoordinate(90, 180)).toBe(true); // Extremes
    });

    it('should reject out-of-range coordinates', () => {
      expect(isValidCoordinate(91, 0)).toBe(false); // Lat > 90
      expect(isValidCoordinate(-91, 0)).toBe(false); // Lat < -90
      expect(isValidCoordinate(0, 181)).toBe(false); // Lon > 180
      expect(isValidCoordinate(0, -181)).toBe(false); // Lon < -180
    });

    it('should reject NaN and invalid types', () => {
      expect(isValidCoordinate(NaN, 126)).toBe(false);
      expect(isValidCoordinate(37, NaN)).toBe(false);
      expect(isValidCoordinate(null, 126)).toBe(false);
      expect(isValidCoordinate(37, undefined)).toBe(false);
    });
  });

  describe('isAcceptableAccuracy', () => {
    it('should accept accuracy within threshold', () => {
      expect(isAcceptableAccuracy(10)).toBe(true); // Excellent
      expect(isAcceptableAccuracy(30)).toBe(true); // Good
      expect(isAcceptableAccuracy(50)).toBe(true); // Acceptable (boundary)
    });

    it('should reject accuracy beyond threshold', () => {
      expect(isAcceptableAccuracy(51)).toBe(false);
      expect(isAcceptableAccuracy(100)).toBe(false);
    });

    it('should reject invalid accuracy values', () => {
      expect(isAcceptableAccuracy(0)).toBe(false);
      expect(isAcceptableAccuracy(-10)).toBe(false);
      expect(isAcceptableAccuracy(NaN)).toBe(false);
    });
  });

  describe('isRealisticSpeed', () => {
    it('should accept realistic walking/running speeds', () => {
      expect(isRealisticSpeed(0.5, 360)).toBe(true); // 5 km/h walking
      expect(isRealisticSpeed(2, 360)).toBe(true); // 20 km/h running
      expect(isRealisticSpeed(0.3, 60)).toBe(true); // 18 km/h fast run
    });

    it('should reject vehicle speeds', () => {
      expect(isRealisticSpeed(10, 360)).toBe(false); // 100 km/h
      expect(isRealisticSpeed(5, 180)).toBe(false); // 100 km/h
    });

    it('should use 30 km/h as maximum', () => {
      expect(isRealisticSpeed(0.5, 60)).toBe(true); // 30 km/h (boundary)
      expect(isRealisticSpeed(0.51, 60)).toBe(false); // >30 km/h
    });
  });

  describe('detectGPSJump', () => {
    it('should detect unrealistic position jumps', () => {
      const pos1 = { lat: 37.5665, lon: 126.9780 };
      const pos2 = { lat: 37.6, lon: 127.1 }; // ~15km jump

      expect(detectGPSJump(pos1, pos2, 1000)).toBe(true); // 1 second = impossible
    });

    it('should allow gradual movement', () => {
      const pos1 = { lat: 37.5665, lon: 126.9780 };
      const pos2 = { lat: 37.5666, lon: 126.9781 }; // ~100m

      expect(detectGPSJump(pos1, pos2, 60000)).toBe(false); // 1 minute = realistic
    });
  });
});
```

---

### 8. GPS Permission Flow Tests
**파일**: `src/components/__tests__/GPSPermission.test.tsx` (신규)
**중요도**: ★★★★★
**난이도**: ★★★★☆
**가치**: ★★★★★

```typescript
describe('GPS Permission Flow', () => {
  beforeEach(() => {
    // Mock Geolocation API
    global.navigator.geolocation = {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(),
      clearWatch: vi.fn()
    };
  });

  it('should request GPS permission on mount', async () => {
    const mockGetCurrentPosition = vi.fn((success) => {
      success({ coords: { latitude: 37.5, longitude: 126.9, accuracy: 10 } });
    });
    global.navigator.geolocation.getCurrentPosition = mockGetCurrentPosition;

    render(<GPSTracker />);

    await waitFor(() => {
      expect(mockGetCurrentPosition).toHaveBeenCalled();
    });
  });

  it('should show permission denied screen', async () => {
    const mockGetCurrentPosition = vi.fn((success, error) => {
      error({ code: 1, message: 'Permission denied' }); // PERMISSION_DENIED
    });
    global.navigator.geolocation.getCurrentPosition = mockGetCurrentPosition;

    render(<GPSTracker />);

    await waitFor(() => {
      expect(screen.getByText(/GPS 권한이 필요합니다/i)).toBeInTheDocument();
      expect(screen.getByText(/권한 허용하기/i)).toBeInTheDocument();
    });
  });

  it('should show platform-specific instructions', async () => {
    mockGeolocationError(1); // Permission denied

    render(<GPSTracker />);

    await user.click(screen.getByText(/권한 설정 방법/i));

    expect(screen.getByText(/Chrome \(Android\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Safari \(iOS\)/i)).toBeInTheDocument();
  });

  it('should retry permission request', async () => {
    let callCount = 0;
    const mockGetCurrentPosition = vi.fn((success, error) => {
      callCount++;
      if (callCount === 1) {
        error({ code: 1 });
      } else {
        success({ coords: { latitude: 37.5, longitude: 126.9, accuracy: 10 } });
      }
    });
    global.navigator.geolocation.getCurrentPosition = mockGetCurrentPosition;

    render(<GPSTracker />);

    await user.click(screen.getByText(/권한 허용하기/i));

    await waitFor(() => {
      expect(screen.queryByText(/GPS 권한이 필요합니다/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('gps-status')).toHaveTextContent(/추적 중/i);
    });
  });
});
```

---

### 9. GPS Accuracy Level Tests
**파일**: `src/hooks/__tests__/useGPSAccuracy.test.ts` (신규)
**중요도**: ★★★★☆
**난이도**: ★★★☆☆
**가치**: ★★★★☆

```typescript
describe('GPS Accuracy Levels', () => {
  it('should classify accuracy levels correctly', () => {
    expect(getAccuracyLevel(5)).toBe('excellent'); // 0-10m
    expect(getAccuracyLevel(25)).toBe('good'); // 10-30m
    expect(getAccuracyLevel(40)).toBe('acceptable'); // 30-50m
    expect(getAccuracyLevel(75)).toBe('poor'); // 50-100m
    expect(getAccuracyLevel(150)).toBe('unacceptable'); // >100m
  });

  it('should show appropriate UI for each level', () => {
    const { rerender } = render(<GPSStatus accuracy={5} />);
    expect(screen.getByText(/우수/i)).toBeInTheDocument();
    expect(screen.getByText(/🟢/)).toBeInTheDocument();

    rerender(<GPSStatus accuracy={75} />);
    expect(screen.getByText(/낮음/i)).toBeInTheDocument();
    expect(screen.getByText(/🟠/)).toBeInTheDocument();
  });

  it('should suggest improvement for poor accuracy', () => {
    render(<GPSStatus accuracy={80} />);

    expect(screen.getByText(/실외로 이동하거나 Wi-Fi를 켜면/i)).toBeInTheDocument();
  });

  it('should fallback to low accuracy mode on timeout', async () => {
    const mockWatchPosition = vi.fn((success, error, options) => {
      if (options.enableHighAccuracy) {
        error({ code: 3 }); // TIMEOUT
      } else {
        success({ coords: { latitude: 37.5, longitude: 126.9, accuracy: 85 } });
      }
    });
    global.navigator.geolocation.watchPosition = mockWatchPosition;

    const { result } = renderHook(() => useGPS());

    act(() => {
      result.current.startTracking();
    });

    await waitFor(() => {
      expect(result.current.accuracyMode).toBe('low');
      expect(result.current.position?.accuracy).toBe(85);
    });
  });
});
```

---

## 🟠 P2: Error Handling Tests (8 tests)

### 10. Error Handler Utility Tests
**파일**: `src/utils/__tests__/errorHandler.test.ts` (신규)
**중요도**: ★★★★☆
**난이도**: ★★☆☆☆
**가치**: ★★★★☆

```typescript
describe('Error Handler Utilities', () => {
  describe('handleApiError', () => {
    it('should convert network error to AppError', () => {
      const networkError = new Error('Network failed');
      const appError = handleApiError(networkError);

      expect(appError.type).toBe(ErrorType.NETWORK_ERROR);
      expect(appError.code).toBe(ErrorCode.NETWORK_001);
      expect(appError.retryable).toBe(true);
    });

    it('should extract validation errors from response', () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            error: 'VALIDATION_ERROR',
            code: 'VALIDATION_003',
            details: [
              { field: 'distance', message: 'Too small', code: 'VALIDATION_003' }
            ]
          }
        }
      };

      const appError = handleApiError(apiError);

      expect(appError.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(appError.details).toHaveLength(1);
      expect(appError.details[0].field).toBe('distance');
      expect(appError.retryable).toBe(false);
    });

    it('should mark 5xx errors as retryable', () => {
      const serverError = {
        response: { status: 500, data: { message: 'Internal error' } }
      };

      const appError = handleApiError(serverError);

      expect(appError.retryable).toBe(true);
      expect(appError.statusCode).toBe(500);
    });

    it('should mark 4xx errors as non-retryable', () => {
      const clientError = {
        response: { status: 404, data: { error: 'NOT_FOUND' } }
      };

      const appError = handleApiError(clientError);

      expect(appError.retryable).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('should retry on retryable errors', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw { response: { status: 500 } };
        }
        return 'success';
      });

      const result = await withRetry(fn, { maxRetries: 3, baseDelay: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue({ response: { status: 400 } });

      await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should apply exponential backoff', async () => {
      vi.useFakeTimers();
      const delays: number[] = [];

      const fn = vi.fn().mockRejectedValue({ response: { status: 500 } });

      const promise = withRetry(fn, {
        maxRetries: 3,
        baseDelay: 1000,
        onRetry: (attempt) => delays.push(Date.now())
      });

      await vi.advanceTimersByTime(1000); // First retry after 1s
      await vi.advanceTimersByTime(2000); // Second retry after 2s
      await vi.advanceTimersByTime(4000); // Third retry after 4s

      await expect(promise).rejects.toThrow();
      expect(delays).toHaveLength(3);

      vi.useRealTimers();
    });
  });
});
```

---

## 🟡 P3: Backend API Tests (10 tests)

### 11. Workout API Endpoints Tests
**파일**: `server/__tests__/workouts.api.test.ts` (신규)
**중요도**: ★★★★☆
**난이도**: ★★★☆☆
**가치**: ★★★★☆

```typescript
describe('Workout API Endpoints', () => {
  describe('POST /api/workouts', () => {
    it('should create workout with valid data', async () => {
      const workout = {
        title: 'Morning Ruck',
        distance: 5.5,
        duration: 65,
        weight: 15,
        date: '2024-05-01T09:00:00Z',
        route: [[37.5, 126.9], [37.51, 126.91]]
      };

      const response = await request(app)
        .post('/api/workouts')
        .set('Authorization', 'Bearer valid-token')
        .set('X-CSRF-Token', 'valid-csrf')
        .send(workout)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        title: 'Morning Ruck',
        distance: 5.5,
        duration: 65,
        pace: expect.closeTo(11.8, 1)
      });
    });

    it('should reject workout with invalid distance', async () => {
      const response = await request(app)
        .post('/api/workouts')
        .set('Authorization', 'Bearer valid-token')
        .set('X-CSRF-Token', 'valid-csrf')
        .send({ distance: -5, duration: 30 })
        .expect(400);

      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'distance', code: 'VALIDATION_003' })
        ])
      );
    });

    it('should reject workout with too many GPS points', async () => {
      const route = Array.from({ length: 10001 }, (_, i) => [37.5 + i * 0.0001, 126.9]);

      const response = await request(app)
        .post('/api/workouts')
        .set('Authorization', 'Bearer valid-token')
        .set('X-CSRF-Token', 'valid-csrf')
        .send({ distance: 5, duration: 30, route })
        .expect(413);

      expect(response.body.error).toBe('PAYLOAD_TOO_LARGE');
    });
  });

  describe('GET /api/workouts', () => {
    it('should return paginated workouts', async () => {
      await createMultipleWorkouts(25);

      const response = await request(app)
        .get('/api/workouts')
        .query({ limit: 10, offset: 0 })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination.total).toBe(25);
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/workouts')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      response.body.data.forEach((workout: any) => {
        expect(new Date(workout.date).getMonth()).toBe(0); // January
      });
    });
  });

  describe('DELETE /api/workouts/:id', () => {
    it('should delete owned workout', async () => {
      const workout = await createWorkout({ userId: 'user-1' });

      await request(app)
        .delete(`/api/workouts/${workout.id}`)
        .set('Authorization', 'Bearer user-1-token')
        .set('X-CSRF-Token', 'valid-csrf')
        .expect(200);

      // Verify deletion
      const check = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(workout.id);
      expect(check).toBeUndefined();
    });

    it('should return 404 for non-existent workout', async () => {
      const response = await request(app)
        .delete('/api/workouts/99999')
        .set('Authorization', 'Bearer valid-token')
        .set('X-CSRF-Token', 'valid-csrf')
        .expect(404);

      expect(response.body.error).toBe('NOT_FOUND');
      expect(response.body.code).toBe('NOT_FOUND_001');
    });
  });
});
```

---

## 🟢 P4: Offline Sync Tests (6 tests)

### 12. Offline Storage Tests
**파일**: `src/services/__tests__/offlineStorage.test.ts` (신규)
**중요도**: ★★★☆☆
**난이도**: ★★★★☆
**가치**: ★★★☆☆

```typescript
describe('Offline Workout Storage', () => {
  beforeEach(async () => {
    await clearIndexedDB();
  });

  it('should save workout to IndexedDB when offline', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

    const workout = { distance: 5, duration: 30, date: new Date().toISOString() };
    await saveWorkout(workout);

    const pending = await getPendingWorkouts();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      ...workout,
      syncStatus: 'pending'
    });
  });

  it('should sync pending workouts when back online', async () => {
    // Save offline
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    await saveWorkout({ distance: 5, duration: 30 });

    // Go online
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    const mockCreate = vi.spyOn(workoutAPI, 'createWorkout').mockResolvedValue({ id: 123 });

    window.dispatchEvent(new Event('online'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });

    const pending = await getPendingWorkouts();
    expect(pending).toHaveLength(0);
  });

  it('should mark workout as synced after successful upload', async () => {
    const workout = await saveWorkout({ distance: 5, duration: 30 }, 'pending');

    await markWorkoutSynced(workout.localId, 123);

    const synced = await getWorkoutById(workout.localId);
    expect(synced.syncStatus).toBe('synced');
    expect(synced.serverId).toBe(123);
  });

  it('should keep workout in pending state on sync failure', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    await saveWorkout({ distance: 5, duration: 30 });

    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    vi.spyOn(workoutAPI, 'createWorkout').mockRejectedValue(new Error('Network error'));

    window.dispatchEvent(new Event('online'));

    await waitFor(() => {
      expect(workoutAPI.createWorkout).toHaveBeenCalled();
    });

    const pending = await getPendingWorkouts();
    expect(pending).toHaveLength(1);
    expect(pending[0].syncStatus).toBe('pending');
  });

  it('should show sync status indicator', () => {
    render(<WorkoutList workouts={[
      { id: 1, syncStatus: 'synced', distance: 5 },
      { id: 2, syncStatus: 'pending', distance: 3 }
    ]} />);

    expect(screen.getAllByTestId('sync-status-synced')).toHaveLength(1);
    expect(screen.getAllByTestId('sync-status-pending')).toHaveLength(1);
  });
});
```

---

## 🔵 P5: E2E Flow Tests (5 tests)

### 13. Complete Workout Flow E2E
**파일**: `e2e/workoutFlow.spec.ts` (신규)
**중요도**: ★★★★☆
**난이도**: ★★★★★
**가치**: ★★★★☆

```typescript
describe('Complete Workout Flow E2E', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 37.5665, longitude: 126.9780 });
  });

  test('should complete full GPS workout flow', async ({ page }) => {
    await page.goto('/');

    // Start workout
    await page.click('text=Start Workout');
    await expect(page).toHaveURL('/live-workout');

    // Enter workout details
    await page.fill('input[name="title"]', 'Morning Run');
    await page.fill('input[name="weight"]', '15');
    await page.click('text=Continue to Tracking');

    // GPS tracking
    await expect(page.locator('[data-testid="gps-status"]')).toContainText('추적 중');

    // Start recording
    await page.click('text=Start Workout');
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();

    // Simulate movement
    await page.context().setGeolocation({ latitude: 37.5675, longitude: 126.9790 });
    await page.waitForTimeout(2000);

    // Check distance updated
    const distance = await page.locator('[data-testid="distance"]').textContent();
    expect(parseFloat(distance!)).toBeGreaterThan(0);

    // Stop and save
    await page.click('text=Stop');
    await page.click('text=Save Workout');

    await expect(page.locator('text=Workout Saved')).toBeVisible();

    // Verify on home screen
    await page.click('text=Go Back');
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Morning Run')).toBeVisible();
  });

  test('should handle GPS permission denial gracefully', async ({ page, context }) => {
    await context.clearPermissions();

    await page.goto('/live-workout');

    await expect(page.locator('text=GPS 권한이 필요합니다')).toBeVisible();
    await expect(page.locator('text=권한 허용하기')).toBeVisible();

    // Click for instructions
    await page.click('text=권한 설정 방법');
    await expect(page.locator('text=Chrome (Android)')).toBeVisible();
  });

  test('should save and visualize workout data', async ({ page }) => {
    // Create multiple workouts
    await createWorkouts(7);

    await page.goto('/');

    // Check chart rendered
    await expect(page.locator('.recharts-wrapper')).toBeVisible();

    // Switch period
    await page.click('text=Weekly');
    await page.waitForTimeout(500);

    // Verify data updated
    const weeklyData = await page.locator('[data-testid="weekly-distance"]').textContent();
    expect(weeklyData).toBeTruthy();
  });
});
```

---

## 🟣 P6: Edge Cases & Race Conditions (8 tests)

### 14. Concurrent Request Tests
**파일**: `src/services/__tests__/concurrency.test.ts` (신규)
**중요도**: ★★☆☆☆
**난이도**: ★★★☆☆
**가치**: ★★★☆☆

```typescript
describe('Concurrent Request Handling', () => {
  it('should handle multiple simultaneous token refreshes', async () => {
    let refreshCount = 0;
    mockRefresh.mockImplementation(async () => {
      refreshCount++;
      await sleep(100);
      return { accessToken: 'new-token', refreshToken: 'new-refresh' };
    });

    // Trigger multiple refreshes simultaneously
    const promises = Array.from({ length: 5 }, () => silentRefresh());
    await Promise.all(promises);

    // Should only call refresh once due to deduplication
    expect(refreshCount).toBe(1);
  });

  it('should handle race between save and delete', async () => {
    const workout = await createWorkout();

    // Start save and delete simultaneously
    const [saveResult, deleteResult] = await Promise.allSettled([
      updateWorkout(workout.id, { distance: 10 }),
      deleteWorkout(workout.id)
    ]);

    // One should succeed, one should fail
    const succeeded = [saveResult, deleteResult].filter(r => r.status === 'fulfilled');
    const failed = [saveResult, deleteResult].filter(r => r.status === 'rejected');

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
  });

  it('should prevent double submission of form', async () => {
    const user = userEvent.setup();
    let submitCount = 0;
    mockAddWorkout.mockImplementation(async () => {
      submitCount++;
      await sleep(100);
      return { id: 1 };
    });

    render(<AddWorkoutModal onClose={vi.fn()} />);

    await user.type(screen.getByLabelText(/Distance/i), '5');
    await user.type(screen.getByLabelText(/Duration/i), '30');

    const submitButton = screen.getByRole('button', { name: /Add Workout/i });

    // Click multiple times rapidly
    await user.click(submitButton);
    await user.click(submitButton);
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitCount).toBe(1); // Should only submit once
    });
  });
});
```

---

## 📈 Implementation Roadmap

### Week 1: Critical Security (P0)
- Day 1-2: Token Storage & PII Masking Tests (Tests 1-2)
- Day 3: SQL Injection & XSS Tests (Tests 3-4)
- Day 4: CSRF & Authorization Tests (Tests 5-6)
- Day 5: Fix any discovered issues

**Estimated Time**: 5 days
**Expected Coverage Increase**: +15%

### Week 2: GPS Core (P1)
- Day 1-2: GPS Validation Tests (Tests 7)
- Day 3: GPS Permission Flow (Test 8)
- Day 4: GPS Accuracy Tests (Test 9)
- Day 5: Integration and fixes

**Estimated Time**: 5 days
**Expected Coverage Increase**: +20%

### Week 3: Error & Backend (P2-P3)
- Day 1-2: Error Handler Tests (Test 10)
- Day 3-5: Backend API Tests (Test 11)

**Estimated Time**: 5 days
**Expected Coverage Increase**: +10%

### Week 4: Advanced Features (P4-P6)
- Day 1-2: Offline Storage Tests (Test 12)
- Day 3: E2E Flow Tests (Test 13)
- Day 4: Edge Cases Tests (Test 14)
- Day 5: Final review & documentation

**Estimated Time**: 5 days
**Expected Coverage Increase**: +10%

---

## 📊 Expected Outcomes

### Coverage Goals
| Component | Current | Target | Gap |
|-----------|---------|--------|-----|
| Security | 0% | 95% | +95% |
| GPS | 0% | 90% | +90% |
| Error Handling | 40% | 85% | +45% |
| Backend API | 0% | 80% | +80% |
| Offline Sync | 0% | 75% | +75% |
| E2E Flows | 0% | 70% | +70% |
| **Overall** | **~35%** | **~80%** | **+45%** |

### Quality Metrics
- **Bug Detection**: 예상 15-20개 버그 발견
- **Security Issues**: 예상 5-8개 취약점 발견
- **Code Confidence**: Low → High
- **Refactoring Safety**: Risky → Safe
- **Deployment Confidence**: 40% → 90%

---

## 🎓 Test Writing Guidelines

### 1. Test Naming Convention
```typescript
// ✅ Good: Describes behavior and expected outcome
it('should reject workout when distance is negative', () => {});
it('should mask email in audit logs', () => {});
it('should retry on 500 errors up to 3 times', () => {});

// ❌ Bad: Vague or implementation-focused
it('works', () => {});
it('test distance', () => {});
it('calls the API', () => {});
```

### 2. AAA Pattern (Arrange-Act-Assert)
```typescript
it('should calculate correct pace', () => {
  // Arrange
  const distance = 5;
  const duration = 30;

  // Act
  const pace = calculatePace(duration, distance);

  // Assert
  expect(pace).toBe(6);
});
```

### 3. Test Independence
```typescript
// ✅ Good: Each test is independent
describe('Workout API', () => {
  beforeEach(() => {
    // Reset state before each test
    mockFetch.mockReset();
    localStorage.clear();
  });

  it('test 1', () => { /* ... */ });
  it('test 2', () => { /* ... */ });
});

// ❌ Bad: Tests depend on each other
it('creates workout', () => {
  globalWorkout = createWorkout();
});

it('deletes workout', () => {
  deleteWorkout(globalWorkout.id); // Depends on previous test
});
```

---

## 🚀 Next Steps

1. **Review and Prioritize**: Team reviews this gap analysis
2. **Assign Ownership**: Assign test categories to team members
3. **Create Tracking**: Add tests to sprint backlog
4. **Weekly Reviews**: Track progress in weekly standup
5. **Celebrate Wins**: Recognize coverage milestones

**Total Estimated Effort**: 20 days (4 weeks for 1 developer, or 2 weeks for 2 developers working in parallel)

---

**Last Updated**: 2025-10-16
**Next Review**: After Week 2 completion
