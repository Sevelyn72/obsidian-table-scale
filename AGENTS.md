# Table Scale development

- TypeScript runtime code lives in `src/`. Keep `main.ts` focused on lifecycle registration and split larger features into modules.
- Use npm, Node.js 24 LTS (minimum 22.13), and esbuild. Run `npm ci`, then `npm run check`. `npm run package` stages release assets under `dist/<version>/`.
- `npm run check` must pass with zero ESLint warnings, regression tests, strict types, a production build and release metadata validation.
- Runtime APIs are supplied by Obsidian and CodeMirror. Keep them external to the bundle. Avoid new runtime dependencies, network calls, telemetry or access outside the vault.
- The stable plugin ID is `table-scale`. Do not change it or the saved table identifiers without an explicit migration plan.
- Use `loadData()` and `saveData()` for persistence. Preserve unreadable/unsupported data, and test save ordering, failures, rename and delete behaviour.
- Never modify Markdown notes to store zoom. Keep the user-approved outer-edge drag interaction and native editable table DOM.
- Clean up every listener, observer, animation frame, timeout and resize surface through component lifecycle helpers. Use the table's own document/window for pop-out support.
- Keep English and Chinese UI strings and user documentation consistent. Describe supported view modes, compatibility and known identity limitations accurately.
- Changes to dragging/rendering/editor integration require the checks in `tests/manual.md`; browser fixtures complement actual Obsidian verification.
- Keep versions in `package.json`, `manifest.json` and `versions.json` synchronized. `npm version patch --no-git-tag-version` runs the version hook.
- Required release assets are root `main.js`, `manifest.json`, and `styles.css`. GitHub release tags match the version exactly, without `v`.
- Never commit `main.js`, `node_modules`, `data.json`, local backups or generated test/release directories. Retain copyright notices and the 0BSD license.
- The community submission entry is community.obsidian.md; follow `docs/PUBLISHING.md`. Creating a repository, pushing or publishing requires the user's request.
- Local installer targets must be explicit. Back up files and preserve target data, dependencies and Git history. Do not recursively delete or move computed paths.
