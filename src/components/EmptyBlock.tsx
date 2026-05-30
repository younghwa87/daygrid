import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { AppText } from './AppText';
import { LinearGradient } from 'expo-linear-gradient';
import BreathingAnimation from './animations/BreathingAnimation';
import { useAppColors } from '../hooks/useAppColors';
import { FreeBlock } from '../types';

interface Props {
  freeBlock: FreeBlock;
  rowHeight: number;
  gridStartMin: number;
  onPressAdd: (startMin: number, endMin: number) => void;
}

export default function EmptyBlock({ freeBlock, rowHeight, gridStartMin, onPressAdd }: Props) {
  const { isDark } = useAppColors();

  // 상단: floor 스냅, 하단: ceil 스냅 → 인접 스케줄 tail 구간 흰색 공백 제거
  const snappedTop = Math.floor((freeBlock.startMin - gridStartMin) / 60) * rowHeight;
  const snappedBottom = Math.ceil((freeBlock.endMin - gridStartMin) / 60) * rowHeight;
  const top = snappedTop;
  const height = snappedBottom - snappedTop;
  const showAddBtn = height >= 36;
  // 라벨·내용은 실제 여백 시작 위치(스냅 전 top)에서 표시
  const contentOffset = ((freeBlock.startMin - gridStartMin) / 60) * rowHeight - snappedTop;

  const outerStyle = [s.block, { top, height }];

  const addBtn = showAddBtn ? (
    <TouchableOpacity
      style={s.addBtn}
      onPress={() => onPressAdd(freeBlock.startMin, freeBlock.endMin)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <AppText style={[s.addBtnText, isDark && s.addBtnTextDark]}>＋</AppText>
    </TouchableOpacity>
  ) : null;

  if (freeBlock.quality === 'micro') {
    // 점선 테두리 제거 — 스냅 후 row 전체를 채울 때 점선이 격자선처럼 보이는 문제 방지
    return (
      <View style={outerStyle} pointerEvents="box-none">
        {addBtn}
      </View>
    );
  }

  if (freeBlock.quality === 'short') {
    return (
      <View style={outerStyle} pointerEvents="box-none">
        <BreathingAnimation
          type="short"
          style={[StyleSheet.absoluteFillObject, s.short, isDark && s.shortDark]}
        />
        <View style={[s.contentRow, { paddingTop: contentOffset }]}>
          {freeBlock.label ? (
            <AppText style={[s.shortLabel, isDark && s.shortLabelDark]}>{freeBlock.label}</AppText>
          ) : null}
          {addBtn}
        </View>
      </View>
    );
  }

  if (freeBlock.quality === 'medium') {
    const gradColors = isDark
      ? (['#0D2018', '#0D1B2A'] as const)
      : (['#F0FDF9', '#EFF6FF'] as const);
    return (
      <View style={outerStyle} pointerEvents="box-none">
        <BreathingAnimation type="medium" style={StyleSheet.absoluteFillObject}>
          <LinearGradient colors={gradColors} style={StyleSheet.absoluteFillObject} />
        </BreathingAnimation>
        <View style={[s.contentCol, { paddingTop: contentOffset }]}>
          {freeBlock.label ? (
            <AppText style={[s.mediumLabel, isDark && s.mediumLabelDark]}>{freeBlock.label}</AppText>
          ) : null}
          <AppText style={[s.mediumSub, isDark && s.mediumSubDark]}>집중하기 좋은 시간이에요</AppText>
        </View>
        {addBtn}
      </View>
    );
  }

  const gradColors = isDark
    ? (['#0D2018', '#0D1B2A', '#1A0D2E'] as const)
    : (['#ECFDF5', '#EFF6FF', '#F5F3FF'] as const);
  return (
    <View style={outerStyle} pointerEvents="box-none">
      <BreathingAnimation type="long" style={StyleSheet.absoluteFillObject}>
        <LinearGradient colors={gradColors} style={StyleSheet.absoluteFillObject} />
      </BreathingAnimation>
      <View style={[s.contentCol, { paddingTop: contentOffset }]}>
        {freeBlock.label ? (
          <AppText style={[s.longLabel, isDark && s.longLabelDark]}>{freeBlock.label}</AppText>
        ) : null}
        <AppText style={[s.longSub, isDark && s.longSubDark]}>오늘의 선물 같은 시간</AppText>
      </View>
      {addBtn}
    </View>
  );
}

const s = StyleSheet.create({
  block: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  micro: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E8E8E8',
  },
  microDark: {
    backgroundColor: '#1C1C1E',
    borderColor: '#3A3A3A',
  },
  short: {
    backgroundColor: '#F0FDF9',
    borderWidth: 0.5,
    borderColor: '#D1FAE5',
  },
  shortDark: {
    backgroundColor: '#0D2018',
    borderColor: '#1A3A28',
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  contentCol: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  shortLabel: { fontSize: 12, color: '#6EE7B7', fontWeight: '500' },
  shortLabelDark: { color: '#34D399' },
  mediumLabel: { fontSize: 13, color: '#34D399', fontWeight: '600', marginBottom: 2 },
  mediumLabelDark: { color: '#6EE7B7' },
  mediumSub: { fontSize: 11, color: '#A7F3D0' },
  mediumSubDark: { color: '#6EE7B7', opacity: 0.7 },
  longLabel: { fontSize: 14, color: '#10B981', fontWeight: '700', marginBottom: 2 },
  longLabelDark: { color: '#34D399' },
  longSub: { fontSize: 12, color: '#6EE7B7' },
  longSubDark: { color: '#A7F3D0' },
  addBtn: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(52,211,153,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 14, color: '#34D399', lineHeight: 18, fontWeight: '600' },
  addBtnTextDark: { color: '#6EE7B7' },
});
