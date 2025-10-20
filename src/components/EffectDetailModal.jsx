/**
 * 운동 효과 상세 정보 모달
 * - 각 지표(심폐지구력, 근력, 골밀도, 대사, 자세)의 상세 정보 표시
 * - Impact Level, 설명, 팁 제공
 * - 히스토리가 없어도 일반적인 정보 표시
 */

import Modal from './Modal';
import { getMetricDetail, getLevelLabel, getLevelColor } from '../../lib/bodyImpactHelpers';
import { calculateBodyImpact } from '../../lib/bodyImpact';
import { useWorkout } from '../context/WorkoutContext';

export default function EffectDetailModal({ isOpen, onClose, metric }) {
  const { workouts } = useWorkout();

  // metric이 없으면 early return
  if (!metric) {
    return null;
  }

  // 마지막 세션의 bodyImpact 계산 (있는 경우)
  let bodyImpact = null;
  if (workouts.length > 0) {
    const lastWorkout = workouts[workouts.length - 1];

    // bodyImpact 계산을 위한 입력 데이터 구성
    const input = {
      distKm: lastWorkout.distance || 0,
      durationMin: (lastWorkout.duration || 0),
      loadKg: lastWorkout.loadKg || 10,
      bodyWeightKg: 70,
      avgHR: lastWorkout.avgHR || 0,
      maxHR: 180,
      age: 30,
      elevation: lastWorkout.elevation || 0,
      recent7RuckScoreSum: 0,
      recent28RuckScoreSum: 0,
    };

    try {
      bodyImpact = calculateBodyImpact(input);
    } catch (e) {
      console.error('bodyImpact 계산 실패:', e);
    }
  }

  const detail = getMetricDetail(metric, bodyImpact);
  const levelColor = getLevelColor(detail.level);
  const levelLabel = getLevelLabel(detail.level);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={detail.name} maxWidth="600px">
      <div className="p-6 space-y-6">
        {/* Emoji & Description */}
        <div className="text-center">
          <div className="text-6xl mb-4">{detail.emoji}</div>
          <p className="text-sm font-mono text-[#A8B5AF] leading-relaxed">
            {detail.description}
          </p>
        </div>

        {/* Impact Level Meter */}
        <div className="bg-[#0A0E0D]/50 border border-[#2D3A35]/40 rounded-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider">
              영향 수준
            </p>
            <p className={`text-lg font-mono font-bold ${levelColor}`}>
              {levelLabel}
            </p>
          </div>

          {/* Level Bar */}
          <div className="relative h-3 bg-[#2D3A35] rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-[#00B46E] to-[#00FF88] rounded-full transition-all duration-500"
              style={{ width: `${(detail.level / 5) * 100}%` }}
            ></div>
          </div>

          {/* Level Numbers */}
          <div className="flex justify-between text-xs font-mono text-[#6B7872]">
            {[0, 1, 2, 3, 4, 5].map((l) => (
              <span
                key={l}
                className={detail.level === l ? 'text-[#00B46E] font-bold' : ''}
              >
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* Core Number (if available) */}
        {detail.score > 0 && (
          <div className="bg-[#0A0E0D]/30 border border-[#2D3A35]/30 rounded-sm p-4 text-center">
            <p className="text-xs font-mono text-[#6B7872] uppercase tracking-wider mb-2">
              측정값
            </p>
            <p className="text-4xl font-mono font-bold text-[#00B46E] mb-1">
              {detail.score}
            </p>
            <p className="text-xs font-mono text-[#6B7872]">{detail.unit}</p>
          </div>
        )}

        {/* Tips */}
        <div className="space-y-3">
          <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider">
            💡 권장 사항
          </p>
          {detail.tips.map((tip, idx) => (
            <div
              key={idx}
              className="bg-[#0A0E0D]/30 border border-[#2D3A35]/20 rounded-sm p-3"
            >
              <p className="text-sm font-mono text-[#E5ECE8]">• {tip}</p>
            </div>
          ))}
        </div>

        {/* 운동 기록이 없을 때 추가 메시지 */}
        {workouts.length === 0 && (
          <div className="bg-[#2D3A35]/20 border border-[#2D3A35]/30 rounded-sm p-4 text-center">
            <p className="text-sm font-mono text-[#A8B5AF] mb-2">
              아직 운동 기록이 없습니다
            </p>
            <p className="text-xs font-mono text-[#6B7872]">
              운동을 시작하면 개인화된 수치를 확인할 수 있습니다.
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-[#0A0E0D]/20 border border-[#2D3A35]/10 rounded-sm p-3">
          <p className="text-xs font-mono text-[#6B7872] leading-relaxed">
            ⚠️ 이 지표는 참고용입니다. 의료적 조언을 대체하지 않으며, GPS 정확도 및 개인 차이에 따라 변동될 수 있습니다.
          </p>
        </div>
      </div>
    </Modal>
  );
}
