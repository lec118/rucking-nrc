# 🗑️ 레거시 코드 삭제 목록

## 완전 삭제 파일

### 1. `/src/components/EffectivenessMetrics.jsx`
**삭제 이유**:
- 레거시 "Performance Metrics" UI 컴포넌트
- `getStatsForPeriod` 함수를 사용하여 레거시 통계 계산
- "Total Distance", "Consistency", "Average Weight" 등 단순 집계만 제공
- RuckScore 기반 정량화 메트릭 없음

**대체 모듈**: `/features/live/RuckScoreView.tsx`

**마이그레이션 단계**:
1. `/src/pages/Home.jsx`에서 `import EffectivenessMetrics` 제거
2. `<EffectivenessMetrics />` 컴포넌트 사용 부분 제거
3. 파일 삭제

---

### 2. `/src/components/BodyEffectiveness.jsx`
**삭제 이유**:
- 레거시 "Body Impact" UI 컴포넌트
- 하드코딩된 "Muscle Engagement" 퍼센티지 (Legs 95%, Core 75% 등)
- 실제 운동 데이터와 무관한 고정값 표시
- 칼로리 계산 공식이 부정확: `distance * (60 + weight * 10)`
- "Total Load" 계산도 단순: `weight * distance`

**대체 모듈**: `/features/live/MetricsTiles.tsx`

**마이그레이션 단계**:
1. `/src/pages/Home.jsx`에서 `import BodyEffectiveness` 제거
2. `<BodyEffectiveness />` 컴포넌트 사용 부분 제거
3. 파일 삭제

---

### 3. `/src/utils/workoutStats.js`
**삭제 이유**:
- 레거시 통계 계산 유틸리티
- `getStatsForPeriod` 함수가 단순 집계만 수행 (totalDistance, avgWeight 등)
- RuckScore, TRIMP, BMS 등 정량화 메트릭 미지원
- 심박수 기반 TRIMP 계산 없음
- 과학적 공식 없음

**대체 모듈**: `/lib/trainingMetrics.ts`

**마이그레이션 단계**:
1. `/src/components/EffectivenessMetrics.jsx`에서 `import { getStatsForPeriod }` 제거
2. 새 `calculateMetrics` 함수로 교체
3. 파일 삭제

---

## 부분 수정 파일

### 4. `/src/context/WorkoutContext.jsx`
**수정 이유**:
- `useEffect`로 "effect" 관련 로직 포함 가능성
- 레거시 상태 관리 로직이 섞여 있을 수 있음

**수정 내용**:
1. `effect`, `muscleEngage`, `trainingEffect` 관련 state 제거
2. 레거시 계산 함수 제거 (`calculateEffect`, `estimateMuscleEngage` 등)
3. 새 도메인 API 통합: `WorkoutSession`, `calculateMetrics`

**마이그레이션 단계**:
```javascript
// BEFORE (제거 대상)
const [effect, setEffect] = useState(null);
const [muscleEngage, setMuscleEngage] = useState({});

function calculateEffect(workout) {
  // 레거시 로직
}

// AFTER (새 방식)
import { calculateMetrics } from '../lib/trainingMetrics';

function getMetrics(session) {
  return calculateMetrics({
    bodyWeightKg: session.bodyWeightKg,
    loadKg: session.loadKg,
    distanceKm: session.distanceM / 1000,
    movingTimeMin: session.movingTimeMs / 60000,
    // ...
  });
}
```

---

### 5. `/src/pages/Home.jsx`
**수정 이유**:
- `<EffectivenessMetrics />`, `<BodyEffectiveness />` 컴포넌트 사용

**수정 내용**:
1. 레거시 컴포넌트 임포트 제거
2. 새 컴포넌트로 교체: `<RuckScoreView />`, `<MetricsTiles />`

**마이그레이션 단계**:
```jsx
// BEFORE
import EffectivenessMetrics from '../components/EffectivenessMetrics';
import BodyEffectiveness from '../components/BodyEffectiveness';

<EffectivenessMetrics />
<BodyEffectiveness />

// AFTER
import RuckScoreView from '../features/live/RuckScoreView';
import MetricsTiles from '../features/live/MetricsTiles';

{process.env.NEXT_PUBLIC_RUCK_METRICS_V3 === 'true' && (
  <>
    <RuckScoreView />
    <MetricsTiles />
  </>
)}
```

---

### 6. `/src/pages/LiveWorkout.jsx`
**수정 이유**:
- 레거시 메트릭 계산 로직 포함
- `effect` 관련 주석이나 변수명 가능성

**수정 내용**:
1. 레거시 계산 로직 제거 (칼로리, 속도 등 하드코딩)
2. 새 도메인/서비스 API로 교체:
   - `WorkoutSession` (상태 관리)
   - `GeoService` (GPS)
   - `TimeSource` (모노토닉 클록)
   - `calculateMetrics` (메트릭)

**마이그레이션 단계**:
```javascript
// BEFORE (제거 대상)
const calories = distance * (60 + weight * 10); // 부정확

// AFTER (새 방식)
import { calculateMetrics } from '../lib/trainingMetrics';

const metrics = calculateMetrics({
  bodyWeightKg: 70,
  loadKg: 15,
  distanceKm: session.distanceM / 1000,
  movingTimeMin: session.movingTimeMs / 60000,
});

console.log(metrics.kcal, metrics.ruckScore);
```

---

## 검색 키워드로 추가 확인 필요

다음 키워드로 전체 코드베이스를 검색하여 누락된 레거시 코드를 찾으세요:

```bash
# Case-insensitive 검색
grep -ri "effect" src/
grep -ri "muscleEngage" src/
grep -ri "trainingEffect" src/
grep -ri "fitnessImpact" src/
grep -ri "bioEffect" src/
grep -ri "legacyEffect" src/
grep -ri "oldMetrics" src/
```

**발견 시 조치**:
1. 해당 파일을 삭제 목록에 추가
2. 대체 모듈로 교체
3. 주석으로 `@deprecated` 표시 후 삭제

---

## 삭제 실행 명령

```bash
# 레거시 파일 삭제
rm src/components/EffectivenessMetrics.jsx
rm src/components/BodyEffectiveness.jsx
rm src/utils/workoutStats.js

# Git에 기록
git add -A
git commit -m "feat: 레거시 effect/muscle engage 로직 제거

- EffectivenessMetrics, BodyEffectiveness 컴포넌트 삭제
- workoutStats 유틸 삭제
- WorkoutContext에서 레거시 상태 제거

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 데이터 호환성

### 기존 저장된 워크아웃 데이터
- **30일 호환 레이어 제공**: 레거시 데이터 읽기 전용 지원
- **새 데이터 구조**: `WorkoutSession` 타입 사용
- **마이그레이션 스크립트**: 필요 시 `/scripts/migrate-legacy-data.ts` 작성

### 로컬 스토리지 키
```javascript
// 레거시 (읽기만)
localStorage.getItem('workouts_legacy');

// 새 방식
localStorage.getItem('workouts_v3');
```

---

## 확인 체크리스트

- [ ] 3개 레거시 파일 삭제 완료
- [ ] WorkoutContext에서 레거시 상태 제거
- [ ] Home.jsx에서 레거시 컴포넌트 제거
- [ ] LiveWorkout.jsx에서 레거시 계산 로직 제거
- [ ] 전체 코드베이스에서 "effect" 키워드 검색 → 0건
- [ ] 빌드 성공 (`pnpm build`)
- [ ] 린트 통과 (`pnpm lint`)
- [ ] 타입 체크 통과 (`pnpm typecheck`)
- [ ] Git 커밋 완료
