import React from 'react';
import { MMKV } from 'react-native-mmkv';
import { requestWidgetUpdate } from 'react-native-android-widget';
import dayjs from 'dayjs';
import { TodayWidget, WidgetSchedule } from './TodayWidget';
import { SmallTodayWidget } from './SmallTodayWidget';
import { Schedule } from '../types';

const widgetMMKV = new MMKV();

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
    case 'custom': return (s.repeatDays ?? []).includes(target.day());
    default: return false;
  }
}

export function getTodaySchedules(): WidgetSchedule[] {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const raw = widgetMMKV.getString('schedules');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const schedules: Schedule[] = parsed.state?.schedules ?? [];
    const now = dayjs().hour() * 60 + dayjs().minute();
    return schedules
      .filter((s) => !s.isOverflow && matchesRepeat(s, today) && s.endTime > now)
      .sort((a, b) => a.startTime - b.startTime)
      .map((s) => ({
        id: s.id,
        title: s.title,
        startTime: s.startTime,
        endTime: s.endTime,
        color: s.colorCategory?.color ?? '#4A90D9',
      }));
  } catch {
    return [];
  }
}

export function updateTodayWidget(): void {
  const schedules = getTodaySchedules();
  const dateLabel = dayjs().format('M/D (ddd)');
  const now = dayjs().hour() * 60 + dayjs().minute();
  const running = schedules.find((s) => s.startTime <= now && now < s.endTime) ?? null;
  const next = schedules.find((s) => s.startTime >= now) ?? null;
  const schedule = running ?? next ?? null;
  const isRunning = running !== null;

  requestWidgetUpdate({
    widgetName: 'Today',
    renderWidget: () => React.createElement(TodayWidget, { schedules, dateLabel }),
    widgetNotFound: () => {},
  });
  requestWidgetUpdate({
    widgetName: 'TodaySmall',
    renderWidget: () => React.createElement(SmallTodayWidget, { schedule, isRunning }),
    widgetNotFound: () => {},
  });
}
