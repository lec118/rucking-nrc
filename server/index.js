const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new Database(path.join(__dirname, 'workouts.db'));

// Create workouts table if it doesn't exist
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

// GET all workouts
app.get('/api/workouts', (req, res) => {
  try {
    const workouts = db.prepare('SELECT * FROM workouts ORDER BY date DESC').all();

    // Parse route JSON if exists
    const parsed = workouts.map(w => ({
      ...w,
      route: w.route ? JSON.parse(w.route) : null
    }));

    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single workout
app.get('/api/workouts/:id', (req, res) => {
  try {
    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    workout.route = workout.route ? JSON.parse(workout.route) : null;
    res.json(workout);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new workout
app.post('/api/workouts', (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE workout
app.delete('/api/workouts/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM workouts WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    res.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Rucking NRC API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${path.join(__dirname, 'workouts.db')}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
