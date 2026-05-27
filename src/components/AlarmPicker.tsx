import React from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useAppColors } from '../hooks/useAppColors';

type Props = {
  selectedOffsets: number[];
  onChange: (offsets: number[]) => void;
};

const OPTIONS = [
  { label: '정시',     value: 0 },
  { label: '5분 전',   value: -5 },
  { label: '10분 전',  value: -10 },
  { label: '30분 전',  value: -30 },
  { label: '1시간 전', value: -60 },
];

export default function AlarmPicker({ selectedOffsets, onChange }: Props) {
  const { colors } = useAppColors();

  const enabled = selectedOffsets.length > 0;

  const handleMasterToggle = (val: boolean) => {
    onChange(val ? [-5] : []);
  };

  const handleToggleOption = (value: number) => {
    const next = selectedOffsets.includes(value)
      ? selectedOffsets.filter((v) => v !== value)
      : [...selectedOffsets, value];
    // 알림이 하나도 없으면 비활성화
    onChange(next);
  };

  return (
    <View style={[s.container, { borderColor: colors.border }]}>
      {/* 마스터 토글 */}
      <View style={s.headerRow}>
        <Text style={[s.label, { color: colors.text }]}>알림</Text>
        <Switch
          value={enabled}
          onValueChange={handleMasterToggle}
          trackColor={{ false: colors.border, true: '#4A90D9' }}
          thumbColor="#fff"
        />
      </View>

      {/* 옵션 목록 (복수 선택) */}
      {enabled && (
        <View style={[s.optionList, { borderTopColor: colors.border }]}>
          {OPTIONS.map((opt, i) => {
            const selected = selectedOffsets.includes(opt.value);
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  s.option,
                  i < OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  selected && { backgroundColor: '#4A90D911' },
                ]}
                onPress={() => handleToggleOption(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[s.optionText, { color: selected ? '#4A90D9' : colors.text }]}>
                  {opt.label}
                </Text>
                {selected && <Text style={s.check}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  label: { fontSize: 14, fontWeight: '600' },
  optionList: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionText: { fontSize: 14 },
  check: { fontSize: 14, color: '#4A90D9', fontWeight: '700' },
});
