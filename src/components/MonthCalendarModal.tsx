import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { isHoliday } from 'korean-holidays';
import { useAppColors } from '../hooks/useAppColors';
import { useScheduleStore } from '../store/scheduleStore';

dayjs.locale('ko');

function isPublicHoliday(dateStr: string): boolean {
  return isHoliday(new Date(dateStr)) !== null;
}

function formatTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

type Props = {
  visible: boolean;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onClose: () => void;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const SCREEN_H = Dimensions.get('window').height;

export default function MonthCalendarModal({ visible, selectedDate, onSelectDate, onClose }: Props) {
  const { colors, isDark } = useAppColors();
  const insets = useSafeAreaInsets();
  const { getSchedulesByDate } = useScheduleStore();

  const [viewMonth, setViewMonth] = useState(() => dayjs(selectedDate).startOf('month'));
  const [localSelected, setLocalSelected] = useState(selectedDate);
  const today = dayjs().format('YYYY-MM-DD');

  // 슬라이드업 애니메이션
  const slideY = useRef(new Animated.Value(SCREEN_H)).current;
  const [modalVisible, setModalVisible] = useState(visible);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      setViewMonth(dayjs(selectedDate).startOf('month'));
      setLocalSelected(selectedDate);
      Animated.spring(slideY, { toValue: 0, damping: 22, stiffness: 180, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideY, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }).start(
        () => setModalVisible(false)
      );
    }
  }, [visible]);

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

  const daySchedules = useMemo(
    () => getSchedulesByDate(localSelected).filter(s => !s.isOverflow).sort((a, b) => a.startTime - b.startTime),
    [localSelected, getSchedulesByDate]
  );

  const handleSelectDate = (date: string) => {
    setLocalSelected(date);
    onSelectDate(date);
  };

  // 카드 배경: 다크면 어두운 표면, 라이트면 밝은 표면
  const cardBg = isDark ? '#2A2A2C' : '#F2F2F7';
  const scheduleCardBg = isDark ? '#3A3A3C' : '#FFFFFF';

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 8,
            transform: [{ translateY: slideY }],
          },
        ]}
      >
        {/* 핸들 */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* 월 네비게이션 */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setViewMonth(v => v.subtract(1, 'month'))} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <AppText style={[styles.monthTitle, { color: colors.text }]}>
            {viewMonth.format('YYYY년 M월')}
          </AppText>
          <TouchableOpacity onPress={() => setViewMonth(v => v.add(1, 'month'))} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 캘린더 카드 */}
        <View style={[styles.calCard, { backgroundColor: cardBg }]}>
          {/* 요일 헤더 */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((day, i) => (
              <AppText
                key={day}
                style={[
                  styles.weekDayText,
                  { color: i === 0 ? '#E05555' : i === 6 ? '#4A90D9' : colors.textSecondary },
                ]}
              >
                {day}
              </AppText>
            ))}
          </View>

          {/* 날짜 그리드 */}
          <View style={styles.grid}>
            {cells.map((date, i) => {
              if (!date) return <View key={`e${i}`} style={styles.cell} />;
              const isToday = date === today;
              const isSelected = date === localSelected;
              const hasSchedule = datesWithSchedule.has(date);
              const dow = dayjs(date).day();
              const isHoli = isPublicHoliday(date);
              const textColor = isSelected
                ? '#fff'
                : isToday
                ? '#4A90D9'
                : dow === 0 || isHoli
                ? '#E05555'
                : dow === 6
                ? '#4A90D9'
                : colors.text;

              return (
                <TouchableOpacity
                  key={date}
                  style={styles.cell}
                  onPress={() => handleSelectDate(date)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.dayCircle,
                    isSelected && styles.selectedCircle,
                    isToday && !isSelected && { borderWidth: 1.5, borderColor: '#4A90D9' },
                  ]}>
                    <AppText style={[styles.dayText, { color: textColor }]}>
                      {dayjs(date).date()}
                    </AppText>
                  </View>
                  {hasSchedule && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? '#fff' : '#4A90D9' }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 선택된 날짜 일정 목록 */}
        <View style={styles.listHeader}>
          <AppText style={[styles.listDateLabel, { color: colors.text }]}>
            {dayjs(localSelected).format('M월 D일 ddd요일')}
          </AppText>
        </View>

        <ScrollView
          style={styles.scheduleList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {daySchedules.length === 0 ? (
            <AppText style={[styles.emptyText, { color: colors.textSecondary }]}>일정 없음</AppText>
          ) : (
            daySchedules.map(s => {
              const color = s.colorCategory?.color ?? '#4A90D9';
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.scheduleItem, { backgroundColor: scheduleCardBg }]}
                  onPress={() => { onSelectDate(localSelected); onClose(); }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.colorBar, { backgroundColor: color }]} />
                  <View style={styles.scheduleInfo}>
                    <AppText style={[styles.scheduleTitle, { color: colors.text }]} numberOfLines={1}>
                      {s.title}
                    </AppText>
                    <AppText style={[styles.scheduleTime, { color: colors.textSecondary }]}>
                      {formatTime(s.startTime)} – {formatTime(s.endTime)}
                    </AppText>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000055',
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: { padding: 6 },
  monthTitle: { fontSize: 16, fontWeight: '700' },
  calCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285714%', alignItems: 'center', paddingVertical: 3 },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCircle: { backgroundColor: '#4A90D9' },
  dayText: { fontSize: 13, fontWeight: '500' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  listHeader: { marginBottom: 8 },
  listDateLabel: { fontSize: 14, fontWeight: '600' },
  scheduleList: { flex: 1 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  scheduleInfo: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  scheduleTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  scheduleTime: { fontSize: 12 },
});
