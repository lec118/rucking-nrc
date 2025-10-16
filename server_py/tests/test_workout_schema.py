import pytest

from app.schemas import WorkoutCreate


def test_workout_create_accepts_valid_payload():
  payload = {
      "title": "Morning Ruck",
      "distance": 5.5,
      "duration": 75.0,
      "pace": 13.6,
      "weight": 15.0,
      "date": "2024-05-01T09:00:00Z",
      "route": [
          {"lat": 37.5, "lon": 127.0},
          {"lat": 37.5005, "lon": 127.0005}
      ]
  }

  workout = WorkoutCreate(**payload)
  assert workout.title == "Morning Ruck"
  assert workout.distance == 5.5
  assert workout.duration == 75.0
  assert workout.pace == pytest.approx(13.6)
  assert workout.route


def test_workout_create_rejects_unrealistic_pace():
  payload = {
      "title": "Fast Ruck",
      "distance": 2.0,
      "duration": 15.0,
      "pace": 3.0,
      "weight": 12.5,
      "date": "2024-05-01T09:00:00Z",
      "route": [
          {"lat": 37.5, "lon": 127.0},
          {"lat": 37.5005, "lon": 127.0005}
      ]
  }

  with pytest.raises(ValueError) as error:
    WorkoutCreate(**payload)

  assert 'Pace must match the distance and duration' in str(error.value)


def test_workout_create_rejects_large_route_jump():
  payload = {
      "title": "Jumping Ruck",
      "distance": 5.0,
      "duration": 60.0,
      "pace": 12.0,
      "weight": 10.0,
      "date": "2024-05-01T09:00:00Z",
      "route": [
          {"lat": 37.5, "lon": 127.0},
          {"lat": 40.0, "lon": 130.0}
      ]
  }

  with pytest.raises(ValueError) as error:
    WorkoutCreate(**payload)

  assert 'Consecutive GPS points are too far apart' in str(error.value)
