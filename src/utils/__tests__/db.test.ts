/**
 * Tests for utils/db.ts
 *
 * Uses a temporary SQLite file per test run so tests are fully isolated.
 * No mocking needed — we test against a real (temp file) DB.
 *
 * TDD: implement db.ts, then convert it.todo → it and fill in assertions.
 */

import { describe, it } from 'vitest';

describe('initDb', () => {
  it.todo('creates wolf.sqlite in the data/ subdirectory');
  it.todo('is idempotent — calling twice does not throw');
});

describe('upsertCompany', () => {
  it.todo('inserts a new company and returns its id');
  it.todo('returns the same id for a duplicate company name (case-insensitive)');
});

describe('getCompany', () => {
  it.todo('returns the company after insertion');
  it.todo('returns null for unknown id');
});

describe('saveJob', () => {
  it.todo('saves a job and returns a non-empty id');
  it.todo('persists all fields correctly');
});

describe('saveJobs (bulk)', () => {
  it.todo('inserts multiple jobs and returns the inserted count');
  it.todo('skips duplicates with the same (source, url)');
});

describe('getJobs', () => {
  it.todo('returns all jobs when no filters are set');
  it.todo('filters by status');
  it.todo('filters by minScore');
});

describe('updateJob', () => {
  it.todo('updates specific fields without touching others');
  it.todo('throws if the job does not exist');
});

describe('countByStatus', () => {
  it.todo('returns 0 for all statuses when DB is empty');
  it.todo('counts correctly after inserting jobs');
});

describe('saveBatch / getPendingBatches / updateBatchStatus', () => {
  it.todo('saves a batch and returns a local id');
  it.todo('returns the batch in getPendingBatches');
  it.todo('removes batch from pending after marking completed');
});
