const MAX_TOOL_ROUNDS = 3;

function outputText(response) {
  return (response.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

async function request({ apiKey, model, instructions, input, responseSchema, tools, maxOutputTokens }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      ...(instructions && { instructions }),
      input,
      tools,
      tool_choice: "auto",
      parallel_tool_calls: true,
      ...(responseSchema && {
        text: {
          format: {
            type: "json_schema",
            name: "chat_ai_reply",
            strict: true,
            schema: responseSchema,
          },
        },
      }),
      max_output_tokens: maxOutputTokens,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result?.error?.message || "OpenAI reply তৈরি করতে পারেনি।");
    error.code = result?.error?.code || result?.error?.type || `http_${response.status}`;
    throw error;
  }
  return result;
}

/** Run OpenAI Responses function calls on the server, then return its final text. */
export async function runOpenAiFunctionLoop({
  ai,
  model,
  instructions,
  input,
  responseSchema,
  tools,
  executeTool,
  onToolExecuted = () => {},
  maxOutputTokens,
}) {
  const nextInput = [...input];
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const response = await request({
      apiKey: ai.apiKey,
      model,
      instructions,
      input: nextInput,
      responseSchema,
      tools,
      maxOutputTokens,
    });
    const calls = (response.output || []).filter((item) => item.type === "function_call");
    if (!calls.length) {
      const output = outputText(response);
      if (!output) throw new Error("OpenAI খালি reply দিয়েছে।");
      return output;
    }
    if (round === MAX_TOOL_ROUNDS) throw new Error("OpenAI chat function-call limit exceeded.");

    // Keep the model's tool-call items (including reasoning items) in the turn.
    nextInput.push(...response.output);
    const results = await Promise.all(calls.map(async (call) => {
      let output;
      try {
        const handler = executeTool[call.name];
        if (!handler) throw new Error("এই function অনুমোদিত নয়।");
        const args = JSON.parse(call.arguments || "{}");
        output = await handler(args);
      } catch (error) {
        console.error("Chat AI function failed:", {
          name: call.name,
          code: error?.code || "chat_tool_failed",
        });
        output = { ok: false, error: "Verified information is temporarily unavailable. Do not guess; explain this briefly to the customer." };
      }
      try { onToolExecuted(call.name); } catch {}
      const serialized = JSON.stringify(output);
      return {
        type: "function_call_output",
        call_id: call.call_id,
        output: serialized.length <= 20000
          ? serialized
          : JSON.stringify({ ok: false, error: "Result too large; narrow the lookup and call again." }),
      };
    }));
    nextInput.push(...results);
  }
  throw new Error("OpenAI chat function-call loop ended unexpectedly.");
}
