/**
 * 오늘의 GPS 트랙 및 운동 요약 모달
 * - 오늘 수집된 모든 세션의 GPS 경로를 지도에 표시
 * - 집계된 운동 정보 표시 (거리, 시간, 페이스, 칼로리 등)
 */

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import Modal from './Modal';
import { useWorkout } from '../context/WorkoutContext';
import { mergeTodaySegments, getTodayDateString, isSessionOnDate } from '../../lib/geo/trackUtils';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

export default function TodayTrackModal({ isOpen, onClose }) {
  const { workouts } = useWorkout();
  const navigate = useNavigate();
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    // 오늘 날짜로 필터링
    const today = getTodayDateString();
    const todaySessions = workouts.filter((w) => isSessionOnDate(w.date, today));

    if (todaySessions.length === 0) {
      setTodayData(null);
      setLoading(false);
      return;
    }

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
    const startTime = sortedSessions[0]?.date;
    const endTime = sortedSessions[sortedSessions.length - 1]?.date;

    setTodayData({
      ...merged,
      sessionsCount: todaySessions.length,
      avgRuckScore: Math.round(avgRuckScore),
      totalKcal,
      startTime,
      endTime,
    });
    setLoading(false);
  }, [isOpen, workouts]);

  const handleGoToHistory = () => {
    onClose();
    // 오늘 날짜 필터가 적용된 히스토리로 이동 (추후 구현)
    navigate('/history');
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
            <div className="text-4xl mb-4">📍</div>
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
              style={{ height: '50vh', minHeight: '300px' }}
            >
              {typeof window !== 'undefined' && todayData.polyline.length > 1 && (
                <MapContainer
                  bounds={todayData.polyline}
                  className="w-full h-full"
                  zoomControl={true}
                  attributionControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                </MapContainer>
              )}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0A0E0D]/20 to-[#0A0E0D]/40"></div>
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
                📍 GPS 포인트: {todayData.filteredPoints} / {todayData.totalPoints}
                {todayData.filteredPoints < todayData.totalPoints &&
                  ` (정확도 30m 이상 필터링됨)`
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
