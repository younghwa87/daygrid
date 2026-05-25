import { CELL_MINUTES } from '../constants';
import type { TimeFormat } from '../store/settingsStore';

export function minutesToTimeString(minutes: number, format: TimeFormat = '24h'): string {
  const normalized = minutes % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  if (format === '24h') {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const minPart = m > 0 ? `:${String(m).padStart(2, '0')}` : '';
  return `${h12}${minPart} ${period}`;
}

// 2D 그리드에서 이벤트가 차지하는 세그먼트 목록 반환
// 각 세그먼트 = 특정 시간 행 내의 사각형 (left, width는 열 인덱스 기준)
export type Segment = {
  rowIndex: number; // 행 인덱스 (0 = gridStartHour)
  startCol: number; // 시작 열 (0~5)
  endCol: number;   // 종료 열 (1~6, exclusive)
};

export function getEventSegments(
  startMins: number,
  endMins: number,
  gridStartHour: number,
  gridEndHour?: number
): Segment[] {
  const gridStartMins = gridStartHour * 60;
  const gridEndMins = gridEndHour !== undefined ? gridEndHour * 60 : Infinity;
  const clampedStart = Math.max(startMins, gridStartMins);
  const clampedEnd = Math.min(endMins, gridEndMins);
  if (clampedStart >= clampedEnd) return [];

  const startHour = Math.floor(clampedStart / 60);
  const startCol = (clampedStart % 60) / 10; // 0~5
  const endHour = Math.floor(clampedEnd / 60);
  const endCol = (clampedEnd % 60) / 10;     // 0~6

  const segments: Segment[] = [];

  if (startHour === endHour) {
    if (endCol > startCol) {
      segments.push({
        rowIndex: startHour - gridStartHour,
        startCol,
        endCol,
      });
    }
  } else {
    // 첫 번째 행
    segments.push({ rowIndex: startHour - gridStartHour, startCol, endCol: 6 });
    // 중간 행 (전체)
    for (let h = startHour + 1; h < endHour; h++) {
      segments.push({ rowIndex: h - gridStartHour, startCol: 0, endCol: 6 });
    }
    // 마지막 행
    if (endCol > 0) {
      segments.push({ rowIndex: endHour - gridStartHour, startCol: 0, endCol });
    }
  }

  return segments;
}

// 레거시 호환 (이전 수직 레이아웃용 - ScheduleFormModal 시간 표시에 사용)
export function durationToHeight(
  startTime: number,
  endTime: number,
  cellHeight: number = 20
): number {
  return ((endTime - startTime) / CELL_MINUTES) * cellHeight;
}
