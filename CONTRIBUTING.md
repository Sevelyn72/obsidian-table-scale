# Contributing

Use Node.js 24 LTS and npm. Run `npm ci`, then `npm run check` before proposing a change. For a local watch build, run `npm run dev` and reload the plugin in a separate test vault.

Keep the plugin ID `table-scale` stable. Preserve the saved-data format and existing table identifiers, or provide a tested migration. Never change Markdown note contents to store display preferences.

Runtime source lives in `src/`; keep lifecycle registration in `main.ts`. Tests for source parsing, saved records, and release metadata live in `tests/`. Build and publishing helpers live in `scripts/` and are not included in the runtime bundle.

Avoid new runtime dependencies. Obsidian and CodeMirror must remain external to the bundle. All listeners, observers, animation frames and resize surfaces must be removed when their owner unloads. Use the table's own document and window for pop-out window support.

Complete [manual acceptance](tests/manual.md) after changes to dragging, rendering or editing. Browser fixtures and unit tests complement actual Obsidian testing; they do not establish theme or platform compatibility by themselves.

When reporting a bug, include Obsidian and plugin versions, operating system, theme, view mode, reproduction steps and a minimal example table. Remove private note content and file paths from logs or screenshots before sharing.
