// src/utils/format.ts
// Formatting utilities for time, distance, and speed

/**
 * Format milliseconds to MM:SS or HH:MM:SS
 * @param ms - Time in milliseconds
 * @returns Formatted string "MM:SS" for <1hr, "HH:MM:SS" for ≥1hr
 */
export function formatHMS(ms: number): string {
  if (ms < 0 || !isFinite(ms)) return '00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Return MM:SS for under 1 hour
  if (hours === 0) {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Return HH:MM:SS for 1 hour or more
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Convert meters to kilometers with 2 decimal places (10m precision)
 * @param meters - Distance in meters
 * @returns Formatted string "0.00"
 */
export function toKm(meters: number): string {
  if (!isFinite(meters) || meters < 0) return '0.00';

  const km = meters / 1000;
  return km.toFixed(2);
}

/**
 * Calculate average speed in km/h with 1 decimal place
 * @param distanceKm - Distance in kilometers
 * @param elapsedMs - Elapsed time in milliseconds
 * @returns Formatted string "5.3" or "--" if invalid
 */
export function toAvgSpeedKmh(distanceKm: number, elapsedMs: number): string {
  if (!isFinite(distanceKm) || !isFinite(elapsedMs) || distanceKm <= 0 || elapsedMs <= 0) {
    return '--';
  }

  const hours = elapsedMs / (1000 * 60 * 60);
  if (hours === 0) return '--';

  const speedKmh = distanceKm / hours;

  if (!isFinite(speedKmh)) return '--';

  return speedKmh.toFixed(1);
}
