import assert from "node:assert/strict";
import test from "node:test";

import {
  AssistantProviderError,
  classifyAssistantProviderError,
  createAssistantProvider
} from "../src/assistant-provider.js";

test("normalizes provider text and usage while enforcing output token limits", async () => {
  let received;
  const provider = createAssistantProvider({
    AI_MODEL: "@cf/example/model",
    AI: {
      async run(model, input, options) {
        received = { model, input, options };
        return {
          response: "  پاسخ آزمایشی  ",
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        };
      }
    }
  });

  const result = await provider.generate({
    messages: [{ role: "user", content: "سلام" }],
    maxTokens: 9000
  });

  assert.equal(received.model, "@cf/example/model");
  assert.equal(received.input.max_completion_tokens, 512);
  assert.equal(Object.hasOwn(received.input, "max_tokens"), false);
  assert.equal(Object.hasOwn(received.input, "chat_template_kwargs"), false);
  assert.deepEqual(received.options, { rejectIfBusy: true });
  assert.equal(result.text, "پاسخ آزمایشی");
  assert.deepEqual(result.usage, { inputTokens: 10, outputTokens: 20, totalTokens: 30 });
});

test("disables GLM thinking mode when the default model is selected", async () => {
  let received;
  const provider = createAssistantProvider({
    AI: {
      async run(model, options) {
        received = { model, options };
        return { response: "ok" };
      }
    }
  });

  await provider.generate({ messages: [{ role: "user", content: "test" }] });
  assert.equal(received.model, "@cf/zai-org/glm-4.7-flash");
  assert.equal(received.options.max_tokens, 512);
  assert.deepEqual(received.options.chat_template_kwargs, { enable_thinking: false });
});

test("requests immediate rejection rather than waiting in the Workers AI capacity queue", async () => {
  let call;
  const provider = createAssistantProvider({
    AI: {
      async run(model, input, options) {
        call = { model, input, options };
        return { response: "fallback adapter test" };
      }
    }
  });

  await provider.generate({ messages: [{ role: "user", content: "test" }] });
  assert.equal(call.options.rejectIfBusy, true);
  assert.equal(call.input.max_completion_tokens, 512);
});

test("falls back to the safe default model for an invalid model name", async () => {
  let selectedModel;
  const provider = createAssistantProvider({
    AI_MODEL: "https://untrusted.example/model",
    AI: {
      async run(model) {
        selectedModel = model;
        return { response: "ok" };
      }
    }
  });

  await provider.generate({ messages: [{ role: "user", content: "test" }] });
  assert.equal(selectedModel, "@cf/zai-org/glm-4.7-flash");
});

test("rejects malformed normalized messages before calling the provider", async () => {
  let called = false;
  const provider = createAssistantProvider({
    AI: {
      async run() {
        called = true;
        return { response: "unexpected" };
      }
    }
  });

  await assert.rejects(
    provider.generate({ messages: [{ role: "system", content: 42 }] }),
    error => error instanceof AssistantProviderError && error.category === "invalid_request"
  );
  assert.equal(called, false);
});

test("classifies provider timeouts as retryable", () => {
  const error = classifyAssistantProviderError(new Error("request timed out"));
  assert.equal(error.category, "timeout");
  assert.equal(error.retryable, true);
});
