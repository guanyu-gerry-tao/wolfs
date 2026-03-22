/**
 * Tests for commands/add/index.ts
 *
 * TDD: implement add.ts, then convert it.todo → it and fill in assertions.
 */

import { describe, it } from 'vitest';

describe('add', () => {
  it.todo('saves the job to DB and returns a jobId');
  it.todo('saves the job with status raw and score null');
  it.todo('uses source "manual" to identify AI-submitted jobs');
  it.todo('stores the url when provided');
  it.todo('uses empty string for url when not provided');
  it.todo('upserts the company and sets companyId on the job');
});
