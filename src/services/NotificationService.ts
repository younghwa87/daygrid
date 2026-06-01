import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert, Linking } from 'react-native';
import dayjs from 'dayjs';
import { Schedule } from '../types';
import { registerRescheduleTask } from '../tasks/rescheduleTask';

// iOS 안전 등록 한도 (64개 한도에서 여유 4개 확보)
const IOS_SAFE_LIMIT = 60;

// 포그라운드에서도 알림 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


// 알림 등록 파라미터
interface AlarmParams {
  id: string;
  title: string;
  body: string;
  triggerDate: Date;
  scheduleId: string;
}

// offset → 알림 본문 텍스트
function offsetToBody(offsetMin: number): string {
  if (offsetMin === 0) return '일정이 곧 시작됩니다';
  const abs = Math.abs(offsetMin);
  if (abs < 60) return `${abs}분 후 시작합니다`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m > 0 ? `${h}시간 ${m}분 후 시작합니다` : `${h}시간 후 시작합니다`;
}

// 일정 date + startTime(분) → Date 객체
function scheduleStartDate(schedule: Schedule, dateStr?: string): Date {
  const base = dateStr ?? schedule.date;
  const [y, mo, d] = base.split('-').map(Number);
  // startTime 분을 시/분으로 분해
  const h = Math.floor(schedule.startTime / 60);
  const m = schedule.startTime % 60;
  return new Date(y, mo - 1, d, h, m, 0, 0);
}

// 반복 일정의 향후 28일 발생 날짜 계산
export function getNextOccurrences(schedule: Schedule, days = 28): string[] {
  const results: string[] = [];
  const today = dayjs().startOf('day');
  const base = dayjs(schedule.date);

  for (let i = 0; i < days; i++) {
    const target = today.add(i, 'day');
    const dateStr = target.format('YYYY-MM-DD');
    if (schedule.exceptions?.includes(dateStr)) continue;
    if (target.isBefore(base, 'day')) continue;

    let matches = false;
    switch (schedule.repeat) {
      case 'none':
        matches = dateStr === schedule.date;
        break;
      case 'daily':
        matches = true;
        break;
      case 'weekly':
        matches = base.day() === target.day();
        break;
      case 'monthly':
        matches = base.date() === target.date();
        break;
      case 'custom':
        matches = (schedule.repeatDays ?? []).includes(target.day());
        break;
    }
    if (matches) results.push(dateStr);
  }
  return results;
}

class NotificationService {
  // 권한 요청 (실기기 여부 먼저 확인)
  async requestPermission(): Promise<boolean> {
    if (!Device.isDevice) {
      return false;
    }
    try {
      const { status: current } = await Notifications.getPermissionsAsync();
      if (current === 'granted') {
        await this.checkExactAlarmPermission();
        return true;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '알림 권한 필요',
          '설정 > 앱 > 알림 허용에서 알림을 켜주세요',
          [
            { text: '설정으로 이동', onPress: () => Linking.openSettings() },
            { text: '취소', style: 'cancel' },
          ]
        );
        return false;
      }
      await this.checkExactAlarmPermission();
      return true;
    } catch {
      return false;
    }
  }

  // Android 12+ 정확한 알람 권한 확인
  private async checkExactAlarmPermission(): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
      const canSchedule = await (Notifications as any).canScheduleExactNotificationsAsync?.();
      if (canSchedule === false) {
        Alert.alert(
          '정확한 알람 권한 필요',
          '설정 > 앱 > Datile > 알람 및 리마인더에서 권한을 허용해주세요.\n허용하지 않으면 알림이 부정확하게 발송될 수 있습니다.',
          [
            { text: '설정으로 이동', onPress: () => Linking.openSettings() },
            { text: '나중에', style: 'cancel' },
          ]
        );
      }
    } catch {
      // 구버전 Android는 이 API 미지원 — 무시
    }
  }

  // Android 알림 채널 생성
  async createChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
      await Notifications.setNotificationChannelAsync('schedule_alarm', {
        name: '일정 알림',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    } catch {
      // 채널 생성 실패 시 기본 채널로 폴백
    }
  }

  // 단일 알람 등록 — 등록된 notificationId 반환
  async scheduleAlarm(params: AlarmParams): Promise<string> {
    try {
      if (params.triggerDate <= new Date()) {
        return '';
      }
      await Notifications.scheduleNotificationAsync({
        identifier: params.id,
        content: {
          title: params.title,
          body: params.body,
          data: { scheduleId: params.scheduleId },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: params.triggerDate,
          ...(Platform.OS === 'android' ? { channelId: 'schedule_alarm' } : {}),
        },
      });
      return params.id;
    } catch {
      return '';
    }
  }

  // 단일 일정에 복수 offset 알람 등록 (비반복) — 등록된 ID 배열 반환
  async scheduleMultipleAlarms(schedule: Schedule, offsets: number[]): Promise<string[]> {
    if (!offsets.length) return [];
    const permitted = await this.requestPermission();
    if (!permitted) return [];

    const startDate = scheduleStartDate(schedule);
    const ids: string[] = [];
    for (const offset of offsets) {
      const triggerDate = new Date(startDate.getTime() + offset * 60 * 1000);
      // ID 형식: ${scheduleId}_${YYYY-MM-DD}_${abs}min
      const id = `${schedule.id}_${schedule.date}_${Math.abs(offset)}min`;
      const registered = await this.scheduleAlarm({
        id,
        title: schedule.title,
        body: offsetToBody(offset),
        triggerDate,
        scheduleId: schedule.id,
      });
      if (registered) ids.push(registered);
    }
    return ids;
  }

  // 반복 일정 알람 등록 (28일치) — 등록된 ID 배열 반환
  async scheduleRepeatingAlarms(schedule: Schedule, offsets: number[]): Promise<string[]> {
    if (!offsets.length) return [];
    const permitted = await this.requestPermission();
    if (!permitted) return [];

    const dates = getNextOccurrences(schedule, 28);
    const alarms: AlarmParams[] = [];

    for (const dateStr of dates) {
      for (const offset of offsets) {
        const startDate = scheduleStartDate(schedule, dateStr);
        const triggerDate = new Date(startDate.getTime() + offset * 60 * 1000);
        if (triggerDate <= new Date()) continue;
        // ID 형식: ${scheduleId}_${YYYYMMDD}_${abs}min
        const dateCompact = dateStr.replace(/-/g, '');
        alarms.push({
          id: `${schedule.id}_${dateCompact}_${Math.abs(offset)}min`,
          title: schedule.title,
          body: offsetToBody(offset),
          triggerDate,
          scheduleId: schedule.id,
        });
      }
    }

    // iOS 60개 안전 한도 확인 (64개 중 여유 4개 확보)
    if (Platform.OS === 'ios') {
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      const available = IOS_SAFE_LIMIT - existing.length;
      if (alarms.length > available) {
        alarms.sort((a, b) => a.triggerDate.getTime() - b.triggerDate.getTime());
        alarms.splice(available);
      }
    }

    const ids: string[] = [];
    for (const alarm of alarms) {
      const registered = await this.scheduleAlarm(alarm);
      if (registered) ids.push(registered);
    }
    return ids;
  }

  // 일정 알람 전체 등록 (repeat 여부 자동 판단) — 등록된 ID 배열 반환
  async scheduleAlarmsForSchedule(schedule: Schedule): Promise<string[]> {
    if (!schedule.reminderOffsets?.length) return [];
    await this.cancelAllAlarmsForSchedule(schedule.id);

    return schedule.repeat === 'none'
      ? this.scheduleMultipleAlarms(schedule, schedule.reminderOffsets)
      : this.scheduleRepeatingAlarms(schedule, schedule.reminderOffsets);
  }

  // 단일 알람 취소
  async cancelAlarm(id: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // 취소 실패 시 무시
    }
  }

  // 해당 일정의 모든 알람 취소
  async cancelAllAlarmsForSchedule(scheduleId: string): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const targets = scheduled.filter(n => n.identifier.startsWith(`${scheduleId}_`));
      await Promise.all(targets.map(n => this.cancelAlarm(n.identifier)));
    } catch {
      // 전체 취소 실패 시 무시
    }
  }

  // 전체 알람 재등록 (앱 복귀 시 호출)
  async rescheduleAll(schedules: Schedule[]): Promise<void> {
    try {
      // 기존 알림 전체 취소
      await Notifications.cancelAllScheduledNotificationsAsync();

      // 알림이 있는 일정만 수집 후 재등록
      const alarms: AlarmParams[] = [];
      const now = new Date();

      for (const schedule of schedules) {
        if (!schedule.reminderOffsets?.length) continue;

        const dates = schedule.repeat === 'none'
          ? [schedule.date]
          : getNextOccurrences(schedule, 28);

        for (const dateStr of dates) {
          for (const offset of schedule.reminderOffsets) {
            const startDate = scheduleStartDate(schedule, dateStr);
            const triggerDate = new Date(startDate.getTime() + offset * 60 * 1000);
            if (triggerDate <= now) continue;
            const dateCompact = dateStr.replace(/-/g, '');
            alarms.push({
              id: `${schedule.id}_${dateCompact}_${Math.abs(offset)}min`,
              title: schedule.title,
              body: offsetToBody(offset),
              triggerDate,
              scheduleId: schedule.id,
            });
          }
        }
      }

      // 가까운 순 정렬 후 iOS 60개 제한 적용
      alarms.sort((a, b) => a.triggerDate.getTime() - b.triggerDate.getTime());
      const limited = Platform.OS === 'ios' ? alarms.slice(0, IOS_SAFE_LIMIT) : alarms;
      for (const alarm of limited) {
        await this.scheduleAlarm(alarm);
      }
    } catch {
      // reschedule 실패 시 무시
    }
  }

  // 앱 시작 시 초기화
  async initialize(): Promise<void> {
    await this.createChannel();
    await registerRescheduleTask();
  }
}

export const notificationService = new NotificationService();
