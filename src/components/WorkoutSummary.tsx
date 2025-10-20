// src/components/WorkoutSummary.tsx
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { WorkoutSummaryProps, LatLng } from '../types/workout';
import { formatHMS, toKm, toAvgPace } from '../utils/format';
import { calculateWorkoutBenefits } from '../../lib/workoutBenefits';
import 'leaflet/dist/leaflet.css';

// Default Leaflet marker icons (fix for webpack)
const startIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function WorkoutSummary({ path, totalDist, elapsedMs, onStartNew, onGoHome }: WorkoutSummaryProps) {
  const totalDistKm = toKm(totalDist); // "0.00" format
  const durationStr = formatHMS(elapsedMs); // "MM:SS" or "HH:MM:SS" format
  const avgPaceStr = toAvgPace(totalDist / 1000, elapsedMs); // "M:SS" format

  // Calculate workout benefits
  const benefits = calculateWorkoutBenefits({
    distanceKm: totalDist / 1000,
    durationMin: elapsedMs / 60000,
    loadKg: 10, // 기본 10kg 배낭 가정 (추후 사용자 입력으로 변경 가능)
    bodyWeightKg: 70, // 기본 70kg 가정 (추후 사용자 프로필로 변경 가능)
  });

  // Calculate map center and bounds
  const center: LatLng = path.length > 0
    ? path[Math.floor(path.length / 2)]
    : [37.5665, 126.9780]; // Seoul default

  return (
    <div className="h-screen flex flex-col bg-[#0A0E0D] text-[#E5ECE8]">
      {/* Header */}
      <div className="bg-gradient-to-b from-black/80 to-transparent p-4 border-b border-[#2D3A35]/50">
        <h1 className="text-lg font-mono font-bold text-[#E5ECE8] uppercase tracking-wider">
          WORKOUT SUMMARY
        </h1>
      </div>

      {/* Map Mini-view */}
      <div className="relative h-80 bg-[#1B2A24]">
        {typeof window !== 'undefined' && path.length > 0 ? (
          <MapContainer
            center={center}
            zoom={14}
            className="w-full h-full"
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="map-dark-filter"
            />

            {/* Route Polyline */}
            <Polyline
              positions={path}
              pathOptions={{
                color: '#00B46E',
                weight: 4,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />

            {/* Start Marker */}
            {path.length > 0 && (
              <Marker position={path[0]} icon={startIcon} />
            )}

            {/* End Marker */}
            {path.length > 1 && (
              <Marker position={path[path.length - 1]} icon={endIcon} />
            )}
          </MapContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-[#6B7872] font-mono text-sm">No route data</p>
          </div>
        )}

        {/* Dark overlay for consistency */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0A0E0D]/30 via-[#00B46E]/[0.04] to-[#0A0E0D]/50"></div>
      </div>

      {/* Summary Cards */}
      <div className="flex-1 overflow-auto p-6">
        {/* Main Stats - 3 Column Grid */}
        <div className="grid grid-cols-3 gap-3 max-w-3xl mx-auto mb-6">
          {/* Distance Card */}
          <div className="bg-[#1C2321]/80 backdrop-blur-sm border border-[#2D3A35]/60 rounded-sm p-4 text-center">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-2">
              거리
            </p>
            <p className="text-2xl font-mono font-bold text-[#00B46E] tabular-nums break-all" aria-label="distance-kilometers">
              {totalDistKm}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">km</p>
          </div>

          {/* Time Card */}
          <div className="bg-[#1C2321]/80 backdrop-blur-sm border border-[#2D3A35]/60 rounded-sm p-4 text-center">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-2">
              시간
            </p>
            <p className="text-2xl font-mono font-bold text-[#E5ECE8] tabular-nums break-all" aria-label="elapsed-time">
              {durationStr}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">경과</p>
          </div>

          {/* Pace Card (평균 속도 대체) */}
          <div className="bg-[#1C2321]/80 backdrop-blur-sm border border-[#2D3A35]/60 rounded-sm p-4 text-center">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-2">
              평균 페이스
            </p>
            <p className="text-2xl font-mono font-bold text-[#E5ECE8] tabular-nums break-all" aria-label="average-pace">
              {avgPaceStr}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">/km</p>
          </div>
        </div>

        {/* Workout Benefits (정량화된 운동 효과) */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="bg-[#1C2321]/60 backdrop-blur-sm border border-[#2D3A35]/40 rounded-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <p className="text-sm font-mono text-[#A8B5AF] uppercase tracking-wider">
                  운동 효과
                </p>
              </div>
              <p className="text-xs font-mono text-[#6B7872]">정량화 분석</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* 심폐지구력 */}
              <div className="bg-[#0A0E0D]/40 border border-[#2D3A35]/30 rounded-sm p-4 text-center">
                <div className="text-3xl mb-2">❤️</div>
                <div className="h-2 bg-[#2D3A35] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-[#00B46E] to-[#00FF88] rounded-full transition-all duration-500"
                    style={{ width: `${benefits.cardio.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs font-mono text-[#A8B5AF] mb-1">심폐지구력</p>
                <p className="text-sm font-mono font-bold text-[#00B46E]">{benefits.cardio.label}</p>
                <p className="text-xs font-mono text-[#6B7872] mt-1">{benefits.cardio.score}점</p>
              </div>

              {/* 근력 향상 */}
              <div className="bg-[#0A0E0D]/40 border border-[#2D3A35]/30 rounded-sm p-4 text-center">
                <div className="text-3xl mb-2">💪</div>
                <div className="h-2 bg-[#2D3A35] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-[#00B46E] to-[#00FF88] rounded-full transition-all duration-500"
                    style={{ width: `${benefits.strength.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs font-mono text-[#A8B5AF] mb-1">근력 향상</p>
                <p className="text-sm font-mono font-bold text-[#00B46E]">{benefits.strength.label}</p>
                <p className="text-xs font-mono text-[#6B7872] mt-1">{benefits.strength.score}점</p>
              </div>

              {/* 골밀도 증가 */}
              <div className="bg-[#0A0E0D]/40 border border-[#2D3A35]/30 rounded-sm p-4 text-center">
                <div className="text-3xl mb-2">🦴</div>
                <div className="h-2 bg-[#2D3A35] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-[#00B46E] to-[#00FF88] rounded-full transition-all duration-500"
                    style={{ width: `${benefits.bone.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs font-mono text-[#A8B5AF] mb-1">골밀도</p>
                <p className="text-sm font-mono font-bold text-[#00B46E]">{benefits.bone.label}</p>
                <p className="text-xs font-mono text-[#6B7872] mt-1">{benefits.bone.score}점</p>
              </div>

              {/* 칼로리 소모 */}
              <div className="bg-[#0A0E0D]/40 border border-[#2D3A35]/30 rounded-sm p-4 text-center">
                <div className="text-3xl mb-2">🔥</div>
                <div className="h-2 bg-[#2D3A35] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-[#00B46E] to-[#00FF88] rounded-full transition-all duration-500"
                    style={{ width: `${benefits.calories.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs font-mono text-[#A8B5AF] mb-1">칼로리</p>
                <p className="text-sm font-mono font-bold text-[#FFB800]">{benefits.calories.kcal}</p>
                <p className="text-xs font-mono text-[#6B7872] mt-1">kcal</p>
              </div>
            </div>

            <div className="bg-[#0A0E0D]/30 border border-[#2D3A35]/20 rounded-sm p-3 text-center mt-4">
              <p className="text-xs font-mono text-[#A8B5AF]">
                ✅ 이번 운동으로 <span className="text-[#00B46E] font-bold">{benefits.calories.kcal} kcal</span> 소모하고 전신 건강을 개선했습니다
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="max-w-md mx-auto space-y-3">
          <button
            onClick={onGoHome}
            className="w-full bg-[#2D3A35] hover:bg-[#3A4A42] active:bg-[#1C2321] text-[#E5ECE8] font-mono font-bold text-sm uppercase tracking-widest py-4 rounded-sm shadow-lg transition-all duration-150 active:scale-[0.98] border border-[#00B46E]/30"
          >
            <span className="flex items-center justify-center gap-3">
              <span>←</span>
              HOME
            </span>
          </button>

          <button
            onClick={onStartNew}
            className="w-full bg-[#00B46E] hover:bg-[#008556] active:bg-[#00573B] text-[#0A0E0D] font-mono font-bold text-sm uppercase tracking-widest py-4 rounded-sm shadow-lg transition-all duration-150 active:scale-[0.98]"
            style={{ boxShadow: '0 4px 16px rgba(0, 180, 110, 0.25)' }}
          >
            <span className="flex items-center justify-center gap-3">
              <span className="w-2 h-2 bg-[#0A0E0D] rounded-full"></span>
              START NEW WORKOUT
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
