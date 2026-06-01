import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { AppText } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { isHoliday } from 'korean-holidays';
import { useScheduleStore } from '../store/scheduleStore';
import { useAppColors } from '../hooks/useAppColors';
import { Schedule } from '../types';
import {
  calculateDayDensity,
  getWeekInsight,
  HEATMAP_LIGHT,
  HEATMAP_DARK,
  DENSITY_UI,
  DensityResult,
} from '../utils/densityCalculator';

function formatHour(h: number): string {
  if (h === 0) return '자정';
  if (h < 12) return `오전 ${h}시`;
  if (h === 12) return '정오';
  return `오후 ${h - 12}시`;
}

function getHolidayName(dateStr: string): string | null {
  const result = isHoliday(new Date(dateStr));
  return result ? result.nameKo : null;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onDayPress: (date: string, hour?: number) => void;
};

const LEGEND_LABELS = ['여유', '가벼움', '보통', '바쁨', '과부하'];
const DAY_LABELS    = ['월', '화', '수', '목', '금', '토', '일'];
const HOURS         = Array.from({ length: 24 }, (_, i) => i);
const TIME_W        = 32;
const CELL_H        = 22;

function toMonday(d: dayjs.Dayjs): dayjs.Dayjs {
  const dow = d.day();
  return d.add(dow === 0 ? -6 : 1 - dow, 'day').startOf('day');
}

// 시간당 점유 분 → density 인덱스 0~4 (수면 제외)
function calcHourDensity(daySchedules: Schedule[], hour: number): number {
  const s0 = hour * 60;
  const s1 = s0 + 60;
  const occupied = daySchedules
    .filter(s => s.scheduleType !== 'sleep')
    .reduce(
      (sum, s) => sum + Math.max(0, Math.min(s.endTime, s1) - Math.max(s.startTime, s0)),
      0
    );
  if (occupied === 0) return 0;
  if (occupied <= 15) return 1;
  if (occupied <= 30) return 2;
  if (occupied <= 45) return 3;
  return 4;
}

const AnimatedBar = React.memo(function AnimatedBar({
  score, color, darkColor, isDark, isFuture, delayMs, visible,
}: {
  score: number; color: string; darkColor: string;
  isDark: boolean; isFuture: boolean; delayMs: number; visible: boolean;
}) {
  const targetH = Math.max(4, (score / 10) * 40);
  const animH = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animH.setValue(0);
    if (!visible) return;
    Animated.sequence([
      Animated.delay(delayMs),
      Animated.spring(animH, { toValue: targetH, damping: 12, stiffness: 100, useNativeDriver: false }),
    ]).start();
  }, [visible, targetH, delayMs]);

  const fillColor = isFuture
    ? (isDark ? '#374151' : '#D1D5DB')
    : (isDark ? darkColor : color);

  return (
    <View style={barChartStyles.track}>
      <Animated.View style={[barChartStyles.fill, { height: animH, backgroundColor: fillColor }]} />
    </View>
  );
});

const barChartStyles = StyleSheet.create({
  track: { flex: 1, height: 40, backgroundColor: '#00000010', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  fill:  { width: '100%', borderRadius: 4 },
});

const HeatmapCell = React.memo(function HeatmapCell({
  density,
  isDark,
  onPress,
}: {
  density: number;
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[cs.cell, { backgroundColor: (isDark ? HEATMAP_DARK : HEATMAP_LIGHT)[density] }]}
      onPress={onPress}
      activeOpacity={0.55}
    />
  );
});

const cs = StyleSheet.create({
  cell: { flex: 1, height: CELL_H, borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
});

export default function WeeklyHeatmapScreen({ visible, onClose, onDayPress }: Props) {
  const { colors, isDark } = useAppColors();
  const insets = useSafeAreaInsets();
  const { getSchedulesByDate, schedules } = useScheduleStore();

  const [weekOffset, setWeekOffset] = useState(0);
  const today = dayjs().format('YYYY-MM-DD');

  // 모달 열릴 때 현재 주로 리셋
  useEffect(() => {
    if (visible) setWeekOffset(0);
  }, [visible]);

  const weekStart = useMemo(() => toMonday(dayjs()).add(weekOffset, 'week'), [weekOffset]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day')),
    [weekStart]
  );

  const weekSchedules = useMemo(
    () => weekDays.map(d => getSchedulesByDate(d.format('YYYY-MM-DD'))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekDays, schedules]
  );

  // 시간×요일 히트맵 매트릭스
  const matrix = useMemo(
    () => HOURS.map(h => weekSchedules.map(ds => calcHourDensity(ds, h))),
    [weekSchedules]
  );

  // 일별 종합 밀도 (3축 계산)
  const dayDensities: DensityResult[] = useMemo(
    () => weekSchedules.map((ds, i) => calculateDayDensity(ds, weekDays[i].format('YYYY-MM-DD'))),
    [weekSchedules, weekDays]
  );

  // 주간 요약
  const summary = useMemo(() => {
    const dayMins = weekSchedules.map(ds =>
      ds.filter(s => s.scheduleType !== 'sleep')
        .reduce((sum, s) => sum + Math.max(0, s.endTime - s.startTime), 0)
    );
    const sleepMins = weekSchedules.map(ds =>
      ds.filter(s => s.scheduleType === 'sleep')
        .reduce((sum, s) => sum + Math.max(0, s.endTime - s.startTime), 0)
    );
    const totalMins = dayMins.reduce((a, b) => a + b, 0);
    const totalSleepMins = sleepMins.reduce((a, b) => a + b, 0);
    const freeMins  = 7 * 24 * 60 - totalMins - totalSleepMins;
    const busiestIdx = dayDensities.reduce(
      (maxI, d, i, arr) => (d.score > arr[maxI].score ? i : maxI), 0
    );
    const freestIdx = dayDensities.reduce(
      (minI, d, i, arr) => (d.score < arr[minI].score ? i : minI), 0
    );
    return {
      totalH:  Math.floor(totalMins / 60),
      totalM:  totalMins % 60,
      freeH:   Math.floor(freeMins / 60),
      freeM:   freeMins % 60,
      busiestDay: `${DAY_LABELS[busiestIdx]}요일`,
      freestDay:  `${DAY_LABELS[freestIdx]}요일`,
      weekInsight: getWeekInsight(dayDensities, DAY_LABELS),
      busiestDensity: dayDensities[busiestIdx],
      peakHour: (() => {
        const hourTotals = HOURS.map(h => matrix[h].reduce((a, b) => a + b, 0));
        const max = Math.max(...hourTotals);
        return max > 0 ? formatHour(hourTotals.indexOf(max)) : null;
      })(),
    };
  }, [weekSchedules, dayDensities, matrix]);

  const weekLabel = `${weekStart.format('YYYY.MM.DD')} ~ ${weekStart.add(6, 'day').format('MM.DD')}`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>

        {/* 헤더 */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.sideBtn}>
            <AppText style={styles.closeTxt}>‹</AppText>
          </TouchableOpacity>
          <View style={styles.weekNav}>
            <TouchableOpacity onPress={() => setWeekOffset(o => o - 1)} style={styles.navBtn}>
              <AppText style={[styles.navTxt, { color: colors.textSecondary }]}>‹</AppText>
            </TouchableOpacity>
            <AppText style={[styles.weekLabel, { color: colors.text }]}>{weekLabel}</AppText>
            <TouchableOpacity onPress={() => setWeekOffset(o => o + 1)} style={styles.navBtn}>
              <AppText style={[styles.navTxt, { color: colors.textSecondary }]}>›</AppText>
            </TouchableOpacity>
          </View>
          <View style={styles.sideBtn} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>

          {/* 요일 헤더 */}
          <View style={[styles.dayHeaderRow, { borderBottomColor: colors.border }]}>
            <View style={{ width: TIME_W }} />
            {weekDays.map((d, i) => {
              const dateStr = d.format('YYYY-MM-DD');
              const isToday = dateStr === today;
              const holidayName = getHolidayName(dateStr);
              const isHoliday = !!holidayName;
              const dayColor = (i === 6 || isHoliday) ? '#E05555' : i === 5 ? '#4A90D9' : colors.textSecondary;
              const density  = dayDensities[i];

              return (
                <TouchableOpacity
                  key={i}
                  style={styles.dayHeaderCell}
                  onPress={() => onDayPress(dateStr)}
                >
                  <AppText style={[styles.dayName, { color: dayColor }]}>{DAY_LABELS[i]}</AppText>
                  <View style={[styles.dayCircle, isToday && styles.todayCircle]}>
                    <AppText style={[styles.dayDate, { color: isToday ? '#fff' : (i === 6 || isHoliday) ? '#E05555' : colors.text }]}>
                      {d.date()}
                    </AppText>
                  </View>
                  {holidayName && (
                    <AppText style={styles.holidayName} numberOfLines={1}>{holidayName}</AppText>
                  )}
                  {/* 일별 밀도 뱃지 */}
                  <View style={[
                    styles.densityBadge,
                    { backgroundColor: isDark ? density.darkColor : density.color },
                  ]}>
                    <AppText style={[styles.densityBadgeText, { color: isDark ? '#fff' : density.textColor }]}>
                      {density.label}
                    </AppText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 히트맵 그리드 */}
          <View style={[styles.grid, { borderColor: colors.border }]}>
            {HOURS.map(hour => (
              <View key={hour} style={styles.gridRow}>
                <View style={[styles.timeCell, { width: TIME_W, borderRightColor: colors.border }]}>
                  <AppText style={[styles.timeLabel, { color: colors.textSecondary }]}>
                    {String(hour).padStart(2, '0')}
                  </AppText>
                </View>
                {weekDays.map((d, di) => (
                  <HeatmapCell
                    key={di}
                    density={matrix[hour][di]}
                    isDark={isDark}
                    onPress={() => onDayPress(d.format('YYYY-MM-DD'), hour)}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* 범례 */}
          <View style={[styles.legend, { borderTopColor: colors.border }]}>
            {LEGEND_LABELS.map((lbl, i) => (
              <View key={i} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: (isDark ? HEATMAP_DARK : HEATMAP_LIGHT)[i] },
                    i === 0 && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
                  ]}
                />
                <AppText style={[styles.legendLabel, { color: colors.textSecondary }]}>{lbl}</AppText>
              </View>
            ))}
          </View>

          {/* 주간 밀도 분석 카드 */}
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <AppText style={[styles.summaryTitle, { color: colors.text }]}>주간 밀도 분석</AppText>

            {/* 주간 인사이트 */}
            <View style={[styles.insightRow, { backgroundColor: isDark ? summary.busiestDensity.darkColor + '44' : summary.busiestDensity.color + '66' }]}>
              <AppText style={[styles.insightText, { color: colors.text }]}>{summary.weekInsight}</AppText>
            </View>

            {/* 수치 요약 */}
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <AppText style={[styles.statLabel, { color: colors.textSecondary }]}>총 일정 시간</AppText>
                <AppText style={[styles.statValue, { color: colors.text }]}>
                  {summary.totalH}시간 {summary.totalM}분
                </AppText>
              </View>
              <View style={styles.statItem}>
                <AppText style={[styles.statLabel, { color: colors.textSecondary }]}>여백 시간</AppText>
                <AppText style={[styles.statValue, { color: colors.text }]}>
                  {summary.freeH}시간 {summary.freeM}분
                </AppText>
              </View>
              <View style={styles.statItem}>
                <AppText style={[styles.statLabel, { color: colors.textSecondary }]}>가장 바쁜 날</AppText>
                <AppText style={[styles.statValue, { color: colors.text }]}>{summary.busiestDay} 🔥</AppText>
              </View>
              <View style={styles.statItem}>
                <AppText style={[styles.statLabel, { color: colors.textSecondary }]}>가장 여유로운 날</AppText>
                <AppText style={[styles.statValue, { color: colors.text }]}>{summary.freestDay} ✦</AppText>
              </View>
              {summary.peakHour && (
                <View style={styles.statItem}>
                  <AppText style={[styles.statLabel, { color: colors.textSecondary }]}>피크 타임</AppText>
                  <AppText style={[styles.statValue, { color: colors.text }]}>{summary.peakHour} ⚡</AppText>
                </View>
              )}
            </View>

            {/* 요일별 밀도 바 */}
            <AppText style={[styles.barTitle, { color: colors.textSecondary }]}>요일별 밀도</AppText>
            <View style={styles.densityBars}>
              {dayDensities.map((d, i) => {
                const isFuture = weekDays[i].isAfter(dayjs(), 'day');
                return (
                  <View key={i} style={styles.barCol}>
                    <AnimatedBar
                      score={d.score}
                      color={d.color}
                      darkColor={d.darkColor}
                      isDark={isDark}
                      isFuture={isFuture}
                      delayMs={i * 60}
                      visible={visible}
                    />
                    <AppText style={[styles.barDayLabel, { color: isFuture ? colors.border : colors.textSecondary }]}>
                      {DAY_LABELS[i]}
                    </AppText>
                  </View>
                );
              })}
            </View>
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sideBtn:   { width: 44 },
  closeTxt:  { fontSize: 24, lineHeight: 26, color: '#4A90D9' },
  weekNav:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  navBtn:    { padding: 8 },
  navTxt:    { fontSize: 20, lineHeight: 24 },
  weekLabel: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  dayHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayHeaderCell: { flex: 1, alignItems: 'center', gap: 2, paddingBottom: 4 },
  holidayName:   { fontSize: 8, color: '#E05555', fontWeight: '600', textAlign: 'center' },
  dayName:       { fontSize: 11, fontWeight: '600' },
  dayCircle:     { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  todayCircle:   { backgroundColor: '#4A90D9' },
  dayDate:       { fontSize: 13, fontWeight: '500' },
  densityBadge:  { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  densityBadgeText: { fontSize: 8, fontWeight: '700' },
  grid: { borderTopWidth: StyleSheet.hairlineWidth },
  gridRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#00000008' },
  timeCell: { justifyContent: 'center', alignItems: 'flex-end', paddingRight: 4, borderRightWidth: StyleSheet.hairlineWidth },
  timeLabel: { fontSize: 9 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel:  { fontSize: 10 },
  summaryCard: {
    margin: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 32,
    gap: 12,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700' },
  insightRow: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  insightText: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statItem: { width: '50%', paddingVertical: 6, paddingHorizontal: 2 },
  statLabel: { fontSize: 11, marginBottom: 3 },
  statValue: { fontSize: 14, fontWeight: '600' },
  barTitle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  densityBars: { flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', gap: 3 },
  barDayLabel: { fontSize: 9, fontWeight: '600' },
});
