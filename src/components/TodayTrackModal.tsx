/**
 * 오늘의 GPS 트랙 및 운동 요약 모달
 * - 오늘 수집된 모든 세션의 GPS 경로를 지도에 표시
 * - 집계된 운동 정보 표시 (거리, 시간, 페이스, 칼로리 등)
 * - 사용자 위치 추적 기능 (애니메이션)
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import Modal from './Modal';
import { useWorkout } from '../context/WorkoutContext';
import { mergeTodaySegments, getTodayDateString, isSessionOnDate } from '../../lib/geo/trackUtils';
import { useNavigate } from 'react-router-dom';
import { APP_CONSTANTS } from '../../lib/constants';
import 'leaflet/dist/leaflet.css';

interface TodayTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TodayData {
  polyline: LatLngExpression[];
  distanceKm: number;
  movingTimeMin: number;
  avgPace: string;
  filteredPoints: number;
  totalPoints: number;
  sessionsCount: number;
  avgRuckScore: number;
  totalKcal: number;
  startTime: string;
  endTime: string;
}

// 지도 중심을 사용자 위치에 따라 이동시키는 컴포넌트
function MapFollower({ polyline, isPlaying }: { polyline: LatLngExpression[]; isPlaying: boolean }) {
  const map = useMap();
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPlaying || polyline.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 애니메이션 시작
    setCurrentIndex(0);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= polyline.length) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return prev;
        }
        return next;
      });
    }, 100); // 100ms마다 다음 포인트로 이동

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, polyline]);

  useEffect(() => {
    if (isPlaying && currentIndex < polyline.length) {
      const point = polyline[currentIndex];
      if (Array.isArray(point) && point.length === 2) {
        map.setView(point as [number, number], map.getZoom(), {
          animate: true,
          duration: 0.1,
        });
      }
    }
  }, [currentIndex, isPlaying, polyline, map]);

  return null;
}

export default function TodayTrackModal({ isOpen, onClose }: TodayTrackModalProps) {
  const { workouts } = useWorkout();
  const navigate = useNavigate();
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  // 오늘 데이터 계산 (메모이제이션)
  const calculatedData = useMemo(() => {
    const today = getTodayDateString();
    const todaySessions = workouts.filter((w) => isSessionOnDate(w.date, today));

    if (todaySessions.length === 0) {
      return null;
    }

    try {
      // GPS 트랙 병합
      const merged = mergeTodaySegments(todaySessions);

      // 세션들에서 추가 정보 집계
      const totalRuckScore = todaySessions.reduce((sum, w) => sum + (w.ruckScore || 0), 0);
      const avgRuckScore = todaySessions.length > 0 ? totalRuckScore / todaySessions.length : 0;
      const totalKcal = todaySessions.reduce((sum, w) => sum + (w.kcal || 0), 0);

      // 첫 세션과 마지막 세션 시간
      const sortedSessions = [...todaySessions].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const startTime = sortedSessions[0]?.date || '';
      const endTime = sortedSessions[sortedSessions.length - 1]?.date || '';

      return {
        ...merged,
        sessionsCount: todaySessions.length,
        avgRuckScore: Math.round(avgRuckScore),
        totalKcal,
        startTime,
        endTime,
      };
    } catch (error) {
      console.error('GPS 데이터 병합 실패:', error);
      return null;
    }
  }, [workouts]);

  useEffect(() => {
    if (!isOpen) return;

    setTodayData(calculatedData);
    setLoading(false);
    setIsPlaying(false);
  }, [isOpen, calculatedData]);

  const handleGoToHistory = () => {
    onClose();
    navigate('/history');
  };

  const handlePlayAnimation = () => {
    setIsPlaying(true);
  };

  const handleStopAnimation = () => {
    setIsPlaying(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="오늘의 운동" maxWidth="800px">
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-[#6B7872] font-mono text-sm">데이터를 불러오는 중...</p>
          </div>
        ) : !todayData || todayData.polyline.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4" role="img" aria-label="위치">
              📍
            </div>
            <p className="text-[#6B7872] font-mono text-sm mb-2">
              오늘 수집된 GPS 경로가 없습니다.
            </p>
            <p className="text-[#6B7872] font-mono text-xs">
              운동을 시작하면 자동으로 경로가 기록됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Map */}
            <div
              className="relative rounded-sm overflow-hidden border border-[#2D3A35]/40"
              style={{ height: APP_CONSTANTS.MAP_DEFAULT_HEIGHT, minHeight: APP_CONSTANTS.MAP_MIN_HEIGHT }}
            >
              {typeof window !== 'undefined' && todayData.polyline.length > 1 && (
                <MapContainer
                  bounds={todayData.polyline}
                  className="w-full h-full"
                  zoomControl={true}
                  attributionControl={false}
                >
                  <TileLayer
                    url={APP_CONSTANTS.MAP_TILE_URL}
                    className="map-dark-filter"
                  />
                  <Polyline
                    positions={todayData.polyline}
                    pathOptions={{
                      color: '#00B46E',
                      weight: 4,
                      opacity: 0.9,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                  <MapFollower polyline={todayData.polyline} isPlaying={isPlaying} />
                </MapContainer>
              )}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0A0E0D]/20 to-[#0A0E0D]/40"></div>

              {/* 재생 컨트롤 */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] flex gap-2">
                <button
                  onClick={handlePlayAnimation}
                  disabled={isPlaying}
                  className="bg-[#00B46E] hover:bg-[#008556] disabled:bg-[#2D3A35] disabled:text-[#6B7872] text-[#0A0E0D] font-mono font-bold text-xs px-4 py-2 rounded-sm transition-colors"
                  aria-label="경로 따라가기 재생"
                >
                  {isPlaying ? '재생 중...' : '경로 따라가기'}
                </button>
                {isPlaying && (
                  <button
                    onClick={handleStopAnimation}
                    className="bg-[#FF4040] hover:bg-[#CC3333] text-white font-mono font-bold text-xs px-4 py-2 rounded-sm transition-colors"
                    aria-label="재생 정지"
                  >
                    정지
                  </button>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4">
                <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-1">
                  거리
                </p>
                <p className="text-2xl font-mono font-bold text-[#00B46E]">
                  {todayData.distanceKm}
                </p>
                <p className="text-xs font-mono text-[#6B7872] mt-1">km</p>
              </div>

              <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4">
                <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-1">
                  시간
                </p>
                <p className="text-2xl font-mono font-bold text-[#E5ECE8]">
                  {Math.floor(todayData.movingTimeMin)}
                </p>
                <p className="text-xs font-mono text-[#6B7872] mt-1">분</p>
              </div>

              <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4">
                <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-1">
                  평균 페이스
                </p>
                <p className="text-2xl font-mono font-bold text-[#FFB800]">
                  {todayData.avgPace}
                </p>
                <p className="text-xs font-mono text-[#6B7872] mt-1">/km</p>
              </div>

              {todayData.avgRuckScore > 0 && (
                <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4">
                  <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-1">
                    RuckScore
                  </p>
                  <p className="text-2xl font-mono font-bold text-[#00B46E]">
                    {todayData.avgRuckScore}
                  </p>
                  <p className="text-xs font-mono text-[#6B7872] mt-1">점</p>
                </div>
              )}

              {todayData.totalKcal > 0 && (
                <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4">
                  <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-1">
                    칼로리
                  </p>
                  <p className="text-2xl font-mono font-bold text-[#FFB800]">
                    {todayData.totalKcal}
                  </p>
                  <p className="text-xs font-mono text-[#6B7872] mt-1">kcal</p>
                </div>
              )}

              <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4">
                <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-1">
                  세션
                </p>
                <p className="text-2xl font-mono font-bold text-[#E5ECE8]">
                  {todayData.sessionsCount}
                </p>
                <p className="text-xs font-mono text-[#6B7872] mt-1">회</p>
              </div>
            </div>

            {/* Data Quality Info */}
            <div className="bg-[#0A0E0D]/30 border border-[#2D3A35]/20 rounded-sm p-3">
              <p className="text-xs font-mono text-[#6B7872]">
                GPS 포인트: {todayData.filteredPoints} / {todayData.totalPoints}
                {todayData.filteredPoints < todayData.totalPoints &&
                  ` (정확도 ${APP_CONSTANTS.GPS_ACCURACY_THRESHOLD_METERS}m 이상 필터링됨)`
                }
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={handleGoToHistory}
              className="w-full bg-[#00B46E] hover:bg-[#008556] text-[#0A0E0D] font-mono font-bold text-sm uppercase tracking-wider px-6 py-3 rounded-sm transition-colors"
            >
              히스토리로 이동
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
