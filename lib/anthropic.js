import { executeTool, sourceFromItem, TOOL_DEFINITIONS } from "./tools.js";

const MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-5-5";
const MAX_TOOL_ROUNDS = 4;
const MAX_TOOL_CALLS = 10;
const MAX_WEB_CALLS = 4;
const PREFIXES = {
  search_web: "web",
  search_screening_list: "screen",
  search_epmc: "epmc",
  get_orcid_profile: "orcid",
  search_orcid_works: "orcworks",
};

function headers() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is required");
  return {
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
  };
}

async function modelResponse(messages, signal) {
  const response = await fetch(MESSAGES_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: TOOL_DEFINITIONS.map(({ name, description, parameters }) => ({
        name, description, input_schema: parameters,
      })),
      output_config: { effort: "low" },
      max_tokens: 8_000,
    }),
    signal,
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 800);
    throw new Error(`Model request failed (${response.status}): ${detail}`);
  }
  const result = await response.json();
  if (!["end_turn", "tool_use"].includes(result.stop_reason)) {
    throw new Error(`Model response incomplete (${result.stop_reason})`);
  }
  return result;
}

function toolFailure(error) {
  return {
    error: true,
    message: error instanceof Error ? error.message : String(error),
  };
}

export function citationWarnings(markdown, sources) {
  const known = new Set(sources.map((source) => source.id));
  const cited = [...String(markdown).matchAll(/\[((?:web|screen|epmc|orcid|orcworks)\d+)\]/g)]
    .map((match) => match[1]);
  return [...new Set(cited.filter((id) => !known.has(id)))];
}

export async function runPrompt(prompt, { signal, onProgress = () => {} } = {}) {
  const input = [{ role: "user", content: prompt }];
  const counters = {};
  const sources = [];
  let toolCallCount = 0;
  let webCallCount = 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await modelResponse(input, signal);
    const output = response.content || [];
    const calls = output.filter((item) => item.type === "tool_use");

    if (!calls.length) {
      const markdown = output.filter((item) => item.type === "text").map((item) => item.text).join("");
      if (!markdown.trim()) throw new Error("The model returned no report");
      return {
        markdown,
        sources,
        model: MODEL,
        citationWarnings: citationWarnings(markdown, sources),
      };
    }

    onProgress({ round: round + 1, tools: calls.map((call) => call.name) });
    input.push({ role: "assistant", content: output });
    const toolResults = [];
    for (const call of calls) {
      const name = call.name || "";
      const prefix = PREFIXES[name] || "source";
      const args = call.input || {};

      toolCallCount += 1;
      if (name === "search_web") webCallCount += 1;

      let result;
      try {
        if (toolCallCount > MAX_TOOL_CALLS) throw new Error("Combined tool-call budget reached");
        if (webCallCount > MAX_WEB_CALLS) throw new Error("Web-search budget reached");
        result = await executeTool(name, args, signal);
      } catch (error) {
        result = toolFailure(error);
      }

      const items = Array.isArray(result) ? result : [];
      const annotated = items.map((item) => {
        counters[prefix] = (counters[prefix] || 0) + 1;
        const id = `${prefix}${counters[prefix]}`;
        sources.push(sourceFromItem(name, id, item));
        return { id, ...item };
      });
      const toolOutput = {
        instruction: `Cite results as [${prefix}1], [${prefix}2], and so on.`,
        results: annotated,
        ...(Array.isArray(result) ? {} : result),
      };

      toolResults.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: JSON.stringify(toolOutput),
      });
    }
    input.push({ role: "user", content: toolResults });
  }

  throw new Error("The model exceeded the tool-call limit");
}

export { MODEL };
