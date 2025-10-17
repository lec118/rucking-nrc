# ADR-001: Security Architecture and Threat Model

**Status**: Proposed
**Date**: 2024-01-15
**Decision Makers**: Engineering Team
**Context**: Good Ruck MVP - GPS-based Rucking Tracking Application

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Threat Model (STRIDE Analysis)](#threat-model-stride-analysis)
4. [Security Controls](#security-controls)
5. [Authentication & Authorization Architecture](#authentication--authorization-architecture)
6. [Token Management Policy](#token-management-policy)
7. [Logging and Sensitive Data Handling](#logging-and-sensitive-data-handling)
8. [Environment-Specific Security](#environment-specific-security)
9. [Risk Assessment Matrix](#risk-assessment-matrix)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

This ADR documents the security architecture, threat model, and security controls for the Good Ruck MVP application. The system handles sensitive user data including GPS location history, personal workout metrics, and authentication credentials. This document uses the STRIDE threat modeling framework to identify and mitigate security risks.

**Key Decisions**:
- JWT-based authentication with refresh token rotation
- Role-based access control (RBAC) for resource ownership
- End-to-end encryption for location data in transit
- No storage of raw GPS coordinates on client beyond active session
- Comprehensive audit logging with PII masking

---

## System Overview

### Architecture Components

```
┌──────────────────────────────────────────────────────────────┐
│                         User Browser                          │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │  React SPA │  │ TokenStorage│  │  GPS Geolocation API │  │
│  │  (Vite)    │  │  (Memory +  │  │                      │  │
│  │            │  │ localStorage)│  │                      │  │
│  └────────────┘  └─────────────┘  └──────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
          │                                          │
          │ HTTPS (TLS 1.3)                         │
          │ Bearer Token                             │
          ▼                                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    Railway / Vercel CDN                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                  Express.js API Server                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │  │
│  │  │ CORS Filter  │  │  JWT Verify  │  │Rate Limiter  │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │  │
│  │  │ Input Valid. │  │Authorization │  │Error Handler │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                                │
│                              ▼                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         SQLite Database (better-sqlite3)               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │  │
│  │  │    users     │  │   workouts   │  │refresh_tokens│ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Registration/Login** → JWT Token Pair (Access + Refresh)
2. **GPS Tracking** → Real-time coordinates → Route array
3. **Workout Submission** → Validated data → Database with user_id
4. **Data Retrieval** → Authorization check → Filtered by user_id

### Assets to Protect

| Asset | Sensitivity | Impact if Compromised |
|-------|-------------|----------------------|
| **GPS Location History** | HIGH | Privacy violation, stalking risk |
| **User Credentials** | CRITICAL | Account takeover, data breach |
| **Workout Metrics** | MEDIUM | Privacy violation, profiling |
| **Session Tokens** | CRITICAL | Impersonation, unauthorized access |
| **API Keys** | HIGH | Service abuse, data exfiltration |

---

## Threat Model (STRIDE Analysis)

### 1. Spoofing (Identity)

#### Threats

| ID | Threat | Attack Vector | Likelihood | Impact |
|----|--------|---------------|------------|--------|
| S1 | **Credential Theft** | Phishing, keylogging | MEDIUM | CRITICAL |
| S2 | **Token Theft** | XSS, localStorage access | HIGH | CRITICAL |
| S3 | **Session Hijacking** | Network sniffing (MITM) | LOW | HIGH |
| S4 | **GPS Spoofing** | Fake location data submission | MEDIUM | LOW |

#### Mitigations

- **S1**: Strong password policy, rate limiting, multi-factor authentication (future)
- **S2**: Store access tokens in memory only, httpOnly cookies for refresh tokens (future)
- **S3**: HTTPS only, HSTS headers, certificate pinning (mobile app future)
- **S4**: GPS accuracy validation, speed checks, route anomaly detection

---

### 2. Tampering (Data Integrity)

#### Threats

| ID | Threat | Attack Vector | Likelihood | Impact |
|----|--------|---------------|------------|--------|
| T1 | **Workout Data Manipulation** | Direct API calls, SQL injection | MEDIUM | MEDIUM |
| T2 | **Route Falsification** | Modified GPS coordinates | MEDIUM | LOW |
| T3 | **Token Manipulation** | JWT payload modification | LOW | CRITICAL |
| T4 | **Database Corruption** | Direct file access, SQL injection | LOW | HIGH |

#### Mitigations

- **T1**: Input validation (Zod), parameterized queries, authorization checks
- **T2**: GPS validation rules, distance/speed thresholds, timestamp verification
- **T3**: JWT signature verification, token expiry, secret rotation
- **T4**: File permissions, database backups, WAL mode

---

### 3. Repudiation (Non-repudiation)

#### Threats

| ID | Threat | Attack Vector | Likelihood | Impact |
|----|--------|---------------|------------|--------|
| R1 | **Deny Workout Submission** | No audit trail | MEDIUM | LOW |
| R2 | **Deny Account Actions** | No authentication logs | LOW | MEDIUM |
| R3 | **Deny GPS Tracking** | No location consent log | HIGH | MEDIUM |

#### Mitigations

- **R1**: Audit logs for all mutations, timestamp all records
- **R2**: Authentication event logging (login, logout, token refresh)
- **R3**: Explicit GPS permission tracking, consent timestamp

---

### 4. Information Disclosure (Confidentiality)

#### Threats

| ID | Threat | Attack Vector | Likelihood | Impact |
|----|--------|---------------|------------|--------|
| I1 | **GPS Data Leakage** | Unauthorized API access | HIGH | HIGH |
| I2 | **Credential Exposure** | Logs, error messages, source code | MEDIUM | CRITICAL |
| I3 | **User Enumeration** | Login error messages | HIGH | LOW |
| I4 | **API Key Leakage** | Client-side code, public repos | MEDIUM | HIGH |

#### Mitigations

- **I1**: Authorization on all endpoints, owner-only access, no public GPS data
- **I2**: Credential hashing (bcrypt), no secrets in logs, .env for secrets
- **I3**: Generic error messages, rate limiting on auth endpoints
- **I4**: Environment variables, .gitignore for .env, key rotation policy

---

### 5. Denial of Service (Availability)

#### Threats

| ID | Threat | Attack Vector | Likelihood | Impact |
|----|--------|---------------|------------|--------|
| D1 | **API Flooding** | Rapid requests, DDoS | MEDIUM | HIGH |
| D2 | **Database Exhaustion** | Large route uploads | LOW | MEDIUM |
| D3 | **GPS Spam** | Continuous tracking without stop | LOW | LOW |
| D4 | **Token Exhaustion** | Refresh token spam | LOW | MEDIUM |

#### Mitigations

- **D1**: Rate limiting (express-rate-limit), CDN protection (Cloudflare future)
- **D2**: Payload size limits, route point caps (10,000 max), pagination
- **D3**: Client-side max duration, auto-stop after 24h
- **D4**: Refresh token rate limits, max active tokens per user

---

### 6. Elevation of Privilege (Authorization)

#### Threats

| ID | Threat | Attack Vector | Likelihood | Impact |
|----|--------|---------------|------------|--------|
| E1 | **Access Other User's Data** | Missing authorization checks | HIGH | CRITICAL |
| E2 | **Admin Privilege Escalation** | SQL injection, JWT manipulation | LOW | CRITICAL |
| E3 | **Unauthorized Deletion** | Missing ownership validation | MEDIUM | HIGH |

#### Mitigations

- **E1**: Ownership checks on all resources, userId in JWT, filter by user_id
- **E2**: Parameterized queries, JWT signature verification, role validation
- **E3**: Double-check ownership before delete/update, soft deletes

---

## Security Controls

### Summary Matrix

| Control | Implementation | Status | Priority |
|---------|----------------|--------|----------|
| **Authentication** | JWT with refresh tokens | 🟡 To Implement | CRITICAL |
| **Authorization** | Resource ownership checks | 🟡 To Implement | CRITICAL |
| **Input Validation** | Zod schemas | 🟡 To Implement | HIGH |
| **HTTPS/TLS** | Railway/Vercel enforced | ✅ Implemented | CRITICAL |
| **CORS** | Whitelist-based | 🟡 To Implement | HIGH |
| **Rate Limiting** | express-rate-limit | 🟡 To Implement | MEDIUM |
| **CSRF Protection** | Token-based | 🟡 To Implement | MEDIUM |
| **SQL Injection** | Parameterized queries | ✅ Implemented | CRITICAL |
| **XSS Protection** | Input sanitization | 🟡 To Implement | HIGH |
| **Sensitive Data Logging** | PII masking | 🟡 To Implement | HIGH |
| **Dependency Scanning** | npm audit, Snyk | 🟡 To Implement | MEDIUM |
| **Error Handling** | Generic messages | 🟡 To Implement | MEDIUM |

---

## Authentication & Authorization Architecture

### Authentication Flow

```
┌─────────────┐                                    ┌─────────────┐
│   Client    │                                    │   Server    │
└─────────────┘                                    └─────────────┘
      │                                                    │
      │  1. POST /api/auth/register                       │
      │     { email, password, name }                     │
      ├──────────────────────────────────────────────────►│
      │                                                    │
      │                                       2. Validate input
      │                                       3. Hash password (bcrypt)
      │                                       4. Create user in DB
      │                                       5. Generate JWT pair
      │                                                    │
      │  6. { accessToken, refreshToken, user }           │
      │◄───────────────────────────────────────────────────┤
      │                                                    │
   7. Store:                                               │
      - accessToken (memory)                               │
      - refreshToken (localStorage)                        │
      │                                                    │
      │                                                    │
      │  8. POST /api/auth/login                          │
      │     { email, password }                           │
      ├──────────────────────────────────────────────────►│
      │                                                    │
      │                                       9. Find user by email
      │                                       10. Verify password
      │                                       11. Generate JWT pair
      │                                       12. Store refresh token hash
      │                                                    │
      │  13. { accessToken, refreshToken, user }          │
      │◄───────────────────────────────────────────────────┤
      │                                                    │
      │                                                    │
      │  14. GET /api/workouts                            │
      │      Authorization: Bearer {accessToken}          │
      ├──────────────────────────────────────────────────►│
      │                                                    │
      │                                       15. Verify JWT signature
      │                                       16. Check expiry
      │                                       17. Extract userId
      │                                       18. Query workouts
      │                                           WHERE user_id = userId
      │                                                    │
      │  19. { workouts: [...] }                          │
      │◄───────────────────────────────────────────────────┤
      │                                                    │
      │                                                    │
      │  20. GET /api/workouts (token expired)            │
      │      Authorization: Bearer {expired_token}        │
      ├──────────────────────────────────────────────────►│
      │                                                    │
      │                                       21. JWT expired error
      │                                                    │
      │  22. 401 Unauthorized                             │
      │      { error: 'TOKEN_EXPIRED' }                   │
      │◄───────────────────────────────────────────────────┤
      │                                                    │
   23. Client detects                                      │
       TOKEN_EXPIRED                                       │
      │                                                    │
      │  24. POST /api/auth/refresh                       │
      │      { refreshToken }                             │
      ├──────────────────────────────────────────────────►│
      │                                                    │
      │                                       25. Verify refresh token
      │                                       26. Check if revoked
      │                                       27. Generate new JWT pair
      │                                       28. Rotate refresh token
      │                                                    │
      │  29. { accessToken, refreshToken }                │
      │◄───────────────────────────────────────────────────┤
      │                                                    │
   30. Update tokens                                       │
   31. Retry original request                              │
      │                                                    │
      │                                                    │
      │  32. POST /api/auth/logout                        │
      │      { refreshToken }                             │
      ├──────────────────────────────────────────────────►│
      │                                                    │
      │                                       33. Revoke refresh token
      │                                       34. Clear session
      │                                                    │
      │  35. 200 OK                                       │
      │◄───────────────────────────────────────────────────┤
      │                                                    │
   36. Clear tokens                                        │
      │                                                    │
```

### Authorization Flow

```
┌─────────────┐                                    ┌─────────────┐
│   Client    │                                    │   Server    │
└─────────────┘                                    └─────────────┘
      │                                                    │
      │  DELETE /api/workouts/123                         │
      │  Authorization: Bearer {token}                    │
      ├──────────────────────────────────────────────────►│
      │                                                    │
      │                                    ┌───────────────┴───────────┐
      │                                    │ 1. Authentication Check   │
      │                                    │    - Verify JWT signature │
      │                                    │    - Check expiry         │
      │                                    │    - Extract userId       │
      │                                    └───────────────┬───────────┘
      │                                                    │
      │                                    ┌───────────────┴───────────┐
      │                                    │ 2. Authorization Check    │
      │                                    │    - Query workout by id  │
      │                                    │    - Compare user_id      │
      │                                    │    - IF match: Allow      │
      │                                    │    - ELSE: 403 Forbidden  │
      │                                    └───────────────┬───────────┘
      │                                                    │
      │  200 OK (if authorized)                           │
      │  403 Forbidden (if not owner)                     │
      │◄───────────────────────────────────────────────────┤
      │                                                    │
```

### JWT Payload Structure

```json
{
  "accessToken": {
    "userId": "uuid-v4",
    "email": "user@example.com",
    "type": "access",
    "iat": 1705315200,
    "exp": 1705316100
  },
  "refreshToken": {
    "userId": "uuid-v4",
    "tokenId": "uuid-v4",
    "type": "refresh",
    "iat": 1705315200,
    "exp": 1705920000
  }
}
```

### Database Schema (Security-Enhanced)

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- UUID v4
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,      -- bcrypt with cost factor 12
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active BOOLEAN DEFAULT 1,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until DATETIME
);

CREATE INDEX idx_users_email ON users(email);

-- Workouts table (with user relationship)
CREATE TABLE workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,            -- Foreign key to users
  date TEXT NOT NULL,
  title TEXT,
  distance REAL NOT NULL,
  duration REAL NOT NULL,
  pace REAL,
  weight REAL,
  route TEXT,                       -- JSON array (encrypted future)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_date ON workouts(date);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,              -- UUID v4 (tokenId in JWT)
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,         -- SHA-256 hash of token
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME,
  is_revoked BOOLEAN DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Audit log table
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,             -- LOGIN, LOGOUT, CREATE_WORKOUT, etc.
  resource_type TEXT,               -- USER, WORKOUT, etc.
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT,                      -- SUCCESS, FAILURE
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

---

## Token Management Policy

### Token Types and Lifecycles

| Token Type | Storage Location | Lifetime | Rotation | Revocable |
|------------|------------------|----------|----------|-----------|
| **Access Token** | Memory (React state) | 15 minutes | On refresh | No (short-lived) |
| **Refresh Token** | localStorage (encrypted future) | 7 days | On use (auto-rotate) | Yes (database) |
| **CSRF Token** | HTTP header (generated per request) | 1 hour | Per request | No |

### Token Storage Policy

#### Access Token (Frontend)

```typescript
// ❌ BAD: Persistent storage
localStorage.setItem('accessToken', token); // XSS vulnerable

// ✅ GOOD: Memory only
class TokenStorage {
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token; // Cleared on page refresh
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clearAccessToken() {
    this.accessToken = null;
  }
}
```

#### Refresh Token (Frontend)

```typescript
// Current: localStorage (acceptable for MVP)
// Future: httpOnly cookie (more secure)

class TokenStorage {
  setRefreshToken(token: string, expiresAt: number) {
    const data = {
      token: token, // TODO: Encrypt with Web Crypto API
      expiresAt
    };
    localStorage.setItem('__refresh_token__', JSON.stringify(data));
  }

  getRefreshToken(): string | null {
    const data = localStorage.getItem('__refresh_token__');
    if (!data) return null;

    const parsed = JSON.parse(data);

    // Check expiry
    if (Date.now() > parsed.expiresAt) {
      this.clearRefreshToken();
      return null;
    }

    return parsed.token;
  }

  clearRefreshToken() {
    localStorage.removeItem('__refresh_token__');
  }
}
```

#### Refresh Token (Backend)

```javascript
// Store hash, not raw token
const crypto = require('crypto');

function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

// On token creation
const refreshToken = jwt.sign({ userId, tokenId }, REFRESH_SECRET, { expiresIn: '7d' });
const tokenHash = hashToken(refreshToken);

db.prepare(`
  INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
  VALUES (?, ?, ?, ?)
`).run(tokenId, userId, tokenHash, expiresAt);

// On token verification
const tokenHash = hashToken(providedToken);
const storedToken = db.prepare(`
  SELECT * FROM refresh_tokens
  WHERE token_hash = ? AND is_revoked = 0 AND expires_at > ?
`).get(tokenHash, Date.now());
```

### Token Rotation Strategy

**Automatic Rotation on Refresh**:
```javascript
// POST /api/auth/refresh
async function refreshToken(req, res) {
  const { refreshToken } = req.body;

  // 1. Verify old token
  const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
  const tokenHash = hashToken(refreshToken);

  // 2. Check if revoked
  const storedToken = db.prepare(`
    SELECT * FROM refresh_tokens WHERE token_hash = ? AND is_revoked = 0
  `).get(tokenHash);

  if (!storedToken) {
    throw new Error('Token revoked or invalid');
  }

  // 3. Revoke old token
  db.prepare(`
    UPDATE refresh_tokens SET is_revoked = 1, revoked_at = ? WHERE id = ?
  `).run(new Date().toISOString(), storedToken.id);

  // 4. Generate new token pair
  const newTokenId = uuidv4();
  const newAccessToken = jwt.sign(
    { userId: decoded.userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  const newRefreshToken = jwt.sign(
    { userId: decoded.userId, tokenId: newTokenId, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // 5. Store new refresh token
  const newTokenHash = hashToken(newRefreshToken);
  db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(newTokenId, decoded.userId, newTokenHash, ...);

  // 6. Return new tokens
  res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
}
```

### Token Revocation

**Manual Revocation (Logout)**:
```javascript
// POST /api/auth/logout
async function logout(req, res) {
  const { refreshToken } = req.body;
  const tokenHash = hashToken(refreshToken);

  db.prepare(`
    UPDATE refresh_tokens
    SET is_revoked = 1, revoked_at = ?
    WHERE token_hash = ?
  `).run(new Date().toISOString(), tokenHash);

  res.json({ message: 'Logged out successfully' });
}
```

**Revoke All User Tokens**:
```javascript
// POST /api/auth/logout-all
async function logoutAll(req, res) {
  const { userId } = req; // From authenticated middleware

  db.prepare(`
    UPDATE refresh_tokens
    SET is_revoked = 1, revoked_at = ?
    WHERE user_id = ? AND is_revoked = 0
  `).run(new Date().toISOString(), userId);

  res.json({ message: 'All sessions terminated' });
}
```

### Token Expiry Policy

| Scenario | Access Token | Refresh Token | Action |
|----------|--------------|---------------|--------|
| **Normal use** | 15 min | 7 days | Auto-refresh on expiry |
| **Inactivity** | Expires | Expires after 7 days | Re-login required |
| **Suspicious activity** | Revoke all | Revoke all | Force re-authentication |
| **Password change** | Revoke all | Revoke all | Re-login required |
| **User logout** | Clear | Revoke | Manual action |
| **Concurrent sessions** | Allow | Max 5 tokens | Revoke oldest |

### Secret Management

```bash
# .env.production (NEVER commit)
JWT_SECRET=<64-char random string>
JWT_REFRESH_SECRET=<64-char random string, different from JWT_SECRET>

# Generate secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Secret Rotation Schedule**:
- **Access token secret**: Rotate every 90 days (requires re-login)
- **Refresh token secret**: Rotate every 90 days (invalidates all sessions)
- **Emergency rotation**: Immediately on suspected compromise

---

## Logging and Sensitive Data Handling

### Logging Policy

#### What to Log

```javascript
// ✅ GOOD: Log these events
const auditableEvents = [
  'USER_REGISTRATION',
  'USER_LOGIN',
  'USER_LOGOUT',
  'PASSWORD_CHANGE',
  'WORKOUT_CREATE',
  'WORKOUT_UPDATE',
  'WORKOUT_DELETE',
  'TOKEN_REFRESH',
  'TOKEN_REVOCATION',
  'FAILED_LOGIN_ATTEMPT',
  'GPS_PERMISSION_GRANTED',
  'GPS_PERMISSION_DENIED'
];
```

#### What NOT to Log

```javascript
// ❌ BAD: Never log these
const forbiddenData = [
  'passwords (even hashed)',
  'JWT tokens (full)',
  'API keys',
  'Exact GPS coordinates (log area instead)',
  'Full credit card numbers',
  'Social security numbers',
  'Session IDs (full)'
];
```

### PII Masking Rules

```javascript
// server/src/utils/logger.js

/**
 * Mask sensitive fields in log output
 */
function maskSensitiveData(data) {
  const masked = { ...data };

  // Mask email
  if (masked.email) {
    masked.email = maskEmail(masked.email);
  }

  // Mask GPS coordinates (log region only)
  if (masked.route) {
    masked.route = `[${masked.route.length} GPS points]`;
  }

  if (masked.latitude && masked.longitude) {
    masked.location = `[${Math.floor(masked.latitude)}, ${Math.floor(masked.longitude)}] (rounded)`;
    delete masked.latitude;
    delete masked.longitude;
  }

  // Mask tokens (show first/last 4 chars only)
  if (masked.token) {
    masked.token = maskToken(masked.token);
  }

  // Mask IP address (show subnet only)
  if (masked.ip) {
    masked.ip = masked.ip.replace(/\.\d+$/, '.xxx');
  }

  // Remove password fields entirely
  delete masked.password;
  delete masked.password_hash;

  return masked;
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  const maskedLocal = local.slice(0, 2) + '***' + local.slice(-1);
  return `${maskedLocal}@${domain}`;
}

function maskToken(token) {
  if (token.length < 8) return '***';
  return token.slice(0, 4) + '...' + token.slice(-4);
}

/**
 * Structured logger
 */
class Logger {
  static log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata: maskSensitiveData(metadata),
      environment: process.env.NODE_ENV
    };

    // In production, send to logging service (e.g., Datadog, CloudWatch)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to logging service
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(logEntry);
    }
  }

  static info(message, metadata) {
    this.log('INFO', message, metadata);
  }

  static warn(message, metadata) {
    this.log('WARN', message, metadata);
  }

  static error(message, metadata) {
    this.log('ERROR', message, metadata);
  }

  static audit(action, metadata) {
    this.log('AUDIT', action, {
      ...metadata,
      auditType: action
    });
  }
}

module.exports = { Logger, maskSensitiveData };
```

### Audit Logging Examples

```javascript
// server/src/middleware/audit.js

function auditMiddleware(req, res, next) {
  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    // Log after response is sent
    logAuditEvent(req, res, data);
    originalSend.call(this, data);
  };

  next();
}

function logAuditEvent(req, res, responseData) {
  const auditLog = {
    user_id: req.userId || null,
    action: `${req.method} ${req.path}`,
    resource_type: extractResourceType(req.path),
    resource_id: req.params.id || null,
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
    status: res.statusCode >= 400 ? 'FAILURE' : 'SUCCESS',
    error_message: res.statusCode >= 400 ? responseData?.error : null
  };

  db.prepare(`
    INSERT INTO audit_logs
    (user_id, action, resource_type, resource_id, ip_address, user_agent, status, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    auditLog.user_id,
    auditLog.action,
    auditLog.resource_type,
    auditLog.resource_id,
    auditLog.ip_address,
    auditLog.user_agent,
    auditLog.status,
    auditLog.error_message
  );
}

function extractResourceType(path) {
  if (path.includes('/workouts')) return 'WORKOUT';
  if (path.includes('/auth')) return 'AUTH';
  if (path.includes('/users')) return 'USER';
  return 'UNKNOWN';
}

module.exports = { auditMiddleware };
```

### Log Retention Policy

| Environment | Retention Period | Storage | Purpose |
|-------------|------------------|---------|---------|
| **Development** | 7 days | Local console | Debugging |
| **Staging** | 30 days | CloudWatch Logs | Testing |
| **Production** | 90 days | CloudWatch Logs + S3 | Compliance, forensics |
| **Audit Logs** | 1 year | Database + S3 | Compliance |

---

## Environment-Specific Security

### Local Development

```bash
# .env.local
NODE_ENV=development
PORT=3001
DATABASE_URL=./dev.db

# Weak secrets OK for local dev (faster)
JWT_SECRET=dev-secret-key-not-for-production
JWT_REFRESH_SECRET=dev-refresh-secret-key

# CORS: Allow all for convenience
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Logging: Verbose
LOG_LEVEL=debug

# Rate limiting: Disabled
RATE_LIMIT_ENABLED=false

# Security headers: Relaxed
SECURITY_HEADERS_STRICT=false
```

**Security Posture**:
- ⚠️ Weak secrets (acceptable)
- ⚠️ CORS wide open (acceptable)
- ⚠️ No rate limiting (acceptable)
- ⚠️ Verbose logging (acceptable)
- ✅ HTTPS not required (localhost)

---

### Staging Environment

```bash
# .env.staging
NODE_ENV=staging
PORT=3001
DATABASE_URL=postgresql://staging-db-url

# Strong secrets (real secrets, but separate from prod)
JWT_SECRET=<64-char random string>
JWT_REFRESH_SECRET=<64-char random string>

# CORS: Staging frontend only
ALLOWED_ORIGINS=https://staging.goodruck.app

# Logging: Info level
LOG_LEVEL=info

# Rate limiting: Enabled but lenient
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Security headers: Enforced
SECURITY_HEADERS_STRICT=true

# Monitoring
SENTRY_DSN=<staging-sentry-dsn>
```

**Security Posture**:
- ✅ Strong secrets (unique to staging)
- ✅ CORS restricted to staging domain
- ✅ Rate limiting enabled
- ✅ Moderate logging
- ✅ HTTPS enforced
- ✅ Error tracking enabled

**Differences from Production**:
- More lenient rate limits (100 req/min vs 30 req/min)
- More detailed error messages (for testing)
- Shorter token expiry (for testing refresh flow)

---

### Production Environment

```bash
# .env.production
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://prod-db-url

# Strong, rotated secrets
JWT_SECRET=<64-char random string, rotated every 90 days>
JWT_REFRESH_SECRET=<64-char random string, rotated every 90 days>

# CORS: Production frontend only
ALLOWED_ORIGINS=https://goodruck.app,https://www.goodruck.app

# Logging: Warn level (errors and warnings only)
LOG_LEVEL=warn

# Rate limiting: Strict
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=30

# Auth rate limiting: Very strict
AUTH_RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
AUTH_RATE_LIMIT_MAX_REQUESTS=5    # 5 login attempts per 15 min

# Security headers: Maximum strictness
SECURITY_HEADERS_STRICT=true
HSTS_ENABLED=true
HSTS_MAX_AGE=31536000  # 1 year

# Monitoring
SENTRY_DSN=<production-sentry-dsn>
SENTRY_ENVIRONMENT=production

# Database backups
DATABASE_BACKUP_ENABLED=true
DATABASE_BACKUP_INTERVAL=86400  # Daily

# Feature flags
ENABLE_GPS_TRACKING=true
ENABLE_ROUTE_EXPORT=true
```

**Security Posture**:
- ✅ Maximum strength secrets
- ✅ CORS locked to production domain
- ✅ Strict rate limiting
- ✅ Minimal logging (no PII)
- ✅ HTTPS enforced with HSTS
- ✅ Error tracking with sanitized data
- ✅ Daily database backups
- ✅ All security headers enabled

**Production-Only Features**:
- HSTS (HTTP Strict Transport Security)
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Database encryption at rest (future)
- WAF (Web Application Firewall) via Cloudflare (future)

---

### Environment Comparison Matrix

| Feature | Local | Staging | Production |
|---------|-------|---------|------------|
| **HTTPS** | ❌ Optional | ✅ Required | ✅ Required |
| **HSTS** | ❌ Disabled | ⚠️ Optional | ✅ Enabled |
| **CORS** | ⚠️ Open | ✅ Restricted | ✅ Strict |
| **Rate Limiting** | ❌ Disabled | ✅ Lenient | ✅ Strict |
| **Auth Rate Limit** | ❌ Disabled | ✅ 10/15min | ✅ 5/15min |
| **Token Expiry** | 1 hour | 15 minutes | 15 minutes |
| **Refresh Expiry** | 30 days | 7 days | 7 days |
| **Logging Level** | DEBUG | INFO | WARN |
| **Error Details** | ✅ Full | ⚠️ Partial | ❌ Generic |
| **Secret Strength** | ⚠️ Weak | ✅ Strong | ✅ Strong |
| **Database Backups** | ❌ None | ⚠️ Weekly | ✅ Daily |
| **Monitoring** | ❌ None | ⚠️ Basic | ✅ Full |
| **CSP** | ❌ Disabled | ⚠️ Report-only | ✅ Enforced |

---

## Risk Assessment Matrix

### Residual Risks (Post-Mitigation)

| Risk | Likelihood | Impact | Severity | Mitigation Status | Acceptance |
|------|------------|--------|----------|-------------------|------------|
| **Account Takeover** | LOW | CRITICAL | HIGH | ✅ JWT + Rate limit | Accepted |
| **GPS Data Breach** | LOW | HIGH | MEDIUM | ✅ Authorization checks | Accepted |
| **XSS Attack** | MEDIUM | HIGH | MEDIUM | 🟡 Input sanitization | Monitor |
| **SQL Injection** | LOW | CRITICAL | MEDIUM | ✅ Parameterized queries | Accepted |
| **DDoS Attack** | MEDIUM | HIGH | MEDIUM | 🟡 Rate limiting | Monitor |
| **Token Theft** | MEDIUM | CRITICAL | HIGH | 🟡 Memory storage | Future: httpOnly cookies |
| **Insider Threat** | LOW | HIGH | MEDIUM | 🟡 Audit logging | Accepted |
| **Dependency Vuln** | MEDIUM | MEDIUM | MEDIUM | 🟡 npm audit + Snyk | Monitor |

### Risk Acceptance

**Accepted Risks** (MVP Phase):
1. **No MFA**: Multi-factor authentication deferred to post-MVP
2. **localStorage for Refresh Token**: httpOnly cookies deferred to post-MVP
3. **SQLite Database**: No built-in encryption; acceptable for MVP, migrate to PostgreSQL in v2
4. **No Rate Limiting on Non-Auth Endpoints**: Acceptable for low traffic; monitor and add if needed
5. **No WAF**: Web Application Firewall deferred to higher traffic phase

---

## Implementation Roadmap

### Phase 1: Critical Security (Week 1-2)
- [ ] Implement JWT authentication
- [ ] Add bcrypt password hashing
- [ ] Create refresh token rotation
- [ ] Add authorization checks (ownership)
- [ ] Implement input validation (Zod)
- [ ] Configure CORS properly

### Phase 2: Defense in Depth (Week 2-3)
- [ ] Add rate limiting (express-rate-limit)
- [ ] Implement CSRF protection
- [ ] Add security headers (helmet)
- [ ] Create audit logging system
- [ ] Implement PII masking in logs
- [ ] Setup error handling (no info disclosure)

### Phase 3: Monitoring & Response (Week 3-4)
- [ ] Integrate Sentry for error tracking
- [ ] Setup dependency scanning (GitHub Actions)
- [ ] Create security incident response plan
- [ ] Add suspicious activity detection
- [ ] Implement failed login lockout
- [ ] Setup automated security testing

### Phase 4: Hardening (Week 4+)
- [ ] Migrate refresh tokens to httpOnly cookies
- [ ] Add Content Security Policy (CSP)
- [ ] Implement database encryption at rest
- [ ] Add multi-factor authentication (MFA)
- [ ] Setup Web Application Firewall (WAF)
- [ ] Perform penetration testing

---

## Appendices

### A. Security Checklist (Pre-Deployment)

```markdown
## Backend
- [ ] All secrets in environment variables (not code)
- [ ] .env files in .gitignore
- [ ] JWT secrets are 64+ characters
- [ ] Passwords hashed with bcrypt (cost factor 12+)
- [ ] All database queries use parameterized queries
- [ ] CORS configured with whitelist
- [ ] Rate limiting enabled on all endpoints
- [ ] Authentication required on protected endpoints
- [ ] Authorization checks on all resources
- [ ] Input validation on all mutations
- [ ] Error messages don't leak implementation details
- [ ] Sensitive data masked in logs
- [ ] Audit logging enabled
- [ ] HTTPS enforced
- [ ] Security headers configured (helmet)
- [ ] Dependencies audited (npm audit)
- [ ] Database backups scheduled

## Frontend
- [ ] Access tokens stored in memory only
- [ ] Refresh tokens in localStorage (or httpOnly cookie)
- [ ] No secrets in client-side code
- [ ] API calls use HTTPS only
- [ ] CSRF token sent with state-changing requests
- [ ] User input sanitized (XSS prevention)
- [ ] Error messages user-friendly (no stack traces)
- [ ] Token refresh implemented
- [ ] Logout clears all tokens
- [ ] GPS permission explicitly requested
- [ ] Sensitive data not logged to console

## Infrastructure
- [ ] HTTPS certificate valid
- [ ] HSTS enabled (production)
- [ ] Database not publicly accessible
- [ ] Environment variables set in Railway/Vercel
- [ ] Monitoring and alerting configured
- [ ] Log retention policy implemented
- [ ] Backup and recovery tested
- [ ] Incident response plan documented
```

### B. Security Incident Response Plan

**Severity Levels**:
- **P0 - Critical**: Active breach, data loss, complete service outage
- **P1 - High**: Potential breach, vulnerability discovered, partial outage
- **P2 - Medium**: Security bug, non-critical vulnerability
- **P3 - Low**: Security improvement, best practice violation

**Response Procedure**:
1. **Detection**: Monitoring alerts, user reports, security scan
2. **Assessment**: Determine severity, scope, and impact
3. **Containment**: Isolate affected systems, revoke compromised tokens
4. **Eradication**: Fix vulnerability, remove malicious code
5. **Recovery**: Restore services, verify integrity
6. **Post-Incident**: Document lessons learned, update procedures

**Contacts**:
- Engineering Lead: [email]
- Security Officer: [email]
- Infrastructure: [email]

### C. Compliance Considerations

**GDPR (if serving EU users)**:
- Right to access: Export user data API
- Right to erasure: Delete user account + all data
- Right to portability: Export data in JSON format
- Consent: Explicit GPS permission
- Data minimization: Only collect necessary GPS points

**CCPA (if serving California users)**:
- Similar requirements to GDPR
- Opt-out of data sale (not applicable - we don't sell data)

---

## Decision Log

### ADR-001-01: JWT over Session-Based Auth
**Decision**: Use JWT (JSON Web Tokens) instead of session cookies
**Rationale**: Stateless, scalable, works with mobile apps, easier CORS handling
**Trade-offs**: Cannot invalidate access tokens immediately (mitigated by short expiry)

### ADR-001-02: bcrypt for Password Hashing
**Decision**: Use bcrypt with cost factor 12
**Rationale**: Industry standard, resistant to brute force, adaptive cost factor
**Trade-offs**: Slower than alternatives (acceptable for auth operations)

### ADR-001-03: Memory Storage for Access Tokens
**Decision**: Store access tokens in React state (memory) only
**Rationale**: Prevents XSS token theft, cleared on page refresh
**Trade-offs**: User must re-authenticate on page refresh (mitigated by refresh token)

### ADR-001-04: localStorage for Refresh Tokens (Temporary)
**Decision**: Store refresh tokens in localStorage for MVP, migrate to httpOnly cookies later
**Rationale**: Faster MVP development, acceptable risk with other mitigations
**Trade-offs**: Vulnerable to XSS (mitigated by input sanitization, short refresh expiry)

### ADR-001-05: SQLite for MVP Database
**Decision**: Use SQLite for MVP, migrate to PostgreSQL for production
**Rationale**: Simpler deployment, no external database needed, sufficient for MVP scale
**Trade-offs**: No built-in encryption at rest, limited concurrency (acceptable for MVP)

---

## Approval

**Prepared by**: Engineering Team
**Date**: 2024-01-15
**Review Required**: Security Officer, Technical Lead
**Next Review**: 2024-04-15 (or upon major changes)

**Status**: 🟡 PROPOSED (awaiting approval)

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Engineering Team | Initial draft |

---

**End of Document**
