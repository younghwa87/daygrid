import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useAppColors } from '../hooks/useAppColors';

export type TabName = 'home' | 'calendar' | 'add' | 'weekly' | 'settings';

interface Props {
  activeTab: TabName;
  onPress: (tab: TabName) => void;
}

const TABS: { name: TabName; icon: string; label: string }[] = [
  { name: 'home',     icon: 'time-outline',          label: '일정'   },
  { name: 'calendar', icon: 'calendar-outline',       label: '캘린더' },
  { name: 'add',      icon: 'add',                    label: ''       },
  { name: 'weekly',   icon: 'bar-chart-outline',      label: '주간'   },
  { name: 'settings', icon: 'settings-outline',       label: '설정'   },
];

export default function BottomTabBar({ activeTab, onPress }: Props) {
  const { colors, isDark } = useAppColors();
  const activeColor = isDark ? '#fff' : '#1A1A1A';
  const inactiveColor = colors.textSecondary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      {TABS.map(({ name, icon, label }) => {
        const isAdd = name === 'add';
        const isActive = activeTab === name;
        const color = isActive ? activeColor : inactiveColor;

        if (isAdd) {
          return (
            <TouchableOpacity key={name} style={styles.tabBtn} onPress={() => onPress(name)} activeOpacity={0.8}>
              <View style={[styles.addCircle, { backgroundColor: isDark ? '#fff' : '#1A1A1A' }]}>
                <Ionicons name="add" size={26} color={isDark ? '#1A1A1A' : '#fff'} />
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={name} style={styles.tabBtn} onPress={() => onPress(name)} activeOpacity={0.7}>
            <Ionicons name={icon as any} size={22} color={color} />
            <AppText style={[styles.label, { color, fontWeight: isActive ? '700' : '400' }]}>
              {label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 3 },
  label: { fontSize: 10 },
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
