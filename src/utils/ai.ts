/**
 * AIClient — 所有 AI 提供商的统一函数签名。
 *
 * prompt       : 用户的消息
 * systemPrompt : 可选，设定 AI 行为的系统指令
 * 返回值        : AI 的回复文本
 */
export type AIClient = (
  prompt: string,
  systemPrompt?: string,
) => Promise<string>;

/**
 * Unified AI call. Routes to the correct provider based on options.
 * Use this in all wolf commands — do NOT call anthropicClient/openaiClient directly.
 *
 * @param prompt - User message
 * @param systemPrompt - Optional system instruction
 * @param options - provider defaults to 'anthropic'; model defaults to haiku
 * TODO: implement by calling anthropicClient or openaiClient based on options.provider
 */
export async function aiClient(
  _prompt: string,
  _systemPrompt?: string,
  _options?: {
    provider?: 'anthropic' | 'openai';
    model?: string;
  }
): Promise<string> {
  throw new Error('not implemented');
}

/**
 * 调用 Claude（Anthropic）并返回回复文本。
 * TODO: 使用 @anthropic-ai/sdk 实现
 */
export const anthropicClient: AIClient = async (_prompt, _systemPrompt) => {
  // _ 前缀表示参数未使用，避免编译器警告，完成后记得去掉
  throw new Error("not implemented");
};

/**
 * 调用 GPT（OpenAI）并返回回复文本。
 * TODO: 使用 openai 实现
 */
export const openaiClient: AIClient = async (_prompt, _systemPrompt) => {
  // _ 前缀表示参数未使用，避免编译器警告，完成后记得去掉
  throw new Error("not implemented");
};
