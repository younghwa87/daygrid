import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Schedule } from '../types';
import { CELL_HEIGHT, CELL_MINUTES, GRID_START_MINUTES } from '../constants';
import { minutesToTimeString } from '../utils/timeUtils';

type Props = {
  schedule: Schedule;
  cellHeight?: number;
  gridStart?: number;
  onPress?: (schedule: Schedule) => void;
};

export default function ScheduleBlock({
  schedule,
  cellHeight = CELL_HEIGHT,
  gridStart = GRID_START_MINUTES,
  onPress,
}: Props) {
  const topOffset =
    ((schedule.startTime - gridStart) / CELL_MINUTES) * cellHeight;
  const blockHeight =
    ((schedule.endTime - schedule.startTime) / CELL_MINUTES) * cellHeight;

  // 30분 미만이면 타이틀만, 이상이면 시간 표시
  const showTime = blockHeight >= cellHeight * 3;

  return (
    <Pressable
      style={[
        styles.block,
        {
          top: topOffset,
          height: blockHeight,
          backgroundColor: schedule.colorCategory.color + 'CC',
          borderLeftColor: schedule.colorCategory.color,
        },
      ]}
      onPress={() => onPress?.(schedule)}
    >
      <Text style={styles.title} numberOfLines={1}>
        {schedule.title}
      </Text>
      {showTime && (
        <Text style={styles.time}>
          {minutesToTimeString(schedule.startTime)} –{' '}
          {minutesToTimeString(schedule.endTime)}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderLeftWidth: 3,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  time: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.85,
    marginTop: 1,
  },
});
