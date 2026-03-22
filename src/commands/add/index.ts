/**
 * add/index.ts — Single job ingestion (MCP-only entry point).
 *
 * Stores one job submitted by an AI orchestrator (Claude / OpenClaw).
 * The AI caller is responsible for extracting structured fields from the
 * user's raw input (screenshot, pasted JD, URL content) before calling this.
 * wolf only stores — it does not parse or re-extract.
 *
 * ## Typical AI-orchestrated flow
 *
 *   User: "I found this job, looks interesting" + shares content
 *   AI: extracts { title, company, jdText, url? }
 *   AI: calls wolf_add({ title, company, jdText, url })
 *     → wolf saves job with status: 'raw', score: null
 *     → returns { jobId }
 *   AI: calls wolf_score({ jobIds: [jobId], single: true })
 *     → synchronous Haiku scoring, returns score + comment
 *   AI: presents results to user, offers wolf_tailor
 *
 * ## source field
 *
 * Jobs added via wolf_add are stored with source = 'manual'.
 * This distinguishes them from provider-ingested jobs in wolf status.
 */

import type { AddOptions, AddResult } from '../../types/index.js';

/**
 * Saves a single AI-structured job to the local database.
 *
 * @param options - Structured job data extracted by the AI caller.
 *   - title: job title
 *   - company: company name (used to upsert a Company record)
 *   - jdText: full job description text
 *   - url: original job posting URL (optional; defaults to empty string if not provided)
 *   - profileId: reserved for future use
 * @returns jobId — the DB-assigned id for chaining into wolf_score or wolf_tailor.
 * @throws If the DB cannot be initialized (e.g. wolf.toml not found in cwd).
 */
export async function add(_options: AddOptions): Promise<AddResult> {
  // TODO(M2):
  // 1. Initialize DB (initDb from utils/db)
  // 2. Upsert company by name (upsertCompany) to get a companyId FK
  // 3. Save job with status 'raw', score null, source 'manual'
  //    Unknown fields (location, remote, salary) stay null — wolf score fills them in
  // 4. Return { jobId }
  throw new Error('Not implemented');
}
