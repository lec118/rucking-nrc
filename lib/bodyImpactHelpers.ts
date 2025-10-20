/**
 * bodyImpact.ts 기반 운동 효과 설명 및 팁 제공
 * UI에서 사용할 한국어 텍스트 생성
 */

import { ImpactLevel, BodyImpact } from './bodyImpact';

export type MetricType = 'cv' | 'musc' | 'bone' | 'meta' | 'posture';

export interface MetricDetail {
  name: string;
  emoji: string;
  description: string;
  level: ImpactLevel;
  score: number;
  unit: string;
  tips: string[];
}

/**
 * 각 지표의 기본 정보
 */
const METRIC_INFO: Record<MetricType, { name: string; emoji: string; description: string }> = {
  cv: {
    name: '심폐지구력',
    emoji: '❤️',
    description: '심혈관계 자극 강도. TRIMP 점수로 측정하며 유산소 운동 효과를 나타냅니다.',
  },
  musc: {
    name: '근지구력',
    emoji: '💪',
    description: '근육계 부하 강도. 체중과 무게를 고려한 기계적 부하로 측정합니다.',
  },
  bone: {
    name: '골자극',
    emoji: '🦴',
    description: '골격계 자극 강도. 충격과 부하를 통한 골밀도 증가 효과를 나타냅니다.',
  },
  meta: {
    name: '대사 활성',
    emoji: '🔥',
    description: '에너지 소모량. 칼로리 소모를 통한 대사 활성화를 나타냅니다.',
  },
  posture: {
    name: '자세·균형',
    emoji: '🧘',
    description: '코어 안정성 및 자세 교정 효과. 무게 부하와 거리로 측정합니다.',
  },
};

/**
 * Impact Level별 팁 생성
 */
function getTipsForLevel(metric: MetricType, level: ImpactLevel): string[] {
  const baseTips: Record<MetricType, Record<ImpactLevel, string[]>> = {
    cv: {
      0: ['운동을 시작해보세요.', 'GPS 기록이 부족합니다.'],
      1: ['가벼운 산책 수준입니다.', '속도를 조금 높여보세요.'],
      2: ['적절한 유산소 운동입니다.', '꾸준히 유지하세요.'],
      3: ['좋은 심혈관 자극입니다.', '이 강도를 유지하면 체력이 향상됩니다.'],
      4: ['높은 강도의 운동입니다.', '회복 시간을 충분히 가지세요.'],
      5: ['매우 높은 강도입니다.', '과훈련 주의. 회복 운동을 병행하세요.'],
    },
    musc: {
      0: ['운동을 시작해보세요.', '부하 기록이 없습니다.'],
      1: ['가벼운 근육 자극입니다.', '배낭 무게를 늘려보세요.'],
      2: ['적절한 근력 운동입니다.', '전신 근육이 골고루 자극됩니다.'],
      3: ['좋은 근육 부하입니다.', '하체와 코어가 강화됩니다.'],
      4: ['높은 근력 자극입니다.', '근육 회복에 단백질 섭취가 중요합니다.'],
      5: ['매우 높은 부하입니다.', '무릎·허리 부상 주의. 스트레칭 필수.'],
    },
    bone: {
      0: ['운동을 시작해보세요.', '골격 자극 기록이 없습니다.'],
      1: ['가벼운 골격 자극입니다.', '거리나 무게를 늘려보세요.'],
      2: ['적절한 골밀도 자극입니다.', '꾸준한 운동이 뼈 건강에 도움됩니다.'],
      3: ['좋은 골격 자극입니다.', '골밀도 증가에 효과적입니다.'],
      4: ['높은 골격 부하입니다.', '칼슘·비타민D 보충을 권장합니다.'],
      5: ['매우 높은 충격입니다.', '관절 회복 시간을 충분히 가지세요.'],
    },
    meta: {
      0: ['운동을 시작해보세요.', '칼로리 소모 기록이 없습니다.'],
      1: ['가벼운 칼로리 소모입니다.', '시간이나 강도를 높여보세요.'],
      2: ['적절한 에너지 소모입니다.', '체중 관리에 도움됩니다.'],
      3: ['좋은 칼로리 소모입니다.', '지속적인 체지방 감소 효과가 있습니다.'],
      4: ['높은 대사 활성화입니다.', '운동 후 영양 보충이 중요합니다.'],
      5: ['매우 높은 칼로리 소모입니다.', '탈수 주의. 충분한 수분 섭취 필요.'],
    },
    posture: {
      0: ['운동을 시작해보세요.', '자세 교정 기록이 없습니다.'],
      1: ['가벼운 코어 자극입니다.', '무게를 늘려 자세 안정성을 높이세요.'],
      2: ['적절한 자세 교정 효과입니다.', '코어 근육이 강화됩니다.'],
      3: ['좋은 자세 안정성입니다.', '척추 건강에 도움됩니다.'],
      4: ['높은 코어 자극입니다.', '허리 부상 주의. 복근 운동 병행 권장.'],
      5: ['매우 높은 자세 부하입니다.', '무게 중심 관리에 신경 쓰세요.'],
    },
  };

  return baseTips[metric][level] || ['데이터가 부족합니다.'];
}

/**
 * BodyImpact에서 특정 지표의 상세 정보 추출
 */
export function getMetricDetail(
  metric: MetricType,
  bodyImpact: BodyImpact | null
): MetricDetail {
  const info = METRIC_INFO[metric];

  if (!bodyImpact) {
    return {
      ...info,
      level: 0,
      score: 0,
      unit: '',
      tips: ['해당 지표를 계산할 데이터가 부족합니다.'],
    };
  }

  let level: ImpactLevel;
  let score: number;
  let unit: string;

  switch (metric) {
    case 'cv':
      level = bodyImpact.cardiovascular;
      score = 0; // TRIMP 실제 값은 bodyImpact에 없으므로 0 (level만 사용)
      unit = 'TRIMP';
      break;
    case 'musc':
      level = bodyImpact.muscular;
      score = 0; // MechLoad 실제 값 없음
      unit = 'MechLoad';
      break;
    case 'bone':
      level = bodyImpact.bone;
      score = 0; // BMS 실제 값 없음
      unit = 'BMS';
      break;
    case 'meta':
      level = bodyImpact.metabolic;
      score = 0; // kcal은 별도 필드에 있을 수 있음 (workoutBenefits 참조)
      unit = 'kcal';
      break;
    case 'posture':
      level = bodyImpact.posture;
      score = 0;
      unit = 'score';
      break;
    default:
      level = 0;
      score = 0;
      unit = '';
  }

  const tips = getTipsForLevel(metric, level);

  return {
    ...info,
    level,
    score,
    unit,
    tips,
  };
}

/**
 * Impact Level을 한국어 레이블로 변환
 */
export function getLevelLabel(level: ImpactLevel): string {
  const labels = ['없음', '매우 낮음', '낮음', '보통', '높음', '매우 높음'];
  return labels[level] || '알 수 없음';
}

/**
 * Impact Level을 색상 클래스로 변환 (Tailwind)
 */
export function getLevelColor(level: ImpactLevel): string {
  if (level === 0) return 'text-[#6B7872]';
  if (level <= 2) return 'text-[#FFB800]';
  if (level <= 4) return 'text-[#00B46E]';
  return 'text-[#FF4040]';
}
