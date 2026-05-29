import { useEffect, useRef } from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { pushBackup, BackupSettings } from '../services/SyncService';

const DEBOUNCE_MS = 3000;

export function useCloudSync() {
  const user = useAuthStore((s) => s.user);
  const setLastSyncAt = useAuthStore((s) => s.setLastSyncAt);
  const scheduleUpdatedAt = useScheduleStore((s) => s.updatedAt);
  const settingsUpdatedAt = useSettingsStore((s) => s.updatedAt);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const maxUpdatedAt = Math.max(scheduleUpdatedAt, settingsUpdatedAt);
    if (!user || maxUpdatedAt === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const { schedules, colorCategories } = useScheduleStore.getState();
        const { blockSize, timeFormat, textSize, textPosition, gridStartHour, gridEndHour, darkMode } =
          useSettingsStore.getState();
        const settings: BackupSettings = {
          blockSize, timeFormat, textSize, textPosition, gridStartHour, gridEndHour, darkMode,
        };
        await pushBackup(user.uid, {
          schedules,
          colorCategories,
          settings,
          updatedAt: Date.now(),
        });
        setLastSyncAt(Date.now());
      } catch (e) {
        console.warn('[CloudSync] push 실패:', e);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleUpdatedAt, settingsUpdatedAt, user]);
}
