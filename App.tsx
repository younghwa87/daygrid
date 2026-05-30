import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useFonts } from 'expo-font';
import { NanumPenScript_400Regular } from '@expo-google-fonts/nanum-pen-script';
import { DoHyeon_400Regular } from '@expo-google-fonts/do-hyeon';
import { Gaegu_400Regular, Gaegu_700Bold } from '@expo-google-fonts/gaegu';
import { GamjaFlower_400Regular } from '@expo-google-fonts/gamja-flower';
import { HiMelody_400Regular } from '@expo-google-fonts/hi-melody';
import { SongMyung_400Regular } from '@expo-google-fonts/song-myung';
import { PoorStory_400Regular } from '@expo-google-fonts/poor-story';

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
  useFonts({
    NanumPenScript_400Regular,
    DoHyeon_400Regular,
    Gaegu_400Regular,
    Gaegu_700Bold,
    GamjaFlower_400Regular,
    HiMelody_400Regular,
    SongMyung_400Regular,
    PoorStory_400Regular,
  });

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
