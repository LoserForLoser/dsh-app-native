# Changelog

## Unreleased

### Changed

- Docs: 中文说明改为仓库主 README(`README.md`),英文移至 `README.en.md`,
  两个文件顶部各有一行语言切换。文档改动,代码与版本均未变动。

## 0.1.1 — 2026-11-03

### Fixed

- **The preset could not mount on dsh ≥ 0.1.6.** It referenced
  `@deepseek-ai/dsh-workflow-worker-thread`, whose last published version is
  `0.1.5-rc.3`; the workflow engine moved into the shared sandboxed Node PTC
  runtime as `@deepseek-ai/dsh-workflow-ptc`. The row is replaced.

### Added

- `time-context` row — grounds the agent in the real current date and time.
- `tool-schedule` row — one-shot and recurring reminders inside the session.

### Changed

- `engines.dsh` now declares `>=0.2.0-rc.1 <0.3.0-0` (previously not declared at all).
- README no longer claims the preset is byte-identical to the shipped `standard`
  preset. The three real differences are now stated: it keeps the `codex` and
  `claude-code` subagent rows (disabled) and the `ralph` loop, and omits the
  plugin-manager and plugin-market administrator rows.

### Verified

- 15/15 self-tests pass on dsh 0.2.1-rc.5.
- All 28 plugin references in `preset/app-native/agent.cordis.yml` resolve against
  the installed dsh.
- Row-level parity with the shipped `standard` preset: 33 rows each.
- Installs into a real 0.2.1-rc.5 profile and composes cleanly.

## 0.1.0 — 2026-09-11

- First release: a self-installing mobile-native development agent preset covering
  iOS (Objective-C / Swift), Android (Kotlin / Java) and HarmonyOS (ArkTS / C++).
