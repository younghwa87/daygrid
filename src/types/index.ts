export interface FreeBlock {
  id: string;
  startMin: number;      // 자정 기준 분 단위
  endMin: number;
  durationHours: number;
  quality: 'micro' | 'short' | 'medium' | 'long';
  label: string;
  isProtected?: boolean;
}

export type ColorCategory = {
  id: string;
  label: string;
  color: string;
};

export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

export type ScheduleType = 'normal' | 'sleep';

export type Schedule = {
  id: string;
  title: string;
  startTime: number; // 분 단위 (예: 360 = 06:00)
  endTime: number; // 분 단위 (예: 420 = 07:00)
  colorCategory: ColorCategory;
  date: string; // 'YYYY-MM-DD' (반복 일정의 경우 시작 날짜)
  hasNotification: boolean;
  repeat: RepeatType;
  repeatDays?: number[]; // 'custom' 반복 시 요일 목록 (0=일, 1=월 ... 6=토)
  reminderOffsets: number[]; // 알림 시각 배열 (분 단위, 음수=이전, 예: [-5, -30])
  exceptions?: string[]; // 반복에서 제외할 날짜 목록 ('YYYY-MM-DD')
  isOverflow?: boolean; // 전날 자정 넘는 일정이 다음날 그리드에 표시될 때
  scheduleType?: ScheduleType; // 'normal'(기본) | 'sleep'(수면)
};
