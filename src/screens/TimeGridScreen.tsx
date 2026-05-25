import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { useScheduleStore } from '../store/scheduleStore';
import TimeGrid from '../components/TimeGrid';
import ScheduleFormModal from '../components/ScheduleFormModal';
import StyleSettingsScreen from './StyleSettingsScreen';
import MonthCalendarModal from '../components/MonthCalendarModal';
import WeeklyHeatmapScreen from './WeeklyHeatmapScreen';
import { notificationService } from '../services/NotificationService';
import { useNotificationHandler } from '../hooks/useNotificationHandler';
import { COLORS } from '../constants';
import { Schedule, ColorCategory, RepeatType } from '../types';
import uuid from '../utils/uuid';
import { calculateFreeBlocks, getDayFreeSummary } from '../utils/freeBlockCalculator';
import { useSettingsStore } from '../store/settingsStore';

dayjs.locale('ko');

type ModalState =
  | { mode: 'create'; startMinutes: number; endMinutes: number }
  | { mode: 'edit'; schedule: Schedule; editScope: 'this' | 'all' }
  | null;

function formatHeaderDate(dateStr: string) {
  const d = dayjs(dateStr);
  const today = dayjs();
  const left = d.format('MM.DD ddd').toUpperCase();
  let right = '';
  if (d.isSame(today, 'day')) right = 'Today';
  else if (d.isSame(today.subtract(1, 'day'), 'day')) right = 'Yesterday';
  else if (d.isSame(today.add(1, 'day'), 'day')) right = 'Tomorrow';
  return { left, right };
}

export default function TimeGridScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? COLORS.dark : COLORS.light;

  const {
    selectedDate,
    setSelectedDate,
    getSchedulesByDate,
    addSchedule,
    updateSchedule,
    removeSchedule,
    addScheduleException,
    colorCategories,
    hasOverlap,
  } = useScheduleStore();

  const schedules = getSchedulesByDate(selectedDate);
  const { gridStartHour, gridEndHour } = useSettingsStore();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(false);

  // 알림 핸들러 초기화
  useNotificationHandler();
  const [nowStr, setNowStr] = useState(dayjs().format('HH:mm:ss'));

  useEffect(() => {
    const t = setInterval(() => setNowStr(dayjs().format('HH:mm:ss')), 1000);
    return () => clearInterval(t);
  }, []);

  // 새 일정 생성 시작
  const handleStartCreating = useCallback((startMinutes: number, endMinutes: number) => {
    setModalState({ mode: 'create', startMinutes, endMinutes });
  }, []);

  // 기존 일정 롱프레스 → 수정 모달 (반복 일정이면 범위 선택)
  const handleEditSchedule = useCallback((schedule: Schedule) => {
    if (schedule.repeat === 'none') {
      setModalState({ mode: 'edit', schedule, editScope: 'all' });
      return;
    }
    Alert.alert('반복 일정', '어떤 일정을 수정할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '이 날짜만', onPress: () => setModalState({ mode: 'edit', schedule, editScope: 'this' }) },
      { text: '모든 반복 일정', onPress: () => setModalState({ mode: 'edit', schedule, editScope: 'all' }) },
    ]);
  }, []);

  // 저장 (생성 or 수정)
  const handleConfirm = useCallback(
    (data: { title: string; colorCategory: ColorCategory; startTime: number; endTime: number; repeat: RepeatType; reminderOffsets: number[] }) => {
      if (!modalState) return;

      const excludeId = modalState.mode === 'edit' ? modalState.schedule.id : undefined;

      if (hasOverlap(data.startTime, data.endTime, selectedDate, excludeId)) {
        Alert.alert('시간 겹침', '같은 시간대에 다른 일정이 있습니다.\n시간을 조정해주세요.');
        return;
      }

      if (modalState.mode === 'create') {
        const newId = uuid();
        const newSchedule = {
          id: newId,
          title: data.title,
          startTime: data.startTime,
          endTime: data.endTime,
          colorCategory: data.colorCategory,
          date: selectedDate,
          hasNotification: data.reminderOffsets.length > 0,
          repeat: data.repeat,
          reminderOffsets: data.reminderOffsets,
        };
        addSchedule(newSchedule);
        notificationService.scheduleAlarmsForSchedule(newSchedule);
      } else if (modalState.editScope === 'this') {
        addScheduleException(modalState.schedule.id, selectedDate);
        const newId = uuid();
        const newSchedule = {
          id: newId,
          title: data.title,
          startTime: data.startTime,
          endTime: data.endTime,
          colorCategory: data.colorCategory,
          date: selectedDate,
          hasNotification: data.reminderOffsets.length > 0,
          repeat: 'none' as RepeatType,
          reminderOffsets: data.reminderOffsets,
        };
        addSchedule(newSchedule);
        notificationService.scheduleAlarmsForSchedule(newSchedule);
      } else {
        const updates = {
          title: data.title,
          startTime: data.startTime,
          endTime: data.endTime,
          colorCategory: data.colorCategory,
          repeat: data.repeat,
          reminderOffsets: data.reminderOffsets,
          hasNotification: data.reminderOffsets.length > 0,
        };
        updateSchedule(modalState.schedule.id, updates);
        // 기존 알람 취소 후 재등록
        notificationService.cancelAllAlarmsForSchedule(modalState.schedule.id).then(() => {
          notificationService.scheduleAlarmsForSchedule({ ...modalState.schedule, ...updates });
        });
      }

      setModalState(null);
    },
    [modalState, selectedDate, hasOverlap, addSchedule, updateSchedule, addScheduleException]
  );

  // 삭제
  const handleDelete = useCallback(() => {
    if (modalState?.mode !== 'edit') return;
    const { schedule, editScope } = modalState;
    if (schedule.repeat !== 'none' && editScope !== 'this') {
      // 반복 일정 전체 삭제 여부 재확인
      Alert.alert('반복 일정 삭제', '모든 반복 일정을 삭제할까요?', [
        { text: '취소', style: 'cancel' },
        { text: '이 날짜만', onPress: () => { addScheduleException(schedule.id, selectedDate); setModalState(null); } },
        { text: '모두 삭제', style: 'destructive', onPress: () => { notificationService.cancelAllAlarmsForSchedule(schedule.id); removeSchedule(schedule.id); setModalState(null); } },
      ]);
    } else if (editScope === 'this') {
      addScheduleException(schedule.id, selectedDate);
      setModalState(null);
    } else {
      Alert.alert('일정 삭제', '이 일정을 삭제할까요?', [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => { notificationService.cancelAllAlarmsForSchedule(schedule.id); removeSchedule(schedule.id); setModalState(null); } },
      ]);
    }
  }, [modalState, selectedDate, removeSchedule, addScheduleException]);

  const goToPrevDay = () =>
    setSelectedDate(dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'));
  const goToNextDay = () =>
    setSelectedDate(dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD'));
  const goToToday = () => setSelectedDate(dayjs().format('YYYY-MM-DD'));

  const { left: dateLeft, right: dateRight } = formatHeaderDate(selectedDate);

  // 여백 요약 계산
  const freeBlocks = calculateFreeBlocks(schedules, gridStartHour, gridEndHour);
  const freeSummary = getDayFreeSummary(freeBlocks, gridStartHour, gridEndHour);

  // 여백 비율에 따른 색상 및 메시지
  function summaryBarColor(): string {
    if (freeSummary.freeRatio < 0.3) return '#E05555';
    if (freeSummary.freeRatio < 0.5) return '#E07C2A';
    if (freeSummary.freeRatio < 0.7) return '#4CAF50';
    return '#4A90D9';
  }

  function formatHoursKo(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}시간`;
    if (h === 0) return `${m}분`;
    return `${h}시간 ${m}분`;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goToPrevDay} style={styles.navButton}>
          <Text style={[styles.navArrow, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCalendarVisible(true)} style={styles.dateCenter}>
          <Text style={[styles.dateMain, { color: colors.text }]}>
            {dateLeft}
            {dateRight ? (
              <Text style={[styles.dateSub, { color: colors.textSecondary }]}>
                {'  '}{dateRight}
              </Text>
            ) : null}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
          <Text style={[styles.navArrow, { color: colors.text }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSettingsVisible(true)} style={styles.menuButton}>
          <Text style={[styles.menuDots, { color: colors.textSecondary }]}>•••</Text>
        </TouchableOpacity>
      </View>

      {/* 타임 그리드 */}
      <TimeGrid
        schedules={schedules}
        selectedDate={selectedDate}
        onStartCreating={handleStartCreating}
        onEditSchedule={handleEditSchedule}
      />

      {/* 여백 요약 바 */}
      <View style={[styles.summaryBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            여백 {formatHoursKo(freeSummary.totalFreeHours)}
          </Text>
          {/* 프로그레스 바 */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(1 - freeSummary.freeRatio) * 100}%`,
                  backgroundColor: summaryBarColor(),
                },
              ]}
            />
          </View>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            최장 {freeSummary.longestFreeBlock
              ? formatHoursKo(freeSummary.longestFreeBlock.durationHours)
              : '없음'}
          </Text>
        </View>
        <Text style={[styles.summaryMessage, { color: summaryBarColor() }]}>
          {freeSummary.message}
        </Text>
      </View>

      {/* 하단 바 */}
      <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
          <Text style={[styles.todayText, { color: colors.textSecondary }]}>Today</Text>
        </TouchableOpacity>
        <Text style={[styles.clockText, { color: colors.textSecondary }]}>{nowStr}</Text>
        <TouchableOpacity style={styles.calButton} onPress={() => setHeatmapVisible(true)}>
          <Text style={{ fontSize: 18 }}>📊</Text>
        </TouchableOpacity>
      </View>

      {/* 스타일 설정 화면 */}
      <StyleSettingsScreen visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      {/* 주간 히트맵 */}
      <WeeklyHeatmapScreen
        visible={heatmapVisible}
        onClose={() => setHeatmapVisible(false)}
        onDayPress={(date) => { setSelectedDate(date); setHeatmapVisible(false); }}
      />

      {/* 월달력 모달 */}
      <MonthCalendarModal
        visible={calendarVisible}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onClose={() => setCalendarVisible(false)}
      />

      {/* 일정 생성/수정 모달 */}
      {modalState && (
        <ScheduleFormModal
          visible
          startMinutes={modalState.mode === 'create' ? modalState.startMinutes : undefined}
          endMinutes={modalState.mode === 'create' ? modalState.endMinutes : undefined}
          editingSchedule={
            modalState.mode === 'edit'
              ? modalState.editScope === 'this'
                ? { ...modalState.schedule, repeat: 'none' }
                : modalState.schedule
              : undefined
          }
          colorCategories={colorCategories}
          onConfirm={handleConfirm}
          onDelete={modalState.mode === 'edit' ? handleDelete : undefined}
          onCancel={() => setModalState(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navButton: { padding: 8, width: 44, alignItems: 'center' },
  navArrow: { fontSize: 26, lineHeight: 28 },
  dateCenter: { flex: 1, alignItems: 'center' },
  dateMain: { fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  dateSub: { fontSize: 14, fontWeight: '400' },
  menuButton: { padding: 8, width: 44, alignItems: 'center' },
  menuDots: { fontSize: 13, letterSpacing: 1, fontWeight: '700' },
  summaryBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    minWidth: 60,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8F5E9',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  summaryMessage: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  todayButton: { paddingVertical: 4, paddingHorizontal: 8 },
  todayText: { fontSize: 14, fontWeight: '500' },
  clockText: { fontSize: 14, letterSpacing: 0.5 },
  calButton: { paddingVertical: 4, paddingHorizontal: 8 },
});
