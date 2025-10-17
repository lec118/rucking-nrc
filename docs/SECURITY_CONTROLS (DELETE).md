## 보안 통제 목록

### 1. 위협 모델링 (STRIDE)
- **Spoofing (S1-S4)**  
  - 위협: 토큰 탈취, API 키 위조, GPS 데이터 조작, 관리자 계정 탈취  
  - 완화: JWT 서명 검증, MFA, HMAC 기반 요청 서명, GPS 값에 대한 서명/기기 바인딩, 관리자 전용 RBAC
- **Tampering (T1-T4)**  
  - 위협: 경로 데이터 변조, DB 조작, 로그 위·변조, CSRF  
  - 완화: Zod/Pydantic 이중 검증, DB 트랜잭션/ROLE, 서명된 로그, CSRF 토큰·쿠키 분리
- **Repudiation (R1-R3)**  
  - 위협: 사용자 행위 부인, 운영자 변경 부인, 비정상 API 호출 추적 실패  
  - 완화: 구조화된 감사 로그, 요청 ID, Sentry 이벤트, 불변 스토리지
- **Information Disclosure (I1-I4)**  
  - 위협: 위치/PII 노출, 토큰 노출, 환경 변수 유출, 로그 통한 데이터 노출  
  - 완화: 민감정보 마스킹 로거, at-rest/ in-flight 암호화, 최소 권한, .env 격리
- **Denial of Service (D1-D4)**  
  - 위협: 인증 폭탄, 토큰 갱신 남용, GPS 스팸, DB 리소스 고갈  
  - 완화: Rate limit (30/min API, 5/15min auth, 10/min refresh), 캐시, 큐, WAF
- **Elevation of Privilege (E1-E4)**  
  - 위협: 권한 상승, 토큰 위조, 취약한 관리자 엔드포인트 악용, 의존성 취약점  
  - 완화: RBAC, JWT aud/iss 검증, 관리자 엔드포인트 보호, 정기적인 의존성 스캔 및 패치

총 22개 위협 항목별 세부 완화 전략은 `docs/security-ADR.md`와 본 문서를 통해 관리한다.

### 2. 인증 및 인가 아키텍처
- **JWT 기반 플로우**  
  1. 로그인 시 사용자 자격 증명 검증  
  2. Access Token(AT) 15분, Refresh Token(RT) 7일 발급  
  3. AT는 메모리에 저장, RT는 httpOnly 쿠키 또는 Secure Storage  
  4. 요청 시 `Authorization: Bearer <AT>` 헤더  
  5. 만료 전 1분 기준 `silent refresh` 호출 → 새 AT/RT 발급  
  6. 로그아웃/탈취 의심 시 RT 블랙리스트 처리

- **Access Token vs Refresh Token**  
  - AT: 짧은 TTL, 서명 검증 후 API 접근  
  - RT: 긴 TTL, 재발급 전용, 서버 단에서 해시 저장 후 회전

### 3. 토큰 관리 정책
- 저장 전략:  
  - AT → 메모리 + React context (재렌더 시 재참조)  
  - RT → httpOnly secure 쿠키(백엔드 관리) 또는 암호화된 IndexedDB  
- 로테이션: RT 사용 시마다 신규 발급, 이전 토큰 즉시 폐기  
- 만료 처리:  
  - AT 만료 60초 전 silent refresh  
  - RT 만료 시 재로그인 요청  
- 시크릿 관리: `.env`, Secret Manager, 키 롤오버 자동화

### 4. CORS / CSRF 보호
- **CORS**  
  - 허용 도메인 화이트리스트 (환경 변수 기반)  
  - `credentials` 설정 분리, 민감 헤더 최소화  
- **CSRF**  
  - 더블 서브밋 토큰 방식 (`x-csrf-token` + 쿠키 값 비교)  
  - 상태 변경 요청(POST/PUT/DELETE)에 대해 토큰 검증  
  - 주기적 토큰 재발급

### 5. 속도 제한 (Rate Limiting)
- 일반 API: 30 req/분  
- 인증 API: 5 req/15분  
- 토큰 갱신: 10 req/분  
- 429 응답 + Retry-After 헤더, IP/사용자 기반 추적

### 6. 로깅 및 민감 데이터 처리
- 구조화된 JSON 로그 (timestamp, level, namespace, requestId)  
- 마스킹 규칙: 이메일(앞2/뒤2만), GPS 경로(`[route:N points]`), IP(마지막 옥텟 마스킹), 토큰(앞4/뒤4)  
- 로그 보존: 운영 90일, 감사 1년, 검색 가능 저장소 + WORM

### 7. 환경별 보안 설정
- 개발: 로컬 CORS 허용, Debug 로그, Mock 토큰  
- 스테이징: 제한된 도메인, 실제 SSO 연동, 샌드박스 데이터, Sentry 연결  
- 프로덕션: 최소 권한 인프라, 강제 HTTPS, Secret Manager, 실시간 모니터링

### 8. 구현 우선순위 (Roadmap)
1. **Phase 1 – 핵심 보안**: 인증, 검증, CORS/CSRF, 기본 로깅  
2. **Phase 2 – 심층 방어**: Rate limit, 토큰 로테이션, RBAC  
3. **Phase 3 – 모니터링**: Sentry, SIEM 연동, 지표 수집  
4. **Phase 4 – 강화**: 정기 감사, 침투 테스트, 컴플라이언스 체계

### 9. 컴플라이언스 고려
- GDPR/CCPA: 데이터 접근/삭제 권리, 목적 제한, 데이터 이동성  
- 절차: 사용자 요청 포털, 30일 이내 처리, 감사 로그·증적 유지

### 10. 보안 체크리스트 (요약)
- **백엔드(17)**: 인증, 입력 검증, 로깅, CORS/CSRF, Rate limit, 비밀번호 해싱, 토큰 블랙리스트, 의존성 스캔 등  
- **프론트엔드(11)**: AT 메모리 저장, secure 쿠키, CSP, form validation, 에러 바운더리, 로그 마스킹, build-time lint  
- **인프라(8)**: HTTPS, WAF, CDN, 키/비밀관리, 백업 암호화, 네트워크 세분화, 취약점 스캔, DR 계획
