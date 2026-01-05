# @piyoraik/ffxiv-lodestone-character-lookup

FFXIV の Lodestone を使って、以下を行うための共通ライブラリです。

- `募集者: キャラクター名 @ サーバー名` をパースして検索パラメータを作る
- キャラクター検索の先頭ヒットから「キャラクターURL（/lodestone/character/.../）」を取得する
- キャラクターの「アチーブメント（カテゴリ4）」ページから、高難度（絶/零式）の達成状況を判定する

## 動作環境

- Node.js: `>= 22`（22/24想定）
- モジュール形式: CommonJS（TypeScript からは通常の `import { ... } from ...` で利用できます）

## インストール

```sh
yarn add @piyoraik/ffxiv-lodestone-character-lookup
```

## 最短の使い方（募集者 → Lodestone URL → クリア判定）

```ts
import {
  parseCreator,
  buildLodestoneSearchUrl,
  fetchTopCharacterUrl,
  buildAchievementCategoryUrl,
  fetchAchievementCategoryHtml,
  parseUltimateClearsFromAchievementHtml
} from "@piyoraik/ffxiv-lodestone-character-lookup";

// 例: xivpf などの「募集者」表示に合わせた形式
const creator = parseCreator("Hoge Fuga @ World");
if (!creator) throw new Error("募集者の形式が不正です");

// 1) Lodestoneの検索URLを作る
const searchUrl = buildLodestoneSearchUrl(creator);

// 2) 検索の先頭ヒットからキャラクターURLを取る
const characterUrl = await fetchTopCharacterUrl(searchUrl);
if (!characterUrl) throw new Error("キャラクターが見つかりませんでした");

// 3) アチーブメントページ（カテゴリ4）のURLを作る
const achievementUrl = buildAchievementCategoryUrl(characterUrl);
if (!achievementUrl) throw new Error("アチーブURLの生成に失敗しました");

// 4) HTMLを取得して達成状況を判定
const html = await fetchAchievementCategoryHtml(achievementUrl);
const result = parseUltimateClearsFromAchievementHtml(html);
console.log(result);
```

## 公開API（関数の挙動）

## API一覧（概要）

| 関数 | 返り値 | 用途 |
|---|---|---|
| `parseCreator(creator)` | `{ name, world } \| undefined` | `Name @ World` を分解 |
| `buildLodestoneSearchUrl(info)` | `string` | キャラクター検索URLを生成 |
| `fetchTopCharacterUrl(searchUrl)` | `Promise<string \| undefined>` | 検索結果の先頭ヒットのキャラURLを取得 |
| `buildAchievementCategoryUrl(characterUrl)` | `string \| undefined` | カテゴリ4のアチーブURLを生成 |
| `fetchAchievementCategoryHtml(url)` | `Promise<string>` | アチーブHTMLを取得 |
| `parseUltimateClearsFromAchievementHtml(html)` | `{ status, clears }` | 高難度（絶/零式）達成状況を抽出 |
| `getHighEndAchievements()` | `HighEndAchievementDefinition[]` | 同梱定義（正式名/略称/種別）を取得 |
| `getHighEndAchievementShortMap()` | `Map<string, string>` | `正式名 -> 略称` |
| `getHighEndAchievementGroupMap()` | `Map<string, "ultimate" \| "savage">` | `正式名 -> 種別` |

## 対応アチーブメント（高難度）

このライブラリが達成判定に対応しているアチーブメントの一覧です（`getHighEndAchievements()` の内容と同じ）。

| 種別 | 略称 | 正式名 |
|---|---|---|
| 絶 | 絶バハ | 絶バハムートを狩りし者 |
| 絶 | 絶テマ | 絶アルテマウェポンを破壊せし者 |
| 絶 | 絶アレキ | 絶アレキサンダーを破壊せし者 |
| 絶 | 絶竜詩 | 絶竜詩戦争を平定せし者 |
| 絶 | 絶オメガ | 絶オメガ検証戦を完遂せし者 |
| 絶 | 絶エデン | 絶もうひとつの未来を見届けし者 |
| 零式 | 【パンデモ】辺獄 | 万魔殿の辺獄を完全制覇せし者：ランク1 |
| 零式 | 【パンデモ】煉獄 | 万魔殿の煉獄を完全制覇せし者：ランク1 |
| 零式 | 【パンデモ】天獄 | 万魔殿の天獄を完全制覇せし者：ランク1 |
| 零式 | 【アルカディア】ライトヘビー | アルカディアのライトヘビー級を制覇せし者：ランク1 |
| 零式 | 【アルカディア】クルーザー | アルカディアのクルーザー級を完全制覇せし者：ランク1 |
| 零式 | 【アルカディア】ヘビー | アルカディアのヘビー級を完全制覇せし者：ランク1 |

## 注意

- Lodestone検索は「先頭ヒット」を採用します（同名が複数いる場合、意図と違うキャラに当たる可能性があります）
- HTML構造（class名など）が変わるとパースが壊れます（その場合はバージョン更新で追随します）
