// Vitest natively supports ESM — vi.mock() is automatically hoisted to the top
// Vitest 原生支持 ESM，vi.mock() 会自动提升到文件顶部执行
import { vi, describe, test, expect } from "vitest";
import { anthropicClient, openaiClient } from "./ai.js";

// Mock Anthropic SDK — intercepts real network requests, returns hardcoded fake data
// Mock Anthropic SDK — 拦截真实网络请求，返回写死的假数据
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "mock: hello from claude" }],
      }),
    },
  })),
}));

// Mock OpenAI SDK — same pattern as above
// Mock OpenAI SDK — 同上
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "mock: hello from gpt" } }],
        }),
      },
    },
  })),
}));

// =====================================================================
// Type checks — verify the exports exist and are functions
// 类型检查 — 验证函数存在
// =====================================================================

describe("AIClient type", () => {
  test("anthropicClient is a function", () => {
    expect(typeof anthropicClient).toBe("function");
  });

  test("openaiClient is a function", () => {
    expect(typeof openaiClient).toBe("function");
  });
});

// =====================================================================
// anthropicClient — uses mock, no API key needed, no cost
// anthropicClient — 使用 mock，不需要 API key，不花钱
// =====================================================================

describe("anthropicClient", () => {
  test("returns a non-empty string", async () => {
    const result = await anthropicClient("Reply with just the word: hello");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("accepts an optional systemPrompt", async () => {
    const result = await anthropicClient(
      "What are you?",
      "You are a helpful assistant. Reply in one sentence.",
    );
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

// =====================================================================
// openaiClient — uses mock, no API key needed, no cost
// openaiClient — 使用 mock，不需要 API key，不花钱
// =====================================================================

describe("openaiClient", () => {
  test("returns a non-empty string", async () => {
    const result = await openaiClient("Reply with just the word: hello");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("accepts an optional systemPrompt", async () => {
    const result = await openaiClient(
      "What are you?",
      "You are a helpful assistant. Reply in one sentence.",
    );
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
