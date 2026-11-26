import { Component } from 'obsidian';
import { clampScale, clampWidth } from './settings';
import type { ScaleStore } from './scale-store';
import { TableScaleEdges } from './table-scale-edges';

export interface TableScaleOptions {
  path: string;
  id: string;
  mode: 'reading' | 'live';
  requestMeasure?: () => void;
}

const owners = new WeakMap<HTMLTableElement, TableScaleController>();
export function hasController(table: HTMLTableElement): boolean { return owners.has(table); }

/** Keep the native table in place; editor-owned nodes must never be reparented. */
export class TableScaleController extends Component {
  private surface!: HTMLElement;
  private edges?: TableScaleEdges;
  private scale = 1;
  private customWidth?: number;
  private baseWidth = 0;
  private originalTableWidth?: [string, string];
  private disposed = false;
  private originals: Array<[string, string, string]> = [];
  private hadSurfaceClass = false;

  constructor(
    readonly table: HTMLTableElement,
    readonly options: TableScaleOptions,
    private readonly store: ScaleStore,
    private readonly onDispose: () => void,
  ) { super(); }

  onload(): void {
    if (!this.table.isConnected || hasController(this.table)) return;
    owners.set(this.table, this);
    this.surface = this.options.mode === 'live'
      ? this.table.closest<HTMLElement>('.table-wrapper') ?? this.table : this.table;
    this.originals = ['zoom', 'width', 'max-width'].map(property => [
      property, this.surface.style.getPropertyValue(property), this.surface.style.getPropertyPriority(property),
    ]);
    const width = this.surface.offsetWidth;
    this.baseWidth = Math.max(1, this.table.offsetWidth);
    if (this.surface !== this.table) this.originalTableWidth = [this.table.style.getPropertyValue('width'), this.table.style.getPropertyPriority('width')];
    if (width > 0) this.surface.style.setProperty('width', `${width}px`);
    this.hadSurfaceClass = this.surface.classList.contains('table-scale-surface');
    this.surface.classList.add('table-scale-surface');
    this.table.classList.add('table-scale-managed');

    this.edges = new TableScaleEdges(this.table, {
      getScale: () => this.scale,
      setScale: value => this.apply(value),
      getWidth: () => this.table.offsetWidth,
      setWidth: value => { this.customWidth = clampWidth(value); this.apply(this.scale); },
      reset: mode => {
        if (mode !== 'scale') this.customWidth = undefined;
        this.apply(mode === 'width' ? this.scale : 1);
      },
      commit: () => this.store.setLayout(this.options.path, this.options.id, { scale: this.scale, width: this.customWidth }),
    });
    this.addChild(this.edges);
    this.register(this.store.subscribe((path, id, scale) => {
      if (path === this.options.path && id === this.options.id && !this.edges?.isDragging) {
        this.customWidth = this.store.getWidth(path, id);
        this.apply(scale);
      }
    }));
    let lastSize = '';
    const observer = new ResizeObserver(() => {
      const size = `${this.table.offsetWidth}:${this.table.offsetHeight}`;
      if (size !== lastSize) {
        lastSize = size;
        this.edges?.updateMetrics();
        this.options.requestMeasure?.();
      }
      this.updatePosition();
    });
    observer.observe(this.table);
    const layout = this.table.closest('.markdown-preview-sizer, .cm-content');
    if (layout) observer.observe(layout);
    this.register(() => observer.disconnect());
    this.customWidth = this.store.getWidth(this.options.path, this.options.id);
    this.apply(this.store.get(this.options.path, this.options.id));
  }

  private apply(value: number): void {
    if (this.disposed || !this.surface) return;
    this.scale = clampScale(value);
    const width = this.customWidth ?? this.baseWidth;
    this.surface.style.setProperty('width', `${width}px`);
    this.surface.style.setProperty('max-width', `${width}px`);
    if (this.customWidth !== undefined) this.table.style.setProperty('width', `${width}px`);
    else if (this.originalTableWidth) {
      const [value, priority] = this.originalTableWidth;
      if (value) this.table.style.setProperty('width', value, priority);
      else this.table.style.removeProperty('width');
    }
    this.surface.style.setProperty('zoom', String(this.scale));
    this.edges?.updateMetrics();
    this.options.requestMeasure?.();
    this.updatePosition();
  }

  updatePosition(): void { this.edges?.updatePosition(); }

  onunload(): void {
    if (this.disposed) return;
    this.edges?.finishDrag();
    this.disposed = true;
    if (owners.get(this.table) === this) {
      owners.delete(this.table);
      this.table.classList.remove('table-scale-managed');
      if (!this.hadSurfaceClass) this.surface.classList.remove('table-scale-surface');
      for (const [property, value, priority] of this.originals) {
        if (value) this.surface.style.setProperty(property, value, priority);
        else this.surface.style.removeProperty(property);
      }
      if (this.originalTableWidth) {
        const [value, priority] = this.originalTableWidth;
        if (value) this.table.style.setProperty('width', value, priority);
        else this.table.style.removeProperty('width');
      }
      this.options.requestMeasure?.();
    }
    this.onDispose();
  }
}
