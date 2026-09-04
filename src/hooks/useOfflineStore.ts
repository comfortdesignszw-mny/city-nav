import { useState, useEffect } from 'react';
import { offlineStore } from '../services/storage';

export function useOfflineStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    // Subscribe to store updates
    const unsubscribe = offlineStore.subscribe(() => {
      setTick((t) => t + 1);
    });
    return () => unsubscribe();
  }, []);

  return offlineStore;
}
