/**
 * templategen/index.ts — Generate a general-purpose resume or cover letter template.
 *
 * wolf_templategen takes the user's full content pool (resume.txt) and an optional
 * visual style reference image (style_ref.jpg), then calls Claude to generate a
 * content-filled LaTeX template (.tex). The result is compiled to PDF and a
 * screenshot is captured for user review.
 *
 * ## Output location
 *
 * All output lives under the profile's data directory:
 *
 *   data/<profileId>_<profileLabel>/general_resume/
 *     resume.tex
 *     resume.pdf
 *     resume.png
 *
 *   data/<profileId>_<profileLabel>/general_cl/
 *     cl.tex
 *     cl.pdf
 *     cl.png
 *
 * ## Inputs
 *
 *   data/<profileId>_<profileLabel>/resume.txt    — full content pool
 *   data/<profileId>_<profileLabel>/style_ref.jpg — visual reference (optional)
 *
 * ## Reuse
 *
 * The same logic handles cover letter templates via `type: 'cl'`.
 * Users may call this multiple times with a different `prompt` to refine the result.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import Anthropic from '@anthropic-ai/sdk';
import type { TemplategenOptions, TemplategenResult } from '../../types/index.js';
import { loadConfig } from '../../utils/config.js';
import { fileExists } from '../../utils/resume-snapshot.js';
import {
  profileDir,
  generalResumeDir,
  generalClDir,
  resumeTxtPath,
  styleRefPath,
} from '../../utils/fs-helpers.js';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Reads the preamble.tex shipped with the tailor command.
 * Provides functional LaTeX packages without visual layout decisions.
 */
async function readPreamble(): Promise<string> {
  const preamblePath = new URL('../tailor/preamble.tex', import.meta.url);
  return fs.readFile(preamblePath, 'utf-8');
}

/**
 * Converts a JPG to a base64 string for Claude Vision.
 */
async function imageToBase64(imgPath: string): Promise<string> {
  const bytes = await fs.readFile(imgPath);
  return bytes.toString('base64');
}

/**
 * Compiles a .tex file to PDF via pdflatex (two passes for cross-references).
 */
async function compileTex(texPath: string): Promise<string> {
  const dir = path.dirname(texPath);
  const args = ['-interaction=nonstopmode', '-output-directory', dir, texPath];
  try {
    await execFileAsync('pdflatex', args);
    await execFileAsync('pdflatex', args);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`pdflatex compilation failed: ${msg}`);
  }
  return texPath.replace(/\.tex$/, '.pdf');
}

/**
 * Converts the first page of a PDF to a PNG screenshot via pdftoppm.
 */
async function pdfToScreenshot(pdfPath: string): Promise<string> {
  const dir = path.dirname(pdfPath);
  const base = path.basename(pdfPath, '.pdf');
  const outputPrefix = path.join(dir, base);
  await execFileAsync('pdftoppm', ['-r', '150', '-png', '-singlefile', pdfPath, outputPrefix]);
  return `${outputPrefix}.png`;
}

/** Validates that the output looks like a LaTeX document. */
function validateTex(tex: string): void {
  if (!tex.includes('\\begin{document}') || !tex.includes('\\end{document}')) {
    throw new Error('Claude returned invalid LaTeX — missing \\begin{document} or \\end{document}.');
  }
}

/**
 * Strips > comment lines from resume_pool.md before sending to Claude.
 */
function stripComments(txt: string): string {
  return txt
    .split('\n')
    .filter(line => !line.trimStart().startsWith('>'))
    .join('\n');
}

function buildResumePrompt(resumeTxt: string, hasStyleRef: boolean, userPrompt?: string): string {
  const styleInstruction = hasStyleRef
    ? 'The attached image shows the desired visual style. Reproduce the layout, spacing, font choices, and formatting approach as closely as possible in LaTeX.'
    : 'Use a clean, professional resume layout suitable for software engineering roles.';

  return `You are an expert resume writer and LaTeX typesetter. Generate a complete, content-filled LaTeX resume.

INSTRUCTIONS:
- ${styleInstruction}
- Use ALL content from the RESUME CONTENT section below — include every experience, project, education entry, and skill listed.
- This is a general-purpose template, not tailored to any specific job. Present all content as-is.
- Generate a complete, compilable .tex file. Start with \\documentclass and include everything through \\end{document}.
- The file must compile with pdflatex without any external .cls or .sty files not in a standard TeX Live installation.
- Return only raw LaTeX — no markdown code fences, no explanation.
${userPrompt ? `\nADDITIONAL INSTRUCTIONS FROM USER:\n${userPrompt}\n` : ''}
RESUME CONTENT:
${resumeTxt}`;
}

function buildClPrompt(resumeTxt: string, hasStyleRef: boolean, userPrompt?: string): string {
  const styleInstruction = hasStyleRef
    ? 'The attached image shows the desired visual style. Reproduce the layout and formatting approach in LaTeX.'
    : 'Use a clean, professional cover letter layout.';

  return `You are an expert cover letter writer and LaTeX typesetter. Generate a complete cover letter LaTeX template.

INSTRUCTIONS:
- ${styleInstruction}
- Use the contact information and background from the RESUME CONTENT below to create a realistic template with placeholder text for the job-specific body paragraphs (mark them with [PLACEHOLDER]).
- Generate a complete, compilable .tex file. Start with \\documentclass and include everything through \\end{document}.
- The file must compile with pdflatex without any external .cls or .sty files not in a standard TeX Live installation.
- Return only raw LaTeX — no markdown code fences, no explanation.
${userPrompt ? `\nADDITIONAL INSTRUCTIONS FROM USER:\n${userPrompt}\n` : ''}
RESUME CONTENT (for contact info and background):
${resumeTxt}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function templategen(options: TemplategenOptions): Promise<TemplategenResult> {
  const workspaceDir = process.cwd();
  const config = await loadConfig();
  const profileId = options.profileId ?? config.defaultProfileId;
  const profile = config.profiles.find(p => p.id === profileId);
  if (!profile) throw new Error(`Profile not found: ${profileId}`);

  const profDir = profileDir(workspaceDir, profile.id, profile.label);
  await fs.mkdir(profDir, { recursive: true });

  // ── 1. Read resume.txt ─────────────────────────────────────────────────────
  const txtPath = resumeTxtPath(workspaceDir, profile.id, profile.label);
  if (!(await fileExists(txtPath))) {
    throw new Error(
      `resume_pool.md not found at ${txtPath}. ` +
      'Provide the resume content file for this profile first.',
    );
  }
  const rawTxt = await fs.readFile(txtPath, 'utf-8');
  const resumeContent = stripComments(rawTxt);

  // ── 2. Check for style_ref.jpg ─────────────────────────────────────────────
  const styleRef = styleRefPath(workspaceDir, profile.id, profile.label);
  const hasStyleRef = await fileExists(styleRef);

  // ── 3. Check for unexpected image files ───────────────────────────────────
  const profDirEntries = await fs.readdir(profDir);
  const unexpectedImages = profDirEntries.filter(f => {
    const lower = f.toLowerCase();
    return (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png'))
      && f !== 'style_ref.jpg';
  });
  if (unexpectedImages.length > 0) {
    throw new Error(
      `Unexpected image file(s) found in ${profDir}: ${unexpectedImages.join(', ')}. ` +
      'Only style_ref.jpg is recognised. Rename or remove the extra file(s).',
    );
  }

  // ── 4. Prepare output directory ────────────────────────────────────────────
  const outDir = options.type === 'resume'
    ? generalResumeDir(workspaceDir, profile.id, profile.label)
    : generalClDir(workspaceDir, profile.id, profile.label);
  await fs.mkdir(outDir, { recursive: true });

  const texFilename = options.type === 'resume' ? 'resume.tex' : 'cl.tex';
  const texOutPath = path.join(outDir, texFilename);

  // ── 5. Call Claude ─────────────────────────────────────────────────────────
  const client = new Anthropic({ apiKey: process.env.WOLF_ANTHROPIC_API_KEY });

  const prompt = options.type === 'resume'
    ? buildResumePrompt(resumeContent, hasStyleRef, options.prompt)
    : buildClPrompt(resumeContent, hasStyleRef, options.prompt);

  let texOutput: string;

  if (hasStyleRef) {
    const imageBase64 = await imageToBase64(styleRef);
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
          },
          { type: 'text', text: prompt },
        ],
      }],
    });
    texOutput = response.content[0].type === 'text' ? response.content[0].text : '';
  } else {
    const preamble = await readPreamble();
    const promptWithPreamble = prompt + `\n\nWOLF FUNCTIONAL PREAMBLE (include these packages):\n${preamble}`;
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: promptWithPreamble }],
    });
    texOutput = response.content[0].type === 'text' ? response.content[0].text : '';
  }

  texOutput = texOutput.replace(/^```(?:latex|tex)?\n?/m, '').replace(/\n?```$/m, '').trim();
  validateTex(texOutput);

  // ── 6. Write tex ───────────────────────────────────────────────────────────
  await fs.writeFile(texOutPath, texOutput + '\n', 'utf-8');

  // ── 7. Compile PDF ─────────────────────────────────────────────────────────
  const pdfPath = await compileTex(texOutPath);

  // ── 8. Screenshot ──────────────────────────────────────────────────────────
  const screenshotPath = await pdfToScreenshot(pdfPath);

  return {
    texPath: texOutPath,
    pdfPath,
    screenshotPath,
  };
}
