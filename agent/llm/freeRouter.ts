import { GoogleGenAI, Type } from '@google/genai';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function extractJsonString(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function callGeminiServerSide(messages: LlmMessage[], schema?: Record<string, unknown>): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) throw new Error('GEMINI_API_KEY is not configured');

  const systemInstruction = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n');

  const userContents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => m.content)
    .join('\n\n');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: userContents,
    config: {
      ...(systemInstruction ? { systemInstruction } : {}),
      responseMimeType: 'application/json',
      ...(schema ? { responseSchema: schema as any } : {}),
    },
  });

  const text = response.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

async function callOpenAiCompatibleFree(
  endpoint: string,
  apiKey: string | undefined,
  model: string,
  messages: LlmMessage[],
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  if (!apiKey) throw new Error(`API key missing for ${model}`);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.45,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    throw new Error(`${model} HTTP ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Empty response from ${model}`);
  return content;
}

export async function generateJsonWithFreeRouter<T>(
  messages: LlmMessage[],
  geminiSchema?: Record<string, unknown>
): Promise<{ data: T; provider: string }> {
  const providers: Array<{ name: string; enabled: boolean; run: () => Promise<string> }> = [
    {
      name: 'gemini-4-hydrogen',
      enabled: Boolean(process.env.GEMINI_API_KEY),
      run: () => callGeminiServerSide(messages, geminiSchema),
    },
    {
      name: 'openrouter-deepseek-free',
      enabled: Boolean(process.env.OPENROUTER_API_KEY),
      run: () =>
        callOpenAiCompatibleFree(
          'https://openrouter.ai/api/v1/chat/completions',
          process.env.OPENROUTER_API_KEY,
          process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324:free',
          messages,
          { 'HTTP-Referer': 'https://ashkghalam.ir', 'X-Title': 'AshkGhalam-SEO-Worker' }
        ),
    },
    {
      name: 'groq-llama-free',
      enabled: Boolean(process.env.GROQ_API_KEY),
      run: () =>
        callOpenAiCompatibleFree(
          'https://api.groq.com/openai/v1/chat/completions',
          process.env.GROQ_API_KEY,
          process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages
        ),
    },
  ].filter((p) => p.enabled);

  if (providers.length === 0) {
    throw new Error('NO_EXTERNAL_LLM_KEYS');
  }

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const raw = await withRetry(() => provider.run(), {
        retries: 2,
        baseDelayMs: 1500,
        label: provider.name,
      });
      const parsed = JSON.parse(extractJsonString(raw)) as T;
      logger.info('FreeRouter', `Generated JSON via ${provider.name}`);
      return { data: parsed, provider: provider.name };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider.name}: ${msg}`);
      logger.warn('FreeRouter', `Provider ${provider.name} failed, failing over`, { msg });
    }
  }

  throw new Error(`All configured free LLM providers failed:\n${errors.join('\n')}`);
}

export { Type as GeminiSchemaType };
