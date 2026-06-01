import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useFonts } from 'expo-font';
import { FONT_ASSETS } from './src/utils/fontAssets';

WebBrowser.maybeCompleteAuthSession();
import TimeGridScreen from './src/screens/TimeGridScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { notificationService } from './src/services/NotificationService';
import { useCloudSync } from './src/hooks/useCloudSync';
import { useAuthStore } from './src/store/authStore';
import { pullBackup } from './src/services/SyncService';
import { useScheduleStore } from './src/store/scheduleStore';
import { useSettingsStore } from './src/store/settingsStore';

function AppContent() {
  useCloudSync();

  // 앱 시작 시 클라우드가 더 최신이면 pull
  useEffect(() => {
    const { user, lastSyncAt, setLastSyncAt } = useAuthStore.getState();
    if (!user) return;
    pullBackup(user.uid)
      .then((backup) => {
        if (!backup || backup.updatedAt <= lastSyncAt) return;
        // 클라우드 데이터가 비어있고 로컬에 일정이 있으면 pull 생략
        const localSchedules = useScheduleStore.getState().schedules;
        if (backup.schedules.length === 0 && localSchedules.length > 0) return;
        useScheduleStore.getState().restoreFromCloud(backup.schedules, backup.colorCategories);
        useSettingsStore.getState().restoreFromCloud(backup.settings as any);
        setLastSyncAt(backup.updatedAt);
      })
      .catch(() => {});
  }, []);

  return <TimeGridScreen />;
}

export default function App() {
  // 선택된 폰트만 로드 (system이면 0개)
  const selectedFont = useSettingsStore.getState().fontFamily;
  useFonts(FONT_ASSETS[selectedFont] ?? {});

  useEffect(() => {
    notificationService.initialize();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar style="auto" />
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
