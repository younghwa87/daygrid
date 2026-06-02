import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Schedule } from '../types';
import { useAppColors } from '../hooks/useAppColors';

interface Props {
  schedules: Schedule[];
  onPressSchedule: (schedule: Schedule) => void;
  onLongPress: () => void;
}

function formatTimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const isPM = h >= 12;
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  if (m === 0) return `${hour12}${isPM ? 'PM' : 'AM'}`;
  return `${hour12}:${String(m).padStart(2, '0')}${isPM ? 'PM' : 'AM'}`;
}

function formatDuration(startMin: number, endMin: number): string {
  const total = endMin - startMin;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function DayScheduleView({ schedules, onPressSchedule, onLongPress }: Props) {
  const { colors } = useAppColors();
  const sorted = [...schedules]
    .filter(s => !s.isOverflow)
    .sort((a, b) => a.startTime - b.startTime);

  if (sorted.length === 0) {
    return (
      <TouchableOpacity
        style={[styles.emptyContainer, { backgroundColor: colors.background }]}
        onLongPress={onLongPress}
        delayLongPress={400}
        activeOpacity={1}
      >
        <AppText style={[styles.emptyIcon, { color: colors.border }]}>○</AppText>
        <AppText style={[styles.emptyText, { color: colors.textSecondary }]}>일정 없음</AppText>
        <AppText style={[styles.emptyHint, { color: colors.border }]}>길게 눌러 추가</AppText>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    >
      {sorted.map((s) => {
        const color = s.colorCategory?.color ?? '#4A90D9';
        const bgColor = hexToRgba(color, 0.1);
        return (
          <TouchableOpacity
            key={s.id}
            style={styles.row}
            onPress={() => onPressSchedule(s)}
            onLongPress={onLongPress}
            delayLongPress={400}
            activeOpacity={0.75}
          >
            <View style={styles.timeCol}>
              <AppText style={[styles.timeLabel, { color: colors.textSecondary }]}>
                {formatTimeLabel(s.startTime)}
              </AppText>
            </View>
            <View style={[styles.card, { backgroundColor: bgColor }]}>
              <AppText style={[styles.cardTitle, { color }]} numberOfLines={1}>
                {s.title}
              </AppText>
              <AppText style={[styles.cardDuration, { color, opacity: 0.6 }]}>
                {formatDuration(s.startTime, s.endTime)}
              </AppText>
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={styles.addHintRow}
        onLongPress={onLongPress}
        delayLongPress={400}
        activeOpacity={1}
      >
        <AppText style={[styles.addHintText, { color: colors.border }]}>길게 눌러 일정 추가</AppText>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyIcon: { fontSize: 36, marginBottom: 4 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  emptyHint: { fontSize: 12 },
  listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },
  timeCol: { width: 44, paddingTop: 12 },
  timeLabel: { fontSize: 11, fontWeight: '500', textAlign: 'right' },
  card: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardDuration: { fontSize: 13 },
  addHintRow: { alignItems: 'center', paddingVertical: 20 },
  addHintText: { fontSize: 11 },
});
