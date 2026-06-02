import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { useAppColors } from '../hooks/useAppColors';

export type TabName = 'home' | 'calendar' | 'add' | 'weekly' | 'settings';

interface Props {
  activeTab: TabName;
  onPress: (tab: TabName) => void;
}

const TABS: { name: TabName; label: string }[] = [
  { name: 'home',     label: '홈'     },
  { name: 'calendar', label: '캘린더' },
  { name: 'add',      label: ''       },
  { name: 'weekly',   label: '주간'   },
  { name: 'settings', label: '설정'   },
];

export default function BottomTabBar({ activeTab, onPress }: Props) {
  const { colors, isDark } = useAppColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      {TABS.map(({ name, label }) => {
        const isAdd = name === 'add';
        const isActive = activeTab === name;
        const activeColor = isDark ? '#fff' : '#1A1A1A';
        const inactiveColor = colors.textSecondary;

        if (isAdd) {
          return (
            <TouchableOpacity key={name} style={styles.tabBtn} onPress={() => onPress(name)} activeOpacity={0.8}>
              <View style={[styles.addCircle, { backgroundColor: isDark ? '#fff' : '#1A1A1A' }]}>
                <AppText style={[styles.addPlus, { color: isDark ? '#1A1A1A' : '#fff' }]}>+</AppText>
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={name} style={styles.tabBtn} onPress={() => onPress(name)} activeOpacity={0.7}>
            <AppText style={[styles.tabLabel, { color: isActive ? activeColor : inactiveColor, fontWeight: isActive ? '700' : '500' }]}>
              {label}
            </AppText>
            {isActive && <View style={[styles.activeDot, { backgroundColor: activeColor }]} />}
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
  tabLabel: { fontSize: 11 },
  activeDot: { width: 4, height: 4, borderRadius: 2 },
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlus: { fontSize: 26, lineHeight: 30, fontWeight: '300' },
});
