/**
 * 웹 브라우저용 단조 시간 소스
 * - performance.now() 사용 (시스템 시계 변경에 영향받지 않음)
 * - 페이지 로드 이후 경과 시간을 밀리초 단위로 반환
 */
export class TimeSource {
  /**
   * 현재 단조 시간 (ms)
   */
  static now(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    // fallback (비추천)
    return Date.now();
  }
}
