import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useColorScheme,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS } from '../constants';
import {
  useSettingsStore,
  BlockSize,
  TimeFormat,
  TextSize,
  TextPosition,
  ROW_HEIGHTS,
} from '../store/settingsStore';
import { useScheduleStore } from '../store/scheduleStore';
import { ColorCategory } from '../types';
import uuid from '../utils/uuid';

type Props = { visible: boolean; onClose: () => void };

// 프리셋 팔레트
const PRESET_COLORS = [
  '#E05555','#E07C2A','#D4B800','#4CAF50',
  '#4A90D9','#7B5EA7','#E0668A','#8E8E8E',
  '#2196F3','#009688','#FF5722','#795548',
];

// ──────────── 세그먼트 컨트롤 ────────────
function SegCtrl<T extends string>({
  options, value, onChange, labelMap,
}: { options: T[]; value: T; onChange: (v: T) => void; labelMap: Record<T, string> }) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? COLORS.dark : COLORS.light;
  return (
    <View style={[sc.wrap, { backgroundColor: colors.background }]}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => onChange(opt)}
          style={[sc.item, value === opt && sc.active]}
        >
          <Text style={[sc.text, { color: value === opt ? '#fff' : colors.textSecondary }]}>
            {labelMap[opt]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const sc = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: 8, padding: 2, gap: 2 },
  item: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  active: { backgroundColor: '#4A90D9' },
  text: { fontSize: 12, fontWeight: '500' },
});

// ──────────── 설정 행 ────────────
function SettingRow({ label, children, last = false }: { label: string; children: React.ReactNode; last?: boolean }) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? COLORS.dark : COLORS.light;
  return (
    <View style={[row.wrap, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <Text style={[row.label, { color: colors.text }]}>{label}</Text>
      {children}
    </View>
  );
}
const row = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  label: { fontSize: 15, fontWeight: '500' },
});

// ──────────── 색상 카테고리 편집 모달 ────────────
function CategoryEditModal({
  category,
  onSave,
  onClose,
}: { category: ColorCategory | null; onSave: (cat: ColorCategory) => void; onClose: () => void }) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? COLORS.dark : COLORS.light;
  const [label, setLabel] = useState(category?.label ?? '');
  const [color, setColor] = useState(category?.color ?? PRESET_COLORS[0]);

  if (!category) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={catEdit.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={catEdit.keyboardView}
      >
      <View style={[catEdit.box, { backgroundColor: colors.surface }]}>
        <Text style={[catEdit.title, { color: colors.text }]}>카테고리 편집</Text>

        <TextInput
          style={[catEdit.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          value={label}
          onChangeText={setLabel}
          placeholder="카테고리 이름"
          placeholderTextColor={colors.textSecondary}
          autoFocus
        />

        {/* 색상 팔레트 */}
        <View style={catEdit.palette}>
          {PRESET_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              style={[catEdit.colorDot, { backgroundColor: c }, color === c && catEdit.colorDotSelected]}
            />
          ))}
        </View>

        <View style={catEdit.buttons}>
          <TouchableOpacity style={[catEdit.btn, { borderColor: colors.border }]} onPress={onClose}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[catEdit.btn, catEdit.saveBtn, { opacity: label.trim() ? 1 : 0.4 }]}
            onPress={() => { if (label.trim()) onSave({ ...category, label: label.trim(), color }); }}
            disabled={!label.trim()}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>저장</Text>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const catEdit = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000066' },
  keyboardView: { justifyContent: 'flex-end' },
  box: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 16, paddingBottom: 36 },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 4 },
  buttons: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  saveBtn: { backgroundColor: '#4A90D9', borderColor: '#4A90D9' },
});

// ──────────── 미니 프리뷰 ────────────
function GridPreview() {
  const { blockSize, timeFormat, textPosition, fontSize } = useSettingsStore();
  const rowH = ROW_HEIGHTS[blockSize];
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? COLORS.dark : COLORS.light;
  const labels = timeFormat === '12h' ? ['11 AM', '12 PM', '1 PM'] : ['11:00', '12:00', '13:00'];
  return (
    <View style={[prev.wrap, { backgroundColor: colors.background }]}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[prev.row, { height: rowH, borderTopColor: colors.hourLine }]}>
          <Text style={[prev.label, { color: colors.textSecondary }]}>{labels[i]}</Text>
          <View style={{ flex: 1 }} />
        </View>
      ))}
      <View style={[prev.block, { top: rowH * 0.2, height: rowH * 0.7, backgroundColor: '#4A90D9CC', borderLeftColor: '#4A90D9', right: 0, left: 48 }]}>
        <Text style={[prev.blockText, { fontSize, textAlign: textPosition }]} numberOfLines={1}>Preview</Text>
      </View>
      <View style={[prev.block, { top: rowH, height: rowH * 1.2, backgroundColor: '#4CAF50CC', borderLeftColor: '#4CAF50', right: 48, left: 48 }]}>
        <Text style={[prev.blockText, { fontSize, textAlign: textPosition }]} numberOfLines={1}>Example</Text>
      </View>
    </View>
  );
}
const prev = StyleSheet.create({
  wrap: { margin: 16, borderRadius: 12, padding: 8, height: 180, overflow: 'hidden', position: 'relative' },
  row: { flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 10, width: 48, paddingTop: 3 },
  block: { position: 'absolute', borderLeftWidth: 3, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  blockText: { fontWeight: '600', color: '#fff' },
});

// ──────────── 메인 화면 ────────────
export default function StyleSettingsScreen({ visible, onClose }: Props) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? COLORS.dark : COLORS.light;
  const { blockSize, timeFormat, textSize, textPosition, setBlockSize, setTimeFormat, setTextSize, setTextPosition } = useSettingsStore();
  const { colorCategories, addColorCategory, updateColorCategory, removeColorCategory, schedules } = useScheduleStore();
  const [editingCat, setEditingCat] = useState<ColorCategory | null>(null);

  const handleSaveCategory = (cat: ColorCategory) => {
    if (colorCategories.find((c) => c.id === cat.id)) {
      updateColorCategory(cat.id, { label: cat.label, color: cat.color });
    } else {
      addColorCategory(cat);
    }
    setEditingCat(null);
  };

  const handleDeleteCategory = (cat: ColorCategory) => {
    const inUse = schedules.some((s) => s.colorCategory.id === cat.id);
    if (inUse) {
      Alert.alert('삭제 불가', '이 카테고리를 사용 중인 일정이 있습니다.');
      return;
    }
    Alert.alert('삭제', `"${cat.label}" 카테고리를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeColorCategory(cat.id) },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Text style={[styles.backText, { color: '#4A90D9' }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>다이어리 스타일</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView>
          <GridPreview />

          {/* 블록 & 텍스트 설정 */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <SettingRow label="사이즈">
              <SegCtrl<BlockSize> options={['small','medium','large']} value={blockSize} onChange={setBlockSize} labelMap={{ small:'작게', medium:'보통', large:'크게' }} />
            </SettingRow>
            <SettingRow label="텍스트 크기">
              <SegCtrl<TextSize> options={['small','medium','large']} value={textSize} onChange={setTextSize} labelMap={{ small:'작게', medium:'보통', large:'크게' }} />
            </SettingRow>
            <SettingRow label="텍스트 위치">
              <SegCtrl<TextPosition> options={['left','center','right']} value={textPosition} onChange={setTextPosition} labelMap={{ left:'왼쪽', center:'가운데', right:'오른쪽' }} />
            </SettingRow>
            <SettingRow label="시간 표기" last>
              <SegCtrl<TimeFormat> options={['12h','24h']} value={timeFormat} onChange={setTimeFormat} labelMap={{ '12h':'12시간', '24h':'24시간' }} />
            </SettingRow>
          </View>

          {/* 블록 색상 카테고리 */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.catHeader}>
              <Text style={[styles.catHeaderText, { color: colors.text }]}>블록 색상 카테고리</Text>
              <TouchableOpacity
                onPress={() => setEditingCat({ id: uuid(), label: '', color: PRESET_COLORS[0] })}
                style={styles.addBtn}
              >
                <Text style={styles.addBtnText}>+ 추가</Text>
              </TouchableOpacity>
            </View>
            {colorCategories.map((cat, i) => (
              <View
                key={cat.id}
                style={[styles.catRow, i < colorCategories.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              >
                <TouchableOpacity onPress={() => setEditingCat(cat)} style={styles.catInfo}>
                  <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.catLabel, { color: colors.text }]}>{cat.label}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>−</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* 카테고리 편집 모달 */}
      <CategoryEditModal
        key={editingCat?.id ?? 'none'}
        category={editingCat}
        onSave={handleSaveCategory}
        onClose={() => setEditingCat(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 44 },
  backText: { fontSize: 24, lineHeight: 26 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600' },
  section: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, overflow: 'hidden' },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  catHeaderText: { fontSize: 15, fontWeight: '500' },
  addBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#4A90D922' },
  addBtnText: { fontSize: 13, color: '#4A90D9', fontWeight: '600' },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  catInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  colorDot: { width: 16, height: 16, borderRadius: 8 },
  catLabel: { fontSize: 14 },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0555522', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 18, color: '#E05555', lineHeight: 20 },
});
