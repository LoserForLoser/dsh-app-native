/**
 * dsh-app-native — cordis plugin row for the dsh-app-native bundle.
 *
 * The single host row of this bundle. Its only job is to install the packaged
 * `preset/app-native/` directory (the APP原生开发 mobile-native-development agent
 * preset) into `$DSH_HOME/.agent-presets/app-native/`, so the preset becomes
 * selectable in the preset picker of every profile once the bundle is installed
 * with `dsh plugin add`.
 *
 * Zero runtime dependencies: everything comes from Node builtins, so the bundle
 * activates in any profile without extra packages.
 *
 * Idempotent and best-effort, mirroring the pattern `dsh-learning-mode` uses:
 *
 * - a target directory that already holds a preset (an `agent.cordis.yml`) is
 *   left untouched, so local edits survive an upgrade — and a *partial* copy is
 *   not mistaken for an installed preset, so a failed install can be retried by
 *   restarting the profile;
 * - a failure logs a warning with manual install instructions instead of
 *   failing the boot.
 *
 * The row contributes nothing to the tool catalog and needs no services.
 *
 * @module dsh-app-native
 */
import { access, cp, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Cordis plugin name (diagnostics only). */
const name = "app-native-preset-installer";

/** Default preset id, i.e. the directory name under `$DSH_HOME/.agent-presets/`. */
const DEFAULT_PRESET_ID = "app-native";

/** The packaged preset directory, resolved next to this module. */
const PACKAGED_PRESET_DIR = fileURLToPath(new URL("../preset/app-native/", import.meta.url));

/**
 * Resolve the harness home the way `@deepseek-ai/dsh-home-paths` does:
 * `$DSH_HOME` when set, otherwise `~/.dsh`.
 *
 * @returns the harness home directory.
 */
function resolveDshHome() {
	return process.env.DSH_HOME ?? join(homedir(), ".dsh");
}

/**
 * Whether a preset is already installed at one target directory.
 *
 * Requires the composition file rather than the bare directory, so a directory
 * left behind by an interrupted copy does not block a later retry.
 *
 * @param targetDir - the preset directory to test.
 * @returns true when `agent.cordis.yml` is readable there.
 */
async function isPresetInstalled(targetDir) {
	try {
		await access(join(targetDir, "agent.cordis.yml"));
		return true;
	} catch {
		return false;
	}
}

/**
 * Install the packaged preset into `$DSH_HOME/.agent-presets/<presetId>/`.
 *
 * Best-effort by design: an already-installed preset is skipped, and any failure
 * is reported through the logger (with the manual fallback) rather than thrown,
 * so a read-only or unusual home never breaks the boot.
 *
 * @param ctx - the Cordis context owning this row.
 * @param presetId - the directory name to install under.
 * @returns a promise that settles once the install attempt finished.
 */
async function installPreset(ctx, presetId) {
	const log = ctx.logger ?? console;
	const targetDir = join(resolveDshHome(), ".agent-presets", presetId);
	if (await isPresetInstalled(targetDir)) {
		log.info('dsh-app-native: preset "%s" is already present at %s, skipping install', presetId, targetDir);
		return;
	}
	try {
		await mkdir(targetDir, { recursive: true });
		await cp(PACKAGED_PRESET_DIR, targetDir, { recursive: true });
		log.info('dsh-app-native: installed preset "%s" to %s', presetId, targetDir);
	} catch (error) {
		log.warn(
			'dsh-app-native: failed to install preset "%s" to %s (%s); copy this package\'s preset/app-native/ directory there manually to enable 移动端原生开发',
			presetId,
			targetDir,
			error instanceof Error ? error.message : String(error),
		);
	}
}

/**
 * Cordis plugin entry. `config.presetId` overrides the installed directory name;
 * `config.installPreset: false` skips the install entirely.
 *
 * @param ctx - the Cordis context.
 * @param config - optional row configuration.
 */
function apply(ctx, config = {}) {
	const presetId = config.presetId ?? DEFAULT_PRESET_ID;
	const install = config.installPreset ?? true;
	if (install) void installPreset(ctx, presetId);
}

export { apply, installPreset, isPresetInstalled, name, resolveDshHome };
