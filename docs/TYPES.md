# Types — wolf

This document defines the shared TypeScript types used across all layers of wolf. These types live in `src/types/index.ts` and serve as the contract between CLI, MCP, commands, and storage layers.

---

## Core Domain Types

### `JobStatus`

```typescript
type JobStatus = "new" | "reviewed" | "applied" | "rejected";
```

Lifecycle:

```
new  →  reviewed  →  applied
                  →  rejected
```

### `JobSource`

```typescript
type JobSource = "linkedin" | "handshake" | "email" | "browser_mcp" | "manual";
```

### `Job`

A single job listing, stored in SQLite.

```typescript
interface Job {
  id: string;                        // unique ID (uuid)
  title: string;                     // e.g. "Software Engineer Intern"
  company: string;                   // e.g. "Google"
  url: string;                       // application or listing URL
  source: JobSource;                 // where this job was found
  description: string;               // full JD text
  location: string;                  // e.g. "New York, NY" or "Remote"
  score: number | null;              // AI relevance score 0.0–1.0, null if unscored
  scoreJustification: string | null; // AI explanation for the score
  status: JobStatus;
  tailoredResumePath: string | null; // path to tailored .tex file
  tailoredResumePdfPath: string | null; // path to compiled resume PDF
  coverLetterPath: string | null;    // path to cover letter .md file
  coverLetterPdfPath: string | null; // path to cover letter PDF
  screenshotPath: string | null;     // path to form-fill screenshot
  outreachDraftPath: string | null;  // path to outreach email draft
  createdAt: string;                 // ISO 8601 timestamp
  updatedAt: string;                 // ISO 8601 timestamp
}
```

### `Resume`

Parsed resume structure. Used internally by `tailor` command.

```typescript
interface ResumeSection {
  heading: string;            // e.g. "Education", "Experience", "Skills"
  items: ResumeSectionItem[];
}

interface ResumeSectionItem {
  title: string;              // e.g. "Software Engineer Intern"
  subtitle: string | null;    // e.g. "Google — Mountain View, CA"
  date: string | null;        // e.g. "Jun 2025 – Aug 2025"
  bullets: string[];          // bullet point descriptions
}

interface Resume {
  name: string;
  contactInfo: {
    email: string;
    phone: string | null;
    linkedin: string | null;
    github: string | null;
    website: string | null;
  };
  sections: ResumeSection[];
  rawTex: string;             // original .tex source
}
```

### `UserProfile`

User information collected by `wolf init`, stored in `~/.wolf/config.json`.

```typescript
interface UserProfile {
  name: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  immigrationStatus: string | null;   // e.g. "US citizen", "F-1 OPT", "H-1B needed"
  currentCity: string | null;
  willingToRelocate: boolean;
  workAuthTimeline: string | null;    // e.g. "OPT starts May 2026"
  targetRoles: string[];              // e.g. ["Software Engineer", "Full Stack Developer"]
  targetLocations: string[];          // e.g. ["NYC", "SF", "Remote"]
  skills: string[];                   // e.g. ["TypeScript", "React", "Python"]
  resumePath: string;                 // path to base resume .tex file
}
```

### `AppConfig`

Top-level configuration object. Read from `~/.wolf/config.json`.

```typescript
interface AppConfig {
  profile: UserProfile;
  providers: Record<string, ProviderConfig>;
  hunt: {
    minScore: number;          // minimum score threshold (default 0.5)
    maxResults: number;        // max jobs per hunt run (default 50)
  };
  tailor: {
    templatePath: string | null; // optional LaTeX template for resume
    coverLetterTone: string;     // e.g. "professional", "conversational"
  };
  reach: {
    emailTone: string;         // e.g. "professional", "casual"
    maxEmailsPerDay: number;   // safety limit (default 10)
  };
}

interface ProviderConfig {
  enabled: boolean;
  strategy?: string;           // provider-specific, e.g. "email" for handshake
}
```

---

## Command Input / Output Types

### `hunt`

```typescript
interface HuntOptions {
  role?: string;               // target role keyword
  location?: string;           // target location
  providers?: string[];        // override which providers to use
  maxResults?: number;         // override config.hunt.maxResults
}

interface HuntResult {
  jobs: Job[];
  newCount: number;
  avgScore: number;
}
```

### `tailor`

```typescript
interface TailorOptions {
  jobId: string;               // ID of the job to tailor for
  coverLetter?: boolean;       // also generate cover letter (default true)
  diff?: boolean;              // show before/after comparison
}

interface TailorResult {
  tailoredTexPath: string;     // path to output .tex file
  tailoredPdfPath: string;     // path to compiled resume PDF
  coverLetterMdPath: string | null;  // path to cover letter .md
  coverLetterPdfPath: string | null; // path to cover letter PDF
  changes: string[];           // summary of key changes made
  matchScore: number;          // estimated match score after tailoring
}
```

### `file`

```typescript
interface FormField {
  name: string;                // field name or label
  type: string;                // "text", "email", "file", "select", "checkbox", etc.
  required: boolean;
  value: string | null;        // mapped value from user profile, null if unmapped
}

interface FileOptions {
  jobId: string;               // ID of the job to apply for
  dryRun?: boolean;            // preview only, don't submit (default true)
}

interface FileResult {
  fields: FormField[];
  submitted: boolean;
  screenshotPath: string | null;
}
```

### `reach`

```typescript
interface Contact {
  name: string;
  title: string;               // e.g. "Engineering Manager"
  company: string;
  email: string | null;        // real or inferred email
  emailInferred: boolean;      // true if email was guessed from pattern
  linkedinUrl: string | null;
}

interface ReachOptions {
  jobId: string;               // ID of the job to do outreach for
  send?: boolean;              // actually send the email (default false)
}

interface ReachResult {
  contacts: Contact[];
  draftPath: string;           // path to draft email .md file
  sent: boolean;
}
```

### `status`

```typescript
interface StatusOptions {
  status?: JobStatus;          // filter by status
  minScore?: number;           // filter by minimum score
  since?: string;              // filter by date (ISO 8601)
}

interface StatusResult {
  jobs: Job[];
  total: number;
  byStatus: Record<JobStatus, number>;
}
```

---

## Provider Interface

```typescript
interface JobProvider {
  name: string;
  hunt(options: HuntOptions): Promise<Job[]>;
}
```

Built-in providers: `ApifyLinkedInProvider`, `ApifyHandshakeProvider`, `EmailProvider`, `BrowserMCPProvider`, `ManualProvider`.

---

## MCP Tool Schemas

Each MCP tool maps directly to a command:

| MCP Tool | Input Type | Output Type |
|---|---|---|
| `wolf_hunt` | `HuntOptions` | `HuntResult` |
| `wolf_tailor` | `TailorOptions` | `TailorResult` |
| `wolf_file` | `FileOptions` | `FileResult` |
| `wolf_reach` | `ReachOptions` | `ReachResult` |

MCP input/output schemas are JSON Schema representations of these TypeScript types, defined in `src/mcp/tools.ts`.
