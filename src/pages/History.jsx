// FILE: /src/pages/History.jsx
// 운동 히스토리 전체 보기 (주별/월별 구분)

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';
import { formatDate } from '../../lib/aggregateMetrics';

export default function History() {
  const { workouts } = useWorkout();
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'

  // 날짜별로 그룹화
  const groupByWeek = (workouts) => {
    const groups = {};
    const sorted = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach((workout) => {
      const date = new Date(workout.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // 일요일 시작
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!groups[weekKey]) {
        groups[weekKey] = {
          label: formatWeekLabel(weekStart),
          workouts: [],
        };
      }
      groups[weekKey].workouts.push(workout);
    });

    return Object.entries(groups).map(([key, value]) => ({
      key,
      ...value,
    }));
  };

  const groupByMonth = (workouts) => {
    const groups = {};
    const sorted = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach((workout) => {
      const date = new Date(workout.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!groups[monthKey]) {
        groups[monthKey] = {
          label: formatMonthLabel(date),
          workouts: [],
        };
      }
      groups[monthKey].workouts.push(workout);
    });

    return Object.entries(groups).map(([key, value]) => ({
      key,
      ...value,
    }));
  };

  const formatWeekLabel = (date) => {
    const endDate = new Date(date);
    endDate.setDate(date.getDate() + 6);
    return `${date.getMonth() + 1}월 ${date.getDate()}일 - ${endDate.getMonth() + 1}월 ${endDate.getDate()}일`;
  };

  const formatMonthLabel = (date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  const groupedWorkouts = viewMode === 'week' ? groupByWeek(workouts) : groupByMonth(workouts);

  // 그룹별 통계 계산
  const calculateGroupStats = (workouts) => {
    const totalDistance = workouts.reduce((sum, w) => sum + w.distance, 0);
    const totalDuration = workouts.reduce((sum, w) => sum + w.duration, 0);
    const totalKcal = workouts.reduce((sum, w) => sum + (w.kcal || 0), 0);
    const avgRuckScore = workouts.reduce((sum, w) => sum + (w.ruckScore || 0), 0) / workouts.length;

    return {
      count: workouts.length,
      totalDistance: totalDistance.toFixed(1),
      totalDuration,
      totalKcal,
      avgRuckScore: avgRuckScore.toFixed(1),
    };
  };

  return (
    <div className="min-h-screen bg-[#0A0E0D] text-[#E5ECE8]">
      {/* Header */}
      <div className="bg-gradient-to-b from-black/80 to-transparent p-4 border-b border-[#2D3A35]/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-[#6B7872] hover:text-[#E5ECE8] transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-mono font-bold text-[#E5ECE8]">
                운동 히스토리
              </h1>
              <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mt-1">
                전체 운동 기록
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('week')}
              className={`font-mono font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-sm transition-colors ${
                viewMode === 'week'
                  ? 'bg-[#00B46E] text-[#0A0E0D]'
                  : 'bg-[#2D3A35] text-[#E5ECE8] hover:bg-[#3D4A45]'
              }`}
            >
              주별
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`font-mono font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-sm transition-colors ${
                viewMode === 'month'
                  ? 'bg-[#00B46E] text-[#0A0E0D]'
                  : 'bg-[#2D3A35] text-[#E5ECE8] hover:bg-[#3D4A45]'
              }`}
            >
              월별
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {groupedWorkouts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#6B7872] font-mono text-sm mb-4">
              아직 운동 기록이 없습니다
            </p>
            <Link
              to="/live-workout"
              className="inline-block bg-[#00B46E] hover:bg-[#008556] text-[#0A0E0D] font-mono font-bold text-sm uppercase tracking-wider px-6 py-3 rounded-sm"
            >
              첫 운동 시작하기
            </Link>
          </div>
        ) : (
          groupedWorkouts.map((group) => {
            const stats = calculateGroupStats(group.workouts);
            return (
              <div
                key={group.key}
                className="bg-[#1C2321]/80 backdrop-blur-sm border border-[#2D3A35]/60 rounded-sm p-6"
              >
                {/* Group Header with Stats */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#2D3A35]/40">
                  <div>
                    <h2 className="text-lg font-mono font-bold text-[#E5ECE8]">
                      {group.label}
                    </h2>
                    <p className="text-xs font-mono text-[#6B7872] mt-1">
                      {stats.count}회 운동
                    </p>
                  </div>
                  <div className="flex gap-6 text-right">
                    <div>
                      <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-1">
                        총 거리
                      </p>
                      <p className="text-lg font-mono font-bold text-[#00B46E]">
                        {stats.totalDistance} km
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-1">
                        총 시간
                      </p>
                      <p className="text-lg font-mono font-bold text-[#E5ECE8]">
                        {stats.totalDuration} min
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-1">
                        평균 점수
                      </p>
                      <p className="text-lg font-mono font-bold text-[#FFB800]">
                        {stats.avgRuckScore}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Workouts List */}
                <div className="space-y-3">
                  {group.workouts.map((workout) => (
                    <div
                      key={workout.id}
                      className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4 hover:border-[#00B46E]/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-mono font-bold text-[#E5ECE8]">
                              {workout.title}
                            </p>
                            {workout.ruckScore && (
                              <span className="bg-[#00B46E]/20 text-[#00B46E] text-xs font-mono font-bold px-2 py-1 rounded">
                                {workout.ruckScore}점
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm font-mono text-[#6B7872]">
                            <span>📍 {workout.distance.toFixed(1)} km</span>
                            <span>⏱️ {workout.duration} min</span>
                            {workout.kcal && <span>🔥 {workout.kcal} kcal</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono text-[#A8B5AF]">
                            {formatDate(workout.date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
