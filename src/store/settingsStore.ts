import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';

export type BlockSize = "small" | "medium" | "large";
export type TimeFormat = "12h" | "24h";
export type TextSize = "small" | "medium" | "large";
export type TextPosition = "left" | "center" | "right";

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

const mmkv = createMMKV({ id: 'settings-store' });
const mmkvStorage = {
  getItem: (key: string): string | null => mmkv.getString(key) ?? null,
  setItem: (key: string, value: string): void => mmkv.set(key, value),
  removeItem: (key: string): void => { mmkv.remove(key); },
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
  setBlockSize: (size: BlockSize) => void;
  setTimeFormat: (format: TimeFormat) => void;
  setTextSize: (size: TextSize) => void;
  setTextPosition: (pos: TextPosition) => void;
  setGridRange: (startHour: number, endHour: number) => void;
  setDarkMode: (v: boolean) => void;
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

      setBlockSize: (size) => set({ blockSize: size, rowHeight: ROW_HEIGHTS[size] }),
      setTimeFormat: (format) => set({ timeFormat: format }),
      setTextSize: (size) => set({ textSize: size, fontSize: TEXT_SIZES[size] }),
      setTextPosition: (pos) => set({ textPosition: pos }),
      setGridRange: (startHour, endHour) => set({ gridStartHour: startHour, gridEndHour: endHour }),
      setDarkMode: (v) => set({ darkMode: v }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
