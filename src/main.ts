import { MarkdownView, Notice, Plugin } from 'obsidian';
import { ScaleStore } from './scale-store';
import { registerReadingTables } from './reading-view';
import { livePreviewExtension } from './live-preview';
import type { TableScaleController } from './table-scaler';
import { getTexts } from './strings';

export default class TableScalePlugin extends Plugin {
  private running = false;
  private store!: ScaleStore;
  private controllers = new Set<TableScaleController>();
  private editorRefreshers = new Set<() => void>();

  async onload(): Promise<void> {
    this.running = true;
    const text = getTexts();
    let saveErrorShown = false;
    this.store = new ScaleStore(async data => {
      await this.saveData(data);
      saveErrorShown = false;
    }, error => {
      console.error('Table Scale: could not save scales', error);
      if (!saveErrorShown) new Notice(text.saveFailed);
      saveErrorShown = true;
    });
    try {
      const status = this.store.hydrate(await this.loadData());
      if (status === 'invalid' || status === 'unsupported') {
        this.running = false;
        new Notice(text.invalidData);
        return;
      }
    } catch (error) {
      this.running = false;
      console.error('Table Scale: could not read saved scales', error);
      new Notice(text.loadFailed);
      return;
    }
    if (!this.running) return;

    registerReadingTables(this, this.store, this.controllers, () => this.running);
    this.registerEditorExtension(livePreviewExtension(this.store, this.controllers, () => this.running, this.editorRefreshers));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      for (const controller of this.controllers) {
        const path = controller.options.path;
        if (path === oldPath || path.startsWith(`${oldPath}/`)) {
          controller.options.path = file.path + path.slice(oldPath.length);
        }
      }
      this.store.rename(oldPath, file.path);
      this.refreshReadingViews();
    }));
    this.registerEvent(this.app.vault.on('delete', file => {
      // Commit active drags before deleting records so unload cannot recreate a deleted path.
      for (const controller of this.controllers) {
        if (controller.options.path === file.path || controller.options.path.startsWith(`${file.path}/`)) controller.unload();
      }
      this.store.remove(file.path);
    }));

    this.addCommand({
      id: 'refresh-table-scaling',
      name: text.refreshCommand,
      callback: () => {
        this.refreshReadingViews();
        for (const refresh of this.editorRefreshers) refresh();
        for (const controller of this.controllers) controller.updatePosition();
        new Notice(text.status(this.controllers.size, this.store.count));
      },
    });
    this.app.workspace.onLayoutReady(() => { if (this.running) this.refreshReadingViews(); });
    this.register(() => {
      for (const controller of this.controllers) controller.unload();
      this.controllers.clear();
      void this.store.flush();
    });
  }

  private refreshReadingViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
      if (leaf.view instanceof MarkdownView && leaf.view.getMode() === 'preview') leaf.view.previewMode.rerender(true);
    }
  }

  onunload(): void { this.running = false; }
}
