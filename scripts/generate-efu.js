import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    // 除外するディレクトリ
    if (
      file === 'node_modules' || 
      file === '.git' || 
      file === '.Jules' || 
      file === 'dist' ||
      file.startsWith('.vite')
    ) {
      continue;
    }
    
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else {
      files.push(name);
    }
  }
  return files;
}

const files = getFiles(rootDir);
let efu = 'Filename,Size,Date Modified,Date Created,Attributes\r\n';

// JSのDateをWindowsのFILETIME (1601年1月1日からの100ナノ秒間隔) に変換
function toFileTime(date) {
    return (date.getTime() + 11644473600000) * 10000;
}

for (const file of files) {
  const stat = fs.statSync(file);
  // リポジトリルートからの相対パスを取得し、Windows形式のバックスラッシュに変換
  const relativePath = path.relative(rootDir, file);
  
  // EFU形式から無視したいスクリプト自身と出力先ファイルは除外（任意）
  if (relativePath === 'catalog.efu') continue;

  const filename = `"${relativePath.replace(/\//g, '\\')}"`;
  const size = stat.size;
  const dateModified = toFileTime(stat.mtime);
  const dateCreated = toFileTime(stat.birthtime);
  const attributes = 32; // FILE_ATTRIBUTE_ARCHIVE
  
  efu += `${filename},${size},${dateModified},${dateCreated},${attributes}\r\n`;
}

fs.writeFileSync(path.join(rootDir, 'catalog.efu'), efu);
console.log('Successfully generated catalog.efu at the repository root.');
