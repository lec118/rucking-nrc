/**
 * Service Worker - 최소 구현
 *
 * 오프라인 지원 기본 캐싱만 수행
 *
 * ⚠️ iOS Safari PWA 제약:
 * - 백그라운드에서 JavaScript 실행 중단
 * - 화면 꺼지면 GPS 추적 및 타이머 멈춤
 * - Service Worker도 백그라운드 실행 안 됨
 * - 해결책: 화면 켜둔 상태 유지 (Wake Lock API)
 */

const CACHE_NAME = 'rucking-v1';
const urlsToCache = [
  '/',
  '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  console.log('[SW] 설치');
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[SW] 활성화');
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] 오래된 캐시 삭제:', name);
            return caches.delete(name);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
