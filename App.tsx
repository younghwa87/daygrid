import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TimeGridScreen from './src/screens/TimeGridScreen';
import { notificationService } from './src/services/NotificationService';

export default function App() {
  useEffect(() => {
    notificationService.initialize();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="auto" />
      <TimeGridScreen />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
