const TIMEOUT_MS = 25_000;

function combinedSignal(signal) {
  return signal
    ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)])
    : AbortSignal.timeout(TIMEOUT_MS);
}

async function fetchJson(url, init = {}, signal) {
  const response = await fetch(url, {
    ...init,
    signal: combinedSignal(signal),
  });
  if (!response.ok) {
    throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  }
  return response.json();
}

async function searchWeb({ query }, signal) {
  if (!process.env.TAVILY_API_KEY) throw new Error("TAVILY_API_KEY is required");
  const data = await fetchJson("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: "advanced",
      max_results: 8,
      chunks_per_source: 3,
    }),
  }, signal);
  return (data.results || []).map(({ title, url, content }) => ({
    title,
    url,
    excerpt: String(content || "").slice(0, 1200),
  }));
}

async function searchScreeningList({ queries }, signal) {
  if (!process.env.SCREENING_LIST_API_KEY) {
    throw new Error("SCREENING_LIST_API_KEY is required");
  }

  const batches = await Promise.all(
    queries.slice(0, 4).map(async (name) => {
      const params = new URLSearchParams({
        "subscription-key": process.env.SCREENING_LIST_API_KEY,
        name,
        fuzzy_name: "true",
      });
      const data = await fetchJson(
        `https://data.trade.gov/consolidated_screening_list/v1/search?${params}`,
        { headers: { Accept: "application/json", "User-Agent": "Cliver/1.0" } },
        signal,
      );
      return data.results || [];
    }),
  );

  const seen = new Set();
  const matches = batches.flat().flatMap((entity) => {
    if (!entity.name || seen.has(entity.name)) return [];
    seen.add(entity.name);
    return [{
      name: entity.name,
      programs: Array.isArray(entity.programs) ? entity.programs : [entity.programs].filter(Boolean),
      source: entity.source,
      source_url: entity.source_list_url || entity.source_information_url || "",
    }];
  });

  if (matches.length) return matches;
  return [{
    status: "no_matches",
    name: "No matching records",
    queries: queries.slice(0, 4),
    match_count: 0,
    searched_at: new Date().toISOString(),
    source: "U.S. Consolidated Screening List",
    source_url: "https://www.trade.gov/consolidated-screening-list",
  }];
}

function cleanSearchTerm(value = "") {
  return value.replace(/["',.]/g, " ").replace(/\s+/g, " ").trim();
}

async function searchEuropePmc({ orcid, author, affiliation, topic, mode = "lite" }, signal) {
  const parts = [];
  if (orcid) parts.push(`AUTHORID:("${cleanSearchTerm(orcid)}")`);
  if (author) parts.push(`AUTHOR:("${cleanSearchTerm(author)}")`);
  if (affiliation) parts.push(`AFF:(${cleanSearchTerm(affiliation)})`);
  if (topic) parts.push(`(${cleanSearchTerm(topic)})`);
  if (!parts.length) throw new Error("Provide an author, ORCID, affiliation, or topic");

  const params = new URLSearchParams({
    query: parts.join(" AND "),
    resultType: "core",
    pageSize: mode === "full" ? "5" : "20",
    format: "json",
  });
  const data = await fetchJson(
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`,
    { headers: { Accept: "application/json" } },
    signal,
  );

  return (data.resultList?.result || []).map((article) => ({
    title: article.title,
    doi: article.doi,
    url: article.doi
      ? `https://doi.org/${article.doi}`
      : article.pmcid
        ? `https://europepmc.org/article/PMC/${article.pmcid}`
        : "",
    authors: article.authorString,
    year: article.pubYear,
    journal: article.journalInfo?.journal?.title,
    abstract: mode === "full" ? article.abstractText : undefined,
  }));
}

function parseOrcidWorks(works) {
  return (works.group || []).map((group) => {
    const work = group["work-summary"]?.[0] || {};
    const ids = group["external-ids"]?.["external-id"] || [];
    const doi = ids.find((id) => id["external-id-type"] === "doi")?.["external-id-value"];
    return {
      title: work.title?.title?.value,
      year: work["publication-date"]?.year?.value,
      doi,
      url: doi ? `https://doi.org/${doi}` : work.url?.value,
    };
  });
}

async function getOrcidProfile({ orcid_id }, signal) {
  const base = `https://pub.orcid.org/v3.0/${encodeURIComponent(orcid_id)}`;
  const headers = { Accept: "application/vnd.orcid+json" };
  const [person, employments, works] = await Promise.all([
    fetchJson(`${base}/person`, { headers }, signal),
    fetchJson(`${base}/employments`, { headers }, signal),
    fetchJson(`${base}/works`, { headers }, signal),
  ]);

  const name = person.name || {};
  const employment = (employments["affiliation-group"] || []).flatMap((group) =>
    (group.summaries || []).map((item) => {
      const entry = item["employment-summary"] || {};
      return {
        organization: entry.organization?.name,
        role: entry["role-title"],
        department: entry["department-name"],
        end_date: entry["end-date"]?.year?.value || null,
      };
    }),
  );
  const publications = parseOrcidWorks(works).slice(0, 20);

  return [{
    orcid: orcid_id,
    url: `https://orcid.org/${orcid_id}`,
    name: [
      name["given-names"]?.value,
      name["family-name"]?.value,
    ].filter(Boolean).join(" "),
    employment,
    publications,
  }];
}

async function searchOrcidWorks({ orcid_id, keywords }, signal) {
  const headers = { Accept: "application/vnd.orcid+json" };
  const works = await fetchJson(
    `https://pub.orcid.org/v3.0/${encodeURIComponent(orcid_id)}/works`,
    { headers },
    signal,
  );
  const terms = keywords.map((keyword) => keyword.toLowerCase().trim()).filter(Boolean);
  return parseOrcidWorks(works)
    .filter((work) => terms.some((term) => String(work.title || "").toLowerCase().includes(term)))
    .slice(0, 20)
    .map((work) => ({ ...work, orcid: orcid_id }));
}

export const TOOL_DEFINITIONS = [
  {
    type: "function",
    name: "search_web",
    description: "Search the public web. Prefer official institutional sites, government sources, and primary records.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    type: "function",
    name: "search_screening_list",
    description: "Search the U.S. Consolidated Screening List for people and institutions. Search the person and institution separately.",
    parameters: {
      type: "object",
      properties: {
        queries: { type: "array", items: { type: "string" }, maxItems: 4 },
      },
      required: ["queries"],
    },
  },
  {
    type: "function",
    name: "search_epmc",
    description: "Search Europe PMC for primary scientific works by author, ORCID, affiliation, or topic.",
    parameters: {
      type: "object",
      properties: {
        orcid: { type: "string" },
        author: { type: "string" },
        affiliation: { type: "string" },
        topic: { type: "string" },
        mode: { type: "string", enum: ["lite", "full"] },
      },
    },
  },
  {
    type: "function",
    name: "get_orcid_profile",
    description: "Get a researcher's public ORCID identity, employment, and recent works.",
    parameters: {
      type: "object",
      properties: { orcid_id: { type: "string" } },
      required: ["orcid_id"],
    },
  },
  {
    type: "function",
    name: "search_orcid_works",
    description: "Search all titles in a researcher's public ORCID works by relevant keywords.",
    parameters: {
      type: "object",
      properties: {
        orcid_id: { type: "string" },
        keywords: {
          type: "array",
          items: { type: "string" },
          maxItems: 8,
        },
      },
      required: ["orcid_id", "keywords"],
    },
  },
];

const EXECUTORS = {
  search_web: searchWeb,
  search_screening_list: searchScreeningList,
  search_epmc: searchEuropePmc,
  get_orcid_profile: getOrcidProfile,
  search_orcid_works: searchOrcidWorks,
};

export async function executeTool(name, args, signal) {
  const executor = EXECUTORS[name];
  if (!executor) throw new Error(`Unknown tool: ${name}`);
  return executor(args, signal);
}

export function sourceFromItem(tool, id, item) {
  if (tool === "search_web") {
    return { id, tool, title: item.title || item.url, url: item.url || "" };
  }
  if (tool === "search_screening_list") {
    return { id, tool, title: item.name || "Screening List result", url: item.source_url || "" };
  }
  if (tool === "search_epmc") {
    return { id, tool, title: item.title || "Europe PMC result", url: item.url || "" };
  }
  if (tool === "get_orcid_profile") {
    return { id, tool, title: item.name || item.orcid, url: item.url || "" };
  }
  if (tool === "search_orcid_works") {
    return { id, tool, title: item.title || "ORCID work", url: item.url || "" };
  }
  return { id, tool, title: id, url: "" };
}
