export const MIN_SCALE = 0.5;
export const MAX_SCALE = 1.5;
export const MIN_TABLE_WIDTH = 120;
export const MAX_TABLE_WIDTH = 6000;

export interface TableLayout {
  scale: number;
  width?: number;
}

export interface ScaleData {
  version: 2;
  files: Record<string, Record<string, number>>;
  widths: Record<string, Record<string, number>>;
}

export function clampWidth(value: number): number {
  return Number.isFinite(value) ? Math.min(MAX_TABLE_WIDTH, Math.max(MIN_TABLE_WIDTH, value)) : MIN_TABLE_WIDTH;
}

export function clampScale(value: number): number {
  return Number.isFinite(value) ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, value)) : 1;
}
