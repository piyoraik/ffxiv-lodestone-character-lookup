const fs = require("node:fs");
const path = require("node:path");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(from, to) {
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
}

function copyDir(fromDir, toDir) {
  ensureDir(toDir);
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const fromPath = path.join(fromDir, entry.name);
    const toPath = path.join(toDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(fromPath, toPath);
      continue;
    }
    if (entry.isFile()) {
      copyFile(fromPath, toPath);
    }
  }
}

function main() {
  const projectRoot = path.resolve(__dirname, "..");
  copyDir(
    path.join(projectRoot, "src", "data", "achievements"),
    path.join(projectRoot, "dist", "data", "achievements")
  );
}

main();
