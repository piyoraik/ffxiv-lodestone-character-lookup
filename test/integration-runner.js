const assert = require("node:assert/strict");
const readline = require("node:readline/promises");
const fs = require("node:fs");

const {
  buildLodestoneSearchUrl,
  fetchTopCharacterResult,
  fetchAchievementDetailsByCategory,
  getAchievementCategoryDefinitions,
  fetchAllAchievementDetails
} = require("../dist");

async function resolveTarget() {
  const input = process.stdin.isTTY ? process.stdin : fs.createReadStream("/dev/tty");
  const output = process.stdout.isTTY ? process.stdout : fs.createWriteStream("/dev/tty");
  if (!input || !output) {
    throw new Error("Interactive input is required for integration tests.");
  }

  const rl = readline.createInterface({ input, output });
  try {
    const name = (await rl.question("Character name: ")).trim();
    const world = (await rl.question("World name: ")).trim();
    if (!name || !world) throw new Error("Character name and world name are required.");
    return { name, world };
  } finally {
    rl.close();
  }
}

async function main() {
  const target = await resolveTarget();
  const searchUrl = buildLodestoneSearchUrl(target);
  const searchResult = await fetchTopCharacterResult(searchUrl);
  assert.equal(searchResult.status, "ok");

  const raids = await fetchAchievementDetailsByCategory(searchResult.characterUrl, "raids");
  assert.equal(raids.status, "ok");
  assert.ok(Array.isArray(raids.achievements.raids));
  assert.ok(raids.achievements.raids.length > 0);

  const all = await fetchAllAchievementDetails(searchResult.characterUrl);
  const categories = getAchievementCategoryDefinitions().map((c) => c.category);
  for (const category of categories) {
    if (!all.achievements[category]) all.achievements[category] = [];
  }
  console.log(JSON.stringify(all, null, 2));

  console.log("Integration test OK");
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
