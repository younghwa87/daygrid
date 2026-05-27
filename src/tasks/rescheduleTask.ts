import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { useScheduleStore } from '../store/scheduleStore';
import { notificationService } from '../services/NotificationService';

export const RESCHEDULE_TASK_NAME = 'reschedule-notifications';

// 백그라운드 / 부팅 후 알람 갱신 태스크 정의 (앱 진입 전에 실행될 수 있으므로 모듈 최상위에 위치)
TaskManager.defineTask(RESCHEDULE_TASK_NAME, async () => {
  try {
    const schedules = useScheduleStore.getState().schedules;
    await notificationService.rescheduleAll(schedules);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 백그라운드 태스크 등록 (앱 초기화 시 1회 호출)
export async function registerRescheduleTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(RESCHEDULE_TASK_NAME);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(RESCHEDULE_TASK_NAME, {
      minimumInterval: 60 * 60 * 12, // 12시간마다
      stopOnTerminate: false,         // 앱 종료 후에도 유지
      startOnBoot: true,              // 부팅 후 자동 시작
    });
  } catch (e) {
    console.warn('[백그라운드] 태스크 등록 실패', e);
  }
}
