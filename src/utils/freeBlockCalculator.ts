import { Schedule, FreeBlock } from '../types';

export interface DayFreeSummary {
  totalFreeHours: number;
  totalScheduledHours: number;
  longestFreeBlock: FreeBlock | null;
  freeRatio: number;
  message: string;
}

function getQuality(durationHours: number): FreeBlock['quality'] {
  if (durationHours < 1) return 'micro';
  if (durationHours < 2) return 'short';
  if (durationHours < 4) return 'medium';
  return 'long';
}

export function getFreeBlockLabel(durationHours: number): string {
  if (durationHours <= 0.5) return '';
  if (durationHours <= 1) {
    const mins = Math.round(durationHours * 60);
    return `${mins}분 여백`;
  }
  if (durationHours <= 2) {
    const h = Math.floor(durationHours);
    const m = Math.round((durationHours - h) * 60);
    return m > 0 ? `여유 ${h}시간 ${m}분` : `여유 ${h}시간`;
  }
  if (durationHours <= 3) return '황금 집중 시간';
  if (durationHours <= 4) return '황금 여유 시간 ✦';
  if (durationHours <= 6) return '깊은 여유 구간 ✦✦';
  return '오늘의 선물 같은 시간 ✦✦✦';
}

// 하루 일정으로부터 연속 여백 블록 배열 계산
export function calculateFreeBlocks(
  schedules: Schedule[],
  gridStartHour: number,
  gridEndHour: number
): FreeBlock[] {
  const startMin = gridStartHour * 60;
  const endMin = gridEndHour * 60;
  const totalMins = endMin - startMin;

  // 분 단위로 점유 여부 표시 (Uint8Array로 메모리 절약)
  const occupied = new Uint8Array(totalMins);

  for (const s of schedules) {
    const sStart = Math.max(0, s.startTime - startMin);
    const sEnd = Math.min(totalMins, s.endTime - startMin);
    for (let m = sStart; m < sEnd; m++) {
      occupied[m] = 1;
    }
  }

  const blocks: FreeBlock[] = [];
  let i = 0;
  let blockIdx = 0;

  while (i < totalMins) {
    if (!occupied[i]) {
      const blockStart = i;
      while (i < totalMins && !occupied[i]) i++;
      const durationMins = i - blockStart;
      if (durationMins < 10) continue; // 10분 미만은 시각화 생략
      const durationHours = durationMins / 60;
      blocks.push({
        id: `free_${blockIdx++}`,
        startMin: startMin + blockStart,
        endMin: startMin + i,
        durationHours,
        quality: getQuality(durationHours),
        label: getFreeBlockLabel(durationHours),
      });
    } else {
      i++;
    }
  }

  return blocks;
}

export function getDayFreeSummary(
  freeBlocks: FreeBlock[],
  gridStartHour: number,
  gridEndHour: number
): DayFreeSummary {
  const totalHours = gridEndHour - gridStartHour;
  const totalFreeHours = freeBlocks.reduce((sum, b) => sum + b.durationHours, 0);
  const totalScheduledHours = totalHours - totalFreeHours;
  const longestFreeBlock = freeBlocks.length > 0
    ? freeBlocks.reduce((max, b) => b.durationHours > max.durationHours ? b : max)
    : null;
  const freeRatio = totalFreeHours / totalHours;

  let message: string;
  if (freeRatio < 0.3) message = '오늘 너무 빡빡해요';
  else if (freeRatio < 0.5) message = '조금 여유를 만들어보세요';
  else if (freeRatio < 0.7) message = '균형 잡힌 하루예요 ✦';
  else message = '여유로운 하루네요';

  return { totalFreeHours, totalScheduledHours, longestFreeBlock, freeRatio, message };
}
