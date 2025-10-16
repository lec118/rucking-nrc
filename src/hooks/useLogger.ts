import { useCallback } from 'react';

type LogLevel = 'info' | 'warn' | 'error' | 'event';

type Primitive = string | number | boolean | null | undefined;
type LogPayload = Record<string, unknown> | Primitive;

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'auth',
  'email',
  'phone',
  'latitude',
  'longitude',
  'lat',
  'lon',
  'weight',
  'route'
]);

const MASK = '***';

function maskEmail(value: string): string {
  const [local, domain] = value.split('@');
  if (!domain) {
    return maskPrimitive(value);
  }

  if (local.length <= 2) {
    return `${MASK}@${domain}`;
  }

  return `${local.slice(0, 2)}${MASK}${local.slice(-1)}@${domain}`;
}

function maskPrimitive(value: Primitive): Primitive {
  if (typeof value === 'string') {
    if (value.includes('@')) {
      return maskEmail(value);
    }

    if (value.length <= 4) {
      return MASK;
    }

    return `${value.slice(0, 2)}${MASK}${value.slice(-2)}`;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? MASK : value;
  }

  return MASK;
}

export function maskSensitiveData(payload: LogPayload): LogPayload {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (typeof payload !== 'object') {
    return maskPrimitive(payload);
  }

  if (Array.isArray(payload)) {
    return payload.map((value) => maskSensitiveData(value));
  }

  return Object.entries(payload).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (SENSITIVE_KEYS.has(key)) {
      if (key === 'route' && Array.isArray(value)) {
        acc[key] = `[route:${value.length} points]`;
      } else {
        acc[key] = maskSensitiveData(value as Primitive);
      }
      return acc;
    }

    if (value && typeof value === 'object') {
      acc[key] = maskSensitiveData(value as LogPayload);
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});
}

function emitLog(level: LogLevel, namespace: string, message: string, meta?: LogPayload) {
  const timestamp = new Date().toISOString();
  const maskedMeta = meta ? maskSensitiveData(meta) : undefined;

  const payload = {
    timestamp,
    namespace,
    level,
    message,
    meta: maskedMeta
  };

  // Placeholder for Sentry/monitoring integration.
  if (level === 'error') {
    console.error('[GoodRuck]', payload);
  } else if (level === 'warn') {
    console.warn('[GoodRuck]', payload);
  } else {
    console.info('[GoodRuck]', payload);
  }

  return payload;
}

export function useLogger(namespace = 'app') {
  const logInfo = useCallback(
    (message: string, meta?: LogPayload) => emitLog('info', namespace, message, meta),
    [namespace]
  );

  const logEvent = useCallback(
    (message: string, meta?: LogPayload) => emitLog('event', namespace, message, meta),
    [namespace]
  );

  const logWarn = useCallback(
    (message: string, meta?: LogPayload) => emitLog('warn', namespace, message, meta),
    [namespace]
  );

  const logError = useCallback(
    (message: string, meta?: LogPayload) => emitLog('error', namespace, message, meta),
    [namespace]
  );

  return {
    logInfo,
    logEvent,
    logWarn,
    logError
  };
}
