import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '../storage/mmkvStorage';

export type BlockSize = "small" | "medium" | "large";
export type TimeFormat = "12h" | "24h";
export type TextSize = "small" | "medium" | "large";
export type TextPosition = "left" | "center" | "right";
export type FontFamily = "system" | "pretendard" | "noto-sans-kr";

export const ROW_HEIGHTS: Record<BlockSize, number> = {
  small: 44,
  medium: 60,
  large: 80,
};

export const TEXT_SIZES: Record<TextSize, number> = {
  small: 12,
  medium: 15,
  large: 19,
};

export type BackupSettingsPayload = {
  blockSize: BlockSize;
  timeFormat: TimeFormat;
  textSize: TextSize;
  textPosition: TextPosition;
  gridStartHour: number;
  gridEndHour: number;
  darkMode: boolean;
  fontFamily?: FontFamily;
};

type SettingsStore = {
  blockSize: BlockSize;
  timeFormat: TimeFormat;
  textSize: TextSize;
  textPosition: TextPosition;
  gridStartHour: number;
  gridEndHour: number;
  rowHeight: number;
  fontSize: number;
  darkMode: boolean;
  fontFamily: FontFamily;
  updatedAt: number;
  setBlockSize: (size: BlockSize) => void;
  setTimeFormat: (format: TimeFormat) => void;
  setTextSize: (size: TextSize) => void;
  setTextPosition: (pos: TextPosition) => void;
  setGridRange: (startHour: number, endHour: number) => void;
  setDarkMode: (v: boolean) => void;
  setFontFamily: (f: FontFamily) => void;
  restoreFromCloud: (s: BackupSettingsPayload) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      blockSize: "medium",
      timeFormat: "12h",
      textSize: "medium",
      textPosition: "left",
      gridStartHour: 0,
      gridEndHour: 24,
      rowHeight: ROW_HEIGHTS.medium,
      fontSize: TEXT_SIZES.medium,
      darkMode: false,
      fontFamily: "system",
      updatedAt: 0,

      setBlockSize: (size) => set({ blockSize: size, rowHeight: ROW_HEIGHTS[size], updatedAt: Date.now() }),
      setTimeFormat: (format) => set({ timeFormat: format, updatedAt: Date.now() }),
      setTextSize: (size) => set({ textSize: size, fontSize: TEXT_SIZES[size], updatedAt: Date.now() }),
      setTextPosition: (pos) => set({ textPosition: pos, updatedAt: Date.now() }),
      setGridRange: (startHour, endHour) => set({ gridStartHour: startHour, gridEndHour: endHour, updatedAt: Date.now() }),
      setDarkMode: (v) => set({ darkMode: v, updatedAt: Date.now() }),
      setFontFamily: (f) => set({ fontFamily: f, updatedAt: Date.now() }),

      restoreFromCloud: (s) => set({
        blockSize: s.blockSize as BlockSize,
        timeFormat: s.timeFormat as TimeFormat,
        textSize: s.textSize as TextSize,
        textPosition: s.textPosition as TextPosition,
        gridStartHour: s.gridStartHour,
        gridEndHour: s.gridEndHour,
        darkMode: s.darkMode,
        fontFamily: (s.fontFamily as FontFamily) ?? 'system',
        rowHeight: ROW_HEIGHTS[s.blockSize as BlockSize] ?? ROW_HEIGHTS.medium,
        fontSize: TEXT_SIZES[s.textSize as TextSize] ?? TEXT_SIZES.medium,
      }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => zustandMMKVStorage),
    }
  )
);
