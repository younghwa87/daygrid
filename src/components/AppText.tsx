import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

const FONT_MAP = {
  pretendard: { regular: 'Pretendard-Regular', bold: 'Pretendard-Bold' },
  'noto-sans-kr': { regular: 'NotoSansKR_400Regular', bold: 'NotoSansKR_700Bold' },
} as const;

export function AppText({ style, ...props }: TextProps) {
  const fontFamily = useSettingsStore((s) => s.fontFamily);

  if (fontFamily === 'system') {
    return <Text style={style} {...props} />;
  }

  const fonts = FONT_MAP[fontFamily as keyof typeof FONT_MAP];
  if (!fonts) return <Text style={style} {...props} />;

  const flat = StyleSheet.flatten(style ?? {});
  const weight = flat?.fontWeight;
  const isBold =
    weight === 'bold' || weight === '700' || weight === '800' || weight === '900';

  return (
    <Text
      style={[style, { fontFamily: isBold ? fonts.bold : fonts.regular }]}
      {...props}
    />
  );
}
