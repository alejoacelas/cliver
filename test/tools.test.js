import test from "node:test";
import assert from "node:assert/strict";
import { sourceFromItem, TOOL_DEFINITIONS } from "../lib/tools.js";

test("exposes web search and the four evaluated specialist tools", () => {
  assert.deepEqual(
    TOOL_DEFINITIONS.map((tool) => tool.name),
    ["search_web", "search_screening_list", "search_epmc", "get_orcid_profile", "search_orcid_works"],
  );
});

test("normalizes source links for the report viewer", () => {
  assert.deepEqual(
    sourceFromItem("search_epmc", "epmc1", {
      title: "Example paper",
      url: "https://doi.org/10.1/example",
    }),
    {
      id: "epmc1",
      tool: "search_epmc",
      title: "Example paper",
      url: "https://doi.org/10.1/example",
    },
  );
});
