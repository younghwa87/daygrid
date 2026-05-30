import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

const FONT_MAP = {
  'nanum-pen':   { regular: 'NanumPenScript_400Regular',    bold: 'NanumPenScript_400Regular' },
  'do-hyeon':    { regular: 'DoHyeon_400Regular',           bold: 'DoHyeon_400Regular' },
  gaegu:         { regular: 'Gaegu_400Regular',             bold: 'Gaegu_700Bold' },
  'gamja-flower':{ regular: 'GamjaFlower_400Regular',       bold: 'GamjaFlower_400Regular' },
  'hi-melody':   { regular: 'HiMelody_400Regular',          bold: 'HiMelody_400Regular' },
  'song-myung':  { regular: 'SongMyung_400Regular',         bold: 'SongMyung_400Regular' },
  'poor-story':  { regular: 'PoorStory_400Regular',         bold: 'PoorStory_400Regular' },
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
