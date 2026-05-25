import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { Schedule, ColorCategory, RepeatType } from '../types';
import { COLORS } from '../constants';
import { minutesToTimeString } from '../utils/timeUtils';
import AlarmPicker from './AlarmPicker';

const SCREEN_HEIGHT = Dimensions.get('window').height;

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
    reminderOffsets: number[];
  }) => void;
  onDelete?: () => void;
  onCancel: () => void;
};

function TimeAdjuster({
  label,
  minutes,
  onChange,
  colors,
  badge,
}: {
  label: string;
  minutes: number;
  onChange: (m: number) => void;
  colors: typeof COLORS.light;
  badge?: string;
}) {
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
        <Text style={[adjStyles.time, { color: colors.text }]}>
          {minutesToTimeString(minutes)}
        </Text>
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
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? COLORS.dark : COLORS.light;
  const isEditing = !!editingSchedule;

  const [title, setTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(colorCategories[0]?.id ?? '');
  const [startMins, setStartMins] = useState(startMinutes);
  const [endMins, setEndMins] = useState(endMinutes);
  const [repeat, setRepeat] = useState<RepeatType>('none');
  const [reminderOffsets, setReminderOffsets] = useState<number[]>([]);

  useEffect(() => {
    if (!visible) return;
    if (editingSchedule) {
      setTitle(editingSchedule.title);
      setSelectedCategoryId(editingSchedule.colorCategory.id);
      setStartMins(editingSchedule.startTime);
      setEndMins(editingSchedule.endTime);
      setRepeat(editingSchedule.repeat ?? 'none');
      setReminderOffsets(editingSchedule.reminderOffsets ?? []);
    } else {
      setTitle('');
      setSelectedCategoryId(colorCategories[0]?.id ?? '');
      setStartMins(startMinutes);
      setEndMins(endMinutes);
      setRepeat('none');
      setReminderOffsets([]);
    }
  }, [visible]);

  const handleConfirm = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (startMins >= endMins) {
      Alert.alert('시간 오류', '종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }
    const category =
      colorCategories.find((c) => c.id === selectedCategoryId) ?? colorCategories[0];
    onConfirm({ title: trimmed, colorCategory: category, startTime: startMins, endTime: endMins, repeat, reminderOffsets });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            {/* 헤더 */}
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {isEditing ? '일정 수정' : '새 일정'}
              </Text>
              {isEditing && (
                <TouchableOpacity onPress={onDelete}>
                  <Text style={styles.deleteText}>삭제</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 스크롤 가능한 내용 */}
            <ScrollView
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
                  colors={colors}
                />
                <View style={[styles.timeDivider, { backgroundColor: colors.border }]} />
                <TimeAdjuster
                  label="종료"
                  minutes={endMins}
                  onChange={(m) => setEndMins(Math.min(30 * 60, m))}
                  colors={colors}
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
                  { value: 'yearly', label: '매년' },
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
            <View style={styles.buttons}>
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
      </View>
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
  deleteText: { fontSize: 14, color: '#E05555', fontWeight: '500' },
  scrollArea: { maxHeight: SCREEN_HEIGHT * 0.5 - 140 },
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
    paddingBottom: 36,
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
