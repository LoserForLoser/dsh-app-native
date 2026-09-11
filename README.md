# dsh-app-native

A **mobile native development** agent preset for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`): one preset covering iOS, Android and HarmonyOS in **all of their native languages**, with the platform detected from the workspace.

Installing it lands the preset in `$DSH_HOME/.agent-presets/app-native/`, so it is selectable in the preset picker of **every profile**.

## Install

```sh
dsh plugin --profile web add dsh-app-native
```

Restart that profile, then pick **APP原生开发** in the preset picker of a **new** session.

No manual copying: the bundle's single host row installs the packaged `preset/app-native/` into `$DSH_HOME/.agent-presets/app-native/` idempotently.

## What the preset does

Instead of a generic coding agent, you get one that identifies the platform first and then works by that platform's rules:

| Platform | Languages | Discipline baked into the persona |
|---|---|---|
| **iOS** | Objective-C, Swift, C/C++ | Do not switch languages (no ObjC→Swift ports), no new pods/packages for a bug fix; get real compiler answers from the `lsp_*` tools (clangd for `.m/.mm/.h/.c/.cpp`, sourcekit-lsp for `.swift`); build with `ios_sim_build_run` and read the xcodebuild error tail; **never hand-edit `.xcodeproj/.pbxproj`**; drive UI through `ios_sim_*` and confirm every action with `expect_text` / `expect_gone` |
| **Android** | Kotlin, Java, C/C++ (NDK) | Kotlin-first in new code but **match the module you are in** (no incidental Java→Kotlin rewrites, no View→Compose migration as a side effect); build with the project's own `./gradlew` and read Gradle failures; dependencies live in `build.gradle(.kts)` / version catalogs, not dropped-in jars; **never hand-edit generated files** (merged manifest, BuildConfig, R, `build/`, the wrapper); runtime evidence comes from the device loop (`adb install` / `am start` + logcat) |
| **HarmonyOS** | ArkTS, C/C++ (Native API), legacy JS/FA | Take platform APIs from official, version-classified sources (`hms_api` / `hms_docs` / `hms_api_change` / `hms_knowledge`) and state the target version; prefer ArkTS in new code; `arkts_check` → `build_project` as the verify loop; `hdc_log` for device logs; the `hdc-bridge` observe → locate → act → verify device loop; **never hand-edit hvigor/ohpm output** |

Shared rules: conservative production changes (no new dependency, permission, entitlement or build configuration without asking), never touch vendored or generated code (`Pods/`, `oh_modules/`, `.gradle/`, `build/`, `*.pbxproj`), and — because the active model may be text-only — send device and UI screenshots to `modlens_read_image` for structured evidence rather than `read_image`.

Workspace markers the preset dispatches on:

```
oh-package.json5 + hvigorfile.ts + *.ets                              -> HarmonyOS
*.xcodeproj | *.xcworkspace + Podfile | Package.swift + *.m/*.swift   -> iOS
settings.gradle(.kts) | build.gradle(.kts) + AndroidManifest.xml + *.kt/*.java -> Android
```

The tool set is **identical to the shipped `standard` preset** (files, shell, search, web, skills, plan, goals, subagents, workflows). Only the persona differs — the preset changes who the agent is and how it works, never how much it can do.

## Companion plugins (optional)

The capabilities the persona names come from **other plugins / host rows**, not from this package. Without them the preset still runs — those specific tools are just absent:

| For | Install |
|---|---|
| `lsp_*` code intelligence (clangd / sourcekit-lsp / tsc) | `dsh-lsp-actions`, with a `servers` table in the profile's `cordis.patch.yml` |
| iOS simulator/device loop (`ios_sim_*`, `ios_real_start_wda`) | `@zseven-w/dsh-ios` (macOS + full Xcode) |
| HarmonyOS device loop (`hdc_*`) and HarmonyOS NEXT skills | `dsh-hdc-bridge`, `github:linhay/harmony-next.skills` |
| Vision for a text-only model (screenshot evidence) | `@liustack/modlens` |
| `arkts_check` / `build_project` / `hms_*` | provided by the deployment's DevEco / deveco-cli toolchain |

## Update and removal

- **Update**: `dsh plugin --profile web update dsh-app-native`, then restart. Note the installer **never overwrites** an existing `$DSH_HOME/.agent-presets/app-native/` that already holds an `agent.cordis.yml`, so your local edits survive. To take the packaged version instead, delete that directory and restart.
- **Remove**: `dsh plugin --profile web remove dsh-app-native`. The preset files are **not** deleted for you — they live in your own home directory. Delete `$DSH_HOME/.agent-presets/app-native/` when you no longer want them.
- **Switching**: a preset can only be chosen on a **new** session, or one that has produced nothing yet (no messages, no tool calls); a running session keeps the composition it started with.
- **Rename or disable**: set `presetId` or `installPreset: false` on the host row's config.

## Consistency

The preset composition is **byte-identical to the shipped `standard` preset except for the persona block**, and it passes `agentPresets.standingKeyFor()` mount validation (the same mount a session start performs). The `preset/app-native/` directory in this package is exactly what gets installed.

## License

MIT
