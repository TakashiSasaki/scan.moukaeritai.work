import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const url = 'https://github.com/TakashiSasaki/scan.moukaeritai.work/archive/refs/heads/scan.moukaeritai.work.zip';
const zipPath = path.join(process.cwd(), 'repo.zip');

const download = (url: string) => {
    https.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
            download(response.headers.location!);
        } else {
            const file = fs.createWriteStream(zipPath);
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log('Downloaded ZIP.');
                try {
                    execSync('unzip -q -o repo.zip -d tmp_repo', { stdio: 'inherit' });
                    console.log('Extracted.');
                } catch (e) {
                    console.error('Failed to extract with system unzip, trying node library', e);
                }
            });
        }
    });
};

download(url);
