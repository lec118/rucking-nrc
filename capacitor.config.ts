import { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 설정 - iOS 네이티브 래퍼
 *
 * 이 설정은 웹앱을 iOS 네이티브 앱으로 감싸서
 * 백그라운드 GPS 추적을 가능하게 합니다.
 */
const config: CapacitorConfig = {
  appId: 'com.ruckingtracker.app',
  appName: 'Rucking Tracker',
  webDir: 'out', // Next.js static export 출력 디렉토리
  server: {
    // 개발 시 로컬 서버 사용
    // url: 'http://localhost:3000',
    // cleartext: true,
  },
  ios: {
    /**
     * 콘텐츠 모드
     * - 'always': 항상 네이티브 네비게이션 사용
     * - 'mobile': 모바일에서만 네이티브 네비게이션
     */
    contentInset: 'never',

    /**
     * 스크롤 활성화
     */
    scrollEnabled: true,

    /**
     * 백그라운드 모드 활성화
     * Info.plist에서 설정됨
     */
    scheme: 'capacitor',
  },
  plugins: {
    /**
     * 위치 권한 설정
     * iOS에서 백그라운드 위치 추적을 위해 필요
     */
    Location: {
      /**
       * 위치 권한 요청 메시지 (Info.plist에서 설정)
       */
    },

    /**
     * 화면 깨어있기 (Wake Lock)
     * 운동 중 화면 꺼짐 방지
     */
    ScreenKeepAwake: {
      enabled: true,
    },

    /**
     * 백그라운드 작업
     * GPS 추적 계속
     */
    BackgroundTask: {
      enabled: true,
    },
  },
};

export default config;
