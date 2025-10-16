import request from 'supertest';

process.env.NODE_ENV = 'test';

const { app, db } = await import('../app.js') as {
  app: import('express').Express;
  db: any;
};

describe('Workouts routes security hardening', () => {
  beforeEach(() => {
    db.exec('DELETE FROM workouts');
    db.prepare(`
      INSERT INTO workouts (date, title, distance, duration, pace, weight, route)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      new Date().toISOString(),
      'Seed Workout',
      5,
      60,
      12,
      15,
      JSON.stringify([[37.5, 126.9]])
    );
  });

  afterAll(() => {
    db.close();
  });

  it('rejects SQL injection attempts in workout id parameter', async () => {
    const response = await request(app)
      .get('/api/workouts/1%20OR%201=1')
      .expect(400);

    expect(response.body.error).toBe('VALIDATION_ERROR');
  });

  it('requires authentication for protected POST route', async () => {
    await request(app)
      .post('/api/workouts')
      .send({
        title: 'Unauthorized Workout',
        distance: 5,
        duration: 60,
        pace: 12,
        weight: 15,
        date: new Date().toISOString(),
        route: [[37.5, 126.9], [37.51, 126.91]]
      })
      .expect(401);
  });
});
