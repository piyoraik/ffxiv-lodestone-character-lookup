const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildLodestoneSearchUrl,
  getAchievementCategoryDefinitions,
  getAchievementDefinitions,
  getAllAchievementDefinitions,
  getAchievementCategoryId
} = require("../dist");

test("buildLodestoneSearchUrl includes name and world", () => {
  const url = buildLodestoneSearchUrl({ name: "Test Name", world: "World" });
  assert.ok(url.includes("q=Test+Name"));
  assert.ok(url.includes("worldname=World"));
});

test("category definitions expose ids", () => {
  const categories = getAchievementCategoryDefinitions();
  const ids = new Map(categories.map((c) => [c.category, c.categoryId]));
  assert.equal(ids.get("raids"), 4);
  assert.equal(ids.get("field_ops"), 71);
  assert.equal(ids.get("dungeons"), 2);
});

test("definitions aggregate across categories", () => {
  const raids = getAchievementDefinitions("raids");
  const fieldOps = getAchievementDefinitions("field_ops");
  const dungeons = getAchievementDefinitions("dungeons");
  const all = getAllAchievementDefinitions();

  assert.ok(raids.length > 0);
  assert.ok(fieldOps.length > 0);
  assert.ok(dungeons.length > 0);
  assert.equal(all.length, raids.length + fieldOps.length + dungeons.length);
});

test("category id lookup", () => {
  assert.equal(getAchievementCategoryId("raids"), 4);
  assert.equal(getAchievementCategoryId("field_ops"), 71);
  assert.equal(getAchievementCategoryId("dungeons"), 2);
  assert.equal(getAchievementCategoryId("unknown"), undefined);
});
