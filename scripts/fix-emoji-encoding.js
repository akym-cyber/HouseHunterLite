const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MODE = process.argv.includes('--fix') ? 'fix' : 'scan';

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.md']);
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.expo',
  '.expo-shared',
  'android',
  'ios',
  'coverage',
  '.turbo',
  '.next',
  'web-build',
]);

const REPLACEMENTS = [
  ['📍', '📍'],
  ['🔍', '🔍'],
  ['🏠', '🏠'],
  ['⏳', '⏳'],
  ['❤️', '❤️'],
  [' · ', ' · '],
  [' · ', ' · '],
];

const CORRUPTION_RE = /�|ðŸ|â/;

const walk = (dir, files = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (EXTENSIONS.has(ext)) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
};

const run = () => {
  const files = walk(ROOT);
  let totalHits = 0;
  let totalFixed = 0;

  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    let text = original;

    if (!CORRUPTION_RE.test(text)) continue;

    const lines = text.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (CORRUPTION_RE.test(line)) {
        totalHits += 1;
        console.log(`[${file}:${idx + 1}] ${line.trim()}`);
      }
    });

    if (MODE === 'fix') {
      for (const [from, to] of REPLACEMENTS) {
        text = text.split(from).join(to);
      }
      if (text !== original) {
        fs.writeFileSync(file, text, 'utf8');
        totalFixed += 1;
      }
    }
  }

  if (MODE === 'scan') {
    console.log(`\nScan complete. Corrupted lines: ${totalHits}`);
  } else {
    console.log(`\nFix complete. Files updated: ${totalFixed}`);
  }
};

run();
