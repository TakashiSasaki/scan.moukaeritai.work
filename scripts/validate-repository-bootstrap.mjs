import fs from 'node:fs';

let exitCode = 0;

function check(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`);
    exitCode = 1;
  } else {
    console.log(`✅ ${message}`);
  }
}

let pkg;
try {
  pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  check(true, 'package.json is readable');
} catch (e) {
  check(false, 'package.json is readable');
}

let lock;
try {
  lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  check(true, 'package-lock.json is readable');
} catch (e) {
  check(false, 'package-lock.json is readable');
}

const targetVersion = pkg?.version;
if (pkg) {
  check(pkg.private === true, 'package.json.private is true');
  check(!!pkg.version, 'package.json.version exists');
  
  const requiredScripts = ['build', 'lint', 'test', 'verify:fast', 'verify:pr', 'verify:release'];
  for (const script of requiredScripts) {
    check(!!pkg.scripts?.[script], `npm script "${script}" exists`);
  }
  
  check(!pkg.scripts?.dev?.includes('server.ts'), 'dev script does not reference server.ts');
  check(!pkg.scripts?.build?.includes('server.ts'), 'build script does not reference server.ts');
}

if (lock && targetVersion) {
  check(lock.version === targetVersion, `package-lock.json root version is ${targetVersion}`);
  check(lock.packages?.[""]?.version === targetVersion, `package-lock.json packages[""].version is ${targetVersion}`);
}

try {
  const funPkg = JSON.parse(fs.readFileSync('functions/package.json', 'utf8'));
  check(funPkg.version === targetVersion, `functions/package.json version is ${targetVersion}`);
} catch (e) {
  check(false, 'functions/package.json is readable and valid');
}

try {
  const funLock = JSON.parse(fs.readFileSync('functions/package-lock.json', 'utf8'));
  check(funLock.version === targetVersion, `functions/package-lock.json root version is ${targetVersion}`);
  check(funLock.packages?.[""]?.version === targetVersion, `functions/package-lock.json packages[""].version is ${targetVersion}`);
} catch (e) {
  check(false, 'functions/package-lock.json is readable and valid');
}

try {
  const efpPkg = JSON.parse(fs.readFileSync('packages/efp-model/package.json', 'utf8'));
  check(efpPkg.version === targetVersion, `packages/efp-model/package.json version is ${targetVersion}`);
} catch (e) {
  check(false, 'packages/efp-model/package.json is readable and valid');
}

try {
  const efpLock = JSON.parse(fs.readFileSync('packages/efp-model/package-lock.json', 'utf8'));
  check(efpLock.version === targetVersion, `packages/efp-model/package-lock.json root version is ${targetVersion}`);
  check(efpLock.packages?.[""]?.version === targetVersion, `packages/efp-model/package-lock.json packages[""].version is ${targetVersion}`);
} catch (e) {
  check(false, 'packages/efp-model/package-lock.json is readable and valid');
}

try {
  const profile = JSON.parse(fs.readFileSync('contracts/profiles/current-application.json', 'utf8'));
  check(profile.applicationVersion === targetVersion, `current application profile is ${targetVersion}`);
} catch (e) {
  check(false, 'contracts/profiles/current-application.json is readable and valid');
}

check(!fs.existsSync('pnpm-lock.yaml'), 'pnpm-lock.yaml does not exist');
check(!fs.existsSync('yarn.lock'), 'yarn.lock does not exist');
check(fs.existsSync('package-lock.json'), 'package-lock.json exists');

try {
  const fbConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  check(fbConfig.projectId === 'moukaeritaid', 'Firebase projectId is moukaeritaid');
  check(fbConfig.appId === '1:1042140630327:web:190d2eb8fd09b7686b9eb2', 'Firebase appId is correct');
  check(fbConfig.firestoreDatabaseId === 'photo-moukaeritai-work', 'Firebase firestoreDatabaseId is photo-moukaeritai-work');
  check(fbConfig.storageBucket === 'photo-moukaeritai-work', 'Firebase storageBucket is photo-moukaeritai-work');
} catch (e) {
  check(false, 'firebase-applet-config.json is readable and valid');
}

if (exitCode !== 0) {
  console.error('\n💥 Bootstrap validation failed.');
  process.exit(exitCode);
} else {
  console.log('\n✅ Bootstrap validation passed.');
}
