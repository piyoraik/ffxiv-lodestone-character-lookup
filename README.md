# ffxiv-lodestone-character-lookup

FFXIV の Lodestone を使って、以下を行うための共通ライブラリです。

- `キャラクター名` と `サーバー名` から検索パラメータを作る
- キャラクター検索の先頭ヒットから「キャラクターURL（/lodestone/character/.../）」を取得する
- Lodestone からアチーブメントの達成状況と達成要件を取得する

## 動作環境

- Node.js: `>= 22`（22/24想定）
- モジュール形式: CommonJS（TypeScript からは通常の `import { ... } from ...` で利用できます）

## インストール

```sh
yarn add @piyoraik/ffxiv-lodestone-character-lookup
```

## 使い方
```ts
import {
  buildLodestoneSearchUrl,
  fetchTopCharacterResult,
  fetchAchievementDetailsByCategory,
  fetchAllAchievementDetails,
  getAllAchievementDefinitions,
  getAchievementCategoryDefinitions,
  getAchievementDefinitions,
  getAchievementCategoryId
} from "@piyoraik/ffxiv-lodestone-character-lookup";

const creator = { name: "Hoge Fuga", world: "World" };

// 1) Lodestoneの検索URLを作る
const searchUrl = buildLodestoneSearchUrl(creator);

// 2) 検索結果の状態を取得する
const searchResult = await fetchTopCharacterResult(searchUrl);
if (searchResult.status !== "ok") {
  throw new Error(`キャラクターが取得できません: ${searchResult.status}`);
}
const characterUrl = searchResult.characterUrl;

// 3) カテゴリ指定で取得する
const raids = await fetchAchievementDetailsByCategory(characterUrl, "raids");
console.log(raids);
const fieldOps = await fetchAchievementDetailsByCategory(characterUrl, "field_ops");
console.log(fieldOps);
const dungeons = await fetchAchievementDetailsByCategory(characterUrl, "dungeons");
console.log(dungeons);

// 4) 全カテゴリをまとめて取得する
const all = await fetchAllAchievementDetails(characterUrl);
console.log(all);

// 定義をまとめて取得する場合
const categories = getAchievementCategoryDefinitions();
const allAchievements = getAllAchievementDefinitions();
const raidsDefinitions = getAchievementDefinitions("raids");
const raidsCategoryId = getAchievementCategoryId("raids");
console.log(categories.length, allAchievements.length, raidsDefinitions.length, raidsCategoryId);

/*
{
  status: "ok",
  lodestone: "https://jp.finalfantasyxiv.com/lodestone/character/12345/",
  achievements: {
    raids: [
      { name: "絶バハムートを狩りし者", date: "2014/06/10", requirement: "絶バハムート討滅戦で、バハムート・プライムを討伐する" },
      { name: "万魔殿の辺獄を完全制覇せし者：ランク1", date: null, requirement: "万魔殿パンデモニウム零式：辺獄編を攻略する" }
    ]
  }
}
*/
```

## 関数一覧

| 関数 | 返り値 | 用途 |
|---|---|---|
| `buildLodestoneSearchUrl(info)` | `string` | キャラクター検索URLを生成 |
| `fetchTopCharacterResult(searchUrl)` | `Promise<{ status, characterUrl?, reason? }>` | 検索結果の状態を取得（非公開は `private`） |
| `fetchAchievementDetailsByCategory(characterUrl, category)` | `Promise<{ status, lodestone, achievements, reason? }>` | カテゴリ指定で達成状況/達成要件を取得 |
| `fetchAllAchievementDetails(characterUrl)` | `Promise<{ status, lodestone, achievements, reason? }>` | 全カテゴリの達成状況/達成要件を取得 |
| `getAchievementDefinitions(category)` | `AchievementDefinition[]` | カテゴリ指定で定義を取得 |
| `getAllAchievementDefinitions()` | `AchievementDefinition[]` | 全カテゴリの定義を取得 |
| `getAchievementCategoryDefinitions()` | `AchievementCategoryDefinition[]` | カテゴリ一覧（ID/定義）を取得 |
| `getAchievementCategoryId(category)` | `number \| undefined` | カテゴリ名からカテゴリIDを取得 |

## 対応カテゴリ一覧

| category | 説明 | categoryId |
|---|---|---|
| `raids` | レイド（高難度） | `4` |
| `field_ops` | 特殊フィールド探索 | `71` |
| `dungeons` | ダンジョン | `2` |
| `battle_general` | バトル（全般） | `1` |

## 対応アチーブメント

対応アチーブメントと達成要件の一覧は `docs/achievements.md` を参照してください。

## 注意

- Lodestone検索は「先頭ヒット」を採用します（同名が複数いる場合、意図と違うキャラに当たる可能性があります）
- HTML構造（class名など）が変わるとパースが壊れます（その場合はバージョン更新で追随します）
- アチーブメントの達成要件は Lodestone から引用しています
