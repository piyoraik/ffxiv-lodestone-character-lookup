const fs = require("node:fs");
const path = require("node:path");
const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://jp.finalfantasyxiv.com";
const DEFAULT_CHARACTER_ID = "7594960";
const DOCS_PATH = path.join(process.cwd(), "docs", "achievements.md");
const DATA_DIR = path.join(process.cwd(), "src", "data", "achievements");

const CATEGORY_LABELS = {
  raids: "レイド（高難度）",
  field_ops: "特殊フィールド探索",
  dungeons: "ダンジョン",
  battle_general: "バトル（全般）"
};

function loadDefinitions() {
  const defs = [];
  for (const file of fs.readdirSync(DATA_DIR)) {
    if (!file.endsWith(".json")) continue;
    const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8"));
    defs.push(raw);
  }
  return defs;
}

async function fetchHtml(url) {
  const response = await axios.get(url, {
    responseType: "text",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ja,en;q=0.8",
      "User-Agent": "ffxiv-lodestone-character-lookup/0.1 (+https://jp.finalfantasyxiv.com)"
    },
    timeout: 30_000
  });
  return response.data;
}

function extractDetailLinks(html) {
  const $ = cheerio.load(html);
  const map = new Map();
  $("li.entry").each((_, el) => {
    const entry = $(el);
    const name = entry.find("p.entry__activity__txt").first().text().trim();
    if (!name || map.has(name)) return;
    const href = entry
      .find("a")
      .map((_, a) => $(a).attr("href"))
      .get()
      .find((h) => h && h.includes("/achievement/detail/"));
    if (!href) return;
    const link = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    map.set(name, link.split("#")[0]);
  });
  return map;
}

function parseRequirement(detailHtml) {
  const $ = cheerio.load(detailHtml);
  const text = $("p.achievement__base--text").first().text().trim();
  return text || "（取得できず）";
}

function renderTable(entries) {
  const lines = [];
  lines.push("| 正式名 | 達成要件 |");
  lines.push("|---|---|");
  for (const entry of entries) {
    lines.push(`| ${entry.name} | ${entry.requirement} |`);
  }
  return lines.join("\n");
}

function replaceSection(contents, label, tableText) {
  const heading = `### ${label}`;
  const start = contents.indexOf(heading);
  if (start === -1) return contents;
  const afterHeading = contents.indexOf("\n", start) + 1;
  const rest = contents.slice(afterHeading);
  const nextIndex = rest.search(/\n### |\n## /);
  const end = nextIndex === -1 ? contents.length : afterHeading + nextIndex;
  const before = contents.slice(0, afterHeading);
  const after = contents.slice(end);
  return `${before}${tableText}\n\n${after}`.replace(/\n{3,}/g, "\n\n");
}

async function main() {
  const characterId = process.env.LODESTONE_CHARACTER_ID || DEFAULT_CHARACTER_ID;
  const definitions = loadDefinitions();

  const updates = {};
  for (const def of definitions) {
    const label = CATEGORY_LABELS[def.category];
    if (!label) continue;
    const categoryUrl = `${BASE_URL}/lodestone/character/${characterId}/achievement/category/${def.categoryId}/#anchor_achievement`;
    const categoryHtml = await fetchHtml(categoryUrl);
    const detailLinks = extractDetailLinks(categoryHtml);
    const entries = [];

    for (const achievement of def.achievements) {
      const link = detailLinks.get(achievement.name);
      if (!link) {
        entries.push({ name: achievement.name, requirement: "（取得できず）" });
        continue;
      }
      const detailHtml = await fetchHtml(link);
      entries.push({ name: achievement.name, requirement: parseRequirement(detailHtml) });
    }

    updates[label] = renderTable(entries);
  }

  let docs = fs.readFileSync(DOCS_PATH, "utf8");
  for (const [label, table] of Object.entries(updates)) {
    docs = replaceSection(docs, label, table);
  }

  fs.writeFileSync(DOCS_PATH, docs);
  console.log("docs/achievements.md updated");
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
