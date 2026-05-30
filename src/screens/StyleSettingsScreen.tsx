import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { AppText } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, GOOGLE_WEB_CLIENT_ID } from '../services/firebase';
import { signOutGoogle, pushBackup, pullBackup, BackupSettings } from '../services/SyncService';
import { useAuthStore } from '../store/authStore';
import {
  useSettingsStore,
  BlockSize,
  TimeFormat,
  TextSize,
  TextPosition,
  FontFamily,
  ROW_HEIGHTS,
} from '../store/settingsStore';
import { useAppColors } from '../hooks/useAppColors';
import { useScheduleStore } from '../store/scheduleStore';
import { ColorCategory } from '../types';
import uuid from '../utils/uuid';

type Props = { visible: boolean; onClose: () => void };

const PRESET_COLORS = [
  '#E05555','#E07C2A','#D4B800','#4CAF50',
  '#4A90D9','#7B5EA7','#E0668A','#8E8E8E',
  '#2196F3','#009688','#FF5722','#795548',
];

// ──────────── 세그먼트 컨트롤 ────────────
function SegCtrl<T extends string>({
  options, value, onChange, labelMap,
}: { options: T[]; value: T; onChange: (v: T) => void; labelMap: Record<T, string> }) {
  const { colors } = useAppColors();
  return (
    <View style={[sc.wrap, { backgroundColor: colors.background }]}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => onChange(opt)}
          style={[sc.item, value === opt && sc.active]}
        >
          <AppText style={[sc.text, { color: value === opt ? '#fff' : colors.textSecondary }]}>
            {labelMap[opt]}
          </AppText>
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

// ──────────── 글씨체 드랍다운 ────────────
const FONT_OPTIONS: { value: FontFamily; label: string; fontFamily?: string }[] = [
  { value: 'system',       label: '시스템 기본' },
  { value: 'pretendard',   label: 'Pretendard',     fontFamily: 'Pretendard-Regular' },
  { value: 'nanum-pen',    label: '나눔손글씨 펜',  fontFamily: 'NanumPenScript_400Regular' },
  { value: 'nanum-brush',  label: '나눔손글씨 붓',  fontFamily: 'NanumBrushScript_400Regular' },
  { value: 'do-hyeon',     label: '도현',           fontFamily: 'DoHyeon_400Regular' },
  { value: 'gaegu',        label: '개구',           fontFamily: 'Gaegu_400Regular' },
  { value: 'gamja-flower', label: '감자꽃',         fontFamily: 'GamjaFlower_400Regular' },
  { value: 'hi-melody',    label: '하이멜로디',     fontFamily: 'HiMelody_400Regular' },
  { value: 'song-myung',   label: '송명',           fontFamily: 'SongMyung_400Regular' },
  { value: 'poor-story',   label: '가난한이야기',   fontFamily: 'PoorStory_400Regular' },
];

function FontDropdown({ value, onChange }: { value: FontFamily; onChange: (v: FontFamily) => void }) {
  const { colors } = useAppColors();
  const [open, setOpen] = useState(false);
  const selected = FONT_OPTIONS.find((o) => o.value === value) ?? FONT_OPTIONS[0];

  return (
    <View>
      <TouchableOpacity
        style={[fd.trigger, { borderColor: colors.border, backgroundColor: colors.background }]}
        onPress={() => setOpen((v) => !v)}
      >
        <Text
          style={[fd.triggerText, { color: colors.text, fontFamily: selected.fontFamily }]}
          numberOfLines={1}
        >
          {selected.label}
        </Text>
        <AppText style={[fd.arrow, { color: colors.textSecondary }]}>{open ? '▲' : '▼'}</AppText>
      </TouchableOpacity>
      {open && (
        <View style={[fd.list, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {FONT_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                fd.option,
                i < FONT_OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                opt.value === value && { backgroundColor: '#4A90D911' },
              ]}
              onPress={() => { onChange(opt.value); setOpen(false); }}
            >
              <Text style={[fd.optionText, { color: opt.value === value ? '#4A90D9' : colors.text, fontFamily: opt.fontFamily }]}>
                {opt.label}
              </Text>
              {opt.value === value && (
                <AppText style={fd.check}>✓</AppText>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
const fd = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    minWidth: 150,
  },
  triggerText: { flex: 1, fontSize: 15 },
  arrow: { fontSize: 10 },
  list: {
    position: 'absolute',
    right: 0,
    top: 38,
    minWidth: 180,
    borderWidth: 1,
    borderRadius: 10,
    zIndex: 999,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionText: { flex: 1, fontSize: 16 },
  check: { fontSize: 14, color: '#4A90D9', fontWeight: '600' },
});

// ──────────── 설정 행 ────────────
function SettingRow({ label, children, last = false, zIndex }: { label: string; children: React.ReactNode; last?: boolean; zIndex?: number }) {
  const { colors } = useAppColors();
  return (
    <View style={[row.wrap, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, zIndex ? { zIndex } : undefined]}>
      <AppText style={[row.label, { color: colors.text }]}>{label}</AppText>
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
  const { colors } = useAppColors();
  const [label, setLabel] = useState(category?.label ?? '');
  const [color, setColor] = useState(category?.color ?? PRESET_COLORS[0]);

  if (!category) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
        {/* 반투명 배경: flex:1로 박스 위 공간을 채우며 탭 시 닫힘 */}
        <TouchableOpacity style={catEdit.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[catEdit.box, { backgroundColor: colors.surface }]}>
          <AppText style={[catEdit.title, { color: colors.text }]}>카테고리 편집</AppText>

          <TextInput
            style={[catEdit.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={label}
            onChangeText={setLabel}
            placeholder="카테고리 이름"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            autoFocus
          />

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
              <AppText style={{ color: colors.textSecondary, fontWeight: '600' }}>취소</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[catEdit.btn, catEdit.saveBtn, { opacity: label.trim() ? 1 : 0.4 }]}
              onPress={() => { if (label.trim()) onSave({ ...category, label: label.trim(), color }); }}
              disabled={!label.trim()}
            >
              <AppText style={{ color: '#fff', fontWeight: '600' }}>저장</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const catEdit = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000066' },
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
  const { colors } = useAppColors();
  const rowH = ROW_HEIGHTS[blockSize];
  const labels = timeFormat === '12h' ? ['11 AM', '12 PM', '1 PM'] : ['11:00', '12:00', '13:00'];
  return (
    <View style={[prev.wrap, { backgroundColor: colors.background }]}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[prev.row, { height: rowH, borderTopColor: colors.hourLine }]}>
          <AppText style={[prev.label, { color: colors.textSecondary }]}>{labels[i]}</AppText>
          <View style={{ flex: 1 }} />
        </View>
      ))}
      <View style={[prev.block, { top: rowH * 0.2, height: rowH * 0.7, backgroundColor: '#4A90D9CC', borderLeftColor: '#4A90D9', right: 0, left: 48 }]}>
        <AppText style={[prev.blockText, { fontSize, textAlign: textPosition }]} numberOfLines={1}>Preview</AppText>
      </View>
      <View style={[prev.block, { top: rowH, height: rowH * 1.2, backgroundColor: '#4CAF50CC', borderLeftColor: '#4CAF50', right: 48, left: 48 }]}>
        <AppText style={[prev.blockText, { fontSize, textAlign: textPosition }]} numberOfLines={1}>Example</AppText>
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
  const { colors, isDark } = useAppColors();
  const insets = useSafeAreaInsets();
  const {
    blockSize, timeFormat, textSize, textPosition,
    darkMode, setDarkMode,
    fontFamily, setFontFamily,
    setBlockSize, setTimeFormat, setTextSize, setTextPosition,
    restoreFromCloud: restoreSettings,
  } = useSettingsStore();
  const { colorCategories, addColorCategory, updateColorCategory, removeColorCategory, schedules, restoreFromCloud: restoreSchedules } = useScheduleStore();
  const [editingCat, setEditingCat] = useState<ColorCategory | null>(null);

  // ── 구글 로그인 ──
  const { user, lastSyncAt, setUser, setLastSyncAt } = useAuthStore();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  }, []);

  async function handleGoogleSignIn() {
    setSyncing(true);
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      const credential = GoogleAuthProvider.credential(tokens.idToken);
      const cred = await signInWithCredential(auth, credential);
      const newUser = { uid: cred.user.uid, email: cred.user.email ?? '', displayName: cred.user.displayName ?? '' };
      setUser(newUser);
      const backup = await pullBackup(newUser.uid);
      if (backup && backup.updatedAt > lastSyncAt) {
        restoreSchedules(backup.schedules, backup.colorCategories);
        restoreSettings(backup.settings as any);
        setLastSyncAt(backup.updatedAt);
      }
    } catch (e: any) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) return;
      Alert.alert('로그인 실패', String(e));
    } finally {
      setSyncing(false);
    }
  }

  const handleSignOut = () => {
    Alert.alert('로그아웃', '로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await signOutGoogle();
          setUser(null);
        },
      },
    ]);
  };

  const handleManualSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const { schedules: sc, colorCategories: cc } = useScheduleStore.getState();
      const { blockSize: bs, timeFormat: tf, textSize: ts, textPosition: tp, gridStartHour, gridEndHour, darkMode: dm, fontFamily: ff } =
        useSettingsStore.getState();
      const settings: BackupSettings = {
        blockSize: bs, timeFormat: tf, textSize: ts, textPosition: tp, gridStartHour, gridEndHour, darkMode: dm, fontFamily: ff,
      };
      await pushBackup(user.uid, { schedules: sc, colorCategories: cc, settings, updatedAt: Date.now() });
      setLastSyncAt(Date.now());
    } catch (e) {
      Alert.alert('동기화 실패', String(e));
    } finally {
      setSyncing(false);
    }
  };

  const syncLabel = lastSyncAt === 0 ? '동기화 안 됨' : `${new Date(lastSyncAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 동기화`;


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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <AppText style={[styles.backText, { color: '#4A90D9' }]}>‹</AppText>
          </TouchableOpacity>
          <AppText style={[styles.headerTitle, { color: colors.text }]}>다이어리 스타일</AppText>
          <View style={styles.backBtn} />
        </View>

        <ScrollView>
          <GridPreview />

          {/* 화면 설정 */}
          <View style={[styles.section, { backgroundColor: colors.surface, overflow: 'visible', zIndex: 10 }]}>
            <SettingRow label="다크 모드">
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: colors.border, true: '#4A90D9' }}
                thumbColor="#fff"
              />
            </SettingRow>
            <SettingRow label="사이즈">
              <SegCtrl<BlockSize> options={['small','medium','large']} value={blockSize} onChange={setBlockSize} labelMap={{ small:'작게', medium:'보통', large:'크게' }} />
            </SettingRow>
            <SettingRow label="텍스트 크기">
              <SegCtrl<TextSize> options={['small','medium','large']} value={textSize} onChange={setTextSize} labelMap={{ small:'작게', medium:'보통', large:'크게' }} />
            </SettingRow>
            <SettingRow label="텍스트 위치">
              <SegCtrl<TextPosition> options={['left','center','right']} value={textPosition} onChange={setTextPosition} labelMap={{ left:'왼쪽', center:'가운데', right:'오른쪽' }} />
            </SettingRow>
            <SettingRow label="시간 표기">
              <SegCtrl<TimeFormat> options={['12h','24h']} value={timeFormat} onChange={setTimeFormat} labelMap={{ '12h':'12시간', '24h':'24시간' }} />
            </SettingRow>
            <SettingRow label="글씨체" last zIndex={10}>
              <FontDropdown value={fontFamily} onChange={setFontFamily} />
            </SettingRow>
          </View>

          {/* 계정 / 백업 */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.catHeader}>
              <AppText style={[styles.catHeaderText, { color: colors.text }]}>계정 / 백업</AppText>
              {syncing && <ActivityIndicator size="small" color="#4A90D9" />}
            </View>
            {user ? (
              <View style={acc.loggedIn}>
                <AppText style={[acc.email, { color: colors.text }]}>{user.email}</AppText>
                <AppText style={[acc.syncLabel, { color: colors.textSecondary }]}>{syncLabel}</AppText>
                <View style={acc.btnRow}>
                  <TouchableOpacity
                    style={[acc.btn, { borderColor: colors.border }]}
                    onPress={handleManualSync}
                    disabled={syncing}
                  >
                    <AppText style={[acc.btnText, { color: '#4A90D9' }]}>지금 동기화</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[acc.btn, { borderColor: colors.border }]}
                    onPress={handleSignOut}
                    disabled={syncing}
                  >
                    <AppText style={[acc.btnText, { color: '#E05555' }]}>로그아웃</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={acc.loggedOut}>
                <AppText style={[acc.desc, { color: colors.textSecondary }]}>
                  Google 계정으로 로그인하면 일정이 자동으로 백업됩니다.
                </AppText>
                <TouchableOpacity
                  style={acc.googleBtn}
                  onPress={handleGoogleSignIn}
                  disabled={syncing}
                >
                  <AppText style={acc.googleBtnText}>Google로 로그인</AppText>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 블록 색상 카테고리 */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.catHeader}>
              <AppText style={[styles.catHeaderText, { color: colors.text }]}>블록 색상 카테고리</AppText>
              <TouchableOpacity
                onPress={() => setEditingCat({ id: uuid(), label: '', color: PRESET_COLORS[0] })}
                style={styles.addBtn}
              >
                <AppText style={styles.addBtnText}>+ 추가</AppText>
              </TouchableOpacity>
            </View>
            {colorCategories.map((cat, i) => (
              <View
                key={cat.id}
                style={[styles.catRow, i < colorCategories.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              >
                <TouchableOpacity onPress={() => setEditingCat(cat)} style={styles.catInfo}>
                  <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                  <AppText style={[styles.catLabel, { color: colors.text }]}>{cat.label}</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={styles.deleteBtn}>
                  <AppText style={styles.deleteBtnText}>−</AppText>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

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
  section: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, overflow: 'hidden', zIndex: 1 },
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

const acc = StyleSheet.create({
  loggedIn: { paddingHorizontal: 16, paddingBottom: 16, gap: 6 },
  email: { fontSize: 14, fontWeight: '600' },
  syncLabel: { fontSize: 12 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  btnText: { fontSize: 13, fontWeight: '600' },
  loggedOut: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  desc: { fontSize: 13, lineHeight: 18 },
  googleBtn: { backgroundColor: '#4A90D9', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  googleBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
