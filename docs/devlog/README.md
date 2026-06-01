# Development Log

This directory holds dated development-log entries for `vr.minux.io`.

## Format

Each entry is a Markdown file named `YYYY-MM-DD.md` (or `YYYY-MM-DD-slug.md`
for multiple entries on the same day). Entries are informal — the goal is a
searchable record of decisions, discoveries, and gotchas, not polished prose.

A typical entry covers:

- What was built or changed
- Why a particular approach was chosen (or why another was rejected)
- Any WebXR quirks encountered on specific devices
- Links to relevant specs, issues, or PRs

## Why a file-based devlog?

Keeping the log as plain Markdown files in the repository means:

- It travels with the code — checking out any commit gives you the log entries
  that existed at that point.
- It is searchable with `grep` or any editor.
- It does not require a database, CMS, or external service.
- Entries can reference specific file paths and code snippets without link rot.

## Example entry

```
# 2026-03-15 — hand-tracking pinch threshold

Discovered that the `PINCH_THRESHOLD` constant in `src/xr/hands.js` (0.02 m)
is too tight on Quest 2 — the thumb and index tip rarely come within 20 mm
due to controller shell geometry. Set to 0.025 m after testing.

Also: `XRFrame.getJointPose` returns null during fast hand movements even
with an active session. Guards are now in place in `HandTracker.update()`.
```

## Adding an entry

Create a new file in this directory:

```bash
touch docs/devlog/YYYY-MM-DD.md
```

There is no required template beyond the date heading. Keep entries focused on
a single topic when possible; use multiple files for multiple topics on the
same day.
