# 类型定义 — wolf

本文档定义了 wolf 各层共享的 TypeScript 类型。这些类型位于 `src/types/index.ts`，是 CLI、MCP、命令和存储层之间的契约。

---

## 核心领域类型

### `JobStatus`

```typescript
type JobStatus = "new" | "reviewed" | "applied" | "rejected";
```

生命周期：

```
new  →  reviewed  →  applied
                  →  rejected
```

### `JobSource`

```typescript
type JobSource = "linkedin" | "handshake" | "email" | "browser_mcp" | "manual";
```

### `Job`

单条职位信息，存储在 SQLite 中。

```typescript
interface Job {
  id: string;                        // 唯一 ID（uuid）
  title: string;                     // 例如 "Software Engineer Intern"
  company: string;                   // 例如 "Google"
  url: string;                       // 申请或列表 URL
  source: JobSource;                 // 职位来源
  description: string;               // 完整 JD 文本
  location: string;                  // 例如 "New York, NY" 或 "Remote"
  score: number | null;              // AI 相关性评分 0.0–1.0，未评分则为 null
  scoreJustification: string | null; // AI 对评分的解释
  status: JobStatus;
  tailoredResumePath: string | null; // 定制简历 .tex 文件路径
  tailoredResumePdfPath: string | null; // 编译后的简历 PDF 路径
  coverLetterPath: string | null;    // 求职信 .md 文件路径
  coverLetterPdfPath: string | null; // 求职信 PDF 路径
  screenshotPath: string | null;     // 表单填写截图路径
  outreachDraftPath: string | null;  // 外联邮件草稿路径
  createdAt: string;                 // ISO 8601 时间戳
  updatedAt: string;                 // ISO 8601 时间戳
}
```

### `Resume`

解析后的简历结构。由 `tailor` 命令内部使用。

```typescript
interface ResumeSection {
  heading: string;            // 例如 "Education"、"Experience"、"Skills"
  items: ResumeSectionItem[];
}

interface ResumeSectionItem {
  title: string;              // 例如 "Software Engineer Intern"
  subtitle: string | null;    // 例如 "Google — Mountain View, CA"
  date: string | null;        // 例如 "Jun 2025 – Aug 2025"
  bullets: string[];          // 要点描述
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
  rawTex: string;             // 原始 .tex 源码
}
```

### `UserProfile`

由 `wolf init` 收集的用户信息，存储在 `~/.wolf/config.json` 中。

```typescript
interface UserProfile {
  name: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  immigrationStatus: string | null;   // 例如 "US citizen"、"F-1 OPT"、"H-1B needed"
  currentCity: string | null;
  willingToRelocate: boolean;
  workAuthTimeline: string | null;    // 例如 "OPT starts May 2026"
  targetRoles: string[];              // 例如 ["Software Engineer", "Full Stack Developer"]
  targetLocations: string[];          // 例如 ["NYC", "SF", "Remote"]
  skills: string[];                   // 例如 ["TypeScript", "React", "Python"]
  resumePath: string;                 // 基础简历 .tex 文件路径
}
```

### `AppConfig`

顶层配置对象。从 `~/.wolf/config.json` 读取。

```typescript
interface AppConfig {
  profile: UserProfile;
  providers: Record<string, ProviderConfig>;
  hunt: {
    minScore: number;          // 最低分数阈值（默认 0.5）
    maxResults: number;        // 每次 hunt 最大结果数（默认 50）
  };
  tailor: {
    templatePath: string | null; // 可选的 LaTeX 简历模板
    coverLetterTone: string;     // 例如 "professional"、"conversational"
  };
  reach: {
    emailTone: string;         // 例如 "professional"、"casual"
    maxEmailsPerDay: number;   // 安全限制（默认 10）
  };
}

interface ProviderConfig {
  enabled: boolean;
  strategy?: string;           // 特定于 provider，例如 handshake 的 "email"
}
```

---

## 命令输入 / 输出类型

### `hunt`

```typescript
interface HuntOptions {
  role?: string;               // 目标职位关键词
  location?: string;           // 目标地点
  providers?: string[];        // 覆盖使用哪些 provider
  maxResults?: number;         // 覆盖 config.hunt.maxResults
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
  jobId: string;               // 要定制的职位 ID
  coverLetter?: boolean;       // 是否同时生成求职信（默认 true）
  diff?: boolean;              // 显示修改前后对比
}

interface TailorResult {
  tailoredTexPath: string;     // 输出 .tex 文件路径
  tailoredPdfPath: string;     // 编译后的简历 PDF 路径
  coverLetterMdPath: string | null;  // 求职信 .md 路径
  coverLetterPdfPath: string | null; // 求职信 PDF 路径
  changes: string[];           // 主要改动摘要
  matchScore: number;          // 定制后的预估匹配分数
}
```

### `file`

```typescript
interface FormField {
  name: string;                // 字段名称或标签
  type: string;                // "text"、"email"、"file"、"select"、"checkbox" 等
  required: boolean;
  value: string | null;        // 从用户资料映射的值，未映射则为 null
}

interface FileOptions {
  jobId: string;               // 要申请的职位 ID
  dryRun?: boolean;            // 仅预览，不提交（默认 true）
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
  title: string;               // 例如 "Engineering Manager"
  company: string;
  email: string | null;        // 真实或推断的邮箱
  emailInferred: boolean;      // 如果邮箱是从模式推测的则为 true
  linkedinUrl: string | null;
}

interface ReachOptions {
  jobId: string;               // 要进行外联的职位 ID
  send?: boolean;              // 是否实际发送邮件（默认 false）
}

interface ReachResult {
  contacts: Contact[];
  draftPath: string;           // 邮件草稿 .md 文件路径
  sent: boolean;
}
```

### `status`

```typescript
interface StatusOptions {
  status?: JobStatus;          // 按状态过滤
  minScore?: number;           // 按最低分数过滤
  since?: string;              // 按日期过滤（ISO 8601）
}

interface StatusResult {
  jobs: Job[];
  total: number;
  byStatus: Record<JobStatus, number>;
}
```

---

## Provider 接口

```typescript
interface JobProvider {
  name: string;
  hunt(options: HuntOptions): Promise<Job[]>;
}
```

内置 provider：`ApifyLinkedInProvider`、`ApifyHandshakeProvider`、`EmailProvider`、`BrowserMCPProvider`、`ManualProvider`。

---

## MCP Tool Schema

每个 MCP tool 直接映射到一个命令：

| MCP Tool | 输入类型 | 输出类型 |
|---|---|---|
| `wolf_hunt` | `HuntOptions` | `HuntResult` |
| `wolf_tailor` | `TailorOptions` | `TailorResult` |
| `wolf_file` | `FileOptions` | `FileResult` |
| `wolf_reach` | `ReachOptions` | `ReachResult` |

MCP 输入/输出 schema 是这些 TypeScript 类型的 JSON Schema 表示，定义在 `src/mcp/tools.ts` 中。
