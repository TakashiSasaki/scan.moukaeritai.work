import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateRouteCatalog } from './lib/route-catalog-validator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const appEntryPath = path.join(rootDir, 'src', 'App.tsx');
const appEntryContent = fs.readFileSync(appEntryPath, 'utf8');
const routeCatalogPath = path.join(rootDir, 'src', 'lib', 'routeCatalog.ts');
const routeCatalogContent = fs.readFileSync(routeCatalogPath, 'utf8');

let errors = [];

// App entry doesn't import Dashboard, CaptureForm, UnassignedIdentifierScreen, SearchScreen, etc
const forbiddenImports = ['Dashboard', 'CaptureForm', 'UnassignedIdentifierScreen', 'SearchScreen', 'OverviewScreen'];
for (const forbidden of forbiddenImports) {
  const staticRegex = new RegExp(`import\s+.*?\b${forbidden}\b.*?from`, 'i');
  const lazyRegex = new RegExp(`import\s*\(\s*['"].*?\b${forbidden}\b.*?['"]\s*\)`, 'i');
  if (staticRegex.test(appEntryContent) || lazyRegex.test(appEntryContent)) {
    errors.push(`App.tsx must not import ${forbidden}. It should be outside active routes.`);
  }
}

// Check for explicit role assignment using specific email across whole src
function checkFileForEmailRole(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkFileForEmailRole(fullPath);
    } else if (entry.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.match(/email\s*===?\s*['"].*@.*['"]/i) || content.match(/['"].*@.*['"]\s*===?\s*email/i)) {
        errors.push(`${fullPath} must not use specific email addresses for role validation.`);
      }
    }
  }
}
checkFileForEmailRole(path.join(rootDir, 'src'));

// Write to identifiers/objectIdentifierBindings from active entry
if (appEntryContent.includes('objectIdentifierBindings') || appEntryContent.includes('identifiers')) {
    errors.push(`App.tsx must not reference legacy write targets like identifiers or objectIdentifierBindings.`);
}

// Parse routeCatalog
const routes = [];

const arrayStart = routeCatalogContent.indexOf('const routes');
if (arrayStart === -1) {
  errors.push("Failed to locate 'const routes' in routeCatalog.ts");
} else {
  const openBracket = routeCatalogContent.indexOf('[', arrayStart);
  const closeBracket = routeCatalogContent.indexOf('];', openBracket);
  if (openBracket === -1 || closeBracket === -1) {
    errors.push("Failed to locate routes array boundaries in routeCatalog.ts");
  } else {
    const routesArrayStr = routeCatalogContent.slice(openBracket + 1, closeBracket);
    const rawObjectCount = (routesArrayStr.match(/\{/g) || []).length;

    const objectRegex = /\{([^}]+)\}/g;
    let objMatch;
    while ((objMatch = objectRegex.exec(routesArrayStr)) !== null) {
      const objContent = objMatch[1];
      const obj = {};
      const kvRegex = /(\w+)\s*:\s*(['"]([^'"]*)['"]|true|false)/g;
      let kvMatch;
      while ((kvMatch = kvRegex.exec(objContent)) !== null) {
        const key = kvMatch[1];
        let value = kvMatch[2];
        if (value === 'true') {
          value = true;
        } else if (value === 'false') {
          value = false;
        } else {
          value = kvMatch[3];
        }
        obj[key] = value;
      }
      routes.push(obj);
    }

    if (routes.length === 0) {
      errors.push("Failed to parse any routes from catalog.");
    } else if (routes.length !== rawObjectCount) {
      errors.push(`Route count mismatch: Parsed ${routes.length} routes, but found ${rawObjectCount} raw objects in catalog.`);
    }
  }
}

// Parse App.tsx routes
const routeRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{<\s*([A-Za-z]+)/g;
const foundGuards = {};
let match;
while ((match = routeRegex.exec(appEntryContent)) !== null) {
  const routePath = match[1];
  const guardComponent = match[2];
  foundGuards[routePath] = guardComponent;
}
// Add explicit mapping for empty guards as 'None' instead of relying on the tag
const routeTagRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{<([A-Za-z]+)/g;
while ((match = routeTagRegex.exec(appEntryContent)) !== null) {
  if (match[2] !== 'ProtectedRoute' && match[2] !== 'AdminRoute') {
    foundGuards[match[1]] = 'None';
  }
}

// Ensure removed routes are not registered in route catalog or App.tsx
const catalogErrors = validateRouteCatalog(routes, { foundGuards });
errors.push(...catalogErrors);

if (errors.length > 0) {
  console.error("Routing boundary validation failed:");
  errors.forEach(err => console.error(" - " + err));
  process.exit(1);
} else {
  console.log("Routing boundary validation passed.");
}
