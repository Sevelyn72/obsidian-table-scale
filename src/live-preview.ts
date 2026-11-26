import { ViewPlugin, type EditorView, type ViewUpdate } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { editorInfoField, editorLivePreviewField } from 'obsidian';
import type { ScaleStore } from './scale-store';
import { parseTables, tableAtLine, type SourceTable } from './table-source';
import { hasController, TableScaleController } from './table-scaler';

export function livePreviewExtension(
  store: ScaleStore,
  registry: Set<TableScaleController>,
  isActive: () => boolean,
  refreshers?: Set<() => void>,
): Extension {
  return ViewPlugin.fromClass(class {
    private records = new Map<HTMLTableElement, { key: string; controller: TableScaleController }>();
    private observer: MutationObserver;
    private unsubscribe: () => void;
    private frame = 0;
    private destroyed = false;
    private source: string | null = null;
    private tables: SourceTable[] = [];
    private readonly win: Window;
    private readonly refresh = () => this.schedule();

    constructor(private readonly view: EditorView) {
      this.win = view.dom.ownerDocument.defaultView!;
      this.observer = new MutationObserver(() => this.schedule());
      this.observer.observe(view.contentDOM, { childList: true, subtree: true });
      this.unsubscribe = store.subscribe(() => this.schedule());
      refreshers?.add(this.refresh);
      this.schedule();
    }

    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged || update.selectionSet || update.transactions.length) this.schedule();
    }

    private schedule(): void {
      if (this.destroyed || this.frame) return;
      this.frame = this.win.requestAnimationFrame(() => { this.frame = 0; this.scan(); });
    }

    private scan(): void {
      if (this.destroyed) return;
      const path = this.view.state.field(editorInfoField, false)?.file?.path;
      const enabled = isActive() && this.view.state.field(editorLivePreviewField, false) === true
        && !this.view.dom.closest('.cm-table-widget');
      if (!enabled || !path) { this.clear(); return; }
      const source = this.view.state.doc.toString();
      if (source !== this.source) { this.source = source; this.tables = parseTables(source); }
      const visible = Array.from(this.view.contentDOM.querySelectorAll<HTMLTableElement>('.cm-table-widget table'))
        .filter(table => table.closest('.cm-editor') === this.view.dom
          && table.closest('.cm-table-widget')?.querySelector('table') === table);
      const targets = new Map<HTMLTableElement, string>();
      for (const table of visible) {
        const widget = table.closest<HTMLElement>('.cm-table-widget')!;
        try {
          const pos = this.view.posAtDOM(widget, 0);
          const line = this.view.state.doc.lineAt(pos).number - 1;
          const descriptor = tableAtLine(this.tables, line)
            ?? (pos > 0 ? tableAtLine(this.tables, this.view.state.doc.lineAt(pos - 1).number - 1) : undefined);
          if (descriptor) targets.set(table, descriptor.id);
        } catch { /* A widget can detach between the DOM scan and CodeMirror's position lookup. */ }
      }
      // Dispose old surfaces before attaching replacements: widgets may reuse their wrapper.
      for (const [table, record] of this.records) {
        if (`${path}\n${targets.get(table)}` !== record.key || !table.isConnected) {
          record.controller.unload(); this.records.delete(table);
        }
      }
      for (const [table, id] of targets) {
        if (this.records.has(table) || hasController(table)) continue;
        const controller = new TableScaleController(table, {
          path, id, mode: 'live', requestMeasure: () => { if (!this.destroyed) this.view.requestMeasure(); },
        }, store, () => registry.delete(controller));
        registry.add(controller);
        this.records.set(table, { key: `${path}\n${id}`, controller });
        controller.load();
      }
      for (const record of this.records.values()) record.controller.updatePosition();
    }

    private clear(): void {
      for (const record of this.records.values()) record.controller.unload();
      this.records.clear();
    }

    destroy(): void {
      this.destroyed = true;
      this.win.cancelAnimationFrame(this.frame);
      this.observer.disconnect();
      this.unsubscribe();
      refreshers?.delete(this.refresh);
      this.clear();
    }
  });
}
