import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { confirm, input } from '@inquirer/prompts';

const WOLF_KEYS = [
  'WOLF_ANTHROPIC_API_KEY',
  'WOLF_APIFY_API_TOKEN',
  'WOLF_GMAIL_CLIENT_ID',
  'WOLF_GMAIL_CLIENT_SECRET',
] as const;

type WolfKey = (typeof WOLF_KEYS)[number];

const KEY_DESCRIPTIONS: Record<WolfKey, string> = {
  WOLF_ANTHROPIC_API_KEY:  'Anthropic API Key  (AI scoring/tailoring, required)',
  WOLF_APIFY_API_TOKEN:    'Apify API Token    (LinkedIn scraping, optional)',
  WOLF_GMAIL_CLIENT_ID:    'Gmail Client ID    (email outreach, optional)',
  WOLF_GMAIL_CLIENT_SECRET:'Gmail Client Secret(email outreach, optional)',
};

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;

/** Mask all but the last 4 characters of a secret value. */
function mask(value: string): string {
  if (value.length <= 4) return '****';
  return '*'.repeat(Math.min(value.length - 4, 12)) + value.slice(-4);
}

/**
 * Detect the shell RC file to write to based on $SHELL.
 * Falls back to ~/.zshrc if unknown.
 */
function detectRcFile(): string {
  const shell = process.env.SHELL ?? '';
  if (shell.includes('bash')) {
    // prefer .bash_profile on Mac, .bashrc on Linux
    return process.platform === 'darwin'
      ? path.join(os.homedir(), '.bash_profile')
      : path.join(os.homedir(), '.bashrc');
  }
  return path.join(os.homedir(), '.zshrc');
}

/**
 * Write or update all WOLF_* keys in the RC file.
 *
 * If a `# wolf API keys` block already exists, the individual lines within it
 * are updated in-place. Otherwise, a new block is appended:
 *
 *   (blank line)
 *   # wolf API keys
 *   export WOLF_ANTHROPIC_API_KEY=...
 *   ...
 *   (blank line)
 */
async function writeWolfBlock(rcFile: string, entries: { key: string; value: string }[]): Promise<void> {
  let content = '';
  try {
    content = await fs.readFile(rcFile, 'utf-8');
  } catch { /* file doesn't exist yet, will create */ }

  // Update any keys that already exist in the file
  let updated = content;
  const toAppend: { key: string; value: string }[] = [];

  for (const { key, value } of entries) {
    const regex = new RegExp(`^export\\s+${key}=.*$`, 'm');
    if (regex.test(updated)) {
      updated = updated.replace(regex, `export ${key}=${value}`);
    } else {
      toAppend.push({ key, value });
    }
  }

  // Append new keys as a single block
  if (toAppend.length > 0) {
    const block = [
      '',
      '# wolf API keys',
      ...toAppend.map(({ key, value }) => `export ${key}=${value}`),
      '',
    ].join('\n');
    updated = updated.trimEnd() + '\n' + block;
  }

  await fs.writeFile(rcFile, updated, 'utf-8');
}

/**
 * Lists all WOLF_* environment variables and whether they are set.
 * Values are masked for security.
 */
export function envShow(): void {
  console.log(`\n${bold('WOLF_ environment variables:')}\n`);
  for (const key of WOLF_KEYS) {
    const value = process.env[key];
    if (value) {
      console.log(`  ${green('✓')} ${bold(key)}=${mask(value)}`);
    } else {
      console.log(`  ${red('✗')} ${dim(key)}  ${dim('(not set)')}`);
    }
  }
  console.log('');
}

/**
 * Interactively prompts for WOLF_* API keys and writes them to the shell RC file.
 * On Windows, prints manual instructions instead.
 */
export async function envSet(): Promise<void> {
  if (process.platform === 'win32') {
    console.log(`\n${bold('To set WOLF_ keys on Windows:')}`);
    console.log('  1. Open: Settings → System → Advanced system settings → Environment Variables');
    console.log('  2. Add each WOLF_* key to the User section');
    console.log('  3. Restart your terminal\n');
    return;
  }

  const rcFile = detectRcFile();
  console.log(`\n${bold('Set up API keys')} ${dim(`(will be written to ${rcFile})`)}`);
  console.log(dim('Leave blank to skip.\n'));

  const toWrite: { key: string; value: string }[] = [];

  for (const key of WOLF_KEYS) {
    const current = process.env[key];
    const description = KEY_DESCRIPTIONS[key];
    const value = await input({
      message: `${description}:`,
      default: '',
      ...(current ? { default: current } : {}),
    });
    if (value.trim()) {
      toWrite.push({ key, value: value.trim() });
    }
  }

  if (toWrite.length === 0) {
    console.log(dim('\nNo keys entered. Nothing written.\n'));
    return;
  }

  await writeWolfBlock(rcFile, toWrite);
  for (const { key } of toWrite) {
    console.log(`  ${green('✓')} ${key}`);
  }

  console.log(`
${bold('Written to')} ${rcFile}

Restart your terminal to apply, or run:
  ${bold(`source ${rcFile}`)}

Then verify with: ${bold('wolf env show')}
`);
}

/** Shell RC files to search, in priority order. */
const RC_FILES = [
  path.join(os.homedir(), '.zshrc'),
  path.join(os.homedir(), '.zprofile'),
  path.join(os.homedir(), '.bash_profile'),
  path.join(os.homedir(), '.bashrc'),
  path.join(os.homedir(), '.profile'),
];

/**
 * Removes all WOLF_* export lines from shell RC files and instructs the user
 * to reload their shell. On Windows (no RC files), prints manual instructions.
 */
export async function envClear(): Promise<void> {
  if (process.platform === 'win32') {
    console.log(`\n${bold('To remove WOLF_ keys on Windows:')}`);
    console.log('  1. Open: Settings → System → Advanced system settings → Environment Variables');
    console.log('  2. Delete each WOLF_* variable from the User section\n');
    return;
  }

  const matches: { file: string; lines: string[] }[] = [];
  for (const rc of RC_FILES) {
    let content: string;
    try {
      content = await fs.readFile(rc, 'utf-8');
    } catch {
      continue;
    }
    const wolfLines = content
      .split('\n')
      .filter(l => /^export\s+WOLF_/.test(l.trim()));
    if (wolfLines.length > 0) {
      matches.push({ file: rc, lines: wolfLines });
    }
  }

  if (matches.length === 0) {
    console.log('\nNo WOLF_* export lines found in shell RC files.\n');
    console.log(dim('If you set them another way (e.g. /etc/environment), remove them manually.\n'));
    return;
  }

  console.log(`\n${bold('Found WOLF_* exports in:')}\n`);
  for (const { file, lines } of matches) {
    console.log(`  ${file}`);
    for (const line of lines) {
      console.log(`    ${dim(line)}`);
    }
  }
  console.log('');

  const confirmed = await confirm({
    message: red('Remove all WOLF_* export lines from the files above?'),
    default: false,
  });
  if (!confirmed) {
    console.log('Cancelled.\n');
    return;
  }

  for (const { file } of matches) {
    const content = await fs.readFile(file, 'utf-8');
    const cleaned = content
      .split('\n')
      .filter(l => !/^export\s+WOLF_/.test(l.trim()))
      .join('\n');
    await fs.writeFile(file, cleaned, 'utf-8');
    console.log(`  ${green('✓')} Cleaned ${file}`);
  }

  console.log(`
${bold('Done.')} Reload your shell to apply:
  ${bold('source ~/.zshrc')}

Current session still has the keys in memory — open a new terminal to fully clear them.
`);
}
