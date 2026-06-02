import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';
import { TIME_LABEL_WIDTH } from '../constants';
import { getEventSegments } from '../utils/timeUtils';
import { calculateFreeBlocks } from '../utils/freeBlockCalculator';
import { useSettingsStore } from '../store/settingsStore';
import { useAppColors } from '../hooks/useAppColors';
import { Schedule } from '../types';
import EmptyBlock from './EmptyBlock';

const COLS = 6;

type Props = {
  schedules: Schedule[];
  selectedDate: string;
  scrollToHour?: number;
  onStartCreating: (startMinutes: number, endMinutes: number) => void;
  onEditSchedule: (schedule: Schedule) => void;
  onMoveSchedule: (scheduleId: string, newStartTime: number, newEndTime: number) => void;
  onResizeSchedule: (scheduleId: string, newEndTime: number) => void;
};

type GhostBlock = { startMins: number; endMins: number } | null;

type DragState = {
  scheduleId: string;
  duration: number;
  offsetMins: number;
  currentStartMins: number;
} | null;

type ResizeState = {
  scheduleId: string;
  startTime: number;
  currentEndMins: number;
} | null;

export default React.memo(function TimeGrid({ schedules, selectedDate, scrollToHour, onStartCreating, onEditSchedule, onMoveSchedule, onResizeSchedule }: Props) {
  const { colors, isDark } = useAppColors();
  const { rowHeight, timeFormat, gridStartHour, gridEndHour, fontSize, textPosition } = useSettingsStore();

  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [colWidth, setColWidth] = useState(0);
  const [ghost, setGhost] = useState<GhostBlock>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [resizeState, setResizeState] = useState<ResizeState>(null);
  const [currentMins, setCurrentMins] = useState(() => dayjs().hour() * 60 + dayjs().minute());

  const scrollViewRef = useRef<ScrollView>(null);
  const isCreatingRef = useRef(false);
  const ghostStartRef = useRef(0);
  const ghostEndRef = useRef(0);
  const colWidthRef = useRef(0);
  const hitScheduleRef = useRef<Schedule | undefined>(undefined);
  const resizeTargetRef = useRef<Schedule | undefined>(undefined);
  const dragStateRef = useRef<DragState>(null);
  const resizeStateRef = useRef<ResizeState>(null);

  const numRows = gridEndHour - gridStartHour;
  const totalHeight = numRows * rowHeight;

  useEffect(() => {
    const t = setInterval(() => setCurrentMins(dayjs().hour() * 60 + dayjs().minute()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const isToday = selectedDate === dayjs().format('YYYY-MM-DD');
    if (!isToday || rowHeight === 0) return;
    const row = Math.floor(currentMins / 60) - gridStartHour;
    const scrollTo = Math.max(0, row * rowHeight - 120);
    setTimeout(() => scrollViewRef.current?.scrollTo({ y: scrollTo, animated: true }), 300);
  }, [selectedDate, rowHeight, gridStartHour]);

  // 히트맵 셀 탭 시 해당 시간대로 스크롤
  useEffect(() => {
    if (scrollToHour === undefined || rowHeight === 0) return;
    const row = Math.max(0, scrollToHour - gridStartHour);
    const y = Math.max(0, row * rowHeight - 120);
    setTimeout(() => scrollViewRef.current?.scrollTo({ y, animated: true }), 300);
  }, [scrollToHour, rowHeight, gridStartHour]);

  function posToMins(x: number, y: number): number {
    const cw = colWidthRef.current;
    if (cw === 0) return gridStartHour * 60;
    const rowIndex = Math.max(0, Math.min(numRows - 1, Math.floor(y / rowHeight)));
    const col = Math.max(0, Math.min(COLS - 1, Math.floor(x / cw)));
    return (gridStartHour + rowIndex) * 60 + col * 10;
  }

  function findScheduleAt(x: number, y: number): Schedule | undefined {
    const mins = posToMins(x, y);
    return schedules.find((s) => s.startTime <= mins && mins < s.endTime);
  }

  // 일정 마지막 10분 영역 → 크기 조절 대상
  function findResizeTargetAt(x: number, y: number): Schedule | undefined {
    const mins = posToMins(x, y);
    return schedules.find((s) => !s.isOverflow && mins >= s.endTime - 10 && mins < s.endTime);
  }

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(300)
    .onEnd((e, success) => {
      if (!success) return;
      const hit = findScheduleAt(e.x, e.y);
      if (hit) onEditSchedule(hit);
    });

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(400)
    .onBegin((e) => {
      resizeTargetRef.current = findResizeTargetAt(e.x, e.y);
      hitScheduleRef.current = resizeTargetRef.current ? undefined : findScheduleAt(e.x, e.y);
    })
    .onStart((e) => {
      const resizeTarget = resizeTargetRef.current;
      if (resizeTarget) {
        const newResizeState: ResizeState = { scheduleId: resizeTarget.id, startTime: resizeTarget.startTime, currentEndMins: resizeTarget.endTime };
        resizeStateRef.current = newResizeState;
        setResizeState(newResizeState);
        setScrollEnabled(false);
        return;
      }
      const hit = hitScheduleRef.current;
      if (hit && !hit.isOverflow) {
        const duration = hit.endTime - hit.startTime;
        const offsetMins = posToMins(e.x, e.y) - hit.startTime;
        const newDragState: DragState = { scheduleId: hit.id, duration, offsetMins, currentStartMins: hit.startTime };
        dragStateRef.current = newDragState;
        setDragState(newDragState);
        setScrollEnabled(false);
        return;
      }
      if (colWidthRef.current === 0) return;
      const startMins = posToMins(e.x, e.y);
      ghostStartRef.current = startMins;
      ghostEndRef.current = startMins + 10;
      isCreatingRef.current = true;
      setGhost({ startMins, endMins: startMins + 10 });
      setScrollEnabled(false);
    })
    .onUpdate((e) => {
      if (resizeStateRef.current) {
        const newEnd = posToMins(e.x, e.y) + 10;
        const minEnd = resizeStateRef.current.startTime + 10;
        const currentEndMins = Math.max(minEnd, Math.min(newEnd, gridEndHour * 60));
        const updated = { ...resizeStateRef.current, currentEndMins };
        resizeStateRef.current = updated;
        setResizeState(updated);
        return;
      }
      if (dragStateRef.current) {
        const rawStart = posToMins(e.x, e.y) - dragStateRef.current.offsetMins;
        const snapped = Math.round(rawStart / 10) * 10;
        const maxStart = gridEndHour * 60 - dragStateRef.current.duration;
        const newStartMins = Math.max(gridStartHour * 60, Math.min(snapped, maxStart));
        const updated = { ...dragStateRef.current, currentStartMins: newStartMins };
        dragStateRef.current = updated;
        setDragState(updated);
        return;
      }
      if (!isCreatingRef.current || colWidthRef.current === 0) return;
      const curMins = posToMins(e.x, e.y) + 10;
      const endMins = Math.max(ghostStartRef.current + 10, curMins);
      ghostEndRef.current = endMins;
      setGhost({ startMins: ghostStartRef.current, endMins });
    })
    .onEnd(() => {
      if (resizeStateRef.current) {
        onResizeSchedule(resizeStateRef.current.scheduleId, resizeStateRef.current.currentEndMins);
        resizeStateRef.current = null;
        setResizeState(null);
        setScrollEnabled(true);
        return;
      }
      if (dragStateRef.current) {
        const { scheduleId, duration, currentStartMins } = dragStateRef.current;
        onMoveSchedule(scheduleId, currentStartMins, currentStartMins + duration);
        dragStateRef.current = null;
        setDragState(null);
        setScrollEnabled(true);
        return;
      }
      if (isCreatingRef.current) onStartCreating(ghostStartRef.current, ghostEndRef.current);
      isCreatingRef.current = false;
      setGhost(null);
      setScrollEnabled(true);
    })
    .onFinalize(() => {
      resizeStateRef.current = null;
      setResizeState(null);
      dragStateRef.current = null;
      setDragState(null);
      isCreatingRef.current = false;
      setGhost(null);
      setScrollEnabled(true);
    });

  const gesture = Gesture.Race(tapGesture, panGesture);

  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');

  function renderSegments(
    startMins: number,
    endMins: number,
    color: string,
    title: string,
    keyPrefix: string,
    alpha: string = 'CC',
    showResizeHandle: boolean = false
  ) {
    const cw = colWidthRef.current;
    if (cw === 0) return null;
    const segs = getEventSegments(startMins, endMins, gridStartHour, gridEndHour);
    return segs.map((seg, i) => (
      <LinearGradient
        key={`${keyPrefix}-${i}`}
        colors={[color + alpha, color + Math.round(parseInt(alpha, 16) * 0.6).toString(16).padStart(2, '0')]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.eventSegment,
          {
            top: seg.rowIndex * rowHeight,
            left: seg.startCol * cw,
            width: (seg.endCol - seg.startCol) * cw,
            height: rowHeight,
            borderLeftWidth: i === 0 ? 3 : 0,
            borderLeftColor: color,
          },
        ]}
      >
        {i === 0 && title.length > 0 && (
          <AppText style={[styles.eventTitle, { fontSize, textAlign: textPosition }]} numberOfLines={1}>
            {title}
          </AppText>
        )}
        {showResizeHandle && i === segs.length - 1 && (
          <View style={styles.resizeHandle} />
        )}
      </LinearGradient>
    ));
  }

  const hourRows = useMemo(
    () => Array.from({ length: numRows }, (_, i) => gridStartHour + i),
    [numRows, gridStartHour]
  );

  const freeBlocks = useMemo(
    () => calculateFreeBlocks(schedules, gridStartHour, gridEndHour),
    [schedules, gridStartHour, gridEndHour]
  );

  const hatchCell = useMemo(() => {
    if (!isToday || colWidth === 0) return null;
    const rowIndex = Math.floor(currentMins / 60) - gridStartHour;
    if (rowIndex < 0 || rowIndex >= numRows) return null;
    const col = Math.floor((currentMins % 60) / 10);
    return { top: rowIndex * rowHeight, left: col * colWidth };
  }, [isToday, currentMins, gridStartHour, numRows, rowHeight, colWidth]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      scrollEnabled={scrollEnabled}
    >
      <View style={[styles.row, { height: totalHeight }]}>

        {/* 시간 레이블 (좌측) */}
        <View style={[styles.labelColumn, { width: TIME_LABEL_WIDTH }]}>
          {hourRows.map((hour) => {
            const displayHour = hour >= 24 ? hour - 24 : hour;
            const isNextDay = hour >= 24;
            const isNowHour = isToday && hour === Math.floor(currentMins / 60);
            const labelColor = isNowHour ? '#E05555' : colors.textSecondary;
            return (
              <View key={hour} style={[styles.labelCell, { height: rowHeight, borderTopColor: colors.hourLine }]}>
                {timeFormat === '12h' ? (
                  <AppText style={[styles.label12h, { color: labelColor }]}>
                    {displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour}
                    <AppText style={[styles.ampm, { color: labelColor }]}> {displayHour < 12 ? 'AM' : 'PM'}</AppText>
                    {isNextDay ? <AppText style={styles.nextDay}>+1</AppText> : null}
                  </AppText>
                ) : (
                  <AppText style={[styles.label24h, { color: labelColor }]}>
                    {String(displayHour).padStart(2, '0')}:00{isNextDay ? <AppText style={styles.nextDay}>+1</AppText> : null}
                  </AppText>
                )}
              </View>
            );
          })}
        </View>

        {/* 그리드 + 이벤트 (우측) */}
        <GestureDetector gesture={gesture}>
          <View
            style={styles.cellArea}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width / COLS;
              colWidthRef.current = w;
              setColWidth(w);
            }}
          >
            {/* 배경 격자 */}
            {hourRows.map((hour) => (
              <View key={hour} style={[styles.hourRow, { height: rowHeight, borderTopColor: colors.hourLine }]}>
                {Array.from({ length: COLS }).map((_, col) => (
                  <View
                    key={col}
                    style={[
                      styles.cell,
                      col > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.halfHourLine },
                    ]}
                  />
                ))}
              </View>
            ))}

            {/* 여백 블록 */}
            {colWidth > 0 && freeBlocks.map((block) => (
              <EmptyBlock
                key={`${block.id}-${rowHeight}`}
                freeBlock={block}
                rowHeight={rowHeight}
                gridStartMin={gridStartHour * 60}
              />
            ))}

            {/* 격자선 오버레이 (EmptyBlock 위에 재렌더) */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              {hourRows.map((hour) => (
                <View
                  key={`ov-h-${hour}`}
                  style={{
                    position: 'absolute',
                    top: (hour - gridStartHour) * rowHeight,
                    left: 0,
                    right: 0,
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: colors.hourLine,
                  }}
                />
              ))}
              {colWidth > 0 && Array.from({ length: COLS - 1 }, (_, i) => (
                <View
                  key={`ov-v-${i}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: (i + 1) * colWidth,
                    width: StyleSheet.hairlineWidth,
                    backgroundColor: colors.halfHourLine,
                  }}
                />
              ))}
            </View>

            {/* 현재 시간 칸 빗금 */}
            {hatchCell && (() => {
              const stripeCount = Math.ceil((rowHeight + colWidth) / 8) + 4;
              const hatchColor = isDark ? '#fff' : '#000';
              return (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: hatchCell.top,
                    left: hatchCell.left,
                    width: colWidth,
                    height: rowHeight,
                    overflow: 'hidden',
                  }}
                >
                  {Array.from({ length: stripeCount }).map((_, i) => (
                    <View
                      key={i}
                      style={{
                        position: 'absolute',
                        left: -colWidth,
                        top: (i - 2) * 8,
                        width: colWidth * 3,
                        height: 1.5,
                        backgroundColor: hatchColor,
                        opacity: 0.18,
                        transform: [{ rotate: '-45deg' }],
                      }}
                    />
                  ))}
                </View>
              );
            })()}

            {/* 일정 블록 */}
            {schedules.map((s) => {
              const isDragging = dragState?.scheduleId === s.id;
              const isResizing = resizeState?.scheduleId === s.id;
              const isSleep = s.scheduleType === 'sleep';
              const color = isSleep ? '#6366F1' : s.colorCategory.color;
              const alpha = isDragging ? '33' : (isSleep ? '55' : s.isOverflow ? '77' : 'CC');
              const title = isSleep ? `🌙 ${s.title}` : s.title;
              const endTime = isResizing ? (resizeState?.currentEndMins ?? s.endTime) : s.endTime;
              const showHandle = !s.isOverflow && !isDragging;
              return renderSegments(s.startTime, endTime, color, title, s.id, alpha, showHandle);
            })}

            {/* 드래그 이동 고스트 */}
            {dragState && (() => {
              const dragging = schedules.find(s => s.id === dragState.scheduleId);
              if (!dragging) return null;
              const isSleep = dragging.scheduleType === 'sleep';
              const color = isSleep ? '#6366F1' : dragging.colorCategory.color;
              const title = isSleep ? `🌙 ${dragging.title}` : dragging.title;
              return renderSegments(dragState.currentStartMins, dragState.currentStartMins + dragState.duration, color, title, 'drag-ghost');
            })()}

            {/* 생성 중 고스트 */}
            {ghost && renderSegments(ghost.startMins, ghost.endMins, '#4A90D9', '', 'ghost')}

          </View>
        </GestureDetector>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { flexDirection: 'row' },
  labelColumn: { flexDirection: 'column' },
  labelCell: { justifyContent: 'flex-start', paddingTop: 4, paddingHorizontal: 6, borderTopWidth: StyleSheet.hairlineWidth },
  label24h: { fontSize: 10 },
  label12h: { fontSize: 11, fontWeight: '500' },
  ampm: { fontSize: 8, fontWeight: '400' },
  nextDay: { fontSize: 7, opacity: 0.6 },
  cellArea: { flex: 1, position: 'relative' },
  hourRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  cell: { flex: 1 },
  eventSegment: { position: 'absolute', paddingHorizontal: 4, paddingVertical: 2, overflow: 'hidden' },
  eventTitle: { fontWeight: '600', color: '#fff' },
resizeHandle: { position: 'absolute', right: 3, bottom: 3, width: 14, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.55)' },
});
