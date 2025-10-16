import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import { Icon } from 'leaflet';
import { LiveWorkoutSetupSchema, WorkoutSubmitSchema, validateWorkout } from '../schemas/workout.schema';
import { createClientValidationError, formatFormErrorMessage, toFieldErrors } from '../utils/formValidation';
import { useWorkout } from '../context/WorkoutContext';
import WorkoutSummary from '../components/WorkoutSummary';
import { formatHMS, toKm, toAvgSpeedKmh } from '../utils/format';
import { requestWakeLock, releaseWakeLock, setupWakeLockVisibilityHandler } from '../utils/wakeLock';
import 'leaflet/dist/leaflet.css';

// Calculate distance between two GPS coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Note: formatTime function removed - now using formatHMS from utils/format.ts

// Default Leaflet marker icons
const currentIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const startIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function LiveWorkout() {
  const navigate = useNavigate();
  const { addWorkout } = useWorkout();

  // Workout state
  const [status, setStatus] = useState('setup'); // setup, idle, active, paused, finished, summary
  const [workoutInfo, setWorkoutInfo] = useState({
    title: '',
    weight: ''
  });
  const [setupFieldErrors, setSetupFieldErrors] = useState({});
  const [setupFormError, setSetupFormError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [duration, setDuration] = useState(0); // in seconds
  const [distance, setDistance] = useState(0); // in km
  const [routePath, setRoutePath] = useState([]); // GPS coordinates
  const [currentPosition, setCurrentPosition] = useState(null);
  const [currentPace, setCurrentPace] = useState(0); // min/km
  const [avgPace, setAvgPace] = useState(0); // min/km

  // Refs
  const watchId = useRef(null);
  const timerInterval = useRef(null);
  const lastPosition = useRef(null);
  const startTime = useRef(null);
  const pausedTime = useRef(0);
  const statusRef = useRef(status);

  // Keep statusRef in sync with status
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Start GPS tracking
  const startGPS = () => {
    if (!navigator?.geolocation) {
      alert('GPS is not supported by your browser');
      return;
    }

    console.log('🛰️ Starting GPS tracking...');

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const newPos = [latitude, longitude];

        console.log(`📍 GPS Update: lat=${latitude.toFixed(6)}, lon=${longitude.toFixed(6)}, accuracy=${accuracy.toFixed(1)}m, status=${statusRef.current}`);

        setCurrentPosition(newPos);

        // GPS filtering: accuracy > 25m, movement < 3m, jump > 80m
        if (accuracy > 25) {
          console.log(`⚠️ GPS accuracy too low (${accuracy.toFixed(1)}m), skipping`);
          return;
        }

        // Calculate distance if we have a previous position AND status is active
        if (lastPosition.current && statusRef.current === 'active') {
          const dist = calculateDistance(
            lastPosition.current[0],
            lastPosition.current[1],
            latitude,
            longitude
          );

          const distMeters = dist * 1000;
          console.log(`📏 Distance calculated: ${distMeters.toFixed(2)}m`);

          // Filter: ignore movement < 3m (noise) or > 80m (jump)
          if (distMeters < 3) {
            console.log(`⏭️ Movement too small (${distMeters.toFixed(2)}m), ignoring GPS noise`);
            return;
          }

          if (distMeters > 80) {
            console.log(`⚠️ Suspicious jump (${distMeters.toFixed(2)}m), ignoring`);
            return;
          }

          setDistance(prev => {
            const newDistance = prev + dist;
            console.log(`✅ Distance updated: ${prev.toFixed(3)}km → ${newDistance.toFixed(3)}km (+${distMeters.toFixed(1)}m)`);
            return newDistance;
          });

          setRoutePath(prev => [...prev, newPos]);
        } else if (statusRef.current === 'active' && !lastPosition.current) {
          // First position when active
          console.log('🏁 First GPS position recorded');
          setRoutePath([newPos]);
        }

        lastPosition.current = newPos;
      },
      (error) => {
        console.error('❌ GPS Error:', error);
        let errorMessage = 'Unable to get your location. ';

        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please enable GPS permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'GPS signal unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'GPS request timed out.';
            break;
          default:
            errorMessage += 'Unknown GPS error.';
        }

        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
        distanceFilter: 5
      }
    );
  };

  // Stop GPS tracking
  const stopGPS = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  // Start timer
  const startTimer = () => {
    startTime.current = Date.now();
    console.log(`⏰ Timer started at ${new Date(startTime.current).toLocaleTimeString()}`);

    timerInterval.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.current - pausedTime.current) / 1000);
      setDuration(elapsed);
    }, 1000);
  };

  // Stop timer
  const stopTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
      console.log('⏸️ Timer stopped');
    }
  };

  // Handle Start
  const handleStart = async () => {
    console.log('▶️ Starting workout...');
    setStatus('active');
    startGPS();
    startTimer();
    await requestWakeLock(); // Keep screen on during workout
  };

  // Handle Pause
  const handlePause = () => {
    console.log('⏸️ Pausing workout...');
    setStatus('paused');
    stopTimer();

    const elapsedBeforePause = Date.now() - startTime.current;
    pausedTime.current = pausedTime.current + elapsedBeforePause;
    console.log(`💤 Paused after ${(elapsedBeforePause / 1000).toFixed(1)}s`);
  };

  // Handle Resume
  const handleResume = async () => {
    console.log('▶️ Resuming workout...');
    setStatus('active');
    startTime.current = Date.now();
    startTimer();
    await requestWakeLock(); // Re-request wake lock on resume
  };

  const handleSetupChange = (field, value) => {
    setWorkoutInfo(prev => ({
      ...prev,
      [field]: value
    }));

    if (setupFieldErrors[field]) {
      const { [field]: _removed, ...rest } = setupFieldErrors;
      setSetupFieldErrors(rest);
    }

    if (setupFormError) {
      setSetupFormError(null);
    }
  };

  // Handle Setup Complete
  const handleSetupComplete = (e) => {
    e.preventDefault();
    setSetupFieldErrors({});
    setSetupFormError(null);

    const result = validateWorkout(LiveWorkoutSetupSchema, workoutInfo);

    if (!result.success) {
      const errors = toFieldErrors(result.errors);
      setSetupFieldErrors(errors);
      setSetupFormError(createClientValidationError(errors));
      return;
    }

    const sanitized = result.data;

    setWorkoutInfo({
      title: sanitized.title || '',
      weight: sanitized.weight !== null && sanitized.weight !== undefined
        ? sanitized.weight.toString()
        : ''
    });

    setStatus('idle');
  };

  // Handle Stop & Save
  const handleStop = async () => {
    if (isSaving) return;

    stopTimer();
    stopGPS();
    await releaseWakeLock(); // Release wake lock when stopping
    setSaveError(null);
    setIsSaving(true);

    const distanceKm = parseFloat(distance.toFixed(2));
    const durationMinutes = parseFloat((duration / 60).toFixed(1));
    const derivedPace = distanceKm > 0
      ? parseFloat((durationMinutes / distanceKm).toFixed(1))
      : null;

    const workoutPayload = {
      title: workoutInfo.title || 'GPS Tracked Workout',
      distance: distanceKm,
      duration: durationMinutes,
      pace: derivedPace,
      weight: workoutInfo.weight ? parseFloat(workoutInfo.weight) : null,
      date: new Date().toISOString(),
      route: routePath
    };

    const validation = validateWorkout(WorkoutSubmitSchema, workoutPayload);

    if (!validation.success) {
      const errors = toFieldErrors(validation.errors);
      setSaveError(createClientValidationError(errors));
      setIsSaving(false);
      return;
    }

    try {
      await addWorkout(validation.data);
      setStatus('summary'); // Show summary instead of 'finished'
      setSaveError(null);
    } catch (error) {
      if (error?.formError) {
        setSaveError(error.formError);
      } else if (error?.fieldErrors) {
        setSaveError(createClientValidationError(error.fieldErrors));
      } else {
        setSaveError(createClientValidationError({ general: 'Workout 저장에 실패했습니다. 다시 시도해주세요.' }));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle start new workout from summary
  const handleStartNew = () => {
    // Reset all state
    setStatus('setup');
    setDistance(0);
    setDuration(0);
    setRoutePath([]);
    setCurrentPosition(null);
    setCurrentPace(0);
    setAvgPace(0);
    pausedTime.current = 0;
    lastPosition.current = null;
    setWorkoutInfo({ title: '', weight: '' });
  };

  // Get initial GPS position on mount
  useEffect(() => {
    if (status !== 'setup' && status !== 'summary' && typeof window !== 'undefined' && navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentPosition([latitude, longitude]);
        },
        (error) => {
          console.error('GPS Error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  }, [status]);

  // Update average pace
  useEffect(() => {
    if (distance > 0 && duration > 0) {
      const avgPaceValue = (duration / 60) / distance;
      setAvgPace(avgPaceValue);
    }
  }, [distance, duration]);

  // Update current pace
  useEffect(() => {
    if (distance > 0 && duration > 0) {
      const timeInMinutes = duration / 60;
      const paceValue = timeInMinutes / distance;
      setCurrentPace(paceValue);
    }
  }, [distance, duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopGPS();
      releaseWakeLock();
    };
  }, []);

  // Setup wake lock visibility handler
  useEffect(() => {
    const cleanup = setupWakeLockVisibilityHandler(() => status === 'active');
    return cleanup;
  }, [status]);

  // Calculate formatted metrics for display
  const distanceKm = toKm(distance * 1000); // Convert to meters first, then format to "0.00"
  const timeHMS = formatHMS(duration * 1000); // Convert seconds to ms, then format to "HH:MM:SS"
  const avgSpeedDisplay = toAvgSpeedKmh(distance, duration * 1000); // distance in km, duration in ms

  // Summary Screen
  if (status === 'summary') {
    return (
      <WorkoutSummary
        path={routePath}
        totalDist={distance * 1000} // Convert km to meters
        elapsedMs={duration * 1000} // Convert seconds to ms
        onStartNew={handleStartNew}
      />
    );
  }

  // Setup Screen
  if (status === 'setup') {
    return (
      <div className="h-screen flex flex-col bg-black text-white">
        <div className="p-4 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Setup Workout</h1>
            <button
              onClick={() => navigate('/')}
              className="text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <form onSubmit={handleSetupComplete} className="space-y-6">
              {setupFormError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {formatFormErrorMessage(setupFormError)}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Workout Title
                </label>
                <input
                  type="text"
                  value={workoutInfo.title}
                  onChange={(e) => handleSetupChange('title', e.target.value)}
                  placeholder="Morning Ruck"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
                {setupFieldErrors.title && (
                  <p className="mt-2 text-xs text-red-300">{setupFieldErrors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Ruck Weight (kg)
                </label>
                <input
                  type="number"
                  value={workoutInfo.weight}
                  onChange={(e) => handleSetupChange('weight', e.target.value)}
                  step="0.5"
                  placeholder="10.0"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
                {setupFieldErrors.weight && (
                  <p className="mt-2 text-xs text-red-300">{setupFieldErrors.weight}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:opacity-90 transition-opacity"
              >
                Continue to Tracking
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Live Workout Screen (idle, active, paused)
  const mapCenter = routePath.length > 0
    ? routePath[routePath.length - 1]
    : (currentPosition || [37.5665, 126.9780]); // Seoul default

  return (
    <div className="h-screen flex flex-col bg-[#0A0E0D] text-[#E5ECE8]">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-medium text-white/80">Live Workout</h1>
          {status === 'idle' && (
            <button
              onClick={() => navigate('/')}
              className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center justify-center text-white/80"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* GPS Map Display */}
      <div className="fixed inset-0 bg-[#0A0E0D]">
        {currentPosition && typeof window !== 'undefined' ? (
          <div className="h-full w-full relative">
            <MapContainer
              center={mapCenter}
              zoom={15}
              className="w-full h-full"
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="map-dark-filter"
              />

              {/* Route Polyline */}
              {routePath.length > 1 && (
                <Polyline
                  positions={routePath}
                  pathOptions={{
                    color: '#00B46E',
                    weight: 4,
                    opacity: 0.8,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
              )}

              {/* Start Marker */}
              {routePath.length > 0 && (
                <Marker position={routePath[0]} icon={startIcon} />
              )}

              {/* Current Position Marker */}
              {currentPosition && (
                <Marker position={currentPosition} icon={currentIcon} />
              )}
            </MapContainer>

            {/* Map Overlay - Dark gradient */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0A0E0D]/50 via-[#00B46E]/[0.06] to-[#0A0E0D]/70" style={{
              boxShadow: 'inset 0 0 100px rgba(10, 14, 13, 0.4), inset 0 -100px 100px rgba(10, 14, 13, 0.6)'
            }}></div>

            {/* Status overlay - Tactical Style */}
            <div className="absolute top-20 left-4 z-20">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#1C2321]/90 backdrop-blur-sm border border-[#2D3A35]/50 rounded">
                <div className="relative">
                  <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-[#00FF88]' : 'bg-[#00B46E]'}`}></div>
                  {status === 'active' && (
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#00FF88] animate-ping opacity-75"></div>
                  )}
                </div>
                <span className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider">
                  {status === 'active' ? 'RECORDING' : 'GPS LOCKED'}
                </span>
              </div>
            </div>

            {/* Route info overlay */}
            {routePath.length > 1 && (
              <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
                <p className="text-xs text-zinc-400">Route Points</p>
                <p className="text-lg font-bold">{routePath.length}</p>
              </div>
            )}

            {/* Debug info overlay (bottom left) - Tactical Style */}
            {status === 'active' && (
              <div className="absolute bottom-32 left-4 z-20 bg-[#1C2321]/95 backdrop-blur-sm border border-[#00B46E]/30 rounded-sm px-3 py-2 font-mono text-xs">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#2D3A35]/50">
                  <div className="w-1.5 h-1.5 bg-[#00FF88] rounded-full animate-pulse"></div>
                  <p className="text-[#A8B5AF] uppercase tracking-wider">TELEMETRY</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6B7872]">STATUS:</span>
                    <span className="text-[#00FF88] font-semibold">{status.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6B7872]">TIMER:</span>
                    <span className="text-[#E5ECE8] tabular-nums">{duration}s</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6B7872]">DIST:</span>
                    <span className="text-[#E5ECE8] tabular-nums">{(distance * 1000).toFixed(1)}m</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6B7872]">POINTS:</span>
                    <span className="text-[#00B46E] tabular-nums">{routePath.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8">
              <div className="animate-pulse mb-6">
                <div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
              <p className="text-zinc-300 text-xl font-bold mb-2">Requesting GPS Permission...</p>
              <p className="text-zinc-500 text-sm">Please allow location access when prompted</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#0A0E0D] via-[#0A0E0D]/95 to-transparent px-6 pt-8 pb-6">
        {saveError && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <p>{formatFormErrorMessage(saveError)}</p>
            {Object.keys(saveError.fieldErrors || {}).length > 0 && (
              <ul className="mt-2 space-y-1">
                {Object.entries(saveError.fieldErrors).map(([field, message]) => (
                  <li key={field}>
                    <span className="font-semibold">{field}:</span> {message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6 max-w-2xl mx-auto">
          <div className="bg-[#1C2321]/70 backdrop-blur-sm border border-[#2D3A35]/40 rounded-sm p-4">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-1">DISTANCE</p>
            <p className="text-2xl font-mono font-bold text-[#E5ECE8] tabular-nums" aria-label="distance-kilometers">{distanceKm}</p>
            <p className="text-xs font-mono text-[#6B7872]">km</p>
          </div>
          <div className="bg-[#1C2321]/70 backdrop-blur-sm border border-[#2D3A35]/40 rounded-sm p-4">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-1">TIME</p>
            <p className="text-2xl font-mono font-bold text-[#E5ECE8] tabular-nums" aria-label="elapsed-time-hh-mm-ss">{timeHMS}</p>
          </div>
          <div className="bg-[#1C2321]/70 backdrop-blur-sm border border-[#2D3A35]/40 rounded-sm p-4">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-1">AVG SPEED</p>
            <p className="text-2xl font-mono font-bold text-[#E5ECE8] tabular-nums" aria-label="average-speed-kmh">{avgSpeedDisplay}</p>
            <p className="text-xs font-mono text-[#6B7872]">km/h</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {status === 'idle' && (
            <button
              onClick={handleStart}
              className="flex-1 bg-[#00B46E] hover:bg-[#008556] active:bg-[#00573B] text-[#0A0E0D] font-mono font-bold text-sm uppercase tracking-widest py-4 rounded-sm shadow-lg transition-all duration-150 active:scale-[0.98]"
              style={{ boxShadow: '0 4px 16px rgba(0, 180, 110, 0.25)' }}
            >
              <span className="flex items-center justify-center gap-3">
                <span className="w-2 h-2 bg-[#0A0E0D] rounded-full"></span>
                EXECUTE WORKOUT
              </span>
            </button>
          )}

          {status === 'active' && (
            <>
              <button
                onClick={handlePause}
                className="flex-1 bg-[#1C2321] border border-[#FFB800]/50 text-[#FFB800] hover:bg-[#FFB800]/10 font-mono font-semibold text-sm uppercase tracking-wider py-4 rounded-sm transition-all duration-150 active:scale-[0.98]"
              >
                PAUSE
              </button>
              <button
                onClick={handleStop}
                disabled={isSaving}
                className={`flex-1 bg-[#1C2321] border border-[#FF4444]/50 text-[#FF4444] hover:bg-[#FF4444]/10 font-mono font-semibold text-sm uppercase tracking-wider py-4 rounded-sm transition-all duration-150 active:scale-[0.98] ${isSaving ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                TERMINATE
              </button>
            </>
          )}

          {status === 'paused' && (
            <>
              <button
                onClick={handleResume}
                className="flex-1 bg-[#00B46E] hover:bg-[#008556] text-[#0A0E0D] font-mono font-bold text-sm uppercase tracking-widest py-4 rounded-sm shadow-lg transition-all duration-150 active:scale-[0.98]"
                style={{ boxShadow: '0 4px 16px rgba(0, 180, 110, 0.25)' }}
              >
                RESUME
              </button>
              <button
                onClick={handleStop}
                disabled={isSaving}
                className={`flex-1 bg-[#1C2321] border border-[#FF4444]/50 text-[#FF4444] hover:bg-[#FF4444]/10 font-mono font-semibold text-sm uppercase tracking-wider py-4 rounded-sm transition-all duration-150 active:scale-[0.98] ${isSaving ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                TERMINATE
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
