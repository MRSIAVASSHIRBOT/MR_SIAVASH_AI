import test from "node:test";
import assert from "node:assert/strict";
import {
  AssistantProviderError,
  assistantProviderDefaults,
  classifyAssistantProviderError,
  createAssistantProvider
} from "../src/assistant-provider.js";

test("provider adapter stays disabled without an AI binding", () => {
  assert.equal(createAssistantProvider({}), null);
  assert.equal(createAssistantProvider({ AI: {} }), null);
});

test("provider adapter uses a safe default model and a reasoning-safe bounded token budget", async () => {
  let call;
  const provider = createAssistantProvider({
    AI: { run: async (model, input) => {
      call = { model, input };
      return { response: "پاسخ تأییدشده" };
    } }
  });
  assert.equal(provider.provider, "cloudflare-workers-ai");
  assert.equal(provider.model, assistantProviderDefaults.model);
  assert.equal(assistantProviderDefaults.maxOutputTokens, 1536);
  const result = await provider.generate({ messages: [{ role: "user", content: "سلام" }], maxTokens: 4096 });
  assert.equal(call.model, assistantProviderDefaults.model);
  assert.equal(call.input.max_tokens, 1536);
  assert.equal(result.text, "پاسخ تأییدشده");
  assert.equal(result.usage, null);
});

test("provider adapter uses the configured token budget when no override is supplied", async () => {
  let input;
  const provider = createAssistantProvider({
    AI: { run: async (_model, value) => { input = value; return { response: "ok" }; } }
  });
  await provider.generate({ messages: [{ role: "user", content: "hello" }] });
  assert.equal(input.max_tokens, assistantProviderDefaults.maxOutputTokens);
});

test("provider adapter accepts only a valid Workers AI model identifier", async () => {
  let selected;
  const provider = createAssistantProvider({
    AI_MODEL: "openai/gpt-4.1",
    AI: { run: async model => { selected = model; return "ok"; } }
  });
  await provider.generate({ messages: [{ role: "user", content: "hello" }] });
  assert.equal(selected, assistantProviderDefaults.model);
});

test("provider adapter normalizes Workers AI and OpenAI-compatible response envelopes", async () => {
  const outputs = [
    [{ output_text: "first" }, "first"],
    [{ result: { response: "second" } }, "second"],
    [{ choices: [{ message: { content: "third" } }] }, "third"],
    [{ result: { choices: [{ message: { content: "fourth" } }] } }, "fourth"],
    [{ message: { content: [{ type: "text", text: "fifth" }] } }, "fifth"],
    [{ result: { message: { content: "sixth" } } }, "sixth"]
  ];
  for (const [output, expected] of outputs) {
    const provider = createAssistantProvider({ AI: { run: async () => output } });
    const result = await provider.generate({ messages: [{ role: "user", content: "hello" }] });
    assert.equal(result.text, expected);
  }

  const provider = createAssistantProvider({
    AI: { run: async () => ({
      response: "usage",
      usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17, internal_detail: "ignored" }
    }) }
  });
  const result = await provider.generate({ messages: [{ role: "user", content: "hello" }] });
  assert.deepEqual(result.usage, { inputTokens: 12, outputTokens: 5, totalTokens: 17 });
});

test("provider adapter rejects invalid message envelopes before calling the binding", async () => {
  let called = false;
  const provider = createAssistantProvider({ AI: { run: async () => { called = true; return "unexpected"; } } });
  await assert.rejects(
    provider.generate({ messages: [{ role: "tool", content: "not allowed" }] }),
    error => error instanceof AssistantProviderError && error.category === "invalid_request"
  );
  assert.equal(called, false);
});

test("provider adapter reports empty model output as a typed error without treating reasoning as user-facing text", async () => {
  const provider = createAssistantProvider({
    AI: { run: async () => ({ response: "  ", reasoning: "internal reasoning only" }) }
  });
  await assert.rejects(
    provider.generate({ messages: [{ role: "user", content: "hello" }] }),
    error => error instanceof AssistantProviderError && error.category === "empty_response"
  );
});

test("provider errors are normalized without exposing upstream details", () => {
  const cases = [
    ["401 invalid token", "authentication", false],
    ["HTTP 429 rate limit", "rate_limit", true],
    ["504 request timeout", "timeout", true],
    ["400 unsupported model", "invalid_request", false],
    ["7003 User Input Error", "invalid_request", false],
    ["upstream unavailable", "unavailable", true]
  ];
  for (const [message, category, retryable] of cases) {
    const error = classifyAssistantProviderError(new Error(message));
    assert.equal(error.category, category);
    assert.equal(error.retryable, retryable);
    assert.doesNotMatch(error.message, /invalid token|HTTP 429|504 request timeout|400 unsupported model/i);
  }
});

test("provider adapter makes retry and cancellation limits explicit", () => {
  const provider = createAssistantProvider({ AI: { run: async () => "ok" } });
  assert.deepEqual(provider.retryPolicy, { maxAttempts: 1, automatic: false });
  assert.deepEqual(provider.capabilities, {
    streaming: false,
    requestTimeout: false,
    cancellation: false
  });
});
