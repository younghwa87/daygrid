'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type WidgetSchedule = {
  title: string;
  startTime: number;
  color: string;
};

type Props = {
  schedules: WidgetSchedule[];
  dateLabel: string;
};

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function TodayWidget({ schedules, dateLabel }: Props) {
  const items = schedules.slice(0, 5);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
      }}
    >
      <TextWidget
        text={`오늘  ${dateLabel}`}
        style={{
          fontSize: 11,
          color: '#4A90D9',
          fontWeight: 'bold',
          marginBottom: 8,
        }}
      />

      {items.length === 0 && (
        <TextWidget
          text="오늘 일정이 없습니다"
          style={{ fontSize: 13, color: '#AAAAAA' }}
        />
      )}

      {items.length > 0 && items[0] && (
        <ScheduleRow item={items[0]} />
      )}
      {items.length > 1 && items[1] && (
        <ScheduleRow item={items[1]} />
      )}
      {items.length > 2 && items[2] && (
        <ScheduleRow item={items[2]} />
      )}
      {items.length > 3 && items[3] && (
        <ScheduleRow item={items[3]} />
      )}
      {items.length > 4 && items[4] && (
        <ScheduleRow item={items[4]} />
      )}

      {schedules.length > 5 && (
        <TextWidget
          text={`+${schedules.length - 5}개 더`}
          style={{ fontSize: 11, color: '#AAAAAA', marginTop: 2 }}
        />
      )}
    </FlexWidget>
  );
}

function ScheduleRow({ item }: { item: WidgetSchedule }) {
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        height: 18,
      }}
    >
      <FlexWidget
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: item.color as `#${string}`,
          marginRight: 6,
        }}
      />
      <TextWidget
        text={`${formatTime(item.startTime)}  ${item.title}`}
        style={{ fontSize: 12, color: '#333333' }}
      />
    </FlexWidget>
  );
}
