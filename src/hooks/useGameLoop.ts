import { useEffect } from 'react';
import { TICK_MS } from '../game/balance';
import { useGameStore } from '../store/gameStore';
import { saveThrottled } from '../store/persistence';

/** Drives passive production at TICK_MS and sweeps a throttled save. */
export function useGameLoop(running: boolean) {
  useEffect(() => {
    if (!running) return;
    useGameStore.getState().applyTick(Date.now());
    const interval = setInterval(() => {
      const now = Date.now();
      useGameStore.getState().applyTick(now);
      useGameStore.getState().tickAchievements();
      saveThrottled(useGameStore.getState(), now);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [running]);
}
