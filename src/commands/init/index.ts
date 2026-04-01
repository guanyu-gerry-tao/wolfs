import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { input, confirm } from '@inquirer/prompts';
import { backupConfig, saveConfig } from '../../utils/config.js';
import { envSet } from '../env/index.js';
import { profileDir, resumeTxtPath } from '../../utils/fs-helpers.js';
import type { AppConfig } from '../../types/index.js';

/**
 * Parses and validates a user-supplied document path.
 */
export function parseDocumentPath(raw: string, allowed: string[]): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const dotIndex = trimmed.lastIndexOf('.');
  if (dotIndex <= 0) {
    throw new Error(
      `File must be ${allowed.map(e => `.${e}`).join(' or ')} (got: ${trimmed})`
    );
  }
  const ext = trimmed.slice(dotIndex + 1).toLowerCase();
  if (!allowed.includes(ext)) {
    throw new Error(
      `File must be ${allowed.map(e => `.${e}`).join(' or ')} (got: ${trimmed})`
    );
  }
  return trimmed;
}

const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

const RESUME_POOL_TEMPLATE = `# SUMMARY
> Write 2-3 sentences introducing yourself: your background, core strengths, and what you're looking for.
> This appears at the top of your resume and helps wolf understand your overall positioning.
> Example: Software engineer with 4 years of experience in backend systems and distributed infrastructure.
>          Passionate about developer tooling and platform engineering. Seeking senior SWE roles.


# EDUCATION
> Format: School | Degree | Graduation Year
> Optionally include GPA, honours, and relevant coursework. Most recent first.
> wolf will decide whether to show GPA and coursework based on the job.
> Example:
> UC Berkeley | B.S. Computer Science | 2023
> - GPA: 3.8/4.0, Dean's List
> - Relevant coursework: Distributed Systems, Algorithms, Databases


# EXPERIENCE
> Format: Company | Title | Start – End
> Under each role, list bullet points describing what you built and its impact.
> Quantify where possible (numbers, percentages, scale).
> Add as many roles as you have — wolf will automatically select the most relevant ones per job.
> Most recent first.
> Example:
> Stripe | Software Engineer | July 2021 – Present
> - Built rate-limiting service handling 800K req/s with p99 < 2ms
> - Led Kafka migration cutting end-to-end latency from 420ms to 85ms


# PROJECTS
> Format: Project Name | Tech Stack
> Describe what it does, why it's interesting, and any measurable outcomes.
> Add a GitHub or live link if available. Add as many as you have — wolf will pick based on the job.
> Example:
> Koi — Distributed key-value store | Go, Raft
> - Implemented Raft consensus from scratch, benchmarked at 42K ops/s
> - github.com/yourname/koi


# SKILLS
> List your skills, grouped by category or as a flat comma-separated list.
> Include everything — wolf will decide which skills to emphasise based on the job description.
> Example:
> Languages: Go, TypeScript, Python, Rust, SQL
> Infrastructure: AWS, Docker, Kubernetes, Terraform
> Databases: PostgreSQL, Redis, DynamoDB
`;

export interface SetupProfileInput {
  name: string;
  email: string;
  phone: string;
  immigrationStatus?: string;
  targetRoles?: string[];
  targetLocations?: string[];
  skills?: string[];
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  resumeText?: string;
}

/**
 * Writes wolf.toml, creates data/ and profile directories, writes resume_pool.md, and updates .gitignore.
 * Called by both CLI `wolf init` and MCP `wolf_setup`.
 */
export async function setupWorkspace(workspaceDir: string, profile: SetupProfileInput): Promise<{ resumePoolPath: string }> {
  const dataDir = path.join(workspaceDir, 'data');
  const defaultProfileDir = profileDir(workspaceDir, 'default', 'Default');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(defaultProfileDir, { recursive: true });

  const config: AppConfig = {
    profiles: [{
      id: 'default',
      label: 'Default',
      name: profile.name,
      alternateName: [],
      email: profile.email,
      alternateEmail: [],
      phone: profile.phone,
      alternatePhone: [],
      linkedinUrl: profile.linkedinUrl ?? null,
      githubUrl: profile.githubUrl ?? null,
      websiteUrl: profile.websiteUrl ?? null,
      immigrationStatus: profile.immigrationStatus ?? '',
      currentCity: null,
      willingToRelocate: true,
      workAuthTimeline: null,
      targetRoles: profile.targetRoles ?? ['Software Engineer'],
      targetLocations: profile.targetLocations ?? ['Remote'],
      skills: profile.skills ?? [],
      portfolioPath: null,
      transcriptPath: null,
      targetedCompanyIds: [],
      scoringPreferences: {
        preferences: { minSalary: null, preferredCompanySizes: [] },
        weights: { workAuth: 0.2, roleMatch: 0.35, location: 0.2, remote: 0.1, salary: 0.1, companySize: 0.05 },
        dealbreakers: { sponsorship: null, remote: null },
      },
    }],
    defaultProfileId: 'default',
    providers: { linkedin: { enabled: true }, handshake: { enabled: false } },
    hunt: { minScore: 0.5, maxResults: 50 },
    tailor: { defaultTemplatePath: null, defaultCoverLetterTone: 'professional' },
    reach: { defaultEmailTone: 'professional', maxEmailsPerDay: 10 },
  };

  const configExists = await fs.access(path.join(workspaceDir, 'wolf.toml')).then(() => true).catch(() => false);
  if (configExists) await backupConfig();
  await saveConfig(config);

  // .gitignore
  const gitignorePath = path.join(workspaceDir, '.gitignore');
  const wolfIgnoreBlock = '\n# wolf\ndata/\n';
  try {
    const existing = await fs.readFile(gitignorePath, 'utf-8');
    if (!existing.includes('# wolf')) await fs.appendFile(gitignorePath, wolfIgnoreBlock, 'utf-8');
  } catch {
    await fs.writeFile(gitignorePath, wolfIgnoreBlock.trimStart(), 'utf-8');
  }

  // data/README.txt
  await fs.writeFile(
    path.join(dataDir, 'README.txt'),
    'This directory is managed by wolf.\nDo NOT commit this directory to version control.\n',
    'utf-8',
  );

  // resume_pool.md — content pool (template if not provided)
  const txtPath = resumeTxtPath(workspaceDir, 'default', 'Default');
  const txtContent = profile.resumeText?.trim() ? profile.resumeText : RESUME_POOL_TEMPLATE;
  await fs.writeFile(txtPath, txtContent, 'utf-8');

  return { resumePoolPath: txtPath };
}

/**
 * Interactive setup wizard. Run once in a dedicated workspace directory.
 */
export async function init(): Promise<void> {
  // ── Pre-check: workspace exists but keys not active yet ───────────────────
  const alreadyInit = await fs
    .access(path.join(process.cwd(), 'wolf.toml'))
    .then(() => true)
    .catch(() => false);

  if (alreadyInit && !process.env.WOLF_ANTHROPIC_API_KEY) {
    const missing = ['WOLF_ANTHROPIC_API_KEY', 'WOLF_APIFY_API_TOKEN', 'WOLF_GMAIL_CLIENT_ID', 'WOLF_GMAIL_CLIENT_SECRET']
      .filter(k => !process.env[k]);

    console.log(`
${bold('wolf.toml found — workspace already initialized.')}

The following keys are not set in your current environment:
${missing.map(k => `  ${red('✗')} ${k}`).join('\n')}

${bold("If you don't need all of them:")}
  Only ${bold('WOLF_ANTHROPIC_API_KEY')} is required to get started.
  Others can be added later via ${bold('wolf env set')}.

${bold('If you already set them but haven\'t restarted yet:')}
  Restart your terminal, or run: ${bold('source ~/.zshrc')}
  Then verify with: ${bold('wolf env show')}
`);
    const setupNow = await confirm({ message: 'Set up missing keys now?', default: true });
    if (setupNow) await envSet();
    return;
  }

  // ── Step 0: Confirm workspace path ───────────────────────────────────────
  console.log(`\nwolf will create a workspace in:\n  ${bold(process.cwd())}\n`);
  const confirmPath = await confirm({ message: 'Create workspace here?', default: true });
  if (!confirmPath) {
    console.log('Cancelled. cd to your preferred directory and run wolf init again.');
    return;
  }

  // ── Step 0a: Warn if running in home directory ────────────────────────────
  if (process.cwd() === os.homedir()) {
    console.log(`
${red('⚠️  You are in your Home directory (~).')}
Consider cd-ing to a dedicated folder first, e.g.:
  ${dim('mkdir ~/Documents/job-search && cd ~/Documents/job-search')}
`);
    const proceed = await confirm({ message: 'Continue initializing here anyway?', default: false });
    if (!proceed) {
      console.log('Cancelled. cd to your preferred directory and run wolf init again.');
      return;
    }
  }

  // ── Step 0b: Check for existing wolf.toml ────────────────────────────────
  const configExists = await fs
    .access(path.join(process.cwd(), 'wolf.toml'))
    .then(() => true)
    .catch(() => false);

  if (configExists) {
    console.log(`\n${bold('Existing wolf.toml detected.')}`);
    console.log(red('⚠️  Overwriting will replace your current config (the old file will be backed up as wolf.toml.backup1)'));
    const overwrite = await confirm({ message: 'Overwrite existing config?', default: false });
    if (!overwrite) {
      console.log('Cancelled. Existing config unchanged.');
      return;
    }
    await backupConfig();
    console.log(dim('Backed up existing config to wolf.toml.backup1'));
  }

  // ── Step 1: Profile info ──────────────────────────────────────────────────
  console.log(`\n${bold('── Profile ──')}`);

  const name = await input({
    message: 'Your full name (used on applications):',
    validate: v => v.trim() !== '' || 'Name is required',
  });
  const email = await input({
    message: 'Email:',
    validate: v => v.includes('@') || 'Please enter a valid email',
  });
  const phone = await input({
    message: 'Phone number (required by most application forms):',
    validate: v => v.trim() !== '' || 'Phone is required',
  });
  const immigrationStatus = await input({
    message: 'Work authorization / immigration status (plain English):',
    default: '',
  });
  console.log(dim('  e.g. "F-1 OPT, need sponsorship" / "Green Card holder" / "US citizen"'));

  // ── Step 2: Job preferences ───────────────────────────────────────────────
  console.log(`\n${bold('── Job Preferences ──')}`);

  const targetRolesRaw = await input({ message: 'Target roles (comma-separated):', default: 'Software Engineer' });
  const targetLocationsRaw = await input({ message: 'Target locations (comma-separated):', default: 'Remote' });
  const targetRoles = targetRolesRaw.split(',').map(s => s.trim()).filter(Boolean);
  const targetLocations = targetLocationsRaw.split(',').map(s => s.trim()).filter(Boolean);

  // ── Step 3: Optional documents (portfolio, transcript) ───────────────────
  console.log(`\n${bold('── Optional Documents (PDF only) ──')}`);
  console.log(dim('These are attached as-is when applying — wolf will never modify them.\n'));

  const portfolioRaw = await input({ message: 'Portfolio PDF path (leave blank to skip):', default: '' });
  const portfolioPath = parseDocumentPath(portfolioRaw, ['pdf']);

  const transcriptRaw = await input({ message: 'Transcript PDF path (leave blank to skip):', default: '' });
  const transcriptPath = parseDocumentPath(transcriptRaw, ['pdf']);

  // ── Step 4: Resume content ────────────────────────────────────────────────
  console.log(`\n${bold('── Resume Content ──')}`);
  console.log(dim('wolf uses resume_pool.md as the content pool for all resume tailoring.'));
  console.log(dim('You can fill it in now or edit it after setup.\n'));

  const fillNow = await confirm({ message: 'Fill in resume content now?', default: true });

  let resumeText = '';
  if (fillNow) {
    console.log(dim('\nEnter each section. Leave blank to skip. Press Enter twice to move on.\n'));

    const summary = await input({ message: 'Summary (1-2 sentences about yourself):', default: '' });
    const education = await input({ message: 'Education (School | Degree | Year):', default: '' });
    const experience = await input({ message: 'Experience (paste or summarize — you can edit the file later):', default: '' });
    const projects = await input({ message: 'Projects (paste or summarize):', default: '' });
    const skills = await input({ message: 'Skills (comma-separated):', default: '' });

    const sections: string[] = [];
    if (summary.trim()) sections.push(`# SUMMARY\n${summary.trim()}`);
    if (education.trim()) sections.push(`# EDUCATION\n${education.trim()}`);
    if (experience.trim()) sections.push(`# EXPERIENCE\n${experience.trim()}`);
    if (projects.trim()) sections.push(`# PROJECTS\n${projects.trim()}`);
    if (skills.trim()) sections.push(`# SKILLS\n${skills.trim()}`);

    resumeText = sections.length > 0 ? sections.join('\n\n') : '';
  }

  // ── Step 5: Write workspace ───────────────────────────────────────────────
  console.log('');

  // Build config (portfolioPath/transcriptPath stored in profile)
  const dataDir = path.join(process.cwd(), 'data');
  const defaultProfileDir = profileDir(process.cwd(), 'default', 'Default');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(defaultProfileDir, { recursive: true });

  const config: AppConfig = {
    profiles: [{
      id: 'default',
      label: 'Default',
      name,
      alternateName: [],
      email,
      alternateEmail: [],
      phone,
      alternatePhone: [],
      linkedinUrl: null,
      githubUrl: null,
      websiteUrl: null,
      immigrationStatus,
      currentCity: null,
      willingToRelocate: true,
      workAuthTimeline: null,
      targetRoles,
      targetLocations,
      skills: [],
      portfolioPath,
      transcriptPath,
      targetedCompanyIds: [],
      scoringPreferences: {
        preferences: { minSalary: null, preferredCompanySizes: [] },
        weights: { workAuth: 0.2, roleMatch: 0.35, location: 0.2, remote: 0.1, salary: 0.1, companySize: 0.05 },
        dealbreakers: { sponsorship: null, remote: null },
      },
    }],
    defaultProfileId: 'default',
    providers: { linkedin: { enabled: true }, handshake: { enabled: false } },
    hunt: { minScore: 0.5, maxResults: 50 },
    tailor: { defaultTemplatePath: null, defaultCoverLetterTone: 'professional' },
    reach: { defaultEmailTone: 'professional', maxEmailsPerDay: 10 },
  };
  await saveConfig(config);

  // .gitignore
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const wolfIgnoreBlock = '\n# wolf\ndata/\n';
  try {
    const existing = await fs.readFile(gitignorePath, 'utf-8');
    if (!existing.includes('# wolf')) await fs.appendFile(gitignorePath, wolfIgnoreBlock, 'utf-8');
  } catch {
    await fs.writeFile(gitignorePath, wolfIgnoreBlock.trimStart(), 'utf-8');
  }

  // data/README.txt
  await fs.writeFile(
    path.join(dataDir, 'README.txt'),
    'This directory is managed by wolf.\nIt contains your local job database and runtime data.\nDo NOT commit this directory to version control.\n',
    'utf-8',
  );

  // resume_pool.md
  const txtPath = resumeTxtPath(process.cwd(), 'default', 'Default');
  const txtContent = resumeText.trim() ? resumeText : RESUME_POOL_TEMPLATE;
  await fs.writeFile(txtPath, txtContent, 'utf-8');

  // ── Done ──────────────────────────────────────────────────────────────────
  const REQUIRED_KEY = 'WOLF_ANTHROPIC_API_KEY';
  const ALL_KEYS = ['WOLF_ANTHROPIC_API_KEY', 'WOLF_APIFY_API_TOKEN', 'WOLF_GMAIL_CLIENT_ID', 'WOLF_GMAIL_CLIENT_SECRET'];

  console.log(`${bold('✅ wolf workspace initialized!')}

  ${bold('wolf.toml')}   — workspace config
  ${bold('data/')}       — wolf's local database (auto-managed)

${bold('── Resume Content ──')}

  ${bold(txtPath)}
  ${dim('← Edit this file to add or update your resume content.')}
  ${dim('  Then run: wolf templategen')}

${bold('── API Key Status ──')}
`);

  for (const key of ALL_KEYS) {
    const val = process.env[key];
    if (val) {
      console.log(`  ${green('✓')} ${bold(key)}`);
    } else {
      console.log(`  ${red('✗')} ${dim(key)}  ${dim('(not set)')}`);
    }
  }
  console.log('');

  if (!process.env[REQUIRED_KEY]) {
    console.log(`${bold('One more step — set up your API keys.')}`);
    console.log(dim(`Only ${REQUIRED_KEY} is required to get started. Others can be added later.\n`));
    const setupNow = await confirm({ message: 'Set up keys now?', default: true });
    if (setupNow) await envSet();
  } else {
    console.log(dim('Optional keys (Apify, Gmail) can be added later with wolf env set.\n'));
    console.log(`Next: ${bold('wolf templategen')}\n`);
  }
}
