import { Schedule, SleepBlock, SleepQuality, ActiveRange } from '../types';
import { DensityResult } from './densityCalculator';
import uuid from './uuid';

const DEFAULT_WAKE  = 7 * 60;   // 07:00 = 420
const DEFAULT_BED   = 23 * 60;  // 23:00 = 1380

const SLEEP_CORRECTION: Record<SleepQuality, number> = {
  poor:   1.3,
  normal: 1.1,
  good:   1.0,
  excess: 0.95,
};

export function classifySleepQuality(durationHours: number): SleepQuality {
  if (durationHours < 6) return 'poor';
  if (durationHours < 7) return 'normal';
  if (durationHours <= 9) return 'good';
  return 'excess';
}

export function getSleepCorrection(quality: SleepQuality): number {
  return SLEEP_CORRECTION[quality];
}

// bedTime >= 1440이면 자정 이후 취침으로 처리
export function calculateSleepDuration(bedTime: number, wakeTime: number): number {
  if (bedTime >= 1440) {
    return (wakeTime + (1440 - (bedTime - 1440))) / 60;
  }
  return (wakeTime + 1440 - bedTime) / 60;
}

export function createSleepBlock(date: string, bedTime: number, wakeTime: number): SleepBlock {
  const durationHours = calculateSleepDuration(bedTime, wakeTime);
  const quality = classifySleepQuality(durationHours);
  return { id: uuid(), date, bedTime, wakeTime, durationHours, quality, source: 'manual' };
}

export function inferSleepFromSchedules(
  schedules: Schedule[],
  date: string,
  prevDaySchedules: Schedule[] = []
): SleepBlock {
  const daySchedules = schedules.filter(s => s.date === date && !s.isOverflow);
  const sorted = [...daySchedules].sort((a, b) => a.startTime - b.startTime);

  const wakeTime = sorted.length > 0 ? sorted[0].startTime : DEFAULT_WAKE;

  const prevSorted = [...prevDaySchedules].sort((a, b) => a.endTime - b.endTime);
  const bedTime = prevSorted.length > 0
    ? prevSorted[prevSorted.length - 1].endTime
    : DEFAULT_BED;

  const durationHours = calculateSleepDuration(bedTime, wakeTime);
  const quality = classifySleepQuality(durationHours);

  return { id: uuid(), date, bedTime, wakeTime, durationHours, quality, source: 'inferred' };
}

export function getActiveTimeRange(sleep: SleepBlock | null): ActiveRange {
  const startMinute = sleep ? sleep.wakeTime : DEFAULT_WAKE;
  const endMinute   = sleep ? Math.min(sleep.bedTime, 1439) : DEFAULT_BED;
  const activeMinutes = Math.max(0, endMinute - startMinute);
  return { startMinute, endMinute, activeMinutes };
}

export function getSleepInsight(sleep: SleepBlock, density: DensityResult): string {
  const { quality } = sleep;
  const { level } = density;

  if (quality === 'poor') {
    if (level === 'overload') return '수면 부족 상태에서 과부하 하루예요. 일정을 줄이세요';
    if (level === 'busy')    return '수면이 부족한 상태에서 바쁜 하루예요';
    return '어젯밤 수면이 부족했어요. 중간 휴식을 꼭 챙기세요';
  }
  if (quality === 'normal') {
    if (level === 'overload') return '오늘 일정이 많아요. 저녁 루틴을 지켜보세요';
    return '';
  }
  if (quality === 'good') {
    if (level === 'free') return '충분한 수면과 여유로운 하루 — 최상의 컨디션이에요 ✦';
    return '';
  }
  // excess
  if (level === 'overload') return '많이 쉬었지만 일정이 과해요';
  return '충분히 쉬었네요. 오늘 에너지가 넘칠 거예요';
}
