/**
 * db.ts — Local SQLite database access layer.
 *
 * All wolf commands read and write through this module.
 * No command should import better-sqlite3 directly — use these functions instead.
 *
 * Database file: <workspace>/data/wolf.sqlite
 * Created automatically on first use.
 *
 * ## Schema overview
 *
 * companies
 *   id TEXT PRIMARY KEY        -- uuid
 *   name TEXT NOT NULL
 *   domain TEXT                -- used by reach to infer email patterns
 *   size TEXT                  -- CompanySize enum value
 *   createdAt TEXT NOT NULL
 *   updatedAt TEXT NOT NULL
 *
 * jobs
 *   id TEXT PRIMARY KEY        -- uuid
 *   title TEXT NOT NULL
 *   companyId TEXT NOT NULL    -- FK → companies.id
 *   url TEXT NOT NULL
 *   source TEXT NOT NULL       -- provider name, e.g. "linkedin", "api", "manual"
 *   description TEXT NOT NULL  -- full JD text
 *   location TEXT NOT NULL
 *   remote INTEGER NOT NULL    -- 0 or 1
 *   salary TEXT                -- JSON: number | "unpaid" | null
 *   workAuthorizationRequired TEXT
 *   score REAL                 -- null if unscored
 *   scoreJustification TEXT    -- AI explanation of score
 *   status TEXT NOT NULL       -- JobStatus value
 *   appliedProfileId TEXT
 *   tailoredResumePath TEXT
 *   tailoredResumePdfPath TEXT
 *   coverLetterPath TEXT
 *   coverLetterPdfPath TEXT
 *   screenshotPath TEXT
 *   outreachDraftPath TEXT
 *   createdAt TEXT NOT NULL
 *   updatedAt TEXT NOT NULL
 *
 * batches
 *   id TEXT PRIMARY KEY        -- uuid (local)
 *   batchId TEXT NOT NULL      -- provider-assigned batch ID (Anthropic or OpenAI)
 *   type TEXT NOT NULL         -- "score" | "tailor" | ...
 *   aiProvider TEXT NOT NULL   -- "anthropic" | "openai"
 *   profileId TEXT NOT NULL    -- which profile was active when the batch was submitted
 *   status TEXT NOT NULL       -- "pending" | "completed" | "failed" | "partial_failed"
 *   submittedAt TEXT NOT NULL
 *   completedAt TEXT           -- null until done
 */

import type { Job, JobQuery, JobUpdate, JobStatus } from '../types/index.js';
import type { Company } from '../types/index.js';

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Opens (or creates) the SQLite database at <workspace>/data/wolf.sqlite.
 * Creates all tables if they do not exist.
 * Must be called once before any other db function.
 *
 * @param workspaceDir - Absolute path to the workspace directory (process.cwd()).
 * @throws If the data/ directory cannot be created or the database cannot be opened.
 */
export async function initDb(workspaceDir: string): Promise<void> {
  // TODO(M2):
  // 1. Ensure <workspaceDir>/data/ directory exists (mkdir -p)
  // 2. Open better-sqlite3 connection to <workspaceDir>/data/wolf.sqlite
  // 3. Run CREATE TABLE IF NOT EXISTS for companies, jobs, batches (see schema above)
  // 4. Store the connection in a module-level variable for reuse
  throw new Error('Not implemented');
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

/**
 * Inserts a new company, or returns the existing one if a company with the
 * same name already exists (case-insensitive match).
 *
 * @returns The company's id (existing or newly created).
 */
export async function upsertCompany(
  company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  // TODO(M2):
  // 1. SELECT id FROM companies WHERE LOWER(name) = LOWER(company.name)
  // 2. If found, return existing id
  // 3. If not found, INSERT new row with uuid, set createdAt/updatedAt to now
  // 4. Return new id
  throw new Error('Not implemented');
}

/**
 * Looks up a company by id.
 * @returns The Company, or null if not found.
 */
export async function getCompany(id: string): Promise<Company | null> {
  // TODO(M2): SELECT * FROM companies WHERE id = ?
  throw new Error('Not implemented');
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

/**
 * Saves a new job to the database.
 * Automatically assigns a uuid, createdAt, and updatedAt.
 *
 * @param job - All Job fields except id, createdAt, updatedAt.
 * @returns The new job's id.
 */
export async function saveJob(
  job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  // TODO(M2):
  // 1. Generate uuid for id
  // 2. Set createdAt = updatedAt = new Date().toISOString()
  // 3. INSERT INTO jobs with all fields
  // 4. Return id
  throw new Error('Not implemented');
}

/**
 * Saves multiple jobs in a single transaction.
 * Skips duplicates: if a job with the same (source, url) already exists, it is ignored.
 *
 * @param jobs - Array of jobs to insert.
 * @returns Number of jobs actually inserted (duplicates excluded).
 */
export async function saveJobs(
  jobs: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<number> {
  // TODO(M2):
  // 1. Begin transaction
  // 2. For each job, check if (source, url) already exists — skip if so
  // 3. INSERT new jobs (call saveJob logic inside the transaction)
  // 4. Commit and return count of inserted rows
  throw new Error('Not implemented');
}

/**
 * Fetches a single job by id.
 * @returns The Job, or null if not found.
 */
export async function getJob(id: string): Promise<Job | null> {
  // TODO(M2): SELECT * FROM jobs WHERE id = ?
  throw new Error('Not implemented');
}

/**
 * Queries jobs with optional filters. Returns all jobs if no filters are set.
 *
 * @param query - Filters: status, companyIds, minScore, since (ISO 8601), source, limit, offset.
 * @returns Matching jobs ordered by createdAt DESC.
 */
export async function getJobs(query: JobQuery): Promise<Job[]> {
  // TODO(M2):
  // 1. Build WHERE clause dynamically from non-null query fields
  //    - status: single value or array → WHERE status IN (...)
  //    - companyIds: WHERE companyId IN (...)
  //    - minScore: WHERE score >= ?
  //    - since: WHERE createdAt >= ?
  //    - source: WHERE source = ?
  // 2. Apply LIMIT / OFFSET if set
  // 3. Return rows mapped to Job objects
  throw new Error('Not implemented');
}

/**
 * Updates specific fields on a job. Only the provided fields are changed.
 * Always updates updatedAt to now.
 *
 * @throws If no job with the given id exists.
 */
export async function updateJob(id: string, update: JobUpdate): Promise<void> {
  // TODO(M2):
  // 1. Build SET clause from non-undefined fields in update
  // 2. Always add updatedAt = now
  // 3. UPDATE jobs SET ... WHERE id = ?
  // 4. Throw if rowsAffected === 0 (job not found)
  throw new Error('Not implemented');
}

/**
 * Updates multiple jobs in a single transaction (e.g. bulk status change).
 *
 * @param ids - Job ids to update.
 * @param update - Fields to apply to all of them.
 */
export async function updateJobs(ids: string[], update: JobUpdate): Promise<void> {
  // TODO(M2):
  // 1. Begin transaction
  // 2. Call updateJob for each id
  // 3. Commit
  throw new Error('Not implemented');
}

// ---------------------------------------------------------------------------
// Counts & aggregates
// ---------------------------------------------------------------------------

/**
 * Counts jobs grouped by status.
 * Used by `wolf status` to show the summary row.
 *
 * @returns A record mapping each JobStatus to its count (0 if none).
 */
export async function countByStatus(): Promise<Record<JobStatus, number>> {
  // TODO(M2):
  // 1. SELECT status, COUNT(*) FROM jobs GROUP BY status
  // 2. Map results to Record<JobStatus, number>
  // 3. Fill in 0 for any status not present in results
  throw new Error('Not implemented');
}

// ---------------------------------------------------------------------------
// Batches
// ---------------------------------------------------------------------------

/** Represents one AI batch job tracked in the batches table. */
export interface BatchRecord {
  id: string;           // local uuid
  batchId: string;      // provider-assigned ID (Anthropic / OpenAI)
  type: string;         // "score" | "tailor" | ...
  aiProvider: string;   // "anthropic" | "openai"
  profileId: string;    // which profile was used — needed by pollAll() to reload the profile
  status: 'pending' | 'completed' | 'failed' | 'partial_failed';
  // partial_failed: batch ended but some individual items errored.
  // Successful items are written to DB; failed items remain score: null
  // and will be picked up automatically on the next wolf score run.
  submittedAt: string;  // ISO 8601
  completedAt: string | null;
}

/**
 * Records a newly submitted AI batch job.
 *
 * @param batchId - The ID returned by the AI provider's batch API.
 * @param type - Command type: "score", "tailor", etc.
 * @param aiProvider - "anthropic" or "openai".
 * @param profileId - The profile used when the batch was submitted.
 * @returns The local batch record id.
 */
export async function saveBatch(
  batchId: string,
  type: string,
  aiProvider: string,
  profileId: string
): Promise<string> {
  // TODO(M2):
  // 1. INSERT INTO batches with uuid, batchId, type, aiProvider, profileId, status='pending', submittedAt=now
  // 2. Return local id
  throw new Error('Not implemented');
}

/**
 * Returns all batches with status 'pending'.
 * Called by poll logic to know which batches to check.
 */
export async function getPendingBatches(): Promise<BatchRecord[]> {
  // TODO(M2): SELECT * FROM batches WHERE status = 'pending' ORDER BY submittedAt ASC
  throw new Error('Not implemented');
}

/**
 * Marks a batch as completed or failed, and records the completion time.
 *
 * @param id - Local batch record id (not the provider batchId).
 * @param status - "completed", "failed", or "partial_failed".
 */
export async function updateBatchStatus(
  id: string,
  status: 'completed' | 'failed' | 'partial_failed'
): Promise<void> {
  // TODO(M2):
  // 1. UPDATE batches SET status = ?, completedAt = now WHERE id = ?
  throw new Error('Not implemented');
}
