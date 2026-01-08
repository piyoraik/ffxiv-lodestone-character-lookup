import axios from "axios";
import * as cheerio from "cheerio";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const LODESTONE_BASE_URL = "https://jp.finalfantasyxiv.com";
const DEFINITIONS_DIR = resolve(__dirname, "data", "achievements");

/**
 * アチーブメントの正式名定義（SSOT）。
 *
 * 定義は `data/achievements/*.json` を同梱して読み取ります。
 */
export type AchievementDefinition = {
  name: string;
};

export type AchievementCategoryDefinition = {
  version: number;
  category: string;
  categoryId: number;
  achievements: AchievementDefinition[];
};

let cachedCategoryDefinitions: Map<string, AchievementCategoryDefinition> | undefined;
const cachedNameSets = new Map<string, Set<string>>();

function loadCategoryDefinitions(): Map<string, AchievementCategoryDefinition> {
  if (cachedCategoryDefinitions) return cachedCategoryDefinitions;
  const files = readdirSync(DEFINITIONS_DIR).filter((file) => file.endsWith(".json"));
  const map = new Map<string, AchievementCategoryDefinition>();
  for (const file of files) {
    const rawText = readFileSync(resolve(DEFINITIONS_DIR, file), "utf8");
    const raw = JSON.parse(rawText) as AchievementCategoryDefinition;
    if (!raw.category || !Array.isArray(raw.achievements)) continue;
    map.set(raw.category, raw);
  }
  cachedCategoryDefinitions = map;
  return map;
}

function loadDefinitions(category: string): AchievementDefinition[] {
  const raw = loadCategoryDefinitions().get(category);
  const definitions = raw?.achievements ?? [];
  return definitions;
}

/**
 * カテゴリ指定でアチーブ定義を取得します。
 */
export function getAchievementDefinitions(category: string): AchievementDefinition[] {
  return loadDefinitions(category);
}

/**
 * 全カテゴリのアチーブ定義を取得します。
 */
export function getAllAchievementDefinitions(): AchievementDefinition[] {
  const all: AchievementDefinition[] = [];
  for (const category of loadCategoryDefinitions().keys()) {
    all.push(...loadDefinitions(category));
  }
  return all;
}

/**
 * カテゴリ定義一覧を取得します。
 */
export function getAchievementCategoryDefinitions(): AchievementCategoryDefinition[] {
  return Array.from(loadCategoryDefinitions().values());
}

function getAchievementNameSet(category: string): Set<string> {
  const cached = cachedNameSets.get(category);
  if (cached) return cached;
  const nameSet = new Set(loadDefinitions(category).map((a) => a.name));
  cachedNameSets.set(category, nameSet);
  return nameSet;
}

/**
 * キャラクターURL（例: `https://.../lodestone/character/12345/`）から characterId を抽出します。
 */
function parseCharacterIdFromUrl(characterUrl: string): string | undefined {
  const match = characterUrl.match(/\/lodestone\/character\/(\d+)\//);
  return match?.[1];
}

/**
 * カテゴリ名から、LodestoneのカテゴリIDを取得します。
 */
export function getAchievementCategoryId(category: string): number | undefined {
  return loadCategoryDefinitions().get(category)?.categoryId;
}

/**
 * カテゴリ名を指定して、Lodestone のアチーブメント一覧URLを生成します。
 */
function buildAchievementCategoryUrlByCategory(characterUrl: string, category: string): string | undefined {
  const categoryId = getAchievementCategoryId(category);
  if (!categoryId) return undefined;
  const characterId = parseCharacterIdFromUrl(characterUrl);
  if (!characterId) return undefined;
  return new URL(
    `/lodestone/character/${characterId}/achievement/category/${categoryId}/#anchor_achievement`,
    LODESTONE_BASE_URL
  ).toString();
}

export type HighEndAchievementStatus = "ok" | "private" | "ng";

export type HighEndAchievementStatusReason =
  | "achievements_private"
  | "unknown_category"
  | "http_403"
  | "http_error"
  | "empty_html"
  | "structure_mismatch"
  | "invalid_character_url";

export type AchievementEntry = {
  name: string;
  date: string | null;
  requirement?: string | null;
};

export type HighEndAchievementDetailResult = {
  status: HighEndAchievementStatus;
  reason?: HighEndAchievementStatusReason;
  lodestone: string;
  achievements: Record<string, AchievementEntry[]>;
};

export type AllAchievementDetailResult = {
  status: HighEndAchievementStatus;
  reason?: HighEndAchievementStatusReason;
  lodestone: string;
  achievements: Record<string, AchievementEntry[]>;
};

/**
 * アチーブメント一覧HTMLから、指定カテゴリのアチーブ達成状況を抽出します。
 *
 * - `date` が取得できない場合は `null`
 * - 対象アチーブが1件も見つからない場合は `private`
 */
function parseAchievementDetailsFromHtml(
  html: string,
  characterUrl: string,
  category: string
): HighEndAchievementDetailResult {
  const $ = cheerio.load(html);
  const targetSet = getAchievementNameSet(category);
  const entries: AchievementEntry[] = [];
  let foundAny = false;
  const totalEntries = $("li.entry").length;
  const bodyText = $("body").text();
  const isPrivate =
    bodyText.includes("非公開") || bodyText.includes("プライバシー") || bodyText.includes("公開されていません");

  if (!html.trim()) {
    return {
      status: "ng",
      reason: "empty_html",
      lodestone: characterUrl,
      achievements: { [category]: [] }
    };
  }

  const parseDate = (raw: string): string | null => {
    const text = raw.trim();
    if (!text) return null;
    const match = text.match(/ldst_strftime\((\d+),\s*'YMD'\)/);
    if (!match) return text;
    const seconds = Number(match[1]);
    if (!Number.isFinite(seconds)) return null;
    const date = new Date(seconds * 1000);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}/${m}/${d}`;
  };

  $("li.entry").each((_, el) => {
    const entry = $(el);
    const name = entry.find("p.entry__activity__txt").first().text().trim();
    if (!targetSet.has(name)) return;

    foundAny = true;
    const rawDateText = entry.find("time.entry__activity__time").first().text();
    const dateText = parseDate(rawDateText);
    entries.push({ name, date: dateText });
  });

  if (totalEntries === 0) {
    return {
      status: isPrivate ? "private" : "ng",
      reason: isPrivate ? "achievements_private" : "structure_mismatch",
      lodestone: characterUrl,
      achievements: { [category]: [] }
    };
  }

  if (!foundAny) {
    return {
      status: "ng",
      reason: "structure_mismatch",
      lodestone: characterUrl,
      achievements: { [category]: [] }
    };
  }

  return {
    status: "ok",
    lodestone: characterUrl,
    achievements: {
      [category]: entries
    }
  };
}

function extractAchievementDetailLinks(html: string): Map<string, string> {
  const $ = cheerio.load(html);
  const map = new Map<string, string>();

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
    const link = href.startsWith("http") ? href : `${LODESTONE_BASE_URL}${href}`;
    map.set(name, link.split("#")[0]);
  });

  return map;
}

function parseAchievementRequirementFromDetailHtml(html: string): string | null {
  const $ = cheerio.load(html);
  const text = $("p.achievement__base--text").first().text().trim();
  return text || null;
}

async function fetchAchievementRequirement(detailUrl: string): Promise<string | null> {
  const html = await fetchAchievementCategoryHtml(detailUrl);
  return parseAchievementRequirementFromDetailHtml(html);
}

/**
 * キャラクターURLとカテゴリを指定して、アチーブを取得して返します。
 */
export async function fetchAchievementDetailsByCategory(
  characterUrl: string,
  category: string
): Promise<HighEndAchievementDetailResult> {
  const categoryId = getAchievementCategoryId(category);
  if (!categoryId) {
    return {
      status: "ng",
      reason: "unknown_category",
      lodestone: characterUrl,
      achievements: { [category]: [] }
    };
  }
  const achievementUrl = buildAchievementCategoryUrlByCategory(characterUrl, category);
  if (!achievementUrl) {
    return {
      status: "ng",
      reason: "invalid_character_url",
      lodestone: characterUrl,
      achievements: { [category]: [] }
    };
  }

  try {
    const html = await fetchAchievementCategoryHtml(achievementUrl);
    const parsed = parseAchievementDetailsFromHtml(html, characterUrl, category);
    if (parsed.status !== "ok") return parsed;

    const detailLinks = extractAchievementDetailLinks(html);
    const entries = parsed.achievements[category] ?? [];
    let cursor = 0;
    const concurrency = 5;

    async function worker(): Promise<void> {
      while (cursor < entries.length) {
        const index = cursor++;
        const entry = entries[index];
        if (!entry || entry.requirement !== undefined) continue;
        const link = detailLinks.get(entry.name);
        if (!link) {
          entry.requirement = null;
          continue;
        }
        try {
          entry.requirement = await fetchAchievementRequirement(link);
        } catch {
          entry.requirement = null;
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return parsed;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      return {
        status: "private",
        reason: "http_403",
        lodestone: characterUrl,
        achievements: { [category]: [] }
      };
    }
    return {
      status: "ng",
      reason: "http_error",
      lodestone: characterUrl,
      achievements: { [category]: [] }
    };
  }
}

/**
 * 全カテゴリのアチーブを取得して返します。
 */
export async function fetchAllAchievementDetails(
  characterUrl: string
): Promise<AllAchievementDetailResult> {
  const categories = getAchievementCategoryDefinitions().map((c) => c.category);
  const result: AllAchievementDetailResult = {
    status: "ok",
    lodestone: characterUrl,
    achievements: {}
  };

  for (const category of categories) {
    const data = await fetchAchievementDetailsByCategory(characterUrl, category);
    result.achievements[category] = data.achievements[category] ?? [];
    if (data.status !== "ok" && result.status === "ok") {
      result.status = data.status;
      result.reason = data.reason;
    }
  }

  return result;
}

/**
 * Lodestone のアチーブメント一覧ページを取得します。
 */
async function fetchAchievementCategoryHtml(url: string): Promise<string> {
  const response = await axios.get<string>(url, {
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
