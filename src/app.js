import { initBotId } from "botid/client/core";

initBotId({
  protect: [{ path: "/api/screen", method: "POST" }],
});

const form = document.querySelector("#screen-form");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const errorBox = document.querySelector("#error");
const submitButton = document.querySelector("#submit-button");
const elapsed = document.querySelector("#elapsed");
const reports = {};
let timer;

const EXAMPLE = {
  name: "Avery Morgan",
  institution: "Northbridge Institute of Biosciences",
  email: "avery.morgan@example.org",
  orcid: "",
  order: "Fictional demonstration order related to bacteriophage capsid assembly",
};

document.querySelector("#example-button").addEventListener("click", () => {
  for (const [name, value] of Object.entries(EXAMPLE)) form.elements[name].value = value;
  form.elements.name.focus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setRunning(true);
  const data = new FormData(form);
  const customer = Object.fromEntries(
    ["name", "institution", "email", "orcid", "order"]
      .map((field) => [field, String(data.get(field) || "").trim()]),
  );

  try {
    const response = await fetch("/api/screen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || payload.error || "Screening failed");
    showResults(payload);
  } catch (error) {
    errorBox.textContent = error instanceof Error ? error.message : String(error);
    errorBox.hidden = false;
  } finally {
    setRunning(false);
  }
});

function setRunning(running) {
  submitButton.disabled = running;
  submitButton.textContent = running ? "Screening…" : "Screen customer";
  status.hidden = !running;
  errorBox.hidden = true;
  if (!running) {
    clearInterval(timer);
    return;
  }
  results.hidden = true;
  const started = Date.now();
  elapsed.textContent = "0:00";
  timer = setInterval(() => {
    const seconds = Math.floor((Date.now() - started) / 1000);
    elapsed.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }, 1000);
}

function showResults(payload) {
  reports.screening = payload.screening.markdown;
  reports.backgroundWork = payload.backgroundWork.markdown;
  document.querySelector("#screening-report").innerHTML = renderMarkdown(
    payload.screening.markdown,
    payload.screening.sources,
  );
  document.querySelector("#work-report").innerHTML = renderMarkdown(
    payload.backgroundWork.markdown,
    payload.backgroundWork.sources,
  );
  renderSources("#screening-sources", payload.screening.sources);
  renderSources("#work-sources", payload.backgroundWork.sources);
  renderCitationWarning("#screening-report", payload.screening.citationWarnings);
  renderCitationWarning("#work-report", payload.backgroundWork.citationWarnings);
  document.querySelector("#duration").textContent = formatDuration(payload.durationMs);
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCitationWarning(selector, warnings = []) {
  if (!warnings.length) return;
  const notice = document.createElement("p");
  notice.className = "citation-warning";
  notice.textContent = `Check unsupported source reference${warnings.length === 1 ? "" : "s"}: ${warnings.join(", ")}`;
  document.querySelector(selector).prepend(notice);
}

function formatDuration(milliseconds) {
  const seconds = Math.round(milliseconds / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inlineMarkdown(value, sourceMap) {
  let html = escapeHtml(value);
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) =>
    `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`,
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[((?:web|screen|epmc|orcid)\d+)\]/g, (_, id) => {
    const source = sourceMap.get(id);
    return source?.url
      ? `<a class="source-ref" href="${escapeHtml(source.url)}" title="${escapeHtml(source.title)}" target="_blank" rel="noopener noreferrer">[${id}]</a>`
      : `<span class="source-ref unsupported" title="This reference was not returned by a search tool">[${id}] unsupported</span>`;
  });
  return html;
}

function renderMarkdown(markdown, sources = []) {
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const lines = String(markdown || "").replaceAll("\r", "").split("\n");
  const output = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith("|") && lines[index + 1]?.trim().match(/^\|?[\s:|-]+\|/)) {
      const rows = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(lines[index].trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
        index += 1;
      }
      const headings = rows[0] || [];
      const body = rows.slice(2);
      output.push("<div class=\"table-scroll\"><table><thead><tr>");
      output.push(headings.map((cell) => `<th>${inlineMarkdown(cell, sourceMap)}</th>`).join(""));
      output.push("</tr></thead><tbody>");
      for (const row of body) {
        output.push("<tr>");
        output.push(row.map((cell) => `<td>${inlineMarkdown(cell, sourceMap)}</td>`).join(""));
        output.push("</tr>");
      }
      output.push("</tbody></table></div>");
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 2, 5);
      output.push(`<h${level}>${inlineMarkdown(heading[2], sourceMap)}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      output.push(`<ul>${items.map((item) => `<li>${inlineMarkdown(item, sourceMap)}</li>`).join("")}</ul>`);
      continue;
    }

    output.push(`<p>${inlineMarkdown(line, sourceMap)}</p>`);
    index += 1;
  }
  return output.join("");
}

function renderSources(selector, sources = []) {
  const details = document.querySelector(selector);
  const list = details.querySelector("ol");
  const unique = [...new Map(sources.map((source) => [source.id, source])).values()];
  list.innerHTML = unique.map((source) => `
    <li>
      <span>${escapeHtml(source.id)}</span>
      ${source.url
        ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title || source.url)} ↗</a>`
        : escapeHtml(source.title || "No public URL")}
    </li>
  `).join("");
  details.hidden = unique.length === 0;
  details.querySelector("summary").textContent = `${unique.length} source${unique.length === 1 ? "" : "s"} searched`;
}

document.querySelectorAll(".copy-button").forEach((button) => {
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(reports[button.dataset.copy] || "");
    const previous = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = previous; }, 1200);
  });
});
