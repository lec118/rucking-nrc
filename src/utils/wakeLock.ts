// src/utils/wakeLock.ts
// Screen Wake Lock API utilities for keeping the screen on during workouts

let wakeLockInstance: WakeLockSentinel | null = null;

/**
 * Request a wake lock to prevent the screen from turning off
 * Safe to call multiple times - only creates one instance
 * Automatically handles browser support and errors
 */
export async function requestWakeLock(): Promise<void> {
  // SSR safety check
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return;
  }

  // Check if Wake Lock API is supported
  if (!('wakeLock' in navigator)) {
    console.log('⚠️ Wake Lock API not supported in this browser');
    return;
  }

  // Don't create duplicate wake locks
  if (wakeLockInstance !== null) {
    console.log('🔒 Wake lock already active');
    return;
  }

  try {
    wakeLockInstance = await navigator.wakeLock.request('screen');
    console.log('🔒 Wake lock activated - screen will stay on');

    // Handle wake lock release (e.g., tab visibility change)
    wakeLockInstance.addEventListener('release', () => {
      console.log('🔓 Wake lock released');
      wakeLockInstance = null;
    });
  } catch (error) {
    console.error('❌ Failed to request wake lock:', error);
    wakeLockInstance = null;
  }
}

/**
 * Release the current wake lock
 * Safe to call even if no wake lock is active
 */
export async function releaseWakeLock(): Promise<void> {
  if (wakeLockInstance === null) {
    return;
  }

  try {
    await wakeLockInstance.release();
    wakeLockInstance = null;
    console.log('🔓 Wake lock released manually');
  } catch (error) {
    console.error('❌ Failed to release wake lock:', error);
    wakeLockInstance = null;
  }
}

/**
 * Set up automatic wake lock re-request when page becomes visible
 * Call this once during component mount
 * @param shouldReRequest - Function that returns true if wake lock should be re-requested
 */
export function setupWakeLockVisibilityHandler(shouldReRequest: () => boolean): () => void {
  // SSR safety check
  if (typeof document === 'undefined') {
    return () => {};
  }

  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible' && shouldReRequest()) {
      console.log('👁️ Page became visible, re-requesting wake lock');
      await requestWakeLock();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
