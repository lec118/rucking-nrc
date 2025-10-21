/**
 * 통합 대시보드 홈 화면
 */

import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';
import { calculateWindowStats, calculateStreak, calculateWeeklyProgress, getRecentWorkouts, formatDate } from '../../lib/aggregateMetrics';
import { getTodayDateString, isSessionOnDate } from '../../lib/geo/trackUtils';
import TodayTrackModal from '../components/TodayTrackModal';
import EffectDetailModal from '../components/EffectDetailModal';
import WorkoutDetailModal from '../components/WorkoutDetailModal';
import { MetricType } from '../../lib/bodyImpactHelpers';
import { APP_CONSTANTS } from '../../lib/constants';

interface EffectModalState {
  isOpen: boolean;
  metric: MetricType | null;
}

export default function Home() {
  const { workouts } = useWorkout();
  const [isTodayModalOpen, setIsTodayModalOpen] = useState(false);
  const [effectModalState, setEffectModalState] = useState<EffectModalState>({
    isOpen: false,
    metric: null,
  });
  const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);

  // 통계 계산 (메모이제이션)
  const stats = useMemo(() => calculateWindowStats(workouts), [workouts]);
  const streak = useMemo(() => calculateStreak(workouts), [workouts]);
  const weeklyProgress = useMemo(
    () => calculateWeeklyProgress(workouts, APP_CONSTANTS.WEEKLY_WORKOUT_GOAL),
    [workouts]
  );
  const recentWorkouts = useMemo(
    () => getRecentWorkouts(workouts, APP_CONSTANTS.RECENT_WORKOUTS_DISPLAY_LIMIT),
    [workouts]
  );

  // 오늘 운동 여부 확인
  const hasTodayWorkout = useMemo(() => {
    const today = getTodayDateString();
    return workouts.some((w) => isSessionOnDate(w.date, today));
  }, [workouts]);

  // 운동 효과 타일 클릭 핸들러 (메모이제이션)
  const handleEffectClick = useCallback((metric: MetricType) => {
    setEffectModalState({ isOpen: true, metric });
  }, []);

  // 운동 기록 클릭 핸들러
  const handleWorkoutClick = useCallback((workout: any) => {
    setSelectedWorkout(workout);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0E0D] text-[#E5ECE8]">
      {/* Header */}
      <div className="bg-gradient-to-b from-black/80 to-transparent p-4 border-b border-[#2D3A35]/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-mono font-bold text-[#00B46E]">
              Good Ruck
            </h1>
          </div>
          <Link
            to="/live-workout"
            className="bg-[#00B46E] hover:bg-[#008556] active:bg-[#00573B] text-[#0A0E0D] font-mono font-bold text-sm uppercase tracking-wider px-6 py-3 rounded-sm shadow-lg transition-all duration-150 active:scale-[0.98]"
            style={{ boxShadow: '0 4px 16px rgba(0, 180, 110, 0.25)' }}
          >
            START
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Workouts */}
          <div className="bg-[#1C2321]/80 backdrop-blur-sm border border-[#2D3A35]/60 rounded-sm p-4">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-2">
              총 운동
            </p>
            <p className="text-3xl font-mono font-bold text-[#00B46E]">
              {stats.recent28Days.totalWorkouts}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">이번 달</p>
          </div>

          {/* Total Distance */}
          <div className="bg-[#1C2321]/80 backdrop-blur-sm border border-[#2D3A35]/60 rounded-sm p-4">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-2">
              총 거리
            </p>
            <p className="text-3xl font-mono font-bold text-[#E5ECE8]">
              {stats.recent28Days.totalDistance}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">km</p>
          </div>

          {/* Streak */}
          <div className="bg-[#1C2321]/80 backdrop-blur-sm border border-[#2D3A35]/60 rounded-sm p-4">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-2">
              연속 기록
            </p>
            <p className="text-3xl font-mono font-bold text-[#FFB800]">
              {streak}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">일</p>
          </div>

          {/* Weekly Goal */}
          <div className="bg-[#1C2321]/80 backdrop-blur-sm border border-[#2D3A35]/60 rounded-sm p-4">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-2">
              주간 목표
            </p>
            <p className="text-3xl font-mono font-bold text-[#E5ECE8]">
              {weeklyProgress.completed}/{weeklyProgress.target}
            </p>
            <div className="h-1.5 bg-[#2D3A35] rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-[#00B46E] to-[#00FF88] rounded-full transition-all duration-500"
                style={{ width: `${weeklyProgress.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#1C2321]/80 backdrop-blur-sm border border-[#2D3A35]/60 rounded-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-mono font-bold text-[#E5ECE8] uppercase tracking-wider">
                최근 활동
              </h2>
              {/* 오늘 버튼 */}
              <button
                onClick={() => setIsTodayModalOpen(true)}
                className={`font-mono font-bold text-xs px-3 py-1 rounded-sm transition-colors ${
                  hasTodayWorkout
                    ? 'bg-[#00B46E] text-[#0A0E0D] hover:bg-[#008556]'
                    : 'bg-[#2D3A35] text-[#6B7872] hover:bg-[#3D4A45]'
                }`}
                aria-label="오늘의 운동 보기"
              >
                오늘
              </button>
            </div>
            <Link
              to="/history"
              className="bg-[#2D3A35] hover:bg-[#3D4A45] text-[#E5ECE8] font-mono font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-sm transition-colors"
            >
              MORE
            </Link>
          </div>

          {recentWorkouts.length === 0 ? (
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
            <div className="space-y-3">
              {recentWorkouts.map((workout) => (
                <button
                  key={workout.id}
                  onClick={() => handleWorkoutClick(workout)}
                  className="w-full bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4 hover:border-[#00B46E]/40 transition-colors cursor-pointer text-left"
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
                        <span>{workout.distance.toFixed(1)} km</span>
                        <span>{workout.duration} min</span>
                        {workout.kcal && <span>{workout.kcal} kcal</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-[#A8B5AF]">
                        {formatDate(workout.date)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 운동 효과 */}
        <div className="bg-[#1C2321]/80 backdrop-blur-sm border border-[#2D3A35]/60 rounded-sm p-6">
          <h2 className="text-lg font-mono font-bold text-[#E5ECE8] uppercase tracking-wider mb-4">
            운동 효과
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => handleEffectClick('cv')}
              className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4 text-center hover:border-[#00B46E]/40 transition-colors cursor-pointer"
              aria-label="심폐지구력 상세 보기"
            >
              <div className="text-3xl mb-2" role="img" aria-label="심폐지구력">
                ❤️
              </div>
              <p className="text-xs font-mono text-[#A8B5AF] mb-1">심폐지구력</p>
              <p className="text-xs font-mono text-[#6B7872]">유산소 강화</p>
            </button>

            <button
              onClick={() => handleEffectClick('musc')}
              className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4 text-center hover:border-[#00B46E]/40 transition-colors cursor-pointer"
              aria-label="근지구력 상세 보기"
            >
              <div className="text-3xl mb-2" role="img" aria-label="근지구력">
                💪
              </div>
              <p className="text-xs font-mono text-[#A8B5AF] mb-1">근지구력</p>
              <p className="text-xs font-mono text-[#6B7872]">전신 근육</p>
            </button>

            <button
              onClick={() => handleEffectClick('bone')}
              className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4 text-center hover:border-[#00B46E]/40 transition-colors cursor-pointer"
              aria-label="골자극 상세 보기"
            >
              <div className="text-3xl mb-2" role="img" aria-label="골자극">
                🦴
              </div>
              <p className="text-xs font-mono text-[#A8B5AF] mb-1">골자극</p>
              <p className="text-xs font-mono text-[#6B7872]">뼈 건강</p>
            </button>

            <button
              onClick={() => handleEffectClick('meta')}
              className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4 text-center hover:border-[#00B46E]/40 transition-colors cursor-pointer"
              aria-label="대사 활성 상세 보기"
            >
              <div className="text-3xl mb-2" role="img" aria-label="대사 활성">
                🔥
              </div>
              <p className="text-xs font-mono text-[#A8B5AF] mb-1">대사 활성</p>
              <p className="text-xs font-mono text-[#6B7872]">칼로리 소모</p>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TodayTrackModal isOpen={isTodayModalOpen} onClose={() => setIsTodayModalOpen(false)} />
      <EffectDetailModal
        isOpen={effectModalState.isOpen}
        onClose={() => setEffectModalState({ isOpen: false, metric: null })}
        metric={effectModalState.metric}
      />
      <WorkoutDetailModal
        isOpen={selectedWorkout !== null}
        onClose={() => setSelectedWorkout(null)}
        workout={selectedWorkout}
        allWorkouts={workouts}
      />
    </div>
  );
}
