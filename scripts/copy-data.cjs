const fs = require("node:fs");
const path = require("node:path");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(from, to) {
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
}

function main() {
  const projectRoot = path.resolve(__dirname, "..");
  copyFile(
    path.join(projectRoot, "src", "data", "high_end_achievements_ja.json"),
    path.join(projectRoot, "dist", "data", "high_end_achievements_ja.json")
  );
}

main();
