import { executeTool, sourceFromItem, TOOL_DEFINITIONS } from "./tools.js";

const RESPONSES_URL = "https://openrouter.ai/api/v1/responses";
const MODEL = "google/gemini-2.5-pro";
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
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is required");
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://cliver.vercel.app",
    "X-Title": "Cliver",
  };
}

function responseText(output) {
  return output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text || "")
    .join("");
}

async function modelResponse(input, signal) {
  const response = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: MODEL,
      input,
      tools: TOOL_DEFINITIONS,
      tool_choice: "auto",
      reasoning: { effort: "medium" },
      max_output_tokens: 4_000,
    }),
    signal,
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 800);
    throw new Error(`Model request failed (${response.status}): ${detail}`);
  }
  return response.json();
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
    const output = response.output || [];
    const calls = output.filter((item) => item.type === "function_call");

    if (!calls.length) {
      const markdown = responseText(output) || response.output_text || "";
      if (!markdown.trim()) throw new Error("The model returned no report");
      return {
        markdown,
        sources,
        model: MODEL,
        citationWarnings: citationWarnings(markdown, sources),
      };
    }

    onProgress({ round: round + 1, tools: calls.map((call) => call.name) });
    for (const call of calls) {
      const name = call.name || "";
      const prefix = PREFIXES[name] || "source";
      let args = {};
      try {
        args = JSON.parse(call.arguments || "{}");
      } catch {
        args = {};
      }

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

      input.push({
        type: "function_call",
        id: call.id || call.call_id,
        call_id: call.call_id,
        name,
        arguments: call.arguments || "{}",
        status: "completed",
      });
      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(toolOutput),
      });
    }
  }

  throw new Error("The model exceeded the tool-call limit");
}

export { MODEL };
