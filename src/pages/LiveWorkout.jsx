import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';

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

// Format time as HH:MM:SS
function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function LiveWorkout() {
  const navigate = useNavigate();
  const { addWorkout } = useWorkout();

  // Workout state
  const [status, setStatus] = useState('setup'); // setup, idle, active, paused, finished
  const [workoutInfo, setWorkoutInfo] = useState({
    title: '',
    weight: ''
  });
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

  // Start GPS tracking
  const startGPS = () => {
    if (!navigator.geolocation) {
      alert('GPS is not supported by your browser');
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = [latitude, longitude];

        setCurrentPosition(newPos);

        // Calculate distance if we have a previous position
        if (lastPosition.current && status === 'active') {
          const dist = calculateDistance(
            lastPosition.current[0],
            lastPosition.current[1],
            latitude,
            longitude
          );

          setDistance(prev => {
            const newDistance = prev + dist;
            // Update current pace (min/km) based on last segment
            if (dist > 0.001) { // Only calculate if moved at least 1m
              const timeElapsed = (Date.now() - startTime.current - pausedTime.current) / 1000 / 60; // in minutes
              const segmentPace = (timeElapsed / newDistance) || 0;
              setCurrentPace(segmentPace);
            }
            return newDistance;
          });

          setRoutePath(prev => [...prev, newPos]);
        } else if (status === 'active') {
          // First position
          setRoutePath([newPos]);
        }

        lastPosition.current = newPos;
      },
      (error) => {
        console.error('GPS Error:', error);
        alert('Unable to get your location. Please enable GPS.');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
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
    timerInterval.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.current - pausedTime.current) / 1000);
      setDuration(elapsed);

      // Update average pace
      if (distance > 0) {
        setAvgPace((elapsed / 60) / distance);
      }
    }, 1000);
  };

  // Stop timer
  const stopTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  };

  // Handle Start
  const handleStart = () => {
    setStatus('active');
    startGPS();
    startTimer();
  };

  // Handle Pause
  const handlePause = () => {
    setStatus('paused');
    stopTimer();
    pausedTime.current = Date.now() - startTime.current - pausedTime.current;
  };

  // Handle Resume
  const handleResume = () => {
    setStatus('active');
    startTime.current = Date.now() - pausedTime.current;
    pausedTime.current = 0;
    startTimer();
  };

  // Handle Setup Complete
  const handleSetupComplete = (e) => {
    e.preventDefault();
    setStatus('idle');
  };

  // Handle Stop & Save
  const handleStop = () => {
    stopTimer();
    stopGPS();
    setStatus('finished');

    // Save workout
    const workout = {
      id: Date.now(),
      date: new Date().toISOString(),
      distance: parseFloat(distance.toFixed(1)),
      duration: duration / 60, // convert to minutes
      pace: parseFloat(avgPace.toFixed(1)),
      route: routePath,
      title: workoutInfo.title || 'GPS Tracked Workout',
      weight: workoutInfo.weight ? parseFloat(workoutInfo.weight) : null
    };

    addWorkout(workout);
  };

  // Get initial GPS position on mount
  useEffect(() => {
    if (status !== 'setup' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentPosition([latitude, longitude]);
        },
        (error) => {
          console.error('GPS Error:', error);
          alert('Unable to get your location. Please enable GPS and refresh the page.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  }, [status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopGPS();
    };
  }, []);

  // Calculate current speed (km/h)
  const currentSpeed = currentPace > 0 ? (60 / currentPace).toFixed(1) : '0.0';

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
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Workout Title
                </label>
                <input
                  type="text"
                  value={workoutInfo.title}
                  onChange={(e) => setWorkoutInfo(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Morning Ruck"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Ruck Weight (kg)
                </label>
                <input
                  type="number"
                  value={workoutInfo.weight}
                  onChange={(e) => setWorkoutInfo(prev => ({ ...prev, weight: e.target.value }))}
                  step="0.5"
                  placeholder="10.0"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
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

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      {/* Header */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Live Workout</h1>
          {status === 'idle' && (
            <button
              onClick={() => navigate('/')}
              className="text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* GPS Map Display */}
      <div className="flex-1 relative bg-zinc-900">
        {currentPosition ? (
          <div className="h-full w-full relative">
            {/* Map iframe */}
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentPosition[1]-0.01},${currentPosition[0]-0.01},${currentPosition[1]+0.01},${currentPosition[0]+0.01}&layer=mapnik&marker=${currentPosition[0]},${currentPosition[1]}`}
              className="w-full h-full border-0"
              title="GPS Map"
            />

            {/* Status overlay */}
            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status === 'active' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-sm font-medium">
                  {status === 'active' ? 'Recording' : 'GPS Connected'}
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
      <div className="bg-zinc-900 p-6 border-t border-zinc-800">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-zinc-500 text-xs mb-1">Distance</p>
            <p className="text-3xl font-bold">{distance.toFixed(1)}</p>
            <p className="text-zinc-500 text-xs">km</p>
          </div>
          <div className="text-center">
            <p className="text-zinc-500 text-xs mb-1">Time</p>
            <p className="text-3xl font-bold">{formatTime(duration)}</p>
          </div>
          <div className="text-center">
            <p className="text-zinc-500 text-xs mb-1">Avg Pace</p>
            <p className="text-3xl font-bold">{avgPace > 0 ? avgPace.toFixed(1) : '0.0'}</p>
            <p className="text-zinc-500 text-xs">min/km</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center bg-zinc-800 rounded-lg p-3">
            <p className="text-zinc-500 text-xs mb-1">Current Pace</p>
            <p className="text-xl font-bold">{currentPace > 0 ? currentPace.toFixed(1) : '0.0'} <span className="text-sm text-zinc-500">min/km</span></p>
          </div>
          <div className="text-center bg-zinc-800 rounded-lg p-3">
            <p className="text-zinc-500 text-xs mb-1">Speed</p>
            <p className="text-xl font-bold">{currentSpeed} <span className="text-sm text-zinc-500">km/h</span></p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {status === 'idle' && (
            <button
              onClick={handleStart}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-colors"
            >
              Start Workout
            </button>
          )}

          {status === 'active' && (
            <>
              <button
                onClick={handlePause}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-6 rounded-xl transition-colors"
              >
                Pause
              </button>
              <button
                onClick={handleStop}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-colors"
              >
                Stop
              </button>
            </>
          )}

          {status === 'paused' && (
            <>
              <button
                onClick={handleResume}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-colors"
              >
                Resume
              </button>
              <button
                onClick={handleStop}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-colors"
              >
                Stop
              </button>
            </>
          )}

          {status === 'finished' && (
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-colors"
            >
              ✓ Workout Saved! Go Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
