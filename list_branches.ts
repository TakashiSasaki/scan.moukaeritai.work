import https from 'https';

https.get('https://api.github.com/repos/TakashiSasaki/scan.moukaeritai.work/branches', {
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(JSON.parse(data).map(b => b.name));
  });
});
