import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { COLORS } from '../constants';

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
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? COLORS.dark : COLORS.light;

  const enabled = selectedOffsets.length > 0;
  const [open, setOpen] = useState(false);

  const selectedValue = enabled ? selectedOffsets[0] : null;
  const selectedLabel = OPTIONS.find(o => o.value === selectedValue)?.label ?? '정시';

  const handleEnable = (val: boolean) => {
    if (val) {
      onChange([0]);
    } else {
      onChange([]);
      setOpen(false);
    }
  };

  return (
    <View style={[s.container, { borderColor: colors.border }]}>
      <View style={s.headerRow}>
        <Text style={[s.label, { color: colors.text }]}>알림</Text>
        <Switch
          value={enabled}
          onValueChange={handleEnable}
          trackColor={{ false: colors.border, true: '#4A90D9' }}
          thumbColor="#fff"
        />
      </View>

      {enabled && (
        <>
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={s.selector}
            onPress={() => setOpen(v => !v)}
            activeOpacity={0.7}
          >
            <Text style={[s.selectorText, { color: colors.text }]}>{selectedLabel}</Text>
            <Text style={[s.arrow, { color: colors.textSecondary }]}>
              {open ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {open && (
            <View style={[s.dropdown, { borderTopColor: colors.border }]}>
              {OPTIONS.map((opt, i) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    s.option,
                    i < OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                    selectedValue === opt.value && s.optionSelected,
                  ]}
                  onPress={() => {
                    onChange([opt.value]);
                    setOpen(false);
                  }}
                >
                  <Text style={[s.optionText, { color: selectedValue === opt.value ? '#4A90D9' : colors.text }]}>
                    {opt.label}
                  </Text>
                  {selectedValue === opt.value && <Text style={s.check}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
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
  divider: { height: StyleSheet.hairlineWidth },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectorText: { fontSize: 14 },
  arrow: { fontSize: 12 },
  dropdown: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionSelected: { backgroundColor: '#EEF2FF' },
  optionText: { fontSize: 14 },
  check: { fontSize: 14, color: '#4A90D9', fontWeight: '700' },
});
