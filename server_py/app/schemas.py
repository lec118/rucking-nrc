from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Optional

from pydantic import BaseModel, Field, ValidationError, conlist, root_validator, validator


class GPSCoordinate(BaseModel):
  lat: float = Field(..., ge=-90, le=90, description="Latitude in decimal degrees")
  lon: float = Field(..., ge=-180, le=180, description="Longitude in decimal degrees")


class WorkoutBase(BaseModel):
  title: str = Field(..., min_length=1, max_length=100)
  distance: float = Field(..., gt=0.009, le=1000, description="Total distance in kilometers")
  duration: float = Field(..., gt=0.09, le=1440, description="Total duration in minutes")
  pace: Optional[float] = Field(None, gt=0, le=60, description="Minutes per kilometer")
  weight: Optional[float] = Field(None, ge=0, le=200, description="Ruck weight in kilograms")
  date: datetime = Field(..., description="Workout start time in ISO 8601 format")
  route: Optional[conlist(GPSCoordinate, min_items=2, max_items=10000)] = Field(
      default=None,
      description="GPS coordinate path",
  )

  @validator('title')
  def sanitize_title(cls, value: str) -> str:
    return value.strip()

  @validator('distance')
  def validate_distance_precision(cls, value: float) -> float:
    if round(value, 2) != round(value, 10):
      raise ValueError('거리 값은 소수점 둘째 자리까지 입력할 수 있습니다.')
    return value

  @validator('duration')
  def validate_duration_precision(cls, value: float) -> float:
    if round(value, 1) != round(value, 10):
      raise ValueError('시간 값은 소수점 첫째 자리까지 입력할 수 있습니다.')
    return value

  @validator('weight')
  def validate_weight_precision(cls, value: Optional[float]) -> Optional[float]:
    if value is None:
      return value
    if round(value, 1) != round(value, 10):
      raise ValueError('무게 값은 소수점 첫째 자리까지 입력할 수 있습니다.')
    return value

  @validator('date')
  def validate_date_range(cls, value: datetime) -> datetime:
    min_date = datetime(2020, 1, 1, tzinfo=value.tzinfo)
    max_date = datetime.utcnow().replace(tzinfo=value.tzinfo) + timedelta(days=1)

    if value < min_date or value > max_date:
      raise ValueError('날짜는 2020-01-01 이후이면서 내일을 넘길 수 없습니다.')
    return value

  @validator('route')
  def validate_route_jump(cls, value: Optional[List[GPSCoordinate]]) -> Optional[List[GPSCoordinate]]:
    if not value:
      return value

    previous = None
    for point in value:
      if previous:
        lat_jump = abs(point.lat - previous.lat)
        lon_jump = abs(point.lon - previous.lon)
        if lat_jump > 1 or lon_jump > 1:
          raise ValueError('연속된 GPS 포인트 간 이동 거리가 비현실적으로 큽니다.')
      previous = point

    return value

  @validator('pace')
  def validate_pace_consistency(cls, value: Optional[float], values) -> Optional[float]:
    if value is None:
      return value

    distance = values.get('distance')
    duration = values.get('duration')
    if not distance or not duration:
      return value

    calculated = duration / distance
    if abs(value - calculated) > 0.5:
      raise ValueError('페이스는 거리와 시간 비율과 최대 0.5분/km 이내로 일치해야 합니다.')

    return value


class WorkoutCreate(WorkoutBase):
  pass


class WorkoutResponse(WorkoutBase):
  id: int = Field(..., ge=1)

  class Config:
    from_attributes = True
