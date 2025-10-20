// FILE: /src/pages/Home.jsx
// 통합 대시보드 홈 화면

import { Link } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';
import { calculateWindowStats, calculateStreak, calculateWeeklyProgress, getRecentWorkouts, formatDate } from '../../lib/aggregateMetrics';

export default function Home() {
  const { workouts } = useWorkout();

  // 통계 계산
  const stats = calculateWindowStats(workouts);
  const streak = calculateStreak(workouts);
  const weeklyProgress = calculateWeeklyProgress(workouts, 3); // 주 3회 목표
  const recentWorkouts = getRecentWorkouts(workouts, 3); // 메인 화면에 3개만 표시

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
            <h2 className="text-lg font-mono font-bold text-[#E5ECE8] uppercase tracking-wider">
              최근 활동
            </h2>
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
          )}
        </div>

        {/* Rucking Benefits */}
        <div className="bg-[#1C2321]/80 backdrop-blur-sm border border-[#2D3A35]/60 rounded-sm p-6">
          <h2 className="text-lg font-mono font-bold text-[#E5ECE8] uppercase tracking-wider mb-4">
            러킹의 장점
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4 text-center hover:border-[#00B46E]/40 transition-colors">
              <div className="text-3xl mb-2">❤️</div>
              <p className="text-xs font-mono text-[#A8B5AF] mb-1">심폐지구력</p>
              <p className="text-xs font-mono text-[#6B7872]">유산소 강화</p>
            </div>

            <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4 text-center hover:border-[#00B46E]/40 transition-colors">
              <div className="text-3xl mb-2">💪</div>
              <p className="text-xs font-mono text-[#A8B5AF] mb-1">근력 향상</p>
              <p className="text-xs font-mono text-[#6B7872]">전신 근육</p>
            </div>

            <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4 text-center hover:border-[#00B46E]/40 transition-colors">
              <div className="text-3xl mb-2">🦴</div>
              <p className="text-xs font-mono text-[#A8B5AF] mb-1">골밀도 증가</p>
              <p className="text-xs font-mono text-[#6B7872]">뼈 건강</p>
            </div>

            <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4 text-center hover:border-[#00B46E]/40 transition-colors">
              <div className="text-3xl mb-2">🔥</div>
              <p className="text-xs font-mono text-[#A8B5AF] mb-1">칼로리 소모</p>
              <p className="text-xs font-mono text-[#6B7872]">체중 관리</p>
            </div>

            <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-4 text-center hover:border-[#00B46E]/40 transition-colors">
              <div className="text-3xl mb-2">🧠</div>
              <p className="text-xs font-mono text-[#A8B5AF] mb-1">정신 건강</p>
              <p className="text-xs font-mono text-[#6B7872]">스트레스 해소</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
