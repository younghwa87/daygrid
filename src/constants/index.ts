// 그리드 시작/끝 시간 (분 단위)
export const GRID_START_MINUTES = 360; // 06:00
export const GRID_END_MINUTES = 1800; // 익일 06:00 (30시간 = 1800분)

// 그리드 셀 단위 (분)
export const CELL_MINUTES = 10;

// 그리드 셀 높이 (px)
export const CELL_HEIGHT = 20;

// 시간 레이블 너비
export const TIME_LABEL_WIDTH = 50;

// 기본 색상 카테고리
export const DEFAULT_COLOR_CATEGORIES = [
  { id: '1', label: '업무',  color: '#4A8FD4' },  // 코발트 블루
  { id: '2', label: '공부',  color: '#7B68D5' },  // 소프트 인디고
  { id: '3', label: '운동',  color: '#4BB87A' },  // 에메랄드 그린
  { id: '4', label: '식사',  color: '#F5A623' },  // 골든 앰버
  { id: '5', label: '이동',  color: '#7A9DB8' },  // 슬레이트 블루
  { id: '6', label: '약속',  color: '#E8654A' },  // 테라코타
  { id: '7', label: '취미',  color: '#D4689A' },  // 더스티 로즈
  { id: '8', label: '휴식',  color: '#A8AABF' },  // 실버 그레이
];

// 다크모드 색상
export const COLORS = {
  light: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    border: '#E0E0E0',
    text: '#1A1A1A',
    textSecondary: '#757575',
    hourLine: '#C0C0C0',
    halfHourLine: '#E0E0E0',
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
