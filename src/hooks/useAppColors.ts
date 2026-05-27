import { COLORS } from '../constants';
import { useSettingsStore } from '../store/settingsStore';

export function useAppColors() {
  const darkMode = useSettingsStore((s) => s.darkMode);
  return { colors: darkMode ? COLORS.dark : COLORS.light, isDark: darkMode };
}
