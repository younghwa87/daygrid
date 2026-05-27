import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Schedule, ColorCategory, RepeatType, ScheduleType } from '../types';
import { useAppColors } from '../hooks/useAppColors';
import { minutesToTimeString } from '../utils/timeUtils';
import AlarmPicker from './AlarmPicker';

type Props = {
  visible: boolean;
  startMinutes?: number;
  endMinutes?: number;
  editingSchedule?: Schedule;
  colorCategories: ColorCategory[];
  onConfirm: (data: {
    title: string;
    colorCategory: ColorCategory;
    startTime: number;
    endTime: number;
    repeat: RepeatType;
    repeatDays: number[];
    reminderOffsets: number[];
    scheduleType: ScheduleType;
  }) => void;
  onDelete?: () => void;
  onCancel: () => void;
};

function parseTimeInput(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, '');
  if (!s) return null;

  // "HH:MM" or "H:MM"
  if (s.includes(':')) {
    const [hPart, mPart] = s.split(':');
    const h = parseInt(hPart, 10);
    const m = parseInt(mPart, 10);
    if (isNaN(h) || isNaN(m) || m < 0 || m > 59 || h < 0 || h > 30) return null;
    return h * 60 + m;
  }

  const n = parseInt(s, 10);
  if (isNaN(n)) return null;

  // 1~4자리 숫자
  if (s.length <= 2) {
    // "9" → 9:00, "14" → 14:00
    if (n < 0 || n > 30) return null;
    return n * 60;
  }
  if (s.length === 3) {
    // "930" → 9:30
    const h = parseInt(s[0], 10);
    const m = parseInt(s.slice(1), 10);
    if (m < 0 || m > 59) return null;
    return h * 60 + m;
  }
  if (s.length === 4) {
    // "0930" or "1430"
    const h = parseInt(s.slice(0, 2), 10);
    const m = parseInt(s.slice(2), 10);
    if (h < 0 || h > 30 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }
  return null;
}

function TimeAdjuster({
  label,
  minutes,
  onChange,
  badge,
}: {
  label: string;
  minutes: number;
  onChange: (m: number) => void;
  badge?: string;
}) {
  const { colors } = useAppColors();
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<TextInput>(null);

  const formatDigits = (digits: string) => {
    const d = digits.replace(/[^0-9]/g, '').slice(0, 4);
    return d.length <= 2 ? d : d.slice(0, 2) + ':' + d.slice(2);
  };

  const handleChangeText = (text: string) => {
    setInputVal(formatDigits(text));
  };

  const commitEdit = () => {
    const parsed = parseTimeInput(inputVal);
    if (parsed !== null) onChange(parsed);
    setEditing(false);
  };

  const startEdit = () => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    setInputVal(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <View style={adjStyles.row}>
      <Text style={[adjStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      {badge ? <Text style={adjStyles.badge}>{badge}</Text> : null}
      <View style={adjStyles.controls}>
        <TouchableOpacity
          onPress={() => onChange(minutes - 10)}
          style={[adjStyles.btn, { borderColor: colors.border }]}
        >
          <Text style={[adjStyles.btnText, { color: colors.text }]}>−</Text>
        </TouchableOpacity>
        {editing ? (
          <TextInput
            ref={inputRef}
            style={[adjStyles.timeInput, { color: colors.text, borderColor: '#4A90D9' }]}
            value={inputVal}
            onChangeText={handleChangeText}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={commitEdit}
            onBlur={commitEdit}
            selectTextOnFocus
          />
        ) : (
          <TouchableOpacity onPress={startEdit} style={adjStyles.timeTouchable}>
            <Text style={[adjStyles.time, { color: colors.text }]}>
              {minutesToTimeString(minutes)}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onChange(minutes + 10)}
          style={[adjStyles.btn, { borderColor: colors.border }]}
        >
          <Text style={[adjStyles.btnText, { color: colors.text }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ScheduleFormModal({
  visible,
  startMinutes = 0,
  endMinutes = 30,
  editingSchedule,
  colorCategories,
  onConfirm,
  onDelete,
  onCancel,
}: Props) {
  const { colors } = useAppColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const isEditing = !!editingSchedule;

  const [title, setTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(colorCategories[0]?.id ?? '');
  const [startMins, setStartMins] = useState(startMinutes);
  const [endMins, setEndMins] = useState(endMinutes);
  const [repeat, setRepeat] = useState<RepeatType>('none');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [reminderOffsets, setReminderOffsets] = useState<number[]>([]);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('normal');

  useEffect(() => {
    if (!visible) return;
    if (editingSchedule) {
      setTitle(editingSchedule.title);
      setSelectedCategoryId(editingSchedule.colorCategory.id);
      setStartMins(editingSchedule.startTime);
      setEndMins(editingSchedule.endTime);
      setRepeat(editingSchedule.repeat ?? 'none');
      setRepeatDays(editingSchedule.repeatDays ?? []);
      setReminderOffsets(editingSchedule.reminderOffsets ?? []);
      setScheduleType(editingSchedule.scheduleType ?? 'normal');
    } else {
      setTitle('');
      setSelectedCategoryId(colorCategories[0]?.id ?? '');
      setStartMins(startMinutes);
      setEndMins(endMinutes);
      setRepeat('none');
      setRepeatDays([]);
      setReminderOffsets([]);
      setScheduleType('normal');
    }
  }, [visible]);

  const handleConfirm = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (startMins >= endMins) {
      Alert.alert('시간 오류', '종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }
    if (repeat === 'custom' && repeatDays.length === 0) {
      Alert.alert('요일 선택', '반복할 요일을 하나 이상 선택해주세요.');
      return;
    }
    const category =
      colorCategories.find((c) => c.id === selectedCategoryId) ?? colorCategories[0];
    onConfirm({ title: trimmed, colorCategory: category, startTime: startMins, endTime: endMins, repeat, repeatDays, reminderOffsets, scheduleType });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            {/* 헤더 */}
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {isEditing ? '일정 수정' : '새 일정'}
              </Text>
              <View style={styles.headerRight}>
                {/* 수면 토글 */}
                <TouchableOpacity
                  onPress={() => setScheduleType(t => t === 'sleep' ? 'normal' : 'sleep')}
                  style={[styles.sleepChip, scheduleType === 'sleep' && styles.sleepChipActive]}
                >
                  <Text style={[styles.sleepChipText, scheduleType === 'sleep' && styles.sleepChipTextActive]}>
                    🌙 수면
                  </Text>
                </TouchableOpacity>
                {isEditing && (
                  <TouchableOpacity onPress={onDelete}>
                    <Text style={styles.deleteText}>삭제</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
              style={styles.scrollArea}
            >
              {/* 제목 입력 */}
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="일정 제목"
                placeholderTextColor={colors.textSecondary}
                onFocus={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                value={title}
                onChangeText={setTitle}
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
              />

              {/* 시간 조정 */}
              <View style={[styles.timeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TimeAdjuster
                  label="시작"
                  minutes={startMins}
                  onChange={(m) => setStartMins(Math.max(0, m))}
                />
                <View style={[styles.timeDivider, { backgroundColor: colors.border }]} />
                <TimeAdjuster
                  label="종료"
                  minutes={endMins}
                  onChange={(m) => setEndMins(Math.min(30 * 60, m))}
                  badge={endMins >= 24 * 60 ? '+1 day' : undefined}
                />
              </View>

              {/* 반복 설정 */}
              <View style={[styles.repeatBox, { borderColor: colors.border }]}>
                {([
                  { value: 'none', label: '없음' },
                  { value: 'daily', label: '매일' },
                  { value: 'weekly', label: '매주' },
                  { value: 'monthly', label: '매월' },
                  { value: 'custom', label: '요일' },
                ] as { value: RepeatType; label: string }[]).map((opt) => {
                  const active = repeat === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setRepeat(opt.value)}
                      style={[
                        styles.repeatChip,
                        { borderColor: active ? '#4A90D9' : colors.border },
                        active && styles.repeatChipActive,
                      ]}
                    >
                      <Text style={[styles.repeatChipText, { color: active ? '#fff' : colors.textSecondary }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {repeat === 'custom' && (
                  <View style={styles.dayPickerRow}>
                    {([
                      { day: 1, label: '월' },
                      { day: 2, label: '화' },
                      { day: 3, label: '수' },
                      { day: 4, label: '목' },
                      { day: 5, label: '금' },
                      { day: 6, label: '토' },
                      { day: 0, label: '일' },
                    ]).map(({ day, label }) => {
                      const selected = repeatDays.includes(day);
                      return (
                        <TouchableOpacity
                          key={day}
                          onPress={() =>
                            setRepeatDays((prev) =>
                              prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
                            )
                          }
                          style={[
                            styles.dayChip,
                            { borderColor: selected ? '#4A90D9' : colors.border },
                            selected && styles.dayChipActive,
                          ]}
                        >
                          <Text style={[styles.dayChipText, { color: selected ? '#fff' : colors.textSecondary }]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* 알림 설정 */}
              <AlarmPicker selectedOffsets={reminderOffsets} onChange={setReminderOffsets} />

              {/* 색상 카테고리 */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryList}
              >
                {colorCategories.map((cat) => {
                  const isSelected = cat.id === selectedCategoryId;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      style={[
                        styles.chip,
                        { backgroundColor: cat.color + (isSelected ? 'FF' : '33') },
                        isSelected && styles.chipSelected,
                      ]}
                    >
                      <Text style={[styles.chipText, { color: isSelected ? '#fff' : cat.color }]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </ScrollView>

            {/* 버튼 */}
            <View style={[styles.buttons, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <TouchableOpacity
                style={[styles.button, { borderColor: colors.border }]}
                onPress={onCancel}
              >
                <Text style={[styles.buttonText, { color: colors.textSecondary }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.confirmButton, { opacity: title.trim() ? 1 : 0.4 }]}
                onPress={handleConfirm}
                disabled={!title.trim()}
              >
                <Text style={[styles.buttonText, { color: '#fff' }]}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const adjStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  label: { fontSize: 13, fontWeight: '500', width: 32 },
  badge: { flex: 1, fontSize: 11, fontWeight: '700', color: '#4A90D9', textAlign: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 18, lineHeight: 20 },
  time: { fontSize: 15, fontWeight: '600', width: 60, textAlign: 'center' },
  timeTouchable: { width: 60, alignItems: 'center' },
  timeInput: {
    fontSize: 15,
    fontWeight: '600',
    width: 60,
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000055',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sleepChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#6366F122', borderWidth: 1, borderColor: '#6366F144' },
  sleepChipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  sleepChipText: { fontSize: 12, fontWeight: '600', color: '#6366F1' },
  sleepChipTextActive: { color: '#fff' },
  deleteText: { fontSize: 14, color: '#E05555', fontWeight: '500' },
  scrollArea: { flexShrink: 1 },
  scrollContent: { gap: 14, paddingBottom: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  timeBox: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  timeDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 12 },
  repeatBox: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', borderWidth: 1, borderRadius: 10, padding: 10 },
  repeatChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  repeatChipActive: { backgroundColor: '#4A90D9' },
  repeatChipText: { fontSize: 13, fontWeight: '500' },
  dayPickerRow: { flexDirection: 'row', gap: 6, width: '100%', marginTop: 4 },
  dayChip: { flex: 1, paddingVertical: 7, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  dayChipActive: { backgroundColor: '#4A90D9' },
  dayChipText: { fontSize: 13, fontWeight: '600' },
  categoryScroll: { flexGrow: 0 },
  categoryList: { gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  chipSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  confirmButton: { backgroundColor: '#4A90D9', borderColor: '#4A90D9' },
  buttonText: { fontSize: 15, fontWeight: '600' },
});
