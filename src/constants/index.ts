// 그리드 시작/끝 시간 (분 단위)
export const GRID_START_MINUTES = 360; // 06:00
export const GRID_END_MINUTES = 1800; // 익일 06:00 (30시간 = 1800분)

// 그리드 셀 단위 (분)
export const CELL_MINUTES = 10;

// 그리드 셀 높이 (px)
export const CELL_HEIGHT = 20;

// 시간 레이블 너비
export const TIME_LABEL_WIDTH = 50;

// 기본 색상 카테고리 (원본 앱 기준)
export const DEFAULT_COLOR_CATEGORIES = [
  { id: '1', label: '집안일',      color: '#E05555' },
  { id: '2', label: '준비',        color: '#E07C2A' },
  { id: '3', label: '식사 & 커피', color: '#D4B800' },
  { id: '4', label: '신체 활동',   color: '#4CAF50' },
  { id: '5', label: '생산적인 일', color: '#4A90D9' },
  { id: '6', label: '게임 / OTT', color: '#7B5EA7' },
  { id: '7', label: '창작 활동',   color: '#E0668A' },
  { id: '8', label: '휴식 & 수면', color: '#8E8E8E' },
];

// 다크모드 색상
export const COLORS = {
  light: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    border: '#E0E0E0',
    text: '#1A1A1A',
    textSecondary: '#757575',
    hourLine: '#E0E0E0',
    halfHourLine: '#F0F0F0',
  },
  dark: {
    background: '#1A1A1A',
    surface: '#2C2C2C',
    border: '#3A3A3A',
    text: '#FFFFFF',
    textSecondary: '#9E9E9E',
    hourLine: '#3A3A3A',
    halfHourLine: '#2C2C2C',
  },
};
