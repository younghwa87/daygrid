import React from 'react';
import { MMKV } from 'react-native-mmkv';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import dayjs from 'dayjs';
import { TodayWidget, WidgetSchedule } from './TodayWidget';
import { Schedule } from '../types';

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

const widgetMMKV = new MMKV();

async function getTodaySchedules(): Promise<WidgetSchedule[]> {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const raw = widgetMMKV.getString('schedules');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const schedules: Schedule[] = parsed.state?.schedules ?? [];
    return schedules
      .filter((s) => !s.isOverflow && matchesRepeat(s, today))
      .sort((a, b) => a.startTime - b.startTime)
      .map((s) => ({
        title: s.title,
        startTime: s.startTime,
        color: s.colorCategory?.color ?? '#4A90D9',
      }));
  } catch {
    return [];
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const today = dayjs().format('M/D (ddd)');

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE': {
      const schedules = await getTodaySchedules();
      props.renderWidget(
        React.createElement(TodayWidget, { schedules, dateLabel: today })
      );
      break;
    }
    case 'WIDGET_RESIZED': {
      const schedules = await getTodaySchedules();
      props.renderWidget(
        React.createElement(TodayWidget, { schedules, dateLabel: today })
      );
      break;
    }
    case 'WIDGET_DELETED':
      break;
    case 'WIDGET_CLICK':
      break;
    default:
      break;
  }
}
