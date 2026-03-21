import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeWolfBlock } from './index.js';

let tmpDir: string;
let rcFile: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wolf-env-test-'));
  rcFile = path.join(tmpDir, '.zshrc');
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('writeWolfBlock', () => {
  it('creates the RC file with a commented block if it does not exist', async () => {
    await writeWolfBlock(rcFile, [
      { key: 'WOLF_ANTHROPIC_API_KEY', value: 'sk-test' },
    ]);

    const content = await fs.readFile(rcFile, 'utf-8');
    expect(content).toContain('# wolf API keys');
    expect(content).toContain('export WOLF_ANTHROPIC_API_KEY=sk-test');
  });

  it('appends a blank line before the block and after', async () => {
    await fs.writeFile(rcFile, 'export PATH=/usr/bin\n', 'utf-8');

    await writeWolfBlock(rcFile, [
      { key: 'WOLF_ANTHROPIC_API_KEY', value: 'sk-test' },
    ]);

    const content = await fs.readFile(rcFile, 'utf-8');
    // The block should be separated from existing content
    expect(content).toContain('\n\n# wolf API keys\n');
    expect(content.endsWith('\n')).toBe(true);
  });

  it('updates an existing key in-place without duplicating it', async () => {
    await fs.writeFile(rcFile, '# wolf API keys\nexport WOLF_ANTHROPIC_API_KEY=old-key\n', 'utf-8');

    await writeWolfBlock(rcFile, [
      { key: 'WOLF_ANTHROPIC_API_KEY', value: 'new-key' },
    ]);

    const content = await fs.readFile(rcFile, 'utf-8');
    expect(content).toContain('export WOLF_ANTHROPIC_API_KEY=new-key');
    expect(content).not.toContain('old-key');
    // Should not duplicate the key
    const occurrences = (content.match(/WOLF_ANTHROPIC_API_KEY/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  it('appends only new keys, updates existing ones', async () => {
    await fs.writeFile(rcFile, '# wolf API keys\nexport WOLF_ANTHROPIC_API_KEY=existing\n', 'utf-8');

    await writeWolfBlock(rcFile, [
      { key: 'WOLF_ANTHROPIC_API_KEY', value: 'updated' },
      { key: 'WOLF_APIFY_API_TOKEN', value: 'apify-new' },
    ]);

    const content = await fs.readFile(rcFile, 'utf-8');
    expect(content).toContain('export WOLF_ANTHROPIC_API_KEY=updated');
    expect(content).toContain('export WOLF_APIFY_API_TOKEN=apify-new');
    expect(content).not.toContain('existing');
  });

  it('writes all 4 keys in a single block', async () => {
    await writeWolfBlock(rcFile, [
      { key: 'WOLF_ANTHROPIC_API_KEY', value: 'k1' },
      { key: 'WOLF_APIFY_API_TOKEN', value: 'k2' },
      { key: 'WOLF_GMAIL_CLIENT_ID', value: 'k3' },
      { key: 'WOLF_GMAIL_CLIENT_SECRET', value: 'k4' },
    ]);

    const content = await fs.readFile(rcFile, 'utf-8');
    // Only one comment header
    const headers = (content.match(/# wolf API keys/g) ?? []).length;
    expect(headers).toBe(1);
    expect(content).toContain('export WOLF_ANTHROPIC_API_KEY=k1');
    expect(content).toContain('export WOLF_APIFY_API_TOKEN=k2');
    expect(content).toContain('export WOLF_GMAIL_CLIENT_ID=k3');
    expect(content).toContain('export WOLF_GMAIL_CLIENT_SECRET=k4');
  });
});
