'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { WidgetSchedule } from './TodayWidget';

type Props = {
  schedule: WidgetSchedule | null;
  isRunning: boolean;
};

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function SmallTodayWidget({ schedule, isRunning }: Props) {
  return (
    <FlexWidget
      clickAction={schedule ? 'OPEN_URI' : 'OPEN_APP'}
      clickActionData={schedule ? { uri: `datile://edit?id=${schedule.id}` } : undefined}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      {schedule === null && (
        <TextWidget
          text="현재 일정 없음"
          style={{ fontSize: 12, color: '#CCCCCC' }}
        />
      )}

      {schedule !== null && (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FlexWidget
            style={{
              width: 3,
              height: 28,
              borderRadius: 2,
              backgroundColor: schedule.color as `#${string}`,
              marginRight: 8,
            }}
          />
          <FlexWidget style={{ flexDirection: 'column' }}>
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <TextWidget
                text={schedule.title}
                style={{ fontSize: 12, color: '#333333', fontWeight: 'bold' }}
              />
              <TextWidget
                text={isRunning ? '  진행 중' : `  ${formatTime(schedule.startTime)} 시작`}
                style={{ fontSize: 10, color: isRunning ? '#4A90D9' : '#AAAAAA' }}
              />
            </FlexWidget>
            <TextWidget
              text={`${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`}
              style={{ fontSize: 10, color: '#AAAAAA' }}
            />
          </FlexWidget>
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
