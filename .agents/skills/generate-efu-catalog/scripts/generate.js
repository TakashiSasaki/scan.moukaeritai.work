import fs from 'fs';
import path from 'path';

function toFILETIME(dateMs) {
  return (BigInt(Math.floor(dateMs)) * 10000n) + 116444736000000000n;
}

function escapeCsv(str) {
  return '"' + str.replace(/"/g, '""') + '"';
}

const args = process.argv.slice(2);
let excludes = ['node_modules', '.git', '.Jules', 'tmp_repo', 'dist'];

const excludeIndex = args.indexOf('--exclude');
if (excludeIndex !== -1 && args.length > excludeIndex + 1) {
  excludes = args[excludeIndex + 1].split(',').map(s => s.trim());
}

const rootDir = process.cwd();
const outputDir = path.join(rootDir, '.local-data', 'generated');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const outputFile = path.join(outputDir, 'index.efu.csv');

const stream = fs.createWriteStream(outputFile);
stream.write('"Filename","Size","Date Modified","Date Created","Attributes"\r\n');

function walk(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (excludes.includes(item)) continue;

    const fullPath = path.join(dir, item);
    let stats;
    try {
      stats = fs.lstatSync(fullPath);
    } catch (e) {
      continue;
    }
    
    // Everything prefers Windows paths, but we will output absolute Linux paths
    // or convert them just for formatting
    let filenameForEfu = fullPath;
    
    const size = stats.isDirectory() ? 0 : stats.size;
    const mtime = toFILETIME(stats.mtimeMs).toString();
    const ctime = toFILETIME(stats.birthtimeMs || stats.ctimeMs).toString();
    const attributes = stats.isDirectory() ? 16 : 32;

    stream.write(`${escapeCsv(filenameForEfu)},${size},${mtime},${ctime},${attributes}\r\n`);
    
    if (stats.isDirectory()) {
      walk(fullPath);
    }
  }
}

walk(rootDir);
stream.end();
console.log(`.local-data/generated/index.efu.csv created successfully. (Excluded: ${excludes.join(', ')})`);
