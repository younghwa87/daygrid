import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BreathingAnimation from './animations/BreathingAnimation';
import { FreeBlock } from '../types';

interface Props {
  freeBlock: FreeBlock;
  rowHeight: number;       // 시간당 픽셀 높이
  gridStartMin: number;    // 그리드 시작 시각(분)
  onPressAdd: (startMin: number, endMin: number) => void;
}

export default function EmptyBlock({ freeBlock, rowHeight, gridStartMin, onPressAdd }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const top = ((freeBlock.startMin - gridStartMin) / 60) * rowHeight;
  const height = freeBlock.durationHours * rowHeight;
  const showAddBtn = height >= 36; // 충분한 높이일 때만 + 버튼 표시

  const outerStyle = [s.block, { top, height }];

  // + 버튼
  const addBtn = showAddBtn ? (
    <TouchableOpacity
      style={s.addBtn}
      onPress={() => onPressAdd(freeBlock.startMin, freeBlock.endMin)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[s.addBtnText, isDark && s.addBtnTextDark]}>＋</Text>
    </TouchableOpacity>
  ) : null;

  // ── micro ─────────────────────────────────────────
  if (freeBlock.quality === 'micro') {
    return (
      <View
        style={[outerStyle, s.micro, isDark && s.microDark]}
        pointerEvents="box-none"
      >
        {addBtn}
      </View>
    );
  }

  // ── short ─────────────────────────────────────────
  if (freeBlock.quality === 'short') {
    return (
      <View style={outerStyle} pointerEvents="box-none">
        <BreathingAnimation
          type="short"
          style={[StyleSheet.absoluteFillObject, s.short, isDark && s.shortDark]}
        />
        <View style={s.contentRow}>
          {freeBlock.label ? (
            <Text style={[s.shortLabel, isDark && s.shortLabelDark]}>{freeBlock.label}</Text>
          ) : null}
          {addBtn}
        </View>
      </View>
    );
  }

  // ── medium ─────────────────────────────────────────
  if (freeBlock.quality === 'medium') {
    const gradColors = isDark
      ? (['#0D2018', '#0D1B2A'] as const)
      : (['#F0FDF9', '#EFF6FF'] as const);
    return (
      <View style={outerStyle} pointerEvents="box-none">
        <BreathingAnimation type="medium" style={StyleSheet.absoluteFillObject}>
          <LinearGradient colors={gradColors} style={StyleSheet.absoluteFillObject} />
        </BreathingAnimation>
        <View style={s.contentCol}>
          {freeBlock.label ? (
            <Text style={[s.mediumLabel, isDark && s.mediumLabelDark]}>{freeBlock.label}</Text>
          ) : null}
          <Text style={[s.mediumSub, isDark && s.mediumSubDark]}>집중하기 좋은 시간이에요</Text>
        </View>
        {addBtn}
      </View>
    );
  }

  // ── long ──────────────────────────────────────────
  const gradColors = isDark
    ? (['#0D2018', '#0D1B2A', '#1A0D2E'] as const)
    : (['#ECFDF5', '#EFF6FF', '#F5F3FF'] as const);
  return (
    <View style={outerStyle} pointerEvents="box-none">
      <BreathingAnimation type="long" style={StyleSheet.absoluteFillObject}>
        <LinearGradient colors={gradColors} style={StyleSheet.absoluteFillObject} />
      </BreathingAnimation>
      <View style={s.contentCol}>
        {freeBlock.label ? (
          <Text style={[s.longLabel, isDark && s.longLabelDark]}>{freeBlock.label}</Text>
        ) : null}
        <Text style={[s.longSub, isDark && s.longSubDark]}>오늘의 선물 같은 시간</Text>
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

  // micro
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

  // short 배경 (BreathingAnimation으로 opacity 애니메이션)
  short: {
    backgroundColor: '#F0FDF9',
    borderWidth: 0.5,
    borderColor: '#D1FAE5',
  },
  shortDark: {
    backgroundColor: '#0D2018',
    borderColor: '#1A3A28',
  },

  // 라벨 레이아웃
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

  // short 텍스트
  shortLabel: {
    fontSize: 12,
    color: '#6EE7B7',
    fontWeight: '500',
  },
  shortLabelDark: {
    color: '#34D399',
  },

  // medium 텍스트
  mediumLabel: {
    fontSize: 13,
    color: '#34D399',
    fontWeight: '600',
    marginBottom: 2,
  },
  mediumLabelDark: {
    color: '#6EE7B7',
  },
  mediumSub: {
    fontSize: 11,
    color: '#A7F3D0',
  },
  mediumSubDark: {
    color: '#6EE7B7',
    opacity: 0.7,
  },

  // long 텍스트
  longLabel: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '700',
    marginBottom: 2,
  },
  longLabelDark: {
    color: '#34D399',
  },
  longSub: {
    fontSize: 12,
    color: '#6EE7B7',
  },
  longSubDark: {
    color: '#A7F3D0',
  },

  // + 버튼
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
  addBtnText: {
    fontSize: 14,
    color: '#34D399',
    lineHeight: 18,
    fontWeight: '600',
  },
  addBtnTextDark: {
    color: '#6EE7B7',
  },
});
