const DEFAULT_MODEL = "@cf/zai-org/glm-4.7-flash";
const MAX_OUTPUT_TOKENS = 1536;
const MAX_MESSAGES = 10;

export class AssistantProviderError extends Error {
  constructor(category, message, { retryable = false } = {}) {
    super(message);
    this.name = "AssistantProviderError";
    this.category = category;
    this.retryable = retryable;
  }
}

function safeModel(value) {
  return typeof value === "string" && /^@cf\/[a-z0-9][a-z0-9._/-]*$/i.test(value)
    ? value
    : DEFAULT_MODEL;
}

function contentText(value) {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  return value
    .map(part => typeof part === "string" ? part : typeof part?.text === "string" ? part.text : "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractText(result) {
  const candidates = [
    typeof result === "string" ? result : null,
    result?.response,
    result?.output_text,
    result?.result?.response,
    result?.choices?.[0]?.message?.content,
    result?.result?.choices?.[0]?.message?.content,
    result?.message?.content,
    result?.result?.message?.content
  ];
  for (const candidate of candidates) {
    const text = contentText(candidate);
    if (text) return text;
  }
  return "";
}

function normalizeUsage(result) {
  const usage = result?.usage ?? result?.result?.usage;
  if (!usage || typeof usage !== "object") return null;

  const fields = [
    ["inputTokens", usage.prompt_tokens ?? usage.input_tokens],
    ["outputTokens", usage.completion_tokens ?? usage.output_tokens],
    ["totalTokens", usage.total_tokens]
  ];
  const normalized = {};
  for (const [name, value] of fields) {
    if (value !== undefined && value !== null && Number.isFinite(Number(value)) && Number(value) >= 0) {
      normalized[name] = Math.floor(Number(value));
    }
  }
  return Object.keys(normalized).length ? normalized : null;
}

export function classifyAssistantProviderError(error) {
  const message = String(error?.message ?? error ?? "").toLowerCase();

  if (/\b(401|403)\b|unauthori[sz]ed|forbidden|authentication/.test(message)) {
    return new AssistantProviderError("authentication", "The AI provider rejected its configured credentials.");
  }
  if (/\b429\b|rate.?limit|too many requests|quota/.test(message)) {
    return new AssistantProviderError("rate_limit", "The AI provider rate limit or quota was reached.", { retryable: true });
  }
  if (/\b(408|504)\b|timed?\s*out|timeout|abort/.test(message)) {
    return new AssistantProviderError("timeout", "The AI provider request timed out.", { retryable: true });
  }
  if (/\b(400|7003)\b|bad request|invalid request|unsupported model/.test(message)) {
    return new AssistantProviderError("invalid_request", "The AI provider rejected the request format or model.");
  }
  return new AssistantProviderError("unavailable", "The AI provider is temporarily unavailable.", { retryable: true });
}

function truncateUtf16(value, maxUnits) {
  let end = 0;
  let units = 0;
  for (const character of value) {
    const width = character.length;
    if (units + width > maxUnits) break;
    units += width;
    end += width;
  }
  return value.slice(0, end);
}

export function createAssistantProvider(env) {
  const binding = env?.AI;
  if (!binding || typeof binding.run !== "function") return null;

  const model = safeModel(env.AI_MODEL);
  return Object.freeze({
    provider: "cloudflare-workers-ai",
    model,
    capabilities: Object.freeze({
      streaming: false,
      requestTimeout: false,
      cancellation: false
    }),
    retryPolicy: Object.freeze({
      maxAttempts: 1,
      automatic: false
    }),
    async generate({ messages, maxTokens = MAX_OUTPUT_TOKENS } = {}) {
      if (
        !Array.isArray(messages) ||
        messages.length < 1 ||
        messages.length > MAX_MESSAGES ||
        !messages.every(item =>
          item &&
          ["system", "user", "assistant"].includes(item.role) &&
          typeof item.content === "string" &&
          item.content.length <= 8000
        )
      ) {
        throw new AssistantProviderError("invalid_request", "The normalized AI request is invalid.");
      }

      const boundedTokens = Number.isInteger(maxTokens)
        ? Math.min(MAX_OUTPUT_TOKENS, Math.max(1, maxTokens))
        : MAX_OUTPUT_TOKENS;

      let result;
      try {
        result = await binding.run(model, {
          messages,
          max_tokens: boundedTokens
        });
      } catch (error) {
        throw classifyAssistantProviderError(error);
      }

      const text = extractText(result);
      if (!text) {
        throw new AssistantProviderError("empty_response", "The AI provider returned no usable text.");
      }

      return Object.freeze({
        provider: "cloudflare-workers-ai",
        model,
        text: truncateUtf16(text, 3000),
        usage: normalizeUsage(result)
      });
    }
  });
}

export const assistantProviderDefaults = Object.freeze({
  model: DEFAULT_MODEL,
  maxOutputTokens: MAX_OUTPUT_TOKENS,
  maxMessages: MAX_MESSAGES
});
