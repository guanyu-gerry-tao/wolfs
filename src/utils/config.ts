import fs from 'node:fs/promises';
import path from 'node:path';
import { parse, stringify } from 'smol-toml';
import type { AppConfig } from '../types/index.js';

/** Path to the wolf config file in the current workspace. */
const CONFIG_PATH = path.join(process.cwd(), 'wolf.toml');

/**
 * Loads the user config from `wolf.toml` in the current working directory.
 *
 * @throws If `wolf.toml` does not exist — run `wolf init` first.
 * @throws If the file cannot be parsed.
 */
export async function loadConfig(): Promise<AppConfig> {
  let raw: string;
  try {
    raw = await fs.readFile(CONFIG_PATH, 'utf-8');
  } catch {
    throw new Error('wolf.toml not found. Run wolf init to set up your workspace.');
  }
  return parse(raw) as unknown as AppConfig;
}

/**
 * Writes the given config to `wolf.toml` in the current working directory.
 *
 * @param config - The full config object to persist.
 */
export async function saveConfig(config: AppConfig): Promise<void> {
  await fs.writeFile(CONFIG_PATH, stringify(config as unknown as Record<string, unknown>), 'utf-8');
}

/**
 * Rotates wolf.toml backups before an overwrite, keeping up to 5 copies.
 *
 * Backup numbering: wolf.toml.backup1 is always the most recent.
 * On each call: backup4 → backup5, backup3 → backup4, ..., wolf.toml → backup1.
 *
 * Call this before saveConfig() whenever you are overwriting an existing config.
 */
export async function backupConfig(): Promise<void> {
  for (let i = 4; i >= 1; i--) {
    const src = `${CONFIG_PATH}.backup${i}`;
    const dst = `${CONFIG_PATH}.backup${i + 1}`;
    try { await fs.rename(src, dst); } catch { /* slot empty, skip */ }
  }
  try { await fs.copyFile(CONFIG_PATH, `${CONFIG_PATH}.backup1`); } catch { /* no wolf.toml yet */ }
}
