/**
 * 운동 상세 정보 모달
 * - GPS 트랙 지도 표시
 * - 운동 통계 (거리, 시간, 페이스, 칼로리, RuckScore 등)
 * - 운동 효과 분석
 */

import { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import { Icon } from 'leaflet';
import Modal from './Modal';
import { formatHMS, toAvgPace } from '../utils/format';
import { useUserProfile } from '../context/UserProfileContext';
import { adaptWorkoutToBodyImpact } from '../../lib/adapters/bodyImpactAdapter';
import { calculateBodyImpact } from '../../lib/bodyImpact';
import { getAcwrInputs } from '../../lib/aggregateMetrics';
import { APP_CONSTANTS } from '../../lib/constants';
import 'leaflet/dist/leaflet.css';

interface WorkoutDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: any;
  allWorkouts: any[];
}

// Leaflet 마커 아이콘
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

export default function WorkoutDetailModal({ isOpen, onClose, workout, allWorkouts }: WorkoutDetailModalProps) {
  const { profile } = useUserProfile();

  // bodyImpact 계산
  const bodyImpact = useMemo(() => {
    if (!workout) return null;

    try {
      const { recent7RuckScoreSum, recent28RuckScoreSum } = getAcwrInputs(allWorkouts);

      const input = adaptWorkoutToBodyImpact(
        workout,
        profile,
        recent7RuckScoreSum,
        recent28RuckScoreSum
      );

      return calculateBodyImpact(input);
    } catch (e) {
      console.error('bodyImpact 계산 실패:', e);
      return null;
    }
  }, [workout, allWorkouts, profile]);

  if (!workout) return null;

  const hasRoute = workout.route && workout.route.length > 0;
  const distanceMeters = (workout.distance || 0) * 1000;
  const durationMs = (workout.duration || 0) * 60 * 1000;
  const timeHMS = formatHMS(durationMs);
  const avgPaceDisplay = toAvgPace(workout.distance || 0, durationMs);

  // 날짜 포맷팅
  const workoutDate = new Date(workout.date);
  const dateStr = workoutDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  const timeStr = workoutDate.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={workout.title || '운동 상세'} maxWidth="900px">
      <div className="p-6 space-y-6">
        {/* 날짜 및 시간 */}
        <div className="text-center border-b border-[#2D3A35]/30 pb-4">
          <p className="text-sm font-mono text-[#A8B5AF] mb-1">{dateStr}</p>
          <p className="text-xs font-mono text-[#6B7872]">{timeStr}</p>
        </div>

        {/* GPS 맵 */}
        {hasRoute && typeof window !== 'undefined' && (
          <div
            className="relative rounded-sm overflow-hidden border border-[#2D3A35]/40"
            style={{ height: APP_CONSTANTS.MAP_DEFAULT_HEIGHT, minHeight: APP_CONSTANTS.MAP_MIN_HEIGHT }}
          >
            <MapContainer
              bounds={workout.route}
              className="w-full h-full"
              zoomControl={true}
              attributionControl={false}
            >
              <TileLayer
                url={APP_CONSTANTS.MAP_TILE_URL}
                className="map-dark-filter"
              />
              <Polyline
                positions={workout.route}
                pathOptions={{
                  color: '#00B46E',
                  weight: 4,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* 시작 마커 */}
              <Marker position={workout.route[0]} icon={startIcon} />
              {/* 종료 마커 */}
              {workout.route.length > 1 && (
                <Marker position={workout.route[workout.route.length - 1]} icon={endIcon} />
              )}
            </MapContainer>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0A0E0D]/20 to-[#0A0E0D]/40"></div>
          </div>
        )}

        {!hasRoute && (
          <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-8 text-center">
            <div className="text-4xl mb-3" role="img" aria-label="지도">
              🗺️
            </div>
            <p className="text-sm font-mono text-[#6B7872]">GPS 경로 데이터가 없습니다</p>
          </div>
        )}

        {/* 주요 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4">
            <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-1">
              거리
            </p>
            <p className="text-2xl font-mono font-bold text-[#00B46E]">
              {(workout.distance || 0).toFixed(2)}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">km</p>
          </div>

          <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4">
            <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-1">
              시간
            </p>
            <p className="text-2xl font-mono font-bold text-[#E5ECE8]">
              {Math.floor(workout.duration || 0)}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">분</p>
          </div>

          <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4">
            <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-1">
              평균 페이스
            </p>
            <p className="text-2xl font-mono font-bold text-[#FFB800]">
              {avgPaceDisplay}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">/km</p>
          </div>

          {workout.loadKg && (
            <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4">
              <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-1">
                배낭 무게
              </p>
              <p className="text-2xl font-mono font-bold text-[#E5ECE8]">
                {workout.loadKg}
              </p>
              <p className="text-xs font-mono text-[#6B7872] mt-1">kg</p>
            </div>
          )}
        </div>

        {/* 추가 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {workout.kcal && (
            <div className="bg-[#0A0E0D]/30 border border-[#2D3A35]/30 rounded-sm p-3">
              <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-1">
                칼로리
              </p>
              <p className="text-xl font-mono font-bold text-[#FFB800]">
                {workout.kcal}
              </p>
              <p className="text-xs font-mono text-[#6B7872] mt-1">kcal</p>
            </div>
          )}

          {workout.ruckScore && (
            <div className="bg-[#0A0E0D]/30 border border-[#2D3A35]/30 rounded-sm p-3">
              <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-1">
                RuckScore
              </p>
              <p className="text-xl font-mono font-bold text-[#00B46E]">
                {workout.ruckScore}
              </p>
              <p className="text-xs font-mono text-[#6B7872] mt-1">점</p>
            </div>
          )}

          {workout.elevation && (
            <div className="bg-[#0A0E0D]/30 border border-[#2D3A35]/30 rounded-sm p-3">
              <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-1">
                고도 상승
              </p>
              <p className="text-xl font-mono font-bold text-[#E5ECE8]">
                {workout.elevation}
              </p>
              <p className="text-xs font-mono text-[#6B7872] mt-1">m</p>
            </div>
          )}

          {hasRoute && (
            <div className="bg-[#0A0E0D]/30 border border-[#2D3A35]/30 rounded-sm p-3">
              <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-1">
                GPS 포인트
              </p>
              <p className="text-xl font-mono font-bold text-[#00B46E]">
                {workout.route.length}
              </p>
              <p className="text-xs font-mono text-[#6B7872] mt-1">개</p>
            </div>
          )}
        </div>

        {/* 운동 효과 (bodyImpact가 있는 경우) */}
        {bodyImpact && (
          <div className="bg-[#1C2321]/50 border border-[#2D3A35]/40 rounded-sm p-4">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-3">
              운동 효과
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#0A0E0D]/30 rounded-sm p-3 text-center">
                <div className="text-2xl mb-1" role="img" aria-label="심폐지구력">❤️</div>
                <p className="text-xs font-mono text-[#6B7872] mb-1">심폐지구력</p>
                <p className="text-lg font-mono font-bold text-[#00B46E]">
                  {bodyImpact.rawValues.trimp}
                </p>
                <p className="text-xs font-mono text-[#6B7872]">TRIMP</p>
              </div>

              <div className="bg-[#0A0E0D]/30 rounded-sm p-3 text-center">
                <div className="text-2xl mb-1" role="img" aria-label="근지구력">💪</div>
                <p className="text-xs font-mono text-[#6B7872] mb-1">근지구력</p>
                <p className="text-lg font-mono font-bold text-[#00B46E]">
                  {bodyImpact.rawValues.mechLoadKgKm}
                </p>
                <p className="text-xs font-mono text-[#6B7872]">kg·km</p>
              </div>

              <div className="bg-[#0A0E0D]/30 rounded-sm p-3 text-center">
                <div className="text-2xl mb-1" role="img" aria-label="골자극">🦴</div>
                <p className="text-xs font-mono text-[#6B7872] mb-1">골자극</p>
                <p className="text-lg font-mono font-bold text-[#00B46E]">
                  {bodyImpact.rawValues.bms.toFixed(1)}
                </p>
                <p className="text-xs font-mono text-[#6B7872]">BMS</p>
              </div>

              <div className="bg-[#0A0E0D]/30 rounded-sm p-3 text-center">
                <div className="text-2xl mb-1" role="img" aria-label="대사">🔥</div>
                <p className="text-xs font-mono text-[#6B7872] mb-1">대사</p>
                <p className="text-lg font-mono font-bold text-[#FFB800]">
                  {bodyImpact.rawValues.kcal}
                </p>
                <p className="text-xs font-mono text-[#6B7872]">kcal</p>
              </div>
            </div>
          </div>
        )}

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="w-full bg-[#2D3A35] hover:bg-[#3D4A45] text-[#E5ECE8] font-mono font-bold text-sm uppercase tracking-wider px-6 py-3 rounded-sm transition-colors"
        >
          닫기
        </button>
      </div>
    </Modal>
  );
}
