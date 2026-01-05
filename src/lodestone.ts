import axios from "axios";
import * as cheerio from "cheerio";

const LODESTONE_BASE_URL = "https://jp.finalfantasyxiv.com";

export type CreatorInfo = {
  name: string;
  world: string;
};

/**
 * Lodestone のキャラクター検索URLを生成します。
 * 例:
 * `https://jp.finalfantasyxiv.com/lodestone/character/?q=Noah+Stella&worldname=Asura&...`
 */
export function buildLodestoneSearchUrl(info: CreatorInfo): string {
  const url = new URL("/lodestone/character/", LODESTONE_BASE_URL);
  const params = url.searchParams;

  params.set("q", info.name);
  params.set("worldname", info.world);
  params.set("classjob", "");
  params.set("race_tribe", "");

  // Lodestone の検索フォームが投げるパラメータに寄せています。
  params.append("gcid", "1");
  params.append("gcid", "2");
  params.append("gcid", "3");
  params.append("gcid", "0");

  params.append("blog_lang", "ja");
  params.append("blog_lang", "en");
  params.append("blog_lang", "de");
  params.append("blog_lang", "fr");

  params.set("order", "");
  return url.toString();
}

/**
 * キャラクター検索結果HTMLから、先頭に表示されるキャラクターURLを取得します。
 */
export function parseTopCharacterUrlFromSearchHtml(html: string): string | undefined {
  const $ = cheerio.load(html);
  const href = $("a.entry__link").first().attr("href");
  if (!href) return undefined;
  return new URL(href, LODESTONE_BASE_URL).toString();
}

/**
 * Lodestone のキャラクター検索を行い、先頭にヒットしたキャラクターURLを返します。
 */
export async function fetchTopCharacterUrl(searchUrl: string): Promise<string | undefined> {
  const response = await axios.get<string>(searchUrl, {
    responseType: "text",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ja,en;q=0.8",
      "User-Agent": "ffxiv-lodestone-character-lookup/0.1 (+https://jp.finalfantasyxiv.com)"
    },
    timeout: 30_000
  });

  return parseTopCharacterUrlFromSearchHtml(response.data);
}
