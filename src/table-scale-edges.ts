import { Component } from 'obsidian';
import { clampScale, clampWidth, MIN_TABLE_WIDTH, MAX_TABLE_WIDTH } from './settings';
import { getTexts } from './strings';

type Edge = 'right' | 'bottom' | 'corner';
interface ScaleActions {
  getScale: () => number;
  setScale: (value: number) => void;
  getWidth: () => number;
  setWidth: (value: number) => void;
  reset: (mode: 'width' | 'scale' | 'all') => void;
  commit: () => void;
}
interface Drag {
  pointer: number;
  target: HTMLElement;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  edge: Edge;
}

/** Transparent hit areas sit on the outer border, leaving cell contents interactive. */
export class TableScaleEdges extends Component {
  private overlay!: HTMLDivElement;
  private label!: HTMLSpanElement;
  private areas = new Map<Edge, HTMLDivElement>();
  private drag: Drag | null = null;
  private frame = 0;
  private hideTimer = 0;
  private disposed = false;
  private readonly win: Window;

  constructor(private readonly table: HTMLTableElement, private readonly actions: ScaleActions) {
    super();
    this.win = table.ownerDocument.defaultView!;
  }

  get isDragging(): boolean { return this.drag !== null; }

  onload(): void {
    const doc = this.table.ownerDocument;
    this.overlay = doc.createElement('div');
    this.overlay.className = 'table-scale-overlay';
    this.overlay.hidden = true;
    this.label = doc.createElement('span');
    this.label.className = 'table-scale-label';
    this.overlay.append(this.label);
    const text = getTexts();
    for (const edge of ['right', 'bottom', 'corner'] as const) {
      const area = doc.createElement('div');
      area.className = `table-scale-edge table-scale-edge-${edge}`;
      area.title = edge === 'right' ? text.widthHint : text.edgeHint;
      if (edge === 'corner' || edge === 'right') {
        area.tabIndex = 0;
        area.setAttribute('role', 'slider');
        area.setAttribute('aria-label', edge === 'right' ? text.tableWidth : text.scaleTable);
        if (edge === 'corner') {
          area.setAttribute('aria-valuemin', '50');
          area.setAttribute('aria-valuemax', '150');
        }
      }
      this.areas.set(edge, area);
      this.overlay.append(area);
      this.registerDomEvent(area, 'pointerenter', () => this.show());
      this.registerDomEvent(area, 'pointerleave', () => this.hideLater());
      this.registerDomEvent(area, 'focus', () => this.show());
      this.registerDomEvent(area, 'blur', () => this.hideLater());
      this.registerDomEvent(area, 'pointerdown', event => this.startDrag(event, area, edge));
      this.registerDomEvent(area, 'pointermove', event => this.moveDrag(event));
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
        this.registerDomEvent(area, name, () => this.finishDrag());
      }
      this.registerDomEvent(area, 'dblclick', event => {
        event.preventDefault(); event.stopPropagation();
        this.actions.reset(edge === 'right' ? 'width' : edge === 'bottom' ? 'scale' : 'all');
        this.actions.commit();
      });
      this.registerDomEvent(area, 'keydown', event => this.onKey(event, edge));
    }
    doc.body.append(this.overlay);
    this.registerDomEvent(this.table, 'pointerenter', () => this.show());
    this.registerDomEvent(this.table, 'pointermove', () => this.show());
    this.registerDomEvent(this.table, 'pointerleave', () => this.hideLater());
    this.registerDomEvent(doc, 'scroll', () => this.updatePosition(), true);
    this.registerDomEvent(this.win, 'resize', () => this.updatePosition());
    this.registerDomEvent(this.win, 'blur', () => this.finishDrag());
    this.updateMetrics();
    this.updatePosition();
    if (this.table.matches(':hover')) this.show();
  }

  updateMetrics(): void {
    if (!this.label) return;
    const percent = Math.round(this.actions.getScale() * 100);
    const scale = this.actions.getScale();
    const width = Math.round(this.actions.getWidth() * scale);
    this.label.textContent = `${percent}% · ${width} px`;
    this.areas.get('corner')?.setAttribute('aria-valuenow', String(percent));
    const right = this.areas.get('right');
    right?.setAttribute('aria-valuenow', String(width));
    right?.setAttribute('aria-valuemin', String(Math.round(MIN_TABLE_WIDTH * scale)));
    right?.setAttribute('aria-valuemax', String(Math.round(MAX_TABLE_WIDTH * scale)));
  }

  private startDrag(event: PointerEvent, target: HTMLElement, edge: Edge): void {
    if (event.button !== 0 || this.drag) return;
    event.preventDefault(); event.stopPropagation();
    const rect = this.table.getBoundingClientRect();
    const scale = this.actions.getScale();
    this.drag = {
      pointer: event.pointerId, target, edge, x: event.clientX, y: event.clientY, scale,
      width: Math.max(1, this.actions.getWidth()), height: Math.max(1, rect.height / scale),
    };
    target.setPointerCapture(event.pointerId);
    this.overlay.classList.add('is-dragging');
    this.show();
  }

  private moveDrag(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointer) return;
    event.preventDefault();
    if (drag.edge === 'right') {
      this.actions.setWidth(clampWidth(drag.width + (event.clientX - drag.x) / drag.scale));
      return;
    }
    // Bottom edge and corner preserve proportional scaling independently of width.
    const change = drag.edge === 'bottom' ? (event.clientY - drag.y) / drag.height
      : (event.clientX - drag.x) / drag.width;
    this.actions.setScale(clampScale(drag.scale + change));
  }

  finishDrag(): void {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    if (drag.target.hasPointerCapture(drag.pointer)) drag.target.releasePointerCapture(drag.pointer);
    this.overlay.classList.remove('is-dragging');
    this.actions.commit();
    this.hideLater();
  }

  private onKey(event: KeyboardEvent, edge: Edge): void {
    const step = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 0.05
      : ['ArrowLeft', 'ArrowDown'].includes(event.key) ? -0.05 : 0;
    if (!step && event.key !== 'Home') return;
    event.preventDefault(); event.stopPropagation();
    if (event.key === 'Home') this.actions.reset(edge === 'right' ? 'width' : edge === 'bottom' ? 'scale' : 'all');
    else if (edge === 'right') this.actions.setWidth(clampWidth(this.actions.getWidth() + Math.sign(step) * 20 / this.actions.getScale()));
    else this.actions.setScale(clampScale(this.actions.getScale() + step));
    this.actions.commit();
  }

  private show(): void {
    if (this.disposed) return;
    this.win.clearTimeout(this.hideTimer);
    this.overlay.classList.add('is-visible');
    this.updatePosition();
  }

  private hideLater(): void {
    this.win.clearTimeout(this.hideTimer);
    this.hideTimer = this.win.setTimeout(() => {
      if (!this.drag && !this.overlay.contains(this.table.ownerDocument.activeElement)) {
        this.overlay.classList.remove('is-visible');
      }
    }, 180);
  }

  updatePosition(): void {
    if (this.disposed || this.frame) return;
    this.frame = this.win.requestAnimationFrame(() => { this.frame = 0; this.position(); });
  }

  private position(): void {
    if (!this.table.isConnected) { this.overlay.hidden = true; return; }
    const rect = this.table.getBoundingClientRect();
    let left = Math.max(0, rect.left), right = Math.min(this.win.innerWidth, rect.right);
    let top = Math.max(0, rect.top), bottom = Math.min(this.win.innerHeight, rect.bottom);
    for (let parent = this.table.parentElement; parent && parent !== this.table.ownerDocument.body; parent = parent.parentElement) {
      const style = this.win.getComputedStyle(parent);
      const clipX = /(auto|scroll|hidden|clip)/.test(style.overflowX);
      const clipY = /(auto|scroll|hidden|clip)/.test(style.overflowY);
      if (!clipX && !clipY) continue;
      const bounds = parent.getBoundingClientRect();
      if (clipX) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
      if (clipY) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
    }
    this.overlay.hidden = right <= left || bottom <= top;
    Object.assign(this.overlay.style, {
      left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    });
    const rightArea = this.areas.get('right')!, bottomArea = this.areas.get('bottom')!;
    const corner = this.areas.get('corner')!;
    const rightVisible = rect.right <= right + 2;
    const bottomVisible = rect.bottom <= bottom + 2;
    // A tall table still exposes the visible portion of its right border.
    rightArea.hidden = !rightVisible;
    bottomArea.hidden = !bottomVisible;
    corner.hidden = !rightVisible || !bottomVisible;
    Object.assign(rightArea.style, { top: `${top - rect.top}px`, height: `${bottom - top}px` });
    Object.assign(bottomArea.style, { left: `${left - rect.left}px`, width: `${right - left}px` });
  }

  onunload(): void {
    if (this.disposed) return;
    this.finishDrag();
    this.disposed = true;
    this.win.cancelAnimationFrame(this.frame);
    this.win.clearTimeout(this.hideTimer);
    this.overlay?.remove();
  }
}
