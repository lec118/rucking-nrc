/**
 * 운동 상세 정보 모달
 * - GPS 트랙 라인 시각화 (SVG)
 * - 운동 통계 (거리, 시간, 평균 페이스, 평균 시속)
 * - 운동 효과 분석
 */

import { useMemo } from 'react';
import Modal from './Modal';
import { formatHMS, toAvgPace } from '../utils/format';
import { useUserProfile } from '../context/UserProfileContext';
import { adaptWorkoutToBodyImpact } from '../../lib/adapters/bodyImpactAdapter';
import { calculateBodyImpact } from '../../lib/bodyImpact';
import { getAcwrInputs } from '../../lib/aggregateMetrics';

interface WorkoutDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: any;
  allWorkouts: any[];
}

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
  const distanceKm = workout.distance || 0;
  const durationMin = workout.duration || 0;
  const durationMs = durationMin * 60 * 1000;
  const timeHMS = formatHMS(durationMs);
  const avgPaceDisplay = toAvgPace(distanceKm, durationMs);

  // 평균 시속 계산 (km/h)
  const avgSpeedKmh = durationMin > 0 ? (distanceKm / durationMin) * 60 : 0;

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

        {/* GPS 트랙 시각화 (라인만) */}
        {hasRoute ? (
          <div className="relative rounded-sm overflow-hidden border border-[#2D3A35]/40 bg-[#0A0E0D]">
            <svg
              viewBox="0 0 800 400"
              className="w-full"
              style={{ height: '400px' }}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* 배경 그리드 */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2D3A35" strokeWidth="0.5" opacity="0.3"/>
                </pattern>
              </defs>
              <rect width="800" height="400" fill="url(#grid)" />

              {/* GPS 트랙 라인 */}
              {(() => {
                // 좌표 정규화
                const lats = workout.route.map((p: any) => p[0]);
                const lngs = workout.route.map((p: any) => p[1]);
                const minLat = Math.min(...lats);
                const maxLat = Math.max(...lats);
                const minLng = Math.min(...lngs);
                const maxLng = Math.max(...lngs);

                const padding = 40;
                const width = 800 - padding * 2;
                const height = 400 - padding * 2;

                // 좌표를 SVG 좌표계로 변환
                const points = workout.route.map((p: any) => {
                  const x = padding + ((p[1] - minLng) / (maxLng - minLng || 1)) * width;
                  const y = padding + (1 - (p[0] - minLat) / (maxLat - minLat || 1)) * height;
                  return `${x},${y}`;
                }).join(' ');

                // 첫 번째와 마지막 점 좌표
                const firstPoint = workout.route[0];
                const lastPoint = workout.route[workout.route.length - 1];
                const startX = padding + ((firstPoint[1] - minLng) / (maxLng - minLng || 1)) * width;
                const startY = padding + (1 - (firstPoint[0] - minLat) / (maxLat - minLat || 1)) * height;
                const endX = padding + ((lastPoint[1] - minLng) / (maxLng - minLng || 1)) * width;
                const endY = padding + (1 - (lastPoint[0] - minLat) / (maxLat - minLat || 1)) * height;

                return (
                  <>
                    {/* 트랙 라인 */}
                    <polyline
                      points={points}
                      fill="none"
                      stroke="#00B46E"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                    {/* 시작 마커 (초록색) */}
                    <circle cx={startX} cy={startY} r="8" fill="#00FF88" stroke="#0A0E0D" strokeWidth="2" />
                    {/* 종료 마커 (빨간색) */}
                    <circle cx={endX} cy={endY} r="8" fill="#FF4444" stroke="#0A0E0D" strokeWidth="2" />
                  </>
                );
              })()}
            </svg>

            {/* 트랙 정보 오버레이 */}
            <div className="absolute top-4 right-4 bg-[#1C2321]/90 backdrop-blur-sm border border-[#2D3A35]/50 rounded-sm px-3 py-2">
              <p className="text-xs font-mono text-[#6B7872]">GPS 포인트</p>
              <p className="text-lg font-mono font-bold text-[#00B46E]">{workout.route.length}</p>
            </div>
          </div>
        ) : (
          <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-8 text-center">
            <div className="text-4xl mb-3" role="img" aria-label="지도">
              🗺️
            </div>
            <p className="text-sm font-mono text-[#6B7872]">GPS 경로 데이터가 없습니다</p>
          </div>
        )}

        {/* 주요 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4">
            <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-2">
              거리
            </p>
            <p className="text-3xl font-mono font-bold text-[#00B46E] tabular-nums">
              {distanceKm.toFixed(2)}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">km</p>
          </div>

          <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4">
            <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-2">
              시간
            </p>
            <p className="text-3xl font-mono font-bold text-[#E5ECE8] tabular-nums">
              {timeHMS}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">HH:MM:SS</p>
          </div>

          <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4">
            <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-2">
              평균 페이스
            </p>
            <p className="text-3xl font-mono font-bold text-[#FFB800] tabular-nums">
              {avgPaceDisplay}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">분/km</p>
          </div>

          <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4">
            <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-2">
              평균 시속
            </p>
            <p className="text-3xl font-mono font-bold text-[#00FF88] tabular-nums">
              {avgSpeedKmh.toFixed(1)}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">km/h</p>
          </div>
        </div>


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
