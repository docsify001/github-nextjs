import { createOpenAI } from '@ai-sdk/openai';

// 默认配置
const DEFAULT_CONFIG = {
  ollama: {
    baseURL: process.env.OLLAMA_BASE_URL ?? "https://d05291002-ollama-webui-qwen3v2-285-nsrr8frc-11434.550c.cloud/api",
    model: process.env.OLLAMA_MODEL ?? "qwen3:30b-a3b"
  },
  deepseek: {
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-r1",
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1"
  },
  openai: {
    model: process.env.OPENAI_MODEL ?? "deepseek_7b",
    apiKey: process.env.OPENAI_API_KEY ?? "apk_key",
    baseURL: process.env.OPENAI_BASE_URL ?? "https://mindie-deepseek-7b-webui910bv2-84-qh18akgt-1025.suanleme.cloud/v1"
  }
};

// 创建 OpenAI 兼容实例
export const createOpenAIInstance = () => {
  console.info("[providers.ts] [createOpenAIInstance] model:", DEFAULT_CONFIG.openai)

  const openai = createOpenAI({
    apiKey: DEFAULT_CONFIG.openai.apiKey,
    baseURL: DEFAULT_CONFIG.openai.baseURL,
    // custom settings, e.g.
    compatibility: 'strict', // strict mode, enable when using the OpenAI API
  });
  return openai(DEFAULT_CONFIG.openai.model)
};