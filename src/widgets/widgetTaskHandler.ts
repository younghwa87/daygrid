import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import dayjs from 'dayjs';
import { TodayWidget } from './TodayWidget';
import { SmallTodayWidget } from './SmallTodayWidget';
import { getTodaySchedules } from './updateWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const dateLabel = dayjs().format('M/D (ddd)');
  const schedules = getTodaySchedules();
  const now = dayjs().hour() * 60 + dayjs().minute();
  const next = schedules.find((s) => s.startTime >= now) ?? schedules[schedules.length - 1] ?? null;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      if (props.widgetInfo.widgetName === 'TodaySmall') {
        props.renderWidget(
          React.createElement(SmallTodayWidget, { next, dateLabel })
        );
      } else {
        props.renderWidget(
          React.createElement(TodayWidget, { schedules, dateLabel })
        );
      }
      break;
    }
    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
    default:
      break;
  }
}
