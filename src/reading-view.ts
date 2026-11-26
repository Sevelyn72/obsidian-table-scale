import { MarkdownRenderChild, type Plugin } from 'obsidian';
import type { ScaleStore } from './scale-store';
import { parseTables, tableAtLine } from './table-source';
import { hasController, TableScaleController } from './table-scaler';

class ReadingTable extends MarkdownRenderChild {
  constructor(
    private readonly table: HTMLTableElement,
    private readonly path: string,
    private readonly id: string,
    private readonly store: ScaleStore,
    private readonly registry: Set<TableScaleController>,
    private readonly isActive: () => boolean,
  ) { super(table); }

  onload(): void {
    const win = this.table.ownerDocument.defaultView!;
    const frame = win.requestAnimationFrame(() => {
      if (!this.isActive() || !this.table.isConnected || hasController(this.table)) return;
      if (this.table.closest('.markdown-source-view')) return;
      if (!this.table.closest('.markdown-preview-view, .markdown-reading-view')) return;
      const controller = new TableScaleController(this.table, { path: this.path, id: this.id, mode: 'reading' },
        this.store, () => this.registry.delete(controller));
      this.registry.add(controller);
      this.addChild(controller);
    });
    this.register(() => win.cancelAnimationFrame(frame));
  }
}

export function registerReadingTables(
  plugin: Plugin,
  store: ScaleStore,
  registry: Set<TableScaleController>,
  isActive: () => boolean,
): void {
  plugin.registerMarkdownPostProcessor(async (element, context) => {
    if (element.closest('.markdown-source-view')) return;
    const rendered = element.matches('table') ? [element as HTMLTableElement]
      : Array.from(element.querySelectorAll<HTMLTableElement>('table')).filter(table => !table.parentElement?.closest('table'));
    if (!rendered.length) return;
    const section = context.getSectionInfo(element);
    const file = plugin.app.vault.getFileByPath(context.sourcePath);
    if (!section || !file) return;
    const source = await plugin.app.vault.cachedRead(file);
    if (!isActive()) return;
    const tables = parseTables(source);
    const candidates = tables.filter(table => table.startLine >= section.lineStart && table.startLine <= section.lineEnd);
    for (let index = 0; index < rendered.length; index++) {
      const table = rendered[index]!;
      const info = context.getSectionInfo(table);
      const descriptor = candidates.length === rendered.length ? candidates[index]
        : (info ? tableAtLine(tables, info.lineStart) : undefined);
      if (!descriptor) continue;
      context.addChild(new ReadingTable(table, context.sourcePath, descriptor.id, store, registry, isActive));
    }
  });
}
