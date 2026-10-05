'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/** Keeps the screen on while `isAwake` is true (where the browser supports it). */
export function useWakeLock() {
  const [isAwake, setIsAwake] = useState(false);
  // false during SSR, then the real answer on the client
  const isSupported = useSyncExternalStore(noopSubscribe, () => 'wakeLock' in navigator, () => false);

  useEffect(() => {
    if (!isSupported || !isAwake) return;
    let wakeLock: WakeLockSentinel | null = null;
    let cancelled = false;

    const requestWakeLock = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        // Toggled off while the request was in flight: let it go right away.
        if (cancelled) lock.release().catch(() => {});
        else wakeLock = lock;
      } catch (err) {
        console.error('Wake Lock error:', err);
        setIsAwake(false); // turn the toggle back off
      }
    };

    // Browsers drop the lock when you switch tabs; take it again on return.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLock?.release().catch(() => {});
    };
  }, [isAwake, isSupported]);

  return { isAwake, setIsAwake, isSupported };
}
