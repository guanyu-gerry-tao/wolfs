/**
 * fs-helpers.ts — Filesystem utility helpers.
 *
 * Provides path construction helpers for wolf's data directory structure:
 *
 *   data/
 *   └── <profileId>_<profileLabel>/
 *       ├── resume_pool.md
 *       ├── style_ref.jpg
 *       ├── general_resume/
 *       ├── general_cl/
 *       └── <company>_<title>_<jobId>/
 *           ├── resume.tex / resume.pdf / resume.png
 *           ├── jd.txt
 *           ├── tailor_notes.md
 *           └── snapshots/
 */

import path from 'node:path';

/**
 * Converts a human-readable string into a URL/filesystem-safe slug.
 * - Lowercases the string
 * - Replaces spaces and underscores with hyphens
 * - Removes all characters that are not alphanumeric or hyphens
 * - Collapses consecutive hyphens
 * - Trims trailing hyphens
 * - Truncates to 30 characters
 *
 * @example
 * slugify("Software Engineer") // "software-engineer"
 * slugify("Google Inc.")       // "google-inc"
 * slugify("TikTok_US")         // "tiktok-us"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 30)
    .replace(/-+$/, '');
}

/**
 * Returns the profile directory name: "<profileId>_<slug(label)>"
 */
export function profileDirName(profileId: string, profileLabel: string): string {
  return `${profileId}_${slugify(profileLabel)}`;
}

/**
 * Returns the job directory name: "<slug(company)>_<slug(title)>_<jobId>"
 */
export function jobDirName(company: string, title: string, jobId: string): string {
  return `${slugify(company)}_${slugify(title)}_${jobId}`;
}

/**
 * Returns the absolute path to a profile's data directory.
 */
export function profileDir(workspaceDir: string, profileId: string, profileLabel: string): string {
  return path.join(workspaceDir, 'data', profileDirName(profileId, profileLabel));
}

/**
 * Returns the absolute path to the general_resume output directory for a profile.
 */
export function generalResumeDir(workspaceDir: string, profileId: string, profileLabel: string): string {
  return path.join(profileDir(workspaceDir, profileId, profileLabel), 'general_resume');
}

/**
 * Returns the absolute path to the general_cl output directory for a profile.
 */
export function generalClDir(workspaceDir: string, profileId: string, profileLabel: string): string {
  return path.join(profileDir(workspaceDir, profileId, profileLabel), 'general_cl');
}

/**
 * Returns the absolute path to a job's output directory.
 */
export function jobOutputDir(
  workspaceDir: string,
  profileId: string,
  profileLabel: string,
  company: string,
  title: string,
  jobId: string,
): string {
  return path.join(
    profileDir(workspaceDir, profileId, profileLabel),
    jobDirName(company, title, jobId),
  );
}

/**
 * Returns the absolute path to the snapshots directory inside a job output dir.
 */
export function jobSnapshotsDir(jobDir: string): string {
  return path.join(jobDir, 'snapshots');
}

/**
 * Returns the absolute path to resume_pool.md for a profile.
 */
export function resumeTxtPath(workspaceDir: string, profileId: string, profileLabel: string): string {
  return path.join(profileDir(workspaceDir, profileId, profileLabel), 'resume_pool.md');
}

/**
 * Returns the absolute path to style_ref.jpg for a profile.
 */
export function styleRefPath(workspaceDir: string, profileId: string, profileLabel: string): string {
  return path.join(profileDir(workspaceDir, profileId, profileLabel), 'style_ref.jpg');
}
