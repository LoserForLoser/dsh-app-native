/**
 * dsh-app-native test suite — no framework, no network, no real harness boot.
 *
 * Every check runs against a throwaway `$DSH_HOME` in the system temp directory,
 * so the installer's real behaviour (skip, partial recovery, unwritable home) is
 * exercised without touching the user's preset root.
 *
 * Run with `npm test` (or `node test/run-test.mjs`).
 */

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apply, installPreset, isPresetInstalled, name, resolveDshHome } from '../lib/index.js'

let passed = 0
const failures = []

/** Run one named check; a throw is recorded instead of aborting the suite. */
function check(label, fn) {
	try {
		fn()
		passed += 1
		console.log(`  ok   ${label}`)
	} catch (error) {
		failures.push(`${label}: ${error.message}`)
		console.log(`  FAIL ${label}\n         ${error.message}`)
	}
}

/** Run one asynchronous check. */
async function checkAsync(label, fn) {
	try {
		await fn()
		passed += 1
		console.log(`  ok   ${label}`)
	} catch (error) {
		failures.push(`${label}: ${error.message}`)
		console.log(`  FAIL ${label}\n         ${error.message}`)
	}
}

/** The preset directory shipped inside this package. */
const PACKAGED_DIR = fileURLToPath(new URL('../preset/app-native/', import.meta.url))

/**
 * The harness logger takes printf-style format strings (`log.info('x %s', v)`),
 * so the stub renders them the same way instead of joining raw arguments —
 * otherwise an assertion about the message text would be testing this file.
 */
function format(args) {
	const [template, ...values] = args
	let index = 0
	return String(template).replace(/%[sdio]/gu, () => String(values[index++]))
}

/** A logger that records instead of printing, and answers the calls the row makes. */
function makeCtx() {
	const records = { info: [], warn: [] }
	return {
		records,
		ctx: {
			logger: {
				info: (...args) => records.info.push(format(args)),
				warn: (...args) => records.warn.push(format(args)),
			},
		},
	}
}

/**
 * Wait for a condition that a fire-and-forget install satisfies asynchronously.
 *
 * `apply()` starts `installPreset()` without awaiting it, and the install awaits
 * real filesystem I/O — a fixed number of microtask turns is not a bound on that,
 * so poll instead (and fail loudly rather than silently testing too early).
 */
async function waitFor(predicate, label, timeoutMs = 4000) {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		if (await predicate()) return
		await new Promise((resolve) => setTimeout(resolve, 20))
	}
	throw new Error(`timed out after ${timeoutMs}ms waiting for ${label}`)
}

/** Point $DSH_HOME at one directory for the duration of a callback. */
async function withDshHome(home, fn) {
	const previous = process.env.DSH_HOME
	process.env.DSH_HOME = home
	try {
		return await fn()
	} finally {
		if (previous === undefined) delete process.env.DSH_HOME
		else process.env.DSH_HOME = previous
	}
}

console.log('\n# module surface')
check('exports the cordis plugin name and entry points', () => {
	assert.equal(name, 'app-native-preset-installer')
	for (const key of ['apply', 'installPreset', 'isPresetInstalled', 'resolveDshHome']) {
		assert.ok(typeof { apply, installPreset, isPresetInstalled, resolveDshHome }[key] === 'function', `${key} must be a function`)
	}
})

check('resolveDshHome prefers $DSH_HOME and falls back to ~/.dsh', () => {
	const previous = process.env.DSH_HOME
	try {
		process.env.DSH_HOME = '/tmp/some-home'
		assert.equal(resolveDshHome(), '/tmp/some-home')
		delete process.env.DSH_HOME
		assert.equal(resolveDshHome(), join(homedir(), '.dsh'))
	} finally {
		if (previous !== undefined) process.env.DSH_HOME = previous
	}
})

console.log('\n# packaged preset integrity')
check('the packaged preset is complete', () => {
	for (const file of ['agent.cordis.yml', 'preset.yml']) {
		assert.ok(existsSync(join(PACKAGED_DIR, file)), `${file} must ship with the package`)
	}
})

check('preset.yml declares a display name, description and order', () => {
	const text = readFileSync(join(PACKAGED_DIR, 'preset.yml'), 'utf8')
	assert.match(text, /^name: \S/m)
	assert.match(text, /^description: \S/m)
	assert.match(text, /^order: \d+/m)
})

check('the composition still covers every advertised native stack', () => {
	// Guards against a truncated persona: the preset's whole promise is that one
	// preset covers iOS, Android and HarmonyOS across their native languages.
	const text = readFileSync(join(PACKAGED_DIR, 'agent.cordis.yml'), 'utf8')
	for (const marker of ['Objective-C', 'Swift', 'Kotlin', 'Java', 'ArkTS', 'HarmonyOS', 'Android', 'iOS']) {
		assert.ok(text.includes(marker), `the composition must mention ${marker}`)
	}
	assert.equal(text.includes('- id: persona'), true, 'the composition must mount the persona row')
})

console.log('\n# install')

const home = mkdtempSync(join(tmpdir(), 'dan-home-'))

// Temp homes created by the apply() checks, removed together at the very end:
// rmSync inside each `finally` races the fire-and-forget install that apply()
// starts, so cleanup could delete a directory the copy is still writing into
// (an ENOENT/chmod warning caused by the test, not by the row).
const transient = []

try {
	await checkAsync('a missing preset directory is not reported as installed', async () => {
		assert.equal(await isPresetInstalled(join(home, 'nope')), false)
	})

	await checkAsync('a partial copy is NOT mistaken for an installed preset', async () => {
		const partial = join(home, 'partial')
		mkdirSync(partial, { recursive: true })
		writeFileSync(join(partial, 'preset.yml'), 'name: half\n', 'utf8')
		assert.equal(await isPresetInstalled(partial), false)
	})

	await checkAsync('installPreset copies the packaged preset byte for byte', async () => {
		await withDshHome(home, async () => {
			const { ctx, records } = makeCtx()
			await installPreset(ctx, 'app-native')
			const target = join(home, '.agent-presets/app-native')
			for (const file of ['agent.cordis.yml', 'preset.yml']) {
				assert.equal(
					readFileSync(join(target, file), 'utf8'),
					readFileSync(join(PACKAGED_DIR, file), 'utf8'),
					`${file} must match the packaged copy`,
				)
			}
			assert.equal(records.warn.length, 0, 'a clean install must not warn')
			assert.match(records.info.join('\n'), /installed preset "app-native"/)
		})
	})

	await checkAsync('a second install is idempotent and preserves local edits', async () => {
		await withDshHome(home, async () => {
			const target = join(home, '.agent-presets/app-native/agent.cordis.yml')
			const edited = `${readFileSync(target, 'utf8')}\n# local edit\n`
			writeFileSync(target, edited, 'utf8')
			const { ctx, records } = makeCtx()
			await installPreset(ctx, 'app-native')
			assert.equal(readFileSync(target, 'utf8'), edited, 'a local edit must survive the upgrade')
			assert.match(records.info.join('\n'), /already present/)
		})
	})

	await checkAsync('a partial install is completed on retry', async () => {
		await withDshHome(home, async () => {
			const target = join(home, '.agent-presets/retry')
			mkdirSync(target, { recursive: true })
			writeFileSync(join(target, 'preset.yml'), 'name: half\n', 'utf8')
			const { ctx } = makeCtx()
			await installPreset(ctx, 'retry')
			assert.equal(await isPresetInstalled(target), true, 'the composition file must be recovered')
		})
	})

	await checkAsync('an unusable home warns instead of failing the boot', async () => {
		const blocker = join(home, 'blocker')
		writeFileSync(blocker, 'not a directory\n', 'utf8')
		await withDshHome(join(blocker, 'nested'), async () => {
			const { ctx, records } = makeCtx()
			await installPreset(ctx, 'app-native') // must not throw
			assert.equal(records.warn.length, 1, 'exactly one warning')
			assert.match(records.warn[0], /failed to install preset "app-native"/)
			assert.match(records.warn[0], /manually/, 'the warning must carry the manual fallback')
		})
	})

	console.log('\n# apply()')

	await checkAsync('apply installs the default preset id', async () => {
		const fresh = mkdtempSync(join(tmpdir(), 'dan-apply-'))
		transient.push(fresh)
		{
			await withDshHome(fresh, async () => {
				const { ctx } = makeCtx()
				apply(ctx)
				await waitFor(
					() => isPresetInstalled(join(fresh, '.agent-presets/app-native')),
					'the default preset id to land',
				)
				assert.equal(await isPresetInstalled(join(fresh, '.agent-presets/app-native')), true)
			})
		}
	})

	await checkAsync('config.presetId relocates the install', async () => {
		const fresh = mkdtempSync(join(tmpdir(), 'dan-id-'))
		transient.push(fresh)
		{
			await withDshHome(fresh, async () => {
				const { ctx } = makeCtx()
				apply(ctx, { presetId: 'my-native' })
				await waitFor(
					() => isPresetInstalled(join(fresh, '.agent-presets/my-native')),
					'the relocated preset id to land',
				)
				assert.equal(await isPresetInstalled(join(fresh, '.agent-presets/my-native')), true)
				assert.equal(existsSync(join(fresh, '.agent-presets/app-native')), false)
			})
		}
	})

	await checkAsync('config.installPreset: false installs nothing', async () => {
		const fresh = mkdtempSync(join(tmpdir(), 'dan-off-'))
		transient.push(fresh)
		{
			await withDshHome(fresh, async () => {
				const { ctx } = makeCtx()
				apply(ctx, { installPreset: false })
				await new Promise((resolve) => setTimeout(resolve, 150))
				assert.equal(existsSync(join(fresh, '.agent-presets')), false)
			})
		}
	})

	await checkAsync('apply without a logger still installs (console fallback)', async () => {
		const fresh = mkdtempSync(join(tmpdir(), 'dan-nolog-'))
		transient.push(fresh)
		{
			await withDshHome(fresh, async () => {
				const original = console.info
				console.info = () => undefined
				try {
					apply({})
					await waitFor(
						() => isPresetInstalled(join(fresh, '.agent-presets/app-native')),
						'the console-fallback install to land',
					)
				} finally {
					console.info = original
				}
				assert.equal(await isPresetInstalled(join(fresh, '.agent-presets/app-native')), true)
			})
		}
	})
} finally {
	rmSync(home, { recursive: true, force: true })
}

// Let every fire-and-forget install finish before removing its home.
await new Promise((resolve) => setTimeout(resolve, 200))
for (const dir of transient) {
	rmSync(dir, { recursive: true, force: true })
}

console.log(`\n${passed} passed, ${failures.length} failed`)
if (failures.length > 0) {
	console.log('\nFailures:')
	for (const failure of failures) console.log(`- ${failure}`)
	process.exitCode = 1
}
