# TIME 표시 오버플로우 해결 방법

## 문제
"00:00:00" (8글자)가 칸을 벗어남

## ✅ 적용된 해결책

### 1. 폰트 크기 자동 조절 (clamp)
```jsx
style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)', letterSpacing: '-0.02em' }}
```
- **clamp(최소, 이상적, 최대)**: 화면 크기에 따라 자동 조절
- `1rem` (16px) ~ `1.5rem` (24px) 범위
- `4vw`: 뷰포트 너비의 4%

### 2. Letter Spacing 감소
```css
letter-spacing: -0.02em;
```
- 글자 간격을 약간 좁혀서 공간 절약

### 3. Overflow 방지
```css
overflow: hidden;
max-width: 100%;
```
- 절대로 칸 밖으로 나가지 않도록 강제

---

## 🎨 대안 1: 세로 스택 레이아웃

시간을 위/아래로 나눠서 표시:

```jsx
<div className="bg-[#1C2321]/70 backdrop-blur-sm border border-[#2D3A35]/40 rounded-sm p-4">
  <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-1">TIME</p>

  {/* HH:MM:SS를 HH:MM과 :SS로 분리 */}
  <div className="flex flex-col items-center">
    <p className="text-2xl font-mono font-bold text-[#E5ECE8] tabular-nums leading-tight">
      {timeHMS.substring(0, 5)} {/* HH:MM */}
    </p>
    <p className="text-lg font-mono font-bold text-[#E5ECE8]/70 tabular-nums leading-none">
      :{timeHMS.substring(6)} {/* :SS */}
    </p>
  </div>
</div>
```

---

## 🎨 대안 2: 압축 폰트 사용

더 좁은 폰트 사용:

```css
.metric-time-compact {
  font-family: 'Roboto Condensed', 'Arial Narrow', sans-serif;
  font-stretch: condensed; /* CSS font-stretch */
  transform: scaleX(0.9); /* 가로 90%로 압축 */
}
```

---

## 🎨 대안 3: 동적 폰트 크기

JavaScript로 폰트 크기 자동 조절:

```jsx
const [timeSize, setTimeSize] = useState('text-2xl');

useEffect(() => {
  // 1시간 이상이면 폰트 크기 줄이기
  if (elapsedMs >= 3600000) {
    setTimeSize('text-lg');
  } else {
    setTimeSize('text-2xl');
  }
}, [elapsedMs]);

<p className={`${timeSize} font-mono font-bold`}>{timeHMS}</p>
```

---

## 🎨 대안 4: 2줄 레이아웃 (깔끔한 방법)

```jsx
<div className="bg-[#1C2321]/70 backdrop-blur-sm border border-[#2D3A35]/40 rounded-sm p-3">
  <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-1">TIME</p>

  <div className="space-y-0">
    {/* 시간이 1시간 미만일 때 */}
    {elapsedMs < 3600000 ? (
      <p className="text-3xl font-mono font-bold text-[#E5ECE8] tabular-nums">
        {timeHMS}
      </p>
    ) : (
      /* 1시간 이상일 때 2줄로 */
      <>
        <p className="text-xl font-mono font-bold text-[#E5ECE8] tabular-nums leading-tight">
          {timeHMS.substring(0, 2)}h {/* HH */}
        </p>
        <p className="text-lg font-mono font-bold text-[#E5ECE8]/80 tabular-nums leading-tight">
          {timeHMS.substring(3)} {/* MM:SS */}
        </p>
      </>
    )}
  </div>
</div>
```

---

## 🎨 대안 5: 숫자만 크게, 콜론 작게

```jsx
<p className="font-mono font-bold text-[#E5ECE8] tabular-nums">
  <span className="text-2xl">{timeHMS[0]}{timeHMS[1]}</span>
  <span className="text-lg">:</span>
  <span className="text-2xl">{timeHMS[3]}{timeHMS[4]}</span>
  <span className="text-lg">:</span>
  <span className="text-2xl">{timeHMS[6]}{timeHMS[7]}</span>
</p>
```

---

## 📊 권장 순서

1. **현재 적용된 방법** (clamp + letter-spacing) - 시도해보기
2. 여전히 문제 발생 시 → **대안 4** (1시간 기준 레이아웃 변경)
3. 더 깔끔하게 → **대안 5** (콜론만 작게)

---

## 테스트 방법

1. **짧은 시간**: `00:05` (5초)
2. **1시간 미만**: `59:59` (59분 59초)
3. **1시간 이상**: `01:00:00` (1시간)
4. **긴 시간**: `12:34:56` (12시간 34분 56초)

각 케이스에서 칸을 벗어나지 않는지 확인
