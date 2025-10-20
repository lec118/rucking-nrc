// FILE: /src/pages/Home.jsx
// 임시 홈 화면 (추후 5개 탭으로 확장 예정)

import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0E0D] text-[#E5ECE8] flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-mono font-bold text-[#00B46E] mb-4">
            RUCKING TRACKER
          </h1>
          <p className="text-[#A8B5AF] font-mono text-sm uppercase tracking-wider">
            정량화 러킹 시스템
          </p>
        </div>

        {/* Main CTA */}
        <Link
          to="/live-workout"
          className="block w-full bg-[#00B46E] hover:bg-[#008556] active:bg-[#00573B] text-[#0A0E0D] font-mono font-bold text-lg uppercase tracking-widest py-6 rounded-sm shadow-lg transition-all duration-150 active:scale-[0.98] text-center"
          style={{ boxShadow: '0 4px 16px rgba(0, 180, 110, 0.25)' }}
        >
          <span className="flex items-center justify-center gap-4">
            <span className="w-3 h-3 bg-[#0A0E0D] rounded-full"></span>
            START WORKOUT
          </span>
        </Link>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          <div className="bg-[#1C2321]/70 backdrop-blur-sm border border-[#2D3A35]/40 rounded-sm p-6 text-center">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="text-sm font-mono text-[#A8B5AF] uppercase tracking-wider mb-2">
              RuckScore 0-100
            </h3>
            <p className="text-xs text-[#6B7872]">
              정량화된 러킹 효과 측정
            </p>
          </div>

          <div className="bg-[#1C2321]/70 backdrop-blur-sm border border-[#2D3A35]/40 rounded-sm p-6 text-center">
            <div className="text-3xl mb-2">🗺️</div>
            <h3 className="text-sm font-mono text-[#A8B5AF] uppercase tracking-wider mb-2">
              GPS 추적
            </h3>
            <p className="text-xs text-[#6B7872]">
              실시간 경로 및 거리 기록
            </p>
          </div>

          <div className="bg-[#1C2321]/70 backdrop-blur-sm border border-[#2D3A35]/40 rounded-sm p-6 text-center">
            <div className="text-3xl mb-2">💪</div>
            <h3 className="text-sm font-mono text-[#A8B5AF] uppercase tracking-wider mb-2">
              Body Impact
            </h3>
            <p className="text-xs text-[#6B7872]">
              5개 신체 영역 분석
            </p>
          </div>
        </div>

        {/* Notice */}
        <div className="bg-[#2D3A35]/30 border border-[#00B46E]/30 rounded-sm p-4 mt-8">
          <p className="text-xs font-mono text-[#A8B5AF] text-center">
            🚧 새로운 대시보드 개편 중입니다. 곧 History, Effects, Impact, Streaks 탭이 추가됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
