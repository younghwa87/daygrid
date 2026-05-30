'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type WidgetSchedule = {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  color: string;
};

type Props = {
  schedules: WidgetSchedule[];
  dateLabel: string;
};

type DisplayMode = 'full' | 'compact' | 'mini';

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getMode(count: number): DisplayMode {
  if (count <= 3) return 'full';
  if (count <= 5) return 'compact';
  return 'mini';
}

function getMaxItems(mode: DisplayMode): number {
  if (mode === 'full') return 3;
  if (mode === 'compact') return 5;
  return 6;
}

export function TodayWidget({ schedules, dateLabel }: Props) {
  const mode = getMode(schedules.length);
  const maxItems = getMaxItems(mode);
  const items = schedules.slice(0, maxItems);
  const overflow = schedules.length - maxItems;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
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
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TextWidget
            text="Datile"
            style={{ fontSize: 16, color: '#4A90D9', fontWeight: 'bold' }}
          />
          <TextWidget
            text={`  ${dateLabel}`}
            style={{ fontSize: 12, color: '#AAAAAA' }}
          />
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'datile://add' }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#4A90D922',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text="+"
            style={{ fontSize: 26, color: '#4A90D9', fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* 구분선 */}
      <FlexWidget
        style={{ height: 1, backgroundColor: '#F0F0F0', marginBottom: 10 }}
      />

      {/* 일정 없음 */}
      {items.length === 0 && (
        <TextWidget
          text="남은 일정이 없습니다"
          style={{ fontSize: 13, color: '#CCCCCC' }}
        />
      )}

      {/* 일정 목록 (최대 6개) */}
      {items.length > 0 && items[0] && <ScheduleRow item={items[0]} mode={mode} />}
      {items.length > 1 && items[1] && <ScheduleRow item={items[1]} mode={mode} />}
      {items.length > 2 && items[2] && <ScheduleRow item={items[2]} mode={mode} />}
      {items.length > 3 && items[3] && <ScheduleRow item={items[3]} mode={mode} />}
      {items.length > 4 && items[4] && <ScheduleRow item={items[4]} mode={mode} />}
      {items.length > 5 && items[5] && <ScheduleRow item={items[5]} mode={mode} />}

      {overflow > 0 && (
        <TextWidget
          text={`+${overflow}개 더`}
          style={{ fontSize: 10, color: '#CCCCCC' }}
        />
      )}
    </FlexWidget>
  );
}

function ScheduleRow({ item, mode }: { item: WidgetSchedule; mode: DisplayMode }) {
  const uri = `datile://edit?id=${item.id}`;
  const color = item.color as `#${string}`;

  if (mode === 'full') {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri }}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
      >
        <FlexWidget
          style={{ width: 4, height: 30, borderRadius: 2, backgroundColor: color, marginRight: 10 }}
        />
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text={item.title}
            style={{ fontSize: 13, color: '#222222', fontWeight: 'bold', marginBottom: 2 }}
          />
          <TextWidget
            text={`${formatTime(item.startTime)} - ${formatTime(item.endTime)}`}
            style={{ fontSize: 11, color: '#AAAAAA' }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  if (mode === 'compact') {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri }}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}
      >
        <FlexWidget
          style={{ width: 3, height: 22, borderRadius: 2, backgroundColor: color, marginRight: 8 }}
        />
        <TextWidget
          text={item.title}
          style={{ fontSize: 12, color: '#222222', fontWeight: 'bold' }}
        />
        <TextWidget
          text={`  ${formatTime(item.startTime)}-${formatTime(item.endTime)}`}
          style={{ fontSize: 10, color: '#AAAAAA' }}
        />
      </FlexWidget>
    );
  }

  // mini
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}
    >
      <FlexWidget
        style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: color, marginRight: 8 }}
      />
      <TextWidget
        text={item.title}
        style={{ fontSize: 11, color: '#333333', fontWeight: 'bold' }}
      />
      <TextWidget
        text={`  ${formatTime(item.startTime)}`}
        style={{ fontSize: 9, color: '#AAAAAA' }}
      />
    </FlexWidget>
  );
}
