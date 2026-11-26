# Manual acceptance

Run these checks inside a separate desktop Obsidian vault. Record the actual app version, operating system, theme and enabled table plugins. Checkboxes below are a checklist, not claims of completed Obsidian testing for this release.

- [ ] Install the three assets, reload Obsidian and enable Table Scale.
- [ ] In Reading view, drag the right border left/right. Table width changes while text and formula size stay unchanged.
- [ ] Use the bottom edge and bottom-right corner for proportional scaling. Widen again at a non-default scale and verify text size remains at that scale.
- [ ] Double-click right to reset width, bottom to reset scale, corner to reset both.
- [ ] Focus the right border and use arrow keys for width, then Home to restore width; focus the corner to adjust scale or reset both.
- [ ] Set different widths and scales on two tables; switch files, then restart Obsidian and verify both preferences.
- [ ] Upgrade a vault with old version 1 data and verify all original scales before and after a width adjustment.
- [ ] Use Live Preview: verify the same proportions, drag the borders and type into multiple cells.
- [ ] Edit body cells, insert a paragraph above the table and switch views; scales should persist.
- [ ] With the same note in two panes, update one scale and check the other pane.
- [ ] Rename and move the note and its parent folder inside Obsidian; reopen and check saved scales.
- [ ] Delete a note after scaling, then confirm its record is removed from plugin data.
- [ ] Scroll a long table with its bottom outside the viewport; its visible right border should still work.
- [ ] Resize the pane or load an image above a table; border drag regions should track the table.
- [ ] Open a note in a pop-out window; scale, scroll and close it without leaving resize regions behind.
- [ ] Switch to raw source mode and disable/re-enable the plugin; no stale controls or inline zoom should remain.
- [ ] Repeat with the default light/dark theme. Check other themes separately before claiming compatibility.

Automated checks: `npm run check`. These cover compatible table IDs, parsing boundaries, serialized persistence, failure recovery and release metadata. The local browser fixture also exercises native CodeMirror cell input, widget replacement, edge hit testing, clipped borders and cleanup; actual Obsidian acceptance remains necessary.
