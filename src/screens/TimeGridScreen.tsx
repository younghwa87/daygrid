import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Alert, Linking } from 'react-native';
import { AppText } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useScheduleStore } from '../store/scheduleStore';
import ScheduleFormModal from '../components/ScheduleFormModal';
import StyleSettingsScreen from './StyleSettingsScreen';
import WeeklyHeatmapScreen from './WeeklyHeatmapScreen';
import MonthCalendarModal from '../components/MonthCalendarModal';
import WeekStrip from '../components/WeekStrip';
import BottomTabBar, { TabName } from '../components/BottomTabBar';
import DayScheduleView from '../components/DayScheduleView';
import { notificationService } from '../services/NotificationService';
import { useNotificationHandler } from '../hooks/useNotificationHandler';
import { useAppColors } from '../hooks/useAppColors';
import { Schedule, ColorCategory, RepeatType, ScheduleType } from '../types';
import uuid from '../utils/uuid';

dayjs.locale('ko');

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

type ModalState =
  | { mode: 'create'; startMinutes: number; endMinutes: number }
  | { mode: 'edit'; schedule: Schedule; editScope: 'this' | 'all' }
  | null;

export default function TimeGridScreen() {
  const { colors, isDark } = useAppColors();
  const insets = useSafeAreaInsets();

  const {
    schedules: allSchedules,
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
  const [modalState, setModalState] = useState<ModalState>(null);
  const [activeTab, setActiveTab] = useState<TabName>('home');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);

  useNotificationHandler();

  // 위젯 딥링크 처리
  useEffect(() => {
    const openFromUrl = (url: string | null) => {
      if (!url) return;
      if (url === 'datile://add') {
        openAddModal();
      } else if (url.startsWith('datile://edit?id=')) {
        const id = url.replace('datile://edit?id=', '');
        const schedule = allSchedules.find((s) => s.id === id);
        if (!schedule) return;
        setSelectedDate(schedule.date);
        setModalState({ mode: 'edit', schedule, editScope: schedule.repeat === 'none' ? 'all' : 'this' });
      }
    };
    Linking.getInitialURL().then(openFromUrl);
    const sub = Linking.addEventListener('url', ({ url }) => openFromUrl(url));
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openAddModal = useCallback(() => {
    const now = dayjs();
    const startMins = Math.ceil((now.hour() * 60 + now.minute()) / 10) * 10;
    setModalState({ mode: 'create', startMinutes: startMins, endMinutes: startMins + 60 });
  }, []);

  const handleTabPress = useCallback((tab: TabName) => {
    if (tab === 'add') {
      openAddModal();
      return;
    }
    if (tab === 'calendar') {
      setCalendarVisible(true);
      return;
    }
    if (tab === 'weekly') {
      setHeatmapVisible(true);
      return;
    }
    if (tab === 'settings') {
      setSettingsVisible(true);
      return;
    }
    setActiveTab(tab);
  }, [openAddModal]);

  const handleEditSchedule = useCallback((schedule: Schedule) => {
    const original = schedule.isOverflow
      ? (allSchedules.find((s) => s.id === schedule.id) ?? schedule)
      : schedule;

    if (schedule.isOverflow) {
      setModalState({ mode: 'edit', schedule: original, editScope: 'all' });
      return;
    }
    if (original.repeat === 'none') {
      setModalState({ mode: 'edit', schedule: original, editScope: 'all' });
      return;
    }
    Alert.alert('반복 일정', '어떤 일정을 수정할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '이 날짜만', onPress: () => setModalState({ mode: 'edit', schedule: original, editScope: 'this' }) },
      { text: '모든 반복 일정', onPress: () => setModalState({ mode: 'edit', schedule: original, editScope: 'all' }) },
    ]);
  }, [allSchedules]);

  const handleConfirm = useCallback(
    (data: { title: string; colorCategory: ColorCategory; startTime: number; endTime: number; repeat: RepeatType; repeatDays: number[]; reminderOffsets: number[]; scheduleType: ScheduleType }) => {
      if (!modalState) return;
      const excludeId = modalState.mode === 'edit' ? modalState.schedule.id : undefined;
      const overlapCheckDate =
        modalState.mode === 'edit' && modalState.editScope === 'all'
          ? modalState.schedule.date
          : selectedDate;

      if (hasOverlap(data.startTime, data.endTime, overlapCheckDate, excludeId)) {
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
          repeatDays: data.repeatDays,
          reminderOffsets: data.reminderOffsets,
          scheduleType: data.scheduleType,
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
          repeatDays: [],
          reminderOffsets: data.reminderOffsets,
          scheduleType: data.scheduleType,
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
          repeatDays: data.repeatDays,
          reminderOffsets: data.reminderOffsets,
          hasNotification: data.reminderOffsets.length > 0,
          scheduleType: data.scheduleType,
        };
        updateSchedule(modalState.schedule.id, updates);
        notificationService.cancelAllAlarmsForSchedule(modalState.schedule.id).then(() => {
          notificationService.scheduleAlarmsForSchedule({ ...modalState.schedule, ...updates });
        });
      }
      setModalState(null);
    },
    [modalState, hasOverlap, selectedDate, addSchedule, updateSchedule, addScheduleException]
  );

  const handleDelete = useCallback(() => {
    if (modalState?.mode !== 'edit') return;
    const { schedule, editScope } = modalState;
    if (schedule.repeat !== 'none' && editScope !== 'this') {
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

  const selectedDateRef = useRef(selectedDate);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);

  // 좌우 스와이프로 날짜 이동
  const swipeGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-40, 40])
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      if (e.translationX < -60)
        setSelectedDate(dayjs(selectedDateRef.current).add(1, 'day').format('YYYY-MM-DD'));
      else if (e.translationX > 60)
        setSelectedDate(dayjs(selectedDateRef.current).subtract(1, 'day').format('YYYY-MM-DD'));
    });

  const d = dayjs(selectedDate);
  const monthLabel = d.format('YYYY년 M월');
  const dayLabel = DAY_KO[d.day()] + '요일';
  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>

      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <AppText style={[styles.monthLabel, { color: colors.textSecondary }]}>{monthLabel}</AppText>
          <AppText style={[styles.dayLabel, { color: colors.text }]}>
            {dayLabel}
            {isToday && <AppText style={[styles.todayBadge, { color: '#4A90D9' }]}> · 오늘</AppText>}
          </AppText>
        </View>
      </View>

      {/* 주간 날짜 스트립 */}
      <WeekStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {/* 일정 블록 뷰 */}
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.content}>
          <DayScheduleView
            schedules={schedules}
            onPressSchedule={handleEditSchedule}
            onLongPress={openAddModal}
          />
        </View>
      </GestureDetector>

      {/* 하단 탭바 */}
      <View style={{ paddingBottom: insets.bottom }}>
        <BottomTabBar activeTab={activeTab} onPress={handleTabPress} />
      </View>

      {/* 월간 캘린더 */}
      <MonthCalendarModal
        visible={calendarVisible}
        selectedDate={selectedDate}
        onSelectDate={(date) => { setSelectedDate(date); setCalendarVisible(false); }}
        onClose={() => setCalendarVisible(false)}
      />

      {/* 설정 화면 (오른쪽에서 슬라이드) */}
      <StyleSettingsScreen visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      {/* 주간 히트맵 (오른쪽에서 슬라이드) */}
      <WeeklyHeatmapScreen
        visible={heatmapVisible}
        onClose={() => setHeatmapVisible(false)}
        onDayPress={(date) => { setSelectedDate(date); setHeatmapVisible(false); }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  monthLabel: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  dayLabel: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  todayBadge: { fontSize: 18, fontWeight: '500' },
  content: { flex: 1 },
});
