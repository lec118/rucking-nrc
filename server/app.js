const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const { z } = require('zod');

const { validate, validateMultiple } = require('./src/middleware/validate');
const { errorHandler, notFoundHandler, asyncHandler } = require('./src/middleware/errorHandler');
const {
  CreateWorkoutSchema,
  WorkoutQuerySchema,
  WorkoutIdSchema
} = require('./src/schemas/workout.schema');
const { AppError, AuthenticationError, NotFoundError } = require('./src/types/errors');

const WorkoutIdParamsSchema = z.object({ id: WorkoutIdSchema });

const app = express();

const API_ACCESS_TOKEN = process.env.API_ACCESS_TOKEN || 'dev-access-token';
const CORS_WHITELIST = (process.env.CORS_WHITELIST || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'gr_csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_ISSUE_ROUTE = process.env.CSRF_ISSUE_ROUTE || '/api/csrf-token';
const CSRF_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function parseCookies(header) {
  if (!header) return {};
  return header.split(';').reduce((acc, cookie) => {
    const [rawName, ...rest] = cookie.trim().split('=');
    const name = rawName.trim();
    const value = rest.join('=').trim();
    if (name) {
      acc[name] = decodeURIComponent(value);
    }
    return acc;
  }, {});
}

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

function setCsrfCookie(res, token) {
  const attributes = [
    `${CSRF_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict'
  ];

  if (process.env.NODE_ENV === 'production') {
    attributes.push('Secure');
  }

  res.setHeader('Set-Cookie', attributes.join('; '));
}

function corsOriginCheck(origin, callback) {
  if (!origin) {
    return callback(null, true);
  }

  if (CORS_WHITELIST.includes(origin)) {
    return callback(null, true);
  }

  return callback(new Error('Not allowed by CORS'));
}

function requestIdMiddleware(req, _res, next) {
  req.id = crypto.randomUUID();
  next();
}

function securityHeadersMiddleware(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
}

function requireAuth(req, _res, next) {
  const authHeader = req.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing bearer token', 'AUTH_001');
  }

  const token = authHeader.slice('Bearer '.length);
  if (token !== API_ACCESS_TOKEN) {
    throw new AuthenticationError('Invalid bearer token', 'AUTH_002');
  }

  req.userId = 'service-user';
  next();
}

function csrfProtection(req, _res, next) {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }

  const cookies = parseCookies(req.headers.cookie || '');
  const cookieToken = cookies[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new AppError('AUTH_001', 'CSRF token mismatch');
  }

  next();
}

function issueCsrfToken(_req, res) {
  const token = generateCsrfToken();
  setCsrfCookie(res, token);
  res.json({ csrfToken: token, expiresIn: CSRF_TOKEN_TTL_MS / 1000 });
}

app.use(requestIdMiddleware);
app.use(securityHeadersMiddleware);
app.use(cors({
  origin: corsOriginCheck,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', CSRF_HEADER_NAME]
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

const db = new Database(process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, 'workouts.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    title TEXT,
    distance REAL NOT NULL,
    duration REAL NOT NULL,
    pace REAL,
    weight REAL,
    route TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.get(CSRF_ISSUE_ROUTE, issueCsrfToken);

app.get(
  '/api/workouts',
  validateMultiple({ query: WorkoutQuerySchema }),
  asyncHandler(async (req, res) => {
    const { limit, offset } = req.query;
    const workouts = db.prepare('SELECT * FROM workouts ORDER BY date DESC LIMIT ? OFFSET ?').all(limit, offset);

    const parsed = workouts.map((w) => ({
      ...w,
      route: w.route ? JSON.parse(w.route) : null
    }));

    res.json(parsed);
  })
);

app.get(
  '/api/workouts/:id',
  validate(WorkoutIdParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(Number(id));

    if (!workout) {
      throw new NotFoundError('Workout', 'NOT_FOUND_001');
    }

    workout.route = workout.route ? JSON.parse(workout.route) : null;
    res.json(workout);
  })
);

app.post(
  '/api/workouts',
  requireAuth,
  csrfProtection,
  validate(CreateWorkoutSchema),
  asyncHandler(async (req, res) => {
    const { date, title, distance, duration, pace, weight, route } = req.body;

    const stmt = db.prepare(`
      INSERT INTO workouts (date, title, distance, duration, pace, weight, route)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      date || new Date().toISOString(),
      title || 'Workout',
      distance,
      duration,
      pace || null,
      weight || null,
      route ? JSON.stringify(route) : null
    );

    const newWorkout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(result.lastInsertRowid);
    newWorkout.route = newWorkout.route ? JSON.parse(newWorkout.route) : null;

    res.status(201).json(newWorkout);
  })
);

app.delete(
  '/api/workouts/:id',
  requireAuth,
  csrfProtection,
  validate(WorkoutIdParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM workouts WHERE id = ?');
    const result = stmt.run(Number(id));

    if (result.changes === 0) {
      throw new NotFoundError('Workout', 'NOT_FOUND_001');
    }

    res.json({ message: 'Workout deleted successfully' });
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Good Ruck API is running' });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app, db };
