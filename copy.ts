import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'tmp_repo/scan.moukaeritai.work-scan.moukaeritai.work');
const destDir = process.cwd();
const report: string[] = [];

const copyRecursiveSync = (src: string, dest: string) => {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    let status = 'NEW';
    if (fs.existsSync(dest)) {
        status = 'OVERWRITTEN';
    }
    fs.copyFileSync(src, dest);
    report.push(`${status}: ${path.relative(destDir, dest)}`);
  }
};

copyRecursiveSync(srcDir, destDir);
fs.writeFileSync(path.join(destDir, 'import_report.txt'), report.join('\n'));
console.log('Copied all files to root and generated import_report.txt.');
