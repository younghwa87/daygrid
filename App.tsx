import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();
import TimeGridScreen from './src/screens/TimeGridScreen';
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
        useScheduleStore.getState().restoreFromCloud(backup.schedules, backup.colorCategories);
        useSettingsStore.getState().restoreFromCloud(backup.settings as any);
        setLastSyncAt(backup.updatedAt);
      })
      .catch(() => {});
  }, []);

  return <TimeGridScreen />;
}

export default function App() {
  useEffect(() => {
    notificationService.initialize();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar style="auto" />
        <AppContent />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
