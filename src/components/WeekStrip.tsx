import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import dayjs from 'dayjs';
import { AppText } from './AppText';
import { useAppColors } from '../hooks/useAppColors';

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const SCREEN_W = Dimensions.get('window').width;

// 주어진 날짜가 속한 월요일 반환
function toMonday(d: dayjs.Dayjs): dayjs.Dayjs {
  const dow = d.day();
  return d.add(dow === 0 ? -6 : 1 - dow, 'day').startOf('day');
}

// 중앙 인덱스: 앞뒤로 충분한 주 수
const TOTAL_WEEKS = 200;
const CENTER = Math.floor(TOTAL_WEEKS / 2);

interface Props {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export default function WeekStrip({ selectedDate, onSelectDate }: Props) {
  const { colors, isDark } = useAppColors();
  const today = dayjs().format('YYYY-MM-DD');
  const flatRef = useRef<FlatList>(null);

  // 기준 월요일 (오늘 기준 CENTER 주)
  const baseMonday = useMemo(() => toMonday(dayjs()).subtract(CENTER, 'week'), []);

  // 현재 선택된 날짜가 속한 주 인덱스
  const selectedWeekIndex = useMemo(() => {
    const selMonday = toMonday(dayjs(selectedDate));
    return selMonday.diff(baseMonday, 'week');
  }, [selectedDate, baseMonday]);

  // 초기 스크롤 및 날짜 변경 시 해당 주로 이동
  useEffect(() => {
    flatRef.current?.scrollToIndex({
      index: selectedWeekIndex,
      animated: true,
      viewPosition: 0,
    });
  }, [selectedWeekIndex]);

  const renderWeek = useCallback(({ index }: { index: number }) => {
    const weekStart = baseMonday.add(index, 'week');
    const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));

    return (
      <View style={[styles.week, { width: SCREEN_W }]}>
        {days.map((d, i) => {
          const dateStr = d.format('YYYY-MM-DD');
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isSat = i === 5;
          const isSun = i === 6;
          const labelColor = isSun ? '#E05555' : isSat ? '#4A90D9' : colors.textSecondary;

          return (
            <TouchableOpacity
              key={dateStr}
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
                  {
                    color: isToday
                      ? (isDark ? '#1A1A1A' : '#fff')
                      : isSelected
                      ? '#4A90D9'
                      : colors.text,
                  },
                ]}>
                  {d.date()}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }, [selectedDate, today, colors, isDark, onSelectDate, baseMonday]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_W,
    offset: SCREEN_W * index,
    index,
  }), []);

  // 스와이프로 주 이동 시 선택일을 해당 주의 같은 요일로 변경
  const handleMomentumScrollEnd = useCallback((e: any) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (newIndex === selectedWeekIndex) return;
    const diff = newIndex - selectedWeekIndex;
    const newDate = dayjs(selectedDate).add(diff * 7, 'day').format('YYYY-MM-DD');
    onSelectDate(newDate);
  }, [selectedWeekIndex, selectedDate, onSelectDate]);

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <FlatList
        ref={flatRef}
        data={Array.from({ length: TOTAL_WEEKS })}
        renderItem={renderWeek}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={getItemLayout}
        initialScrollIndex={selectedWeekIndex}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        windowSize={3}
        maxToRenderPerBatch={3}
        initialNumToRender={3}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  week: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dayBtn: { flex: 1, alignItems: 'center', gap: 4 },
  dayLabel: { fontSize: 11, fontWeight: '600' },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  selectedCircle: { borderWidth: 1.5, borderColor: '#4A90D9' },
  dateNum: { fontSize: 14, fontWeight: '500' },
});
