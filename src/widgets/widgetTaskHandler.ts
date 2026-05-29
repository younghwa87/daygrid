import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import dayjs from 'dayjs';
import { TodayWidget } from './TodayWidget';
import { getTodaySchedules } from './updateWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const dateLabel = dayjs().format('M/D (ddd)');
  const schedules = getTodaySchedules();

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(
        React.createElement(TodayWidget, { schedules, dateLabel })
      );
      break;
    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
    default:
      break;
  }
}
