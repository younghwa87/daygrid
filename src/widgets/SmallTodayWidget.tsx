'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { WidgetSchedule } from './TodayWidget';

type Props = {
  current: WidgetSchedule | null;
};

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function SmallTodayWidget({ current }: Props) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      {current === null && (
        <TextWidget
          text="오늘 일정 없음"
          style={{ fontSize: 12, color: '#CCCCCC' }}
        />
      )}

      {current !== null && (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <FlexWidget
            style={{
              width: 3,
              height: 20,
              borderRadius: 2,
              backgroundColor: current.color as `#${string}`,
              marginRight: 8,
            }}
          />
          <TextWidget
            text={current.title}
            style={{ fontSize: 12, color: '#333333' }}
          />
          <TextWidget
            text={formatTime(current.startTime)}
            style={{ fontSize: 11, color: '#AAAAAA', marginLeft: 6 }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
