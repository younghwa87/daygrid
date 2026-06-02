import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { AppText } from './AppText';
import { useAppColors } from '../hooks/useAppColors';

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

function toMonday(d: dayjs.Dayjs): dayjs.Dayjs {
  const dow = d.day();
  return d.add(dow === 0 ? -6 : 1 - dow, 'day').startOf('day');
}

interface Props {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export default function WeekStrip({ selectedDate, onSelectDate }: Props) {
  const { colors, isDark } = useAppColors();
  const today = dayjs().format('YYYY-MM-DD');

  const weekStart = useMemo(() => toMonday(dayjs(selectedDate)), [selectedDate]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day')),
    [weekStart]
  );

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      {days.map((d, i) => {
        const dateStr = d.format('YYYY-MM-DD');
        const isToday = dateStr === today;
        const isSelected = dateStr === selectedDate;
        const isSat = i === 5;
        const isSun = i === 6;
        const labelColor = isSun ? '#E05555' : isSat ? '#4A90D9' : colors.textSecondary;

        return (
          <TouchableOpacity
            key={i}
            style={styles.dayBtn}
            onPress={() => onSelectDate(dateStr)}
            activeOpacity={0.7}
          >
            <AppText style={[styles.dayLabel, { color: labelColor }]}>
              {DAY_LABELS[i]}
            </AppText>
            <View style={[
              styles.circle,
              isToday && { backgroundColor: isDark ? '#fff' : '#1A1A1A' },
              isSelected && !isToday && styles.selectedCircle,
            ]}>
              <AppText style={[
                styles.dateNum,
                { color: isToday ? (isDark ? '#1A1A1A' : '#fff') : isSelected ? '#4A90D9' : colors.text },
              ]}>
                {d.date()}
              </AppText>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayBtn: { flex: 1, alignItems: 'center', gap: 4 },
  dayLabel: { fontSize: 11, fontWeight: '600' },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  selectedCircle: { borderWidth: 1.5, borderColor: '#4A90D9' },
  dateNum: { fontSize: 14, fontWeight: '500' },
});
