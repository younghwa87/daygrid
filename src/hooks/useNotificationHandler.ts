import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import { useScheduleStore } from '../store/scheduleStore';
import { notificationService } from '../services/NotificationService';

export function useNotificationHandler() {
  const { schedules, setSelectedDate } = useScheduleStore();
  const appState = useRef(AppState.currentState);
  // 콜드 스타트 딥링크 중복 처리 방지: 처리한 identifier 기록
  const handledResponseId = useRef<string | null>(null);

  const navigateToSchedule = (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) setSelectedDate(schedule.date);
  };

  const handleLastResponse = (response: Notifications.NotificationResponse | null) => {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (handledResponseId.current === id) return;
    handledResponseId.current = id;
    const scheduleId = response.notification.request.content.data?.scheduleId as string | undefined;
    if (scheduleId) navigateToSchedule(scheduleId);
  };

  useEffect(() => {
    // 포그라운드 알림 수신 리스너 (배너 표시는 setNotificationHandler에서 처리)
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      // 포그라운드에서도 알림 배너 표시 (setNotificationHandler 설정으로 자동 처리)
    });

    // 알림 탭 감지 (포그라운드/백그라운드 공통)
    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      const scheduleId = response.notification.request.content.data?.scheduleId as string | undefined;
      if (scheduleId) navigateToSchedule(scheduleId);
    });

    // 앱이 종료된 상태에서 알림 탭으로 실행된 경우
    Notifications.getLastNotificationResponseAsync().then(handleLastResponse);

    // AppState 'active' 전환 시: 탭 확인 + 알람 자동 갱신
    const appStateListener = AppState.addEventListener('change', nextState => {
      if (appState.current !== 'active' && nextState === 'active') {
        // 백그라운드 복귀 시 알림 탭 확인 (중복 방지 포함)
        Notifications.getLastNotificationResponseAsync().then(handleLastResponse);
        // 알람 자동 갱신 (지나간 알람 정리 + 재등록)
        notificationService.rescheduleAll(schedules);
      }
      appState.current = nextState;
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
      appStateListener.remove();
    };
  }, [schedules]);
}
