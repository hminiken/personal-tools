'use client';

import { useState, useEffect } from 'react';

export function useWakeLock() {
  const [isAwake, setIsAwake] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check if the browser actually supports this feature (most modern ones do)
    setIsSupported('wakeLock' in navigator);
  }, []);

  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      if (!isSupported || !isAwake) return;
      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch (err: any) {
        console.error(`Wake Lock error: ${err.name}, ${err.message}`);
        setIsAwake(false); // Turn toggle off if it failed
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLock !== null) {
        await wakeLock.release().catch(() => {});
        wakeLock = null;
      }
    };

    // If the toggle is ON, request the lock. If OFF, release it.
    if (isAwake) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // THE MAGIC TRICK:
    // Browsers automatically release the wake lock if the user switches tabs.
    // This listener re-acquires the lock automatically when they return to your app!
    const handleVisibilityChange = () => {
      if (isAwake && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function when the component unmounts
    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAwake, isSupported]);

  return { isAwake, setIsAwake, isSupported };
}