import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import dayjs from 'dayjs';
import Holidays from 'date-holidays';
import { useAppColors } from '../hooks/useAppColors';
import { useScheduleStore } from '../store/scheduleStore';

const hd = new Holidays('KR');

function isPublicHoliday(dateStr: string): boolean {
  const result = hd.isHoliday(new Date(dateStr));
  if (!result) return false;
  return (result as any[]).some((h: any) => h.type === 'public');
}

type Props = {
  visible: boolean;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onClose: () => void;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function MonthCalendarModal({ visible, selectedDate, onSelectDate, onClose }: Props) {
  const { colors } = useAppColors();
  const { getSchedulesByDate } = useScheduleStore();

  const [viewMonth, setViewMonth] = useState(() => dayjs(selectedDate).startOf('month'));
  const today = dayjs().format('YYYY-MM-DD');

  // 모달이 열릴 때 선택된 날짜의 달로 이동
  useEffect(() => {
    if (visible) setViewMonth(dayjs(selectedDate).startOf('month'));
  }, [visible, selectedDate]);

  const cells = useMemo(() => {
    const startDow = viewMonth.day();
    const daysInMonth = viewMonth.daysInMonth();
    const arr: (string | null)[] = [
      ...Array(startDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) =>
        viewMonth.date(i + 1).format('YYYY-MM-DD')
      ),
    ];
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [viewMonth]);

  const datesWithSchedule = useMemo(() => {
    const set = new Set<string>();
    cells.forEach((date) => {
      if (date && getSchedulesByDate(date).length > 0) set.add(date);
    });
    return set;
  }, [cells, getSchedulesByDate]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[s.sheet, { backgroundColor: colors.surface }]}>
        {/* 월 네비게이션 */}
        <View style={s.monthNav}>
          <TouchableOpacity onPress={() => setViewMonth((v) => v.subtract(1, 'month'))} style={s.navBtn}>
            <Text style={[s.navArrow, { color: colors.text }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[s.monthTitle, { color: colors.text }]}>
            {viewMonth.format('YYYY년 M월')}
          </Text>
          <TouchableOpacity onPress={() => setViewMonth((v) => v.add(1, 'month'))} style={s.navBtn}>
            <Text style={[s.navArrow, { color: colors.text }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 요일 헤더 */}
        <View style={s.weekRow}>
          {WEEKDAYS.map((day, i) => (
            <Text
              key={day}
              style={[
                s.weekDayText,
                { color: i === 0 ? '#E05555' : i === 6 ? '#4A90D9' : colors.textSecondary },
              ]}
            >
              {day}
            </Text>
          ))}
        </View>

        {/* 날짜 그리드 */}
        <View style={s.grid}>
          {cells.map((date, i) => {
            if (!date) return <View key={`e${i}`} style={s.cell} />;
            const isToday = date === today;
            const isSelected = date === selectedDate;
            const hasSchedule = datesWithSchedule.has(date);
            const dow = dayjs(date).day();
            const isHoliday = isPublicHoliday(date);
            const textColor = isSelected
              ? '#fff'
              : isToday
              ? '#4A90D9'
              : dow === 0 || isHoliday
              ? '#E05555'
              : dow === 6
              ? '#4A90D9'
              : colors.text;

            return (
              <TouchableOpacity
                key={date}
                style={s.cell}
                onPress={() => { onSelectDate(date); onClose(); }}
              >
                <View
                  style={[
                    s.dayCircle,
                    isSelected && { backgroundColor: '#4A90D9' },
                    isToday && !isSelected && { borderWidth: 1.5, borderColor: '#4A90D9' },
                  ]}
                >
                  <Text style={[s.dayText, { color: textColor }]}>
                    {dayjs(date).date()}
                  </Text>
                </View>
                {hasSchedule && (
                  <View style={[s.dot, { backgroundColor: isSelected ? '#fff' : '#4A90D9' }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000044',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 24, lineHeight: 26 },
  monthTitle: { fontSize: 16, fontWeight: '700' },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.285714%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
