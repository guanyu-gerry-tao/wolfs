/**
 * resume-snapshot.ts — Resume asset versioning via content hash.
 *
 * Snapshots are stored per-job under:
 *   data/<profileDir>/<jobDir>/snapshots/
 *
 * Each snapshot is named by asset type + first 8 chars of SHA-256:
 *   resume_<hash>.txt    — resume.txt version used at tailor time
 *   style_<hash>.jpg     — style_ref.jpg version used (optional)
 *   template_<hash>.tex  — general resume.tex version used
 *
 * Users never interact with this directly — it runs silently on every tailor call.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export type SnapshotType = 'txt' | 'jpg' | 'tex';

function snapshotFilename(type: SnapshotType, hash: string): string {
  switch (type) {
    case 'txt': return `resume_${hash}.txt`;
    case 'jpg': return `style_${hash}.jpg`;
    case 'tex': return `template_${hash}.tex`;
  }
}

/**
 * Hashes the contents of a file (first 8 hex chars of SHA-256).
 */
async function hashFile(filePath: string): Promise<string> {
  const contents = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(contents).digest('hex').slice(0, 8);
}

/**
 * Saves a snapshot of the given file into the specified snapshots directory.
 * If a snapshot with the same content hash already exists, it is reused.
 *
 * @param filePath      - Absolute path to the source file
 * @param type          - Asset type ('txt' | 'jpg' | 'tex')
 * @param snapshotsDir  - Absolute path to the target snapshots directory
 * @returns The snapshot filename, e.g. "resume_a3f2c1.txt"
 */
export async function snapshotAsset(
  filePath: string,
  type: SnapshotType,
  snapshotsDir: string,
): Promise<string> {
  const hash = await hashFile(filePath);
  const filename = snapshotFilename(type, hash);
  const snapshotPath = path.join(snapshotsDir, filename);

  try {
    await fs.access(snapshotPath);
    // Already exists — reuse
  } catch {
    await fs.mkdir(snapshotsDir, { recursive: true });
    await fs.copyFile(filePath, snapshotPath);
  }

  return filename;
}

/**
 * Checks whether a file exists at the given path.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
