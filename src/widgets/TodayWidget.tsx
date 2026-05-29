'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type WidgetSchedule = {
  title: string;
  startTime: number;
  endTime: number;
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
  const items = schedules.slice(0, 4);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
      }}
    >
      {/* 헤더 */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text="Datile"
            style={{ fontSize: 13, color: '#4A90D9', fontWeight: 'bold' }}
          />
          <TextWidget
            text={`  ${dateLabel}`}
            style={{ fontSize: 11, color: '#AAAAAA' }}
          />
        </FlexWidget>
        <TextWidget
          text="+"
          style={{ fontSize: 18, color: '#4A90D9', fontWeight: 'bold' }}
        />
      </FlexWidget>

      {/* 구분선 */}
      <FlexWidget
        style={{
          height: 1,
          backgroundColor: '#F0F0F0',
          marginBottom: 10,
        }}
      />

      {/* 일정 없음 */}
      {items.length === 0 && (
        <TextWidget
          text="오늘 일정이 없습니다"
          style={{ fontSize: 13, color: '#CCCCCC' }}
        />
      )}

      {/* 일정 목록 */}
      {items.length > 0 && items[0] && <ScheduleRow item={items[0]} />}
      {items.length > 1 && items[1] && <ScheduleRow item={items[1]} />}
      {items.length > 2 && items[2] && <ScheduleRow item={items[2]} />}
      {items.length > 3 && items[3] && <ScheduleRow item={items[3]} />}

      {schedules.length > 4 && (
        <TextWidget
          text={`+${schedules.length - 4}개 더`}
          style={{ fontSize: 10, color: '#CCCCCC', marginTop: 4 }}
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
        marginBottom: 7,
        height: 20,
      }}
    >
      {/* 색상 바 */}
      <FlexWidget
        style={{
          width: 3,
          height: 18,
          borderRadius: 2,
          backgroundColor: item.color as `#${string}`,
          marginRight: 8,
        }}
      />
      {/* 제목 */}
      <TextWidget
        text={item.title}
        style={{ fontSize: 12, color: '#333333' }}
      />
      {/* 시간 범위 */}
      <TextWidget
        text={`${formatTime(item.startTime)}-${formatTime(item.endTime)}`}
        style={{ fontSize: 10, color: '#AAAAAA' }}
      />
    </FlexWidget>
  );
}
