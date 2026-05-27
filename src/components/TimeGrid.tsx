import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
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
  onStartCreating: (startMinutes: number, endMinutes: number) => void;
  onEditSchedule: (schedule: Schedule) => void;
};

type GhostBlock = { startMins: number; endMins: number } | null;

export default function TimeGrid({ schedules, selectedDate, onStartCreating, onEditSchedule }: Props) {
  const { colors, isDark } = useAppColors();
  const { rowHeight, timeFormat, gridStartHour, gridEndHour, fontSize, textPosition } = useSettingsStore();

  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [colWidth, setColWidth] = useState(0);
  const [ghost, setGhost] = useState<GhostBlock>(null);
  const [currentMins, setCurrentMins] = useState(() => dayjs().hour() * 60 + dayjs().minute());

  const scrollViewRef = useRef<ScrollView>(null);
  const isCreatingRef = useRef(false);
  const ghostStartRef = useRef(0);
  const ghostEndRef = useRef(0);
  const colWidthRef = useRef(0);
  const hitScheduleRef = useRef<Schedule | undefined>(undefined);

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

  const gesture = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(400)
    .onBegin((e) => {
      hitScheduleRef.current = findScheduleAt(e.x, e.y);
    })
    .onStart((e) => {
      if (hitScheduleRef.current) {
        onEditSchedule(hitScheduleRef.current);
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
      if (!isCreatingRef.current || colWidthRef.current === 0) return;
      const curMins = posToMins(e.x, e.y) + 10;
      const endMins = Math.max(ghostStartRef.current + 10, curMins);
      ghostEndRef.current = endMins;
      setGhost({ startMins: ghostStartRef.current, endMins });
    })
    .onEnd(() => {
      if (isCreatingRef.current) onStartCreating(ghostStartRef.current, ghostEndRef.current);
      isCreatingRef.current = false;
      setGhost(null);
      setScrollEnabled(true);
    })
    .onFinalize(() => {
      isCreatingRef.current = false;
      setGhost(null);
      setScrollEnabled(true);
    });

  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');
  const nowLineY =
    isToday && currentMins >= gridStartHour * 60 && currentMins < gridEndHour * 60
      ? ((currentMins - gridStartHour * 60) / 60) * rowHeight
      : null;

  function renderSegments(
    startMins: number,
    endMins: number,
    color: string,
    title: string,
    keyPrefix: string,
    alpha: string = 'CC'
  ) {
    const cw = colWidthRef.current;
    if (cw === 0) return null;
    return getEventSegments(startMins, endMins, gridStartHour, gridEndHour).map((seg, i) => (
      <View
        key={`${keyPrefix}-${i}`}
        style={[
          styles.eventSegment,
          {
            top: seg.rowIndex * rowHeight,
            left: seg.startCol * cw,
            width: (seg.endCol - seg.startCol) * cw,
            height: rowHeight,
            backgroundColor: color + alpha,
            borderLeftWidth: i === 0 ? 3 : 0,
            borderLeftColor: color,
          },
        ]}
      >
        {i === 0 && title.length > 0 && (
          <Text style={[styles.eventTitle, { fontSize, textAlign: textPosition }]} numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>
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
                  <Text style={[styles.label12h, { color: labelColor }]}>
                    {displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour}
                    <Text style={[styles.ampm, { color: labelColor }]}> {displayHour < 12 ? 'AM' : 'PM'}</Text>
                    {isNextDay ? <Text style={styles.nextDay}>+1</Text> : null}
                  </Text>
                ) : (
                  <Text style={[styles.label24h, { color: labelColor }]}>
                    {String(displayHour).padStart(2, '0')}:00{isNextDay ? <Text style={styles.nextDay}>+1</Text> : null}
                  </Text>
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
                key={block.id}
                freeBlock={block}
                rowHeight={rowHeight}
                gridStartMin={gridStartHour * 60}
                onPressAdd={(startMin, endMin) => onStartCreating(startMin, endMin)}
              />
            ))}

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
              const isSleep = s.scheduleType === 'sleep';
              const color = isSleep ? '#6366F1' : s.colorCategory.color;
              const alpha = isSleep ? '55' : s.isOverflow ? '77' : 'CC';
              const title = isSleep ? `🌙 ${s.title}` : s.title;
              return renderSegments(s.startTime, s.endTime, color, title, s.id, alpha);
            })}

            {/* 생성 중 고스트 */}
            {ghost && renderSegments(ghost.startMins, ghost.endMins, '#4A90D9', '', 'ghost')}

            {/* 현재 시각 라인 */}
            {nowLineY !== null && (
              <View style={[styles.nowLine, { top: nowLineY }]}>
                <View style={styles.nowDot} />
                <View style={styles.nowLineBar} />
              </View>
            )}
          </View>
        </GestureDetector>
      </View>
    </ScrollView>
  );
}

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
  nowLine: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  nowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E05555', marginLeft: -4 },
  nowLineBar: { flex: 1, height: 1.5, backgroundColor: '#E05555' },
});
