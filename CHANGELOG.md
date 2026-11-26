# Changelog

## 1.2.2 — 2026-11-26

- Use Obsidian DOM helpers to create resize controls in the table's own document.
- Remove a redundant table type assertion from the reading-view adapter.
- Enforce both source-code review rules in local and CI lint checks.

## 1.2.1 — 2026-11-26

- Add GitHub build-provenance attestations for the three installable release assets.
- Keep SHA-256 checksum files local instead of attaching unsupported extra files to releases.
- Remove CSS priority overrides and preserve explicit width bounds through component-owned styles.
- Restore original maximum-width styles when the plugin unloads.

## 1.2.0 — 2026-11-25

- Drag the right outer edge to adjust width without changing text or formula size.
- Keep proportional scaling on the bottom edge and bottom-right corner.
- Persist independent widths and scales across view changes, widget replacement and restarts.
- Read existing version 1 scale data and migrate to version 2 on the first layout change.
- Reset width from the right edge, scale from the bottom edge, or both from the corner.
- Add width keyboard controls and show width alongside scale in the label.

## 1.1.2 — 2026-11-25

- Prepare the project for community distribution: author metadata, bilingual documentation and UI, reproducible checks, staged release assets, and a draft-release workflow.
- Retry a failed final save and allow an unchanged gesture to retry unsaved data.
- Preserve unreadable or unsupported saved data instead of overwriting it.
- Commit active drags before removing deleted-note records.
- Refresh Live Preview connections from the command palette as well as Reading view.
- Reposition resize areas when the surrounding rendered layout changes.
- Correct fenced-code, indented-code, and escaped-pipe table recognition while preserving existing normal-table identifiers.

## 1.1.1 — 2026-11-25

- Drag the right outer border, bottom outer border, or bottom-right corner directly.
- Keep table content editable in Live Preview and persist scales across restarts.

## 1.1.0 — 2026-11-25

- Add per-table persistence and shared Reading view / Live Preview records.

## 1.0.0 — 2026-11-25

- Initial local prototype for scaling tables in Reading view.
