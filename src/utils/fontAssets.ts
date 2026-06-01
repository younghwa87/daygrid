import { NanumPenScript_400Regular } from '@expo-google-fonts/nanum-pen-script';
import { DoHyeon_400Regular } from '@expo-google-fonts/do-hyeon';
import { Gaegu_400Regular, Gaegu_700Bold } from '@expo-google-fonts/gaegu';
import { GamjaFlower_400Regular } from '@expo-google-fonts/gamja-flower';
import { HiMelody_400Regular } from '@expo-google-fonts/hi-melody';
import { SongMyung_400Regular } from '@expo-google-fonts/song-myung';
import { PoorStory_400Regular } from '@expo-google-fonts/poor-story';
import * as Font from 'expo-font';

export const FONT_ASSETS: Record<string, Record<string, unknown>> = {
  'nanum-pen':    { NanumPenScript_400Regular },
  'do-hyeon':     { DoHyeon_400Regular },
  'gaegu':        { Gaegu_400Regular, Gaegu_700Bold },
  'gamja-flower': { GamjaFlower_400Regular },
  'hi-melody':    { HiMelody_400Regular },
  'song-myung':   { SongMyung_400Regular },
  'poor-story':   { PoorStory_400Regular },
};

export async function loadFontIfNeeded(fontFamily: string): Promise<void> {
  if (fontFamily === 'system') return;
  const assets = FONT_ASSETS[fontFamily];
  if (!assets) return;
  await Font.loadAsync(assets);
}
