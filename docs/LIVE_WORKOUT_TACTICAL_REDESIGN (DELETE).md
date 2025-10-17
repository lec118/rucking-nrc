# Live Workout 전술적 UI 재설계 (Tactical Redesign)

## 현황 분석

### 현재 문제점 (스크린샷 기준)

**시각적 불일치**:
```
┌─────────────────────────────────────┐
│  🟢 GPS Connected (좌상단 배지)      │ ← 밝은 초록/흰배경
├─────────────────────────────────────┤
│                                     │
│   [밝은 OpenStreetMap]              │ ← 캐주얼한 파스텔 톤
│   - 연두색 공원                      │
│   - 흰색 도로                        │
│   - 파란 마커                        │
│                                     │
├═════════════════════════════════════┤ ← 급격한 단절
│  ■■■ 완전 블랙 배경 ■■■              │
│  Distance    Time      Avg Pace     │ ← 흰색 텍스트
│    0.0      00:00:00      0.0       │
│                                     │
│  [초록 Start Workout 버튼]           │ ← 원색 그린
└─────────────────────────────────────┘
```

**문제 요약**:
1. **대비 과다**: 지도(밝음) vs. 패널(블랙) → 눈의 피로, 브랜드 단절
2. **캐주얼한 지도**: 훈련 앱이지만 관광 지도 느낌
3. **일관성 부재**: GPS 배지(밝음), 지도(밝음), 패널(어두움) 각자 다른 톤
4. **정보 계층 미흡**: 0.0, 00:00:00, 0.0이 같은 크기/무게로 나열됨

---

## 브랜드 톤앤매너 재정의

### 핵심 컨셉: "Tactical Fitness Command"
- **군더더기 없는 명료함** (No Fluff, Pure Data)
- **신뢰할 수 있는 정확성** (Military-Grade Precision)
- **집중력 유지** (Focus Under Pressure)
- **프로토콜 준수** (Disciplined Execution)

### 시각 언어
- **색상**: 다크 밀리터리 톤 (카키, 차콜, 올리브)
- **타이포**: 모노스페이스 숫자 (정확성 강조)
- **형태**: 각진 모서리, 명확한 경계선
- **피드백**: 즉각적, 최소 모션

---

## 색상 팔레트 (Tactical Color System)

### Primary Palette (메인 컬러)

```css
/* Base Colors - 다크 밀리터리 톤 */
--tactical-black:     #0A0E0D;    /* 배경 (완전 블랙 → 차콜 블랙) */
--tactical-charcoal:  #1C2321;    /* 카드 배경 */
--tactical-graphite:  #2D3A35;    /* 보더/구분선 */
--tactical-slate:     #404F49;    /* 비활성 요소 */

/* Brand Green - 브랜드 컬러 (절제된 밀리터리 그린) */
--tactical-green:     #00B46E;    /* Primary Action (기존 유지) */
--tactical-green-dim: #008556;    /* Hover/Active */
--tactical-green-dark:#00573B;    /* Pressed */
--tactical-green-glow:#00B46E40;  /* 투명도 25% 글로우 */

/* Data Colors - 정보 표시용 */
--data-primary:       #E5ECE8;    /* 주요 숫자 (화이트 → 오프화이트) */
--data-secondary:     #A8B5AF;    /* 라벨/보조 텍스트 */
--data-tertiary:      #6B7872;    /* 비활성 텍스트 */

/* Accent Colors - 상태 표시 */
--accent-active:      #00FF88;    /* GPS Active (밝은 그린) */
--accent-warning:     #FFB800;    /* GPS 약함 (엠버) */
--accent-danger:      #FF4444;    /* 에러 (레드) */

/* Map Overlay - 지도 위 오버레이 */
--map-overlay-dark:   #0A0E0D99;  /* 60% 블랙 */
--map-overlay-green:  #00B46E22;  /* 13% 그린 틴트 */
```

### 대비 기준표 (WCAG 2.1 AA 준수)

| 조합 | 대비율 | 용도 | 판정 |
|------|--------|------|------|
| `#E5ECE8` on `#0A0E0D` | 15.2:1 | 주요 숫자 | ✅ AAA |
| `#A8B5AF` on `#0A0E0D` | 8.5:1 | 라벨 텍스트 | ✅ AAA |
| `#00FF88` on `#1C2321` | 11.8:1 | GPS 상태 | ✅ AAA |
| `#00B46E` on `#0A0E0D` | 6.2:1 | 버튼 텍스트 | ✅ AA |

---

## 레이아웃 구조 재설계

### 전체 구조 (3-Layer Tactical Stack)

```
┌─────────────────────────────────────────────┐
│ [Layer 1: Map Base - 다크 필터 적용]         │
│  ┌───────────────────────────────────────┐  │
│  │ 🗺️ OpenStreetMap + Dark Overlay      │  │
│  │ (투명 그린 틴트 #00B46E22)             │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│ [Layer 2: Data Overlay - Floating HUD]      │
│  ┌─────┐              ┌──────────────┐      │
│  │ GPS │              │  [거리 중앙]  │      │
│  └─────┘              └──────────────┘      │
│                                             │
│  ┌────────┐  ┌────────┐  ┌────────┐        │
│  │  Time  │  │  Pace  │  │ Speed  │        │
│  └────────┘  └────────┘  └────────┘        │
├═════════════════════════════════════════════┤
│ [Layer 3: Command Panel - Bottom Fixed]    │
│  ┌─────────────────────────────────────┐   │
│  │   [EXECUTE WORKOUT]                 │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 상세 레이아웃 사양

#### 1. Map Layer (다크 필터 적용)
```css
.map-container {
  position: relative;
  height: 100vh;
  background: #0A0E0D;
}

.map-iframe {
  width: 100%;
  height: 100%;
  filter:
    brightness(0.7)        /* 지도 밝기 30% 감소 */
    saturate(0.6)          /* 채도 40% 감소 */
    contrast(1.1);         /* 대비 10% 증가 */
}

/* 지도 위 다크 오버레이 */
.map-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(10, 14, 13, 0.4) 0%,      /* 상단 40% 블랙 */
    rgba(0, 180, 110, 0.08) 40%,    /* 중앙 8% 그린 틴트 */
    rgba(10, 14, 13, 0.6) 100%      /* 하단 60% 블랙 */
  );
  pointer-events: none; /* 지도 터치 가능하도록 */
}
```

**효과**: 밝은 지도가 어두운 밀리터리 톤으로 통일됨, 지도와 UI의 단절 완화

---

#### 2. GPS Status Badge (좌상단 - 전술 배지 스타일)
```jsx
<div className="absolute top-4 left-4 z-20">
  <div className="flex items-center gap-2 px-3 py-2 bg-tactical-charcoal/90 backdrop-blur-sm border border-tactical-graphite/50 rounded">
    {/* Active 상태 */}
    <div className="relative">
      <div className="w-2 h-2 rounded-full bg-accent-active"></div>
      <div className="absolute inset-0 w-2 h-2 rounded-full bg-accent-active animate-ping opacity-75"></div>
    </div>
    <span className="text-xs font-mono text-data-secondary uppercase tracking-wider">
      GPS LOCKED
    </span>
  </div>
</div>
```

**CSS**:
```css
.status-badge {
  background: rgba(28, 35, 33, 0.9); /* tactical-charcoal 90% */
  border: 1px solid rgba(45, 58, 53, 0.5);
  backdrop-filter: blur(12px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

/* GPS 상태별 컬러 */
.gps-excellent { color: #00FF88; } /* > 10m 정확도 */
.gps-good      { color: #00B46E; } /* > 20m 정확도 */
.gps-fair      { color: #FFB800; } /* > 50m 정확도 */
.gps-poor      { color: #FF4444; } /* < 50m 정확도 */
```

---

#### 3. Primary Metric - 중앙 거리 표시 (HUD 스타일)
```jsx
<div className="absolute top-20 left-0 right-0 flex justify-center z-20">
  <div className="bg-tactical-charcoal/80 backdrop-blur-md border border-tactical-graphite/60 rounded-sm px-8 py-4">
    <div className="text-center">
      <p className="text-5xl font-mono font-bold text-data-primary tabular-nums tracking-tight">
        {distance.toFixed(1)}
      </p>
      <p className="text-xs font-mono text-data-tertiary uppercase tracking-widest mt-1">
        KILOMETERS
      </p>
    </div>
  </div>
</div>
```

**CSS**:
```css
.primary-metric {
  background: rgba(28, 35, 33, 0.8);
  border: 1px solid rgba(45, 58, 53, 0.6);
  border-radius: 2px; /* 각진 모서리 */
  backdrop-filter: blur(16px);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.05); /* 내부 하이라이트 */
}

.metric-number {
  font-family: 'Roboto Mono', 'Courier New', monospace;
  font-variant-numeric: tabular-nums; /* 숫자 너비 고정 */
  letter-spacing: -0.02em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
```

---

#### 4. Secondary Metrics - 하단 그리드 (3개 카드)
```jsx
<div className="absolute bottom-28 left-0 right-0 px-4 z-20">
  <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
    {/* Time Card */}
    <div className="bg-tactical-charcoal/70 backdrop-blur-sm border border-tactical-graphite/40 rounded-sm p-4">
      <p className="text-xs font-mono text-data-secondary uppercase tracking-wider mb-1">
        TIME
      </p>
      <p className="text-2xl font-mono font-bold text-data-primary tabular-nums">
        {formatTime(duration)}
      </p>
    </div>

    {/* Avg Pace Card */}
    <div className="bg-tactical-charcoal/70 backdrop-blur-sm border border-tactical-graphite/40 rounded-sm p-4">
      <p className="text-xs font-mono text-data-secondary uppercase tracking-wider mb-1">
        AVG PACE
      </p>
      <p className="text-2xl font-mono font-bold text-data-primary tabular-nums">
        {avgPace > 0 ? avgPace.toFixed(1) : '--'}
      </p>
      <p className="text-xs font-mono text-data-tertiary">min/km</p>
    </div>

    {/* Speed Card */}
    <div className="bg-tactical-charcoal/70 backdrop-blur-sm border border-tactical-graphite/40 rounded-sm p-4">
      <p className="text-xs font-mono text-data-secondary uppercase tracking-wider mb-1">
        SPEED
      </p>
      <p className="text-2xl font-mono font-bold text-data-primary tabular-nums">
        {currentSpeed}
      </p>
      <p className="text-xs font-mono text-data-tertiary">km/h</p>
    </div>
  </div>
</div>
```

**CSS**:
```css
.metric-card {
  background: rgba(28, 35, 33, 0.7);
  border: 1px solid rgba(45, 58, 53, 0.4);
  border-radius: 2px;
  backdrop-filter: blur(12px);
  transition: all 0.15s ease-out; /* 빠른 전환 */
}

.metric-card:hover {
  background: rgba(28, 35, 33, 0.85);
  border-color: rgba(0, 180, 110, 0.3); /* 호버 시 그린 보더 */
}

/* 데이터 없을 때 (--) */
.metric-empty {
  color: #404F49; /* tactical-slate */
}
```

---

#### 5. Command Panel - 하단 버튼 (전술 명령 스타일)
```jsx
<div className="absolute bottom-0 left-0 right-0 z-30">
  <div className="bg-gradient-to-t from-tactical-black via-tactical-black to-transparent px-6 pt-8 pb-6">
    {/* Start 버튼 */}
    {status === 'idle' && (
      <button className="w-full bg-tactical-green hover:bg-tactical-green-dim active:bg-tactical-green-dark text-tactical-black font-mono font-bold text-sm uppercase tracking-widest py-4 rounded-sm shadow-lg shadow-tactical-green-glow transition-all duration-150 active:scale-[0.98]">
        <span className="flex items-center justify-center gap-3">
          <span className="w-2 h-2 bg-tactical-black rounded-full"></span>
          EXECUTE WORKOUT
        </span>
      </button>
    )}

    {/* Pause/Stop 버튼 */}
    {status === 'active' && (
      <div className="grid grid-cols-2 gap-3">
        <button className="bg-tactical-charcoal border border-accent-warning/50 text-accent-warning hover:bg-accent-warning/10 font-mono font-semibold text-sm uppercase tracking-wider py-4 rounded-sm transition-all duration-150 active:scale-[0.98]">
          PAUSE
        </button>
        <button className="bg-tactical-charcoal border border-accent-danger/50 text-accent-danger hover:bg-accent-danger/10 font-mono font-semibold text-sm uppercase tracking-wider py-4 rounded-sm transition-all duration-150 active:scale-[0.98]">
          TERMINATE
        </button>
      </div>
    )}

    {/* Resume/Stop 버튼 */}
    {status === 'paused' && (
      <div className="grid grid-cols-2 gap-3">
        <button className="bg-tactical-green hover:bg-tactical-green-dim text-tactical-black font-mono font-bold text-sm uppercase tracking-widest py-4 rounded-sm shadow-lg shadow-tactical-green-glow transition-all duration-150 active:scale-[0.98]">
          RESUME
        </button>
        <button className="bg-tactical-charcoal border border-accent-danger/50 text-accent-danger hover:bg-accent-danger/10 font-mono font-semibold text-sm uppercase tracking-wider py-4 rounded-sm transition-all duration-150 active:scale-[0.98]">
          TERMINATE
        </button>
      </div>
    )}
  </div>
</div>
```

**CSS**:
```css
/* Primary Action Button (EXECUTE) */
.btn-execute {
  background: #00B46E;
  color: #0A0E0D;
  font-family: 'Roboto Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  border: none;
  border-radius: 2px;
  box-shadow:
    0 4px 16px rgba(0, 180, 110, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.15s ease-out;
}

.btn-execute:hover {
  background: #008556;
  box-shadow:
    0 6px 20px rgba(0, 180, 110, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.btn-execute:active {
  background: #00573B;
  transform: scale(0.98);
  box-shadow:
    0 2px 8px rgba(0, 180, 110, 0.2),
    inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Secondary Action Buttons (PAUSE/TERMINATE) */
.btn-secondary {
  background: #1C2321;
  border: 1px solid;
  font-family: 'Roboto Mono', monospace;
  border-radius: 2px;
  transition: all 0.15s ease-out;
}

.btn-pause {
  border-color: rgba(255, 184, 0, 0.5);
  color: #FFB800;
}

.btn-pause:hover {
  background: rgba(255, 184, 0, 0.1);
}

.btn-terminate {
  border-color: rgba(255, 68, 68, 0.5);
  color: #FF4444;
}

.btn-terminate:hover {
  background: rgba(255, 68, 68, 0.1);
}
```

---

## 타이포그래피 시스템

### 폰트 계층

```css
/* Primary Font - 데이터 표시용 */
@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap');

/* Font Hierarchy */
.text-hero {
  font-size: 3rem;        /* 48px - 주요 거리 */
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.text-metric {
  font-size: 1.5rem;      /* 24px - 보조 지표 */
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.text-label {
  font-size: 0.75rem;     /* 12px - 라벨 */
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  line-height: 1.5;
}

.text-unit {
  font-size: 0.75rem;     /* 12px - 단위 */
  font-weight: 400;
  letter-spacing: 0.05em;
  opacity: 0.6;
}

.text-command {
  font-size: 0.875rem;    /* 14px - 버튼 */
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}
```

### 모노스페이스 숫자 설정
```css
/* 모든 숫자는 tabular-nums로 고정 너비 */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* 예시: 00:00:00 → 00:59:59로 변해도 위치 안 흔들림 */
```

---

## 모션 & 인터랙션

### 애니메이션 원칙
- **Fast & Direct**: 100-150ms 전환 (군더더기 없음)
- **Linear/Ease-Out Only**: 부드러운 감속만 허용
- **No Bounce/Elastic**: 탄성 효과 금지
- **Immediate Feedback**: 터치 시 즉각 반응

### 주요 모션

#### 1. GPS 펄스 (활성 상태)
```css
@keyframes tactical-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.4);
  }
}

.gps-active-indicator {
  animation: tactical-pulse 2s ease-out infinite;
}
```

#### 2. 거리 증가 애니메이션 (카운터)
```jsx
import { useSpring, animated } from '@react-spring/web';

function DistanceCounter({ value }) {
  const props = useSpring({
    number: value,
    from: { number: 0 },
    config: { tension: 200, friction: 25 } // 빠르고 직선적
  });

  return (
    <animated.span className="text-hero font-mono text-data-primary tabular-nums">
      {props.number.to(n => n.toFixed(1))}
    </animated.span>
  );
}
```

#### 3. 버튼 피드백
```css
.btn-tactical {
  transition: all 0.15s ease-out;
}

.btn-tactical:active {
  transform: scale(0.98);
  /* 누르는 순간 98%로 축소 - 즉각 피드백 */
}

/* 호버는 색상만 변경 (형태 변화 최소) */
.btn-tactical:hover {
  background: var(--hover-color);
}
```

#### 4. 메트릭 카드 호버
```css
.metric-card {
  transition: all 0.15s ease-out;
  border: 1px solid rgba(45, 58, 53, 0.4);
}

.metric-card:hover {
  border-color: rgba(0, 180, 110, 0.3);
  background: rgba(28, 35, 33, 0.85);
  /* 그린 보더로 "선택됨" 피드백 */
}
```

---

## 여백 & 그리드 시스템

### Spacing Scale (8pt Grid)
```css
/* Tactical Spacing System */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
```

### 레이아웃 여백 적용
```css
/* GPS Badge */
.status-badge {
  padding: var(--space-2) var(--space-3); /* 8px 12px */
  margin: var(--space-4); /* 16px from edge */
}

/* Primary Metric */
.primary-metric {
  padding: var(--space-4) var(--space-8); /* 16px 32px */
  margin-top: var(--space-12); /* 48px from top */
}

/* Secondary Metrics Grid */
.metrics-grid {
  gap: var(--space-3); /* 12px gap */
  padding: 0 var(--space-4); /* 16px horizontal */
  margin-bottom: var(--space-28); /* 112px (버튼 공간) */
}

/* Command Panel */
.command-panel {
  padding: var(--space-8) var(--space-6) var(--space-6); /* 32px 24px 24px */
}
```

---

## 지도 스타일링 (OpenStreetMap 다크 모드)

### CSS Filter 적용
```css
.map-iframe {
  width: 100%;
  height: 100%;

  /* 다크 필터 조합 */
  filter:
    brightness(0.65)      /* 35% 어둡게 */
    saturate(0.5)         /* 50% 채도 감소 */
    contrast(1.15)        /* 15% 대비 증가 */
    hue-rotate(5deg);     /* 5도 색조 회전 (약간 그린 쪽) */

  /* 성능 최적화 */
  will-change: filter;
  transform: translateZ(0);
}
```

### 오버레이 그라디언트
```css
.map-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;

  background: linear-gradient(
    180deg,
    rgba(10, 14, 13, 0.5) 0%,       /* 상단: 50% 블랙 */
    rgba(0, 180, 110, 0.06) 35%,    /* 중앙상: 6% 그린 틴트 */
    rgba(0, 180, 110, 0.08) 50%,    /* 중앙: 8% 그린 틴트 */
    rgba(10, 14, 13, 0.3) 70%,      /* 중앙하: 30% 블랙 */
    rgba(10, 14, 13, 0.7) 100%      /* 하단: 70% 블랙 */
  );

  /* 추가 비네팅 효과 */
  box-shadow:
    inset 0 0 100px rgba(10, 14, 13, 0.4),
    inset 0 -100px 100px rgba(10, 14, 13, 0.6);
}
```

**효과**:
- 지도 상단: 어둡게 (헤더 영역과 조화)
- 지도 중앙: 약간의 그린 틴트 (브랜드 컬러 통일)
- 지도 하단: 매우 어둡게 (버튼 패널로 자연스러운 전환)

---

## Debug Panel 재디자인

### 전술 스타일 Debug Info
```jsx
{status === 'active' && (
  <div className="absolute bottom-32 left-4 z-20 bg-tactical-charcoal/95 backdrop-blur-sm border border-tactical-green/30 rounded-sm px-3 py-2 font-mono text-xs">
    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-tactical-graphite/50">
      <div className="w-1.5 h-1.5 bg-accent-active rounded-full animate-pulse"></div>
      <p className="text-data-secondary uppercase tracking-wider">TELEMETRY</p>
    </div>

    <div className="space-y-1">
      <div className="flex justify-between gap-4">
        <span className="text-data-tertiary">STATUS:</span>
        <span className="text-accent-active font-semibold">{status.toUpperCase()}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-data-tertiary">TIMER:</span>
        <span className="text-data-primary tabular-nums">{duration}s</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-data-tertiary">DIST:</span>
        <span className="text-data-primary tabular-nums">{(distance * 1000).toFixed(1)}m</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-data-tertiary">POINTS:</span>
        <span className="text-tactical-green tabular-nums">{routePath.length}</span>
      </div>
    </div>
  </div>
)}
```

**CSS**:
```css
.debug-panel {
  background: rgba(28, 35, 33, 0.95);
  border: 1px solid rgba(0, 180, 110, 0.3);
  backdrop-filter: blur(12px);
  font-family: 'Roboto Mono', monospace;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.debug-label {
  color: #6B7872; /* data-tertiary */
  text-transform: uppercase;
}

.debug-value {
  color: #E5ECE8; /* data-primary */
  font-variant-numeric: tabular-nums;
}
```

---

## 적용 우선순위표

### 🔴 1순위: 색상 & 대비 통일 (즉시 적용, 2-3시간)
**목표**: 지도와 UI 패널의 시각적 단절 제거

| 작업 | 파일 | 예상 시간 | 영향도 |
|------|------|----------|--------|
| **CSS 변수 정의** | `src/index.css` | 30분 | ★★★★★ |
| **지도 다크 필터** | `LiveWorkout.jsx` 라인 381-385 | 15분 | ★★★★★ |
| **지도 오버레이** | `LiveWorkout.jsx` 삽입 | 20분 | ★★★★☆ |
| **배경색 변경** | `bg-black` → `bg-tactical-black` 전역 | 30분 | ★★★★★ |
| **텍스트 색상** | `text-white` → `text-data-primary` | 30분 | ★★★★☆ |
| **GPS 배지 재스타일** | 라인 388-395 | 30분 | ★★★☆☆ |

**즉시 적용 코드**:
```css
/* src/index.css 상단에 추가 */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --tactical-black: #0A0E0D;
    --tactical-charcoal: #1C2321;
    --tactical-graphite: #2D3A35;
    --tactical-green: #00B46E;
    --data-primary: #E5ECE8;
    --data-secondary: #A8B5AF;
    --data-tertiary: #6B7872;
    --accent-active: #00FF88;
  }
}

/* 지도 다크 필터 */
.map-dark-filter {
  filter: brightness(0.65) saturate(0.5) contrast(1.15);
}
```

---

### 🟡 2순위: 레이아웃 & 타이포 재구성 (3-4시간)
**목표**: 정보 계층 명확화 및 집중력 향상

| 작업 | 현재 문제 | 개선 작업 | 예상 시간 |
|------|----------|----------|----------|
| **Roboto Mono 폰트 추가** | 기본 sans-serif | Google Fonts 임포트 | 15분 |
| **중앙 거리 표시** | 하단 그리드에 묻힘 | floating HUD로 이동 | 1시간 |
| **메트릭 카드 재디자인** | 3x2 그리드 (복잡) | 3개 카드만 (간결) | 1시간 |
| **타이포 계층화** | 모든 숫자 동일 크기 | Hero/Metric/Label 구분 | 45분 |
| **모노스페이스 적용** | 숫자 너비 가변 | tabular-nums 고정 | 30분 |
| **Debug 패널 재디자인** | 단순 배경 | 전술 스타일 적용 | 30분 |

---

### 🟢 3순위: 고급 인터랙션 (4-5시간)
**목표**: 프로페셔널한 피드백 및 애니메이션

| 작업 | 기술 요구사항 | 예상 시간 | ROI |
|------|--------------|----------|-----|
| **거리 카운터 애니메이션** | `@react-spring/web` | 1.5시간 | ★★★★☆ |
| **GPS 펄스 애니메이션** | CSS keyframes | 30분 | ★★★☆☆ |
| **버튼 햅틱 피드백** | CSS transform | 30분 | ★★★★☆ |
| **메트릭 호버 효과** | CSS transition | 30분 | ★★☆☆☆ |
| **지도 비네팅 효과** | CSS box-shadow | 45분 | ★★★☆☆ |
| **상태 전환 애니메이션** | framer-motion | 2시간 | ★★★☆☆ |

---

## Before/After 비교

### 색상 체계
| 요소 | Before | After | 효과 |
|------|--------|-------|------|
| 배경 | `#000000` (완전 블랙) | `#0A0E0D` (차콜 블랙) | 눈의 피로 감소 |
| 지도 | 밝음 (기본) | 어두움 (filter 적용) | 톤 통일 |
| 텍스트 | `#FFFFFF` (순백) | `#E5ECE8` (오프화이트) | 부드러운 대비 |
| 강조색 | 원색 그린 | `#00B46E` (전술 그린) | 절제된 강조 |
| 보더 | 없음/흰색 | `#2D3A35` (그라파이트) | 계층 구분 |

### 타이포그래피
| 요소 | Before | After | 개선점 |
|------|--------|-------|--------|
| 숫자 | Sans-serif | Roboto Mono | 가독성, 정확성 |
| 크기 | 모두 `text-3xl` | Hero/Metric/Label 구분 | 시각 계층 |
| 너비 | 가변 | `tabular-nums` 고정 | 안정성 |
| 레이블 | 소문자 | 대문자 + tracking | 명령 느낌 |

### 레이아웃
| 항목 | Before | After | 변화율 |
|------|--------|-------|--------|
| 지도 가시성 | 밝음 (방해됨) | 어두움 (조화) | -35% 밝기 |
| 정보 밀도 | 6개 지표 (혼란) | 3개 핵심 (집중) | -50% |
| 버튼 크기 | 작음 | 크고 명확 | +30% |
| 여백 | 불규칙 | 8pt 그리드 | 일관성 확보 |

---

## 구현 체크리스트

### 1순위 완료 확인
- [ ] `src/index.css`에 CSS 변수 정의
- [ ] 지도에 `filter: brightness(0.65)...` 적용
- [ ] 지도 위 그라디언트 오버레이 추가
- [ ] 모든 `bg-black` → `bg-[#0A0E0D]` 변경
- [ ] 모든 `text-white` → `text-[#E5ECE8]` 변경
- [ ] GPS 배지에 `bg-[#1C2321]/90` 적용
- [ ] 버튼 색상 `bg-[#00B46E]`로 통일

### 2순위 완료 확인
- [ ] Roboto Mono 폰트 임포트
- [ ] 거리 표시를 중앙 상단으로 이동 (floating)
- [ ] 메트릭 카드 3개로 축소 (Time, Pace, Speed)
- [ ] 숫자에 `font-mono tabular-nums` 적용
- [ ] 라벨에 `uppercase tracking-wider` 적용
- [ ] Debug 패널에 전술 스타일 적용

### 3순위 완료 확인
- [ ] `@react-spring/web` 설치
- [ ] 거리 카운터 애니메이션 구현
- [ ] GPS 펄스 애니메이션 추가
- [ ] 버튼에 `active:scale-[0.98]` 적용
- [ ] 메트릭 카드 호버 효과
- [ ] 지도 비네팅 효과

---

## 기술적 고려사항

### 성능 최적화
```css
/* GPU 가속 활용 */
.map-iframe,
.map-overlay,
.floating-metric {
  will-change: transform, opacity;
  transform: translateZ(0);
}

/* 불필요한 리페인트 방지 */
.metric-card {
  contain: layout style paint;
}
```

### 접근성
```css
/* 고대비 모드 지원 */
@media (prefers-contrast: high) {
  :root {
    --data-primary: #FFFFFF;
    --tactical-graphite: #FFFFFF;
  }
}

/* 움직임 감소 선호 */
@media (prefers-reduced-motion: reduce) {
  .gps-active-indicator {
    animation: none;
  }

  * {
    transition-duration: 0.01ms !important;
  }
}
```

### 반응형
```css
/* 작은 화면 (모바일) */
@media (max-width: 640px) {
  .primary-metric {
    font-size: 2.5rem; /* 48px → 40px */
    padding: var(--space-3) var(--space-6);
  }

  .metrics-grid {
    grid-template-columns: 1fr; /* 세로 배치 */
    gap: var(--space-2);
  }
}
```

---

## 참고 자료

### 디자인 영감
- **Military HUD**: 항공기 헤드업 디스플레이
- **Garmin Tactical Watch**: 전술 시계 UI
- **Apple Watch Workout**: 간결한 데이터 표시
- **Strava Dark Mode**: 스포츠 앱 다크 테마

### 폰트
- [Roboto Mono](https://fonts.google.com/specimen/Roboto+Mono) - 모노스페이스
- [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) - 대안

### 컬러 툴
- [Coolors](https://coolors.co/) - 팔레트 생성
- [Contrast Checker](https://webaim.org/resources/contrastchecker/) - WCAG 검증

---

## 최종 정리

### 핵심 변화
1. **지도 톤 다운**: 밝은 캐주얼 → 어두운 전술 (filter + overlay)
2. **색상 통일**: 블랙/화이트/그린 → 차콜/오프화이트/전술그린
3. **타이포 강화**: Sans-serif → Roboto Mono (tabular-nums)
4. **정보 계층**: 6개 동일 → 1개 Hero + 3개 Metric
5. **인터랙션**: 느슨함 → 즉각적 (150ms 이하)

### 기대 효과
- ✅ **브랜드 일관성**: 훈련 앱에 어울리는 프로페셔널한 톤
- ✅ **집중력 향상**: 명확한 계층으로 중요 정보에 시선 집중
- ✅ **눈의 피로 감소**: 과도한 대비 완화
- ✅ **신뢰감 증가**: 군더더기 없는 정확한 데이터 표시
- ✅ **사용성 개선**: 즉각적 피드백으로 실전 상황 대응

**다음 단계**: 1순위 작업부터 시작하여 점진적 개선 권장
