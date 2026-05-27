import { create } from "zustand";

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

type SettingsStore = {
  blockSize: BlockSize;
  timeFormat: TimeFormat;
  textSize: TextSize;
  textPosition: TextPosition;
  gridStartHour: number;
  gridEndHour: number;
  rowHeight: number;
  fontSize: number;
  setBlockSize: (size: BlockSize) => void;
  setTimeFormat: (format: TimeFormat) => void;
  setTextSize: (size: TextSize) => void;
  setTextPosition: (pos: TextPosition) => void;
  setGridRange: (startHour: number, endHour: number) => void;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  blockSize: "medium",
  timeFormat: "12h",
  textSize: "medium",
  textPosition: "left",
  gridStartHour: 0,
  gridEndHour: 23,
  rowHeight: ROW_HEIGHTS.medium,
  fontSize: TEXT_SIZES.medium,

  setBlockSize: (size) =>
    set({ blockSize: size, rowHeight: ROW_HEIGHTS[size] }),
  setTimeFormat: (format) => set({ timeFormat: format }),
  setTextSize: (size) => set({ textSize: size, fontSize: TEXT_SIZES[size] }),
  setTextPosition: (pos) => set({ textPosition: pos }),
  setGridRange: (startHour, endHour) =>
    set({ gridStartHour: startHour, gridEndHour: endHour }),
}));
