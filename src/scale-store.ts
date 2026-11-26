import { clampScale, clampWidth, type ScaleData, type TableLayout } from './settings';

type Listener = (path: string, id: string, scale: number) => void;
type Entries = Record<string, Record<string, number>>;
const emptyEntries = (): Entries => Object.create(null) as Entries;
const emptyData = (): ScaleData => ({ version: 2, files: emptyEntries(), widths: emptyEntries() });

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export class ScaleStore {
  private data = emptyData();
  private listeners = new Set<Listener>();
  private pending: Promise<void> = Promise.resolve();
  private failedWrite = false;

  constructor(
    private readonly write: (data: ScaleData) => Promise<void>,
    private readonly onError: (error: unknown) => void,
  ) {}

  hydrate(raw: unknown): 'empty' | 'ok' | 'invalid' | 'unsupported' {
    if (raw === null || raw === undefined) return 'empty';
    if (!record(raw)) return 'invalid';
    if (raw.version !== 1 && raw.version !== 2) return typeof raw.version === 'number' ? 'unsupported' : 'invalid';
    if (!record(raw.files) || (raw.version === 2 && !record(raw.widths))) return 'invalid';
    const next = emptyData();
    const load = (source: Record<string, unknown>, destination: Entries, width: boolean): void => {
      for (const [path, entries] of Object.entries(source)) {
        if (!record(entries)) continue;
        const values: Record<string, number> = Object.create(null) as Record<string, number>;
        for (const [id, value] of Object.entries(entries)) {
          if (!/^t-[0-9a-f]{16}-\d+$/.test(id) || typeof value !== 'number' || !Number.isFinite(value)) continue;
          if (width && value <= 0) continue;
          const normalized = width ? clampWidth(value) : clampScale(value);
          if (width || normalized !== 1) values[id] = normalized;
        }
        if (Object.keys(values).length) destination[path] = values;
      }
    };
    load(raw.files, next.files, false);
    if (raw.version === 2) load(raw.widths as Record<string, unknown>, next.widths, true);
    // Version 1 scales keep their IDs and values; write the v2 layout only after a user change.
    this.data = next;
    return 'ok';
  }

  get(path: string, id: string): number { return this.data.files[path]?.[id] ?? 1; }
  getWidth(path: string, id: string): number | undefined { return this.data.widths[path]?.[id]; }
  getLayout(path: string, id: string): TableLayout { return { scale: this.get(path, id), width: this.getWidth(path, id) }; }

  set(path: string, id: string, value: number): void {
    this.setLayout(path, id, { ...this.getLayout(path, id), scale: value });
  }

  setWidth(path: string, id: string, width?: number): void {
    this.setLayout(path, id, { scale: this.get(path, id), width });
  }

  setLayout(path: string, id: string, value: TableLayout): void {
    const scale = Math.round(clampScale(value.scale) * 1000) / 1000;
    const width = value.width === undefined ? undefined : Math.round(clampWidth(value.width) * 10) / 10;
    if (Math.abs(this.get(path, id) - scale) < 0.0005 && this.getWidth(path, id) === width) {
      if (this.failedWrite) this.queueWrite();
      return;
    }
    const update = (map: Entries, next: number | undefined): void => {
      const entries = map[path] ?? (map[path] = Object.create(null) as Record<string, number>);
      if (next === undefined) delete entries[id];
      else entries[id] = next;
      if (!Object.keys(entries).length) delete map[path];
    };
    update(this.data.files, scale === 1 ? undefined : scale);
    update(this.data.widths, width);
    this.queueWrite();
    for (const listener of this.listeners) listener(path, id, scale);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  rename(oldPath: string, newPath: string): void {
    if (oldPath === newPath) return;
    let changed = false;
    for (const map of [this.data.files, this.data.widths]) {
      for (const path of Object.keys(map)) {
        if (path !== oldPath && !path.startsWith(`${oldPath}/`)) continue;
        map[newPath + path.slice(oldPath.length)] = map[path]!;
        delete map[path];
        changed = true;
      }
    }
    if (changed) {
      this.queueWrite();
      for (const listener of this.listeners) listener(newPath, '*', 1);
    }
  }

  remove(path: string): void {
    let changed = false;
    for (const map of [this.data.files, this.data.widths]) {
      for (const key of Object.keys(map)) {
        if (key === path || key.startsWith(`${path}/`)) { delete map[key]; changed = true; }
      }
    }
    if (changed) this.queueWrite();
  }

  async flush(): Promise<void> {
    await this.pending;
    if (this.failedWrite) { this.queueWrite(); await this.pending; }
  }

  get count(): number {
    const paths = new Set([...Object.keys(this.data.files), ...Object.keys(this.data.widths)]);
    let count = 0;
    for (const path of paths) count += new Set([...Object.keys(this.data.files[path] ?? {}), ...Object.keys(this.data.widths[path] ?? {})]).size;
    return count;
  }

  private queueWrite(): void {
    const snapshot = JSON.parse(JSON.stringify(this.data)) as ScaleData;
    this.pending = this.pending.then(async () => {
      try { await this.write(snapshot); this.failedWrite = false; }
      catch (error) { this.failedWrite = true; this.onError(error); }
    });
  }
}
