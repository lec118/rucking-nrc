from datetime import datetime
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .schemas import WorkoutCreate, WorkoutResponse

app = FastAPI(title="Good Ruck API", version="1.0.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_methods=["*"],
  allow_headers=["*"],
)

# Simple in-memory storage for example purposes
_workouts: List[WorkoutResponse] = []


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
  details = []
  for error in exc.errors():
    location = ".".join(str(part) for part in error["loc"] if part not in {"body"})
    details.append(
      {
        "field": location or "body",
        "message": error["msg"],
        "code": "VALIDATION_001",
      }
    )

  return JSONResponse(
    status_code=400,
    content={
      "error": "VALIDATION_ERROR",
      "code": "VALIDATION_001",
      "message": "Please review the highlighted inputs",
      "details": details,
      "timestamp": datetime.utcnow().isoformat() + "Z",
    },
  )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
  status_code = exc.status_code or 500
  if status_code == 404:
    code = "NOT_FOUND_003"
    error_type = "NOT_FOUND"
    message = exc.detail or "Requested resource was not found"
  else:
    code = "INTERNAL_001"
    error_type = "INTERNAL_ERROR"
    message = str(exc.detail) if exc.detail else "An unexpected server error occurred"

  return JSONResponse(
    status_code=status_code,
    content={
      "error": error_type,
      "code": code,
      "message": message,
      "details": [],
      "timestamp": datetime.utcnow().isoformat() + "Z",
    },
  )


@app.post("/api/workouts", response_model=WorkoutResponse, status_code=201)
async def create_workout(payload: WorkoutCreate) -> WorkoutResponse:
  workout_id = len(_workouts) + 1
  workout = WorkoutResponse(id=workout_id, **payload.model_dump())
  _workouts.insert(0, workout)
  return workout


@app.get("/api/workouts", response_model=List[WorkoutResponse])
async def list_workouts() -> List[WorkoutResponse]:
  return _workouts


@app.delete("/api/workouts/{workout_id}", status_code=204)
async def delete_workout(workout_id: int):
  for index, workout in enumerate(_workouts):
    if workout.id == workout_id:
      _workouts.pop(index)
      return
  raise HTTPException(status_code=404, detail="Workout not found")
