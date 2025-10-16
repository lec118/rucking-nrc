## 취약점 스캔 및 보안 개선 보고서

### 1. 스캔 도구 및 실행 상태
- `npm run scan:web` → `npm audit --audit-level=moderate`  
  - **결과**: 로컬 환경에서 네트워크가 제한돼 실제 실행은 확인하지 못했습니다. 명령 실행 시 네트워크 허용 후 재시도가 필요합니다.
- `npm run scan:py` → `pip-audit -r server_py/requirements.txt`  
  - **결과**: 동일하게 네트워크 차단으로 인해 미실행. 파이썬 가상 환경에서 `pip-audit` 설치 후 실행이 필요합니다.

> 두 스캔 명령은 `package.json` 에서 `scan` 스크립트로 일괄 수행할 수 있도록 구성했습니다.

### 2. 개선 전 vs 개선 후 요약

| 영역 | 개선 전 | 개선 후 |
| --- | --- | --- |
| 토큰 저장 | 브라우저 기본 fetch, 토큰 저장 전략 부재 | In-memory Access Token + silent refresh, Refresh Token 사용 시 CSRF 토큰 자동 발급 |
| 인증 연계 | Workout API 호출 시 인증/CSRF 고려 없음 | `AuthContext` 도입, Authorization 헤더 & CSRF 헤더 자동 전달 |
| 백엔드 CORS/CSRF | `cors()` 기본 설정, CSRF 미적용 | 화이트리스트 기반 CORS + 더블 서브밋 토큰 방식 CSRF 보호 |
| 입력 검증 | Express 라우터 직접 처리 | Zod 기반 `validate` 미들웨어 연결, AppError 체계화 |
| 에러 처리 | 기본 try/catch | 구조화된 에러 핸들러, 로그 마스킹, 사용자 친화 오류 메시지 |
| Rate limit/보안 문서 | 산재된 표준안 | `docs/SECURITY_CONTROLS.md`에 STRIDE·Rate limit·로드맵·체크리스트 정리 |
| 취약점 스캔 | 별도 스크립트 없음 | `scan:web`, `scan:py`, `scan` 스크립트로 npm/pip 의존성 감사 설정 |

### 3. 후속 권장 사항
1. 네트워크 허용 환경에서 `npm run scan` 실행 후 결과 기록
2. JWT 서명 검증 및 Refresh Token 블랙리스트 구현 (현재는 토큰 문자열 검증 수준)
3. Rate limit, Sentry 등 운영 환경 통합
4. 백엔드 CSRF 토큰 발급/검증을 클라이언트 플로우와 연동 (로그인 성공 → CSRF 토큰 취득 → 상태 변경 요청)

### 4. 참고 자료
- `docs/SECURITY_CONTROLS.md`: 보안 통제 전체 목록
- `server/index.js`: CORS/CSRF, 인증 미들웨어, 검증 파이프라인
- `src/context/AuthContext.jsx`: 토큰 관리 및 silent refresh
