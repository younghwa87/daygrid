import { Schedule } from '../types';

// spaceDesign.md 3단계: 밀도 계산 핵심 로직
// 현재 Schedule 타입 기준으로 구현 (energyLevel/category 미포함)

export type DensityLevel = 'free' | 'light' | 'normal' | 'busy' | 'overload';

export interface DensityBreakdown {
  timeDensityScore: number;   // 시간 점유율 (0~10)
  switchIndexScore: number;   // 컨텍스트 전환 (0~10)
  recoveryScore: number;      // 회복 불가 정도 (0~10, 높을수록 바쁨)
  rawScore: number;
  finalScore: number;
}

export interface DensityResult {
  level: DensityLevel;
  label: string;
  color: string;
  textColor: string;
  darkColor: string;
  score: number;
  breakdown: DensityBreakdown;
  insight: string;
}

const WEIGHTS = { time: 0.40, switch: 0.35, recovery: 0.25 };

export const DENSITY_UI: Record<DensityLevel, { label: string; color: string; textColor: string; darkColor: string }> = {
  free:     { label: '여유',   color: '#BAE6FD', textColor: '#0369A1', darkColor: '#1A1A1A' },
  light:    { label: '가벼움', color: '#BBF7D0', textColor: '#065F46', darkColor: '#1B5E20' },
  normal:   { label: '보통',   color: '#6EE7B7', textColor: '#064E3B', darkColor: '#388E3C' },
  busy:     { label: '바쁨',   color: '#FED7AA', textColor: '#9A3412', darkColor: '#E65100' },
  overload: { label: '과부하', color: '#FECACA', textColor: '#991B1B', darkColor: '#B71C1C' },
};

// density 0~4 인덱스 → 라이트/다크 색상 배열 (히트맵 셀용)
const LEVELS: DensityLevel[] = ['free', 'light', 'normal', 'busy', 'overload'];
export const HEATMAP_LIGHT = LEVELS.map(l => DENSITY_UI[l].color);
export const HEATMAP_DARK  = LEVELS.map(l => DENSITY_UI[l].darkColor);

// 활동 시간 기준 (수면 데이터 없으므로 07:00~23:00 기본값)
const ACTIVE_START = 7 * 60;   // 420
const ACTIVE_END   = 23 * 60;  // 1380
const ACTIVE_MINS  = ACTIVE_END - ACTIVE_START; // 960

// ① 시간 점유율 점수
function calcTimeDensity(schedules: Schedule[]): number {
  const occupied = schedules.reduce((sum, s) => {
    const start = Math.max(s.startTime, ACTIVE_START);
    const end   = Math.min(s.endTime,   ACTIVE_END);
    return sum + Math.max(0, end - start);
  }, 0);
  return Math.min(10, (occupied / ACTIVE_MINS) * 10);
}

// ② 컨텍스트 전환 점수 (energyLevel/category 없으므로 일정 수 + 짧은 일정 기준)
function calcSwitchIndex(schedules: Schedule[]): number {
  const active = schedules.filter(s => !s.isOverflow);
  let score = active.length;
  for (const s of active) {
    if (s.endTime - s.startTime <= 60) score += 0.3; // 짧은 일정 패널티
  }
  return Math.min(10, score);
}

// ③ 회복 가능성 점수 (높을수록 회복 어려움 = 바쁨)
function calcRecovery(schedules: Schedule[]): number {
  const sorted = schedules
    .filter(s => !s.isOverflow)
    .sort((a, b) => a.startTime - b.startTime);

  if (sorted.length <= 1) return 0;

  let rawRecovery = 0;
  let consecutive = 1;

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].startTime - sorted[i - 1].endTime;
    if (gap < 30) {
      rawRecovery -= 1.0;
      consecutive++;
      if (consecutive >= 3) rawRecovery -= 1.0; // 3개 이상 연속 패널티
    } else {
      consecutive = 1;
      if (gap < 60)       { /* 중립 */ }
      else if (gap < 120) rawRecovery += 1.0;
      else                rawRecovery += 2.0;
    }
  }

  // 반전: 회복 여유 많음(rawRecovery 높음) → 밀도 낮음
  return Math.min(10, Math.max(0, 5 - rawRecovery));
}

function classifyLevel(score: number): DensityLevel {
  if (score < 2) return 'free';
  if (score < 4) return 'light';
  if (score < 6) return 'normal';
  if (score < 8) return 'busy';
  return 'overload';
}

function getInsight(level: DensityLevel, b: DensityBreakdown): string {
  const dominant =
    b.timeDensityScore >= b.switchIndexScore && b.timeDensityScore >= b.recoveryScore
      ? 'time'
      : b.switchIndexScore >= b.recoveryScore
      ? 'switch'
      : 'recovery';

  if (level === 'overload') {
    if (dominant === 'time')     return '하루 일정이 너무 많아요. 2~3개를 다음날로 미루세요';
    if (dominant === 'switch')   return '컨텍스트 전환이 너무 많아요. 비슷한 일정을 묶어보세요';
    return '일정 사이 여백이 전혀 없어요. 30분 버퍼를 추가하세요';
  }
  if (level === 'busy') {
    if (dominant === 'time')   return '오늘 일정 시간이 많네요';
    if (dominant === 'switch') return '오늘 집중이 흐트러지기 쉬운 하루예요';
    return '일정 사이 휴식 시간이 부족해요';
  }
  if (level === 'normal') return '균형 잡힌 하루예요';
  if (level === 'light')  return '여유있는 하루네요. 집중 작업하기 좋아요';
  return '오늘은 정말 여유로운 하루예요 ✦';
}

// 메인 함수: 하루 일정 배열 → DensityResult (수면 일정 제외)
export function calculateDayDensity(schedules: Schedule[]): DensityResult {
  const active = schedules.filter(s => s.scheduleType !== 'sleep');
  const timeDensityScore = calcTimeDensity(active);
  const switchIndexScore = calcSwitchIndex(active);
  const recoveryScore    = calcRecovery(active);

  const rawScore   = timeDensityScore * WEIGHTS.time
                   + switchIndexScore * WEIGHTS.switch
                   + recoveryScore    * WEIGHTS.recovery;
  const finalScore = Math.min(10, rawScore);
  const level      = classifyLevel(finalScore);
  const ui         = DENSITY_UI[level];
  const breakdown: DensityBreakdown = {
    timeDensityScore, switchIndexScore, recoveryScore, rawScore, finalScore,
  };

  return {
    level,
    score: finalScore,
    ...ui,
    breakdown,
    insight: getInsight(level, breakdown),
  };
}

// 주간 인사이트 (spaceDesign.md 6단계)
export function getWeekInsight(
  densities: DensityResult[],
  dayLabels: string[]
): string {
  const overloadCount = densities.filter(d => d.level === 'overload').length;
  const freeCount     = densities.filter(d => d.level === 'free').length;

  if (overloadCount >= 3) return '이번 주 많이 무리했어요. 다음 주는 여유를 만들어요';
  if (freeCount     >= 4) return '이번 주 여유로운 한 주였어요 ✦';
  if (overloadCount >= 1 && freeCount >= 1) return '이번 주 기복이 심한 한 주였어요';

  const busiestIdx = densities.reduce(
    (maxIdx, d, i, arr) => (d.score > arr[maxIdx].score ? i : maxIdx), 0
  );
  return `이번 주 ${dayLabels[busiestIdx]}요일이 가장 바빴어요`;
}
