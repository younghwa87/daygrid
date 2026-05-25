import { create } from 'zustand';
import dayjs from 'dayjs';
import { Schedule, ColorCategory } from '../types';
import { DEFAULT_COLOR_CATEGORIES } from '../constants';

// 특정 날짜에 해당 일정이 표시돼야 하는지 판단
function matchesRepeat(s: Schedule, date: string): boolean {
  if (s.exceptions?.includes(date)) return false;
  if (!s.repeat || s.repeat === 'none') return s.date === date;
  const base = dayjs(s.date);
  const target = dayjs(date);
  if (target.isBefore(base, 'day')) return false;
  switch (s.repeat) {
    case 'daily': return true;
    case 'weekly': return base.day() === target.day();
    case 'monthly': return base.date() === target.date();
    case 'yearly': return base.month() === target.month() && base.date() === target.date();
  }
}

type ScheduleStore = {
  schedules: Schedule[];
  colorCategories: ColorCategory[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  addSchedule: (schedule: Schedule) => void;
  updateSchedule: (id: string, updates: Partial<Schedule>) => void;
  removeSchedule: (id: string) => void;
  addScheduleException: (id: string, date: string) => void;
  getSchedulesByDate: (date: string) => Schedule[];
  hasOverlap: (startTime: number, endTime: number, date: string, excludeId?: string) => boolean;
  addColorCategory: (category: ColorCategory) => void;
  updateColorCategory: (id: string, updates: Partial<ColorCategory>) => void;
  removeColorCategory: (id: string) => void;
};

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  colorCategories: DEFAULT_COLOR_CATEGORIES as typeof DEFAULT_COLOR_CATEGORIES,
  selectedDate: dayjs().format('YYYY-MM-DD'),

  setSelectedDate: (date) => set({ selectedDate: date }),

  addSchedule: (schedule) =>
    set((state) => ({ schedules: [...state.schedules, schedule] })),

  updateSchedule: (id, updates) =>
    set((state) => ({
      schedules: state.schedules.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  removeSchedule: (id) =>
    set((state) => ({ schedules: state.schedules.filter((s) => s.id !== id) })),

  addScheduleException: (id, date) =>
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === id ? { ...s, exceptions: [...(s.exceptions ?? []), date] } : s
      ),
    })),

  getSchedulesByDate: (date) => {
    const direct = get().schedules.filter((s) => matchesRepeat(s, date));
    // 전날 자정 넘는 일정 → 오늘 그리드에 0시~(endTime-1440)으로 표시
    const prevDate = dayjs(date).subtract(1, 'day').format('YYYY-MM-DD');
    const overflow = get().schedules
      .filter((s) => matchesRepeat(s, prevDate) && s.endTime > 24 * 60)
      .map((s) => ({
        ...s,
        startTime: 0,
        endTime: s.endTime - 24 * 60,
        isOverflow: true,
      }));
    return [...direct, ...overflow];
  },

  // 겹침 여부 확인 (전날 자정 넘는 일정 포함)
  hasOverlap: (startTime, endTime, date, excludeId) => {
    const schedules = get().schedules;
    const direct = schedules.filter((s) => s.id !== excludeId && matchesRepeat(s, date));
    if (direct.some((s) => startTime < s.endTime && s.startTime < endTime)) return true;
    const prevDate = dayjs(date).subtract(1, 'day').format('YYYY-MM-DD');
    const overflow = schedules.filter(
      (s) => s.id !== excludeId && matchesRepeat(s, prevDate) && s.endTime > 24 * 60
    );
    return overflow.some((s) => startTime < s.endTime - 24 * 60 && 0 < endTime);
  },

  addColorCategory: (category) =>
    set((state) => ({ colorCategories: [...state.colorCategories, category] })),

  updateColorCategory: (id, updates) =>
    set((state) => ({
      colorCategories: state.colorCategories.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  removeColorCategory: (id) =>
    set((state) => ({
      colorCategories: state.colorCategories.filter((c) => c.id !== id),
    })),
}));
