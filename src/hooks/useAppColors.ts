import { useColorScheme } from 'react-native';
import { COLORS } from '../constants';
import { useSettingsStore } from '../store/settingsStore';

export function useAppColors() {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useColorScheme();

  const isDark =
    themeMode === 'dark' ? true :
    themeMode === 'light' ? false :
    systemScheme === 'dark';

  return { colors: isDark ? COLORS.dark : COLORS.light, isDark };
}
