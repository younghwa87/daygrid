'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { WidgetSchedule } from './TodayWidget';

type Props = {
  next: WidgetSchedule | null;
  dateLabel: string;
};

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function SmallTodayWidget({ next, dateLabel }: Props) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
      }}
    >
      <TextWidget
        text={dateLabel}
        style={{ fontSize: 11, color: '#4A90D9', fontWeight: 'bold', marginBottom: 6 }}
      />

      {next === null && (
        <TextWidget
          text="오늘 일정 없음"
          style={{ fontSize: 13, color: '#AAAAAA' }}
        />
      )}

      {next !== null && (
        <FlexWidget style={{ flexDirection: 'column' }}>
          <FlexWidget
            style={{
              width: 24,
              height: 4,
              borderRadius: 2,
              backgroundColor: next.color as `#${string}`,
              marginBottom: 6,
            }}
          />
          <TextWidget
            text={formatTime(next.startTime)}
            style={{ fontSize: 20, color: '#333333', fontWeight: 'bold' }}
          />
          <TextWidget
            text={next.title}
            style={{ fontSize: 13, color: '#555555', marginTop: 2 }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
