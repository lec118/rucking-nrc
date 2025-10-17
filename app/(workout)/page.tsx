'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * 러킹 추적기 - 올인원 페이지
 *
 * 상태: setup → live → summary
 * - setup: 체중/배낭무게 입력
 * - live: GPS 추적 + 지도 + 실시간 통계
 * - summary: RuckScore + 4개 메트릭
 */

// 도메인 로직
interface WorkoutSession {
  state: 'idle' | 'running' | 'paused' | 'ended';
  startMonotonic: number;
  pauseAccum: number;
  lastPauseStart: number | null;

  path: Array<{ lat: number; lng: number; timestamp: number }>;
  movingDistance: number;
  movingTime: number;
  totalDistance: number;

  currentSpeed: number;
  currentPace: number | null;
  stoppedDuration: number;

  elevationGain: number;
  lastAltitude: number | null;

  bodyWeight: number;
  loadWeight: number;
}

function createSession(bw: number, load: number): WorkoutSession {
  return {
    state: 'idle',
    startMonotonic: 0,
    pauseAccum: 0,
    lastPauseStart: null,
    path: [],
    movingDistance: 0,
    movingTime: 0,
    totalDistance: 0,
    currentSpeed: 0,
    currentPace: null,
    stoppedDuration: 0,
    elevationGain: 0,
    lastAltitude: null,
    bodyWeight: bw,
    loadWeight: load,
  };
}

function startSession(s: WorkoutSession, now: number): WorkoutSession {
  if (s.state !== 'idle') return s;
  return { ...s, state: 'running', startMonotonic: now, pauseAccum: 0, lastPauseStart: null };
}

function pauseSession(s: WorkoutSession, now: number): WorkoutSession {
  if (s.state !== 'running') return s;
  return { ...s, state: 'paused', lastPauseStart: now };
}

function resumeSession(s: WorkoutSession, now: number): WorkoutSession {
  if (s.state !== 'paused' || s.lastPauseStart === null) return s;
  const pauseDur = now - s.lastPauseStart;
  return { ...s, state: 'running', pauseAccum: s.pauseAccum + pauseDur, lastPauseStart: null };
}

function endSession(s: WorkoutSession): WorkoutSession {
  if (s.state === 'idle' || s.state === 'ended') return s;
  return { ...s, state: 'ended' };
}

function getElapsedTime(s: WorkoutSession, now: number): number {
  if (s.state === 'idle') return 0;
  let elapsed = now - s.startMonotonic - s.pauseAccum;
  if (s.state === 'paused' && s.lastPauseStart !== null) {
    elapsed -= (now - s.lastPauseStart);
  }
  return Math.max(0, elapsed);
}

function updateLocation(
  s: WorkoutSession,
  lat: number,
  lng: number,
  speed: number,
  now: number,
  altitude?: number
): WorkoutSession {
  if (s.state !== 'running') return s;

  const newPath = [...s.path, { lat, lng, timestamp: Date.now() }];

  let addedDist = 0;
  if (s.path.length > 0) {
    const prev = s.path[s.path.length - 1];
    addedDist = haversine(prev.lat, prev.lng, lat, lng);
  }

  let addedGain = 0;
  if (altitude !== undefined && s.lastAltitude !== null) {
    const delta = altitude - s.lastAltitude;
    if (delta > 0) addedGain = delta;
  }

  const STOPPED_SPEED_THRESHOLD = 0.4;
  const STOPPED_DURATION_THRESHOLD = 5000;

  let newStoppedDur = s.stoppedDuration;
  let newMovingDist = s.movingDistance;
  let newMovingTime = s.movingTime;
  let newCurrentPace: number | null = s.currentPace;

  if (speed < STOPPED_SPEED_THRESHOLD) {
    const elapsed = getElapsedTime(s, now);
    const timeSinceLastUpdate = s.path.length > 0 ? elapsed - s.movingTime : 0;
    newStoppedDur += timeSinceLastUpdate;
    if (newStoppedDur >= STOPPED_DURATION_THRESHOLD) {
      newCurrentPace = null;
    }
  } else {
    newStoppedDur = 0;
    newMovingDist += addedDist;
    newMovingTime = getElapsedTime(s, now);
    if (speed > 0) {
      newCurrentPace = 1000 / speed;
    }
  }

  return {
    ...s,
    path: newPath,
    movingDistance: newMovingDist,
    movingTime: newMovingTime,
    totalDistance: s.totalDistance + addedDist,
    currentSpeed: speed,
    currentPace: newCurrentPace,
    stoppedDuration: newStoppedDur,
    elevationGain: s.elevationGain + addedGain,
    lastAltitude: altitude ?? s.lastAltitude,
  };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatPace(paceSecPerKm: number | null): string {
  if (paceSecPerKm === null) return '--:--';
  const m = Math.floor(paceSecPerKm / 60);
  const s = Math.floor(paceSecPerKm % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// 속도 스무딩 (인라인 간단 구현)
let speedBuffer: number[] = [];
let kalmanEst = 0;
let kalmanErr = 1;

function smoothSpeed(raw: number): number {
  speedBuffer.push(raw);
  if (speedBuffer.length > 5) speedBuffer.shift();
  const avg = speedBuffer.reduce((a, b) => a + b, 0) / speedBuffer.length;
  const Q = 0.01, R = 0.1;
  const predErr = kalmanErr + Q;
  const gain = predErr / (predErr + R);
  kalmanEst = kalmanEst + gain * (avg - kalmanEst);
  kalmanErr = (1 - gain) * predErr;
  return Math.max(0, kalmanEst);
}

function resetSmoothing() {
  speedBuffer = [];
  kalmanEst = 0;
  kalmanErr = 1;
}

// 트레이닝 메트릭 (인라인)
function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function calculateMetrics(
  bw: number,
  load: number,
  distKm: number,
  movingTimeMin: number,
  gainM: number
) {
  if (bw <= 0 || movingTimeMin <= 0) {
    return { kcal: 0, trimp: 0, mechLoad: 0, vertWork: 0, bms: 0, ruckScore: 0 };
  }

  const speedKmh = distKm / (movingTimeMin / 60);
  const MET = 1.0 + 0.9 * speedKmh;
  const loadFactor = 1 + (load / bw) * 0.6;
  const kcal = MET * bw * (movingTimeMin / 60) * loadFactor * 1.15;

  const intensity = clamp(speedKmh / 5.5, 0, 1.5);
  const trimp = movingTimeMin * intensity * 100;

  const mechLoad = load * distKm;
  const vertWork = ((bw + load) * 9.81 * gainM) / 1000;

  const lNorm = Math.min(load / 20, 1);
  const dNorm = Math.min(distKm / 10, 1);
  const gNorm = Math.min(gainM / 400, 1);
  const bms = 10 * (0.4 * lNorm + 0.3 * dNorm + 0.3 * gNorm);

  const eeNorm = Math.min(kcal / 800, 1);
  const trimpNorm = Math.min(trimp / 150, 1);
  const mechNorm = Math.min(mechLoad / 120, 1);
  const vertNorm = Math.min(vertWork / 12, 1);
  const bmsNorm = bms / 10;

  const ruckScore = 100 * (0.3 * eeNorm + 0.25 * trimpNorm + 0.25 * mechNorm + 0.10 * vertNorm + 0.10 * bmsNorm);

  return { kcal, trimp, mechLoad, vertWork, bms, ruckScore };
}

// GPS 서비스 (인라인)
function startGPS(
  onLocation: (lat: number, lng: number, speed: number, alt?: number) => void,
  onError: (msg: string) => void
): number | null {
  if (!navigator.geolocation) {
    onError('GPS 미지원');
    return null;
  }

  let lastPos: GeolocationPosition | null = null;

  const id = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, accuracy, speed, altitude } = pos.coords;

      if (accuracy > 30) {
        console.log(`정확도 낮음 (${accuracy.toFixed(1)}m) - 무시`);
        return;
      }

      let computedSpeed = speed ?? 0;
      if (speed === null && lastPos) {
        const prev = lastPos.coords;
        const dist = haversine(prev.latitude, prev.longitude, latitude, longitude);
        const timeDelta = (pos.timestamp - lastPos.timestamp) / 1000;
        if (timeDelta > 0) computedSpeed = dist / timeDelta;
      }

      const smoothed = smoothSpeed(computedSpeed);
      lastPos = pos;
      onLocation(latitude, longitude, smoothed, altitude ?? undefined);
    },
    (err) => {
      let msg = 'GPS 오류';
      if (err.code === err.PERMISSION_DENIED) msg = '위치 권한 거부됨';
      else if (err.code === err.POSITION_UNAVAILABLE) msg = 'GPS 신호 없음';
      else if (err.code === err.TIMEOUT) msg = 'GPS 타임아웃';
      onError(msg);
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
  );

  return id;
}

function stopGPS(id: number | null) {
  if (id !== null) {
    navigator.geolocation.clearWatch(id);
  }
  resetSmoothing();
}

// 메인 컴포넌트
export default function WorkoutPage() {
  const [screen, setScreen] = useState<'setup' | 'live' | 'summary'>('setup');
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [bw, setBw] = useState('70');
  const [load, setLoad] = useState('10');
  const [errorMsg, setErrorMsg] = useState('');

  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const gpsIdRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // 운동 시작
  const handleStart = () => {
    const bwNum = parseFloat(bw);
    const loadNum = parseFloat(load);
    if (isNaN(bwNum) || bwNum <= 0 || isNaN(loadNum) || loadNum < 0) {
      setErrorMsg('체중과 배낭 무게를 올바르게 입력하세요.');
      return;
    }
    const s = startSession(createSession(bwNum, loadNum), performance.now());
    setSession(s);
    setScreen('live');
    setErrorMsg('');
  };

  // 지도 초기화
  useEffect(() => {
    if (screen !== 'live' || !mapContainerRef.current) return;

    const tileKey = process.env.NEXT_PUBLIC_TILE_KEY || '';
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${tileKey}`,
      center: [126.978, 37.5665],
      zoom: 15,
    });

    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
      });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#FF3B30', 'line-width': 4 },
      });

      map.addSource('user', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
      });
      map.addLayer({
        id: 'user',
        type: 'circle',
        source: 'user',
        paint: { 'circle-radius': 10, 'circle-color': '#007AFF', 'circle-stroke-width': 2, 'circle-stroke-color': '#FFF' },
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [screen]);

  // GPS 추적
  useEffect(() => {
    if (screen !== 'live' || !session) return;

    const id = startGPS(
      (lat, lng, speed, alt) => {
        setSession((prev) => {
          if (!prev || prev.state !== 'running') return prev;
          const updated = updateLocation(prev, lat, lng, speed, performance.now(), alt);

          if (mapRef.current) {
            const m = mapRef.current;
            m.easeTo({ center: [lng, lat], duration: 1000 });

            const userSrc = m.getSource('user') as maplibregl.GeoJSONSource;
            if (userSrc) {
              userSrc.setData({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [lng, lat] },
                properties: {},
              });
            }

            const routeSrc = m.getSource('route') as maplibregl.GeoJSONSource;
            if (routeSrc) {
              routeSrc.setData({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: updated.path.map((p) => [p.lng, p.lat]) },
                properties: {},
              });
            }
          }

          return updated;
        });
      },
      (msg) => setErrorMsg(msg)
    );

    gpsIdRef.current = id;

    return () => {
      stopGPS(gpsIdRef.current);
      gpsIdRef.current = null;
    };
  }, [screen, session]);

  // 시간 업데이트
  useEffect(() => {
    if (screen !== 'live' || !session) return;

    const update = () => {
      const elapsed = getElapsedTime(session, performance.now());
      setElapsedMs(elapsed);
      rafRef.current = requestAnimationFrame(update);
    };
    update();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [screen, session]);

  const handlePause = () => {
    if (!session) return;
    setSession(pauseSession(session, performance.now()));
  };

  const handleResume = () => {
    if (!session) return;
    setSession(resumeSession(session, performance.now()));
  };

  const handleEnd = () => {
    if (!session) return;
    setSession(endSession(session));
    stopGPS(gpsIdRef.current);
    setScreen('summary');
  };

  // Setup 화면
  if (screen === 'setup') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0F1613', color: '#E5ECE8', padding: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '32px' }}>러킹 추적기</h1>
        <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>체중 (kg)</label>
            <input
              type="number"
              value={bw}
              onChange={(e) => setBw(e.target.value)}
              style={{ width: '100%', padding: '12px', background: '#1C2321', border: '1px solid #2C3731', borderRadius: '4px', color: '#FFF' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>배낭 무게 (kg)</label>
            <input
              type="number"
              value={load}
              onChange={(e) => setLoad(e.target.value)}
              style={{ width: '100%', padding: '12px', background: '#1C2321', border: '1px solid #2C3731', borderRadius: '4px', color: '#FFF' }}
            />
          </div>
          {errorMsg && <div style={{ color: '#FF3B30', fontSize: '14px' }}>{errorMsg}</div>}
          <button
            onClick={handleStart}
            style={{ width: '100%', padding: '16px', background: '#00B46E', color: '#FFF', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            운동 시작
          </button>
        </div>
      </div>
    );
  }

  // Live 화면
  if (screen === 'live' && session) {
    const timeHMS = formatTime(elapsedMs);
    const distKm = (session.movingDistance / 1000).toFixed(2);
    const paceStr = formatPace(session.currentPace);
    const elevGain = session.elevationGain.toFixed(0);

    return (
      <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
        <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0 }} />

        {/* 상단 통계 */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(28, 35, 33, 0.9)', backdropFilter: 'blur(8px)', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>TIME</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#E5ECE8', fontSize: elapsedMs < 3600000 ? '18px' : '16px' }}>{timeHMS}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>DIST</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#E5ECE8' }}>{distKm} km</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>PACE</div>
            <div style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', color: '#E5ECE8' }}>{paceStr}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>ELEV</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#E5ECE8' }}>{elevGain} m</div>
          </div>
        </div>

        {/* 하단 컨트롤 */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(28, 35, 33, 0.9)', backdropFilter: 'blur(8px)', padding: '24px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
          {session.state === 'running' && (
            <>
              <button onClick={handlePause} style={{ padding: '12px 32px', background: '#FFB800', color: '#000', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>일시정지</button>
              <button onClick={handleEnd} style={{ padding: '12px 32px', background: '#FF3B30', color: '#FFF', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>종료</button>
            </>
          )}
          {session.state === 'paused' && (
            <>
              <button onClick={handleResume} style={{ padding: '12px 32px', background: '#00B46E', color: '#FFF', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>재개</button>
              <button onClick={handleEnd} style={{ padding: '12px 32px', background: '#FF3B30', color: '#FFF', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>종료</button>
            </>
          )}
        </div>

        {errorMsg && (
          <div style={{ position: 'absolute', top: '80px', left: '16px', right: '16px', background: 'rgba(255, 59, 48, 0.9)', color: '#FFF', padding: '16px', borderRadius: '4px' }}>
            {errorMsg}
          </div>
        )}
      </div>
    );
  }

  // Summary 화면
  if (screen === 'summary' && session) {
    const distKm = session.movingDistance / 1000;
    const movingTimeMin = session.movingTime / 60000;
    const metrics = calculateMetrics(session.bodyWeight, session.loadWeight, distKm, movingTimeMin, session.elevationGain);

    const getColor = (score: number) => {
      if (score < 40) return '#6B7872';
      if (score < 70) return '#FFB800';
      return '#00B46E';
    };

    const score = Math.min(Math.max(metrics.ruckScore, 0), 100);
    const color = getColor(score);
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div style={{ minHeight: '100vh', background: '#0F1613', color: '#E5ECE8', padding: '24px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '24px', textAlign: 'center' }}>운동 완료</h1>

        {/* RuckScore 게이지 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="100" cy="100" r={radius} stroke="#2C3731" strokeWidth="12" fill="none" />
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke={color}
                strokeWidth="12"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color }}>{score.toFixed(0)}</div>
              <div style={{ fontSize: '14px', color: '#9CA3AF' }}>RuckScore</div>
            </div>
          </div>
        </div>

        {/* 메트릭 타일 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', maxWidth: '600px', margin: '0 auto', marginBottom: '32px' }}>
          <div style={{ background: '#1C2321', padding: '16px', borderRadius: '8px', border: '1px solid #2C3731' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>에너지 소모</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#E5ECE8', marginBottom: '8px' }}>{metrics.kcal.toFixed(0)} kcal</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>MET 기반 칼로리</div>
          </div>
          <div style={{ background: '#1C2321', padding: '16px', borderRadius: '8px', border: '1px solid #2C3731' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>심폐 부하</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#E5ECE8', marginBottom: '8px' }}>{metrics.trimp.toFixed(0)} TRIMP</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>트레이닝 임펄스</div>
          </div>
          <div style={{ background: '#1C2321', padding: '16px', borderRadius: '8px', border: '1px solid #2C3731' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>기계적 부하</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#E5ECE8', marginBottom: '8px' }}>{metrics.mechLoad.toFixed(1)} kg·km</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>배낭무게 × 거리</div>
          </div>
          <div style={{ background: '#1C2321', padding: '16px', borderRadius: '8px', border: '1px solid #2C3731' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>수직 일량</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#E5ECE8', marginBottom: '8px' }}>{metrics.vertWork.toFixed(1)} kJ</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>고도상승 에너지</div>
          </div>
        </div>

        {/* 기본 통계 */}
        <div style={{ maxWidth: '600px', margin: '0 auto', background: '#1C2321', padding: '16px', borderRadius: '8px', marginBottom: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '14px' }}>
            <div>거리: {distKm.toFixed(2)} km</div>
            <div>시간: {formatTime(session.movingTime)}</div>
            <div>고도 상승: {session.elevationGain.toFixed(0)} m</div>
            <div>배낭: {session.loadWeight} kg</div>
          </div>
        </div>

        {/* 재시작 */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => {
              setSession(null);
              setScreen('setup');
              setElapsedMs(0);
            }}
            style={{ padding: '16px 32px', background: '#00B46E', color: '#FFF', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            새 운동 시작
          </button>
        </div>
      </div>
    );
  }

  return null;
}
