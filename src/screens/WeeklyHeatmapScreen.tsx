import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import dayjs from 'dayjs';
import { COLORS } from '../constants';
import { useScheduleStore } from '../store/scheduleStore';
import { Schedule } from '../types';

type Props = {
  visible: boolean;
  onClose: () => void;
  onDayPress: (date: string) => void;
};

// ── 밀도별 색상 ──────────────────────────────────────────
const DENSITY_LIGHT = ['#F8F8F8', '#C8E6C9', '#66BB6A', '#F57C00', '#D32F2F'];
const DENSITY_DARK  = ['#1A1A1A', '#1B5E20', '#388E3C', '#E65100', '#B71C1C'];
const LEGEND_LABELS = ['여유', '가벼움', '보통', '바쁨', '과부하'];
const DAY_LABELS    = ['월', '화', '수', '목', '금', '토', '일'];
const HOURS         = Array.from({ length: 24 }, (_, i) => i);
const TIME_W        = 32;
const CELL_H        = 22;

// 이번 주 월요일 계산
function toMonday(d: dayjs.Dayjs): dayjs.Dayjs {
  const dow = d.day(); // 0=일
  return d.add(dow === 0 ? -6 : 1 - dow, 'day').startOf('day');
}

// 셀 밀도 계산: density = min(4, floor(count + 겹침분/60))
function calcDensity(daySchedules: Schedule[], hour: number): number {
  const s0 = hour * 60;
  const s1 = s0 + 60;
  const hits = daySchedules.filter(s => s.startTime < s1 && s.endTime > s0);
  if (!hits.length) return 0;
  const overlap = hits.reduce(
    (sum, s) => sum + Math.max(0, Math.min(s.endTime, s1) - Math.max(s.startTime, s0)),
    0
  );
  return Math.min(4, Math.floor(hits.length + overlap / 60));
}

// ── 히트맵 셀 (React.memo로 최적화) ──────────────────────
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
      style={[cs.cell, { backgroundColor: (isDark ? DENSITY_DARK : DENSITY_LIGHT)[density] }]}
      onPress={onPress}
      activeOpacity={0.55}
    />
  );
});

const cs = StyleSheet.create({
  cell: { flex: 1, height: CELL_H, borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
});

// ── 요약 항목 ────────────────────────────────────────────
function SummaryItem({ label, value, text, sub }: { label: string; value: string; text: string; sub: string }) {
  return (
    <View style={si.wrap}>
      <Text style={[si.label, { color: sub }]}>{label}</Text>
      <Text style={[si.value, { color: text }]}>{value}</Text>
    </View>
  );
}
const si = StyleSheet.create({
  wrap:  { width: '50%', paddingVertical: 10, paddingHorizontal: 4 },
  label: { fontSize: 11, marginBottom: 4 },
  value: { fontSize: 15, fontWeight: '600' },
});

// ── 메인 화면 ─────────────────────────────────────────────
export default function WeeklyHeatmapScreen({ visible, onClose, onDayPress }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;
  const { getSchedulesByDate, schedules } = useScheduleStore();

  const [weekStart, setWeekStart] = useState(() => toMonday(dayjs()));
  const today = dayjs().format('YYYY-MM-DD');

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day')),
    [weekStart]
  );

  // 요일별 일정 목록 (반복 일정 포함)
  const weekSchedules = useMemo(
    () => weekDays.map(d => getSchedulesByDate(d.format('YYYY-MM-DD'))),
    // schedules 변경 시도 재계산
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekDays, schedules]
  );

  // 밀도 행렬 [hour][dayIdx]
  const matrix = useMemo(
    () => HOURS.map(h => weekSchedules.map(ds => calcDensity(ds, h))),
    [weekSchedules]
  );

  // 주간 요약 계산
  const summary = useMemo(() => {
    const dayMins = weekSchedules.map(ds =>
      ds.reduce((sum, s) => sum + Math.max(0, s.endTime - s.startTime), 0)
    );
    const totalMins = dayMins.reduce((a, b) => a + b, 0);
    const freeMins  = 7 * 24 * 60 - totalMins;
    const peakDayIdx = dayMins.indexOf(Math.max(...dayMins));
    const hourSums  = HOURS.map(h => matrix[h].reduce((a, b) => a + b, 0));
    const peakHour  = hourSums.indexOf(Math.max(...hourSums));
    const hasAny    = totalMins > 0;
    return {
      totalH:   Math.floor(totalMins / 60),
      totalM:   totalMins % 60,
      freeH:    Math.floor(freeMins / 60),
      freeM:    freeMins % 60,
      peakDay:  hasAny ? `${DAY_LABELS[peakDayIdx]}요일 🔥` : '-',
      peakTime: hasAny ? `${peakHour}시 ~ ${peakHour + 1}시` : '-',
    };
  }, [weekSchedules, matrix]);

  const weekLabel = `${weekStart.format('YYYY.MM.DD')} ~ ${weekStart.add(6, 'day').format('MM.DD')}`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

        {/* 헤더 */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.sideBtn}>
            <Text style={styles.closeTxt}>‹</Text>
          </TouchableOpacity>
          <View style={styles.weekNav}>
            <TouchableOpacity onPress={() => setWeekStart(w => w.subtract(7, 'day'))} style={styles.weekNavBtn}>
              <Text style={[styles.navArrow, { color: colors.text }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.weekLabel, { color: colors.text }]}>{weekLabel}</Text>
            <TouchableOpacity onPress={() => setWeekStart(w => w.add(7, 'day'))} style={styles.weekNavBtn}>
              <Text style={[styles.navArrow, { color: colors.text }]}>›</Text>
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
              const color = i === 6 ? '#E05555' : i === 5 ? '#4A90D9' : colors.textSecondary;
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.dayHeaderCell}
                  onPress={() => { onDayPress(dateStr); onClose(); }}
                >
                  <Text style={[styles.dayName, { color }]}>{DAY_LABELS[i]}</Text>
                  <View style={[styles.dayCircle, isToday && styles.todayCircle]}>
                    <Text style={[styles.dayDate, { color: isToday ? '#fff' : colors.text }]}>
                      {d.date()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 히트맵 그리드 */}
          <View style={[styles.grid, { borderColor: colors.border }]}>
            {HOURS.map(hour => (
              <View key={hour} style={styles.gridRow}>
                {/* 시간 레이블 */}
                <View style={[styles.timeCell, { width: TIME_W, borderRightColor: colors.border }]}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                    {String(hour).padStart(2, '0')}
                  </Text>
                </View>
                {/* 셀 7개 */}
                {weekDays.map((d, di) => (
                  <HeatmapCell
                    key={di}
                    density={matrix[hour][di]}
                    isDark={isDark}
                    onPress={() => { onDayPress(d.format('YYYY-MM-DD')); onClose(); }}
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
                    { backgroundColor: (isDark ? DENSITY_DARK : DENSITY_LIGHT)[i] },
                    i === 0 && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
                  ]}
                />
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{lbl}</Text>
              </View>
            ))}
          </View>

          {/* 주간 요약 카드 */}
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>주간 요약</Text>
            <View style={styles.summaryGrid}>
              <SummaryItem
                label="총 일정 시간"
                value={`${summary.totalH}시간 ${summary.totalM}분`}
                text={colors.text}
                sub={colors.textSecondary}
              />
              <SummaryItem
                label="여백 시간"
                value={`${summary.freeH}시간 ${summary.freeM}분`}
                text={colors.text}
                sub={colors.textSecondary}
              />
              <SummaryItem
                label="가장 바쁜 요일"
                value={summary.peakDay}
                text={colors.text}
                sub={colors.textSecondary}
              />
              <SummaryItem
                label="피크 타임"
                value={summary.peakTime}
                text={colors.text}
                sub={colors.textSecondary}
              />
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sideBtn:    { width: 44 },
  closeTxt:   { fontSize: 24, lineHeight: 26, color: '#4A90D9' },
  weekNav:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  weekNavBtn: { padding: 6 },
  navArrow:   { fontSize: 22, lineHeight: 24 },
  weekLabel:  { fontSize: 14, fontWeight: '700' },

  // 요일 헤더
  dayHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayHeaderCell: { flex: 1, alignItems: 'center', gap: 4 },
  dayName:       { fontSize: 11, fontWeight: '600' },
  dayCircle:     { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  todayCircle:   { backgroundColor: '#4A90D9' },
  dayDate:       { fontSize: 13, fontWeight: '500' },

  // 그리드
  grid: { borderTopWidth: StyleSheet.hairlineWidth },
  gridRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#00000008' },
  timeCell: { justifyContent: 'center', alignItems: 'flex-end', paddingRight: 4, borderRightWidth: StyleSheet.hairlineWidth },
  timeLabel: { fontSize: 9 },

  // 범례
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

  // 요약 카드
  summaryCard: {
    margin: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 32,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  summaryGrid:  { flexDirection: 'row', flexWrap: 'wrap' },
});
